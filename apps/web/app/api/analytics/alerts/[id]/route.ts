// ============================================
// Alert Rule Detail API — GET, PUT, DELETE
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'

// ============================================
// TYPES
// ============================================

interface UpdateAlertBody {
    name?: string
    description?: string
    metricId?: string
    condition?: string
    threshold?: number
    severity?: string
    notificationChannels?: string[]
    recipients?: string[]
    cooldownMinutes?: number
    isActive?: boolean
}

// ============================================
// GET — Alert rule detail
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

        const rule = await prisma.alertRule.findFirst({
            where: { id, tenantId },
            include: {
                triggers: {
                    orderBy: { triggeredAt: 'desc' },
                    take: 20,
                },
            },
        })

        if (!rule) {
            return NextResponse.json(
                { success: false, error: 'Alert rule not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: {
                id: rule.id,
                name: rule.name,
                description: rule.description,
                metricId: rule.metricId,
                condition: rule.condition,
                threshold: Number(rule.threshold),
                severity: rule.severity,
                notificationChannels: rule.notificationChannels,
                recipients: rule.recipients,
                cooldownMinutes: rule.cooldownMinutes,
                isActive: rule.isActive,
                lastTriggeredAt: rule.lastTriggeredAt?.toISOString() || null,
                createdAt: rule.createdAt.toISOString(),
                updatedAt: rule.updatedAt.toISOString(),
                triggers: rule.triggers.map((t) => ({
                    id: t.id,
                    currentValue: Number(t.currentValue),
                    threshold: Number(t.threshold),
                    severity: t.severity,
                    message: t.message,
                    acknowledged: t.acknowledged,
                    acknowledgedBy: t.acknowledgedBy,
                    acknowledgedAt: t.acknowledgedAt?.toISOString() || null,
                    triggeredAt: t.triggeredAt.toISOString(),
                })),
            },
        })
    } catch (error) {
        console.error('[Alert Rule Detail Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// ============================================
// PUT — Update alert rule
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
        const body: UpdateAlertBody = await request.json()

        // Check rule exists and belongs to tenant
        const existing = await prisma.alertRule.findFirst({
            where: { id, tenantId },
        })

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Alert rule not found' },
                { status: 404 }
            )
        }

        // Validate condition if provided
        if (body.condition) {
            const validConditions = ['below', 'above', 'equals', 'not_equals', 'changes_by']
            if (!validConditions.includes(body.condition)) {
                return NextResponse.json(
                    { success: false, error: `Invalid condition. Must be one of: ${validConditions.join(', ')}` },
                    { status: 400 }
                )
            }
        }

        // Validate severity if provided
        if (body.severity) {
            const validSeverities = ['low', 'medium', 'high', 'critical']
            if (!validSeverities.includes(body.severity)) {
                return NextResponse.json(
                    { success: false, error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` },
                    { status: 400 }
                )
            }
        }

        const updateData: Record<string, unknown> = {}
        if (body.name !== undefined) updateData.name = body.name
        if (body.description !== undefined) updateData.description = body.description
        if (body.metricId !== undefined) updateData.metricId = body.metricId
        if (body.condition !== undefined) updateData.condition = body.condition
        if (body.threshold !== undefined) updateData.threshold = body.threshold
        if (body.severity !== undefined) updateData.severity = body.severity
        if (body.notificationChannels !== undefined) updateData.notificationChannels = body.notificationChannels
        if (body.recipients !== undefined) updateData.recipients = body.recipients
        if (body.cooldownMinutes !== undefined) updateData.cooldownMinutes = body.cooldownMinutes
        if (body.isActive !== undefined) updateData.isActive = body.isActive

        const updated = await prisma.alertRule.update({
            where: { id },
            data: updateData,
        })

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                name: updated.name,
                description: updated.description,
                metricId: updated.metricId,
                condition: updated.condition,
                threshold: Number(updated.threshold),
                severity: updated.severity,
                notificationChannels: updated.notificationChannels,
                recipients: updated.recipients,
                cooldownMinutes: updated.cooldownMinutes,
                isActive: updated.isActive,
                lastTriggeredAt: updated.lastTriggeredAt?.toISOString() || null,
                createdAt: updated.createdAt.toISOString(),
                updatedAt: updated.updatedAt.toISOString(),
            },
        })
    } catch (error) {
        console.error('[Alert Rule Update Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// ============================================
// DELETE — Delete alert rule
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

        // Check rule exists and belongs to tenant
        const existing = await prisma.alertRule.findFirst({
            where: { id, tenantId },
        })

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Alert rule not found' },
                { status: 404 }
            )
        }

        // Delete associated triggers first
        await prisma.alertTrigger.deleteMany({
            where: { ruleId: id },
        })

        // Delete rule
        await prisma.alertRule.delete({
            where: { id },
        })

        return NextResponse.json({
            success: true,
            data: { message: 'Alert rule deleted successfully' },
        })
    } catch (error) {
        console.error('[Alert Rule Delete Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
