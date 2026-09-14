export const dynamic = 'force-dynamic';

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
import { logger } from '@/lib/logger';
import { notifyKitchenUpdate } from '../stream/route';

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
        const tableNumberFilter = searchParams.get('tableNumber');
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

        // --- Table info derivation via transaction chain ---
        // PosKitchenOrder.transactionId → PosTransaction → PosSession → PosTable.currentSessionId
        const transactionIds = [...new Set(orders.map((o) => o.transactionId).filter((id): id is string => Boolean(id)))];
        let tableMapByTxId: Record<string, { tableNumber: number; tableName: string | null; zone: string | null }> = {};

        if (transactionIds.length > 0) {
            const transactions = await prisma.posTransaction.findMany({
                where: { id: { in: transactionIds }, tenantId },
                select: { id: true, sessionId: true },
            });

            const sessionIds = [...new Set(transactions.map((t) => t.sessionId).filter((id): id is string => Boolean(id)))];
            const txToSessionMap: Record<string, string> = {};
            transactions.forEach((t) => {
                if (t.sessionId) txToSessionMap[t.id] = t.sessionId;
            });

            if (sessionIds.length > 0) {
                const tables = await prisma.posTable.findMany({
                    where: { currentSessionId: { in: sessionIds }, tenantId },
                    select: { number: true, name: true, zone: true, currentSessionId: true },
                });

                const sessionToTable: Record<string, { tableNumber: number; tableName: string | null; zone: string | null }> = {};
                tables.forEach((tbl) => {
                    if (tbl.currentSessionId) {
                        sessionToTable[tbl.currentSessionId] = { tableNumber: tbl.number, tableName: tbl.name, zone: tbl.zone };
                    }
                });

                transactionIds.forEach((txId) => {
                    const sessionId = txToSessionMap[txId];
                    if (sessionId && sessionToTable[sessionId]) {
                        tableMapByTxId[txId] = sessionToTable[sessionId];
                    }
                });
            }
        }

        const data = orders.map((order) => {
            const tableInfo = order.transactionId ? tableMapByTxId[order.transactionId] : undefined;
            return {
                id: order.id,
                transactionId: order.transactionId,
                orderNumber: order.orderNumber,
                status: order.status,
                priority: order.priority,
                notes: order.notes,
                estimatedMinutes: order.estimatedMinutes,
                tableNumber: tableInfo ? String(tableInfo.tableNumber) : null,
                tableName: tableInfo?.tableName || null,
                tableZone: tableInfo?.zone || null,
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
            };
        });

        // Filter by tableNumber if specified (post-derive filter since tableNumber is not a DB column)
        const filteredData = tableNumberFilter
            ? data.filter((order) => order.tableNumber === tableNumberFilter)
            : data;

        return NextResponse.json({
            success: true,
            data: filteredData,
            total: tableNumberFilter ? filteredData.length : total,
            page,
            limit,
            totalPages: tableNumberFilter ? 1 : Math.ceil(total / limit),
        });
    } catch (error) {
        // Graceful fallback: PosKitchenOrder table not yet available (migration pending)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
            logger.warn('[Kitchen Orders API] PosKitchenOrder table not found â€” returning empty fallback');
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

        // --- Derive table info for the response ---
        let tableInfo: { tableNumber: string; tableName: string | null; tableZone: string | null } | null = null;
        if (order.transactionId) {
            const tx = await prisma.posTransaction.findUnique({
                where: { id: order.transactionId },
                select: { sessionId: true },
            });
            if (tx?.sessionId) {
                const tbl = await prisma.posTable.findFirst({
                    where: { currentSessionId: tx.sessionId, tenantId },
                    select: { number: true, name: true, zone: true },
                });
                if (tbl) {
                    tableInfo = { tableNumber: String(tbl.number), tableName: tbl.name, tableZone: tbl.zone };
                }
            }
        }

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'PosKitchenOrder',
            entityId: order.id,
            newValues: { orderNumber, status: order.status, priority: order.priority },
            request,
        });

        // Notify SSE subscribers for real-time kitchen display updates
        notifyKitchenUpdate(tenantId);

        return NextResponse.json({
            success: true,
            data: {
                id: completeOrder!.id,
                orderNumber: completeOrder!.orderNumber,
                status: completeOrder!.status,
                priority: completeOrder!.priority,
                notes: completeOrder!.notes,
                estimatedMinutes: completeOrder!.estimatedMinutes,
                tableNumber: tableInfo?.tableNumber || null,
                tableName: tableInfo?.tableName || null,
                tableZone: tableInfo?.tableZone || null,
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
