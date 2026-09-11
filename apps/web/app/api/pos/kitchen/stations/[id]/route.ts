export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createKitchenStationSchema, updateKitchenStationSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';
import { MSG } from '@/lib/api-messages';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:kitchen:stations:${ip}`, 100, 60000);
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
        const activeOnly = searchParams.get('activeOnly') === 'true';

        const where: Record<string, unknown> = { tenantId };
        if (activeOnly) {
            where.isActive = true;
        }

        const stations = await prisma.posKitchenStation.findMany({
            where,
            include: {
                _count: {
                    select: { orders: { where: { status: { in: ['PENDING', 'PREPARING'] } } } },
                },
            },
            orderBy: { sortOrder: 'asc' },
        });

        const data = stations.map((station) => ({
            id: station.id,
            name: station.name,
            description: station.description,
            isActive: station.isActive,
            sortOrder: station.sortOrder,
            activeOrderCount: station._count.orders,
            createdAt: station.createdAt.toISOString(),
            updatedAt: station.updatedAt.toISOString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        // Graceful fallback: PosKitchenStation table not yet available (migration pending)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
            console.warn('[Kitchen Stations API] PosKitchenStation table not found â€” returning empty fallback');
            return NextResponse.json({ success: true, data: [] });
        }
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:kitchen:stations:POST:${ip}`, 30, 60000);
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
                { success: false, error: MSG.KITCHEN_STATION_ADMIN_ONLY_CREATE },
                { status: 403 }
            );
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = createKitchenStationSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Check for duplicate name within tenant
        const existingStation = await prisma.posKitchenStation.findFirst({
            where: { tenantId, name: validatedData.name },
        });
        if (existingStation) {
            return NextResponse.json(
                { success: false, error: MSG.KITCHEN_STATION_NAME_DUPLICATE },
                { status: 400 }
            );
        }

        const station = await prisma.posKitchenStation.create({
            data: {
                tenantId,
                name: validatedData.name,
                description: validatedData.description || null,
                sortOrder: validatedData.sortOrder || 0,
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'PosKitchenStation',
            entityId: station.id,
            newValues: { name: station.name },
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: station.id,
                name: station.name,
                description: station.description,
                isActive: station.isActive,
                sortOrder: station.sortOrder,
                createdAt: station.createdAt.toISOString(),
            },
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:kitchen:stations:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId, role } = auth;

        // Only ADMIN+ can update kitchen stations
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: MSG.KITCHEN_STATION_ADMIN_ONLY_UPDATE },
                { status: 403 }
            );
        }

        // Check station exists
        const existingStation = await prisma.posKitchenStation.findFirst({
            where: { id: params.id, tenantId },
        });
        if (!existingStation) {
            return NextResponse.json(
                { success: false, error: MSG.KITCHEN_STATION_NOT_FOUND },
                { status: 404 }
            );
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = updateKitchenStationSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Check for duplicate name within tenant (excluding current station)
        if (validatedData.name) {
            const duplicateName = await prisma.posKitchenStation.findFirst({
                where: {
                    tenantId,
                    name: validatedData.name,
                    id: { not: params.id },
                },
            });
            if (duplicateName) {
                return NextResponse.json(
                    { success: false, error: MSG.KITCHEN_STATION_NAME_DUPLICATE },
                    { status: 400 }
                );
            }
        }

        const station = await prisma.posKitchenStation.update({
            where: { id: params.id },
            data: {
                ...(validatedData.name !== undefined && { name: validatedData.name }),
                ...(validatedData.description !== undefined && { description: validatedData.description }),
                ...(validatedData.sortOrder !== undefined && { sortOrder: validatedData.sortOrder }),
                ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'PosKitchenStation',
            entityId: station.id,
            newValues: validatedData,
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: station.id,
                name: station.name,
                description: station.description,
                isActive: station.isActive,
                sortOrder: station.sortOrder,
                createdAt: station.createdAt.toISOString(),
                updatedAt: station.updatedAt.toISOString(),
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
        const rateLimitResult = checkRateLimit(`api:pos:kitchen:stations:DELETE:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId, role } = auth;

        // Only ADMIN+ can delete kitchen stations
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: MSG.KITCHEN_STATION_ADMIN_ONLY_DELETE },
                { status: 403 }
            );
        }

        // Check station exists
        const existingStation = await prisma.posKitchenStation.findFirst({
            where: { id: params.id, tenantId },
        });
        if (!existingStation) {
            return NextResponse.json(
                { success: false, error: MSG.KITCHEN_STATION_NOT_FOUND },
                { status: 404 }
            );
        }

        // Check for active orders
        const activeOrders = await prisma.posKitchenOrder.findFirst({
            where: {
                tenantId,
                stationId: params.id,
                status: { in: ['PENDING', 'PREPARING'] },
            },
        });
        if (activeOrders) {
            return NextResponse.json(
                { success: false, error: MSG.KITCHEN_STATION_CANNOT_DELETE_ACTIVE_ORDERS },
                { status: 400 }
            );
        }

        // Delete station
        await prisma.posKitchenStation.delete({
            where: { id: params.id },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'PosKitchenStation',
            entityId: params.id,
            newValues: { name: existingStation.name },
            request,
        });

        return NextResponse.json({
            success: true,
            message: MSG.KITCHEN_STATION_DELETED,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
