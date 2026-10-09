export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermissionForRoute } from '@/lib/session';
import { handleApiError, apiNotFound } from '@/lib/api-error';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { findErrorLogById } from '@/lib/error-log-reader';

// ─── GET /api/platform/errors/[id] ────────────────────────────────────────────
// Detail satu error log entry (termasuk stack trace lengkap). SUPERADMIN only.
// Response: { success: true, data: ErrorLogEntry } — 404 jika tidak ditemukan.
export async function GET(request: Request, { params }: { params: { id: string } }) {
    // 1. Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = checkRateLimit(`api:platform:errors:[id]:GET:${ip}`, 30, 60000);
    if (!rateLimitResult.success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // 2. Auth + RBAC check — SUPERADMIN only (platform:view via route-permissions)
    const auth = await requirePermissionForRoute(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const entry = await findErrorLogById(params.id);
        if (!entry) {
            return apiNotFound('Error log tidak ditemukan');
        }
        return NextResponse.json({ success: true, data: entry });
    } catch (e) {
        return handleApiError(e, { route: '/api/platform/errors/[id]', method: 'GET' });
    }
}
