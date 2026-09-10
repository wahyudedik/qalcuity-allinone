export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:kitchen:stats:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get counts by status for today's orders
        const [
            totalToday,
            pendingCount,
            preparingCount,
            readyCount,
            servedCount,
            cancelledCount,
            stationsWithActiveOrders,
            avgCompletionTime,
        ] = await Promise.all([
            // Total orders today
            prisma.posKitchenOrder.count({
                where: {
                    tenantId,
                    createdAt: { gte: today, lt: tomorrow },
                },
            }),
            // PENDING orders
            prisma.posKitchenOrder.count({
                where: {
                    tenantId,
                    status: 'PENDING',
                    createdAt: { gte: today, lt: tomorrow },
                },
            }),
            // PREPARING orders
            prisma.posKitchenOrder.count({
                where: {
                    tenantId,
                    status: 'PREPARING',
                    createdAt: { gte: today, lt: tomorrow },
                },
            }),
            // READY orders (waiting to be served)
            prisma.posKitchenOrder.count({
                where: {
                    tenantId,
                    status: 'READY',
                    createdAt: { gte: today, lt: tomorrow },
                },
            }),
            // SERVED orders
            prisma.posKitchenOrder.count({
                where: {
                    tenantId,
                    status: 'SERVED',
                    createdAt: { gte: today, lt: tomorrow },
                },
            }),
            // CANCELLED orders
            prisma.posKitchenOrder.count({
                where: {
                    tenantId,
                    status: 'CANCELLED',
                    createdAt: { gte: today, lt: tomorrow },
                },
            }),
            // Stations with active orders
            prisma.posKitchenStation.findMany({
                where: {
                    tenantId,
                    isActive: true,
                },
                include: {
                    _count: {
                        select: {
                            orders: {
                                where: { status: { in: ['PENDING', 'PREPARING'] } },
                            },
                        },
                    },
                },
                orderBy: { sortOrder: 'asc' },
            }),
            // Average completion time (from startedAt to completedAt)
            prisma.posKitchenOrder.aggregate({
                where: {
                    tenantId,
                    startedAt: { not: null },
                    completedAt: { not: null },
                    createdAt: { gte: today, lt: tomorrow },
                },
                _avg: {
                    estimatedMinutes: true,
                },
            }),
        ]);

        // Calculate average actual time from completed orders today
        const completedOrders = await prisma.posKitchenOrder.findMany({
            where: {
                tenantId,
                startedAt: { not: null },
                completedAt: { not: null },
                createdAt: { gte: today, lt: tomorrow },
            },
            select: {
                startedAt: true,
                completedAt: true,
            },
        });

        let avgActualMinutes: number | null = null;
        if (completedOrders.length > 0) {
            const totalMinutes = completedOrders.reduce((sum, order) => {
                const diff = order.completedAt!.getTime() - order.startedAt!.getTime();
                return sum + diff / (1000 * 60);
            }, 0);
            avgActualMinutes = Math.round(totalMinutes / completedOrders.length);
        }

        const data = {
            today: {
                total: totalToday,
                pending: pendingCount,
                preparing: preparingCount,
                ready: readyCount,
                served: servedCount,
                cancelled: cancelledCount,
            },
            avgEstimatedMinutes: avgCompletionTime._avg.estimatedMinutes
                ? Math.round(avgCompletionTime._avg.estimatedMinutes)
                : null,
            avgActualMinutes,
            stations: stationsWithActiveOrders.map((station) => ({
                id: station.id,
                name: station.name,
                activeOrderCount: station._count.orders,
            })),
        };

        return NextResponse.json({ success: true, data });
    } catch (error) {
        // Graceful fallback: PosKitchenOrder/PosKitchenStation tables not yet available (migration pending)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
            console.warn('[Kitchen Stats API] Kitchen tables not found â€” returning empty fallback');
            return NextResponse.json({
                success: true,
                data: {
                    today: { total: 0, pending: 0, preparing: 0, ready: 0, served: 0, cancelled: 0 },
                    avgEstimatedMinutes: null,
                    avgActualMinutes: null,
                    stations: [],
                },
            });
        }
        return handleApiError(error);
    }
}
