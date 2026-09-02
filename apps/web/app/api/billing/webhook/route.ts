/**
 * POST /api/billing/webhook
 *
 * Handle payment webhook from payment providers (Midtrans, Xendit, etc.).
 * This route is PUBLIC (no auth required) — called by payment provider servers.
 *
 * Security: Webhook signature verification using HMAC SHA256.
 * The signature is computed as HMAC-SHA256(rawBody, BILLING_WEBHOOK_SECRET).
 * Signature must be provided in the `X-Webhook-Signature` header.
 *
 * Updates TenantEntitlement status when payment is confirmed.
 *
 * @see apps/web/app/api/billing/payments/midtrans/callback/route.ts for Midtrans-specific handler
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { invalidateEntitlementCache } from '@/lib/entitlement';
import crypto from 'crypto';

/**
 * Verify webhook signature using HMAC SHA256.
 *
 * @param rawBody - Raw request body string
 * @param signature - Signature from X-Webhook-Signature header
 * @returns true if signature is valid
 */
function verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = process.env.BILLING_WEBHOOK_SECRET;
    if (!secret) {
        console.error('[Webhook] BILLING_WEBHOOK_SECRET environment variable is not set');
        return false;
    }

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody, 'utf8')
        .digest('hex');

    // Timing-safe comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(signature, 'hex')
        );
    } catch {
        // Buffer lengths differ or invalid hex — signature is invalid
        return false;
    }
}

export async function POST(request: Request) {
    try {
        // ─── Step 1: Extract and verify webhook signature ──────────────────
        const signature = request.headers.get('x-webhook-signature');

        if (!signature) {
            console.warn('[Webhook] Missing X-Webhook-Signature header — rejecting request');
            return NextResponse.json(
                { success: false, error: 'Missing webhook signature' },
                { status: 401 }
            );
        }

        // Read raw body for signature verification
        const rawBody = await request.text();

        if (!verifyWebhookSignature(rawBody, signature)) {
            console.error('[Webhook] Invalid webhook signature — rejecting request');
            // Log failed attempt for security monitoring
            void logAudit({
                userId: 'system',
                tenantId: 'unknown',
                action: 'WEBHOOK_SIGNATURE_FAILED',
                entity: 'BillingPayment',
                entityId: 'unknown',
                oldValues: {} as Record<string, unknown>,
                newValues: {
                    reason: 'Invalid webhook signature',
                    signatureHeader: signature.substring(0, 8) + '...',
                    timestamp: new Date().toISOString(),
                } as Record<string, unknown>,
                request,
            });
            return NextResponse.json(
                { success: false, error: 'Invalid webhook signature' },
                { status: 401 }
            );
        }

        // ─── Step 2: Parse and validate payload ────────────────────────────
        const body = JSON.parse(rawBody) as Record<string, unknown>;

        const { orderId, status, transactionId } = body as {
            orderId?: string;
            status?: string;
            transactionId?: string;
        };

        if (!orderId || !status) {
            return NextResponse.json(
                { success: false, error: 'orderId dan status wajib diisi' },
                { status: 400 }
            );
        }

        console.log(`[Webhook] Received notification for order: ${orderId}, status: ${status}`);

        // Find the billing payment by reference (orderId)
        const payment = await prisma.billingPayment.findFirst({
            where: { reference: orderId },
            include: {
                tenant: true,
            },
        });

        if (!payment) {
            console.warn(`[Webhook] Payment not found for order: ${orderId}`);
            return NextResponse.json({
                success: true,
                message: 'Order not found, skipping',
            });
        }

        // Map status to internal status
        const statusMapping: Record<string, string> = {
            capture: 'VERIFIED',
            settlement: 'VERIFIED',
            pending: 'PENDING',
            deny: 'REJECTED',
            expire: 'REJECTED',
            cancel: 'REJECTED',
        };

        const newPaymentStatus = statusMapping[status] || 'PENDING';
        const isPaid = status === 'capture' || status === 'settlement';

        // Update payment status
        await prisma.billingPayment.update({
            where: { id: payment.id },
            data: {
                status: newPaymentStatus,
                verifiedAt: isPaid ? new Date() : undefined,
                notes: [
                    payment.notes,
                    `[Webhook] Status: ${status} | TX ID: ${transactionId || 'N/A'}`,
                ].filter(Boolean).join(' | '),
            },
        });

        // If payment is confirmed, activate entitlement
        if (isPaid) {
            // Find the subscription to get the plan
            const subscription = await prisma.tenantSubscription.findUnique({
                where: { id: payment.subscriptionId },
                include: { plan: true },
            });

            if (subscription?.plan) {
                // Find or create the Plan in entitlement system
                let plan = await prisma.plan.findUnique({
                    where: { slug: subscription.plan.slug },
                });

                if (!plan) {
                    // Create plan from subscription plan
                    plan = await prisma.plan.create({
                        data: {
                            name: subscription.plan.name,
                            slug: subscription.plan.slug,
                            description: subscription.plan.description,
                            priceMonthly: subscription.plan.price,
                            priceYearly: null,
                            maxUsers: subscription.plan.maxUsers,
                            maxStorage: null,
                            sortOrder: subscription.plan.sortOrder,
                        },
                    });
                }

                // Activate entitlement
                const now = new Date();
                const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

                await prisma.tenantEntitlement.upsert({
                    where: { tenantId: payment.tenantId },
                    update: {
                        planId: plan.id,
                        status: 'active',
                        currentPeriodStart: now,
                        currentPeriodEnd: periodEnd,
                    },
                    create: {
                        tenantId: payment.tenantId,
                        planId: plan.id,
                        status: 'active',
                        currentPeriodStart: now,
                        currentPeriodEnd: periodEnd,
                    },
                });

                // Update tenant subscription status
                await prisma.tenant.update({
                    where: { id: payment.tenantId },
                    data: {
                        subscriptionStatus: 'ACTIVE',
                        currentPlanSlug: subscription.plan.slug,
                    },
                });

                // Invalidate cache
                invalidateEntitlementCache(payment.tenantId);
            }

            console.log(`[Webhook] Payment VERIFIED for order: ${orderId}, entitlement activated`);
        }

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
                transactionId: transactionId || null,
            } as Record<string, unknown>,
            request,
        });

        return NextResponse.json({
            success: true,
            message: `Payment status updated: ${newPaymentStatus}`,
        });
    } catch (error) {
        console.error('[Webhook] Error processing webhook:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 200 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        success: true,
        message: 'Billing webhook endpoint is active',
    });
}
