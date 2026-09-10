export const dynamic = 'force-dynamic';

// ============================================
// Saved Reports API â€” GET (list), POST (create)
// CRUD for saved analytics reports
// ============================================

import { NextResponse } from 'next/server'
import { MSG } from '@/lib/api-messages'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-error'
import type { Prisma } from '@prisma/client'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { createReportSchema } from '@/lib/validation-schemas'

// ============================================
// GET â€” List saved reports for tenant
// ============================================

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:reports:route:GET:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type')
        const isStarred = searchParams.get('isStarred')
        const folder = searchParams.get('folder')

        const where: Prisma.SavedReportWhereInput = { tenantId }

        if (type) {
            where.type = type
        }

        if (isStarred !== null && isStarred !== undefined) {
            where.isStarred = isStarred === 'true'
        }

        if (folder) {
            where.folder = folder
        }

        const reports = await prisma.savedReport.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            include: {
                owner: {
                    select: { id: true, name: true, email: true },
                },
            },
        })

        const enrichedReports = reports.map((report) => ({
            id: report.id,
            name: report.name,
            description: report.description,
            type: report.type,
            config: report.config,
            tags: report.tags,
            folder: report.folder,
            isStarred: report.isStarred,
            lastRunAt: report.lastRunAt?.toISOString() || null,
            createdAt: report.createdAt.toISOString(),
            updatedAt: report.updatedAt.toISOString(),
            owner: {
                id: report.owner.id,
                name: report.owner.name,
            },
        }))

        return NextResponse.json({ success: true, data: enrichedReports })
    } catch (error) {
        console.error('[ERROR]', error)
        return handleApiError(error)
    }
}

// ============================================
// POST â€” Create saved report
// ============================================

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:reports:route:POST:${ip}`, 60, 60000)
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
        const validated = createReportSchema.safeParse(body)
        if (!validated.success) {
            return NextResponse.json(
                { success: false, error: validated.error.issues[0]?.message || MSG.INVALID_INPUT },
                { status: 400 }
            )
        }

        const type = validated.data.type || 'report'

        const report = await prisma.savedReport.create({
            data: {
                name: validated.data.name,
                description: validated.data.description,
                type,
                config: validated.data.config as Prisma.InputJsonValue,
                ownerId: userId,
                tenantId,
                tags: validated.data.tags || [],
                folder: validated.data.folder || null,
            },
            include: {
                owner: {
                    select: { id: true, name: true, email: true },
                },
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                id: report.id,
                name: report.name,
                description: report.description,
                type: report.type,
                config: report.config,
                tags: report.tags,
                folder: report.folder,
                isStarred: report.isStarred,
                createdAt: report.createdAt.toISOString(),
                updatedAt: report.updatedAt.toISOString(),
                owner: {
                    id: report.owner.id,
                    name: report.owner.name,
                },
            },
        }, { status: 201 })
    } catch (error) {
        console.error('[ERROR]', error)
        return handleApiError(error)
    }
}
