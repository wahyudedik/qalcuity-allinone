// ============================================
// Alert Rule Detail API — GET, PUT, DELETE
// ============================================

import { NextResponse } from 'next/server'
import { MSG } from '@/lib/api-messages'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-error'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { updateAlertSchema, formatZodError } from '@/lib/validation-schemas'
import { logger } from '@/lib/logger'

// ============================================
// GET — Alert rule detail
// ============================================

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:alerts:[id]:route:GET:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 })
        }

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
                { success: false, error: MSG.ANALYTICS_ALERT_RULE_NOT_FOUND },
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
        logger.error('[ERROR]', error)
        return handleApiError(error)
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
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:alerts:[id]:route:PUT:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { id } = params
        const body = await request.json()

        // Check rule exists and belongs to tenant
        const existing = await prisma.alertRule.findFirst({
            where: { id, tenantId },
        })

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.ANALYTICS_ALERT_RULE_NOT_FOUND },
                { status: 404 }
            )
        }

        // Validate with Zod
        const parsed = updateAlertSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: formatZodError(parsed.error) },
                { status: 400 }
            )
        }
        const validated = parsed.data

        const updateData: Record<string, unknown> = {}
        if (validated.name !== undefined) updateData.name = validated.name
        if (validated.description !== undefined) updateData.description = validated.description
        if (validated.metricId !== undefined) updateData.metricId = validated.metricId
        if (validated.condition !== undefined) updateData.condition = validated.condition
        if (validated.threshold !== undefined) updateData.threshold = validated.threshold
        if (validated.severity !== undefined) updateData.severity = validated.severity
        if (validated.notificationChannels !== undefined) updateData.notificationChannels = validated.notificationChannels
        if (validated.recipients !== undefined) updateData.recipients = validated.recipients
        if (validated.cooldownMinutes !== undefined) updateData.cooldownMinutes = validated.cooldownMinutes
        if (validated.isActive !== undefined) updateData.isActive = validated.isActive

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
        logger.error('[ERROR]', error)
        return handleApiError(error)
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
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:alerts:[id]:route:DELETE:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 })
        }

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
                { success: false, error: MSG.ANALYTICS_ALERT_RULE_NOT_FOUND },
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
        logger.error('[ERROR]', error)
        return handleApiError(error)
    }
}
