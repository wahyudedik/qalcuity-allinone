import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { updateTableSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';
import { MSG } from '@/lib/api-messages';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`pos:tables:[id]:GET:${ip}`, 60, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const table = await prisma.posTable.findFirst({
            where: { id, tenantId },
            include: {
                reservations: {
                    where: { status: { in: ['CONFIRMED', 'SEATED'] } },
                    orderBy: { reservationTime: 'asc' },
                    take: 10,
                },
                _count: { select: { reservations: true } },
            },
        });

        if (!table) {
            return NextResponse.json(
                { success: false, error: MSG.TABLE_NOT_FOUND },
                { status: 404 }
            );
        }

        const data = {
            id: table.id,
            number: table.number,
            name: table.name,
            capacity: table.capacity,
            status: table.status,
            zone: table.zone,
            floor: table.floor,
            posX: table.posX,
            posY: table.posY,
            width: table.width,
            height: table.height,
            isActive: table.isActive,
            currentSessionId: table.currentSessionId,
            notes: table.notes,
            totalReservations: table._count.reservations,
            activeReservations: table.reservations.map((r) => ({
                id: r.id,
                customerName: r.customerName,
                customerPhone: r.customerPhone,
                partySize: r.partySize,
                reservationTime: r.reservationTime.toISOString(),
                duration: r.duration,
                status: r.status,
                notes: r.notes,
            })),
            createdAt: table.createdAt.toISOString(),
            updatedAt: table.updatedAt.toISOString(),
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
        const rl = checkRateLimit(`pos:tables:[id]:PATCH:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: MSG.TABLE_ADMIN_ONLY_UPDATE },
                { status: 403 }
            );
        }

        const { id } = params;
        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = updateTableSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const existing = await prisma.posTable.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.TABLE_NOT_FOUND },
                { status: 404 }
            );
        }

        // Check for duplicate number if number is being changed
        if (validation.data.number && validation.data.number !== existing.number) {
            const duplicateNumber = await prisma.posTable.findFirst({
                where: { tenantId, number: validation.data.number, id: { not: id } },
            });
            if (duplicateNumber) {
                return NextResponse.json(
                    { success: false, error: MSG.TABLE_NUMBER_DUPLICATE },
                    { status: 400 }
                );
            }
        }

        const table = await prisma.posTable.update({
            where: { id },
            data: validation.data,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'PosTable',
            entityId: id,
            oldValues: { number: existing.number, status: existing.status, capacity: existing.capacity },
            newValues: validation.data as Record<string, unknown>,
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: table.id,
                number: table.number,
                name: table.name,
                capacity: table.capacity,
                status: table.status,
                zone: table.zone,
                floor: table.floor,
                posX: table.posX,
                posY: table.posY,
                width: table.width,
                height: table.height,
                isActive: table.isActive,
                currentSessionId: table.currentSessionId,
                notes: table.notes,
                createdAt: table.createdAt.toISOString(),
                updatedAt: table.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`pos:tables:[id]:DELETE:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: MSG.TABLE_ADMIN_ONLY_DELETE },
                { status: 403 }
            );
        }

        const { id } = params;

        const existing = await prisma.posTable.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.TABLE_NOT_FOUND },
                { status: 404 }
            );
        }

        // Check if table has active session
        if (existing.currentSessionId) {
            return NextResponse.json(
                { success: false, error: MSG.TABLE_CANNOT_DELETE_ACTIVE_SESSION },
                { status: 400 }
            );
        }

        // Check if table has active reservations
        const activeReservations = await prisma.posTableReservation.count({
            where: { tableId: id, status: { in: ['CONFIRMED', 'SEATED'] } },
        });
        if (activeReservations > 0) {
            return NextResponse.json(
                { success: false, error: MSG.TABLE_CANNOT_DELETE_ACTIVE_RESERVATION },
                { status: 400 }
            );
        }

        await prisma.posTable.delete({ where: { id } });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'PosTable',
            entityId: id,
            oldValues: { number: existing.number, name: existing.name },
            request,
        });

        return NextResponse.json({ success: true, message: MSG.TABLE_DELETED });
    } catch (error) {
        return handleApiError(error);
    }
}
