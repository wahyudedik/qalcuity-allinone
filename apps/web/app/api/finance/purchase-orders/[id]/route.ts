import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireMutateAuth } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updatePurchaseOrderSchema, formatZodError } from '@/lib/validation-schemas';

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
        const { userId, tenantId } = await requireMutateAuth();
        const { id } = params;
        const body = await request.json();

        const { items, ...restBody } = body;
        const validation = updatePurchaseOrderSchema.safeParse({ ...restBody, items });
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const existing = await prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Purchase Order tidak ditemukan' },
                { status: 404 }
            );
        }

        const updateData: Record<string, unknown> = {};
        if (validatedData.status) {
            updateData.status = validatedData.status.toUpperCase();
        }
        if (validatedData.expectedDelivery !== undefined) {
            updateData.deliveryDate = validatedData.expectedDelivery ? new Date(validatedData.expectedDelivery) : null;
        }
        if (validatedData.taxRate !== undefined) {
            updateData.taxRate = validatedData.taxRate;
        }
        if (validatedData.notes !== undefined) {
            updateData.notes = validatedData.notes;
        }

        if (validatedData.items && validatedData.items.length > 0) {
            await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
            await prisma.purchaseOrderItem.createMany({
                data: validatedData.items.map((item) => ({
                    purchaseOrderId: id,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.total || item.quantity * item.unitPrice,
                })),
            });

            const subtotal = validatedData.items.reduce(
                (sum, item) => sum + item.quantity * item.unitPrice,
                0
            );
            const taxRate = Number(validatedData.taxRate || existing.taxRate);
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

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'PurchaseOrder', entityId: id, newValues: updateData as Record<string, unknown>, request });

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
        const { userId, tenantId } = await requireMutateAuth();
        const { id } = params;

        const existing = await prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Purchase Order not found' },
                { status: 404 }
            );
        }

        await prisma.purchaseOrder.delete({ where: { id } });

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'PurchaseOrder', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
