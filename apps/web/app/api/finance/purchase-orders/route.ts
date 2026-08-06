import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET(request: Request) {
    try {
        const { tenantId } = await requireAuth();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (status) {
            where.status = status.toUpperCase();
        }

        if (search) {
            where.OR = [
                { poNumber: { contains: search } },
                { supplier: { name: { contains: search } } },
            ];
        }

        const [purchaseOrders, total] = await Promise.all([
            prisma.purchaseOrder.findMany({
                where,
                include: {
                    supplier: { select: { id: true, name: true, email: true, phone: true } },
                    items: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.purchaseOrder.count({ where }),
        ]);

        const data = purchaseOrders.map((po) => ({
            id: po.id,
            poNumber: po.poNumber,
            supplierName: po.supplier?.name || '-',
            supplierId: po.supplierId,
            subtotal: po.subtotal,
            tax: po.taxAmount,
            total: po.total,
            currency: 'IDR',
            status: po.status.toLowerCase(),
            expectedDelivery: po.deliveryDate?.toISOString().split('T')[0] || null,
            createdAt: po.createdAt.toISOString(),
            notes: po.notes || '',
            items: po.items.map((item) => ({
                id: item.id,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
            })),
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

        if (!body.supplierId && !body.supplierName) {
            return NextResponse.json(
                { success: false, error: 'Supplier is required' },
                { status: 400 }
            );
        }

        if (!body.items || body.items.length === 0) {
            return NextResponse.json(
                { success: false, error: 'At least one item is required' },
                { status: 400 }
            );
        }

        const count = await prisma.purchaseOrder.count({ where: { tenantId } });
        const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

        const subtotal = body.items.reduce(
            (sum: number, item: { quantity: number; unitPrice: number }) =>
                sum + item.quantity * item.unitPrice,
            0
        );
        const taxRate = body.taxRate || 11;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;

        let supplierId = body.supplierId;
        if (!supplierId && body.supplierName) {
            const supplier = await prisma.supplier.create({
                data: {
                    name: body.supplierName,
                    email: body.supplierEmail || undefined,
                    phone: body.supplierPhone || undefined,
                    address: body.supplierAddress || undefined,
                    tenantId,
                },
            });
            supplierId = supplier.id;
        }

        const purchaseOrder = await prisma.purchaseOrder.create({
            data: {
                poNumber,
                status: 'DRAFT',
                orderDate: new Date(),
                deliveryDate: body.expectedDelivery ? new Date(body.expectedDelivery) : undefined,
                notes: body.notes || '',
                subtotal,
                taxRate,
                taxAmount,
                total,
                tenantId,
                supplierId,
                items: {
                    create: body.items.map((item: { description: string; quantity: number; unitPrice: number; total?: number }) => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        total: item.total || item.quantity * item.unitPrice,
                    })),
                },
            },
            include: { items: true, supplier: true },
        });

        return NextResponse.json({ success: true, data: purchaseOrder }, { status: 201 });
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
        const { id, items, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const existing = await prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Purchase Order not found' },
                { status: 404 }
            );
        }

        if (updateData.status) {
            updateData.status = updateData.status.toUpperCase();
        }
        if (updateData.expectedDelivery) {
            updateData.deliveryDate = new Date(updateData.expectedDelivery);
            delete updateData.expectedDelivery;
        }

        if (items && items.length > 0) {
            const subtotal = items.reduce(
                (sum: number, item: { quantity: number; unitPrice: number }) =>
                    sum + item.quantity * item.unitPrice,
                0
            );
            const taxRate = updateData.taxRate || existing.taxRate;
            const taxAmount = subtotal * (taxRate / 100);
            updateData.subtotal = subtotal;
            updateData.taxAmount = taxAmount;
            updateData.total = subtotal + taxAmount;

            await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
            await prisma.purchaseOrderItem.createMany({
                data: items.map((item: { description: string; quantity: number; unitPrice: number; total?: number }) => ({
                    purchaseOrderId: id,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.total || item.quantity * item.unitPrice,
                })),
            });
        }

        const purchaseOrder = await prisma.purchaseOrder.update({
            where: { id },
            data: updateData,
            include: { items: true, supplier: true },
        });

        return NextResponse.json({ success: true, data: purchaseOrder });
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
