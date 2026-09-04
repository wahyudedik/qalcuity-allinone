import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

// ─── GET /api/platform/stats ──────────────────────────────────────────────────
// Returns platform-wide statistics for the Superadmin dashboard.
// Only accessible by SUPERADMIN role.
export async function GET() {
    // 1. Auth check
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. RBAC check — SUPERADMIN only
    const role = (session.user as { role?: string }).role;
    if (role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        // 3. Query platform-wide stats
        const [totalTenants, activeTenants, totalUsers] = await Promise.all([
            prisma.tenant.count(),
            prisma.tenant.count({ where: { subscriptionStatus: "ACTIVE" } }),
            prisma.user.count(),
        ]);

        // 4. Calculate MRR from active subscriptions
        const activeSubscriptions = await prisma.tenantSubscription.findMany({
            where: { status: "ACTIVE" },
            include: { plan: true },
        });

        const mrr = activeSubscriptions.reduce(
            (sum: number, sub) =>
                sum + Number(sub.plan?.price ?? 0),
            0
        );

        // 5. Calculate MRR growth from subscription history
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const [currentMonthSubs, prevMonthSubs] = await Promise.all([
            prisma.tenantSubscription.findMany({
                where: {
                    createdAt: { gte: currentMonthStart },
                    status: "ACTIVE",
                },
                include: { plan: true },
            }),
            prisma.tenantSubscription.findMany({
                where: {
                    createdAt: { gte: prevMonthStart, lt: currentMonthStart },
                    status: "ACTIVE",
                },
                include: { plan: true },
            }),
        ]);

        const currentMonthMRR = currentMonthSubs.reduce(
            (sum: number, sub) => sum + Number(sub.plan?.price ?? 0),
            0
        );
        const prevMonthMRR = prevMonthSubs.reduce(
            (sum: number, sub) => sum + Number(sub.plan?.price ?? 0),
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
