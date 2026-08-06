import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { tenantId } = await requireAuth();
        const { id } = params;

        const payment = await prisma.payment.findFirst({
            where: { id, tenantId },
            include: {
                invoice: {
                    include: {
                        contact: true,
                    },
                },
            },
        });

        if (!payment) {
            return NextResponse.json(
                { success: false, error: 'Payment not found' },
                { status: 404 }
            );
        }

        const data = {
            id: payment.id,
            paymentNumber: payment.paymentNumber,
            invoiceNumber: payment.invoice?.invoiceNumber || '-',
            invoiceId: payment.invoiceId,
            customerName: payment.invoice?.contact?.name || '-',
            amount: payment.amount,
            method: payment.method.toLowerCase().replace('_', '-'),
            bank: '',
            accountNumber: '',
            status: payment.status.toLowerCase(),
            paymentDate: payment.paymentDate.toISOString(),
            reference: payment.reference || '',
            notes: payment.notes || '',
            type: payment.type,
        };

        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { tenantId } = await requireAuth();
        const { id } = params;
        const body = await request.json();

        const existing = await prisma.payment.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Payment not found' },
                { status: 404 }
            );
        }

        const updateData: Record<string, string | number | boolean | Date | null | undefined> = { ...body };
        delete updateData.id;

        if (updateData.status && typeof updateData.status === 'string') {
            updateData.status = updateData.status.toUpperCase();
        }
        if (updateData.method && typeof updateData.method === 'string') {
            updateData.method = updateData.method.toUpperCase().replace('-', '_');
        }
        if (updateData.date) {
            updateData.paymentDate = new Date(updateData.date as string);
            delete updateData.date;
        }

        const payment = await prisma.payment.update({
            where: { id },
            data: updateData,
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

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { tenantId } = await requireAuth();
        const { id } = params;

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
