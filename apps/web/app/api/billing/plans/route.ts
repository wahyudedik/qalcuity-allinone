export const dynamic = 'force-dynamic';

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
 *
 * ACCESS: Authenticated session required. This route is protected by
 * middleware auth — all `/api/*` paths require a session except those in
 * `PUBLIC_API_PATHS` (apps/web/middleware.ts); `/api/billing/plans` is NOT
 * in that allowlist, so unauthenticated requests are redirected (307) to
 * /login before reaching this handler. The handler itself does not add an
 * additional auth check; only rate limiting and the DB query apply here.
 *
 * The public landing page does NOT call this route: pricing is rendered
 * server-side directly from Prisma in apps/web/app/page.tsx
 * (`prisma.plan.findMany({ where: { isActive: true } })`), so public
 * prices work without HTTP to this API.
 *
 * If this endpoint should ever become public, add it to `PUBLIC_API_PATHS`
 * in apps/web/middleware.ts (Do-Not-Touch file — requires approval).
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`billing:plans:${ip}`, 60, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 });
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
                };
            }),
        });
    } catch (error) {
        return handleApiError(error);
    }
}
