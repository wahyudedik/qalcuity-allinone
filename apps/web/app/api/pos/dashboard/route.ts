export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';
import { getRedisClient } from '@/lib/redis';
import { logger } from '@/lib/logger';

/** TTL for dashboard cache in seconds (5 minutes). */
const DASHBOARD_CACHE_TTL = 300;

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:dashboard:${ip}`, 100, 60000);
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

        // ──────────────────────────────────────────────────────────
        // REDIS CACHE: Build deterministic cache key and check
        // for a cached response before hitting the database.
        // ──────────────────────────────────────────────────────────
        const dateKey = today.toISOString().split('T')[0]; // e.g. "2026-09-11"
        const cacheKey = `pos:dashboard:${tenantId}:${dateKey}`;
        let cached = false;

        try {
            const redis = await getRedisClient();
            if (redis) {
                const cachedRaw = await redis.get(cacheKey);
                if (cachedRaw) {
                    const cachedData = JSON.parse(cachedRaw) as Record<string, unknown>;
                    cached = true;
                    logger.info(`[POS Dashboard] Cache HIT for key: ${cacheKey}`);
                    return NextResponse.json({
                        ...cachedData,
                        cached: true,
                        cacheKey,
                    });
                }
                logger.info(`[POS Dashboard] Cache MISS for key: ${cacheKey}`);
            }
        } catch (cacheErr) {
            // Redis unavailable — skip cache gracefully
            logger.warn('[POS Dashboard] Cache read failed, proceeding with DB query', {
                error: cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
            });
        }

        // ──────────────────────────────────────────────────────────
        // DB QUERIES: Run all dashboard queries in parallel.
        // ──────────────────────────────────────────────────────────
        const [
            totalTransactions,
            activeSessions,
            todayTransactions,
            recentTransactions,
            paymentMethodSummary,
        ] = await Promise.all([
            prisma.posTransaction.count({
                where: { tenantId, status: 'COMPLETED' },
            }),
            prisma.posSession.count({
                where: { tenantId, status: 'OPEN' },
            }),
            prisma.posTransaction.aggregate({
                where: {
                    tenantId,
                    status: 'COMPLETED',
                    createdAt: { gte: today, lt: tomorrow },
                },
                _count: true,
                _sum: { totalAmount: true, taxAmount: true },
            }),
            prisma.posTransaction.findMany({
                where: { tenantId },
                select: {
                    id: true,
                    transactionNo: true,
                    totalAmount: true,
                    paymentMethod: true,
                    status: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            prisma.posTransaction.groupBy({
                by: ['paymentMethod'],
                where: {
                    tenantId,
                    status: 'COMPLETED',
                    createdAt: { gte: today, lt: tomorrow },
                },
                _count: true,
                _sum: { totalAmount: true },
            }),
        ]);

        const responseData = {
            success: true,
            data: {
                todaySales: todayTransactions._sum.totalAmount ? Number(todayTransactions._sum.totalAmount) : 0,
                todayTax: todayTransactions._sum.taxAmount ? Number(todayTransactions._sum.taxAmount) : 0,
                todayTransactionCount: todayTransactions._count,
                totalTransactions,
                activeSessions,
                recentTransactions: recentTransactions.map((t) => ({
                    id: t.id,
                    transactionNo: t.transactionNo,
                    totalAmount: Number(t.totalAmount),
                    paymentMethod: t.paymentMethod,
                    status: t.status,
                    createdAt: t.createdAt.toISOString(),
                })),
                paymentMethods: paymentMethodSummary.map((pm) => ({
                    method: pm.paymentMethod,
                    count: pm._count,
                    total: pm._sum.totalAmount ? Number(pm._sum.totalAmount) : 0,
                })),
            },
            cached: false,
            cacheKey,
        };

        // ──────────────────────────────────────────────────────────
        // REDIS CACHE: Store the freshly computed response so
        // subsequent requests within the TTL window are served
        // directly from cache, skipping all 5 DB queries.
        // ──────────────────────────────────────────────────────────
        try {
            const redis = await getRedisClient();
            if (redis) {
                await redis.setex(cacheKey, DASHBOARD_CACHE_TTL, JSON.stringify(responseData));
                logger.info(`[POS Dashboard] Cache SET for key: ${cacheKey} (TTL: ${DASHBOARD_CACHE_TTL}s)`);
            }
        } catch (cacheErr) {
            // Redis unavailable — skip cache write gracefully
            logger.warn('[POS Dashboard] Cache write failed', {
                error: cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
            });
        }

        return NextResponse.json(responseData);
    } catch (error) {
        return handleApiError(error);
    }
}
