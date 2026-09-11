export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { updateProductSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';
import { MSG } from '@/lib/api-messages';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:products:GET:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const product = await prisma.product.findFirst({
            where: { id: params.id, tenantId },
            include: {
                category: { select: { id: true, name: true } },
                warehouse: { select: { id: true, name: true } },
            },
        });

        if (!product) {
            return NextResponse.json(
                { success: false, error: MSG.PRODUCT_NOT_FOUND },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                id: product.id,
                sku: product.sku,
                name: product.name,
                description: product.description,
                unit: product.unit,
                price: Number(product.price),
                cost: Number(product.cost),
                stock: product.stock,
                minStock: product.minStock,
                isActive: product.isActive,
                preparationMinutes: product.preparationMinutes,
                isPreparedItem: product.isPreparedItem,
                categoryId: product.category?.id || null,
                categoryName: product.category?.name || null,
                warehouseId: product.warehouse?.id || null,
                warehouseName: product.warehouse?.name || null,
                createdAt: product.createdAt.toISOString(),
                updatedAt: product.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:products:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId, role } = auth;

        // Only ADMIN+ can update products
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: MSG.PRODUCT_ADMIN_ONLY_UPDATE },
                { status: 403 }
            );
        }

        // Check product exists
        const existingProduct = await prisma.product.findFirst({
            where: { id: params.id, tenantId },
        });
        if (!existingProduct) {
            return NextResponse.json(
                { success: false, error: MSG.PRODUCT_NOT_FOUND },
                { status: 404 }
            );
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = updateProductSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Check for duplicate SKU within tenant (excluding current product)
        if (validatedData.sku) {
            const duplicateSku = await prisma.product.findFirst({
                where: {
                    tenantId,
                    sku: validatedData.sku,
                    id: { not: params.id },
                },
            });
            if (duplicateSku) {
                return NextResponse.json(
                    { success: false, error: MSG.PRODUCT_SKU_DUPLICATE },
                    { status: 400 }
                );
            }
        }

        const product = await prisma.product.update({
            where: { id: params.id },
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
            include: {
                category: { select: { id: true, name: true } },
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'Product',
            entityId: product.id,
            newValues: validatedData,
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: product.id,
                sku: product.sku,
                name: product.name,
                description: product.description,
                unit: product.unit,
                price: Number(product.price),
                cost: Number(product.cost),
                stock: product.stock,
                minStock: product.minStock,
                isActive: product.isActive,
                categoryId: product.category?.id || null,
                categoryName: product.category?.name || null,
                createdAt: product.createdAt.toISOString(),
                updatedAt: product.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:products:DELETE:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId, role } = auth;

        // Only ADMIN+ can delete products
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: MSG.PRODUCT_ADMIN_ONLY_DELETE },
                { status: 403 }
            );
        }

        // Check product exists
        const existingProduct = await prisma.product.findFirst({
            where: { id: params.id, tenantId },
        });
        if (!existingProduct) {
            return NextResponse.json(
                { success: false, error: MSG.PRODUCT_NOT_FOUND },
                { status: 404 }
            );
        }

        // Soft delete — set isActive = false and deletedAt
        await prisma.product.update({
            where: { id: params.id },
            data: {
                isActive: false,
                deletedAt: new Date(),
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'Product',
            entityId: params.id,
            newValues: { sku: existingProduct.sku, name: existingProduct.name },
            request,
        });

        return NextResponse.json({
            success: true,
            message: MSG.PRODUCT_DELETED,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
