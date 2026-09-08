import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createKitchenOrderSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';
import { MSG } from '@/lib/api-messages';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:kitchen:orders:${ip}`, 100, 60000);
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
        const status = searchParams.get('status');
        const stationId = searchParams.get('stationId');
        const priority = searchParams.get('priority');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (status) {
            where.status = status.toUpperCase();
        }

        if (stationId) {
            where.stationId = stationId;
        }

        if (priority) {
            where.priority = priority.toUpperCase();
        }

        const [orders, total] = await Promise.all([
            prisma.posKitchenOrder.findMany({
                where,
                include: {
                    station: { select: { id: true, name: true } },
                    items: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.posKitchenOrder.count({ where }),
        ]);

        const data = orders.map((order) => ({
            id: order.id,
            transactionId: order.transactionId,
            orderNumber: order.orderNumber,
            status: order.status,
            priority: order.priority,
            notes: order.notes,
            estimatedMinutes: order.estimatedMinutes,
            startedAt: order.startedAt?.toISOString() || null,
            completedAt: order.completedAt?.toISOString() || null,
            servedAt: order.servedAt?.toISOString() || null,
            station: order.station,
            items: order.items.map((item) => ({
                id: item.id,
                productName: item.productName,
                quantity: item.quantity,
                notes: item.notes,
                status: item.status,
            })),
            createdAt: order.createdAt.toISOString(),
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
        // Graceful fallback: PosKitchenOrder table not yet available (migration pending)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
            console.warn('[Kitchen Orders API] PosKitchenOrder table not found — returning empty fallback');
            return NextResponse.json({ success: true, data: [], total: 0, page: 1, limit: 50, totalPages: 0 });
        }
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:kitchen:orders:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: MSG.KITCHEN_ORDER_ADMIN_ONLY_CREATE },
                { status: 403 }
            );
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = createKitchenOrderSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Verify station exists if provided
        if (validatedData.stationId) {
            const station = await prisma.posKitchenStation.findFirst({
                where: { id: validatedData.stationId, tenantId, isActive: true },
            });
            if (!station) {
                return NextResponse.json(
                    { success: false, error: MSG.KITCHEN_STATION_NOT_FOUND },
                    { status: 400 }
                );
            }
        }

        // Generate order number (auto-increment per tenant)
        const lastOrder = await prisma.posKitchenOrder.findFirst({
            where: { tenantId },
            orderBy: { orderNumber: 'desc' },
            select: { orderNumber: true },
        });
        const orderNumber = (lastOrder?.orderNumber || 0) + 1;

        const order = await prisma.$transaction(async (tx) => {
            const newOrder = await tx.posKitchenOrder.create({
                data: {
                    tenantId,
                    transactionId: validatedData.transactionId || null,
                    stationId: validatedData.stationId || null,
                    orderNumber,
                    priority: validatedData.priority || 'NORMAL',
                    notes: validatedData.notes || null,
                    estimatedMinutes: validatedData.estimatedMinutes || null,
                },
            });

            // Create order items
            await tx.posKitchenOrderItem.createMany({
                data: validatedData.items.map((item) => ({
                    tenantId,
                    kitchenOrderId: newOrder.id,
                    transactionItemId: item.transactionItemId || null,
                    productName: item.productName,
                    quantity: item.quantity,
                    notes: item.notes || null,
                })),
            });

            return newOrder;
        });

        // Fetch complete order with items
        const completeOrder = await prisma.posKitchenOrder.findUnique({
            where: { id: order.id },
            include: { items: true, station: { select: { id: true, name: true } } },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'PosKitchenOrder',
            entityId: order.id,
            newValues: { orderNumber, status: order.status, priority: order.priority },
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: completeOrder!.id,
                orderNumber: completeOrder!.orderNumber,
                status: completeOrder!.status,
                priority: completeOrder!.priority,
                notes: completeOrder!.notes,
                estimatedMinutes: completeOrder!.estimatedMinutes,
                station: completeOrder!.station,
                items: completeOrder!.items.map((item) => ({
                    id: item.id,
                    productName: item.productName,
                    quantity: item.quantity,
                    notes: item.notes,
                    status: item.status,
                })),
                createdAt: completeOrder!.createdAt.toISOString(),
            },
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
