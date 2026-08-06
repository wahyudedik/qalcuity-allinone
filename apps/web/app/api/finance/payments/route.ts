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
        const { tenantId } = await requireAuth();
        const body = await request.json();

        if (!body.amount || !body.method) {
            return NextResponse.json(
                { success: false, error: 'Amount and method are required' },
                { status: 400 }
            );
        }

        const count = await prisma.payment.count({ where: { tenantId } });
        const paymentNumber = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

        const payment = await prisma.payment.create({
            data: {
                paymentNumber,
                amount: parseFloat(body.amount),
                paymentDate: body.date ? new Date(body.date) : new Date(),
                method: (body.method || 'BANK_TRANSFER').toUpperCase().replace('-', '_'),
                status: 'PENDING',
                type: (body.type || 'INCOME').toUpperCase(),
                reference: body.reference || '',
                notes: body.notes || '',
                invoiceId: body.invoiceId || undefined,
                tenantId,
            },
            include: {
                invoice: {
                    select: { invoiceNumber: true, contact: { select: { name: true } } },
                },
            },
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

        if (updateData.status) {
            updateData.status = updateData.status.toUpperCase();
        }
        if (updateData.method) {
            updateData.method = updateData.method.toUpperCase().replace('-', '_');
        }
        if (updateData.date) {
            updateData.paymentDate = new Date(updateData.date);
            delete updateData.date;
        }

        const payment = await prisma.payment.update({
            where: { id },
            data: updateData,
            include: {
                invoice: {
                    select: { invoiceNumber: true, contact: { select: { name: true } } },
                },
            },
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
