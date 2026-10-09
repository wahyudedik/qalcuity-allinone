export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { clientErrorReportSchema, formatZodError } from '@/lib/validation-schemas';
import { logError } from '@/lib/error-logger';

// ─── POST /api/client-errors ──────────────────────────────────────────────────
// Ingest error frontend dari browser (ErrorReporter di client component).
//
// Path netral (BUKAN /api/platform/errors/client-report) karena:
//   1. /api/platform/* dipetakan ke permission platform:view (SUPERADMIN) di
//      route-permissions.ts via prefix-match — user biasa akan 403 saat ingest.
//   2. Endpoint ini tidak butuh session superadmin — semua user (dan error yang
//      terjadi sebelum login) berhak melaporkan error frontend.
//
// CATATAN middleware (apps/web/middleware.ts — Do Not Touch):
//   Matcher global `/api/:path*` mewajibkan token session untuk semua API path
//   di luar PUBLIC_API_PATHS (/api/auth, payment callbacks, /api/health).
//   Artinya request dari browser yang BELUM login akan di-redirect ke /login
//   oleh middleware sebelum mencapai handler ini. Client ErrorReporter (subtask 3)
//   WAJIB men-swallow failure reporting (fire-and-forget, jangan pernah throw).
//   Untuk user terautentikasi, endpoint ini berfungsi normal.
//
// Rate limit ketat per-IP: 30 request/menit (in-memory, Redis-ready).
// Logging TIDAK BOLEH menggagalkan request user — jika log write gagal,
// tetap return { success: true }.
export async function POST(request: Request) {
    // 1. Rate limiting per IP
    const ip = getClientIp(request);
    const rateLimitResult = checkRateLimit(`api:client-errors:POST:${ip}`, 30, 60000);
    if (!rateLimitResult.success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // 2. Parse & validate body (invalid JSON / Zod fail → 400)
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = clientErrorReportSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, ...formatZodError(parsed.error) },
            { status: 400 }
        );
    }

    const { message, stack, route, source, userId, meta } = parsed.data;

    // 3. Tulis ke error log — never-throw; logging tidak boleh menggagalkan request
    try {
        logError({
            level: 'error',
            source,
            message,
            ...(stack !== undefined ? { stack } : {}),
            ...(route !== undefined ? { route } : {}),
            ...(userId !== undefined ? { userId } : {}),
            ...(meta !== undefined ? { meta } : {}),
        });
    } catch {
        // logError sendiri sudah never-throw — catch ini defense-in-depth
    }

    return NextResponse.json({ success: true });
}
