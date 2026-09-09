// ============================================
// Alert Rules API — GET (list), POST (create)
// CRUD for alert rules
// ============================================

import { NextResponse } from 'next/server'
import { MSG } from '@/lib/api-messages'
import { requirePermissionForRoute } from '@/lib/session'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { handleApiError } from '@/lib/api-error'
import { createAlertSchema } from '@/lib/validation-schemas'

// ============================================
// GET — List alert rules for tenant
// ============================================

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:alerts:${ip}`, 60, 60000)
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

        const where: Prisma.AlertRuleWhereInput = { tenantId }

        if (isActive !== null && isActive !== undefined) {
            where.isActive = isActive === 'true'
        }

        const rules = await prisma.alertRule.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { triggers: true },
                },
            },
        })

        const enrichedRules = rules.map((rule) => ({
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
            triggerCount: rule._count.triggers,
            createdAt: rule.createdAt.toISOString(),
            updatedAt: rule.updatedAt.toISOString(),
        }))

        return NextResponse.json({ success: true, data: enrichedRules })
    } catch (error) {
        console.error('[Alert Rules List Error]', error)
        return handleApiError(error)
    }
}

// ============================================
// POST — Create alert rule
// ============================================

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:alerts:POST:${ip}`, 30, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth

        // Validasi input dengan Zod schema
        const body = await request.json()
        const validated = createAlertSchema.safeParse(body)
        if (!validated.success) {
            return NextResponse.json(
                { success: false, error: validated.error.issues[0]?.message || MSG.INVALID_INPUT },
                { status: 400 }
            )
        }

        const severity = validated.data.severity || 'medium'

        const rule = await prisma.alertRule.create({
            data: {
                name: validated.data.name,
                description: validated.data.description,
                metricId: validated.data.metricId,
                condition: validated.data.condition,
                threshold: validated.data.threshold,
                severity,
                notificationChannels: validated.data.notificationChannels || ['in_app'],
                recipients: validated.data.recipients || [],
                cooldownMinutes: validated.data.cooldownMinutes || 60,
                tenantId,
            },
        })

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
                createdAt: rule.createdAt.toISOString(),
                updatedAt: rule.updatedAt.toISOString(),
            },
        }, { status: 201 })
    } catch (error) {
        console.error('[Alert Rule Create Error]', error)
        return handleApiError(error)
    }
}
