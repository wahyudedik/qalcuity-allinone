import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:products:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
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
