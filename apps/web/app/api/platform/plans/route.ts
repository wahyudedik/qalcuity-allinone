export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from "@/lib/session";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

// â”€â”€â”€ GET /api/platform/plans â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns all subscription plans with features and tenant counts.
// Only accessible by SUPERADMIN role.
export async function GET(request: Request) {
    // 1. Auth + RBAC check â€” SUPERADMIN only
    const auth = await requirePermissionForRoute(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

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
        return handleApiError(error);
    }
}
