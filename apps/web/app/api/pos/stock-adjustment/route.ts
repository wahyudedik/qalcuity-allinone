export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { sanitizeObject } from '@/lib/sanitize';
import { posStockAdjustmentSchema, formatZodError } from '@/lib/validation-schemas';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * POST /api/pos/stock-adjustment
 * Adjust product stock from POS terminal.
 *
 * Body: { productId: string, adjustmentType: string, quantity: number, notes: string }
 *
 * adjustmentType: SPOILAGE | SAMPLE | DAMAGE | THEFT | OTHER
 * quantity: positive = add stock, negative = subtract stock
 */
export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:stock-adjustment:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId } = auth;

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);

        const validation = posStockAdjustmentSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { productId, adjustmentType, quantity, notes } = validation.data;

        // Find product with tenant isolation
        const product = await prisma.product.findFirst({
            where: { id: productId, tenantId },
        });

        if (!product) {
            return NextResponse.json(
                { success: false, error: MSG.PRODUCT_NOT_FOUND, code: 'PRODUCT_NOT_FOUND' },
                { status: 404 }
            );
        }

        const previousStock = product.stock;
        const newStock = previousStock + quantity;

        // Prevent negative stock
        if (newStock < 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Stok tidak mencukupi. Stok saat ini: ${previousStock}, penyesuaian: ${quantity}`,
                    code: 'INSUFFICIENT_STOCK',
                },
                { status: 400 }
            );
        }

        // Determine movement type based on quantity direction
        const movementType = quantity > 0 ? 'IN' : 'ADJUSTMENT';
        const typeLabel = adjustmentType.replace('_', ' ');

        // Use transaction to update stock and create stock movement atomically
        const [updatedProduct] = await prisma.$transaction([
            prisma.product.update({
                where: { id: productId },
                data: { stock: newStock },
            }),
            prisma.stockMovement.create({
                data: {
                    tenantId,
                    productId,
                    type: movementType,
                    quantity,
                    notes: notes || `POS Stock Adjustment: ${typeLabel} (${quantity > 0 ? '+' : ''}${quantity})`,
                    reference: `POS-ADJ-${typeLabel}`,
                },
            }),
        ]);

        // Log audit
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'Product',
            entityId: productId,
            newValues: {
                stock: newStock,
                previousStock,
                adjustmentType,
                adjustmentQuantity: quantity,
                notes: notes || null,
            },
            request,
        });

        return NextResponse.json({
            success: true,
            message: MSG.STOCK_ADJUSTMENT_SUCCESS,
            data: {
                id: updatedProduct.id,
                name: updatedProduct.name,
                stock: updatedProduct.stock,
                previousStock,
                adjustmentType,
                adjustmentQuantity: quantity,
            },
        });
    } catch (error) {
        logger.error('[API Error] POST /api/pos/stock-adjustment:', error);
        return handleApiError(error);
    }
}
