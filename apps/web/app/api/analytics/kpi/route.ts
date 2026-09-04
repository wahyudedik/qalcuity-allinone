// ============================================
// KPI API — GET (list), POST (create)
// CRUD for KPI definitions
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// ============================================
// TYPES
// ============================================

interface CreateKPIBody {
    name: string
    description?: string
    category: string
    metricId: string
    formula?: string
    target: number
    targetType?: string
    warningThreshold?: number
    criticalThreshold?: number
    period?: string
}

// ============================================
// GET — List all KPIs for tenant
// ============================================

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:kpi:route:GET:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')
        const isActive = searchParams.get('isActive')

        const where: Record<string, unknown> = { tenantId }

        if (category) {
            where.category = category
        }

        if (isActive !== null && isActive !== undefined) {
            where.isActive = isActive === 'true'
        }

        const kpis = await prisma.kPI.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                evaluations: {
                    orderBy: { evaluatedAt: 'desc' },
                    take: 1,
                },
            },
        })

        // Enrich with latest evaluation
        const enrichedKPIs = kpis.map(kpi => {
            const latestEval = kpi.evaluations[0]
            return {
                id: kpi.id,
                name: kpi.name,
                description: kpi.description,
                category: kpi.category,
                metricId: kpi.metricId,
                formula: kpi.formula,
                target: Number(kpi.target),
                targetType: kpi.targetType,
                warningThreshold: kpi.warningThreshold ? Number(kpi.warningThreshold) : null,
                criticalThreshold: kpi.criticalThreshold ? Number(kpi.criticalThreshold) : null,
                period: kpi.period,
                ownerId: kpi.ownerId,
                departmentId: kpi.departmentId,
                isActive: kpi.isActive,
                createdAt: kpi.createdAt.toISOString(),
                updatedAt: kpi.updatedAt.toISOString(),
                latestEvaluation: latestEval
                    ? {
                        value: Number(latestEval.value),
                        status: latestEval.status,
                        changePercent: latestEval.changePercent ? Number(latestEval.changePercent) : null,
                        evaluatedAt: latestEval.evaluatedAt.toISOString(),
                    }
                    : null,
            }
        })

        return NextResponse.json({ success: true, data: enrichedKPIs })
    } catch (error) {
        console.error('[KPI List Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// ============================================
// POST — Create new KPI
// ============================================

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:kpi:route:POST:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { userId, tenantId } = auth
        const body: CreateKPIBody = await request.json()

        // Validate required fields
        if (!body.name || !body.category || !body.metricId || body.target === undefined) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: name, category, metricId, target' },
                { status: 400 }
            )
        }

        // Validate category
        const validCategories = ['finance', 'sales', 'inventory', 'hr', 'crm', 'cross_module']
        if (!validCategories.includes(body.category)) {
            return NextResponse.json(
                { success: false, error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
                { status: 400 }
            )
        }

        // Validate period
        const validPeriods = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
        const period = body.period || 'monthly'
        if (!validPeriods.includes(period)) {
            return NextResponse.json(
                { success: false, error: `Invalid period. Must be one of: ${validPeriods.join(', ')}` },
                { status: 400 }
            )
        }

        const kpi = await prisma.kPI.create({
            data: {
                name: body.name,
                description: body.description,
                category: body.category,
                metricId: body.metricId,
                formula: body.formula,
                target: body.target,
                targetType: body.targetType || 'gte',
                warningThreshold: body.warningThreshold ?? 10,
                criticalThreshold: body.criticalThreshold ?? 25,
                period,
                ownerId: userId,
                tenantId,
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                id: kpi.id,
                name: kpi.name,
                description: kpi.description,
                category: kpi.category,
                metricId: kpi.metricId,
                formula: kpi.formula,
                target: Number(kpi.target),
                targetType: kpi.targetType,
                warningThreshold: kpi.warningThreshold ? Number(kpi.warningThreshold) : null,
                criticalThreshold: kpi.criticalThreshold ? Number(kpi.criticalThreshold) : null,
                period: kpi.period,
                ownerId: kpi.ownerId,
                isActive: kpi.isActive,
                createdAt: kpi.createdAt.toISOString(),
                updatedAt: kpi.updatedAt.toISOString(),
            },
        }, { status: 201 })
    } catch (error) {
        console.error('[KPI Create Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
