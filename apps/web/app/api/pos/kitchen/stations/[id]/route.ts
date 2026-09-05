import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { updateKitchenStationSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`pos:kitchen:stations:[id]:GET:${ip}`, 60, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const station = await prisma.posKitchenStation.findFirst({
            where: { id, tenantId },
            include: {
                orders: {
                    where: { status: { in: ['PENDING', 'PREPARING'] } },
                    orderBy: { createdAt: 'asc' },
                    take: 20,
                },
                _count: { select: { orders: true } },
            },
        });

        if (!station) {
            return NextResponse.json(
                { success: false, error: 'Stasiun dapur tidak ditemukan' },
                { status: 404 }
            );
        }

        const data = {
            id: station.id,
            name: station.name,
            description: station.description,
            isActive: station.isActive,
            sortOrder: station.sortOrder,
            totalOrders: station._count.orders,
            activeOrders: station.orders.map((order) => ({
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                priority: order.priority,
                createdAt: order.createdAt.toISOString(),
            })),
            createdAt: station.createdAt.toISOString(),
            updatedAt: station.updatedAt.toISOString(),
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
        const rl = checkRateLimit(`pos:kitchen:stations:[id]:PATCH:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat mengubah stasiun dapur' },
                { status: 403 }
            );
        }

        const { id } = params;
        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = updateKitchenStationSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const existing = await prisma.posKitchenStation.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Stasiun dapur tidak ditemukan' },
                { status: 404 }
            );
        }

        // Check for duplicate name if name is being changed
        if (validation.data.name && validation.data.name !== existing.name) {
            const duplicateName = await prisma.posKitchenStation.findFirst({
                where: { tenantId, name: validation.data.name, id: { not: id } },
            });
            if (duplicateName) {
                return NextResponse.json(
                    { success: false, error: 'Nama stasiun sudah digunakan' },
                    { status: 400 }
                );
            }
        }

        const station = await prisma.posKitchenStation.update({
            where: { id },
            data: validation.data,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'PosKitchenStation',
            entityId: id,
            oldValues: { name: existing.name, isActive: existing.isActive },
            newValues: validation.data as Record<string, unknown>,
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
        const rl = checkRateLimit(`pos:kitchen:stations:[id]:DELETE:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat menghapus stasiun dapur' },
                { status: 403 }
            );
        }

        const { id } = params;

        const existing = await prisma.posKitchenStation.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Stasiun dapur tidak ditemukan' },
                { status: 404 }
            );
        }

        // Check if station has active orders (PENDING or PREPARING)
        const activeOrders = await prisma.posKitchenOrder.count({
            where: { stationId: id, status: { in: ['PENDING', 'PREPARING'] } },
        });
        if (activeOrders > 0) {
            return NextResponse.json(
                { success: false, error: 'Tidak dapat menghapus stasiun dengan pesanan aktif. Tunggu hingga semua pesanan selesai.' },
                { status: 400 }
            );
        }

        await prisma.posKitchenStation.delete({ where: { id } });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'PosKitchenStation',
            entityId: id,
            oldValues: { name: existing.name },
            request,
        });

        return NextResponse.json({ success: true, message: 'Stasiun dapur berhasil dihapus' });
    } catch (error) {
        return handleApiError(error);
    }
}
