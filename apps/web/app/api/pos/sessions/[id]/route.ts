import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { closePosSessionSchema, formatZodError } from '@/lib/validation-schemas';
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

        const session = await prisma.posSession.findFirst({
            where: { id, tenantId },
            include: {
                terminal: { select: { id: true, name: true, code: true } },
                transactions: {
                    include: {
                        items: true,
                        payments: true,
                        refunds: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Sesi tidak ditemukan' },
                { status: 404 }
            );
        }

        const completedTransactions = session.transactions.filter((t) => t.status === 'COMPLETED');
        const totalSales = completedTransactions.reduce((sum, t) => sum + Number(t.totalAmount), 0);
        const cashSales = completedTransactions
            .filter((t) => t.paymentMethod === 'CASH')
            .reduce((sum, t) => sum + Number(t.totalAmount), 0);
        const nonCashSales = totalSales - cashSales;

        const data = {
            id: session.id,
            terminalId: session.terminalId,
            terminalName: session.terminal.name,
            terminalCode: session.terminal.code,
            cashierId: session.cashierId,
            cashierName: session.cashierName,
            status: session.status,
            openingCash: Number(session.openingCash),
            closingCash: session.closingCash ? Number(session.closingCash) : null,
            expectedCash: session.expectedCash ? Number(session.expectedCash) : null,
            variance: session.variance ? Number(session.variance) : null,
            transactionCount: session.transactions.length,
            completedTransactionCount: completedTransactions.length,
            totalSales,
            cashSales,
            nonCashSales,
            openedAt: session.openedAt.toISOString(),
            closedAt: session.closedAt?.toISOString() || null,
            createdAt: session.createdAt.toISOString(),
            transactions: session.transactions.map((t) => ({
                id: t.id,
                transactionNo: t.transactionNo,
                customerName: t.customerName,
                totalAmount: Number(t.totalAmount),
                paidAmount: Number(t.paidAmount),
                changeAmount: Number(t.changeAmount),
                paymentMethod: t.paymentMethod,
                status: t.status,
                items: t.items.map((item) => ({
                    id: item.id,
                    productName: item.productName,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    subtotal: Number(item.subtotal),
                })),
                payments: t.payments.map((p) => ({
                    id: p.id,
                    method: p.method,
                    amount: Number(p.amount),
                    reference: p.reference,
                    status: p.status,
                })),
                createdAt: t.createdAt.toISOString(),
            })),
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
        const sanitizedBody = sanitizeObject(body);
        const validation = closePosSessionSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const existing = await prisma.posSession.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Sesi tidak ditemukan' },
                { status: 404 }
            );
        }

        if (existing.status !== 'OPEN') {
            return NextResponse.json(
                { success: false, error: 'Hanya sesi OPEN yang dapat ditutup' },
                { status: 400 }
            );
        }

        // Calculate expected cash from completed transactions
        const completedTransactions = await prisma.posTransaction.findMany({
            where: { sessionId: id, status: 'COMPLETED' },
        });

        const cashTransactions = completedTransactions.filter((t) => t.paymentMethod === 'CASH');
        const totalCashSales = cashTransactions.reduce((sum, t) => sum + Number(t.totalAmount), 0);
        const totalCashRefunds = await prisma.posRefund.aggregate({
            where: {
                transactionId: { in: completedTransactions.map((t) => t.id) },
                status: { in: ['APPROVED', 'PENDING'] },
            },
            _sum: { amount: true },
        });
        const refundAmount = totalCashRefunds._sum.amount ? Number(totalCashRefunds._sum.amount) : 0;
        const expectedCash = Number(existing.openingCash) + totalCashSales - refundAmount;
        const variance = validatedData.closingCash - expectedCash;

        const updatedSession = await prisma.posSession.update({
            where: { id },
            data: {
                status: 'CLOSED',
                closingCash: validatedData.closingCash,
                expectedCash,
                variance,
                closedAt: new Date(),
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'PosSession',
            entityId: id,
            oldValues: { status: 'OPEN', closingCash: null },
            newValues: {
                status: 'CLOSED',
                closingCash: validatedData.closingCash,
                expectedCash,
                variance,
            },
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: updatedSession.id,
                status: updatedSession.status,
                closingCash: Number(updatedSession.closingCash),
                expectedCash: Number(updatedSession.expectedCash),
                variance: Number(updatedSession.variance),
                closedAt: updatedSession.closedAt?.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
