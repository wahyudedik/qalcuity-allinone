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

        const po = await prisma.purchaseOrder.findFirst({
            where: { id, tenantId },
            include: {
                supplier: true,
                items: true,
            },
        });

        if (!po) {
            return NextResponse.json(
                { success: false, error: 'Purchase Order not found' },
                { status: 404 }
            );
        }

        const data = {
            id: po.id,
            poNumber: po.poNumber,
            supplierName: po.supplier?.name || '-',
            supplierAddress: po.supplier?.address || '',
            supplierEmail: po.supplier?.email || '',
            supplierId: po.supplierId,
            items: po.items.map((item) => ({
                id: item.id,
                name: item.description,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
            })),
            subtotal: po.subtotal,
            tax: po.taxAmount,
            total: po.total,
            currency: 'IDR',
            status: po.status.toLowerCase(),
            expectedDelivery: po.deliveryDate?.toISOString().split('T')[0] || null,
            createdAt: po.createdAt.toISOString(),
            notes: po.notes || '',
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

        const existing = await prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Purchase Order not found' },
                { status: 404 }
            );
        }

        const updateData: Record<string, unknown> = { ...body };
        delete updateData.id;
        delete updateData.items;

        if (typeof updateData.status === 'string') {
            updateData.status = updateData.status.toUpperCase();
        }
        if (updateData.expectedDelivery) {
            updateData.deliveryDate = new Date(String(updateData.expectedDelivery));
            delete updateData.expectedDelivery;
        }

        if (body.items && body.items.length > 0) {
            await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
            await prisma.purchaseOrderItem.createMany({
                data: body.items.map((item: { description: string; quantity: number; unitPrice: number; total?: number }) => ({
                    purchaseOrderId: id,
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
            updateData.subtotal = subtotal;
            updateData.taxAmount = taxAmount;
            updateData.total = subtotal + taxAmount;
        }

        const po = await prisma.purchaseOrder.update({
            where: { id },
            data: updateData,
            include: { items: true, supplier: true },
        });

        return NextResponse.json({ success: true, data: po });
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

        const existing = await prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Purchase Order not found' },
                { status: 404 }
            );
        }

        await prisma.purchaseOrder.delete({ where: { id } });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
