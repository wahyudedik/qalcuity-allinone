/**
 * POST /api/billing/webhook
 *
 * Handle payment webhook from payment providers (Midtrans, etc.).
 * This route is PUBLIC (no auth required) — called by payment provider servers.
 *
 * Updates TenantEntitlement status when payment is confirmed.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { invalidateEntitlementCache } from '@/lib/entitlement';

export async function POST(request: Request) {
    try {
        const body = await request.json();

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
