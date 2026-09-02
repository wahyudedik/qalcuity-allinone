// ============================================
// Dashboards API — GET (list), POST (create)
// CRUD for Analytics Dashboards
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'

// ============================================
// TYPES
// ============================================

interface CreateDashboardBody {
    name: string
    description?: string
    slug: string
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
}

// ============================================
// GET — List all dashboards for tenant
// ============================================

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { searchParams } = new URL(request.url)
        const isActive = searchParams.get('isActive')
        const isDefault = searchParams.get('isDefault')
        const isTemplate = searchParams.get('isTemplate')
        const visibility = searchParams.get('visibility')

        const where: Record<string, unknown> = { tenantId, deletedAt: null }

        if (isActive !== null && isActive !== undefined) {
            where.isActive = isActive === 'true'
        }

        if (isDefault !== null && isDefault !== undefined) {
            where.isDefault = isDefault === 'true'
        }

        if (isTemplate !== null && isTemplate !== undefined) {
            where.isTemplate = isTemplate === 'true'
        }

        if (visibility) {
            where.visibility = visibility
        }

        const dashboards = await prisma.analyticsDashboard.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                widgets: {
                    select: { id: true },
                },
            },
        })

        const enrichedDashboards = dashboards.map(dashboard => ({
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
            widgetCount: dashboard.widgets.length,
            createdAt: dashboard.createdAt.toISOString(),
            updatedAt: dashboard.updatedAt.toISOString(),
        }))

        return NextResponse.json({ success: true, data: enrichedDashboards })
    } catch (error) {
        console.error('[Dashboards List Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// ============================================
// POST — Create new dashboard
// ============================================

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { userId, tenantId } = auth
        const body: CreateDashboardBody = await request.json()

        // Validate required fields
        if (!body.name || !body.slug) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: name, slug' },
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

        const dashboard = await prisma.analyticsDashboard.create({
            data: {
                name: body.name,
                description: body.description,
                slug: body.slug,
                layout: body.layout || '{}',
                theme: body.theme || null,
                visibility,
                ownerId: userId,
                ownerName: null,
                department: body.department || null,
                allowedRoles: body.allowedRoles || null,
                allowedUsers: body.allowedUsers || null,
                isDefault: body.isDefault ?? false,
                isTemplate: body.isTemplate ?? false,
                tags: body.tags || null,
                refreshAll: body.refreshAll ?? null,
                tenantId,
            },
        })

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
                department: dashboard.department,
                isDefault: dashboard.isDefault,
                isTemplate: dashboard.isTemplate,
                tags: dashboard.tags,
                refreshAll: dashboard.refreshAll,
                isActive: dashboard.isActive,
                createdAt: dashboard.createdAt.toISOString(),
                updatedAt: dashboard.updatedAt.toISOString(),
            },
        }, { status: 201 })
    } catch (error) {
        console.error('[Dashboards Create Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
