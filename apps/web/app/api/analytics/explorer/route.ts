// ============================================
// Data Explorer API — POST
// Executes analytics queries from explorer config
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'
import { getDatasetById } from '@qalcuity/analytics'
import type { DatasetDefinition, DimensionDefinition, MeasureDefinition } from '@qalcuity/analytics'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// ============================================
// TYPES
// ============================================

interface ExplorerFilter {
    field: string
    operator: string
    value: unknown
}

interface ExplorerRequest {
    dataset: string
    dimensions: string[]
    measures: string[]
    filters: ExplorerFilter[]
    dateRange?: {
        from: string
        to: string
        granularity?: string
    }
    orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>
    limit?: number
    offset?: number
}

interface ExplorerColumn {
    key: string
    name: string
    nameKey: string
    type: 'dimension' | 'measure'
    dataType: 'string' | 'number' | 'date' | 'boolean'
    format?: string
}

// ============================================
// DATASET → PRISMA MODEL MAPPING
// ============================================

const DATASET_MODEL_MAP: Record<string, string> = {
    invoices: 'Invoice',
    payments: 'Payment',
    deals: 'Deal',
    products: 'Product',
    employees: 'Employee',
}

// ============================================
// HELPERS
// ============================================

function toNumber(val: unknown): number {
    if (val === null || val === undefined) return 0
    if (typeof val === 'number') return val
    if (typeof val === 'string') return parseFloat(val) || 0
    if (typeof val === 'object' && val !== null && 'toNumber' in val) {
        return (val as { toNumber: () => number }).toNumber()
    }
    return 0
}

function buildFilterCondition(operator: string, value: unknown): unknown {
    switch (operator) {
        case 'eq': return value
        case 'neq': return { not: value }
        case 'gt': return { gt: value }
        case 'gte': return { gte: value }
        case 'lt': return { lt: value }
        case 'lte': return { lte: value }
        case 'in': return { in: value }
        case 'not_in': return { notIn: value }
        case 'contains': return { contains: value, mode: 'insensitive' as const }
        case 'starts_with': return { startsWith: value, mode: 'insensitive' as const }
        case 'ends_with': return { endsWith: value, mode: 'insensitive' as const }
        case 'between': {
            const [min, max] = value as [number, number]
            return { gte: min, lte: max }
        }
        case 'is_null': return null
        case 'is_not_null': return { not: null }
        default: return value
    }
}

function aggregateValues(values: number[], method: string): number {
    if (values.length === 0) return 0
    switch (method) {
        case 'sum': return values.reduce((a, b) => a + b, 0)
        case 'avg': return values.reduce((a, b) => a + b, 0) / values.length
        case 'min': return Math.min(...values)
        case 'max': return Math.max(...values)
        case 'count': return values.length
        default: return values.reduce((a, b) => a + b, 0)
    }
}

type PrismaClient = Record<string, { findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]> }>

// ============================================
// API HANDLER
// ============================================

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:explorer:route:POST:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const body: ExplorerRequest = await request.json()

        const { dataset, dimensions, measures, filters, dateRange, orderBy, limit, offset } = body

        // Validate dataset
        if (!dataset || !DATASET_MODEL_MAP[dataset]) {
            return NextResponse.json(
                { success: false, error: `Invalid dataset: ${dataset}. Supported: ${Object.keys(DATASET_MODEL_MAP).join(', ')}` },
                { status: 400 }
            )
        }

        // Get dataset definition from @qalcuity/analytics package (Single Source of Truth)
        const datasetDef = getDatasetById(dataset) as DatasetDefinition | undefined
        if (!datasetDef) {
            return NextResponse.json(
                { success: false, error: `Dataset definition not found: ${dataset}` },
                { status: 400 }
            )
        }

        const startTime = Date.now()
        const modelName = DATASET_MODEL_MAP[dataset]

        // Build where clause
        const where: Record<string, unknown> = { tenantId }

        // Apply filters (skip protected fields to prevent tenantId override)
        const protectedFields = ['tenantId', 'id', 'createdAt', 'updatedAt'];
        if (filters && filters.length > 0) {
            for (const filter of filters) {
                if (protectedFields.includes(filter.field)) continue;
                where[filter.field] = buildFilterCondition(filter.operator, filter.value)
            }
        }

        // Apply date range
        if (dateRange) {
            where.createdAt = {
                gte: new Date(dateRange.from),
                lte: new Date(dateRange.to),
            }
        }

        // Build select for dimensions + measures
        const select: Record<string, boolean> = {}
        for (const dim of dimensions) {
            select[dim] = true
        }
        for (const measureId of measures) {
            const measureDef = datasetDef.measures.find((m: MeasureDefinition) => m.id === measureId)
            if (measureDef) {
                select[measureDef.sourceField] = true
            }
        }

        // Build orderBy
        const orderByClause: Record<string, string>[] = []
        if (orderBy && orderBy.length > 0) {
            for (const order of orderBy) {
                orderByClause.push({ [order.field]: order.direction })
            }
        }

        // Execute query using Prisma dynamic model access
        const prismaClient = prisma as unknown as PrismaClient
        const rawData: Record<string, unknown>[] = await prismaClient[modelName].findMany({
            where,
            select,
            orderBy: orderByClause.length > 0 ? orderByClause : undefined,
            take: Math.min(limit || 1000, 10000),
            skip: offset || 0,
        })

        // Group by dimensions and aggregate measures
        const groups = new Map<string, Record<string, unknown>[]>()

        for (const row of rawData) {
            const groupKey = dimensions
                .map(dim => String(row[dim] || ''))
                .join('|')

            if (!groups.has(groupKey)) {
                groups.set(groupKey, [])
            }
            groups.get(groupKey)!.push(row)
        }

        // Build result rows
        const resultRows: Record<string, unknown>[] = []

        for (const [, groupRows] of groups) {
            const row: Record<string, unknown> = {}

            // Set dimension values from first row
            for (const dim of dimensions) {
                row[dim] = groupRows[0][dim]
            }

            // Aggregate measures
            for (const measureId of measures) {
                const measureDef = datasetDef.measures.find((m: MeasureDefinition) => m.id === measureId)
                if (measureDef) {
                    const values = groupRows.map((r: Record<string, unknown>) => toNumber(r[measureDef.sourceField]))
                    row[measureId] = aggregateValues(values, measureDef.aggregation)
                }
            }

            resultRows.push(row)
        }

        // Build columns metadata
        const columns: ExplorerColumn[] = []

        for (const dim of dimensions) {
            const dimDef = datasetDef.dimensions.find((d: DimensionDefinition) => d.id === dim)
            columns.push({
                key: dim,
                name: dimDef?.name || dim,
                nameKey: dimDef?.nameKey || dim,
                type: 'dimension',
                dataType: dimDef?.type === 'temporal' ? 'date' : 'string',
            })
        }

        for (const measureId of measures) {
            const measureDef = datasetDef.measures.find((m: MeasureDefinition) => m.id === measureId)
            if (measureDef) {
                columns.push({
                    key: measureId,
                    name: measureDef.name,
                    nameKey: measureDef.nameKey,
                    type: 'measure',
                    dataType: 'number',
                    format: measureDef.dataType === 'currency' ? 'currency' : 'number',
                })
            }
        }

        const executionTimeMs = Date.now() - startTime

        return NextResponse.json({
            success: true,
            data: {
                rows: resultRows,
                columns,
                metadata: {
                    totalRows: resultRows.length,
                    executionTimeMs,
                },
            },
        })
    } catch (error) {
        console.error('[Analytics Explorer Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
