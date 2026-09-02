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
 * @see apps/web/next.config.js — Security headers (CSP, CORS)
 * @see apps/web/lib/middleware-rate-limit.ts — Edge-safe rate limiter
 * @see apps/web/lib/rate-limit-config.ts — Rate limit rules
 */

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextFetchEvent } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { checkRateLimit, getClientIp } from "@/lib/middleware-rate-limit";
import { getRateLimitRule } from "@/lib/rate-limit-config";

// ─── Public API paths (no auth required) ─────────────────────────────────────
const PUBLIC_API_PATHS = [
    "/api/auth",
    "/api/billing/payments/midtrans/callback",
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
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    matcher: ["/dashboard/:path*", "/platform/:path*", "/api/:path*"],
};
