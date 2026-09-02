import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

        return NextResponse.json({
            success: true,
            data: {
                totalTenants,
                activeTenants,
                totalUsers,
                mrr,
                mrrGrowth: 12.3, // TODO: Calculate from historical data
                systemHealth: "healthy",
                apiLatency: 145,
                errorRate: 0.12,
                uptime: 99.97,
            },
        });
    } catch (error) {
        console.error("[Platform Stats Error]", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
