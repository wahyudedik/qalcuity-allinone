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

        const invoice = await prisma.invoice.findFirst({
            where: { id, tenantId },
            include: {
                contact: true,
                items: true,
                payments: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!invoice) {
            return NextResponse.json(
                { success: false, error: 'Invoice not found' },
                { status: 404 }
            );
        }

        // Map to frontend-compatible format
        const data = {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.contact?.name || '-',
            customerAddress: invoice.contact?.address || '',
            customerEmail: invoice.contact?.email || '',
            customerPhone: invoice.contact?.phone || '',
            contactId: invoice.contactId,
            items: invoice.items.map((item) => ({
                id: item.id,
                name: item.description,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
            })),
            subtotal: invoice.subtotal,
            tax: invoice.taxAmount,
            total: invoice.total,
            currency: 'IDR',
            status: invoice.status.toLowerCase(),
            dueDate: invoice.dueDate.toISOString().split('T')[0],
            createdAt: invoice.createdAt.toISOString(),
            notes: invoice.notes || '',
            payments: invoice.payments.map((p) => ({
                id: p.id,
                paymentNumber: p.paymentNumber,
                amount: p.amount,
                method: p.method,
                status: p.status.toLowerCase(),
                date: p.paymentDate.toISOString(),
                reference: p.reference,
                notes: p.notes,
            })),
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

        const existing = await prisma.invoice.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Invoice not found' },
                { status: 404 }
            );
        }

        const updateData: Record<string, unknown> = { ...body };
        delete updateData.id;
        delete updateData.items;

        if (updateData.status && typeof updateData.status === 'string') {
            updateData.status = updateData.status.toUpperCase();
        }
        if (updateData.dueDate) {
            updateData.dueDate = new Date(updateData.dueDate as string | number);
        }

        // Handle items update if provided — use transaction for atomicity
        if (body.items && body.items.length > 0) {
            // Recalculate totals
            const subtotal = body.items.reduce(
                (sum: number, item: { quantity: number; unitPrice: number }) =>
                    sum + item.quantity * item.unitPrice,
                0
            );
            const taxRate = body.taxRate || existing.taxRate;
            const taxAmount = subtotal * (taxRate / 100);
            updateData.subtotal = subtotal;
            updateData.taxAmount = taxAmount;
            updateData.total = subtotal + taxAmount;

            // Delete old items and create new ones in transaction
            await prisma.$transaction(async (tx) => {
                await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
                await tx.invoiceItem.createMany({
                    data: body.items.map((item: { description: string; quantity: number; unitPrice: number; total?: number }) => ({
                        invoiceId: id,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        total: item.total || item.quantity * item.unitPrice,
                    })),
                });
            });
        }

        const invoice = await prisma.invoice.update({
            where: { id },
            data: updateData,
            include: { items: true, contact: true },
        });

        return NextResponse.json({ success: true, data: invoice });
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

        const existing = await prisma.invoice.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Invoice not found' },
                { status: 404 }
            );
        }

        await prisma.invoice.delete({ where: { id } });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
