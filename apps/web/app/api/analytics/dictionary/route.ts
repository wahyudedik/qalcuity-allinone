export const dynamic = 'force-dynamic';

// ============================================
// Data Dictionary API â€” GET (list/search), POST (create)
// Data dictionary entries with search/filter
// ============================================

import { NextResponse } from 'next/server'
import { MSG } from '@/lib/api-messages'
import { requirePermissionForRoute } from '@/lib/session'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-error'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { createDictionaryEntrySchema, formatZodError } from '@/lib/validation-schemas'

// ============================================
// GET â€” List dictionary entries (with search)
// ============================================

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:dictionary:route:GET:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search')
        const type = searchParams.get('type')
        const category = searchParams.get('category')
        const sourceModule = searchParams.get('sourceModule')
        const isActive = searchParams.get('isActive')

        const where: Record<string, unknown> = { tenantId }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { businessDef: { contains: search, mode: 'insensitive' } },
            ]
        }

        if (type) {
            where.type = type
        }

        if (category) {
            where.category = category
        }

        if (sourceModule) {
            where.sourceModule = sourceModule
        }

        if (isActive !== null && isActive !== undefined) {
            where.isActive = isActive === 'true'
        }

        const entries = await prisma.dataDictionaryEntry.findMany({
            where,
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        })

        const enrichedEntries = entries.map(entry => ({
            id: entry.id,
            name: entry.name,
            type: entry.type,
            category: entry.category,
            businessDef: entry.businessDef,
            technicalDef: entry.technicalDef,
            example: entry.example,
            sourceModule: entry.sourceModule,
            sourceModel: entry.sourceModel,
            sourceField: entry.sourceField,
            formula: entry.formula,
            dependencies: entry.dependencies,
            upstreamDeps: entry.upstreamDeps,
            downstreamDeps: entry.downstreamDeps,
            freshness: entry.freshness,
            reliability: entry.reliability,
            lastVerified: entry.lastVerified?.toISOString() ?? null,
            owner: entry.owner,
            department: entry.department,
            isActive: entry.isActive,
            createdAt: entry.createdAt.toISOString(),
            updatedAt: entry.updatedAt.toISOString(),
        }))

        return NextResponse.json({ success: true, data: enrichedEntries })
    } catch (error) {
        logger.error('[ERROR]', error)
        return handleApiError(error)
    }
}

// ============================================
// POST â€” Create dictionary entry
// ============================================

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:dictionary:route:POST:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const body = await request.json()

        // Validate with Zod
        const parsed = createDictionaryEntrySchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: formatZodError(parsed.error) },
                { status: 400 }
            )
        }
        const validated = parsed.data

        const entry = await prisma.dataDictionaryEntry.create({
            data: {
                name: validated.name,
                type: validated.type,
                category: validated.category,
                businessDef: validated.businessDef,
                technicalDef: validated.technicalDef || null,
                example: validated.example || null,
                sourceModule: validated.sourceModule,
                sourceModel: validated.sourceModel,
                sourceField: validated.sourceField || null,
                formula: validated.formula || null,
                dependencies: validated.dependencies || null,
                upstreamDeps: validated.upstreamDeps || null,
                downstreamDeps: validated.downstreamDeps || null,
                freshness: validated.freshness || null,
                reliability: validated.reliability || null,
                owner: validated.owner || null,
                department: validated.department || null,
                tenantId,
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                id: entry.id,
                name: entry.name,
                type: entry.type,
                category: entry.category,
                businessDef: entry.businessDef,
                technicalDef: entry.technicalDef,
                example: entry.example,
                sourceModule: entry.sourceModule,
                sourceModel: entry.sourceModel,
                sourceField: entry.sourceField,
                formula: entry.formula,
                dependencies: entry.dependencies,
                upstreamDeps: entry.upstreamDeps,
                downstreamDeps: entry.downstreamDeps,
                freshness: entry.freshness,
                reliability: entry.reliability,
                lastVerified: entry.lastVerified?.toISOString() ?? null,
                owner: entry.owner,
                department: entry.department,
                isActive: entry.isActive,
                createdAt: entry.createdAt.toISOString(),
                updatedAt: entry.updatedAt.toISOString(),
            },
        }, { status: 201 })
    } catch (error) {
        logger.error('[ERROR]', error)
        return handleApiError(error)
    }
}
