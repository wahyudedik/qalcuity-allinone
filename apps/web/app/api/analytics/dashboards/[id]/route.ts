// ============================================
// Dashboard Detail API — GET, PUT, DELETE
// Dashboard by ID operations
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// ============================================
// TYPES
// ============================================

interface UpdateDashboardBody {
    name?: string
    description?: string
    slug?: string
    layout?: string
    theme?: string
    visibility?: string
    department?: string
    allowedRoles?: string
    allowedUsers?: string
    isDefault?: boolean
    isTemplate?: boolean
    tags?: string
    refreshAll?: number
    isActive?: boolean
}

// ============================================
// GET — Dashboard detail with widgets
// ============================================

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:dashboards:[id]:route:GET:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { id } = params

        const dashboard = await prisma.analyticsDashboard.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                widgets: {
                    orderBy: [{ gridY: 'asc' }, { gridX: 'asc' }],
                },
            },
        })

        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: 'Dashboard not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: {
                id: dashboard.id,
                name: dashboard.name,
                description: dashboard.description,
                slug: dashboard.slug,
                layout: dashboard.layout,
                theme: dashboard.theme,
                visibility: dashboard.visibility,
                ownerId: dashboard.ownerId,
                ownerName: dashboard.ownerName,
                department: dashboard.department,
                allowedRoles: dashboard.allowedRoles,
                allowedUsers: dashboard.allowedUsers,
                isDefault: dashboard.isDefault,
                isTemplate: dashboard.isTemplate,
                tags: dashboard.tags,
                viewCount: dashboard.viewCount,
                lastViewedAt: dashboard.lastViewedAt?.toISOString() ?? null,
                refreshAll: dashboard.refreshAll,
                isActive: dashboard.isActive,
                createdAt: dashboard.createdAt.toISOString(),
                updatedAt: dashboard.updatedAt.toISOString(),
                widgets: dashboard.widgets.map(widget => ({
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
                })),
            },
        })
    } catch (error) {
        console.error('[Dashboard Detail Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// ============================================
// PUT — Update dashboard
// ============================================

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:dashboards:[id]:route:PUT:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { id } = params
        const body: UpdateDashboardBody = await request.json()

        // Check dashboard exists and belongs to tenant
        const existing = await prisma.analyticsDashboard.findFirst({
            where: { id, tenantId, deletedAt: null },
        })

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Dashboard not found' },
                { status: 404 }
            )
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

        // Validate theme if provided
        if (body.theme) {
            const validThemes = ['LIGHT', 'DARK', 'AUTO']
            if (!validThemes.includes(body.theme)) {
                return NextResponse.json(
                    { success: false, error: `Invalid theme. Must be one of: ${validThemes.join(', ')}` },
                    { status: 400 }
                )
            }
        }

        const updateData: Record<string, unknown> = {}
        if (body.name !== undefined) updateData.name = body.name
        if (body.description !== undefined) updateData.description = body.description
        if (body.slug !== undefined) updateData.slug = body.slug
        if (body.layout !== undefined) updateData.layout = body.layout
        if (body.theme !== undefined) updateData.theme = body.theme
        if (body.visibility !== undefined) updateData.visibility = body.visibility
        if (body.department !== undefined) updateData.department = body.department
        if (body.allowedRoles !== undefined) updateData.allowedRoles = body.allowedRoles
        if (body.allowedUsers !== undefined) updateData.allowedUsers = body.allowedUsers
        if (body.isDefault !== undefined) updateData.isDefault = body.isDefault
        if (body.isTemplate !== undefined) updateData.isTemplate = body.isTemplate
        if (body.tags !== undefined) updateData.tags = body.tags
        if (body.refreshAll !== undefined) updateData.refreshAll = body.refreshAll
        if (body.isActive !== undefined) updateData.isActive = body.isActive

        const updated = await prisma.analyticsDashboard.update({
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
                layout: updated.layout,
                theme: updated.theme,
                visibility: updated.visibility,
                ownerId: updated.ownerId,
                ownerName: updated.ownerName,
                department: updated.department,
                allowedRoles: updated.allowedRoles,
                allowedUsers: updated.allowedUsers,
                isDefault: updated.isDefault,
                isTemplate: updated.isTemplate,
                tags: updated.tags,
                viewCount: updated.viewCount,
                lastViewedAt: updated.lastViewedAt?.toISOString() ?? null,
                refreshAll: updated.refreshAll,
                isActive: updated.isActive,
                createdAt: updated.createdAt.toISOString(),
                updatedAt: updated.updatedAt.toISOString(),
            },
        })
    } catch (error) {
        console.error('[Dashboard Update Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// ============================================
// DELETE — Delete dashboard (soft delete)
// ============================================

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:dashboards:[id]:route:DELETE:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { id } = params

        // Check dashboard exists and belongs to tenant
        const existing = await prisma.analyticsDashboard.findFirst({
            where: { id, tenantId, deletedAt: null },
        })

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Dashboard not found' },
                { status: 404 }
            )
        }

        // Soft delete dashboard (widgets cascade via onDelete: Cascade in schema)
        await prisma.analyticsDashboard.update({
            where: { id },
            data: { deletedAt: new Date() },
        })

        return NextResponse.json({
            success: true,
            data: { message: 'Dashboard deleted successfully' },
        })
    } catch (error) {
        console.error('[Dashboard Delete Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
