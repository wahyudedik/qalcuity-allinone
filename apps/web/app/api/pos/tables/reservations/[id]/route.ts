import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { updateReservationSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`pos:tables:reservations:[id]:GET:${ip}`, 60, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const reservation = await prisma.posTableReservation.findFirst({
            where: { id, tenantId },
            include: {
                table: {
                    select: { id: true, number: true, name: true, zone: true, capacity: true },
                },
            },
        });

        if (!reservation) {
            return NextResponse.json(
                { success: false, error: 'Reservasi tidak ditemukan' },
                { status: 404 }
            );
        }

        const data = {
            id: reservation.id,
            customerName: reservation.customerName,
            customerPhone: reservation.customerPhone,
            partySize: reservation.partySize,
            reservationTime: reservation.reservationTime.toISOString(),
            duration: reservation.duration,
            status: reservation.status,
            notes: reservation.notes,
            table: reservation.table ? {
                id: reservation.table.id,
                number: reservation.table.number,
                name: reservation.table.name,
                zone: reservation.table.zone,
                capacity: reservation.table.capacity,
            } : null,
            createdAt: reservation.createdAt.toISOString(),
            updatedAt: reservation.updatedAt.toISOString(),
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
        const rl = checkRateLimit(`pos:tables:reservations:[id]:PATCH:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat mengubah reservasi' },
                { status: 403 }
            );
        }

        const { id } = params;
        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = updateReservationSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const existing = await prisma.posTableReservation.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Reservasi tidak ditemukan' },
                { status: 404 }
            );
        }

        // If changing table, check availability
        if (validation.data.tableId && validation.data.tableId !== existing.tableId) {
            const table = await prisma.posTable.findFirst({
                where: { id: validation.data.tableId, tenantId },
            });
            if (!table) {
                return NextResponse.json(
                    { success: false, error: 'Meja tidak ditemukan' },
                    { status: 404 }
                );
            }

            const partySize = validation.data.partySize || existing.partySize;
            if (table.capacity < partySize) {
                return NextResponse.json(
                    { success: false, error: `Kapasitas meja (${table.capacity}) kurang dari jumlah tamu (${partySize})` },
                    { status: 400 }
                );
            }
        }

        const updateData: Record<string, unknown> = {};
        if (validation.data.tableId !== undefined) updateData.tableId = validation.data.tableId;
        if (validation.data.status) updateData.status = validation.data.status;
        if (validation.data.customerName) updateData.customerName = validation.data.customerName;
        if (validation.data.customerPhone !== undefined) updateData.customerPhone = validation.data.customerPhone;
        if (validation.data.partySize) updateData.partySize = validation.data.partySize;
        if (validation.data.reservationTime) updateData.reservationTime = new Date(validation.data.reservationTime);
        if (validation.data.duration) updateData.duration = validation.data.duration;
        if (validation.data.notes !== undefined) updateData.notes = validation.data.notes;

        const reservation = await prisma.posTableReservation.update({
            where: { id },
            data: updateData,
            include: {
                table: {
                    select: { id: true, number: true, name: true, zone: true },
                },
            },
        });

        // If status changed to SEATED, update table status to OCCUPIED
        if (validation.data.status === 'SEATED' && reservation.tableId) {
            await prisma.posTable.update({
                where: { id: reservation.tableId },
                data: { status: 'OCCUPIED' },
            });
        }

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'PosTableReservation',
            entityId: id,
            oldValues: { status: existing.status, tableId: existing.tableId },
            newValues: updateData,
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: reservation.id,
                customerName: reservation.customerName,
                customerPhone: reservation.customerPhone,
                partySize: reservation.partySize,
                reservationTime: reservation.reservationTime.toISOString(),
                duration: reservation.duration,
                status: reservation.status,
                notes: reservation.notes,
                table: reservation.table ? {
                    id: reservation.table.id,
                    number: reservation.table.number,
                    name: reservation.table.name,
                    zone: reservation.table.zone,
                } : null,
                createdAt: reservation.createdAt.toISOString(),
                updatedAt: reservation.updatedAt.toISOString(),
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
        const rl = checkRateLimit(`pos:tables:reservations:[id]:DELETE:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat membatalkan reservasi' },
                { status: 403 }
            );
        }

        const { id } = params;

        const existing = await prisma.posTableReservation.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Reservasi tidak ditemukan' },
                { status: 404 }
            );
        }

        // Soft cancel — set status to CANCELLED
        const reservation = await prisma.posTableReservation.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'PosTableReservation',
            entityId: id,
            oldValues: { status: existing.status },
            newValues: { status: 'CANCELLED' },
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: reservation.id,
                status: reservation.status,
                updatedAt: reservation.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
