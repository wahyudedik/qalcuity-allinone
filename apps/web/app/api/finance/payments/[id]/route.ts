import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireMutateAuth } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updatePaymentSchema, formatZodError } from '@/lib/validation-schemas';

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
        const { userId, tenantId } = await requireMutateAuth();
        const { id } = params;
        const body = await request.json();

        const validation = updatePaymentSchema.safeParse(body);
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

        const updateData: Record<string, string | number | boolean | Date | null | undefined> = {};
        if (validatedData.status) {
            updateData.status = validatedData.status.toUpperCase();
        }
        if (validatedData.method) {
            updateData.method = validatedData.method.toUpperCase().replace('-', '_');
        }
        if (validatedData.amount !== undefined) {
            updateData.amount = validatedData.amount;
        }
        if (validatedData.type) {
            updateData.type = validatedData.type.toUpperCase();
        }
        if (validatedData.reference !== undefined) {
            updateData.reference = validatedData.reference;
        }
        if (validatedData.notes !== undefined) {
            updateData.notes = validatedData.notes;
        }
        if (validatedData.date !== undefined) {
            updateData.paymentDate = validatedData.date ? new Date(validatedData.date) : null;
        }

        const payment = await prisma.payment.update({
            where: { id },
            data: updateData,
        });

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Payment', entityId: id, newValues: updateData as Record<string, unknown>, request });

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
        const { userId, tenantId } = await requireMutateAuth();
        const { id } = params;

        const existing = await prisma.payment.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Payment not found' },
                { status: 404 }
            );
        }

        await prisma.payment.delete({ where: { id } });

        // Audit logging non-blocking
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
