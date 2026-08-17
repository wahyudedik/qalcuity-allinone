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
        const { tenantId } = await requireAuth();
        const { id } = params;
        const body = await request.json();

        const existing = await prisma.supplier.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Supplier not found' },
                { status: 404 }
            );
        }

        const data: Record<string, unknown> = {};
        if (typeof body.name === 'string') data.name = body.name;
        if (typeof body.contactPerson === 'string') data.contactPerson = body.contactPerson;
        if (typeof body.email === 'string') data.email = body.email;
        if (typeof body.phone === 'string') data.phone = body.phone;
        if (typeof body.address === 'string') data.address = body.address;
        if (typeof body.city === 'string') data.city = body.city;
        if (typeof body.rating === 'number') data.rating = body.rating;
        if (typeof body.notes === 'string') data.notes = body.notes;
        if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

        const updated = await prisma.supplier.update({
            where: { id },
            data,
        });

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
        const { tenantId } = await requireAuth();
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
            return NextResponse.json({
                success: true,
                data: null,
                message: 'Supplier deactivated (has existing purchase orders)',
            });
        }

        await prisma.supplier.delete({ where: { id } });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
