export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';
import { Prisma } from '@prisma/client';
import { getRedisClient } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { posAnalyticsQuerySchema, formatZodError } from '@/lib/validation-schemas';

/** TTL for analytics cache in seconds (5 minutes). */
const ANALYTICS_CACHE_TTL = 300;

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:analytics:${ip}`, 60, 60000);
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
        const queryValidation = posAnalyticsQuerySchema.safeParse(
            Object.fromEntries(searchParams.entries())
        );
        if (!queryValidation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(queryValidation.error) },
                { status: 400 }
            );
        }
        const { period, startDate, endDate } = queryValidation.data;

        // Build date filter
        const now = new Date();
        let dateFrom: Date;
        let dateTo: Date = new Date(now);
        dateTo.setHours(23, 59, 59, 999);

        if (startDate && endDate) {
            dateFrom = new Date(startDate);
            dateTo = new Date(endDate);
            dateTo.setHours(23, 59, 59, 999);
        } else {
            switch (period) {
                case 'daily':
                    dateFrom = new Date(now);
                    dateFrom.setHours(0, 0, 0, 0);
                    break;
                case 'weekly':
                    dateFrom = new Date(now);
                    dateFrom.setDate(dateFrom.getDate() - 7);
                    break;
                case 'monthly':
                    dateFrom = new Date(now);
                    dateFrom.setMonth(dateFrom.getMonth() - 1);
                    break;
                default:
                    dateFrom = new Date(now);
                    dateFrom.setDate(dateFrom.getDate() - 30);
            }
        }

        // ──────────────────────────────────────────────────────────
        // REDIS CACHE: Build deterministic cache key and check
        // for a cached response before hitting the database.
        // ──────────────────────────────────────────────────────────
        const cacheKey = `pos:analytics:${tenantId}:${period}:${startDate || ''}:${endDate || ''}`;
        let cached = false;

        try {
            const redis = await getRedisClient();
            if (redis) {
                const cachedRaw = await redis.get(cacheKey);
                if (cachedRaw) {
                    const cachedData = JSON.parse(cachedRaw) as Record<string, unknown>;
                    cached = true;
                    logger.info(`[POS Analytics] Cache HIT for key: ${cacheKey}`);
                    return NextResponse.json({
                        ...cachedData,
                        cached: true,
                        cacheKey,
                    });
                }
                logger.info(`[POS Analytics] Cache MISS for key: ${cacheKey}`);
            }
        } catch (cacheErr) {
            // Redis unavailable — skip cache gracefully
            logger.warn('[POS Analytics] Cache read failed, proceeding with DB query', {
                error: cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
            });
        }

        // ──────────────────────────────────────────────────────────
        // OPTIMIZATION: Run all aggregation queries in parallel at
        // the database level instead of fetching all transactions
        // and grouping in JavaScript. This moves computation to
        // PostgreSQL where indexes can be leveraged.
        // ──────────────────────────────────────────────────────────
        const [
            salesByPeriodRaw,
            topProductsRaw,
            salesByCategoryRaw,
            hourlyTrendRaw,
            paymentMethodBreakdownRaw,
            totalTxCount,
        ] = await Promise.all([
            // 1. Sales by period — GROUP BY date at DB level
            prisma.$queryRaw<{ date: Date; total: number; count: bigint }[]>(
                Prisma.sql`
                    SELECT
                        DATE_TRUNC('day', "createdAt")::date AS date,
                        SUM("totalAmount")::double precision AS total,
                        COUNT(*)::bigint AS count
                    FROM "PosTransaction"
                    WHERE "tenantId" = ${tenantId}
                      AND "status" = 'COMPLETED'
                      AND "createdAt" >= ${dateFrom}
                      AND "createdAt" <= ${dateTo}
                    GROUP BY DATE_TRUNC('day', "createdAt")
                    ORDER BY date ASC
                `
            ),

            // 2. Top products — GROUP BY productName at DB level, top 10
            prisma.posTransactionItem.groupBy({
                by: ['productName'],
                where: {
                    tenantId,
                    transaction: {
                        status: 'COMPLETED',
                        createdAt: { gte: dateFrom, lte: dateTo },
                    },
                },
                _sum: { subtotal: true, quantity: true },
                orderBy: { _sum: { subtotal: 'desc' } },
                take: 10,
            }),

            // 3. Sales by category — JOIN through Product → Category at DB level
            prisma.$queryRaw<{ category: string; quantity: number; revenue: number }[]>(
                Prisma.sql`
                    SELECT
                        COALESCE(c."name", 'Lainnya') AS category,
                        SUM(pi."quantity")::double precision AS quantity,
                        SUM(pi."subtotal")::double precision AS revenue
                    FROM "PosTransactionItem" pi
                    INNER JOIN "PosTransaction" pt ON pt."id" = pi."transactionId"
                    LEFT JOIN "Product" p ON p."id" = pi."productId"
                    LEFT JOIN "Category" c ON c."id" = p."categoryId"
                    WHERE pi."tenantId" = ${tenantId}
                      AND pt."status" = 'COMPLETED'
                      AND pt."createdAt" >= ${dateFrom}
                      AND pt."createdAt" <= ${dateTo}
                    GROUP BY c."name"
                    ORDER BY revenue DESC
                `
            ),

            // 4. Hourly trend — GROUP BY hour at DB level
            prisma.$queryRaw<{ hour: number; count: bigint; total: number }[]>(
                Prisma.sql`
                    SELECT
                        EXTRACT(HOUR FROM "createdAt")::int AS hour,
                        COUNT(*)::bigint AS count,
                        SUM("totalAmount")::double precision AS total
                    FROM "PosTransaction"
                    WHERE "tenantId" = ${tenantId}
                      AND "status" = 'COMPLETED'
                      AND "createdAt" >= ${dateFrom}
                      AND "createdAt" <= ${dateTo}
                    GROUP BY EXTRACT(HOUR FROM "createdAt")
                    ORDER BY hour ASC
                `
            ),

            // 5. Payment method breakdown — GROUP BY paymentMethod at DB level
            prisma.posTransaction.groupBy({
                by: ['paymentMethod'],
                where: {
                    tenantId,
                    status: 'COMPLETED',
                    createdAt: { gte: dateFrom, lte: dateTo },
                },
                _count: true,
                _sum: { totalAmount: true },
            }),

            // 6. Total transaction count — single COUNT query
            prisma.posTransaction.count({
                where: {
                    tenantId,
                    status: 'COMPLETED',
                    createdAt: { gte: dateFrom, lte: dateTo },
                },
            }),
        ]);

        // ──────────────────────────────────────────────────────────
        // Transform results to match the original response format
        // ──────────────────────────────────────────────────────────

        // 1. Sales by period
        const salesByPeriod = salesByPeriodRaw.map((row) => ({
            date: row.date instanceof Date
                ? row.date.toISOString().split('T')[0]
                : String(row.date).split('T')[0],
            total: Number(row.total),
            count: Number(row.count),
        }));

        // 2. Top products (top 10 by quantity sold)
        const topProducts = topProductsRaw.map((row) => ({
            name: row.productName,
            quantity: Number(row._sum.quantity ?? 0),
            revenue: Number(row._sum.subtotal ?? 0),
        }));

        // 3. Sales by category
        const salesByCategory = salesByCategoryRaw.map((row) => ({
            category: row.category,
            quantity: Number(row.quantity),
            revenue: Number(row.revenue),
        }));

        // 4. Hourly trend — ensure all 24 hours are present (0-23)
        const hourlyMap = new Map<number, { count: number; total: number }>();
        for (let h = 0; h < 24; h++) {
            hourlyMap.set(h, { count: 0, total: 0 });
        }
        for (const row of hourlyTrendRaw) {
            hourlyMap.set(Number(row.hour), {
                count: Number(row.count),
                total: Number(row.total),
            });
        }
        const hourlyTrend = Array.from(hourlyMap.entries())
            .map(([hour, v]) => ({ hour, ...v }));

        // 5. Payment method breakdown
        const paymentMethodBreakdown = paymentMethodBreakdownRaw
            .map((row) => ({
                method: row.paymentMethod,
                count: row._count,
                total: Number(row._sum.totalAmount ?? 0),
                percentage: totalTxCount > 0
                    ? Math.round((row._count / totalTxCount) * 100)
                    : 0,
            }))
            .sort((a, b) => b.total - a.total);

        const responseData = {
            success: true,
            data: {
                salesByPeriod,
                topProducts,
                salesByCategory,
                hourlyTrend,
                paymentMethodBreakdown,
                meta: {
                    period,
                    startDate: dateFrom.toISOString(),
                    endDate: dateTo.toISOString(),
                    totalTransactions: totalTxCount,
                },
            },
            cached: false,
            cacheKey,
        };

        // ──────────────────────────────────────────────────────────
        // REDIS CACHE: Store the freshly computed response so
        // subsequent requests within the TTL window are served
        // directly from cache, skipping all 6 DB queries.
        // ──────────────────────────────────────────────────────────
        try {
            const redis = await getRedisClient();
            if (redis) {
                await redis.setex(cacheKey, ANALYTICS_CACHE_TTL, JSON.stringify(responseData));
                logger.info(`[POS Analytics] Cache SET for key: ${cacheKey} (TTL: ${ANALYTICS_CACHE_TTL}s)`);
            }
        } catch (cacheErr) {
            // Redis unavailable — skip cache write gracefully
            logger.warn('[POS Analytics] Cache write failed', {
                error: cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
            });
        }

        return NextResponse.json(responseData);
    } catch (error) {
        return handleApiError(error);
    }
}
