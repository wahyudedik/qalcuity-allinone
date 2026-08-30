import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireMutateAuth } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createPaymentSchema, updatePaymentSchema, formatZodError } from '@/lib/validation-schemas';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:payments:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

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
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:payments:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const { userId, tenantId } = await requireMutateAuth();
        const body = await request.json();

        const validation = createPaymentSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;
        const amount = validatedData.amount;
        const status = (validatedData.status || 'PENDING').toUpperCase();

        const payment = await prisma.$transaction(async (tx: any) => {
            const count = await tx.payment.count({ where: { tenantId } });
            const paymentNumber = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

            const newPayment = await tx.payment.create({
                data: {
                    paymentNumber,
                    amount,
                    paymentDate: validatedData.date ? new Date(validatedData.date) : new Date(),
                    method: validatedData.method.toUpperCase().replace('-', '_'),
                    status,
                    type: (validatedData.type || 'INCOME').toUpperCase(),
                    reference: validatedData.reference || '',
                    notes: validatedData.notes || '',
                    invoiceId: validatedData.invoiceId || undefined,
                    tenantId,
                },
                include: {
                    invoice: {
                        select: { invoiceNumber: true, total: true, contact: { select: { name: true } } },
                    },
                },
            });

            // Update invoice status if payment is linked to an invoice and is COMPLETED
            if (validatedData.invoiceId && status === 'COMPLETED') {
                const invoice = await tx.invoice.findUnique({
                    where: { id: validatedData.invoiceId },
                    include: { payments: { where: { status: 'COMPLETED' } } },
                });

                if (invoice) {
                    const totalPaid = invoice.payments.reduce((sum: number, p: { amount: unknown }) => sum + Number(p.amount), 0) + Number(amount);
                    const newInvoiceStatus = Number(totalPaid) >= Number(invoice.total) ? 'PAID' : invoice.status;
                    await tx.invoice.update({
                        where: { id: validatedData.invoiceId },
                        data: { status: newInvoiceStatus },
                    });
                }
            }

            return newPayment;
        });

        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'Payment', entityId: payment.id, newValues: payment as unknown as Record<string, unknown>, request });

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
        const { userId, tenantId } = await requireMutateAuth();
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID wajib diisi' },
                { status: 400 }
            );
        }

        const validation = updatePaymentSchema.safeParse(updateData);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const existing = await prisma.payment.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Payment tidak ditemukan' },
                { status: 404 }
            );
        }

        // Build safe update data
        const data: Record<string, unknown> = {};
        if (validatedData.status) {
            data.status = validatedData.status.toUpperCase();
        }
        if (validatedData.method) {
            data.method = validatedData.method.toUpperCase().replace('-', '_');
        }
        if (validatedData.amount !== undefined) {
            data.amount = validatedData.amount;
        }
        if (validatedData.type) {
            data.type = validatedData.type.toUpperCase();
        }
        if (validatedData.reference !== undefined) {
            data.reference = validatedData.reference;
        }
        if (validatedData.notes !== undefined) {
            data.notes = validatedData.notes;
        }
        if (validatedData.date !== undefined) {
            data.paymentDate = validatedData.date ? new Date(validatedData.date) : null;
        }

        const payment = await prisma.$transaction(async (tx: any) => {
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
                        .filter((p: { id: string; status: string }) => p.id !== id && p.status === 'COMPLETED')
                        .reduce((sum: number, p: { amount: unknown }) => sum + Number(p.amount), 0) + (data.status === 'COMPLETED' ? Number(updated.amount) : 0);
                    const newInvoiceStatus = Number(totalPaid) >= Number(invoice.total) ? 'PAID' : 'SENT';
                    await tx.invoice.update({
                        where: { id: updated.invoiceId },
                        data: { status: newInvoiceStatus },
                    });
                }
            }

            return updated;
        });

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Payment', entityId: id, newValues: data as Record<string, unknown>, request });

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
        const { userId, tenantId } = await requireMutateAuth();
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

        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Payment', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
