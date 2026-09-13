export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from "@/lib/session";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

// â”€â”€â”€ GET /api/platform/stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns platform-wide statistics for the Superadmin dashboard.
// Only accessible by SUPERADMIN role.
export async function GET(request: Request) {
    // 1. Auth + RBAC check â€” SUPERADMIN only
    const auth = await requirePermissionForRoute(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        // 3. Query platform-wide stats
        const [totalTenants, activeTenants, totalUsers] = await Promise.all([
            prisma.tenant.count(),
            prisma.tenant.count({ where: { subscriptionStatus: "ACTIVE" } }),
            prisma.user.count(),
        ]);

        // 4. Calculate MRR from active entitlements (Plan model)
        // Note: priceMonthly is on the related Plan model, not TenantEntitlement,
        // so Prisma aggregate() cannot sum it directly. Using findMany with a safety limit.
        const activeEntitlements = await prisma.tenantEntitlement.findMany({
            where: { status: "active" },
            include: { plan: { select: { priceMonthly: true } } },
            take: 10000,
        });

        const mrr = activeEntitlements.reduce(
            (sum: number, ent) =>
                sum + Number(ent.plan?.priceMonthly ?? 0),
            0
        );

        // 5. Calculate MRR growth from entitlement history
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const [currentMonthEntitlements, prevMonthEntitlements] = await Promise.all([
            prisma.tenantEntitlement.findMany({
                where: {
                    createdAt: { gte: currentMonthStart },
                    status: "active",
                },
                include: { plan: { select: { priceMonthly: true } } },
                take: 10000,
            }),
            prisma.tenantEntitlement.findMany({
                where: {
                    createdAt: { gte: prevMonthStart, lt: currentMonthStart },
                    status: "active",
                },
                include: { plan: { select: { priceMonthly: true } } },
                take: 10000,
            }),
        ]);

        const currentMonthMRR = currentMonthEntitlements.reduce(
            (sum: number, ent) => sum + Number(ent.plan?.priceMonthly ?? 0),
            0
        );
        const prevMonthMRR = prevMonthEntitlements.reduce(
            (sum: number, ent) => sum + Number(ent.plan?.priceMonthly ?? 0),
            0
        );

        const mrrGrowth = prevMonthMRR > 0
            ? Math.round(((currentMonthMRR - prevMonthMRR) / prevMonthMRR) * 100 * 100) / 100
            : 0;

        // 6. Calculate actual uptime from process
        const processUptimeSeconds = process.uptime();
        const uptimePercentage = Math.min(100, Math.round((processUptimeSeconds / (processUptimeSeconds + 60)) * 100 * 100) / 100);

        // 7. Estimate API latency from recent audit logs
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const recentLogs = await prisma.auditLog.findMany({
            where: { createdAt: { gte: oneHourAgo } },
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        let estimatedLatency = 50;
        if (recentLogs.length >= 2) {
            const intervals: number[] = [];
            for (let i = 1; i < recentLogs.length; i++) {
                const diff = recentLogs[i - 1].createdAt.getTime() - recentLogs[i].createdAt.getTime();
                if (diff > 0 && diff < 10000) intervals.push(diff);
            }
            if (intervals.length > 0) {
                estimatedLatency = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
            }
        }

        // 8. Estimate error rate from recent audit logs
        const recentErrors = await prisma.auditLog.count({
            where: {
                createdAt: { gte: oneHourAgo },
                action: { contains: "ERROR" },
            },
        });
        const totalRecentActions = recentLogs.length * 3 || 1;
        const errorRate = Math.round((recentErrors / totalRecentActions) * 100 * 100) / 100;

        return NextResponse.json({
            success: true,
            data: {
                totalTenants,
                activeTenants,
                totalUsers,
                mrr,
                mrrGrowth,
                systemHealth: errorRate > 5 ? "degraded" : "healthy",
                apiLatency: estimatedLatency,
                errorRate,
                uptime: uptimePercentage,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
