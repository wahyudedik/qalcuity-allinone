export const dynamic = 'force-dynamic';

// ============================================
// Dashboards API â€” GET (list), POST (create)
// CRUD for Analytics Dashboards
// ============================================

import { NextResponse } from 'next/server'
import { MSG } from '@/lib/api-messages'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-error'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { createDashboardSchema } from '@/lib/validation-schemas'
import { logger } from '@/lib/logger'

// ============================================
// GET â€” List all dashboards for tenant
// ============================================

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:dashboards:route:GET:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 })
        }

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
        logger.error('[ERROR]', error)
        return handleApiError(error)
    }
}

// ============================================
// POST â€” Create new dashboard
// ============================================

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:dashboards:route:POST:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { userId, tenantId } = auth

        // Validasi input dengan Zod schema
        const body = await request.json()
        const validated = createDashboardSchema.safeParse(body)
        if (!validated.success) {
            return NextResponse.json(
                { success: false, error: validated.error.issues[0]?.message || MSG.INVALID_INPUT },
                { status: 400 }
            )
        }

        const visibility = validated.data.visibility || 'PRIVATE'

        const dashboard = await prisma.analyticsDashboard.create({
            data: {
                name: validated.data.name,
                description: validated.data.description,
                slug: validated.data.slug,
                layout: validated.data.layout || '{}',
                theme: validated.data.theme || null,
                visibility,
                ownerId: userId,
                ownerName: null,
                department: validated.data.department || null,
                allowedRoles: validated.data.allowedRoles || null,
                allowedUsers: validated.data.allowedUsers || null,
                isDefault: validated.data.isDefault ?? false,
                isTemplate: validated.data.isTemplate ?? false,
                tags: validated.data.tags || null,
                refreshAll: validated.data.refreshAll ?? null,
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
        logger.error('[ERROR]', error)
        return handleApiError(error)
    }
}
