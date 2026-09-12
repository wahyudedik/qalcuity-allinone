export const dynamic = 'force-dynamic';

/**
 * Admin API - Rate Limit Monitoring Dashboard
 *
 * GET  /api/admin/rate-limits          - Get rate limit statistics
 * POST /api/admin/rate-limits          - Cleanup old logs
 *
 * Query params (GET):
 *   - period: '1h' | '24h' | '7d' (default: '24h')
 *   - limit:  number of recent entries (default: 50, max: 200)
 *
 * Hanya bisa diakses oleh ADMIN / SUPERADMIN.
 *
 * @see apps/web/lib/rate-limit-monitor.ts
 * @see apps/web/lib/rate-limit-config.ts
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getRateLimitStats, getRealtimeStats, cleanupOldLogs } from '@/lib/rate-limit-monitor';
import { getRedisHealth } from '@/lib/redis';
import { rateLimitConfig } from '@/lib/rate-limit-config';
import { handleApiError } from '@/lib/api-error';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// ============================================================
// Helpers
// ============================================================

function periodToHours(period: string | null): number {
    switch (period) {
        case '1h': return 1;
        case '7d': return 168;
        case '24h':
        default: return 24;
    }
}

// ============================================================
// GET /api/admin/rate-limits
// ============================================================

export async function GET(req: Request) {
    try {
        // Rate limiting
        const ip = getClientIp(req);
        const rateLimitResult = checkRateLimit(`api:admin:rate-limits:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Too many requests' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        // 1. Auth check - ADMIN or SUPERADMIN
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { error: 'Forbidden: Hanya ADMIN yang dapat mengakses' },
                { status: 403 }
            );
        }

        // 2. Parse query params
        const url = new URL(req.url);
        const period = url.searchParams.get('period') || '24h';
        const hours = periodToHours(period);
        const recentLimit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10), 1), 200);

        // 3. Get statistics
        const [stats, realtimeStats, redisHealth] = await Promise.all([
            getRateLimitStats(hours),
            getRealtimeStats(),
            Promise.resolve(getRedisHealth()),
        ]);

        // 4. Get configuration summary
        const configSummary = {
            default: {
                maxRequests: rateLimitConfig.default.maxRequests,
                windowMs: rateLimitConfig.default.windowMs,
            },
            rules: Object.entries(rateLimitConfig.rules).map(([name, rule]) => ({
                name,
                maxRequests: rule.maxRequests,
                windowMs: rule.windowMs,
                description: rule.description,
            })),
            skipPaths: rateLimitConfig.skipPaths,
        };

        // 5. Get recent violations
        let recentViolations: Array<{
            id: string;
            ip: string;
            endpoint: string;
            requestCount: number;
            blocked: boolean;
            createdAt: Date;
        }> = [];
        try {
            recentViolations = await prisma.rateLimitLog.findMany({
                take: recentLimit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    ip: true,
                    endpoint: true,
                    requestCount: true,
                    blocked: true,
                    createdAt: true,
                },
            });
        } catch {
            // RateLimitLog table might not exist yet
        }

        // 6. Compute block rate
        const blockRate = stats.totalRequests > 0
            ? Math.round((stats.blockedRequests / stats.totalRequests) * 10000) / 100
            : 0;

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    totalRequests: stats.totalRequests,
                    totalBlocked: stats.blockedRequests,
                    uniqueIPs: stats.uniqueIPs,
                    blockRate,
                    topIPs: stats.topIPs,
                    topRoutes: stats.topEndpoints,
                    timeRange: stats.timeRange,
                },
                realtime: realtimeStats,
                redis: redisHealth,
                recent: recentViolations,
                config: configSummary,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// ============================================================
// POST /api/admin/rate-limits (cleanup)
// ============================================================

export async function POST(req: Request) {
    try {
        // Rate limiting
        const ip = getClientIp(req);
        const rateLimitResult = checkRateLimit(`api:admin:rate-limits:POST:${ip}`, 5, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Too many requests' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        // 1. Auth check - SUPERADMIN only
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (session.user.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { error: 'Forbidden: Hanya SUPERADMIN yang dapat melakukan cleanup' },
                { status: 403 }
            );
        }

        // 2. Parse body
        const body = await req.json().catch(() => ({}));
        const retentionDays = Math.min(Math.max(body.retentionDays || 30, 7), 365);

        // 3. Cleanup
        const deletedCount = await cleanupOldLogs(retentionDays);

        return NextResponse.json({
            success: true,
            data: {
                message: `Berhasil menghapus ${deletedCount} log entries (>${retentionDays} hari)`,
                deletedCount,
                retentionDays,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
