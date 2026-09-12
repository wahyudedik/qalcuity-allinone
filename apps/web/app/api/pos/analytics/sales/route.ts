export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';
import { posAnalyticsSalesQuerySchema, formatZodError } from '@/lib/validation-schemas';

/**
 * GET /api/pos/analytics/sales
 *
 * Sales analytics -- daily/weekly/monthly revenue, transaction count,
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
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const { searchParams } = new URL(request.url);
        const queryValidation = posAnalyticsSalesQuerySchema.safeParse(
            Object.fromEntries(searchParams.entries())
        );
        if (!queryValidation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(queryValidation.error) },
                { status: 400 }
            );
        }
        const { period, dateFrom: dateFromStr, dateTo: dateToStr } = queryValidation.data;

        // Default date range: last 30 days
        const now = new Date();
        const dateTo = dateToStr ? new Date(dateToStr) : now;
        const dateFrom = dateFromStr
            ? new Date(dateFromStr)
            : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Ensure dateTo includes the full day
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);

        // --- Aggregate sales data using raw SQL for efficiency ---
        // We use raw queries for GROUP BY date truncation which Prisma doesn't support natively
        const dateFormat = period === 'monthly'
            ? 'YYYY-MM'
            : period === 'weekly'
                ? 'IYYY-IW' // ISO week
                : 'YYYY-MM-DD';

        const salesData = await prisma.$queryRaw<
            Array<{
                period_date: string;
                revenue: number;
                transaction_count: number;
                avg_order_value: number;
            }>
        >(
            Prisma.sql`SELECT
                TO_CHAR("createdAt", ${dateFormat}) AS period_date,
                SUM("totalAmount")::float AS revenue,
                COUNT(*)::int AS transaction_count,
                AVG("totalAmount")::float AS avg_order_value
            FROM "PosTransaction"
            WHERE "tenantId" = ${tenantId}
              AND "status" = 'COMPLETED'
              AND "createdAt" >= ${dateFrom}
              AND "createdAt" <= ${endDate}
            GROUP BY period_date
            ORDER BY period_date ASC`
        );

        // --- Calculate summary stats ---
        const totalRevenue = salesData.reduce((sum, d) => sum + (d.revenue || 0), 0);
        const totalTransactions = salesData.reduce((sum, d) => sum + (d.transaction_count || 0), 0);
        const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

        // --- Calculate growth (compare current period to previous period) ---
        const periodMs = endDate.getTime() - dateFrom.getTime();
        const prevDateFrom = new Date(dateFrom.getTime() - periodMs);
        const prevEndDate = new Date(dateFrom.getTime() - 1);

        const prevStats = await prisma.$queryRaw<
            Array<{ revenue: number; transaction_count: number }>
        >(
            Prisma.sql`SELECT
                SUM("totalAmount")::float AS revenue,
                COUNT(*)::int AS transaction_count
            FROM "PosTransaction"
            WHERE "tenantId" = ${tenantId}
              AND "status" = 'COMPLETED'
              AND "createdAt" >= ${prevDateFrom}
              AND "createdAt" <= ${prevEndDate}`
        );

        const prevRevenue = prevStats[0]?.revenue || 0;
        const prevTransactions = prevStats[0]?.transaction_count || 0;
        const revenueGrowth = prevRevenue > 0
            ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
            : 0;
        const transactionGrowth = prevTransactions > 0
            ? ((totalTransactions - prevTransactions) / prevTransactions) * 100
            : 0;

        // --- Payment method breakdown ---
        const paymentBreakdown = await prisma.$queryRaw<
            Array<{ method: string; count: number; total: number }>
        >(
            Prisma.sql`SELECT
                "paymentMethod" AS method,
                COUNT(*)::int AS count,
                SUM("totalAmount")::float AS total
            FROM "PosTransaction"
            WHERE "tenantId" = ${tenantId}
              AND "status" = 'COMPLETED'
              AND "createdAt" >= ${dateFrom}
              AND "createdAt" <= ${endDate}
            GROUP BY "paymentMethod"
            ORDER BY total DESC`
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
