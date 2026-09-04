// ============================================
// Saved Reports API — GET (list), POST (create)
// CRUD for saved analytics reports
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// ============================================
// TYPES
// ============================================

interface CreateReportBody {
    name: string
    description?: string
    type?: string
    config: Record<string, unknown>
    tags?: string[]
    folder?: string
}

// ============================================
// GET — List saved reports for tenant
// ============================================

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:reports:route:GET:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
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
        console.error('[Reports List Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// ============================================
// POST — Create saved report
// ============================================

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:reports:route:POST:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { userId, tenantId } = auth
        const body: CreateReportBody = await request.json()

        // Validate required fields
        if (!body.name || !body.config) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: name, config' },
                { status: 400 }
            )
        }

        // Validate type
        const validTypes = ['report', 'chart', 'pivot', 'query', 'dashboard']
        const type = body.type || 'report'
        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
                { status: 400 }
            )
        }

        const report = await prisma.savedReport.create({
            data: {
                name: body.name,
                description: body.description,
                type,
                config: body.config as Prisma.InputJsonValue,
                ownerId: userId,
                tenantId,
                tags: body.tags || [],
                folder: body.folder || null,
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
        console.error('[Report Create Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
