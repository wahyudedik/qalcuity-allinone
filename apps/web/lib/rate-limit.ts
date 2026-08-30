/**
 * Simple in-memory rate limiter for API routes.
 * 
 * NOTE: For production with multiple server instances, consider using
 * Redis-based rate limiting (e.g., @upstash/ratelimit with Redis).
 * This in-memory approach works for single-instance deployments.
 */

const rateLimit = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimit.entries()) {
        if (now > record.resetTime) {
            rateLimit.delete(key);
        }
    }
}, CLEANUP_INTERVAL_MS);

/**
 * Check rate limit for a given key.
 * 
 * @param key - Unique identifier (e.g., "api:192.168.1.1" or "api:192.168.1.1:POST")
 * @param limit - Maximum number of requests per window (default: 100)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns Object with success flag and remaining count
 */
export function checkRateLimit(
    key: string,
    limit: number = 100,
    windowMs: number = 60000
): { success: boolean; remaining: number } {
    const now = Date.now();
    const record = rateLimit.get(key);

    if (!record || now > record.resetTime) {
        rateLimit.set(key, { count: 1, resetTime: now + windowMs });
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
