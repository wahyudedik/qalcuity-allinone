/**
 * Admin API — Rate Limit Monitoring Dashboard
 *
 * GET  /api/admin/rate-limits          — Get rate limit statistics
 * POST /api/admin/rate-limits/cleanup  — Cleanup old logs
 *
 * Hanya bisa diakses oleh SUPERADMIN.
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

// ============================================================
// GET /api/admin/rate-limits
// ============================================================

export async function GET(req: Request) {
    try {
        // 1. Auth check — SUPERADMIN only
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (session.user.role !== 'SUPERADMIN') {
            return NextResponse.json({ error: 'Forbidden: Hanya SUPERADMIN yang dapat mengakses' }, { status: 403 });
        }

        // 2. Parse query params
        const url = new URL(req.url);
        const hours = parseInt(url.searchParams.get('hours') || '24', 10);
        const limit = Math.min(Math.max(hours, 1), 168); // Max 7 days

        // 3. Get statistics
        const [stats, realtimeStats, redisHealth] = await Promise.all([
            getRateLimitStats(limit),
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

        // 5. Get recent violations (last 50)
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
                take: 50,
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

        return NextResponse.json({
            stats,
            realtime: realtimeStats,
            redis: redisHealth,
            config: configSummary,
            recentViolations,
        });
    } catch (error) {
        console.error('[Admin] Rate limit stats error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ============================================================
// POST /api/admin/rate-limits/cleanup
// ============================================================

export async function POST(req: Request) {
    try {
        // 1. Auth check — SUPERADMIN only
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (session.user.role !== 'SUPERADMIN') {
            return NextResponse.json({ error: 'Forbidden: Hanya SUPERADMIN yang dapat mengakses' }, { status: 403 });
        }

        // 2. Parse body
        const body = await req.json().catch(() => ({}));
        const retentionDays = Math.min(Math.max(body.retentionDays || 30, 7), 365);

        // 3. Cleanup
        const deletedCount = await cleanupOldLogs(retentionDays);

        return NextResponse.json({
            message: `Berhasil menghapus ${deletedCount} log entries (>${retentionDays} hari)`,
            deletedCount,
            retentionDays,
        });
    } catch (error) {
        console.error('[Admin] Rate limit cleanup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
