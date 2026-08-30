import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Rute yang hanya bisa diakses oleh ADMIN atau SUPERADMIN
const ADMIN_ONLY_PATHS = [
    "/dashboard/settings",
    "/dashboard/audit",
    "/dashboard/billing",
];

export default withAuth(
    function middleware(req) {
        // Allow access to public routes
        const publicPaths = ["/login", "/register", "/api/auth"];
        const pathname = req.nextUrl.pathname;

        // Check if the path is public
        if (publicPaths.some((path) => pathname.startsWith(path))) {
            return NextResponse.next();
        }

        // ─── Role-based Route Protection ───────────────────────────────────────
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

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    matcher: ["/dashboard/:path*"],
};
