export const dynamic = 'force-dynamic';

// ============================================
// Charts API â€” GET (list), POST (create)
// CRUD for Analytics Charts
// ============================================

import { NextResponse } from 'next/server'
import { MSG } from '@/lib/api-messages'
import { requirePermissionForRoute } from '@/lib/session'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-error'
import { createAnalyticsChartSchema, formatZodError } from '@/lib/validation-schemas'
import { logger } from '@/lib/logger'

// ============================================
// GET â€” List all charts for tenant
// ============================================

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:charts:GET:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { searchParams } = new URL(request.url)
        const chartType = searchParams.get('chartType')
        const dataSource = searchParams.get('dataSource')
        const isActive = searchParams.get('isActive')
        const isTemplate = searchParams.get('isTemplate')
        const visibility = searchParams.get('visibility')

        const where: Record<string, unknown> = { tenantId, deletedAt: null }

        if (chartType) {
            where.chartType = chartType
        }

        if (dataSource) {
            where.dataSource = dataSource
        }

        if (isActive !== null && isActive !== undefined) {
            where.isActive = isActive === 'true'
        }

        if (isTemplate !== null && isTemplate !== undefined) {
            where.isTemplate = isTemplate === 'true'
        }

        if (visibility) {
            where.visibility = visibility
        }

        const charts = await prisma.analyticsChart.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        })

        const enrichedCharts = charts.map(chart => ({
            id: chart.id,
            name: chart.name,
            description: chart.description,
            slug: chart.slug,
            chartType: chart.chartType,
            config: chart.config,
            dataSource: chart.dataSource,
            datasetId: chart.datasetId,
            queryId: chart.queryId,
            metricId: chart.metricId,
            queryConfig: chart.queryConfig,
            visibility: chart.visibility,
            ownerId: chart.ownerId,
            ownerName: chart.ownerName,
            viewCount: chart.viewCount,
            lastViewedAt: chart.lastViewedAt?.toISOString() ?? null,
            isTemplate: chart.isTemplate,
            tags: chart.tags,
            isActive: chart.isActive,
            createdAt: chart.createdAt.toISOString(),
            updatedAt: chart.updatedAt.toISOString(),
        }))

        return NextResponse.json({ success: true, data: enrichedCharts })
    } catch (error) {
        logger.error('[ERROR]', error)
        return handleApiError(error)
    }
}

// ============================================
// POST â€” Create new chart
// ============================================

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:charts:POST:${ip}`, 30, 60000)
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
        const parsed = createAnalyticsChartSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: formatZodError(parsed.error) },
                { status: 400 }
            )
        }
        const validated = parsed.data

        const chart = await prisma.analyticsChart.create({
            data: {
                name: validated.name,
                description: validated.description,
                slug: validated.slug,
                chartType: validated.chartType,
                config: validated.config || '{}',
                dataSource: validated.dataSource || 'DATASET',
                datasetId: validated.datasetId || null,
                queryId: validated.queryId || null,
                metricId: validated.metricId || null,
                queryConfig: validated.queryConfig || null,
                visibility: validated.visibility || 'PRIVATE',
                ownerId: userId,
                ownerName: null,
                isTemplate: validated.isTemplate ?? false,
                tags: validated.tags || null,
                tenantId,
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                id: chart.id,
                name: chart.name,
                description: chart.description,
                slug: chart.slug,
                chartType: chart.chartType,
                config: chart.config,
                dataSource: chart.dataSource,
                datasetId: chart.datasetId,
                queryId: chart.queryId,
                metricId: chart.metricId,
                queryConfig: chart.queryConfig,
                visibility: chart.visibility,
                ownerId: chart.ownerId,
                isTemplate: chart.isTemplate,
                tags: chart.tags,
                isActive: chart.isActive,
                createdAt: chart.createdAt.toISOString(),
                updatedAt: chart.updatedAt.toISOString(),
            },
        }, { status: 201 })
    } catch (error) {
        logger.error('[ERROR]', error)
        return handleApiError(error)
    }
}
