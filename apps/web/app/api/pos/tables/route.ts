export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createTableSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';
import { MSG } from '@/lib/api-messages';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:tables:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'MSG.TOO_MANY_REQUESTS' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const zone = searchParams.get('zone');
        const floor = searchParams.get('floor');
        const activeOnly = searchParams.get('activeOnly') === 'true';

        const where: Record<string, unknown> = { tenantId };
        if (status) where.status = status;
        if (zone) where.zone = zone;
        if (floor) where.floor = floor;
        if (activeOnly) where.isActive = true;

        const tables = await prisma.posTable.findMany({
            where,
            include: {
                _count: {
                    select: { reservations: { where: { status: { in: ['CONFIRMED', 'SEATED'] } } } },
                },
                reservations: {
                    where: { status: { in: ['CONFIRMED', 'SEATED'] } },
                    select: {
                        id: true,
                        customerName: true,
                        partySize: true,
                        reservationTime: true,
                        status: true,
                    },
                    take: 3,
                    orderBy: { reservationTime: 'asc' },
                },
            },
            orderBy: { number: 'asc' },
        });

        const data = tables.map((table) => ({
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
            activeReservationCount: table._count.reservations,
            activeReservations: table.reservations.map((r) => ({
                id: r.id,
                customerName: r.customerName,
                partySize: r.partySize,
                reservationTime: r.reservationTime.toISOString(),
                status: r.status,
            })),
            createdAt: table.createdAt.toISOString(),
            updatedAt: table.updatedAt.toISOString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:tables:POST:${ip}`, 30, 60000);
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
                { success: false, error: MSG.TABLE_ADMIN_ONLY_CREATE },
                { status: 403 }
            );
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = createTableSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Check for duplicate number within tenant
        const existingTable = await prisma.posTable.findFirst({
            where: { tenantId, number: validatedData.number },
        });
        if (existingTable) {
            return NextResponse.json(
                { success: false, error: MSG.TABLE_NUMBER_DUPLICATE },
                { status: 400 }
            );
        }

        const table = await prisma.posTable.create({
            data: {
                tenantId,
                number: validatedData.number,
                name: validatedData.name || null,
                capacity: validatedData.capacity || 4,
                zone: validatedData.zone || null,
                floor: validatedData.floor || null,
                posX: validatedData.posX ?? null,
                posY: validatedData.posY ?? null,
                width: validatedData.width || 1,
                height: validatedData.height || 1,
                notes: validatedData.notes || null,
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'PosTable',
            entityId: table.id,
            newValues: { number: table.number, name: table.name, capacity: table.capacity },
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
                createdAt: table.createdAt.toISOString(),
            },
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
