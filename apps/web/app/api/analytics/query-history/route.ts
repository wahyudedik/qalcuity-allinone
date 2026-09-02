// ============================================
// Query History API — GET (list), POST (create)
// Query history with pagination
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'

// ============================================
// TYPES
// ============================================

interface CreateQueryHistoryBody {
    queryType: string
    sql: string
    visualConfig?: string
    datasetId?: string
    datasetName?: string
    executionMs: number
    rowsReturned: number
    rowsScanned?: number
    status: string
    errorMessage?: string
    fromCache?: boolean
    ipAddress?: string
    userAgent?: string
}

// ============================================
// GET — List query history for tenant (with pagination)
// ============================================

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { userId, tenantId } = auth
        const { searchParams } = new URL(request.url)
        const queryType = searchParams.get('queryType')
        const status = searchParams.get('status')
        const page = parseInt(searchParams.get('page') || '1', 10)
        const limit = parseInt(searchParams.get('limit') || '20', 10)
        const offset = (page - 1) * limit

        const where: Record<string, unknown> = { tenantId }

        // Filter by user unless admin views all
        const userOnly = searchParams.get('userOnly')
        if (userOnly !== 'false') {
            where.userId = userId
        }

        if (queryType) {
            where.queryType = queryType
        }

        if (status) {
            where.status = status
        }

        const [histories, total] = await Promise.all([
            prisma.analyticsQueryHistory.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit,
            }),
            prisma.analyticsQueryHistory.count({ where }),
        ])

        const enrichedHistories = histories.map(history => ({
            id: history.id,
            userId: history.userId,
            userName: history.userName,
            queryType: history.queryType,
            sql: history.sql,
            visualConfig: history.visualConfig,
            datasetId: history.datasetId,
            datasetName: history.datasetName,
            executionMs: history.executionMs,
            rowsReturned: history.rowsReturned,
            rowsScanned: history.rowsScanned,
            status: history.status,
            errorMessage: history.errorMessage,
            fromCache: history.fromCache,
            createdAt: history.createdAt.toISOString(),
        }))

        return NextResponse.json({
            success: true,
            data: enrichedHistories,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        console.error('[Query History List Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// ============================================
// POST — Save query to history
// ============================================

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { userId, tenantId } = auth
        const body: CreateQueryHistoryBody = await request.json()

        // Validate required fields
        if (!body.queryType || !body.sql || body.executionMs === undefined || body.rowsReturned === undefined || !body.status) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: queryType, sql, executionMs, rowsReturned, status' },
                { status: 400 }
            )
        }

        // Validate queryType
        const validQueryTypes = ['SQL', 'VISUAL', 'AI', 'DASHBOARD', 'KPI']
        if (!validQueryTypes.includes(body.queryType)) {
            return NextResponse.json(
                { success: false, error: `Invalid queryType. Must be one of: ${validQueryTypes.join(', ')}` },
                { status: 400 }
            )
        }

        // Validate status
        const validStatuses = ['SUCCESS', 'FAILED', 'TIMEOUT', 'BLOCKED']
        if (!validStatuses.includes(body.status)) {
            return NextResponse.json(
                { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            )
        }

        const history = await prisma.analyticsQueryHistory.create({
            data: {
                queryType: body.queryType,
                sql: body.sql,
                visualConfig: body.visualConfig || null,
                datasetId: body.datasetId || null,
                datasetName: body.datasetName || null,
                executionMs: body.executionMs,
                rowsReturned: body.rowsReturned,
                rowsScanned: body.rowsScanned ?? null,
                status: body.status,
                errorMessage: body.errorMessage || null,
                fromCache: body.fromCache ?? false,
                ipAddress: body.ipAddress || null,
                userAgent: body.userAgent || null,
                userId,
                tenantId,
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                id: history.id,
                userId: history.userId,
                queryType: history.queryType,
                sql: history.sql,
                visualConfig: history.visualConfig,
                datasetId: history.datasetId,
                datasetName: history.datasetName,
                executionMs: history.executionMs,
                rowsReturned: history.rowsReturned,
                rowsScanned: history.rowsScanned,
                status: history.status,
                errorMessage: history.errorMessage,
                fromCache: history.fromCache,
                createdAt: history.createdAt.toISOString(),
            },
        }, { status: 201 })
    } catch (error) {
        console.error('[Query History Create Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
