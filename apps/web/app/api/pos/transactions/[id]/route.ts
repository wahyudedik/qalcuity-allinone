import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const transaction = await prisma.posTransaction.findFirst({
            where: { id, tenantId },
            include: {
                items: true,
                payments: true,
                refunds: true,
                session: {
                    select: { id: true, terminal: { select: { name: true, code: true } } },
                },
            },
        });

        if (!transaction) {
            return NextResponse.json(
                { success: false, error: 'Transaksi tidak ditemukan' },
                { status: 404 }
            );
        }

        const data = {
            id: transaction.id,
            transactionNo: transaction.transactionNo,
            sessionId: transaction.sessionId,
            terminalName: transaction.session.terminal.name,
            terminalCode: transaction.session.terminal.code,
            customerName: transaction.customerName || '-',
            customerPhone: transaction.customerPhone || null,
            subtotal: Number(transaction.subtotal),
            discountAmount: Number(transaction.discountAmount),
            discountPercent: transaction.discountPercent ? Number(transaction.discountPercent) : null,
            taxAmount: Number(transaction.taxAmount),
            totalAmount: Number(transaction.totalAmount),
            paidAmount: Number(transaction.paidAmount),
            changeAmount: Number(transaction.changeAmount),
            paymentMethod: transaction.paymentMethod,
            status: transaction.status,
            notes: transaction.notes || '',
            createdBy: transaction.createdBy,
            items: transaction.items.map((item) => ({
                id: item.id,
                productId: item.productId,
                productName: item.productName,
                productSku: item.productSku,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                discountAmount: Number(item.discountAmount),
                discountPercent: item.discountPercent ? Number(item.discountPercent) : null,
                taxRate: Number(item.taxRate),
                taxAmount: Number(item.taxAmount),
                subtotal: Number(item.subtotal),
            })),
            payments: transaction.payments.map((p) => ({
                id: p.id,
                method: p.method,
                amount: Number(p.amount),
                reference: p.reference,
                status: p.status,
                createdAt: p.createdAt.toISOString(),
            })),
            refunds: transaction.refunds.map((r) => ({
                id: r.id,
                refundNo: r.refundNo,
                amount: Number(r.amount),
                reason: r.reason,
                status: r.status,
                approvedBy: r.approvedBy,
                approvedAt: r.approvedAt?.toISOString() || null,
                createdAt: r.createdAt.toISOString(),
            })),
            createdAt: transaction.createdAt.toISOString(),
            updatedAt: transaction.updatedAt.toISOString(),
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
        const { id } = params;
        const body = await request.json();
        const { status: newStatus } = body;

        if (newStatus !== 'VOIDED') {
            return NextResponse.json(
                { success: false, error: 'Status tidak valid. Hanya VOIDED yang diizinkan.' },
                { status: 400 }
            );
        }

        const existing = await prisma.posTransaction.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Transaksi tidak ditemukan' },
                { status: 404 }
            );
        }

        if (existing.status !== 'COMPLETED') {
            return NextResponse.json(
                { success: false, error: 'Hanya transaksi COMPLETED yang dapat di-void' },
                { status: 400 }
            );
        }

        // Only ADMIN+ can void transactions
        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat membatalkan transaksi' },
                { status: 403 }
            );
        }

        const transaction = await prisma.posTransaction.update({
            where: { id },
            data: { status: 'VOIDED' },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'PosTransaction',
            entityId: id,
            oldValues: { status: 'COMPLETED' },
            newValues: { status: 'VOIDED' },
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: transaction.id,
                transactionNo: transaction.transactionNo,
                status: transaction.status,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
