import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { sanitizeObject } from '@/lib/sanitize';
import { createProductSchema, updateProductSchema, formatZodError } from '@/lib/validation-schemas';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';

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

        const allData = products.map((p) => ({
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
        const data = lowStock === 'true' ? allData.filter((p) => p.isLowStock) : allData;

        const filteredTotal = lowStock === 'true' ? data.length : total;

        return NextResponse.json({
            success: true,
            data,
            total: filteredTotal,
            page,
            limit,
            totalPages: Math.ceil(filteredTotal / limit),
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();

        // Sanitize text inputs before validation
        const sanitizedBody = sanitizeObject(body);

        const validation = createProductSchema.safeParse(sanitizedBody);
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
        return handleApiError(error);
    }
}

export async function PUT(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const { id, ...updateData } = sanitizedBody;

        if (!id) {
            return NextResponse.json(
                { success: false, error: MSG.ID_REQUIRED, code: 'ID_REQUIRED' },
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
                { success: false, error: MSG.PRODUCT_NOT_FOUND, code: 'PRODUCT_NOT_FOUND' },
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
        return handleApiError(error);
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

        // Use deleteMany with tenantId filter for defense-in-depth (TOCTOU protection)
        const deleteResult = await prisma.product.deleteMany({ where: { id, tenantId } });
        if (deleteResult.count === 0) {
            return NextResponse.json(
                { success: false, error: 'Product not found or access denied' },
                { status: 404 }
            );
        }

        // Log audit delete
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Product', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
