/**
 * NextAuth.js Catch-All Route Handler
 *
 * This file handles all NextAuth.js authentication endpoints:
 *   - GET /api/auth/session  — Get current session
 *   - GET /api/auth/csrf     — Get CSRF token
 *   - POST /api/auth/callback — Handle OAuth/credentials callbacks
 *   - POST /api/auth/signin  — Sign in
 *   - POST /api/auth/signout — Sign out
 *   - POST /api/auth/_log    — Client-side logging
 *
 * CRITICAL: This file MUST export both GET and POST handlers.
 * Removing either will cause 405 Method Not Allowed errors.
 *
 * Registration logic lives at: app/api/auth/register/route.ts
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
