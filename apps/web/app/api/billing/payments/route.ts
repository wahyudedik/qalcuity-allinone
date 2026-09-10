export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { sanitizeInput } from '@/lib/sanitize';
import { notifySuperadminPayment } from '@/lib/email';
import { logAudit } from '@/lib/audit';
import { createBillingPaymentSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const [payments, total] = await Promise.all([
            prisma.billingPayment.findMany({
                where: { tenantId: auth.tenantId },
                include: {
                    subscription: {
                        include: { plan: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.billingPayment.count({
                where: { tenantId: auth.tenantId },
            }),
        ]);

        return NextResponse.json({
            success: true,
            data: payments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId } = auth;
        const body = await request.json();

        const validation = createBillingPaymentSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const {
            subscriptionId,
            amount,
            bankName,
            accountNumber,
            accountName,
            reference,
            notes,
            proofFileUrl,
            proofFileName,
        } = validation.data;

        // Validasi subscription exists dan milik tenant
        const subscription = await prisma.tenantSubscription.findFirst({
            where: {
                id: subscriptionId,
                tenantId,
            },
        });

        if (!subscription) {
            return NextResponse.json(
                { success: false, error: MSG.SUBSCRIPTION_NOT_FOUND, code: 'SUBSCRIPTION_NOT_FOUND' },
                { status: 404 }
            );
        }

        const payment = await prisma.billingPayment.create({
            data: {
                subscriptionId,
                tenantId,
                amount,
                paymentMethod: 'manual_transfer',
                bankName: sanitizeInput(bankName),
                accountNumber: sanitizeInput(accountNumber),
                accountName: sanitizeInput(accountName),
                reference: reference ? sanitizeInput(reference) : null,
                notes: notes ? sanitizeInput(notes) : null,
                proofFileUrl: proofFileUrl || null,
                proofFileName: proofFileName || null,
                status: 'PENDING',
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

        // Notify superadmin via email (non-blocking)
        notifySuperadminPayment(payment.id).catch((err) => {
            console.error('[Billing] Failed to notify superadmin:', err instanceof Error ? err.message : 'Unknown error');
        });

        // Log audit create
        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'BillingPayment', entityId: payment.id, newValues: { amount: payment.amount, bankName: payment.bankName, subscriptionId: payment.subscriptionId } as Record<string, unknown>, request });

        return NextResponse.json({
            success: true,
            data: payment,
            message: MSG.BILLING_PROOF_SUBMITTED,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
