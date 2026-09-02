// ============================================
// Charts API — GET (list), POST (create)
// CRUD for Analytics Charts
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'

// ============================================
// TYPES
// ============================================

interface CreateChartBody {
    name: string
    description?: string
    slug: string
    chartType: string
    config?: string
    dataSource?: string
    datasetId?: string
    queryId?: string
    metricId?: string
    queryConfig?: string
    visibility?: string
    isTemplate?: boolean
    tags?: string
}

// ============================================
// GET — List all charts for tenant
// ============================================

export async function GET(request: Request) {
    try {
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
        console.error('[Charts List Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// ============================================
// POST — Create new chart
// ============================================

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { userId, tenantId } = auth
        const body: CreateChartBody = await request.json()

        // Validate required fields
        if (!body.name || !body.slug || !body.chartType) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: name, slug, chartType' },
                { status: 400 }
            )
        }

        // Validate chartType
        const validChartTypes = ['bar', 'line', 'pie', 'donut', 'area', 'scatter', 'heatmap', 'kpi_card', 'table']
        if (!validChartTypes.includes(body.chartType)) {
            return NextResponse.json(
                { success: false, error: `Invalid chartType. Must be one of: ${validChartTypes.join(', ')}` },
                { status: 400 }
            )
        }

        // Validate visibility
        const validVisibilities = ['PRIVATE', 'TEAM', 'DEPARTMENT', 'ORGANIZATION']
        const visibility = body.visibility || 'PRIVATE'
        if (!validVisibilities.includes(visibility)) {
            return NextResponse.json(
                { success: false, error: `Invalid visibility. Must be one of: ${validVisibilities.join(', ')}` },
                { status: 400 }
            )
        }

        // Validate dataSource
        const validDataSources = ['DATASET', 'QUERY', 'METRIC']
        const dataSource = body.dataSource || 'DATASET'
        if (!validDataSources.includes(dataSource)) {
            return NextResponse.json(
                { success: false, error: `Invalid dataSource. Must be one of: ${validDataSources.join(', ')}` },
                { status: 400 }
            )
        }

        const chart = await prisma.analyticsChart.create({
            data: {
                name: body.name,
                description: body.description,
                slug: body.slug,
                chartType: body.chartType,
                config: body.config || '{}',
                dataSource,
                datasetId: body.datasetId || null,
                queryId: body.queryId || null,
                metricId: body.metricId || null,
                queryConfig: body.queryConfig || null,
                visibility,
                ownerId: userId,
                ownerName: null,
                isTemplate: body.isTemplate ?? false,
                tags: body.tags || null,
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
        console.error('[Charts Create Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
