export const dynamic = 'force-dynamic';

/**
 * Mobile API — Products CRUD (List + Create)
 *
 * GET  /api/mobile/inventory/products       — List products (paginated, search, category filter)
 * POST /api/mobile/inventory/products       — Create new product
 *
 * Auth: JWT Bearer token via requireMobileAuth()
 * Tenant: Filtered by user.tenantId
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireMobileAuth } from '@/lib/mobile-auth-guard';
import { logAudit } from '@/lib/audit';
import { sanitizeObject } from '@/lib/sanitize';
import { createProductSchema, formatZodError } from '@/lib/validation-schemas';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';

// ─── GET /api/mobile/inventory/products ───────────────────────────────────────
// List products dengan pagination, search, dan category filter.

export async function GET(req: Request) {
    try {
        const user = await requireMobileAuth(req);
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        const { tenantId } = user;
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

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

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    category: { select: { id: true, name: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.product.count({ where }),
        ]);

        const data = products.map((p) => ({
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

        return NextResponse.json({
            success: true,
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── POST /api/mobile/inventory/products ──────────────────────────────────────
// Create new product.

export async function POST(req: Request) {
    try {
        const user = await requireMobileAuth(req);
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        if (user.role === 'VIEWER') {
            return NextResponse.json(
                { success: false, error: MSG.PRODUCT_ADMIN_ONLY_CREATE },
                { status: 403 }
            );
        }

        const { id: userId, tenantId } = user;
        const body = await req.json();

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

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'Product',
            entityId: product.id,
            newValues: { sku: product.sku, name: product.name },
            request: req,
        });

        return NextResponse.json({ success: true, data: product }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
