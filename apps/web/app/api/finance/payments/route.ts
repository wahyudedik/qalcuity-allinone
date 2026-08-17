import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET(request: Request) {
    try {
        const { tenantId } = await requireAuth();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const method = searchParams.get('method');
        const search = searchParams.get('search');
        const type = searchParams.get('type'); // INCOME or EXPENSE
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (status) {
            where.status = status.toUpperCase();
        }

        if (method) {
            where.method = method.toUpperCase().replace('-', '_');
        }

        if (type) {
            where.type = type.toUpperCase();
        }

        if (search) {
            where.OR = [
                { paymentNumber: { contains: search } },
                { reference: { contains: search } },
                { invoice: { invoiceNumber: { contains: search } } },
                { invoice: { contact: { name: { contains: search } } } },
            ];
        }

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                include: {
                    invoice: {
                        select: {
                            id: true,
                            invoiceNumber: true,
                            total: true,
                            contact: { select: { name: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.payment.count({ where }),
        ]);

        const data = payments.map((p) => ({
            id: p.id,
            paymentNumber: p.paymentNumber,
            invoiceId: p.invoiceId,
            invoiceNumber: p.invoice?.invoiceNumber || '-',
            customerName: p.invoice?.contact?.name || '-',
            invoiceTotal: p.invoice?.total || 0,
            amount: p.amount,
            method: p.method.toLowerCase().replace('_', '-'),
            status: p.status.toLowerCase(),
            type: p.type,
            date: p.paymentDate.toISOString().split('T')[0],
            reference: p.reference || '',
            notes: p.notes || '',
            createdAt: p.createdAt.toISOString(),
        }));

        return NextResponse.json({
            success: true,
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { tenantId, userId } = await requireAuth();
        const body = await request.json();

        if (!body.amount || !body.method) {
            return NextResponse.json(
                { success: false, error: 'Amount and method are required' },
                { status: 400 }
            );
        }

        const amount = parseFloat(String(body.amount));
        if (isNaN(amount) || amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Amount must be a positive number' },
                { status: 400 }
            );
        }

        const status = (body.status || 'PENDING').toUpperCase();
        if (!['COMPLETED', 'PENDING', 'FAILED'].includes(status)) {
            return NextResponse.json(
                { success: false, error: 'Status must be COMPLETED, PENDING, or FAILED' },
                { status: 400 }
            );
        }

        const payment = await prisma.$transaction(async (tx) => {
            const count = await tx.payment.count({ where: { tenantId } });
            const paymentNumber = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

            const newPayment = await tx.payment.create({
                data: {
                    paymentNumber,
                    amount,
                    paymentDate: body.date ? new Date(body.date) : new Date(),
                    method: (body.method || 'BANK_TRANSFER').toUpperCase().replace('-', '_'),
                    status,
                    type: (body.type || 'INCOME').toUpperCase(),
                    reference: body.reference || '',
                    notes: body.notes || '',
                    invoiceId: body.invoiceId || undefined,
                    tenantId,
                },
                include: {
                    invoice: {
                        select: { invoiceNumber: true, total: true, contact: { select: { name: true } } },
                    },
                },
            });

            // Update invoice status if payment is linked to an invoice and is COMPLETED
            if (body.invoiceId && status === 'COMPLETED') {
                const invoice = await tx.invoice.findUnique({
                    where: { id: body.invoiceId },
                    include: { payments: { where: { status: 'COMPLETED' } } },
                });

                if (invoice) {
                    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0) + amount;
                    const newInvoiceStatus = totalPaid >= invoice.total ? 'PAID' : invoice.status;
                    await tx.invoice.update({
                        where: { id: body.invoiceId },
                        data: { status: newInvoiceStatus },
                    });
                }
            }

            return newPayment;
        });

        return NextResponse.json({ success: true, data: payment }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { tenantId } = await requireAuth();
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const existing = await prisma.payment.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Payment not found' },
                { status: 404 }
            );
        }

        // Build safe update data
        const data: Record<string, unknown> = {};
        if (typeof updateData.status === 'string') {
            data.status = updateData.status.toUpperCase();
        }
        if (typeof updateData.method === 'string') {
            data.method = updateData.method.toUpperCase().replace('-', '_');
        }
        if (typeof updateData.amount === 'number') {
            data.amount = updateData.amount;
        }
        if (typeof updateData.type === 'string') {
            data.type = updateData.type.toUpperCase();
        }
        if (typeof updateData.reference === 'string') {
            data.reference = updateData.reference;
        }
        if (typeof updateData.notes === 'string') {
            data.notes = updateData.notes;
        }
        if (updateData.date) {
            data.paymentDate = new Date(String(updateData.date));
        }

        const payment = await prisma.$transaction(async (tx) => {
            const updated = await tx.payment.update({
                where: { id },
                data,
                include: {
                    invoice: {
                        select: { id: true, invoiceNumber: true, total: true, contact: { select: { name: true } } },
                    },
                },
            });

            // Recalculate invoice status if status changed
            if (data.status && updated.invoiceId) {
                const invoice = await tx.invoice.findUnique({
                    where: { id: updated.invoiceId },
                    include: { payments: true },
                });

                if (invoice) {
                    const totalPaid = invoice.payments
                        .filter((p) => p.id !== id && p.status === 'COMPLETED')
                        .reduce((sum, p) => sum + p.amount, 0) + (data.status === 'COMPLETED' ? updated.amount : 0);
                    const newInvoiceStatus = totalPaid >= invoice.total ? 'PAID' : 'SENT';
                    await tx.invoice.update({
                        where: { id: updated.invoiceId },
                        data: { status: newInvoiceStatus },
                    });
                }
            }

            return updated;
        });

        return NextResponse.json({ success: true, data: payment });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { tenantId } = await requireAuth();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const existing = await prisma.payment.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Payment not found' },
                { status: 404 }
            );
        }

        await prisma.payment.delete({ where: { id } });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
