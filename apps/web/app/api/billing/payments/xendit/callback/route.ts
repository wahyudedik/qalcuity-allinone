export const dynamic = 'force-dynamic';

/**
 * Xendit Payment Callback / Webhook Handler
 *
 * Menerima notification dari Xendit ketika status pembayaran berubah.
 * Route ini bersifat PUBLIC (tidak memerlukan auth) karena dipanggil langsung oleh Xendit server.
 *
 * Flow:
 * 1. Xendit POST notification ke route ini
 * 2. Verifikasi callback token
 * 3. Update BillingPayment status berdasarkan invoice status
 * 4. Phase 4: Update TenantEntitlement status (or fallback TenantSubscription) jika pembayaran berhasil
 *
 * @see https://developers.xendit.co/api-reference/#invoice-callbacks
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { invalidateEntitlementCache } from '@/lib/entitlement';
import { getPaymentProvider } from '@/lib/payment/provider';
import { xenditWebhookSchema, formatZodError } from '@/lib/validation-schemas';
import { logger } from '@/lib/logger';

/**
 * POST /api/billing/payments/xendit/callback
 *
 * Webhook handler untuk Xendit invoice notification.
 * Tidak memerlukan auth — dipanggil langsung oleh Xendit server.
 */
export async function POST(request: Request) {
    try {
        // Extract callback token from header (Xendit sends it as X-Callback-Token)
        const callbackToken = request.headers.get('x-callback-token') || '';

        const body = await request.json();

        // Validasi input dengan Zod
        const validation = xenditWebhookSchema.safeParse(body);
        if (!validation.success) {
            const errorResponse = formatZodError(validation.error);
            logger.warn('[XenditCallback] Invalid webhook payload:', errorResponse);
            return NextResponse.json(
                { success: false, error: errorResponse.message },
                { status: 400 }
            );
        }

        const data = validation.data;
        logger.info(`[XenditCallback] Received notification for invoice: ${data.external_id}, status: ${data.status}`);

        // Verifikasi callback token menggunakan Xendit provider
        const provider = getPaymentProvider();
        const webhookResult = await provider.handleWebhook(body, callbackToken);

        if (!webhookResult.success) {
            logger.error(`[XenditCallback] Webhook verification failed for invoice: ${data.external_id}, error: ${webhookResult.error}`);
            return NextResponse.json(
                { success: false, error: webhookResult.error },
                { status: 400 }
            );
        }

        // NOTE: Tenant isolation sengaja tidak diterapkan di sini karena route ini adalah
        // webhook publik yang dipanggil langsung oleh Xendit server (tidak ada auth).
        // Keamanan dijamin oleh: (1) verifikasi callback token di atas,
        // (2) external_id bersifat unik secara global (format: QAL-{tenantId8}-{timestamp}),
        // dan (3) reference field memiliki unique constraint di database.
        const payment = await prisma.billingPayment.findFirst({
            where: {
                reference: data.external_id,
            },
            include: {
                entitlement: {
                    include: { plan: true },
                },
                subscription: {
                    include: { plan: true },
                },
            },
        });

        if (!payment) {
            logger.warn(`[XenditCallback] Payment not found for invoice: ${data.external_id}`);
            // Return 200 agar Xendit tidak retry terus-menerus
            return NextResponse.json({
                success: true,
                message: 'Order not found, skipping',
            });
        }

        // Map status Xendit ke status internal
        const statusMapping: Record<string, string> = {
            PAID: 'VERIFIED',
            PENDING: 'PENDING',
            EXPIRED: 'REJECTED',
            VOIDED: 'REJECTED',
        };

        const newPaymentStatus = statusMapping[data.status] || 'PENDING';
        const isPaid = data.status === 'PAID';

        // Update payment status
        await prisma.billingPayment.update({
            where: { id: payment.id },
            data: {
                status: newPaymentStatus,
                verifiedAt: isPaid ? new Date() : undefined,
                notes: [
                    payment.notes,
                    `[Xendit Callback] Status: ${data.status} | Invoice ID: ${data.id || 'N/A'}`,
                ].filter(Boolean).join(' | '),
            },
        });

        // Phase 4: If payment is successful, activate entitlement via Plan model (preferred)
        if (isPaid) {
            if (payment.entitlement?.plan) {
                // New path: Update TenantEntitlement status
                const now = new Date();
                const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

                await prisma.tenantEntitlement.update({
                    where: { id: payment.entitlement.id },
                    data: {
                        status: 'active',
                        currentPeriodStart: now,
                        currentPeriodEnd: periodEnd,
                    },
                });

                // Sync Tenant.subscriptionStatus
                await prisma.tenant.update({
                    where: { id: payment.tenantId },
                    data: { subscriptionStatus: 'ACTIVE' },
                });

                // Invalidate entitlement cache
                invalidateEntitlementCache(payment.tenantId);

                logger.info(`[XenditCallback] Payment VERIFIED for invoice: ${data.external_id}, entitlement activated`);
            } else {
                // Fallback: Update legacy TenantSubscription status
                await prisma.tenantSubscription.update({
                    where: { id: payment.subscriptionId },
                    data: {
                        status: 'ACTIVE',
                        startDate: new Date(),
                        paymentMethod: 'xendit',
                        notes: `Activated via Xendit - Invoice: ${data.external_id}`,
                    },
                });

                // Update tenant subscription status
                await prisma.tenant.update({
                    where: { id: payment.tenantId },
                    data: { subscriptionStatus: 'ACTIVE' },
                });

                logger.info(`[XenditCallback] Payment VERIFIED for invoice: ${data.external_id}, legacy subscription activated`);
            }

            // Log audit
            void logAudit({
                userId: 'system',
                tenantId: payment.tenantId,
                action: 'UPDATE',
                entity: 'BillingPayment',
                entityId: payment.id,
                oldValues: toAuditPayload({ status: payment.status }),
                newValues: toAuditPayload({
                    status: newPaymentStatus,
                    invoiceId: data.id,
                    invoiceStatus: data.status,
                }),
                request,
            });
        } else if (data.status === 'PENDING') {
            logger.info(`[XenditCallback] Payment PENDING for invoice: ${data.external_id}`);
        } else {
            logger.info(`[XenditCallback] Payment ${newPaymentStatus} for invoice: ${data.external_id}`);

            // Log audit untuk status non-success
            void logAudit({
                userId: 'system',
                tenantId: payment.tenantId,
                action: 'UPDATE',
                entity: 'BillingPayment',
                entityId: payment.id,
                oldValues: toAuditPayload({ status: payment.status }),
                newValues: toAuditPayload({
                    status: newPaymentStatus,
                    invoiceStatus: data.status,
                }),
                request,
            });
        }

        return NextResponse.json({
            success: true,
            message: `Payment status updated: ${newPaymentStatus}`,
        });
    } catch (error) {
        logger.error('[XenditCallback] Error processing webhook:', error);
        // Return 200 agar Xendit tidak retry terus-menerus
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 200 }
        );
    }
}

/**
 * GET /api/billing/payments/xendit/callback
 *
 * Health check endpoint untuk Xendit callback.
 */
export async function GET() {
    return NextResponse.json({
        success: true,
        message: 'Xendit callback endpoint is active',
    });
}
