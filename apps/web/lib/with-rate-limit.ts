/**
 * withRateLimit — Higher-order function untuk menambahkan rate limiting ke API routes.
 *
 * Provides comprehensive Redis-backed rate limiting dengan:
 *   - Endpoint-aware configuration
 *   - HTTP 429 responses dengan proper headers
 *   - Violation logging ke database
 *   - IP auto-blocking untuk repeated offenders
 *   - Graceful fallback ke in-memory jika Redis down
 *
 * Usage:
 * ```typescript
 * // In an API route:
 * import { withRateLimit } from '@/lib/with-rate-limit';
 *
 * export async function POST(req: Request) {
 *     const rlResponse = await withRateLimit(req);
 *     if (rlResponse) return rlResponse; // 429 response
 *
 *     // ... normal handler logic
 * }
 * ```
 *
 * @see apps/web/lib/rate-limit.ts
 * @see apps/web/lib/rate-limit-config.ts
 * @see apps/web/lib/rate-limit-monitor.ts
 */

import { checkRateLimitWithConfig, getClientIp, createRateLimitResponse } from '@/lib/rate-limit';
import type { RateLimitResult, RateLimitHeaders } from '@/lib/rate-limit';

// ============================================================
// Types
// ============================================================

export interface WithRateLimitOptions {
    /** Override tenant ID (default: extract from token) */
    tenantId?: string;
    /** Override pathname (default: from URL) */
    pathname?: string;
    /** Override client IP (default: from request headers) */
    ip?: string;
    /** Skip rate limiting entirely */
    skip?: boolean;
}

export interface RateLimitContext {
    /** Rate limit check result */
    result: RateLimitResult;
    /** HTTP headers to include in response */
    headers: RateLimitHeaders;
    /** Whether request was allowed */
    allowed: boolean;
}

// ============================================================
// withRateLimit
// ============================================================

/**
 * Apply rate limiting ke API route.
 *
 * @param req - The Request object
 * @param options - Optional overrides
 * @returns null if allowed, NextResponse with 429 if blocked
 *
 * @example
 * ```typescript
 * export async function GET(req: Request) {
 *     const rlResponse = await withRateLimit(req);
 *     if (rlResponse) return rlResponse;
 *
 *     // ... handle request
 *     return NextResponse.json({ data });
 * }
 * ```
 */
export async function withRateLimit(
    req: Request,
    options: WithRateLimitOptions = {}
): Promise<Response | null> {
    // Skip if explicitly requested
    if (options.skip) return null;

    // Only apply to API routes
    const url = new URL(req.url);
    const pathname = options.pathname || url.pathname;
    if (!pathname.startsWith('/api/')) return null;

    // Get client IP
    const ip = options.ip || getClientIp(req);

    // Check rate limit
    const result = await checkRateLimitWithConfig(ip, pathname, options.tenantId);

    if (!result.allowed) {
        return createRateLimitResponse(result);
    }

    return null;
}

/**
 * Get rate limit context without blocking.
 * Useful for adding rate limit headers to successful responses.
 *
 * @param req - The Request object
 * @param options - Optional overrides
 * @returns Rate limit context with headers
 */
export async function getRateLimitContext(
    req: Request,
    options: WithRateLimitOptions = {}
): Promise<RateLimitContext> {
    if (options.skip) {
        return {
            result: {
                allowed: true,
                remaining: 999,
                resetTime: Math.ceil(Date.now() / 1000) + 60,
                limit: 999,
                backend: 'memory',
            },
            headers: {
                'X-RateLimit-Limit': '999',
                'X-RateLimit-Remaining': '999',
                'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + 60),
            },
            allowed: true,
        };
    }

    const url = new URL(req.url);
    const pathname = options.pathname || url.pathname;
    const ip = options.ip || getClientIp(req);

    const result = await checkRateLimitWithConfig(ip, pathname, options.tenantId);

    return {
        result,
        headers: result.headers,
        allowed: result.allowed,
    };
}

/**
 * Apply rate limit headers ke response.
 * Use this untuk menambahkan rate limit headers ke successful responses.
 *
 * @param response - Original response
 * @param context - Rate limit context from getRateLimitContext()
 * @returns Response dengan rate limit headers
 */
export function applyRateLimitHeaders(
    response: Response,
    context: RateLimitContext
): Response {
    const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
    });

    Object.entries(context.headers).forEach(([key, value]) => {
        newResponse.headers.set(key, value);
    });

    return newResponse;
}
