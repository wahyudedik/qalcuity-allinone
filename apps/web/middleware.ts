import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextFetchEvent } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";

// ─── CORS Headers ──────────────────────────────────────────────────────────────
const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'https://qalcuity.com',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Access-Control-Max-Age': '86400',
};

// Rute yang hanya bisa diakses oleh ADMIN atau SUPERADMIN
const ADMIN_ONLY_PATHS = [
    "/dashboard/settings",
    "/dashboard/audit",
    "/dashboard/billing",
];

// ─── Main Middleware ────────────────────────────────────────────────────────────
export default withAuth(
    function middleware(req: NextRequestWithAuth, _event: NextFetchEvent) {
        const pathname = req.nextUrl.pathname;

        // ─── CORS Preflight for API routes ──────────────────────────────────────
        if (pathname.startsWith("/api/") && req.method === "OPTIONS") {
            return new NextResponse(null, {
                status: 200,
                headers: corsHeaders,
            });
        }

        // ─── Public API routes (no auth needed) ─────────────────────────────────
        const publicApiPaths = ["/api/auth"];
        if (publicApiPaths.some((path) => pathname.startsWith(path))) {
            const response = NextResponse.next();
            Object.entries(corsHeaders).forEach(([key, value]) => {
                response.headers.set(key, value);
            });
            return response;
        }

        // ─── Role-based Route Protection ────────────────────────────────────────
        // Check role AFTER the existing token check (token is guaranteed to exist here).
        // Only ADMIN and SUPERADMIN can access admin-only routes.
        const token = req.nextauth?.token;
        const role = token?.role as string | undefined;

        if (role && ADMIN_ONLY_PATHS.some((path) => pathname.startsWith(path))) {
            if (role !== "ADMIN" && role !== "SUPERADMIN") {
                // Redirect non-admin users to dashboard
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }
        }

        const response = NextResponse.next();

        // Add CORS headers for API routes
        if (pathname.startsWith("/api/")) {
            Object.entries(corsHeaders).forEach(([key, value]) => {
                response.headers.set(key, value);
            });
        }

        return response;
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    matcher: ["/dashboard/:path*", "/api/:path*"],
};
