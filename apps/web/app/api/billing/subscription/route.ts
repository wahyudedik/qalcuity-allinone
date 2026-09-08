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

        const subscription = await prisma.tenantSubscription.findFirst({
            where: { tenantId: auth.tenantId },
            include: {
                plan: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            success: true,
            data: {
                tenant: {
                    subscriptionStatus: tenant.subscriptionStatus,
                    currentPlanSlug: tenant.currentPlanSlug,
                    trialEndsAt: tenant.trialEndsAt,
                },
                subscription: subscription
                    ? {
                        ...subscription,
                        plan: subscription.plan
                            ? {
                                ...subscription.plan,
                                features: subscription.plan.features
                                    ? JSON.parse(subscription.plan.features)
                                    : [],
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
