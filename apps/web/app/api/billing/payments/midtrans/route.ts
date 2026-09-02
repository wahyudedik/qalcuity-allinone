/**
 * Midtrans Snap Payment API Route
 *
 * Membuat transaksi Midtrans Snap untuk pembayaran billing/subscription.
 * Flow: User pilih plan → POST ke route ini → Redirect ke Midtrans Snap.
 *
 * @see https://docs.midtrans.com/#snap-integration
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { getPaymentProvider } from '@/lib/payment/provider';
import { createMidtransPaymentSchema, formatZodError } from '@/lib/validation-schemas';
import { z } from 'zod';

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId } = auth;
        const body = await request.json();

        // Validasi input dengan Zod
        const validation = createMidtransPaymentSchema.safeParse(body);
        if (!validation.success) {
            const errorResponse = formatZodError(validation.error);
            return NextResponse.json(
                { success: false, error: errorResponse.message, details: errorResponse.details },
                { status: 400 }
            );
        }

        const { subscriptionId } = validation.data;

        // Cek subscription exists dan milik tenant ini
        const subscription = await prisma.tenantSubscription.findFirst({
            where: {
                id: subscriptionId,
                tenantId,
            },
            include: {
                plan: true,
            },
        });

        if (!subscription) {
            return NextResponse.json(
                { success: false, error: 'Langganan tidak ditemukan' },
                { status: 404 }
            );
        }

        if (!subscription.plan) {
            return NextResponse.json(
                { success: false, error: 'Paket langganan tidak valid' },
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
                { success: false, error: 'Tenant tidak ditemukan' },
                { status: 404 }
            );
        }

        // Generate unique order ID dengan prefix QAL (Qalcuity)
        const timestamp = Date.now();
        const orderId = `QAL-${tenantId.substring(0, 8)}-${timestamp}`;

        // Tentukan callback URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const callbackUrl = `${appUrl}/dashboard/billing?payment=success&orderId=${orderId}`;

        // Hitung total amount (price × 1 bulan)
        const amount = Number(subscription.plan.price);

        // Buat billing payment record
        const payment = await prisma.billingPayment.create({
            data: {
                subscriptionId,
                tenantId,
                amount,
                paymentMethod: 'midtrans',
                reference: orderId,
                status: 'PENDING',
                notes: `Pembayaran via Midtrans Snap - Paket ${subscription.plan.name}`,
            },
        });

        // Update subscription status
        await prisma.tenantSubscription.update({
            where: { id: subscriptionId },
            data: { status: 'PENDING_PAYMENT' },
        });

        await prisma.tenant.update({
            where: { id: tenantId },
            data: { subscriptionStatus: 'PENDING_PAYMENT' },
        });

        // Buat Midtrans Snap transaction
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
                    name: `Langganan ${subscription.plan.name} - 1 Bulan`,
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
                data: { status: 'REJECTED', notes: `Midtrans error: ${result.error}` },
            });

            return NextResponse.json(
                { success: false, error: result.error || 'Gagal membuat transaksi Midtrans' },
                { status: 500 }
            );
        }

        // Update payment dengan Midtrans token
        await prisma.billingPayment.update({
            where: { id: payment.id },
            data: {
                reference: orderId,
                notes: `Pembayaran via Midtrans Snap - Paket ${subscription.plan.name} - Token: ${result.paymentToken}`,
            },
        });

        // Log audit
        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'BillingPayment',
            entityId: payment.id,
            newValues: {
                amount,
                orderId,
                planName: subscription.plan.name,
                paymentMethod: 'midtrans',
            } as Record<string, unknown>,
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
            message: 'Transaksi Midtrans berhasil dibuat',
        });
    } catch (error) {
        console.error('[Midtrans] Error creating payment:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { success: false, error: 'Gagal membuat pembayaran Midtrans' },
            { status: 500 }
        );
    }
}
