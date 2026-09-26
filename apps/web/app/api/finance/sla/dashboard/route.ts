export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { getSLADashboard, escalateOverdueSLAs } from '@/lib/sla-monitor';

// ─── GET: SLA Dashboard summary ─────────────────────────────────────────────

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:sla-dashboard:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        // Also escalate any overdue SLAs while we're here
        const escalatedCount = await escalateOverdueSLAs(tenantId);

        // Get dashboard data
        const dashboard = await getSLADashboard(tenantId);

        return NextResponse.json({
            success: true,
            data: {
                totalActive: dashboard.totalActive,
                byColor: dashboard.byColor,
                byEntityType: dashboard.byEntityType,
                recentBreaches: dashboard.recentBreaches,
                complianceRate: dashboard.complianceRate,
                escalatedDuringRefresh: escalatedCount,
                trackers: dashboard.trackers.map((t) => ({
                    id: t.id,
                    entityType: t.entityType,
                    entityId: t.entityId,
                    stage: t.stage,
                    targetHours: t.targetHours,
                    deadline: t.deadline.toISOString(),
                    status: t.status,
                    slaColor: t.sla.color,
                    slaPercentRemaining: t.sla.percentRemaining,
                    slaHoursRemaining: t.sla.hoursRemaining,
                    slaLabel: t.sla.label,
                })),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
