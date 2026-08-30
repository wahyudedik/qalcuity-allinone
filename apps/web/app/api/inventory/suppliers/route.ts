import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireMutateAuth } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { createSupplierSchema, updateSupplierSchema, formatZodError } from '@/lib/validation-schemas';

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

        const data = suppliers.map((s: any) => ({
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
        const { userId, tenantId } = await requireMutateAuth();
        const body = await request.json();

        const validation = createSupplierSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }
        const validatedData = validation.data;

        const supplier = await prisma.supplier.create({
            data: {
                tenantId,
                name: validatedData.name,
                contactPerson: validatedData.contactPerson || null,
                email: validatedData.email || null,
                phone: validatedData.phone || null,
                address: validatedData.address || null,
                city: validatedData.city || null,
                rating: validatedData.rating || 0,
                notes: validatedData.notes || null,
            },
        });

        // Log audit create
        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'Supplier', entityId: supplier.id, newValues: { name: supplier.name } as Record<string, unknown>, request });

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
        const { userId, tenantId } = await requireMutateAuth();
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID harus diisi' },
                { status: 400 }
            );
        }

        const validation = updateSupplierSchema.safeParse(updateData);
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

        const supplier = await prisma.supplier.update({
            where: { id },
            data,
        });

        // Log audit update
        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Supplier', entityId: id, newValues: data as Record<string, unknown>, request });

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
        const { userId, tenantId } = await requireMutateAuth();
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
