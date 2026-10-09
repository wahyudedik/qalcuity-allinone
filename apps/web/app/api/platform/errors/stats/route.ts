export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermissionForRoute } from '@/lib/session';
import { handleApiError } from '@/lib/api-error';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { readErrorStats, clampIntParam } from '@/lib/error-log-reader';

// ─── GET /api/platform/errors/stats ───────────────────────────────────────────
// Agregasi statistik error log (totals, bySource, byDay, topFingerprints).
// SUPERADMIN only. Query param: days (default 7, max 31).
// Response: { success: true, data: ErrorLogStats }
export async function GET(request: Request) {
    // 1. Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = checkRateLimit(`api:platform:errors:stats:GET:${ip}`, 30, 60000);
    if (!rateLimitResult.success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // 2. Auth + RBAC check — SUPERADMIN only (platform:view via route-permissions)
    const auth = await requirePermissionForRoute(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const params = new URL(request.url).searchParams;
        const days = clampIntParam(params.get('days'), 7, 1, 31);

        const stats = await readErrorStats(days);

        return NextResponse.json({ success: true, data: stats });
    } catch (e) {
        return handleApiError(e, { route: '/api/platform/errors/stats', method: 'GET' });
    }
}
