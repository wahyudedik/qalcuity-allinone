export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`billing:subscription:${ip}`, 60, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS, code: 'TOO_MANY_REQUESTS' }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: auth.tenantId },
            select: {
                id: true,
                name: true,
                subscriptionStatus: true,
                currentPlanSlug: true,
                trialEndsAt: true,
            },
        });

        if (!tenant) {
            return NextResponse.json(
                { success: false, error: MSG.TENANT_NOT_FOUND, code: 'TENANT_NOT_FOUND' },
                { status: 404 }
            );
        }

        const entitlement = await prisma.tenantEntitlement.findUnique({
            where: { tenantId: auth.tenantId },
            include: {
                plan: {
                    include: { features: true },
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                tenant: {
                    subscriptionStatus: tenant.subscriptionStatus,
                    currentPlanSlug: tenant.currentPlanSlug,
                    trialEndsAt: tenant.trialEndsAt,
                },
                subscription: entitlement
                    ? {
                        id: entitlement.id,
                        status: entitlement.status.toUpperCase(),
                        startDate: entitlement.currentPeriodStart,
                        endDate: entitlement.currentPeriodEnd,
                        plan: entitlement.plan
                            ? {
                                id: entitlement.plan.id,
                                name: entitlement.plan.name,
                                slug: entitlement.plan.slug,
                                description: entitlement.plan.description,
                                price: entitlement.plan.priceMonthly,
                                features: entitlement.plan.features
                                    .filter((f) => f.enabled)
                                    .map((f) => f.featureKey),
                            }
                            : null,
                    }
                    : null,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
