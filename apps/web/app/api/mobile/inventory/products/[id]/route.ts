export const dynamic = 'force-dynamic';

/**
 * Mobile API — Product Detail (GET + Update + Delete)
 *
 * GET    /api/mobile/inventory/products/[id]  — Get product detail
 * PUT    /api/mobile/inventory/products/[id]  — Update product
 * DELETE /api/mobile/inventory/products/[id]  — Delete product (soft delete)
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

// ─── GET /api/mobile/inventory/products/[id] ──────────────────────────────────

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireMobileAuth(req);
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        const product = await prisma.product.findFirst({
            where: { id: params.id, tenantId: user.tenantId },
            include: {
                category: { select: { id: true, name: true } },
            },
        });

        if (!product) {
            return NextResponse.json(
                { success: false, error: MSG.PRODUCT_NOT_FOUND },
                { status: 404 }
            );
        }

        const data = {
            id: product.id,
            sku: product.sku,
            name: product.name,
            description: product.description,
            unit: product.unit,
            price: product.price,
            cost: product.cost,
            stock: product.stock,
            minStock: product.minStock,
            isActive: product.isActive,
            categoryId: product.categoryId,
            categoryName: product.category?.name || null,
            isLowStock: product.stock <= product.minStock,
            createdAt: product.createdAt.toISOString(),
            updatedAt: product.updatedAt.toISOString(),
        };

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT /api/mobile/inventory/products/[id] ──────────────────────────────────

export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireMobileAuth(req);
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        if (user.role === 'VIEWER') {
            return NextResponse.json(
                { success: false, error: MSG.PRODUCT_ADMIN_ONLY_UPDATE },
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

        // Cek apakah product ada dan milik tenant ini
        const existing = await prisma.product.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.PRODUCT_NOT_FOUND },
                { status: 404 }
            );
        }

        const updated = await prisma.product.update({
            where: { id: params.id },
            data: {
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
            action: 'UPDATE',
            entity: 'Product',
            entityId: params.id,
            oldValues: { sku: existing.sku, name: existing.name },
            newValues: { sku: updated.sku, name: updated.name },
            request: req,
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── DELETE /api/mobile/inventory/products/[id] ───────────────────────────────

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireMobileAuth(req);
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        if (user.role === 'VIEWER') {
            return NextResponse.json(
                { success: false, error: MSG.PRODUCT_ADMIN_ONLY_DELETE },
                { status: 403 }
            );
        }

        const { id: userId, tenantId } = user;

        const existing = await prisma.product.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.PRODUCT_NOT_FOUND },
                { status: 404 }
            );
        }

        await prisma.product.delete({ where: { id: params.id } });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'Product',
            entityId: params.id,
            oldValues: { sku: existing.sku, name: existing.name },
            request: req,
        });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
