// ============================================
// Report Execute API — POST
// Execute a saved report and return results
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'

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

// ============================================
// DATASET DEFINITIONS
// ============================================

interface DimensionDef {
    id: string
    name: string
    nameKey: string
    type: string
    sourceField: string
}

interface MeasureDef {
    id: string
    name: string
    nameKey: string
    aggregation: string
    sourceField: string
    dataType: string
}

interface DatasetDef {
    id: string
    sourceModel: string
    dimensions: DimensionDef[]
    measures: MeasureDef[]
}

const DATASET_DEFS: Record<string, DatasetDef> = {
    invoices: {
        id: 'invoices',
        sourceModel: 'Invoice',
        dimensions: [
            { id: 'date', name: 'Date', nameKey: 'dimensions.date', type: 'temporal', sourceField: 'createdAt' },
            { id: 'status', name: 'Status', nameKey: 'dimensions.status', type: 'ordinal', sourceField: 'status' },
        ],
        measures: [
            { id: 'invoice_total', name: 'Invoice Total', nameKey: 'measures.invoice_total', aggregation: 'sum', sourceField: 'total', dataType: 'currency' },
            { id: 'invoice_count', name: 'Invoice Count', nameKey: 'measures.invoice_count', aggregation: 'count', sourceField: 'id', dataType: 'number' },
        ],
    },
    payments: {
        id: 'payments',
        sourceModel: 'Payment',
        dimensions: [
            { id: 'date', name: 'Date', nameKey: 'dimensions.date', type: 'temporal', sourceField: 'paymentDate' },
            { id: 'status', name: 'Status', nameKey: 'dimensions.status', type: 'ordinal', sourceField: 'status' },
        ],
        measures: [
            { id: 'payment_amount', name: 'Payment Amount', nameKey: 'measures.payment_amount', aggregation: 'sum', sourceField: 'amount', dataType: 'currency' },
            { id: 'payment_count', name: 'Payment Count', nameKey: 'measures.payment_count', aggregation: 'count', sourceField: 'id', dataType: 'number' },
        ],
    },
    deals: {
        id: 'deals',
        sourceModel: 'Deal',
        dimensions: [
            { id: 'date', name: 'Date', nameKey: 'dimensions.date', type: 'temporal', sourceField: 'createdAt' },
            { id: 'stage', name: 'Stage', nameKey: 'dimensions.stage', type: 'ordinal', sourceField: 'stage' },
        ],
        measures: [
            { id: 'deal_value', name: 'Deal Value', nameKey: 'measures.deal_value', aggregation: 'sum', sourceField: 'value', dataType: 'currency' },
            { id: 'deal_count', name: 'Deal Count', nameKey: 'measures.deal_count', aggregation: 'count', sourceField: 'id', dataType: 'number' },
        ],
    },
    products: {
        id: 'products',
        sourceModel: 'Product',
        dimensions: [
            { id: 'category', name: 'Category', nameKey: 'dimensions.category', type: 'nominal', sourceField: 'categoryId' },
            { id: 'date', name: 'Date', nameKey: 'dimensions.date', type: 'temporal', sourceField: 'createdAt' },
        ],
        measures: [
            { id: 'stock_level', name: 'Stock Level', nameKey: 'measures.stock_level', aggregation: 'sum', sourceField: 'stock', dataType: 'number' },
            { id: 'product_count', name: 'Product Count', nameKey: 'measures.product_count', aggregation: 'count', sourceField: 'id', dataType: 'number' },
        ],
    },
    employees: {
        id: 'employees',
        sourceModel: 'Employee',
        dimensions: [
            { id: 'department', name: 'Department', nameKey: 'dimensions.department', type: 'nominal', sourceField: 'department' },
            { id: 'date', name: 'Date', nameKey: 'dimensions.date', type: 'temporal', sourceField: 'createdAt' },
        ],
        measures: [
            { id: 'employee_count', name: 'Employee Count', nameKey: 'measures.employee_count', aggregation: 'count', sourceField: 'id', dataType: 'number' },
            { id: 'total_salary', name: 'Total Salary', nameKey: 'measures.total_salary', aggregation: 'sum', sourceField: 'salary', dataType: 'currency' },
        ],
    },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClient = Record<string, any>

// ============================================
// API HANDLER
// ============================================

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const startTime = Date.now()

    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { userId, tenantId } = auth
        const { id } = params

        // Find the saved report
        const report = await prisma.savedReport.findFirst({
            where: { id, tenantId },
        })

        if (!report) {
            return NextResponse.json(
                { success: false, error: 'Report not found' },
                { status: 404 }
            )
        }

        // Parse the config
        const config = report.config as Record<string, unknown>
        const dataset = config.dataset as string
        const dimensions = (config.dimensions as string[]) || []
        const measures = (config.measures as string[]) || []
        const filters = (config.filters as Array<{ field: string; operator: string; value: unknown }>) || []
        const dateRange = config.dateRange as { from: string; to: string } | undefined
        const orderBy = config.orderBy as Array<{ field: string; direction: 'asc' | 'desc' }> | undefined
        const limit = (config.limit as number) || 1000

        // Get dataset definition
        const datasetDef = DATASET_DEFS[dataset]
        if (!datasetDef) {
            return NextResponse.json(
                { success: false, error: `Invalid dataset: ${dataset}` },
                { status: 400 }
            )
        }

        // Build where clause
        const where: Record<string, unknown> = { tenantId }

        if (filters.length > 0) {
            for (const filter of filters) {
                where[filter.field] = buildFilterCondition(filter.operator, filter.value)
            }
        }

        if (dateRange) {
            where.createdAt = {
                gte: new Date(dateRange.from),
                lte: new Date(dateRange.to),
            }
        }

        // Build select
        const select: Record<string, boolean> = {}
        for (const dim of dimensions) {
            select[dim] = true
        }
        for (const measureId of measures) {
            const measureDef = datasetDef.measures.find((m: MeasureDef) => m.id === measureId)
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

        // Execute query
        const prismaClient = prisma as unknown as PrismaClient
        const rawData: Record<string, unknown>[] = await prismaClient[datasetDef.sourceModel].findMany({
            where,
            select,
            orderBy: orderByClause.length > 0 ? orderByClause : undefined,
            take: Math.min(limit, 10000),
        })

        // Group and aggregate
        const groups = new Map<string, Record<string, unknown>[]>()

        for (const row of rawData) {
            const groupKey = dimensions.map(dim => String(row[dim] || '')).join('|')
            if (!groups.has(groupKey)) {
                groups.set(groupKey, [])
            }
            groups.get(groupKey)!.push(row)
        }

        const resultRows: Record<string, unknown>[] = []
        for (const [, groupRows] of groups) {
            const row: Record<string, unknown> = {}
            for (const dim of dimensions) {
                row[dim] = groupRows[0][dim]
            }
            for (const measureId of measures) {
                const measureDef = datasetDef.measures.find((m: MeasureDef) => m.id === measureId)
                if (measureDef) {
                    const values = groupRows.map((r: Record<string, unknown>) => toNumber(r[measureDef.sourceField]))
                    row[measureId] = aggregateValues(values, measureDef.aggregation)
                }
            }
            resultRows.push(row)
        }

        const durationMs = Date.now() - startTime

        // Record execution
        const execution = await prisma.savedReportExecution.create({
            data: {
                reportId: id,
                tenantId,
                executedBy: userId,
                status: 'completed',
                rowcount: resultRows.length,
                durationMs,
            },
        })

        // Update lastRunAt
        await prisma.savedReport.update({
            where: { id },
            data: { lastRunAt: new Date() },
        })

        return NextResponse.json({
            success: true,
            data: {
                executionId: execution.id,
                rows: resultRows,
                metadata: {
                    totalRows: resultRows.length,
                    executionTimeMs: durationMs,
                },
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'

        // Record failed execution if we have the report ID
        try {
            const { id } = params
            const auth = await requirePermissionForRoute(request)
            if ('error' in auth) {
                // Cannot record failed execution without auth
                console.error('[Report Execute Error]', error instanceof Error ? error.message : 'Unknown error')
                return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
            }
            const { userId, tenantId } = auth
            await prisma.savedReportExecution.create({
                data: {
                    reportId: id,
                    tenantId,
                    executedBy: userId,
                    status: 'failed',
                    durationMs: Date.now() - startTime,
                    errorMessage: message,
                },
            })
        } catch {
            // Ignore errors in error recording
        }

        console.error('[Report Execute Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
