import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { updateKitchenOrderStatusSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';
import { MSG } from '@/lib/api-messages';

// Valid state transitions for kitchen order
const VALID_TRANSITIONS: Record<string, string[]> = {
    PENDING: ['PREPARING', 'CANCELLED'],
    PREPARING: ['READY', 'CANCELLED'],
    READY: ['SERVED'],
    SERVED: [],
    CANCELLED: [],
};

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`pos:kitchen:orders:[id]:GET:${ip}`, 60, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const order = await prisma.posKitchenOrder.findFirst({
            where: { id, tenantId },
            include: {
                station: { select: { id: true, name: true } },
                items: true,
            },
        });

        if (!order) {
            return NextResponse.json(
                { success: false, error: MSG.KITCHEN_ORDER_NOT_FOUND },
                { status: 404 }
            );
        }

        const data = {
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
                transactionItemId: item.transactionItemId,
                productName: item.productName,
                quantity: item.quantity,
                notes: item.notes,
                status: item.status,
                createdAt: item.createdAt.toISOString(),
            })),
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString(),
        };

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`pos:kitchen:orders:[id]:PATCH:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: MSG.KITCHEN_ORDER_ADMIN_ONLY_UPDATE },
                { status: 403 }
            );
        }

        const { id } = params;
        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = updateKitchenOrderStatusSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const existing = await prisma.posKitchenOrder.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.KITCHEN_ORDER_NOT_FOUND },
                { status: 404 }
            );
        }

        // Validate state transition
        const newStatus = validation.data.status;
        const allowedTransitions = VALID_TRANSITIONS[existing.status] || [];
        if (!allowedTransitions.includes(newStatus)) {
            return NextResponse.json(
                {
                    success: false,
                    error: MSG.KITCHEN_ORDER_TRANSITION_INVALID,
                },
                { status: 400 }
            );
        }

        // Build update data based on status transition
        const updateData: Record<string, unknown> = {
            status: newStatus,
        };

        // Set timestamps based on status
        if (newStatus === 'PREPARING' && !existing.startedAt) {
            updateData.startedAt = new Date();
        }
        if (newStatus === 'READY') {
            updateData.completedAt = new Date();
        }
        if (newStatus === 'SERVED') {
            updateData.servedAt = new Date();
        }

        // Update station if provided
        if (validation.data.stationId !== undefined) {
            updateData.stationId = validation.data.stationId;
        }

        // Update notes if provided
        if (validation.data.notes !== undefined) {
            updateData.notes = validation.data.notes;
        }

        const updatedOrder = await prisma.posKitchenOrder.update({
            where: { id },
            data: updateData,
            include: {
                station: { select: { id: true, name: true } },
                items: true,
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'PosKitchenOrder',
            entityId: id,
            oldValues: { status: existing.status },
            newValues: { status: newStatus },
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: updatedOrder.id,
                orderNumber: updatedOrder.orderNumber,
                status: updatedOrder.status,
                priority: updatedOrder.priority,
                notes: updatedOrder.notes,
                startedAt: updatedOrder.startedAt?.toISOString() || null,
                completedAt: updatedOrder.completedAt?.toISOString() || null,
                servedAt: updatedOrder.servedAt?.toISOString() || null,
                station: updatedOrder.station,
                items: updatedOrder.items.map((item) => ({
                    id: item.id,
                    productName: item.productName,
                    quantity: item.quantity,
                    notes: item.notes,
                    status: item.status,
                })),
                createdAt: updatedOrder.createdAt.toISOString(),
                updatedAt: updatedOrder.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
