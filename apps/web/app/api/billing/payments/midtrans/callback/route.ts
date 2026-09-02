/**
 * Midtrans Payment Callback / Webhook Handler
 *
 * Menerima notification dari Midtrans ketika status pembayaran berubah.
 * Route ini bersifat PUBLIC (tidak memerlukan auth) karena dipanggil langsung oleh Midtrans server.
 *
 * Flow:
 * 1. Midtrans POST notification ke route ini
 * 2. Verifikasi signature dengan HMAC SHA512
 * 3. Update BillingPayment status berdasarkan transaction_status
 * 4. Update TenantSubscription status jika pembayaran berhasil
 *
 * @see https://docs.midtrans.com/#webhook-notification
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { getPaymentProvider } from '@/lib/payment/provider';
import { midtransWebhookSchema, formatZodError } from '@/lib/validation-schemas';
import type { MidtransProvider } from '@/lib/payment/midtrans';

/**
 * POST /api/billing/payments/midtrans/callback
 *
 * Webhook handler untuk Midtrans payment notification.
 * Tidak memerlukan auth — dipanggil langsung oleh Midtrans server.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validasi input dengan Zod
        const validation = midtransWebhookSchema.safeParse(body);
        if (!validation.success) {
            const errorResponse = formatZodError(validation.error);
            console.warn('[MidtransCallback] Invalid webhook payload:', errorResponse);
            return NextResponse.json(
                { success: false, error: errorResponse.message },
                { status: 400 }
            );
        }

        const data = validation.data;
        console.log(`[MidtransCallback] Received notification for order: ${data.order_id}, status: ${data.transaction_status}`);

        // Verifikasi signature menggunakan Midtrans provider
        const provider = getPaymentProvider();
        const midtransProvider = provider as MidtransProvider;

        // Generate expected signature untuk verifikasi
        const webhookResult = await provider.handleWebhook(body, data.signature_key || '');

        if (!webhookResult.success) {
            console.error(`[MidtransCallback] Webhook verification failed for order: ${data.order_id}, error: ${webhookResult.error}`);
            return NextResponse.json(
                { success: false, error: webhookResult.error },
                { status: 400 }
            );
        }

        // NOTE: Tenant isolation sengaja tidak diterapkan di sini karena route ini adalah
        // webhook publik yang dipanggil langsung oleh Midtrans server (tidak ada auth).
        // Keamanan dijamin oleh: (1) verifikasi signature HMAC SHA512 di atas,
        // (2) order_id bersifat unik secara global (format: ORD-{invoiceNumber}-{timestamp}),
        // dan (3) reference field memiliki unique constraint di database.
        const payment = await prisma.billingPayment.findFirst({
            where: {
                reference: data.order_id,
            },
            include: {
                subscription: true,
            },
        });

        if (!payment) {
            console.warn(`[MidtransCallback] Payment not found for order: ${data.order_id}`);
            // Return 200 agar Midtrans tidak retry terus-menerus
            return NextResponse.json({
                success: true,
                message: 'Order not found, skipping',
            });
        }

        // Map status Midtrans ke status internal
        const statusMapping: Record<string, string> = {
            capture: 'VERIFIED',
            settlement: 'VERIFIED',
            pending: 'PENDING',
            deny: 'REJECTED',
            expire: 'REJECTED',
            cancel: 'REJECTED',
        };

        const newPaymentStatus = statusMapping[data.transaction_status] || 'PENDING';
        const isPaid = data.transaction_status === 'capture' || data.transaction_status === 'settlement';

        // Update payment status
        await prisma.billingPayment.update({
            where: { id: payment.id },
            data: {
                status: newPaymentStatus,
                verifiedAt: isPaid ? new Date() : undefined,
                notes: [
                    payment.notes,
                    `[Midtrans Callback] Status: ${data.transaction_status} | TX ID: ${data.transaction_id || 'N/A'}`,
                ].filter(Boolean).join(' | '),
            },
        });

        // Jika pembayaran berhasil, update subscription status
        if (isPaid) {
            // Update subscription ke ACTIVE
            await prisma.tenantSubscription.update({
                where: { id: payment.subscriptionId },
                data: {
                    status: 'ACTIVE',
                    startDate: new Date(),
                    paymentMethod: 'midtrans',
                    notes: `Activated via Midtrans - Order: ${data.order_id}`,
                },
            });

            // Update tenant subscription status
            await prisma.tenant.update({
                where: { id: payment.tenantId },
                data: { subscriptionStatus: 'ACTIVE' },
            });

            console.log(`[MidtransCallback] Payment VERIFIED for order: ${data.order_id}, subscription activated`);

            // Log audit
            void logAudit({
                userId: 'system',
                tenantId: payment.tenantId,
                action: 'UPDATE',
                entity: 'BillingPayment',
                entityId: payment.id,
                oldValues: { status: payment.status } as Record<string, unknown>,
                newValues: {
                    status: newPaymentStatus,
                    transactionId: data.transaction_id,
                    transactionStatus: data.transaction_status,
                } as Record<string, unknown>,
                request,
            });
        } else if (data.transaction_status === 'pending') {
            console.log(`[MidtransCallback] Payment PENDING for order: ${data.order_id}`);
        } else {
            console.log(`[MidtransCallback] Payment ${newPaymentStatus} for order: ${data.order_id}`);

            // Log audit untuk status non-success
            void logAudit({
                userId: 'system',
                tenantId: payment.tenantId,
                action: 'UPDATE',
                entity: 'BillingPayment',
                entityId: payment.id,
                oldValues: { status: payment.status } as Record<string, unknown>,
                newValues: {
                    status: newPaymentStatus,
                    transactionStatus: data.transaction_status,
                } as Record<string, unknown>,
                request,
            });
        }

        return NextResponse.json({
            success: true,
            message: `Payment status updated: ${newPaymentStatus}`,
        });
    } catch (error) {
        console.error('[MidtransCallback] Error processing webhook:', error);
        // Return 200 agar Midtrans tidak retry terus-menerus
        // Log error untuk investigasi manual
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 200 }
        );
    }
}

/**
 * GET /api/billing/payments/midtrans/callback
 *
 * Health check endpoint untuk Midtrans callback.
 */
export async function GET() {
    return NextResponse.json({
        success: true,
        message: 'Midtrans callback endpoint is active',
    });
}
