export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { getSLADashboard } from '@/lib/sla-monitor';
import { getActiveDelegations } from '@/lib/delegation';

// ─── GET: Control Dashboard aggregation ─────────────────────────────────────

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:controls-dashboard:${ip}`, 60, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        // 1. Active policies count
        const activePoliciesCount = await prisma.controlPolicy.count({
            where: { tenantId, enabled: true },
        });

        // 2. SoD violations count (active rules)
        const activeSoDRulesCount = await prisma.soDRule.count({
            where: { tenantId, enabled: true },
        });

        // 3. SLA dashboard data
        const slaDashboard = await getSLADashboard(tenantId);

        // 4. Active locks count
        const activeLocksCount = await prisma.lockRecord.count({
            where: { tenantId },
        });

        // 5. Active locks detail
        const activeLocks = await prisma.lockRecord.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        // 6. Recent policy changes (last 10)
        const recentPolicies = await prisma.controlPolicy.findMany({
            where: { tenantId },
            orderBy: { updatedAt: 'desc' },
            take: 10,
            select: {
                id: true,
                name: true,
                module: true,
                action: true,
                effect: true,
                enabled: true,
                priority: true,
                updatedAt: true,
            },
        });

        // 7. SLA breach history (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const slaBreaches = await prisma.sLATracker.findMany({
            where: {
                tenantId,
                status: 'breached',
                updatedAt: { gte: sevenDaysAgo },
            },
            orderBy: { updatedAt: 'desc' },
            take: 20,
        });

        // 8. Active delegations
        const activeDelegations = await getActiveDelegations(tenantId);

        // 9. Transaction states summary
        const transactionStates = await prisma.transactionState.groupBy({
            by: ['currentState'],
            where: { tenantId },
            _count: { id: true },
        });

        const now = new Date();
        const data = {
            // Policies
            activePolicies: {
                total: activePoliciesCount,
            },

            // SoD
            soDRules: {
                total: activeSoDRulesCount,
            },

            // SLA
            sla: {
                totalActive: slaDashboard.totalActive,
                byColor: slaDashboard.byColor,
                complianceRate: slaDashboard.complianceRate,
                recentBreaches: slaDashboard.recentBreaches,
            },

            // Locks
            locks: {
                totalActive: activeLocksCount,
                items: activeLocks.map((lock) => ({
                    id: lock.id,
                    entityType: lock.entityType,
                    entityId: lock.entityId,
                    lockedBy: lock.lockedBy,
                    lockType: lock.lockType,
                    expiresAt: lock.expiresAt.toISOString(),
                    isExpired: lock.expiresAt < now,
                    minutesRemaining: Math.max(0, Math.round((lock.expiresAt.getTime() - now.getTime()) / (1000 * 60))),
                })),
            },

            // Recent policy changes
            recentPolicyChanges: recentPolicies.map((p) => ({
                id: p.id,
                name: p.name,
                module: p.module,
                action: p.action,
                effect: p.effect,
                enabled: p.enabled,
                priority: p.priority,
                updatedAt: p.updatedAt.toISOString(),
            })),

            // SLA breach history
            slaBreachHistory: slaBreaches.map((b) => ({
                id: b.id,
                entityType: b.entityType,
                entityId: b.entityId,
                stage: b.stage,
                targetHours: b.targetHours,
                deadline: b.deadline.toISOString(),
                completedAt: b.completedAt?.toISOString() || null,
                notes: b.notes,
                updatedAt: b.updatedAt.toISOString(),
            })),

            // Delegations
            activeDelegations: activeDelegations.map((d) => ({
                id: d.id,
                fromUserId: d.fromUserId,
                toUserId: d.toUserId,
                module: d.module,
                startDate: d.startDate.toISOString(),
                endDate: d.endDate.toISOString(),
            })),

            // Transaction states
            transactionStates: transactionStates.map((ts) => ({
                state: ts.currentState,
                count: ts._count.id,
            })),
        };

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}
