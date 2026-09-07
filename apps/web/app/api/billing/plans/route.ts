import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * GET /api/billing/plans
 *
 * Returns all active subscription plans with their features.
 * Uses the new Plan + PlanFeature model (unified with platform billing).
 * Public endpoint — no auth required (plan listing is public info).
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`billing:plans:${ip}`, 60, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 });
        }

        const plans = await prisma.plan.findMany({
            where: { isActive: true },
            include: {
                features: true,
            },
            orderBy: { sortOrder: 'asc' },
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
            })),
        });
    } catch (error) {
        console.error('Error fetching plans:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { success: false, error: 'Gagal mengambil data paket' },
            { status: 500 }
        );
    }
}
