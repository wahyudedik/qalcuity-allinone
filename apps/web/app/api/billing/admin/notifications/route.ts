export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
    try {
        const auth = await requirePermissionForRoute(new Request('http://localhost/api/billing/admin/notifications', { method: 'GET' }));
        if ('error' in auth) {
            return NextResponse.json(
                { success: false, error: auth.error },
                { status: auth.status }
            );
        }

        // Get latest 10 pending payments as notifications
        const notifications = await prisma.billingPayment.findMany({
            where: { status: 'PENDING' },
            select: {
                id: true,
                amount: true,
                bankName: true,
                accountName: true,
                createdAt: true,
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                // Phase 4: Include entitlement with Plan (preferred path)
                entitlement: {
                    select: {
                        plan: {
                            select: {
                                name: true,
                                priceMonthly: true,
                            },
                        },
                    },
                },
                // Keep legacy subscription include for backward compat
                subscription: {
                    select: {
                        plan: {
                            select: {
                                name: true,
                                price: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        return NextResponse.json({
            success: true,
            data: notifications.map((n) => ({
                id: n.id,
                type: 'PAYMENT_RECEIVED',
                title: `Pembayaran Baru dari ${n.tenant.name}`,
                message: `${n.accountName || 'Unknown'} mengirim Rp ${Number(n.amount).toLocaleString('id-ID')} via ${n.bankName || 'Transfer Bank'}`,
                tenant: n.tenant,
                // Phase 4: Prefer entitlement.plan over subscription.plan
                plan: n.entitlement?.plan
                    ? { name: n.entitlement.plan.name, price: n.entitlement.plan.priceMonthly }
                    : n.subscription.plan,
                amount: n.amount,
                isRead: false,
                createdAt: n.createdAt,
            })),
        });
    } catch (error) {
        return handleApiError(error);
    }
}
