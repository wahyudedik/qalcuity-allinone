import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createReservationSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:tables:reservations:${ip}`, 100, 60000);
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
        const date = searchParams.get('date');
        const status = searchParams.get('status');
        const tableId = searchParams.get('tableId');

        const where: Record<string, unknown> = { tenantId };
        if (status) where.status = status;
        if (tableId) where.tableId = tableId;

        // Filter by date range
        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            where.reservationTime = { gte: startDate, lte: endDate };
        }

        const reservations = await prisma.posTableReservation.findMany({
            where,
            include: {
                table: {
                    select: { id: true, number: true, name: true, zone: true },
                },
            },
            orderBy: { reservationTime: 'asc' },
        });

        const data = reservations.map((reservation) => ({
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
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:tables:reservations:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat membuat reservasi' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = createReservationSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Check if assigned table belongs to tenant and is available
        if (validatedData.tableId) {
            const table = await prisma.posTable.findFirst({
                where: { id: validatedData.tableId, tenantId },
            });
            if (!table) {
                return NextResponse.json(
                    { success: false, error: 'Meja tidak ditemukan' },
                    { status: 404 }
                );
            }

            // Check table capacity
            if (table.capacity < validatedData.partySize) {
                return NextResponse.json(
                    { success: false, error: `Kapasitas meja (${table.capacity}) kurang dari jumlah tamu (${validatedData.partySize})` },
                    { status: 400 }
                );
            }

            // Check for time conflict with existing reservations
            const reservationStart = new Date(validatedData.reservationTime);
            const reservationEnd = new Date(reservationStart.getTime() + (validatedData.duration || 60) * 60 * 1000);

            const conflictingReservation = await prisma.posTableReservation.findFirst({
                where: {
                    tableId: validatedData.tableId,
                    status: { in: ['CONFIRMED', 'SEATED'] },
                    reservationTime: { lt: reservationEnd },
                    id: { not: undefined },
                },
            });

            if (conflictingReservation) {
                const existingEnd = new Date(
                    conflictingReservation.reservationTime.getTime() + conflictingReservation.duration * 60 * 1000
                );
                if (existingEnd > reservationStart) {
                    return NextResponse.json(
                        { success: false, error: 'Meja sudah memiliki reservasi pada waktu tersebut' },
                        { status: 400 }
                    );
                }
            }
        }

        const reservation = await prisma.posTableReservation.create({
            data: {
                tenantId,
                tableId: validatedData.tableId || null,
                customerName: validatedData.customerName,
                customerPhone: validatedData.customerPhone || null,
                partySize: validatedData.partySize,
                reservationTime: new Date(validatedData.reservationTime),
                duration: validatedData.duration || 60,
                notes: validatedData.notes || null,
            },
            include: {
                table: {
                    select: { id: true, number: true, name: true, zone: true },
                },
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'PosTableReservation',
            entityId: reservation.id,
            newValues: {
                customerName: reservation.customerName,
                partySize: reservation.partySize,
                reservationTime: reservation.reservationTime.toISOString(),
            },
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
            },
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
