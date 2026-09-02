import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';

export async function GET(request: Request) {
    try {
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
                { success: false, error: 'Tenant tidak ditemukan' },
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
        console.error('Error fetching subscription:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { success: false, error: 'Gagal mengambil data langganan' },
            { status: 500 }
        );
    }
}
