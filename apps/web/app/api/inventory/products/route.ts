import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { createProductSchema, updateProductSchema, formatZodError } from '@/lib/validation-schemas';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const lowStock = searchParams.get('lowStock');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId: auth.tenantId };

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { sku: { contains: search } },
                { description: { contains: search } },
            ];
        }

        if (category) {
            where.categoryId = category;
        }

        if (lowStock === 'true') {
            // Filter products where stock <= minStock using raw comparison
            // Prisma doesn't support field-to-field comparison directly
            // We'll filter in post-processing below
        }

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    category: { select: { id: true, name: true } },
                    _count: { select: { stockMovements: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.product.count({ where }),
        ]);

        const allData = products.map((p: any) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            description: p.description,
            unit: p.unit,
            price: p.price,
            cost: p.cost,
            stock: p.stock,
            minStock: p.minStock,
            isActive: p.isActive,
            categoryId: p.categoryId,
            categoryName: p.category?.name || null,
            isLowStock: p.stock <= p.minStock,
            createdAt: p.createdAt.toISOString(),
        }));

        // Post-process: filter lowStock in memory (Prisma can't compare fields)
        const data = lowStock === 'true' ? allData.filter((p: any) => p.isLowStock) : allData;

        return NextResponse.json({
            success: true,
            data,
            total: lowStock === 'true' ? data.length : total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();

        const validation = createProductSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }
        const validatedData = validation.data;

        const product = await prisma.product.create({
            data: {
                tenantId,
                sku: validatedData.sku,
                name: validatedData.name,
                description: validatedData.description || null,
                unit: validatedData.unit || 'pcs',
                price: validatedData.price || 0,
                cost: validatedData.cost || 0,
                stock: validatedData.stock || 0,
                minStock: validatedData.minStock || 0,
                categoryId: validatedData.categoryId || null,
            },
        });

        // Log audit create
        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'Product', entityId: product.id, newValues: { sku: product.sku, name: product.name } as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: product }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body';
        if (message.includes('Unique constraint')) {
            return NextResponse.json(
                { success: false, error: 'SKU already exists' },
                { status: 409 }
            );
        }
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}

export async function PUT(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID harus diisi' },
                { status: 400 }
            );
        }

        const validation = updateProductSchema.safeParse(updateData);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }
        const validatedData = validation.data;

        const existing = await prisma.product.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Produk tidak ditemukan' },
                { status: 404 }
            );
        }

        const product = await prisma.product.update({
            where: { id },
            data: {
                ...(validatedData.sku !== undefined && { sku: validatedData.sku }),
                ...(validatedData.name !== undefined && { name: validatedData.name }),
                ...(validatedData.description !== undefined && { description: validatedData.description }),
                ...(validatedData.unit !== undefined && { unit: validatedData.unit }),
                ...(validatedData.price !== undefined && { price: validatedData.price }),
                ...(validatedData.cost !== undefined && { cost: validatedData.cost }),
                ...(validatedData.stock !== undefined && { stock: validatedData.stock }),
                ...(validatedData.minStock !== undefined && { minStock: validatedData.minStock }),
                ...(validatedData.categoryId !== undefined && { categoryId: validatedData.categoryId }),
                ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
            },
        });

        // Log audit update
        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Product', entityId: id, newValues: updateData as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: product });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body';
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}

export async function DELETE(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const existing = await prisma.product.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Product not found' },
                { status: 404 }
            );
        }

        await prisma.product.delete({ where: { id } });

        // Log audit delete
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Product', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
