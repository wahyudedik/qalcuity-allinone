import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { sanitizeInput } from '@/lib/sanitize';
import { logAudit } from '@/lib/audit';
import { verifyBillingPaymentSchema, formatZodError } from '@/lib/validation-schemas';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { userId } = auth;

        const { id } = params;
        const body = await request.json();

        const validation = verifyBillingPaymentSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { action, rejectReason } = validation.data;

        // Find payment
        const payment = await prisma.billingPayment.findUnique({
            where: { id },
            include: {
                subscription: {
                    include: {
                        plan: true,
                    },
                },
                tenant: true,
            },
        });

        if (!payment) {
            return NextResponse.json(
                { success: false, error: 'Pembayaran tidak ditemukan' },
                { status: 404 }
            );
        }

        if (payment.status !== 'PENDING') {
            return NextResponse.json(
                { success: false, error: 'Pembayaran sudah diproses' },
                { status: 400 }
            );
        }

        const now = new Date();

        if (action === 'approve') {
            // Update payment status
            await prisma.billingPayment.update({
                where: { id },
                data: {
                    status: 'VERIFIED',
                    verifiedById: userId,
                    verifiedAt: now,
                },
            });

            // Update subscription status to ACTIVE
            await prisma.tenantSubscription.update({
                where: { id: payment.subscriptionId },
                data: {
                    status: 'ACTIVE',
                    startDate: now,
                    nextBillingDate: new Date(
                        now.getFullYear(),
                        now.getMonth() + 1,
                        now.getDate()
                    ),
                },
            });

            // Update tenant subscription status
            await prisma.tenant.update({
                where: { id: payment.tenantId },
                data: {
                    subscriptionStatus: 'ACTIVE',
                    currentPlanSlug: payment.subscription.plan?.slug,
                },
            });

            // Log audit approve
            void logAudit({ userId, tenantId: payment.tenantId, action: 'UPDATE', entity: 'BillingPayment', entityId: id, oldValues: { status: 'PENDING' } as Record<string, unknown>, newValues: { status: 'VERIFIED' } as Record<string, unknown>, request });

            return NextResponse.json({
                success: true,
                message: 'Pembayaran berhasil diverifikasi. Langganan tenant telah diaktifkan.',
            });
        } else {
            // Reject (rejectReason guaranteed by Zod refine validation)
            await prisma.billingPayment.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    rejectReason: sanitizeInput(rejectReason!),
                    verifiedById: userId,
                    verifiedAt: now,
                },
            });

            // Log audit reject
            void logAudit({ userId, tenantId: payment.tenantId, action: 'UPDATE', entity: 'BillingPayment', entityId: id, oldValues: { status: 'PENDING' } as Record<string, unknown>, newValues: { status: 'REJECTED', rejectReason: sanitizeInput(rejectReason!) } as Record<string, unknown>, request });

            return NextResponse.json({
                success: true,
                message: 'Pembayaran ditolak.',
            });
        }
    } catch (error) {
        console.error('Error verifying payment:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { success: false, error: 'Gagal memproses verifikasi pembayaran' },
            { status: 500 }
        );
    }
}
