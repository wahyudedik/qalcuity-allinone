export const dynamic = 'force-dynamic';

// ============================================
// Query History API â€” GET (list), POST (create)
// Query history with pagination
// ============================================

import { NextResponse } from 'next/server'
import { MSG } from '@/lib/api-messages'
import { requirePermissionForRoute } from '@/lib/session'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-error'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { createQueryHistorySchema, formatZodError } from '@/lib/validation-schemas'

// ============================================
// GET â€” List query history for tenant (with pagination)
// ============================================

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:query-history:route:GET:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 })
        }

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
        logger.error('[ERROR]', error)
        return handleApiError(error)
    }
}

// ============================================
// POST â€” Save query to history
// ============================================

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:query-history:route:POST:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { userId, tenantId } = auth
        const body = await request.json()

        // Validate with Zod
        const parsed = createQueryHistorySchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: formatZodError(parsed.error) },
                { status: 400 }
            )
        }
        const validated = parsed.data

        const history = await prisma.analyticsQueryHistory.create({
            data: {
                queryType: validated.queryType,
                sql: validated.sql,
                visualConfig: validated.visualConfig || null,
                datasetId: validated.datasetId || null,
                datasetName: validated.datasetName || null,
                executionMs: validated.executionMs,
                rowsReturned: validated.rowsReturned,
                rowsScanned: validated.rowsScanned ?? null,
                status: validated.status,
                errorMessage: validated.errorMessage || null,
                fromCache: validated.fromCache ?? false,
                ipAddress: validated.ipAddress || null,
                userAgent: validated.userAgent || null,
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
        logger.error('[ERROR]', error)
        return handleApiError(error)
    }
}
