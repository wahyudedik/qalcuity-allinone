export const dynamic = 'force-dynamic';

// ============================================
// KPI API â€” GET (list), POST (create)
// CRUD for KPI definitions
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { handleApiError } from '@/lib/api-error'
import { createKPISchema } from '@/lib/validation-schemas'
import { MSG } from '@/lib/api-messages'
import { logger } from '@/lib/logger'

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
// GET â€” List all KPIs for tenant
// ============================================

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:kpi:route:GET:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 })
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
        logger.error('[KPI List Error]', error)
        return handleApiError(error)
    }
}

// ============================================
// POST â€” Create new KPI
// ============================================

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:kpi:route:POST:${ip}`, 60, 60000)
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
        const validated = createKPISchema.safeParse(body)
        if (!validated.success) {
            return NextResponse.json(
                { success: false, error: validated.error.issues[0]?.message || MSG.INVALID_INPUT },
                { status: 400 }
            )
        }

        const period = validated.data.period || 'monthly'

        const kpi = await prisma.kPI.create({
            data: {
                name: validated.data.name,
                description: validated.data.description,
                category: validated.data.category,
                metricId: validated.data.metricId,
                formula: validated.data.formula,
                target: validated.data.target,
                targetType: validated.data.targetType || 'gte',
                warningThreshold: validated.data.warningThreshold ?? 10,
                criticalThreshold: validated.data.criticalThreshold ?? 25,
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
        logger.error('[KPI Create Error]', error)
        return handleApiError(error)
    }
}
