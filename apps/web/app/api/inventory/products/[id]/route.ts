export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { sanitizeObject } from '@/lib/sanitize';
import { createProductSchema, updateProductSchema, formatZodError } from '@/lib/validation-schemas';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { optimisticUpdateRaw } from '@/lib/optimistic-lock';

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
            version: p.version,
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
        logger.error('[API Error] GET /api/inventory/products:', error);
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
        const { id, version, ...updateData } = sanitizedBody;

        if (!id) {
            return NextResponse.json(
                { success: false, error: MSG.ID_REQUIRED, code: 'ID_REQUIRED' },
                { status: 400 }
            );
        }

        if (version === undefined || version === null) {
            return NextResponse.json(
                { success: false, error: 'Version is required for concurrent update safety', code: 'VERSION_REQUIRED' },
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

        // Build SET clauses for optimistic update
        const setClauses: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 4; // $1=id, $2=tenantId, $3=version, $4+=values

        if (validatedData.sku !== undefined) { setClauses.push(`sku = $${paramIndex}`); values.push(validatedData.sku); paramIndex++; }
        if (validatedData.name !== undefined) { setClauses.push(`name = $${paramIndex}`); values.push(validatedData.name); paramIndex++; }
        if (validatedData.description !== undefined) { setClauses.push(`description = $${paramIndex}`); values.push(validatedData.description); paramIndex++; }
        if (validatedData.unit !== undefined) { setClauses.push(`unit = $${paramIndex}`); values.push(validatedData.unit); paramIndex++; }
        if (validatedData.price !== undefined) { setClauses.push(`price = $${paramIndex}`); values.push(validatedData.price); paramIndex++; }
        if (validatedData.cost !== undefined) { setClauses.push(`cost = $${paramIndex}`); values.push(validatedData.cost); paramIndex++; }
        if (validatedData.stock !== undefined) { setClauses.push(`stock = $${paramIndex}`); values.push(validatedData.stock); paramIndex++; }
        if (validatedData.minStock !== undefined) { setClauses.push(`"minStock" = $${paramIndex}`); values.push(validatedData.minStock); paramIndex++; }
        if (validatedData.categoryId !== undefined) { setClauses.push(`"categoryId" = $${paramIndex}`); values.push(validatedData.categoryId); paramIndex++; }
        if (validatedData.isActive !== undefined) { setClauses.push(`"isActive" = $${paramIndex}`); values.push(validatedData.isActive); paramIndex++; }

        if (setClauses.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No fields to update', code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        await optimisticUpdateRaw('Product', id, tenantId, version as number, setClauses.join(', '), values);

        const product = await prisma.product.findUnique({ where: { id } });

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
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Product', entityId: id, oldValues: toAuditPayload(existing), request });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
