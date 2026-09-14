export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { sanitizeObject } from '@/lib/sanitize';
import { restockProductSchema, formatZodError } from '@/lib/validation-schemas';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

/**
 * POST /api/inventory/products/[id]/restock
 * Restock a product by increasing its stock quantity.
 *
 * Body: { quantity: number, warehouseId?: string, notes?: string }
 */
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId } = auth;
        const body = await request.json();

        // Sanitize inputs
        const sanitizedBody = sanitizeObject(body);

        // Validate
        const validation = restockProductSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { quantity, warehouseId, notes } = validation.data;

        // Find product with tenant isolation
        const product = await prisma.product.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!product) {
            return NextResponse.json(
                { success: false, error: MSG.PRODUCT_NOT_FOUND, code: 'PRODUCT_NOT_FOUND' },
                { status: 404 }
            );
        }

        // If warehouseId provided, verify it exists for this tenant
        if (warehouseId) {
            const warehouse = await prisma.warehouse.findFirst({
                where: { id: warehouseId, tenantId },
            });
            if (!warehouse) {
                return NextResponse.json(
                    { success: false, error: MSG.WAREHOUSE_NOT_FOUND, code: 'WAREHOUSE_NOT_FOUND' },
                    { status: 404 }
                );
            }
        }

        const previousStock = product.stock;
        const newStock = previousStock + quantity;

        // Use transaction to update stock and create stock movement atomically
        const [updatedProduct] = await prisma.$transaction([
            prisma.product.update({
                where: { id: params.id },
                data: { stock: newStock },
            }),
            prisma.stockMovement.create({
                data: {
                    tenantId,
                    productId: params.id,
                    type: 'IN',
                    quantity,
                    notes: notes || `Restock: +${quantity} units`,
                    reference: warehouseId || undefined,
                },
            }),
        ]);

        // Log audit
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'Product',
            entityId: params.id,
            newValues: {
                stock: newStock,
                previousStock,
                restockQuantity: quantity,
                notes: notes || null,
            },
            request,
        });

        return NextResponse.json({
            success: true,
            message: MSG.RESTOCK_SUCCESS,
            data: {
                id: updatedProduct.id,
                name: updatedProduct.name,
                stock: updatedProduct.stock,
                previousStock,
                restockedQuantity: quantity,
            },
        });
    } catch (error) {
        logger.error('[API Error] POST /api/inventory/products/[id]/restock:', error);
        return handleApiError(error);
    }
}
