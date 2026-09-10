// ============================================
// Alert Triggers API — GET
// List recent alert triggers
// ============================================

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { MSG } from '@/lib/api-messages'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-error'
import type { Prisma } from '@prisma/client'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// ============================================
// GET — List alert triggers
// ============================================

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:alerts:triggers:route:GET:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { searchParams } = new URL(request.url)
        const acknowledged = searchParams.get('acknowledged')
        const severity = searchParams.get('severity')
        const limit = searchParams.get('limit')

        const where: Prisma.AlertTriggerWhereInput = { tenantId }

        if (acknowledged !== null && acknowledged !== undefined) {
            where.acknowledged = acknowledged === 'true'
        }

        if (severity) {
            where.severity = severity
        }

        const triggers = await prisma.alertTrigger.findMany({
            where,
            orderBy: { triggeredAt: 'desc' },
            take: limit ? parseInt(limit, 10) : 50,
            include: {
                rule: {
                    select: {
                        id: true,
                        name: true,
                        metricId: true,
                    },
                },
            },
        })

        const enrichedTriggers = triggers.map((trigger) => ({
            id: trigger.id,
            ruleId: trigger.ruleId,
            ruleName: trigger.rule.name,
            metricId: trigger.rule.metricId,
            currentValue: Number(trigger.currentValue),
            threshold: Number(trigger.threshold),
            severity: trigger.severity,
            message: trigger.message,
            acknowledged: trigger.acknowledged,
            acknowledgedBy: trigger.acknowledgedBy,
            acknowledgedAt: trigger.acknowledgedAt?.toISOString() || null,
            triggeredAt: trigger.triggeredAt.toISOString(),
        }))

        return NextResponse.json({ success: true, data: enrichedTriggers })
    } catch (error) {
        console.error('[ERROR]', error)
        return handleApiError(error)
    }
}
