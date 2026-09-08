import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';

/**
 * GET /api/pos/analytics/hours
 *
 * Hourly heatmap — transactions & revenue per hour per day of week.
 * Returns a 7×24 matrix (7 days × 24 hours) for heatmap visualization.
 *
 * Query params:
 *   - dateFrom: ISO date string (default: 30 days ago)
 *   - dateTo: ISO date string (default: today)
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:analytics:hours:${ip}`, 60, 60000);
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
        const now = new Date();
        const dateTo = searchParams.get('dateTo')
            ? new Date(searchParams.get('dateTo')!)
            : now;
        const dateFrom = searchParams.get('dateFrom')
            ? new Date(searchParams.get('dateFrom')!)
            : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);

        // ─── Hourly heatmap data ───
        // Day of week: 0=Sunday, 1=Monday, ..., 6=Saturday
        const heatmapData = await prisma.$queryRawUnsafe<
            Array<{
                day_of_week: number;
                hour: number;
                transaction_count: number;
                revenue: number;
            }>
        >(
            `SELECT
                EXTRACT(DOW FROM "createdAt")::int AS day_of_week,
                EXTRACT(HOUR FROM "createdAt")::int AS hour,
                COUNT(*)::int AS transaction_count,
                SUM("totalAmount")::float AS revenue
            FROM "PosTransaction"
            WHERE "tenantId" = $1
              AND "status" = 'COMPLETED'
              AND "createdAt" >= $2
              AND "createdAt" <= $3
            GROUP BY day_of_week, hour
            ORDER BY day_of_week, hour`,
            tenantId,
            dateFrom,
            endDate
        );

        // ─── Build 7×24 matrix ───
        const transactionsByDayHour: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
        const revenueByDayHour: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

        for (const row of heatmapData) {
            const day = row.day_of_week;
            const hour = row.hour;
            if (day >= 0 && day <= 6 && hour >= 0 && hour <= 23) {
                transactionsByDayHour[day][hour] = row.transaction_count;
                revenueByDayHour[day][hour] = Math.round((row.revenue || 0) * 100) / 100;
            }
        }

        // ─── Find peak hours ───
        let maxTransactions = 0;
        let peakDay = 0;
        let peakHour = 0;

        for (let d = 0; d < 7; d++) {
            for (let h = 0; h < 24; h++) {
                if (transactionsByDayHour[d][h] > maxTransactions) {
                    maxTransactions = transactionsByDayHour[d][h];
                    peakDay = d;
                    peakHour = h;
                }
            }
        }

        // ─── Summary stats ───
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const totalTransactionsPerDay = transactionsByDayHour.map((day) =>
            day.reduce((sum, count) => sum + count, 0)
        );
        const totalRevenuePerDay = revenueByDayHour.map((day) =>
            day.reduce((sum, rev) => sum + rev, 0)
        );

        // Busiest day
        let busiestDayIndex = 0;
        let maxDayTransactions = 0;
        for (let d = 0; d < 7; d++) {
            if (totalTransactionsPerDay[d] > maxDayTransactions) {
                maxDayTransactions = totalTransactionsPerDay[d];
                busiestDayIndex = d;
            }
        }

        // Busiest hour across all days
        const totalTransactionsPerHour = Array(24).fill(0) as number[];
        for (let h = 0; h < 24; h++) {
            for (let d = 0; d < 7; d++) {
                totalTransactionsPerHour[h] += transactionsByDayHour[d][h];
            }
        }
        let busiestHourIndex = 0;
        let maxHourTransactions = 0;
        for (let h = 0; h < 24; h++) {
            if (totalTransactionsPerHour[h] > maxHourTransactions) {
                maxHourTransactions = totalTransactionsPerHour[h];
                busiestHourIndex = h;
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                heatmap: {
                    transactions: transactionsByDayHour,
                    revenue: revenueByDayHour,
                },
                summary: {
                    busiestDay: dayNames[busiestDayIndex],
                    busiestDayTransactions: maxDayTransactions,
                    busiestHour: `${busiestHourIndex.toString().padStart(2, '0')}:00`,
                    busiestHourTransactions: maxHourTransactions,
                    peakHour: maxTransactions > 0
                        ? `${dayNames[peakDay]} ${peakHour.toString().padStart(2, '0')}:00`
                        : '-',
                    peakTransactions: maxTransactions,
                },
                totalsByDay: dayNames.map((name, i) => ({
                    day: name,
                    transactions: totalTransactionsPerDay[i],
                    revenue: Math.round(totalRevenuePerDay[i] * 100) / 100,
                })),
                totalsByHour: totalTransactionsPerHour.map((count, h) => ({
                    hour: `${h.toString().padStart(2, '0')}:00`,
                    transactions: count,
                })),
                dateFrom: dateFrom.toISOString(),
                dateTo: endDate.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
