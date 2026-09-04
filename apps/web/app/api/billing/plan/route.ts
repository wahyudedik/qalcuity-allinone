/**
 * GET /api/billing/plan
 *
 * Get current tenant's plan details.
 * PUT /api/billing/plan — Change plan (upgrade/downgrade)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { getEntitlement, changePlan, ensureEntitlement } from '@/lib/entitlement';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const changePlanSchema = z.object({
    planSlug: z.string().min(1, 'Plan slug wajib diisi'),
    billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
});

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`billing:plan:${ip}`, 60, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }

        const { tenantId } = auth;

        // Ensure entitlement exists
        const entitlement = await ensureEntitlement(tenantId);

        // Also get all available plans for upgrade/downgrade comparison
        const allPlans = await prisma.plan.findMany({
            where: { isActive: true },
            include: {
                features: true,
            },
            orderBy: { sortOrder: 'asc' },
        });

        return NextResponse.json({
            success: true,
            data: {
                current: entitlement,
                available: allPlans.map((plan) => ({
                    id: plan.id,
                    name: plan.name,
                    slug: plan.slug,
                    description: plan.description,
                    priceMonthly: plan.priceMonthly,
                    priceYearly: plan.priceYearly,
                    maxUsers: plan.maxUsers,
                    maxStorage: plan.maxStorage,
                    featureCount: plan.features.filter((f) => f.enabled).length,
                })),
            },
        });
    } catch (error) {
        console.error('[Plan] Error fetching plan:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { success: false, error: 'Gagal mengambil data paket' },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`billing:plan:PUT:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }

        const { userId, tenantId } = auth;
        const body = await request.json();

        const validation = changePlanSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validasi gagal',
                    details: validation.error.issues.map((i) => ({
                        field: i.path.join('.'),
                        message: i.message,
                    })),
                },
                { status: 400 }
            );
        }

        const { planSlug, billingCycle } = validation.data;

        // Get current entitlement for audit
        const currentEntitlement = await getEntitlement(tenantId);
        const oldPlanSlug = currentEntitlement?.plan?.slug || 'unknown';

        // Change plan
        const newEntitlement = await changePlan(tenantId, planSlug, billingCycle);

        // Log audit
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'TenantEntitlement',
            entityId: newEntitlement.id,
            oldValues: { planSlug: oldPlanSlug } as Record<string, unknown>,
            newValues: { planSlug, billingCycle } as Record<string, unknown>,
            request,
        });

        return NextResponse.json({
            success: true,
            data: newEntitlement,
            message: `Paket berhasil diubah ke ${newEntitlement.plan.name}`,
        });
    } catch (error) {
        console.error('[Plan] Error changing plan:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { success: false, error: 'Gagal mengubah paket' },
            { status: 500 }
        );
    }
}
