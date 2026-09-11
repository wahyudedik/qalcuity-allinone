export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { handleApiError } from '@/lib/api-error';

/**
 * Lightweight product search endpoint for form autocomplete.
 * Returns minimal product data: id, sku, name, unit, price, stock.
 */
export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q') || '';
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

        if (!q || q.trim().length < 1) {
            return NextResponse.json({ success: true, data: [] });
        }

        const products = await prisma.product.findMany({
            where: {
                tenantId,
                isActive: true,
                deletedAt: null,
                OR: [
                    { name: { contains: q } },
                    { sku: { contains: q } },
                    { description: { contains: q } },
                ],
            },
            select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
                price: true,
                cost: true,
                stock: true,
            },
            orderBy: { name: 'asc' },
            take: limit,
        });

        return NextResponse.json({
            success: true,
            data: products.map((p) => ({
                id: p.id,
                sku: p.sku,
                name: p.name,
                unit: p.unit,
                price: Number(p.price),
                cost: Number(p.cost),
                stock: p.stock,
            })),
        });
    } catch (error) {
        return handleApiError(error);
    }
}
