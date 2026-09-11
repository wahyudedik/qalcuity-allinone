export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createProductSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';
import { MSG } from '@/lib/api-messages';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:products:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const categoryId = searchParams.get('categoryId');

        const where: Record<string, unknown> = {
            tenantId,
            isActive: true,
        };

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { sku: { contains: search } },
            ];
        }

        if (categoryId) {
            where.categoryId = categoryId;
        }

        const products = await prisma.product.findMany({
            where,
            select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                cost: true,
                stock: true,
                minStock: true,
                unit: true,
                description: true,
                category: { select: { id: true, name: true } },
            },
            orderBy: { name: 'asc' },
            take: 100,
        });

        const data = products.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: Number(p.price),
            cost: Number(p.cost),
            stock: Number(p.stock),
            minStock: Number(p.minStock),
            unit: p.unit,
            description: p.description,
            categoryId: p.category?.id || null,
            categoryName: p.category?.name || null,
            inStock: Number(p.stock) > 0,
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:products:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId, role } = auth;

        // Only ADMIN+ can create products
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: MSG.PRODUCT_ADMIN_ONLY_CREATE },
                { status: 403 }
            );
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = createProductSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Check for duplicate SKU within tenant
        const existingProduct = await prisma.product.findFirst({
            where: { tenantId, sku: validatedData.sku },
        });
        if (existingProduct) {
            return NextResponse.json(
                { success: false, error: MSG.PRODUCT_SKU_DUPLICATE },
                { status: 400 }
            );
        }

        const product = await prisma.product.create({
            data: {
                tenantId,
                sku: validatedData.sku,
                name: validatedData.name,
                description: validatedData.description || null,
                unit: validatedData.unit || 'pcs',
                price: validatedData.price ?? 0,
                cost: validatedData.cost ?? 0,
                stock: validatedData.stock ?? 0,
                minStock: validatedData.minStock ?? 0,
                categoryId: validatedData.categoryId || null,
            },
            include: {
                category: { select: { id: true, name: true } },
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'Product',
            entityId: product.id,
            newValues: { sku: product.sku, name: product.name, price: Number(product.price) },
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
            },
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
