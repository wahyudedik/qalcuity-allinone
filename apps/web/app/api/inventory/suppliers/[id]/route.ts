import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireMutateAuth } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updateSupplierSchema, formatZodError } from '@/lib/validation-schemas';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { tenantId } = await requireAuth();
        const { id } = params;

        const supplier = await prisma.supplier.findFirst({
            where: { id, tenantId },
            include: {
                _count: { select: { purchaseOrders: true } },
                purchaseOrders: {
                    select: { id: true, poNumber: true, status: true, total: true, orderDate: true },
                    orderBy: { orderDate: 'desc' },
                    take: 5,
                },
            },
        });

        if (!supplier) {
            return NextResponse.json(
                { success: false, error: 'Supplier not found' },
                { status: 404 }
            );
        }

        const data = {
            id: supplier.id,
            name: supplier.name,
            contactPerson: supplier.contactPerson || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || '',
            city: supplier.city || '',
            rating: supplier.rating,
            notes: supplier.notes || '',
            isActive: supplier.isActive,
            totalOrders: supplier._count.purchaseOrders,
            recentOrders: supplier.purchaseOrders.map((po) => ({
                id: po.id,
                poNumber: po.poNumber,
                status: po.status.toLowerCase(),
                total: po.total,
                orderDate: po.orderDate.toISOString().split('T')[0],
            })),
            createdAt: supplier.createdAt.toISOString(),
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

        const validation = updateSupplierSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }
        const validatedData = validation.data;

        const existing = await prisma.supplier.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Supplier tidak ditemukan' },
                { status: 404 }
            );
        }

        const data: Record<string, unknown> = {};
        if (validatedData.name !== undefined) data.name = validatedData.name;
        if (validatedData.contactPerson !== undefined) data.contactPerson = validatedData.contactPerson;
        if (validatedData.email !== undefined) data.email = validatedData.email;
        if (validatedData.phone !== undefined) data.phone = validatedData.phone;
        if (validatedData.address !== undefined) data.address = validatedData.address;
        if (validatedData.city !== undefined) data.city = validatedData.city;
        if (validatedData.rating !== undefined) data.rating = validatedData.rating;
        if (validatedData.notes !== undefined) data.notes = validatedData.notes;
        if (validatedData.isActive !== undefined) data.isActive = validatedData.isActive;

        const updated = await prisma.supplier.update({
            where: { id },
            data,
        });

        // Log audit update
        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Supplier', entityId: id, newValues: data as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: updated });
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

        const existing = await prisma.supplier.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Supplier not found' },
                { status: 404 }
            );
        }

        // Check if supplier has purchase orders
        const poCount = await prisma.purchaseOrder.count({
            where: { supplierId: id },
        });
        if (poCount > 0) {
            await prisma.supplier.update({
                where: { id },
                data: { isActive: false },
            });
            // Log audit soft delete
            void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Supplier', entityId: id, oldValues: { isActive: true } as Record<string, unknown>, newValues: { isActive: false } as Record<string, unknown>, request });
            return NextResponse.json({
                success: true,
                data: null,
                message: 'Supplier deactivated (has existing purchase orders)',
            });
        }

        await prisma.supplier.delete({ where: { id } });

        // Log audit delete
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Supplier', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
