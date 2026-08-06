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

        const quotation = await prisma.quotation.findFirst({
            where: { id, tenantId },
            include: {
                contact: true,
                items: true,
            },
        });

        if (!quotation) {
            return NextResponse.json(
                { success: false, error: 'Quotation not found' },
                { status: 404 }
            );
        }

        const data = {
            id: quotation.id,
            quotationNumber: quotation.quotationNumber,
            customerName: quotation.contact?.name || '-',
            customerAddress: quotation.contact?.address || '',
            customerEmail: quotation.contact?.email || '',
            contactId: quotation.contactId,
            items: quotation.items.map((item) => ({
                id: item.id,
                name: item.description,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
            })),
            subtotal: quotation.subtotal,
            tax: quotation.taxAmount,
            total: quotation.total,
            currency: 'IDR',
            status: quotation.status.toLowerCase(),
            validUntil: quotation.validUntil.toISOString().split('T')[0],
            createdAt: quotation.createdAt.toISOString(),
            notes: quotation.notes || '',
            terms: quotation.terms || '',
            discount: quotation.discount,
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

        const existing = await prisma.quotation.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Quotation not found' },
                { status: 404 }
            );
        }

        const updateData: Record<string, string | number | boolean | Date | null | undefined> = { ...body };
        delete updateData.id;
        delete updateData.items;

        if (updateData.status && typeof updateData.status === 'string') {
            updateData.status = updateData.status.toUpperCase();
        }
        if (updateData.validUntil) {
            updateData.validUntil = new Date(updateData.validUntil as string);
        }

        if (body.items && body.items.length > 0) {
            await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
            await prisma.quotationItem.createMany({
                data: body.items.map((item: { description: string; quantity: number; unitPrice: number; total?: number }) => ({
                    quotationId: id,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.total || item.quantity * item.unitPrice,
                })),
            });

            const subtotal = body.items.reduce(
                (sum: number, item: { quantity: number; unitPrice: number }) =>
                    sum + item.quantity * item.unitPrice,
                0
            );
            const taxRate = body.taxRate || existing.taxRate;
            const taxAmount = subtotal * (taxRate / 100);
            const discount = body.discount || existing.discount;
            updateData.subtotal = subtotal;
            updateData.taxAmount = taxAmount;
            updateData.total = subtotal + taxAmount - discount;
        }

        const quotation = await prisma.quotation.update({
            where: { id },
            data: updateData,
            include: { items: true, contact: true },
        });

        return NextResponse.json({ success: true, data: quotation });
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

        const existing = await prisma.quotation.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Quotation not found' },
                { status: 404 }
            );
        }

        await prisma.quotation.delete({ where: { id } });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
