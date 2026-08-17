import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET(request: Request) {
    try {
        const { tenantId } = await requireAuth();
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const isActive = searchParams.get('isActive');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (isActive !== null && isActive !== undefined && isActive !== '') {
            where.isActive = isActive === 'true';
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { contactPerson: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } },
                { city: { contains: search } },
            ];
        }

        const [suppliers, total] = await Promise.all([
            prisma.supplier.findMany({
                where,
                include: {
                    _count: { select: { purchaseOrders: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.supplier.count({ where }),
        ]);

        const data = suppliers.map((s) => ({
            id: s.id,
            name: s.name,
            contactPerson: s.contactPerson || '',
            email: s.email || '',
            phone: s.phone || '',
            address: s.address || '',
            city: s.city || '',
            rating: s.rating,
            notes: s.notes || '',
            isActive: s.isActive,
            totalOrders: s._count.purchaseOrders,
            createdAt: s.createdAt.toISOString(),
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

        if (!body.name) {
            return NextResponse.json(
                { success: false, error: 'Name is required' },
                { status: 400 }
            );
        }

        const supplier = await prisma.supplier.create({
            data: {
                tenantId,
                name: body.name,
                contactPerson: body.contactPerson || null,
                email: body.email || null,
                phone: body.phone || null,
                address: body.address || null,
                city: body.city || null,
                rating: body.rating || 0,
                notes: body.notes || null,
            },
        });

        return NextResponse.json({ success: true, data: supplier }, { status: 201 });
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
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

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
        if (typeof updateData.name === 'string') data.name = updateData.name;
        if (typeof updateData.contactPerson === 'string') data.contactPerson = updateData.contactPerson;
        if (typeof updateData.email === 'string') data.email = updateData.email;
        if (typeof updateData.phone === 'string') data.phone = updateData.phone;
        if (typeof updateData.address === 'string') data.address = updateData.address;
        if (typeof updateData.city === 'string') data.city = updateData.city;
        if (typeof updateData.rating === 'number') data.rating = updateData.rating;
        if (typeof updateData.notes === 'string') data.notes = updateData.notes;
        if (typeof updateData.isActive === 'boolean') data.isActive = updateData.isActive;

        const supplier = await prisma.supplier.update({
            where: { id },
            data,
        });

        return NextResponse.json({ success: true, data: supplier });
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
            // Soft delete - deactivate instead
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
