// ============================================
// Alert Trigger Acknowledge API — POST
// Acknowledge an alert trigger
// ============================================

import { NextResponse } from 'next/server'
import { MSG } from '@/lib/api-messages'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-error'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// ============================================
// POST — Acknowledge alert trigger
// ============================================

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:alerts:triggers:[id]:acknowledge:route:POST:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { userId, tenantId } = auth
        const { id } = params

        // Check trigger exists and belongs to tenant
        const existing = await prisma.alertTrigger.findFirst({
            where: { id, tenantId },
        })

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.ANALYTICS_ALERT_TRIGGER_NOT_FOUND },
                { status: 404 }
            )
        }

        if (existing.acknowledged) {
            return NextResponse.json(
                { success: false, error: MSG.ANALYTICS_ALERT_TRIGGER_ALREADY_ACKNOWLEDGED },
                { status: 400 }
            )
        }

        const updated = await prisma.alertTrigger.update({
            where: { id },
            data: {
                acknowledged: true,
                acknowledgedBy: userId,
                acknowledgedAt: new Date(),
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                acknowledged: updated.acknowledged,
                acknowledgedBy: updated.acknowledgedBy,
                acknowledgedAt: updated.acknowledgedAt?.toISOString() || null,
            },
        })
    } catch (error) {
        console.error('[ERROR]', error)
        return handleApiError(error)
    }
}
