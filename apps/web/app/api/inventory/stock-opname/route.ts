import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { createStockOpnameSchema, formatZodError } from '@/lib/validation-schemas';
import { sanitizeObject } from '@/lib/sanitize';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const warehouseId = searchParams.get('warehouseId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId: auth.tenantId };

        if (status && status !== 'all') {
            where.status = status;
        }

        if (warehouseId) {
            where.warehouseId = warehouseId;
        }

        const [opnames, total] = await Promise.all([
            prisma.stockOpname.findMany({
                where,
                include: {
                    warehouse: { select: { id: true, name: true, code: true } },
                    _count: { select: { items: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.stockOpname.count({ where }),
        ]);

        const data = opnames.map((o) => ({
            id: o.id,
            opnameNumber: o.opnameNumber,
            status: o.status,
            opnameDate: o.opnameDate.toISOString(),
            notes: o.notes,
            totalDifference: o.totalDifference,
            warehouseName: o.warehouse?.name || 'Semua Gudang',
            warehouseCode: o.warehouse?.code || '-',
            itemCount: o._count.items,
            createdAt: o.createdAt.toISOString(),
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
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);

        const validation = createStockOpnameSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }
        const validatedData = validation.data;

        // Generate opname number
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const countToday = await prisma.stockOpname.count({
            where: {
                tenantId,
                createdAt: {
                    gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                },
            },
        });
        const opnameNumber = `SOP-${dateStr}-${String(countToday + 1).padStart(4, '0')}`;

        // Get system quantities for all products
        const productIds = validatedData.items.map((item) => item.productId);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds }, tenantId },
            select: { id: true, stock: true },
        });

        const productStockMap = new Map(products.map((p) => [p.id, p.stock]));

        // Calculate differences
        const items = validatedData.items.map((item) => {
            const systemQty = productStockMap.get(item.productId) || 0;
            return {
                productId: item.productId,
                systemQuantity: systemQty,
                physicalQuantity: item.physicalQuantity,
                difference: item.physicalQuantity - systemQty,
                notes: item.notes || null,
            };
        });

        const totalDifference = items.reduce((sum, item) => sum + Math.abs(item.difference), 0);

        // Create stock opname with items
        const opname = await prisma.stockOpname.create({
            data: {
                opnameNumber,
                tenantId,
                warehouseId: validatedData.warehouseId || null,
                opnameDate: validatedData.opnameDate ? new Date(validatedData.opnameDate) : now,
                notes: validatedData.notes || null,
                totalDifference,
                status: 'DRAFT',
                items: {
                    create: items,
                },
            },
            include: {
                warehouse: { select: { name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true } },
                    },
                },
            },
        });

        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'StockOpname', entityId: opname.id, newValues: { opnameNumber, totalDifference } as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: opname }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body';
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}
