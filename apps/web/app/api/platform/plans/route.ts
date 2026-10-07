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
            data: plans.map((plan) => {
                // Derive isCustom dari slug — schema Plan tidak punya flag column.
                // Enterprise = plan harga custom (priceMonthly disimpan 0).
                const isCustom = plan.slug === 'enterprise';
                // Konversi Decimal → number agar JSON serialization konsisten (bukan string "299000.0000")
                return {
                    id: plan.id,
                    name: plan.name,
                    slug: plan.slug,
                    description: plan.description,
                    priceMonthly: Number(plan.priceMonthly),
                    priceYearly: plan.priceYearly !== null ? Number(plan.priceYearly) : null,
                    isCustom,
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
                };
            }),
        });
    } catch (error) {
        return handleApiError(error);
    }
}
