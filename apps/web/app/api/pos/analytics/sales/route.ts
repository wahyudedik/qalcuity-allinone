import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

/**
 * GET /api/pos/analytics/sales
 *
 * Sales analytics — daily/weekly/monthly revenue, transaction count,
 * avg order value, growth %.
 *
 * Query params:
 *   - period: "daily" | "weekly" | "monthly" (default: "daily")
 *   - dateFrom: ISO date string (default: 30 days ago)
 *   - dateTo: ISO date string (default: today)
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:analytics:sales:${ip}`, 60, 60000);
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
        const period = searchParams.get('period') || 'daily';

        // Default date range: last 30 days
        const now = new Date();
        const dateTo = searchParams.get('dateTo')
            ? new Date(searchParams.get('dateTo')!)
            : now;
        const dateFrom = searchParams.get('dateFrom')
            ? new Date(searchParams.get('dateFrom')!)
            : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Ensure dateTo includes the full day
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);

        // ─── Aggregate sales data using raw SQL for efficiency ───
        // We use raw queries for GROUP BY date truncation which Prisma doesn't support natively
        const dateFormat = period === 'monthly'
            ? 'YYYY-MM'
            : period === 'weekly'
                ? 'IYYY-IW' // ISO week
                : 'YYYY-MM-DD';

        const salesData = await prisma.$queryRawUnsafe<
            Array<{
                period_date: string;
                revenue: number;
                transaction_count: number;
                avg_order_value: number;
            }>
        >(
            `SELECT
                TO_CHAR("createdAt", $1) AS period_date,
                SUM("totalAmount")::float AS revenue,
                COUNT(*)::int AS transaction_count,
                AVG("totalAmount")::float AS avg_order_value
            FROM "PosTransaction"
            WHERE "tenantId" = $2
              AND "status" = 'COMPLETED'
              AND "createdAt" >= $3
              AND "createdAt" <= $4
            GROUP BY period_date
            ORDER BY period_date ASC`,
            dateFormat,
            tenantId,
            dateFrom,
            endDate
        );

        // ─── Calculate summary stats ───
        const totalRevenue = salesData.reduce((sum, d) => sum + (d.revenue || 0), 0);
        const totalTransactions = salesData.reduce((sum, d) => sum + (d.transaction_count || 0), 0);
        const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

        // ─── Calculate growth (compare current period to previous period) ───
        const periodMs = endDate.getTime() - dateFrom.getTime();
        const prevDateFrom = new Date(dateFrom.getTime() - periodMs);
        const prevEndDate = new Date(dateFrom.getTime() - 1);

        const prevStats = await prisma.$queryRawUnsafe<
            Array<{ revenue: number; transaction_count: number }>
        >(
            `SELECT
                SUM("totalAmount")::float AS revenue,
                COUNT(*)::int AS transaction_count
            FROM "PosTransaction"
            WHERE "tenantId" = $1
              AND "status" = 'COMPLETED'
              AND "createdAt" >= $2
              AND "createdAt" <= $3`,
            tenantId,
            prevDateFrom,
            prevEndDate
        );

        const prevRevenue = prevStats[0]?.revenue || 0;
        const prevTransactions = prevStats[0]?.transaction_count || 0;
        const revenueGrowth = prevRevenue > 0
            ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
            : 0;
        const transactionGrowth = prevTransactions > 0
            ? ((totalTransactions - prevTransactions) / prevTransactions) * 100
            : 0;

        // ─── Payment method breakdown ───
        const paymentBreakdown = await prisma.$queryRawUnsafe<
            Array<{ method: string; count: number; total: number }>
        >(
            `SELECT
                "paymentMethod" AS method,
                COUNT(*)::int AS count,
                SUM("totalAmount")::float AS total
            FROM "PosTransaction"
            WHERE "tenantId" = $1
              AND "status" = 'COMPLETED'
              AND "createdAt" >= $2
              AND "createdAt" <= $3
            GROUP BY "paymentMethod"
            ORDER BY total DESC`,
            tenantId,
            dateFrom,
            endDate
        );

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    totalRevenue,
                    totalTransactions,
                    avgOrderValue,
                    revenueGrowth: Math.round(revenueGrowth * 100) / 100,
                    transactionGrowth: Math.round(transactionGrowth * 100) / 100,
                },
                timeline: salesData.map((d) => ({
                    date: d.period_date,
                    revenue: Math.round((d.revenue || 0) * 100) / 100,
                    transactions: d.transaction_count,
                    avgOrderValue: d.transaction_count > 0
                        ? Math.round(((d.revenue || 0) / d.transaction_count) * 100) / 100
                        : 0,
                })),
                paymentBreakdown: paymentBreakdown.map((p) => ({
                    method: p.method,
                    count: p.count,
                    total: Math.round((p.total || 0) * 100) / 100,
                })),
                period,
                dateFrom: dateFrom.toISOString(),
                dateTo: endDate.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
