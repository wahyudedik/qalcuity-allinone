/**
 * Middleware Rate Limiter — Edge Runtime-safe, in-memory only.
 *
 * File ini DIRANCANG KHUSUS untuk digunakan di middleware.ts yang berjalan
 * di Edge Runtime. Edge Runtime TIDAK mendukung:
 *   - process.on() (signal handlers)
 *   - setInterval() (timer callbacks)
 *   - ioredis (Node.js TCP sockets)
 *   - node:* modules (Node.js internals)
 *
 * File ini TIDAK mengimpor apapun dari:
 *   - redis.ts (menggunakan process.on, ioredis)
 *   - rate-limit.ts (menggunakan redis.ts, setInterval)
 *   - rate-limit-monitor.ts (menggunakan redis.ts, prisma)
 *   - rate-limit-config.ts (unused import sebelumnya, telah dihapus)
 *
 * File ini sepenuhnya self-contained — zero external imports.
 *
 * @see apps/web/middleware.ts
 * @see apps/web/lib/rate-limit.ts — Full-featured rate limiter untuk Node.js runtime
 */

// ============================================================
// In-memory Store (Edge Runtime-safe)
// ============================================================

const memoryStore = new Map<string, { count: number; resetTime: number }>();

// ============================================================
// Types
// ============================================================

export interface MiddlewareRateLimitResult {
    /** Whether the request is allowed */
    success: boolean;
    /** Remaining requests in current window */
    remaining: number;
}

// ============================================================
// Core Functions
// ============================================================

/**
 * Check rate limit (synchronous — in-memory only).
 * Designed for Edge Runtime — no Redis, no setInterval, no process.on.
 *
 * @param key - Unique identifier (e.g., "middleware:192.168.1.1:/api/finance/invoices")
 * @param limit - Maximum requests per window (default: 100)
 * @param windowMs - Time window in ms (default: 60000 = 1 minute)
 * @returns Object with success flag and remaining count
 */
export function checkRateLimit(
    key: string,
    limit: number = 100,
    windowMs: number = 60000
): MiddlewareRateLimitResult {
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

/**
 * Get client IP from request headers.
 * Handles X-Forwarded-For (reverse proxy) and X-Real-IP.
 *
 * @param request - The incoming Request object
 * @returns Client IP address string
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
