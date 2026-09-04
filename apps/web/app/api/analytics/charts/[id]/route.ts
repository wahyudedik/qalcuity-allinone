// ============================================
// Chart Detail API — GET, PUT, DELETE
// Chart by ID operations
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// ============================================
// TYPES
// ============================================

interface UpdateChartBody {
    name?: string
    description?: string
    slug?: string
    chartType?: string
    config?: string
    dataSource?: string
    datasetId?: string
    queryId?: string
    metricId?: string
    queryConfig?: string
    visibility?: string
    isTemplate?: boolean
    tags?: string
    isActive?: boolean
}

// ============================================
// GET — Chart detail
// ============================================

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:charts:[id]:route:GET:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { id } = params

        const chart = await prisma.analyticsChart.findFirst({
            where: { id, tenantId, deletedAt: null },
        })

        if (!chart) {
            return NextResponse.json(
                { success: false, error: 'Chart not found' },
                { status: 404 }
            )
        }

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
                ownerName: chart.ownerName,
                viewCount: chart.viewCount,
                lastViewedAt: chart.lastViewedAt?.toISOString() ?? null,
                isTemplate: chart.isTemplate,
                tags: chart.tags,
                isActive: chart.isActive,
                createdAt: chart.createdAt.toISOString(),
                updatedAt: chart.updatedAt.toISOString(),
            },
        })
    } catch (error) {
        console.error('[Chart Detail Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// ============================================
// PUT — Update chart
// ============================================

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:charts:[id]:route:PUT:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { id } = params
        const body: UpdateChartBody = await request.json()

        // Check chart exists and belongs to tenant
        const existing = await prisma.analyticsChart.findFirst({
            where: { id, tenantId, deletedAt: null },
        })

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Chart not found' },
                { status: 404 }
            )
        }

        // Validate chartType if provided
        if (body.chartType) {
            const validChartTypes = ['bar', 'line', 'pie', 'donut', 'area', 'scatter', 'heatmap', 'kpi_card', 'table']
            if (!validChartTypes.includes(body.chartType)) {
                return NextResponse.json(
                    { success: false, error: `Invalid chartType. Must be one of: ${validChartTypes.join(', ')}` },
                    { status: 400 }
                )
            }
        }

        // Validate visibility if provided
        if (body.visibility) {
            const validVisibilities = ['PRIVATE', 'TEAM', 'DEPARTMENT', 'ORGANIZATION']
            if (!validVisibilities.includes(body.visibility)) {
                return NextResponse.json(
                    { success: false, error: `Invalid visibility. Must be one of: ${validVisibilities.join(', ')}` },
                    { status: 400 }
                )
            }
        }

        // Validate dataSource if provided
        if (body.dataSource) {
            const validDataSources = ['DATASET', 'QUERY', 'METRIC']
            if (!validDataSources.includes(body.dataSource)) {
                return NextResponse.json(
                    { success: false, error: `Invalid dataSource. Must be one of: ${validDataSources.join(', ')}` },
                    { status: 400 }
                )
            }
        }

        const updateData: Record<string, unknown> = {}
        if (body.name !== undefined) updateData.name = body.name
        if (body.description !== undefined) updateData.description = body.description
        if (body.slug !== undefined) updateData.slug = body.slug
        if (body.chartType !== undefined) updateData.chartType = body.chartType
        if (body.config !== undefined) updateData.config = body.config
        if (body.dataSource !== undefined) updateData.dataSource = body.dataSource
        if (body.datasetId !== undefined) updateData.datasetId = body.datasetId
        if (body.queryId !== undefined) updateData.queryId = body.queryId
        if (body.metricId !== undefined) updateData.metricId = body.metricId
        if (body.queryConfig !== undefined) updateData.queryConfig = body.queryConfig
        if (body.visibility !== undefined) updateData.visibility = body.visibility
        if (body.isTemplate !== undefined) updateData.isTemplate = body.isTemplate
        if (body.tags !== undefined) updateData.tags = body.tags
        if (body.isActive !== undefined) updateData.isActive = body.isActive

        const updated = await prisma.analyticsChart.update({
            where: { id },
            data: updateData,
        })

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                name: updated.name,
                description: updated.description,
                slug: updated.slug,
                chartType: updated.chartType,
                config: updated.config,
                dataSource: updated.dataSource,
                datasetId: updated.datasetId,
                queryId: updated.queryId,
                metricId: updated.metricId,
                queryConfig: updated.queryConfig,
                visibility: updated.visibility,
                ownerId: updated.ownerId,
                ownerName: updated.ownerName,
                viewCount: updated.viewCount,
                lastViewedAt: updated.lastViewedAt?.toISOString() ?? null,
                isTemplate: updated.isTemplate,
                tags: updated.tags,
                isActive: updated.isActive,
                createdAt: updated.createdAt.toISOString(),
                updatedAt: updated.updatedAt.toISOString(),
            },
        })
    } catch (error) {
        console.error('[Chart Update Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// ============================================
// DELETE — Delete chart (soft delete)
// ============================================

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:charts:[id]:route:DELETE:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { id } = params

        // Check chart exists and belongs to tenant
        const existing = await prisma.analyticsChart.findFirst({
            where: { id, tenantId, deletedAt: null },
        })

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Chart not found' },
                { status: 404 }
            )
        }

        // Soft delete
        await prisma.analyticsChart.update({
            where: { id },
            data: { deletedAt: new Date() },
        })

        return NextResponse.json({
            success: true,
            data: { message: 'Chart deleted successfully' },
        })
    } catch (error) {
        console.error('[Chart Delete Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
