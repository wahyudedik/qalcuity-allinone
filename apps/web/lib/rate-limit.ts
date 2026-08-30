/**
 * Rate Limiter — Redis dengan fallback ke in-memory.
 *
 * Strategi:
 *   1. Jika REDIS_URL terkonfigurasi → gunakan Redis (shared across instances)
 *   2. Jika REDIS_URL tidak ada atau Redis error → fallback ke in-memory Map
 *
 * API:
 *   - `checkRateLimitSync()` — Synchronous, in-memory only (backward compatible)
 *   - `checkRateLimit()`     — Async, Redis-first dengan in-memory fallback
 *   - `getClientIp()`        — Utility untuk extract client IP
 *
 * @see docs/ARCHITECTURE.md
 */

import Redis from 'ioredis';

// ============================================================
// Redis Client (lazy singleton)
// ============================================================

let redisClient: Redis | null = null;
let redisChecked = false;

function getRedisClient(): Redis | null {
    if (redisChecked) return redisClient;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        console.warn('[RateLimit] REDIS_URL not configured, using in-memory fallback');
        redisChecked = true;
        return null;
    }

    try {
        redisClient = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy(times: number) {
                if (times > 3) {
                    console.error('[RateLimit] Redis max retries exceeded, falling back to memory');
                    return null;
                }
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            lazyConnect: true,
            connectTimeout: 5000,
        });

        redisClient.on('error', (err: Error) => {
            console.error('[RateLimit] Redis error:', err.message);
            redisClient = null;
            redisChecked = true;
        });

        redisClient.on('connect', () => {
            console.log('[RateLimit] Redis connected successfully');
        });

        redisChecked = true;
        return redisClient;
    } catch (error) {
        console.error('[RateLimit] Failed to create Redis client:', error);
        redisChecked = true;
        redisClient = null;
        return null;
    }
}

// ============================================================
// In-memory Store (fallback)
// ============================================================

const memoryStore = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, record] of memoryStore.entries()) {
            if (now > record.resetTime) {
                memoryStore.delete(key);
            }
        }
    }, CLEANUP_INTERVAL_MS);
}

// ============================================================
// Sync Rate Limit (backward compatible — in-memory only)
// ============================================================

/**
 * Check rate limit (synchronous — in-memory only).
 * Backward compatible dengan API yang sudah ada.
 *
 * @param key - Unique identifier
 * @param limit - Maximum requests per window (default: 100)
 * @param windowMs - Time window in ms (default: 60000 = 1 minute)
 * @returns Object with success flag and remaining count
 */
export function checkRateLimit(
    key: string,
    limit: number = 100,
    windowMs: number = 60000
): { success: boolean; remaining: number } {
    const now = Date.now();
    const record = memoryStore.get(key);

    if (!record || now > record.resetTime) {
        memoryStore.set(key, { count: 1, resetTime: now + windowMs });
        return { success: true, remaining: limit - 1 };
    }

    if (record.count >= limit) {
        return { success: false, remaining: 0 };
    }

    record.count++;
    return { success: true, remaining: limit - record.count };
}

// ============================================================
// Async Rate Limit (Redis-first dengan in-memory fallback)
// ============================================================

/**
 * Check rate limit dengan Redis support.
 * Jika Redis tersedia → gunakan Redis (shared across instances).
 * Jika tidak → fallback ke in-memory.
 *
 * @param key - Unique identifier
 * @param limit - Maximum requests per window (default: 100)
 * @param windowMs - Time window in ms (default: 60000 = 1 minute)
 * @returns Object with allowed flag, remaining count, and resetTime
 */
export async function checkRateLimitAsync(
    key: string,
    limit: number = 100,
    windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const redis = getRedisClient();
    const now = Date.now();

    if (redis) {
        try {
            const multi = redis.multi();
            multi.incr(key);
            multi.pexpire(key, windowMs);
            multi.pttl(key);
            const results = await multi.exec();

            if (!results) {
                throw new Error('Redis multi.exec returned null');
            }

            const count = (results[0]?.[1] as number) || 1;
            const ttl = (results[2]?.[1] as number) || windowMs;

            return {
                allowed: count <= limit,
                remaining: Math.max(0, limit - count),
                resetTime: now + ttl,
            };
        } catch (error) {
            console.error('[RateLimit] Redis error, falling back to memory:', error);
        }
    }

    // In-memory fallback
    const record = memoryStore.get(key);
    const resetTime = now + windowMs;

    if (!record || now > record.resetTime) {
        memoryStore.set(key, { count: 1, resetTime });
        return { allowed: true, remaining: limit - 1, resetTime };
    }

    record.count++;
    return {
        allowed: record.count <= limit,
        remaining: Math.max(0, limit - record.count),
        resetTime: record.resetTime,
    };
}

// ============================================================
// Utility
// ============================================================

/**
 * Get client IP from request headers.
 * Handles X-Forwarded-For (reverse proxy) and X-Real-IP.
 */
export function getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }
    return 'unknown';
}
