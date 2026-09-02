// ============================================
// Data Dictionary API — GET (list/search), POST (create)
// Data dictionary entries with search/filter
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'

// ============================================
// TYPES
// ============================================

interface CreateDictionaryEntryBody {
    name: string
    type: string
    category: string
    businessDef: string
    technicalDef?: string
    example?: string
    sourceModule: string
    sourceModel: string
    sourceField?: string
    formula?: string
    dependencies?: string
    upstreamDeps?: string
    downstreamDeps?: string
    freshness?: string
    reliability?: string
    owner?: string
    department?: string
}

// ============================================
// GET — List dictionary entries (with search)
// ============================================

export async function GET(request: Request) {
    try {
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
        console.error('[Dictionary List Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// ============================================
// POST — Create dictionary entry
// ============================================

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const body: CreateDictionaryEntryBody = await request.json()

        // Validate required fields
        if (!body.name || !body.type || !body.category || !body.businessDef || !body.sourceModule || !body.sourceModel) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: name, type, category, businessDef, sourceModule, sourceModel' },
                { status: 400 }
            )
        }

        // Validate type
        const validTypes = ['metric', 'dimension', 'measure', 'dataset', 'field']
        if (!validTypes.includes(body.type)) {
            return NextResponse.json(
                { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
                { status: 400 }
            )
        }

        // Validate category
        const validCategories = ['finance', 'sales', 'inventory', 'hr', 'crm']
        if (!validCategories.includes(body.category)) {
            return NextResponse.json(
                { success: false, error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
                { status: 400 }
            )
        }

        // Validate freshness if provided
        if (body.freshness) {
            const validFreshness = ['REALTIME', 'HOURLY', 'DAILY', 'WEEKLY']
            if (!validFreshness.includes(body.freshness)) {
                return NextResponse.json(
                    { success: false, error: `Invalid freshness. Must be one of: ${validFreshness.join(', ')}` },
                    { status: 400 }
                )
            }
        }

        // Validate reliability if provided
        if (body.reliability) {
            const validReliability = ['HIGH', 'MEDIUM', 'LOW']
            if (!validReliability.includes(body.reliability)) {
                return NextResponse.json(
                    { success: false, error: `Invalid reliability. Must be one of: ${validReliability.join(', ')}` },
                    { status: 400 }
                )
            }
        }

        const entry = await prisma.dataDictionaryEntry.create({
            data: {
                name: body.name,
                type: body.type,
                category: body.category,
                businessDef: body.businessDef,
                technicalDef: body.technicalDef || null,
                example: body.example || null,
                sourceModule: body.sourceModule,
                sourceModel: body.sourceModel,
                sourceField: body.sourceField || null,
                formula: body.formula || null,
                dependencies: body.dependencies || null,
                upstreamDeps: body.upstreamDeps || null,
                downstreamDeps: body.downstreamDeps || null,
                freshness: body.freshness || null,
                reliability: body.reliability || null,
                owner: body.owner || null,
                department: body.department || null,
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
        console.error('[Dictionary Create Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
