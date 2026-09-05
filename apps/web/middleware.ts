/**
 * Middleware — Auth check + simple rate limiting.
 *
 * CRITICAL DESIGN NOTE:
 * This middleware runs in Edge Runtime. It must be kept as small and simple
 * as possible to avoid "__import_unsupported" runtime crashes.
 *
 * What this middleware does:
 *   1. Auth check via NextAuth withAuth (required for protected routes)
 *   2. Simple in-memory rate limiting for all API routes
 *   3. Public API path bypass (auth endpoints)
 *
 * What has been MOVED OUT of middleware:
 *   - CSP headers → next.config.js headers()
 *   - CORS headers → next.config.js headers()
 *   - Entitlement route mapping → API route level
 *   - Role-based redirects → Client-side (layout.tsx)
 *
 * IMPORTANT: This file does NOT import from rate-limit-config.ts to avoid
 * bundling Node.js-incompatible code into the Edge Runtime bundle.
 * Rate limit rules are inlined here as simple static data.
 *
 * @see apps/web/next.config.js — Security headers (CSP, CORS)
 * @see apps/web/lib/middleware-rate-limit.ts — Edge-safe rate limiter
 * @see apps/web/lib/rate-limit-config.ts — Full rate limit config (used by API routes only)
 */

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextFetchEvent } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { checkRateLimit, getClientIp } from "@/lib/middleware-rate-limit";

// ─── Inline Rate Limit Rules (Edge Runtime-safe) ────────────────────────────
// Only the essential rules for middleware. Full config lives in rate-limit-config.ts.
const RATE_LIMIT_RULES: Record<string, { maxRequests: number; windowMs: number }> = {
    '/api/auth': { maxRequests: 10, windowMs: 60000 },
    '/api/auth/register': { maxRequests: 5, windowMs: 300000 },
    '/api/search': { maxRequests: 20, windowMs: 60000 },
    '/api/mobile/auth/login': { maxRequests: 10, windowMs: 60000 },
};
const DEFAULT_RATE_LIMIT = { maxRequests: 100, windowMs: 60000 };

/** Get rate limit rule for a given pathname (inline, Edge-safe). */
function getRateLimitRule(pathname: string): { maxRequests: number; windowMs: number } {
    // Check most specific rules first
    for (const [pattern, rule] of Object.entries(RATE_LIMIT_RULES)) {
        if (pathname.startsWith(pattern)) {
            return rule;
        }
    }
    return DEFAULT_RATE_LIMIT;
}

// ─── Public API paths (no auth required) ─────────────────────────────────────
const PUBLIC_API_PATHS = [
    "/api/auth",
    "/api/billing/payments/midtrans/callback",
    "/api/health",
];

// ─── Main Middleware ──────────────────────────────────────────────────────────
export default withAuth(
    function middleware(req: NextRequestWithAuth, _event: NextFetchEvent) {
        const pathname = req.nextUrl.pathname;

        // ─── Public API routes — skip auth + rate limit ────────────────────────
        if (PUBLIC_API_PATHS.some((path) => pathname.startsWith(path))) {
            return NextResponse.next();
        }

        // ─── Rate Limiting for API routes (in-memory, Edge-safe) ──────────────
        if (pathname.startsWith("/api/")) {
            const rule = getRateLimitRule(pathname);

            if (rule.maxRequests > 0) {
                const ip = getClientIp(req as unknown as Request);
                const rateLimitKey = `middleware:${ip}:${pathname}`;
                const { success } = checkRateLimit(rateLimitKey, rule.maxRequests, rule.windowMs);

                if (!success) {
                    const retryAfter = Math.ceil(rule.windowMs / 1000);
                    return new NextResponse(
                        JSON.stringify({
                            error: 'Too Many Requests',
                            message: 'Anda telah melampaui batas rate limit. Silakan coba lagi nanti.',
                            retryAfter,
                        }),
                        {
                            status: 429,
                            headers: {
                                'Content-Type': 'application/json',
                                'X-RateLimit-Limit': String(rule.maxRequests),
                                'X-RateLimit-Remaining': '0',
                                'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + retryAfter),
                                'Retry-After': String(retryAfter),
                            },
                        }
                    );
                }
            }
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const pathname = req.nextUrl.pathname;

                // Debug logging (temporary — remove after login is fixed)
                if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
                    console.log('[Middleware] Auth check:', {
                        pathname,
                        hasToken: !!token,
                        tokenRole: token?.role,
                        tokenTenantId: token?.tenantId,
                    });
                }

                // Allow public API paths without auth
                if (PUBLIC_API_PATHS.some((path) => pathname.startsWith(path))) {
                    return true;
                }

                // Block /platform/* for non-SUPERADMIN users (defense-in-depth)
                // Even if layout.tsx checks email, middleware blocks by role as first gate
                if (pathname.startsWith("/platform")) {
                    return token?.role === "SUPERADMIN";
                }

                return !!token;
            },
        },
    }
);

export const config = {
    matcher: ["/dashboard/:path*", "/platform/:path*", "/api/:path*"],
};
