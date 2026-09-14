export const dynamic = 'force-dynamic';

/**
 * Xendit Invoice Payment API Route
 *
 * Membuat transaksi Xendit Invoice untuk pembayaran billing/subscription.
 * Flow: User pilih plan → POST ke route ini → Redirect ke Xendit checkout page.
 *
 * @see https://developers.xendit.co/api-reference/#create-invoice
 */

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { getPaymentProvider } from '@/lib/payment/provider';
import { createMidtransPaymentSchema, formatZodError } from '@/lib/validation-schemas';
import { getPublicBaseUrl } from '@/lib/utils';

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId } = auth;
        const body = await request.json();

        // Validasi input — re-use createMidtransPaymentSchema (same structure: subscriptionId)
        const validation = createMidtransPaymentSchema.safeParse(body);
        if (!validation.success) {
            const errorResponse = formatZodError(validation.error);
            return NextResponse.json(
                { success: false, error: errorResponse.message, details: errorResponse.details },
                { status: 400 }
            );
        }

        const { subscriptionId } = validation.data;

        // Phase 4: Cek subscription exists dan milik tenant ini (backward compat)
        const subscription = await prisma.tenantSubscription.findFirst({
            where: {
                id: subscriptionId,
                tenantId,
            },
        });

        if (!subscription) {
            return NextResponse.json(
                { success: false, error: MSG.SUBSCRIPTION_NOT_FOUND, code: 'NOT_FOUND' },
                { status: 404 }
            );
        }

        // Phase 4: Look up TenantEntitlement + Plan (preferred path)
        const entitlement = await prisma.tenantEntitlement.findUnique({
            where: { tenantId },
            include: { plan: true },
        });

        // Fallback: if no entitlement, look up plan via legacy SubscriptionPlan
        let planName = 'Unknown Plan';
        let planPrice = 0;

        if (entitlement?.plan) {
            planName = entitlement.plan.name;
            planPrice = Number(entitlement.plan.priceMonthly);
        } else {
            const legacyPlan = await prisma.subscriptionPlan.findUnique({
                where: { id: subscription.planId },
            });
            if (legacyPlan) {
                planName = legacyPlan.name;
                planPrice = Number(legacyPlan.price);
            }
        }

        if (planPrice <= 0) {
            return NextResponse.json(
                { success: false, error: MSG.INVALID_SUBSCRIPTION_PLAN, code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        // Cek tenant info untuk customer details
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                name: true,
                email: true,
                slug: true,
            },
        });

        if (!tenant) {
            return NextResponse.json(
                { success: false, error: 'Tenant not found', code: 'NOT_FOUND' },
                { status: 404 }
            );
        }

        // Generate unique order ID dengan prefix QAL (Qalcuity)
        const timestamp = Date.now();
        const orderId = `QAL-${tenantId.substring(0, 8)}-${timestamp}`;

        // Tentukan callback URL
        const appUrl = getPublicBaseUrl();
        const callbackUrl = `${appUrl}/dashboard/billing?payment=success&orderId=${orderId}`;

        // Hitung total amount
        const amount = planPrice;

        // Buat billing payment record
        const payment = await prisma.billingPayment.create({
            data: {
                subscriptionId,
                entitlementId: entitlement?.id || null,
                tenantId,
                amount,
                paymentMethod: 'xendit',
                reference: orderId,
                status: 'PENDING',
                notes: `Pembayaran via Xendit Invoice - Paket ${planName}`,
            },
        });

        // Phase 4: Update TenantEntitlement or fallback to TenantSubscription
        if (entitlement) {
            await prisma.tenant.update({
                where: { id: tenantId },
                data: { subscriptionStatus: 'PENDING_PAYMENT' },
            });
        } else {
            await prisma.tenantSubscription.update({
                where: { id: subscriptionId },
                data: { status: 'PENDING_PAYMENT' },
            });

            await prisma.tenant.update({
                where: { id: tenantId },
                data: { subscriptionStatus: 'PENDING_PAYMENT' },
            });
        }

        // Buat Xendit Invoice
        const provider = getPaymentProvider();
        const result = await provider.createPayment({
            orderId,
            amount,
            currency: 'IDR',
            customerName: tenant.name,
            customerEmail: tenant.email || `${tenant.slug}@qalcuity.com`,
            customerPhone: undefined,
            items: [
                {
                    name: `Langganan ${planName} - 1 Bulan`,
                    price: amount,
                    quantity: 1,
                },
            ],
            callbackUrl,
        });

        if (!result.success) {
            // Rollback payment status
            await prisma.billingPayment.update({
                where: { id: payment.id },
                data: { status: 'REJECTED', notes: `Xendit error: ${result.error}` },
            });

            return NextResponse.json(
                { success: false, error: result.error || 'Gagal membuat transaksi Xendit' },
                { status: 500 }
            );
        }

        // Update payment dengan Xendit invoice ID
        await prisma.billingPayment.update({
            where: { id: payment.id },
            data: {
                reference: orderId,
                notes: `Pembayaran via Xendit Invoice - Paket ${planName} - Invoice ID: ${result.paymentToken}`,
            },
        });

        // Log audit
        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'BillingPayment',
            entityId: payment.id,
            newValues: toAuditPayload({
                amount,
                orderId,
                planName,
                paymentMethod: 'xendit',
                entitlementId: entitlement?.id || null,
            }),
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                paymentId: payment.id,
                orderId,
                redirectUrl: result.paymentUrl,
                token: result.paymentToken,
            },
            message: 'Transaksi Xendit berhasil dibuat',
        });
    } catch (error) {
        return handleApiError(error);
    }
}
