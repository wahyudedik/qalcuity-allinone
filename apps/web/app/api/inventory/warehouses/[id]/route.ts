import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updateWarehouseSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const warehouse = await prisma.warehouse.findFirst({
            where: { id: params.id, tenantId: auth.tenantId },
            include: {
                products: {
                    select: { id: true, name: true, sku: true, stock: true, unit: true },
                    take: 50,
                },
                _count: { select: { products: true, stockOpnames: true } },
            },
        });

        if (!warehouse) {
            return NextResponse.json({ success: false, error: 'Gudang tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: warehouse });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();

        const validation = updateWarehouseSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }
        const validatedData = validation.data;

        const existing = await prisma.warehouse.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Gudang tidak ditemukan' }, { status: 404 });
        }

        // If isDefault, unset other defaults
        if (validatedData.isDefault) {
            await prisma.warehouse.updateMany({
                where: { tenantId, isDefault: true, id: { not: params.id } },
                data: { isDefault: false },
            });
        }

        const warehouse = await prisma.warehouse.update({
            where: { id: params.id },
            data: {
                ...(validatedData.name !== undefined && { name: validatedData.name }),
                ...(validatedData.code !== undefined && { code: validatedData.code }),
                ...(validatedData.address !== undefined && { address: validatedData.address }),
                ...(validatedData.city !== undefined && { city: validatedData.city }),
                ...(validatedData.phone !== undefined && { phone: validatedData.phone }),
                ...(validatedData.email !== undefined && { email: validatedData.email }),
                ...(validatedData.manager !== undefined && { manager: validatedData.manager }),
                ...(validatedData.isDefault !== undefined && { isDefault: validatedData.isDefault }),
                ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
            },
        });

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Warehouse', entityId: warehouse.id, newValues: { name: warehouse.name } as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: warehouse });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        const existing = await prisma.warehouse.findFirst({
            where: { id: params.id, tenantId },
            include: { _count: { select: { products: true } } },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Gudang tidak ditemukan' }, { status: 404 });
        }

        if (existing._count.products > 0) {
            return NextResponse.json(
                { success: false, error: 'Gudang tidak bisa dihapus karena masih memiliki produk' },
                { status: 400 }
            );
        }

        if (existing.isDefault) {
            return NextResponse.json(
                { success: false, error: 'Gudang default tidak bisa dihapus' },
                { status: 400 }
            );
        }

        await prisma.warehouse.delete({ where: { id: params.id } });

        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Warehouse', entityId: params.id, newValues: { name: existing.name } as Record<string, unknown>, request });

        return NextResponse.json({ success: true, message: 'Gudang berhasil dihapus' });
    } catch (error) {
        return handleApiError(error);
    }
}
