import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const refund = await prisma.posRefund.findFirst({
            where: { id, tenantId },
            include: {
                transaction: {
                    select: {
                        id: true,
                        transactionNo: true,
                        totalAmount: true,
                        paidAmount: true,
                        customerName: true,
                        paymentMethod: true,
                        status: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!refund) {
            return NextResponse.json(
                { success: false, error: 'Refund tidak ditemukan' },
                { status: 404 }
            );
        }

        const data = {
            id: refund.id,
            refundNo: refund.refundNo,
            transactionId: refund.transactionId,
            transaction: {
                id: refund.transaction.id,
                transactionNo: refund.transaction.transactionNo,
                totalAmount: Number(refund.transaction.totalAmount),
                paidAmount: Number(refund.transaction.paidAmount),
                customerName: refund.transaction.customerName || '-',
                paymentMethod: refund.transaction.paymentMethod,
                status: refund.transaction.status,
                createdAt: refund.transaction.createdAt.toISOString(),
            },
            amount: Number(refund.amount),
            reason: refund.reason,
            status: refund.status,
            approvedBy: refund.approvedBy,
            approvedAt: refund.approvedAt?.toISOString() || null,
            createdBy: refund.createdBy,
            createdAt: refund.createdAt.toISOString(),
        };

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Only ADMIN+ can approve/reject refunds
        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat menyetujui atau menolak refund' },
                { status: 403 }
            );
        }

        const { id } = params;
        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const { status: newStatus, notes } = sanitizedBody as { status: string; notes?: string };

        if (!newStatus || !['APPROVED', 'REJECTED'].includes(newStatus)) {
            return NextResponse.json(
                { success: false, error: 'Status harus APPROVED atau REJECTED' },
                { status: 400 }
            );
        }

        const existing = await prisma.posRefund.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Refund tidak ditemukan' },
                { status: 404 }
            );
        }

        if (existing.status !== 'PENDING') {
            return NextResponse.json(
                { success: false, error: 'Refund sudah diproses sebelumnya' },
                { status: 400 }
            );
        }

        const updateData: Record<string, unknown> = {
            status: newStatus,
            approvedBy: userId,
            approvedAt: new Date(),
        };

        if (notes) {
            updateData.notes = notes;
        }

        const refund = await prisma.posRefund.update({
            where: { id },
            data: updateData,
        });

        // If approved, update transaction status to REFUNDED
        if (newStatus === 'APPROVED') {
            await prisma.posTransaction.update({
                where: { id: existing.transactionId },
                data: { status: 'REFUNDED' },
            });
        }

        void logAudit({
            userId,
            tenantId,
            action: newStatus === 'APPROVED' ? 'APPROVE' : 'REJECT',
            entity: 'PosRefund',
            entityId: id,
            oldValues: { status: existing.status },
            newValues: { status: newStatus, approvedBy: userId },
            request,
        });

        return NextResponse.json({ success: true, data: { id: refund.id, status: refund.status } });
    } catch (error) {
        return handleApiError(error);
    }
}
