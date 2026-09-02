import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { sanitizeInput } from '@/lib/sanitize';
import { logAudit } from '@/lib/audit';
import { updateProductSchema, formatZodError } from '@/lib/validation-schemas';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const product = await prisma.product.findFirst({
            where: { id, tenantId },
            include: {
                category: { select: { id: true, name: true } },
                stockMovements: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!product) {
            return NextResponse.json(
                { success: false, error: 'Produk tidak ditemukan' },
                { status: 404 }
            );
        }

        const data = {
            id: product.id,
            sku: product.sku,
            name: product.name,
            description: product.description || '',
            unit: product.unit,
            price: product.price,
            cost: product.cost,
            stock: product.stock,
            minStock: product.minStock,
            isActive: product.isActive,
            categoryId: product.categoryId,
            categoryName: product.category?.name || null,
            isLowStock: product.stock <= product.minStock,
            stockMovements: product.stockMovements.map((sm) => ({
                id: sm.id,
                type: sm.type,
                quantity: sm.quantity,
                reference: sm.reference || '',
                notes: sm.notes || '',
                createdAt: sm.createdAt.toISOString(),
            })),
            createdAt: product.createdAt.toISOString(),
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
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;
        const body = await request.json();

        const existing = await prisma.product.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Produk tidak ditemukan' },
                { status: 404 }
            );
        }

        const validation = updateProductSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }
        const validatedData = validation.data;

        // Sanitize text inputs
        if (validatedData.name !== undefined) validatedData.name = sanitizeInput(validatedData.name);
        if (validatedData.sku !== undefined) validatedData.sku = sanitizeInput(validatedData.sku);
        if (validatedData.description !== undefined && validatedData.description !== null) validatedData.description = sanitizeInput(validatedData.description);

        const data: Record<string, unknown> = {};
        if (validatedData.sku !== undefined) data.sku = validatedData.sku;
        if (validatedData.name !== undefined) data.name = validatedData.name;
        if (validatedData.description !== undefined) data.description = validatedData.description;
        if (validatedData.unit !== undefined) data.unit = validatedData.unit;
        if (validatedData.price !== undefined) data.price = validatedData.price;
        if (validatedData.cost !== undefined) data.cost = validatedData.cost;
        if (validatedData.stock !== undefined) data.stock = validatedData.stock;
        if (validatedData.minStock !== undefined) data.minStock = validatedData.minStock;
        if (validatedData.categoryId !== undefined) data.categoryId = validatedData.categoryId;
        if (validatedData.isActive !== undefined) data.isActive = validatedData.isActive;

        const product = await prisma.product.update({
            where: { id },
            data,
        });

        // Log audit update
        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Product', entityId: id, newValues: data as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: product });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message.includes('Unique constraint')) {
            return NextResponse.json(
                { success: false, error: 'SKU sudah digunakan oleh produk lain' },
                { status: 409 }
            );
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;

        const existing = await prisma.product.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Produk tidak ditemukan' },
                { status: 404 }
            );
        }

        // Check if product has stock movements
        const movementCount = await prisma.stockMovement.count({
            where: { productId: id },
        });

        if (movementCount > 0) {
            // Soft delete - deactivate instead
            await prisma.product.update({
                where: { id },
                data: { isActive: false },
            });
            // Log audit soft delete
            void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Product', entityId: id, oldValues: { isActive: true } as Record<string, unknown>, newValues: { isActive: false } as Record<string, unknown>, request });
            return NextResponse.json({
                success: true,
                data: null,
                message: 'Produk dinonaktifkan (memiliki riwayat pergerakan stok)',
            });
        }

        await prisma.product.delete({ where: { id } });

        // Log audit delete
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Product', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
