import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

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
            return NextResponse.json({ success: false, error: 'MSG.TOO_MANY_REQUESTS' }, { status: 429 });
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
        return handleApiError(error);
    }
}
