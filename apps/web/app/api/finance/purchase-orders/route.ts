import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireMutateAuth } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { createPurchaseOrderSchema, updatePurchaseOrderSchema, formatZodError } from '@/lib/validation-schemas';

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

        const data = purchaseOrders.map((po: any) => ({
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
            items: po.items.map((item: any) => ({
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
        const { userId, tenantId } = await requireMutateAuth();
        const body = await request.json();

        const validation = createPurchaseOrderSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const count = await prisma.purchaseOrder.count({ where: { tenantId } });
        const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

        const subtotal = validatedData.items.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
        );
        const taxRate = validatedData.taxRate || 11;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;

        let supplierId = validatedData.supplierId;
        if (!supplierId && validatedData.supplierName) {
            const supplier = await prisma.supplier.create({
                data: {
                    name: validatedData.supplierName,
                    email: validatedData.supplierEmail || undefined,
                    phone: validatedData.supplierPhone || undefined,
                    address: validatedData.supplierAddress || undefined,
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
                deliveryDate: validatedData.expectedDelivery ? new Date(validatedData.expectedDelivery) : undefined,
                notes: validatedData.notes || '',
                subtotal,
                taxRate,
                taxAmount,
                total,
                tenantId,
                supplierId,
                items: {
                    create: validatedData.items.map((item: any) => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        total: item.total || item.quantity * item.unitPrice,
                    })),
                },
            },
            include: { items: true, supplier: true },
        });

        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'PurchaseOrder', entityId: purchaseOrder.id, newValues: { poNumber: purchaseOrder.poNumber, total: purchaseOrder.total, status: purchaseOrder.status } as Record<string, unknown>, request });

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
        const { userId, tenantId } = await requireMutateAuth();
        const body = await request.json();
        const { id, items, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID wajib diisi' },
                { status: 400 }
            );
        }

        const validation = updatePurchaseOrderSchema.safeParse({ ...updateData, items });
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

        const data: Record<string, unknown> = {};
        if (validatedData.status) {
            data.status = validatedData.status.toUpperCase();
        }
        if (validatedData.expectedDelivery !== undefined) {
            data.deliveryDate = validatedData.expectedDelivery ? new Date(validatedData.expectedDelivery) : null;
        }
        if (validatedData.taxRate !== undefined) {
            data.taxRate = validatedData.taxRate;
        }
        if (validatedData.notes !== undefined) {
            data.notes = validatedData.notes;
        }

        if (validatedData.items && validatedData.items.length > 0) {
            const subtotal = validatedData.items.reduce(
                (sum, item) => sum + item.quantity * item.unitPrice,
                0
            );
            const taxRate = Number(validatedData.taxRate || existing.taxRate);
            const taxAmount = subtotal * (taxRate / 100);
            data.subtotal = subtotal;
            data.taxAmount = taxAmount;
            data.total = subtotal + taxAmount;

            await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
            await prisma.purchaseOrderItem.createMany({
                data: validatedData.items.map((item: any) => ({
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
            data,
            include: { items: true, supplier: true },
        });

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'PurchaseOrder', entityId: id, newValues: data as Record<string, unknown>, request });

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
        const { userId, tenantId } = await requireMutateAuth();
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
