import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// ─── GET /api/platform/plans ──────────────────────────────────────────────────
// Returns all subscription plans with features and tenant counts.
// Only accessible by SUPERADMIN role.
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    if (role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const plans = await prisma.plan.findMany({
            include: {
                features: true,
                _count: {
                    select: {
                        entitlements: true,
                    },
                },
            },
            orderBy: { sortOrder: "asc" },
        });

        return NextResponse.json({
            success: true,
            data: plans.map((plan) => ({
                id: plan.id,
                name: plan.name,
                slug: plan.slug,
                description: plan.description,
                priceMonthly: plan.priceMonthly,
                priceYearly: plan.priceYearly,
                maxUsers: plan.maxUsers,
                maxStorage: plan.maxStorage,
                isActive: plan.isActive,
                sortOrder: plan.sortOrder,
                features: plan.features.map((f) => ({
                    id: f.id,
                    featureKey: f.featureKey,
                    enabled: f.enabled,
                    limit: f.limit,
                })),
                tenantCount: plan._count.entitlements,
                createdAt: plan.createdAt.toISOString(),
                updatedAt: plan.updatedAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error("[Platform Plans Error]", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
