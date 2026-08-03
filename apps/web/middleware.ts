import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        // Allow access to public routes
        const publicPaths = ["/login", "/register", "/api/auth"];
        const pathname = req.nextUrl.pathname;

        // Check if the path is public
        if (publicPaths.some((path) => pathname.startsWith(path))) {
            return NextResponse.next();
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
