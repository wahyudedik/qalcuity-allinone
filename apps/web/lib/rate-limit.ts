/**
 * Rate Limiter — Redis dengan fallback ke in-memory.
 *
 * Strategi:
 *   1. Jika REDIS_URL terkonfigurasi → gunakan Redis (shared across instances)
 *   2. Jika REDIS_URL tidak ada atau Redis error → fallback ke in-memory Map
 *
 * API:
 *   - `checkRateLimit()`          — Synchronous, in-memory only (backward compatible)
 *   - `checkRateLimitAsync()`     — Async, Redis-first dengan in-memory fallback
 *   - `checkRateLimitWithConfig()` — Endpoint-aware rate limiting dengan config
 *   - `getClientIp()`             — Utility untuk extract client IP
 *   - `getRateLimitHeaders()`     — Generate HTTP rate limit headers
 *   - `isIpBlocked()`             — Check if IP is auto-blocked
 *
 * ─── SECURITY WARNING (H04) ────────────────────────────────────────────────────
 * In-memory rate limiting is NOT suitable for production multi-instance deployments.
 * When running multiple server instances, each instance maintains its own separate
 * * Map, allowing attackers to bypass rate limits by distributing requests across
 * * instances. For production, ALWAYS configure REDIS_URL to use Redis-backed rate
 * * limiting, which provides a shared counter across all instances.
 *
 * @see docs/SECURITY.md — H04 (Rate Limiter)
 * @see apps/web/lib/rate-limit-config.ts
 * @see apps/web/lib/rate-limit-monitor.ts
 */

import { getRedisClient, getRedisClientSync, isRedisAvailable } from '@/lib/redis';
import {
    getRateLimitRule,
    generateRateLimitKey,
    generateBlockKey,
    formatResetTime,
    type RateLimitRule,
} from '@/lib/rate-limit-config';
import { logRateLimitViolation } from '@/lib/rate-limit-monitor';

// ============================================================
// Types
// ============================================================

export interface RateLimitResult {
    /** Whether the request is allowed */
    allowed: boolean;
    /** Remaining requests in current window */
    remaining: number;
    /** When the window resets (Unix timestamp in seconds) */
    resetTime: number;
    /** Total limit for the current window */
    limit: number;
    /** Which backend was used */
    backend: 'redis' | 'memory';
}

export interface RateLimitHeaders {
    'X-RateLimit-Limit': string;
    'X-RateLimit-Remaining': string;
    'X-RateLimit-Reset': string;
    'Retry-After'?: string;
}

// ============================================================
// In-memory Store (fallback)
// ============================================================

const memoryStore = new Map<string, { count: number; resetTime: number }>();
const blockStore = new Map<string, number>(); // ip:pathname → expiry timestamp

// ─── Production Warning ──────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
    console.warn(
        '[RateLimit] ⚠️  WARNING: REDIS_URL is not configured in production! ' +
        'In-memory rate limiting is NOT suitable for multi-instance deployments. ' +
        'Rate limits will NOT be shared across instances. ' +
        'Configure REDIS_URL in your .env for shared rate limiting.'
    );
}

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
        for (const [key, expiry] of blockStore.entries()) {
            if (now > expiry) {
                blockStore.delete(key);
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
 * @returns RateLimitResult with full metadata
 */
export async function checkRateLimitAsync(
    key: string,
    limit: number = 100,
    windowMs: number = 60000
): Promise<RateLimitResult> {
    const redis = await getRedisClient();
    const now = Date.now();

    if (redis && isRedisAvailable()) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const multi = redis.multi() as any;
            multi.incr(key);
            multi.pexpire(key, windowMs);
            multi.pttl(key);
            const results = (await multi.exec()) as [string, unknown][] | null;

            if (!results) {
                throw new Error('Redis multi.exec returned null');
            }

            const count = (results[0]?.[1] as number) || 1;
            const ttl = (results[2]?.[1] as number) || windowMs;

            return {
                allowed: count <= limit,
                remaining: Math.max(0, limit - count),
                resetTime: Math.ceil((now + ttl) / 1000),
                limit,
                backend: 'redis',
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
        return { allowed: true, remaining: limit - 1, resetTime: Math.ceil(resetTime / 1000), limit, backend: 'memory' };
    }

    record.count++;
    return {
        allowed: record.count <= limit,
        remaining: Math.max(0, limit - record.count),
        resetTime: Math.ceil(record.resetTime / 1000),
        limit,
        backend: 'memory',
    };
}

// ============================================================
// Endpoint-Aware Rate Limit (with config + monitoring)
// ============================================================

/**
 * Check rate limit dengan endpoint-aware configuration.
 * Auto-detects rate limit rule berdasarkan pathname.
 * Includes IP auto-blocking, violation logging, dan HTTP headers.
 *
 * @param ip - Client IP address
 * @param pathname - URL pathname
 * @param tenantId - Optional tenant ID
 * @returns Full RateLimitResult dengan headers
 */
export async function checkRateLimitWithConfig(
    ip: string,
    pathname: string,
    tenantId?: string
): Promise<RateLimitResult & { headers: RateLimitHeaders }> {
    const rule = getRateLimitRule(pathname);

    // Skip if maxRequests is 0 (skip path)
    if (rule.maxRequests === 0) {
        return {
            allowed: true,
            remaining: 999,
            resetTime: Math.ceil(Date.now() / 1000) + 60,
            limit: 999,
            backend: 'memory',
            headers: {
                'X-RateLimit-Limit': '999',
                'X-RateLimit-Remaining': '999',
                'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + 60),
            },
        };
    }

    // Check IP block first
    if (await isIpBlocked(ip, pathname, rule)) {
        const blockKey = generateBlockKey(ip, pathname);
        const blockExpiry = getBlockExpiry(ip, pathname);
        const retryAfter = blockExpiry ? Math.ceil((blockExpiry - Date.now()) / 1000) : 3600;

        return {
            allowed: false,
            remaining: 0,
            resetTime: Math.ceil(blockExpiry ? blockExpiry / 1000 : (Date.now() + retryAfter * 1000) / 1000),
            limit: rule.maxRequests,
            backend: isRedisAvailable() ? 'redis' : 'memory',
            headers: {
                'X-RateLimit-Limit': String(rule.maxRequests),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(Math.ceil((blockExpiry || Date.now() + retryAfter * 1000) / 1000)),
                'Retry-After': String(retryAfter),
            },
        };
    }

    // Generate rate limit key
    const key = generateRateLimitKey(ip, pathname, rule);

    // Check rate limit
    const result = await checkRateLimitAsync(key, rule.maxRequests, rule.windowMs);

    // Log violation
    if (!result.allowed && rule.logViolations) {
        const windowStart = new Date(Date.now() - rule.windowMs);
        const windowEnd = new Date();

        logRateLimitViolation({
            ip,
            pathname,
            tenantId,
            requestCount: rule.maxRequests,
            maxRequests: rule.maxRequests,
            windowStart,
            windowEnd,
            blocked: false,
        }).catch(() => { /* non-blocking */ });
    }

    // Auto-block check
    if (!result.allowed && rule.autoBlock) {
        await incrementViolationCount(ip, pathname, rule);
    }

    // Generate headers
    const headers = getRateLimitHeaders(result, rule);

    return { ...result, headers };
}

// ============================================================
// IP Blocking
// ============================================================

/**
 * Check if an IP is currently blocked.
 *
 * @param ip - Client IP
 * @param pathname - URL pathname
 * @param rule - Rate limit rule
 * @returns Whether the IP is blocked
 */
async function isIpBlocked(ip: string, pathname: string, rule: RateLimitRule): Promise<boolean> {
    if (!rule.autoBlock) return false;

    // Check Redis first
    const redis = await getRedisClient();
    if (redis && isRedisAvailable()) {
        try {
            const blockKey = `rl:block:${ip}:${pathname}`;
            const blocked = await redis.get(blockKey);
            return blocked !== null;
        } catch {
            // Fall through to memory check
        }
    }

    // In-memory fallback
    const memKey = `${ip}:${pathname}`;
    const expiry = blockStore.get(memKey);
    if (expiry && Date.now() < expiry) {
        return true;
    }
    if (expiry) {
        blockStore.delete(memKey);
    }
    return false;
}

/**
 * Get block expiry time for an IP.
 */
function getBlockExpiry(ip: string, pathname: string): number | null {
    const memKey = `${ip}:${pathname}`;
    const expiry = blockStore.get(memKey);
    if (expiry && Date.now() < expiry) {
        return expiry;
    }
    return null;
}

/**
 * Increment violation count and auto-block if threshold reached.
 */
async function incrementViolationCount(
    ip: string,
    pathname: string,
    rule: RateLimitRule
): Promise<void> {
    const violationKey = `rl:violations:${ip}:${pathname}`;

    // Use Redis for violation counting
    const redis = await getRedisClient();
    if (redis && isRedisAvailable()) {
        try {
            const count = await redis.incr(violationKey);
            await redis.pexpire(violationKey, rule.windowMs);

            if (count >= rule.blockThreshold) {
                const blockKey = `rl:block:${ip}:${pathname}`;
                await redis.setex(blockKey, Math.ceil(rule.blockDurationMs / 1000), '1');
                console.warn(
                    `[RateLimit] AUTO-BLOCK: IP=${ip} blocked for ${rule.blockDurationMs / 1000}s ` +
                    `(${count} violations on ${pathname})`
                );

                logRateLimitViolation({
                    ip,
                    pathname,
                    requestCount: count,
                    maxRequests: rule.maxRequests,
                    windowStart: new Date(Date.now() - rule.windowMs),
                    windowEnd: new Date(),
                    blocked: true,
                }).catch(() => { /* non-blocking */ });
            }
        } catch {
            // Fallback to memory
            incrementViolationCountMemory(ip, pathname, rule);
        }
        return;
    }

    incrementViolationCountMemory(ip, pathname, rule);
}

/**
 * In-memory violation counting (fallback).
 */
function incrementViolationCountMemory(
    ip: string,
    pathname: string,
    rule: RateLimitRule
): void {
    const memKey = `${ip}:${pathname}`;
    const violationKey = `rl:violations:${memKey}`;
    const current = memoryStore.get(violationKey);
    const now = Date.now();

    let count: number;
    if (!current || now > current.resetTime) {
        count = 1;
        memoryStore.set(violationKey, { count: 1, resetTime: now + rule.windowMs });
    } else {
        count = current.count + 1;
        current.count = count;
    }

    if (count >= rule.blockThreshold) {
        blockStore.set(memKey, now + rule.blockDurationMs);
        console.warn(
            `[RateLimit] AUTO-BLOCK (memory): IP=${ip} blocked for ${rule.blockDurationMs / 1000}s ` +
            `(${count} violations on ${pathname})`
        );
    }
}

// ============================================================
// Headers
// ============================================================

/**
 * Generate rate limit HTTP headers.
 *
 * @param result - Rate limit check result
 * @param rule - Rate limit rule
 * @returns HTTP headers object
 */
export function getRateLimitHeaders(
    result: RateLimitResult,
    rule?: RateLimitRule
): RateLimitHeaders {
    const headers: RateLimitHeaders = {
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.resetTime),
    };

    if (!result.allowed) {
        const retryAfter = Math.max(1, result.resetTime - Math.ceil(Date.now() / 1000));
        headers['Retry-After'] = String(retryAfter);
    }

    return headers;
}

/**
 * Apply rate limit headers to a NextResponse.
 *
 * @param response - NextResponse to modify
 * @param headers - Rate limit headers
 * @returns Modified response
 */
export function applyRateLimitHeaders(
    response: Response,
    headers: RateLimitHeaders
): Response {
    const newResponse = new Response(response.body, response);
    Object.entries(headers).forEach(([key, value]) => {
        newResponse.headers.set(key, value);
    });
    return newResponse;
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

/**
 * Create a 429 Too Many Requests response.
 *
 * @param result - Rate limit result
 * @param message - Custom error message
 * @returns NextResponse with 429 status
 */
export function createRateLimitResponse(
    result: RateLimitResult & { headers: RateLimitHeaders },
    message?: string
): Response {
    return new Response(
        JSON.stringify({
            error: 'Too Many Requests',
            message: message || 'Anda telah melampaui batas rate limit. Silakan coba lagi nanti.',
            retryAfter: parseInt(result.headers['Retry-After'] || '60', 10),
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                ...result.headers,
            },
        }
    );
}
