// ============================================
// KPI Detail API — GET, PUT, DELETE
// KPI by ID operations
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'

// ============================================
// TYPES
// ============================================

interface UpdateKPIBody {
    name?: string
    description?: string
    category?: string
    metricId?: string
    formula?: string
    target?: number
    targetType?: string
    warningThreshold?: number
    criticalThreshold?: number
    period?: string
    isActive?: boolean
}

// ============================================
// GET — KPI detail
// ============================================

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { id } = params

        const kpi = await prisma.kPI.findFirst({
            where: { id, tenantId },
            include: {
                evaluations: {
                    orderBy: { evaluatedAt: 'desc' },
                    take: 10,
                },
            },
        })

        if (!kpi) {
            return NextResponse.json(
                { success: false, error: 'KPI not found' },
                { status: 404 }
            )
        }

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
                departmentId: kpi.departmentId,
                isActive: kpi.isActive,
                createdAt: kpi.createdAt.toISOString(),
                updatedAt: kpi.updatedAt.toISOString(),
                evaluations: kpi.evaluations.map(ev => ({
                    id: ev.id,
                    value: Number(ev.value),
                    target: Number(ev.target),
                    status: ev.status,
                    changePercent: ev.changePercent ? Number(ev.changePercent) : null,
                    previousValue: ev.previousValue ? Number(ev.previousValue) : null,
                    period: ev.period,
                    evaluatedAt: ev.evaluatedAt.toISOString(),
                })),
            },
        })
    } catch (error) {
        console.error('[KPI Detail Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// ============================================
// PUT — Update KPI
// ============================================

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { id } = params
        const body: UpdateKPIBody = await request.json()

        // Check KPI exists and belongs to tenant
        const existing = await prisma.kPI.findFirst({
            where: { id, tenantId },
        })

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'KPI not found' },
                { status: 404 }
            )
        }

        // Validate category if provided
        if (body.category) {
            const validCategories = ['finance', 'sales', 'inventory', 'hr', 'crm', 'cross_module']
            if (!validCategories.includes(body.category)) {
                return NextResponse.json(
                    { success: false, error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
                    { status: 400 }
                )
            }
        }

        // Validate period if provided
        if (body.period) {
            const validPeriods = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
            if (!validPeriods.includes(body.period)) {
                return NextResponse.json(
                    { success: false, error: `Invalid period. Must be one of: ${validPeriods.join(', ')}` },
                    { status: 400 }
                )
            }
        }

        const updateData: Record<string, unknown> = {}
        if (body.name !== undefined) updateData.name = body.name
        if (body.description !== undefined) updateData.description = body.description
        if (body.category !== undefined) updateData.category = body.category
        if (body.metricId !== undefined) updateData.metricId = body.metricId
        if (body.formula !== undefined) updateData.formula = body.formula
        if (body.target !== undefined) updateData.target = body.target
        if (body.targetType !== undefined) updateData.targetType = body.targetType
        if (body.warningThreshold !== undefined) updateData.warningThreshold = body.warningThreshold
        if (body.criticalThreshold !== undefined) updateData.criticalThreshold = body.criticalThreshold
        if (body.period !== undefined) updateData.period = body.period
        if (body.isActive !== undefined) updateData.isActive = body.isActive

        const updated = await prisma.kPI.update({
            where: { id },
            data: updateData,
        })

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                name: updated.name,
                description: updated.description,
                category: updated.category,
                metricId: updated.metricId,
                formula: updated.formula,
                target: Number(updated.target),
                targetType: updated.targetType,
                warningThreshold: updated.warningThreshold ? Number(updated.warningThreshold) : null,
                criticalThreshold: updated.criticalThreshold ? Number(updated.criticalThreshold) : null,
                period: updated.period,
                ownerId: updated.ownerId,
                isActive: updated.isActive,
                createdAt: updated.createdAt.toISOString(),
                updatedAt: updated.updatedAt.toISOString(),
            },
        })
    } catch (error) {
        console.error('[KPI Update Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// ============================================
// DELETE — Delete KPI
// ============================================

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { id } = params

        // Check KPI exists and belongs to tenant
        const existing = await prisma.kPI.findFirst({
            where: { id, tenantId },
        })

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'KPI not found' },
                { status: 404 }
            )
        }

        // Delete associated evaluations first
        await prisma.kPIEvaluation.deleteMany({
            where: { kpiId: id },
        })

        // Delete KPI
        await prisma.kPI.delete({
            where: { id },
        })

        return NextResponse.json({
            success: true,
            data: { message: 'KPI deleted successfully' },
        })
    } catch (error) {
        console.error('[KPI Delete Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
