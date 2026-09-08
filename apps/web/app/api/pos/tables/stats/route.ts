import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:tables:stats:${ip}`, 100, 60000);
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

        const [
            totalTables,
            availableCount,
            occupiedCount,
            reservedCount,
            cleaningCount,
            disabledCount,
            activeReservationsToday,
            totalReservationsToday,
        ] = await Promise.all([
            // Total active tables
            prisma.posTable.count({
                where: { tenantId, isActive: true },
            }),
            // Available tables
            prisma.posTable.count({
                where: { tenantId, status: 'AVAILABLE', isActive: true },
            }),
            // Occupied tables
            prisma.posTable.count({
                where: { tenantId, status: 'OCCUPIED', isActive: true },
            }),
            // Reserved tables
            prisma.posTable.count({
                where: { tenantId, status: 'RESERVED', isActive: true },
            }),
            // Cleaning tables
            prisma.posTable.count({
                where: { tenantId, status: 'CLEANING', isActive: true },
            }),
            // Disabled tables
            prisma.posTable.count({
                where: { tenantId, status: 'DISABLED' },
            }),
            // Active reservations today (CONFIRMED or SEATED)
            prisma.posTableReservation.count({
                where: {
                    tenantId,
                    status: { in: ['CONFIRMED', 'SEATED'] },
                    reservationTime: { gte: today, lt: tomorrow },
                },
            }),
            // Total reservations today (all statuses)
            prisma.posTableReservation.count({
                where: {
                    tenantId,
                    reservationTime: { gte: today, lt: tomorrow },
                },
            }),
        ]);

        // Calculate utilization rate
        const activeTables = totalTables - disabledCount;
        const utilizationRate = activeTables > 0
            ? Math.round(((occupiedCount + reservedCount) / activeTables) * 100)
            : 0;

        // Get total capacity
        const capacityResult = await prisma.posTable.aggregate({
            where: { tenantId, isActive: true },
            _sum: { capacity: true },
        });
        const totalCapacity = capacityResult._sum.capacity || 0;

        // Get zone breakdown
        const zoneBreakdown = await prisma.posTable.groupBy({
            by: ['zone'],
            where: { tenantId, isActive: true, zone: { not: null } },
            _count: { id: true },
        });

        const data = {
            tables: {
                total: totalTables,
                active: activeTables,
                available: availableCount,
                occupied: occupiedCount,
                reserved: reservedCount,
                cleaning: cleaningCount,
                disabled: disabledCount,
            },
            capacity: {
                total: totalCapacity,
            },
            utilization: {
                rate: utilizationRate,
                occupiedOrReserved: occupiedCount + reservedCount,
            },
            reservations: {
                activeToday: activeReservationsToday,
                totalToday: totalReservationsToday,
            },
            zones: zoneBreakdown
                .filter((z) => z.zone !== null)
                .map((z) => ({
                    name: z.zone,
                    count: z._count.id,
                })),
        };

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}
