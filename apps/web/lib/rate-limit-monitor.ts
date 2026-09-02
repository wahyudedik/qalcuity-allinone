/**
 * Rate Limit Monitor — Logging, analytics, dan alerting.
 *
 * Features:
 *   - Log rate limit violations ke console (selalu)
 *   - Log ke database jika RateLimitLog model tersedia
 *   - Detect suspicious patterns (brute force, DDoS)
 *   - Alert callbacks untuk security monitoring
 *   - Aggregated statistics untuk dashboard
 *
 * @see packages/db/prisma/schema.prisma — RateLimitLog model
 * @see apps/web/app/api/admin/rate-limits/route.ts
 */

import { prisma } from '@/lib/db';
import { isRedisAvailable, getRedisClient } from '@/lib/redis';

// ============================================================
// Types
// ============================================================

export interface RateLimitViolation {
    ip: string;
    pathname: string;
    tenantId?: string;
    requestCount: number;
    maxRequests: number;
    windowStart: Date;
    windowEnd: Date;
    blocked: boolean;
    userAgent?: string;
}

export interface RateLimitStats {
    totalRequests: number;
    blockedRequests: number;
    uniqueIPs: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
    topIPs: Array<{ ip: string; count: number }>;
    timeRange: { from: Date; to: Date };
}

export interface SuspiciousPattern {
    type: 'brute_force' | 'ddos' | 'scraping' | 'scan';
    ip: string;
    confidence: number;
    details: string;
}

// ============================================================
// Violation Logging
// ============================================================

/**
 * Log rate limit violation.
 * Selalu log ke console; optional ke database.
 *
 * @param violation - Violation details
 */
export async function logRateLimitViolation(violation: RateLimitViolation): Promise<void> {
    // 1. Console log (always)
    const level = violation.blocked ? 'BLOCKED' : 'VIOLATED';
    console.warn(
        `[RateLimit] ${level}: IP=${violation.ip} ` +
        `endpoint=${violation.pathname} ` +
        `requests=${violation.requestCount}/${violation.maxRequests} ` +
        `window=${violation.windowStart.toISOString()}-${violation.windowEnd.toISOString()}`
    );

    // 2. Database log (async, non-blocking)
    try {
        await prisma.rateLimitLog.create({
            data: {
                ip: violation.ip,
                endpoint: violation.pathname,
                tenantId: violation.tenantId || null,
                requestCount: violation.requestCount,
                windowStart: violation.windowStart,
                windowEnd: violation.windowEnd,
                blocked: violation.blocked,
            },
        });
    } catch {
        // Database might not have RateLimitLog table yet, or DB is down
        // Silently fail — rate limiting should never crash the app
    }

    // 3. Redis counter for aggregated stats (non-blocking)
    try {
        if (isRedisAvailable()) {
            const redis = await getRedisClient();
            if (redis) {
                const today = new Date().toISOString().split('T')[0];
                await redis.pipeline()
                    .incr(`rl:stats:violations:${today}`)
                    .incr(`rl:stats:violations:ip:${violation.ip}:${today}`)
                    .incr(`rl:stats:violations:endpoint:${violation.pathname}:${today}`)
                    .expire(`rl:stats:violations:${today}`, 86400 * 7)
                    .expire(`rl:stats:violations:ip:${violation.ip}:${today}`, 86400 * 7)
                    .expire(`rl:stats:violations:endpoint:${violation.pathname}:${today}`, 86400 * 7)
                    .exec();
            }
        }
    } catch {
        // Redis stats are best-effort
    }
}

// ============================================================
// Suspicious Pattern Detection
// ============================================================

/**
 * Check for suspicious patterns dari IP tertentu.
 *
 * @param ip - Client IP to analyze
 * @param pathname - Requested endpoint
 * @returns Array of detected patterns
 */
export async function detectSuspiciousPatterns(
    ip: string,
    pathname: string
): Promise<SuspiciousPattern[]> {
    const patterns: SuspiciousPattern[] = [];

    try {
        // Check auth endpoint abuse (brute force)
        if (pathname.startsWith('/api/auth/')) {
            const authViolations = await prisma.rateLimitLog.count({
                where: {
                    ip,
                    endpoint: { startsWith: '/api/auth/' },
                    blocked: true,
                    createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
                },
            });

            if (authViolations >= 3) {
                patterns.push({
                    type: 'brute_force',
                    ip,
                    confidence: Math.min(0.95, 0.5 + authViolations * 0.1),
                    details: `${authViolations} blocked auth attempts in the last hour`,
                });
            }
        }

        // Check overall request volume (DDoS / scraping)
        const recentViolations = await prisma.rateLimitLog.count({
            where: {
                ip,
                createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) }, // Last 15 min
            },
        });

        if (recentViolations >= 5) {
            patterns.push({
                type: 'ddos',
                ip,
                confidence: Math.min(0.9, 0.3 + recentViolations * 0.1),
                details: `${recentViolations} rate limit violations in 15 minutes`,
            });
        }

        // Check for endpoint scanning (many different endpoints)
        const uniqueEndpoints = await prisma.rateLimitLog.groupBy({
            by: ['endpoint'],
            where: {
                ip,
                createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
            },
        });

        if (uniqueEndpoints.length >= 10) {
            patterns.push({
                type: 'scan',
                ip,
                confidence: Math.min(0.85, 0.3 + uniqueEndpoints.length * 0.05),
                details: `Accessed ${uniqueEndpoints.length} unique endpoints in 15 minutes`,
            });
        }
    } catch {
        // Pattern detection is best-effort
    }

    return patterns;
}

// ============================================================
// Statistics
// ============================================================

/**
 * Get rate limit statistics untuk admin dashboard.
 *
 * @param hours - Time range in hours (default: 24)
 * @returns Aggregated statistics
 */
export async function getRateLimitStats(hours: number = 24): Promise<RateLimitStats> {
    const from = new Date(Date.now() - hours * 60 * 60 * 1000);
    const to = new Date();

    try {
        const [totalRequests, blockedRequests, uniqueIPs, topEndpoints, topIPs] =
            await Promise.all([
                prisma.rateLimitLog.count({
                    where: { createdAt: { gte: from } },
                }),
                prisma.rateLimitLog.count({
                    where: {
                        blocked: true,
                        createdAt: { gte: from },
                    },
                }),
                prisma.rateLimitLog.groupBy({
                    by: ['ip'],
                    where: { createdAt: { gte: from } },
                }),
                prisma.rateLimitLog.groupBy({
                    by: ['endpoint'],
                    _count: { id: true },
                    where: { createdAt: { gte: from } },
                    orderBy: { _count: { id: 'desc' } },
                    take: 10,
                }),
                prisma.rateLimitLog.groupBy({
                    by: ['ip'],
                    _count: { id: true },
                    orderBy: { _count: { id: 'desc' } },
                    take: 10,
                    where: { createdAt: { gte: from } },
                }),
            ]);

        return {
            totalRequests,
            blockedRequests,
            uniqueIPs: uniqueIPs.length,
            topEndpoints: topEndpoints.map((e: { endpoint: string; _count: { id: number } }) => ({
                endpoint: e.endpoint,
                count: e._count.id,
            })),
            topIPs: topIPs.map((ip: { ip: string; _count: { id: number } }) => ({
                ip: ip.ip,
                count: ip._count.id,
            })),
            timeRange: { from, to },
        };
    } catch {
        // Return empty stats if table doesn't exist
        return {
            totalRequests: 0,
            blockedRequests: 0,
            uniqueIPs: 0,
            topEndpoints: [],
            topIPs: [],
            timeRange: { from, to },
        };
    }
}

/**
 * Get real-time stats dari Redis (jika tersedia).
 *
 * @returns Today's aggregated stats
 */
export async function getRealtimeStats(): Promise<{
    todayViolations: number;
    todayBlocked: number;
    redisAvailable: boolean;
}> {
    if (!isRedisAvailable()) {
        return { todayViolations: 0, todayBlocked: 0, redisAvailable: false };
    }

    const redis = await getRedisClient();
    if (!redis) {
        return { todayViolations: 0, todayBlocked: 0, redisAvailable: false };
    }

    try {
        const today = new Date().toISOString().split('T')[0];
        const violations = await redis.get(`rl:stats:violations:${today}`);

        return {
            todayViolations: parseInt(violations || '0', 10),
            todayBlocked: 0,
            redisAvailable: true,
        };
    } catch {
        return { todayViolations: 0, todayBlocked: 0, redisAvailable: true };
    }
}

/**
 * Cleanup old rate limit logs (untuk retention policy).
 * Default: hapus logs lebih dari 30 hari.
 *
 * @param retentionDays - Days to keep (default: 30)
 * @returns Number of deleted records
 */
export async function cleanupOldLogs(retentionDays: number = 30): Promise<number> {
    try {
        const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
        const result = await prisma.rateLimitLog.deleteMany({
            where: {
                createdAt: { lt: cutoff },
            },
        });
        if (result.count > 0) {
            console.log(`[RateLimit] Cleaned up ${result.count} old log entries (>${retentionDays} days)`);
        }
        return result.count;
    } catch {
        return 0;
    }
}
