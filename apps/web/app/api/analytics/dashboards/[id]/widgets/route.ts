// ============================================
// Dashboard Widgets API — GET (list), POST (create)
// Widgets for a specific dashboard
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// ============================================
// TYPES
// ============================================

interface CreateWidgetBody {
    title: string
    type: string
    chartType?: string
    size?: string
    gridX?: number
    gridY?: number
    gridW?: number
    gridH?: number
    dataSource?: string
    metricId?: string
    chartId?: string
    queryId?: string
    sql?: string
    staticData?: string
    config?: string
    refreshInterval?: number
}

// ============================================
// GET — List widgets for dashboard
// ============================================

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:dashboards:[id]:widgets:route:GET:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { id: dashboardId } = params

        // Verify dashboard exists and belongs to tenant
        const dashboard = await prisma.analyticsDashboard.findFirst({
            where: { id: dashboardId, tenantId, deletedAt: null },
        })

        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: 'Dashboard not found' },
                { status: 404 }
            )
        }

        const widgets = await prisma.analyticsDashboardWidget.findMany({
            where: { dashboardId, tenantId },
            orderBy: [{ gridY: 'asc' }, { gridX: 'asc' }],
        })

        const enrichedWidgets = widgets.map(widget => ({
            id: widget.id,
            title: widget.title,
            type: widget.type,
            chartType: widget.chartType,
            size: widget.size,
            gridX: widget.gridX,
            gridY: widget.gridY,
            gridW: widget.gridW,
            gridH: widget.gridH,
            dataSource: widget.dataSource,
            metricId: widget.metricId,
            chartId: widget.chartId,
            queryId: widget.queryId,
            sql: widget.sql,
            staticData: widget.staticData,
            config: widget.config,
            refreshInterval: widget.refreshInterval,
            createdAt: widget.createdAt.toISOString(),
            updatedAt: widget.updatedAt.toISOString(),
        }))

        return NextResponse.json({ success: true, data: enrichedWidgets })
    } catch (error) {
        console.error('[Dashboard Widgets List Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// ============================================
// POST — Add widget to dashboard
// ============================================

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:dashboards:[id]:widgets:route:POST:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { id: dashboardId } = params
        const body: CreateWidgetBody = await request.json()

        // Verify dashboard exists and belongs to tenant
        const dashboard = await prisma.analyticsDashboard.findFirst({
            where: { id: dashboardId, tenantId, deletedAt: null },
        })

        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: 'Dashboard not found' },
                { status: 404 }
            )
        }

        // Validate required fields
        if (!body.title || !body.type) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: title, type' },
                { status: 400 }
            )
        }

        // Validate widget type
        const validWidgetTypes = ['CHART', 'KPI_CARD', 'TABLE', 'TEXT', 'IMAGE', 'METRIC_COMPARISON']
        if (!validWidgetTypes.includes(body.type)) {
            return NextResponse.json(
                { success: false, error: `Invalid type. Must be one of: ${validWidgetTypes.join(', ')}` },
                { status: 400 }
            )
        }

        // Validate size if provided
        if (body.size) {
            const validSizes = ['SMALL', 'MEDIUM', 'LARGE', 'FULL_WIDTH']
            if (!validSizes.includes(body.size)) {
                return NextResponse.json(
                    { success: false, error: `Invalid size. Must be one of: ${validSizes.join(', ')}` },
                    { status: 400 }
                )
            }
        }

        // Validate dataSource if provided
        if (body.dataSource) {
            const validDataSources = ['METRIC', 'CHART', 'QUERY', 'SQL', 'STATIC']
            if (!validDataSources.includes(body.dataSource)) {
                return NextResponse.json(
                    { success: false, error: `Invalid dataSource. Must be one of: ${validDataSources.join(', ')}` },
                    { status: 400 }
                )
            }
        }

        const widget = await prisma.analyticsDashboardWidget.create({
            data: {
                title: body.title,
                type: body.type,
                chartType: body.chartType || null,
                size: body.size || 'MEDIUM',
                gridX: body.gridX ?? 0,
                gridY: body.gridY ?? 0,
                gridW: body.gridW ?? 6,
                gridH: body.gridH ?? 4,
                dataSource: body.dataSource || 'METRIC',
                metricId: body.metricId || null,
                chartId: body.chartId || null,
                queryId: body.queryId || null,
                sql: body.sql || null,
                staticData: body.staticData || null,
                config: body.config || '{}',
                refreshInterval: body.refreshInterval ?? null,
                dashboardId,
                tenantId,
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                id: widget.id,
                title: widget.title,
                type: widget.type,
                chartType: widget.chartType,
                size: widget.size,
                gridX: widget.gridX,
                gridY: widget.gridY,
                gridW: widget.gridW,
                gridH: widget.gridH,
                dataSource: widget.dataSource,
                metricId: widget.metricId,
                chartId: widget.chartId,
                queryId: widget.queryId,
                sql: widget.sql,
                staticData: widget.staticData,
                config: widget.config,
                refreshInterval: widget.refreshInterval,
                createdAt: widget.createdAt.toISOString(),
                updatedAt: widget.updatedAt.toISOString(),
            },
        }, { status: 201 })
    } catch (error) {
        console.error('[Dashboard Widgets Create Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
