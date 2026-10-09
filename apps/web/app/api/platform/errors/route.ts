export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermissionForRoute } from '@/lib/session';
import { handleApiError } from '@/lib/api-error';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import {
    readErrorLogs,
    countErrorLogs,
    clampIntParam,
    parseCommaListParam,
    ERROR_LOG_LEVEL_VALUES,
    ERROR_LOG_SOURCE_VALUES,
    type ReadErrorLogsOptions,
} from '@/lib/error-log-reader';
import type { ErrorLogLevel, ErrorLogSource } from '@/lib/error-logger';

// ─── GET /api/platform/errors ─────────────────────────────────────────────────
// List error log (JSONL) dengan filter + pagination. SUPERADMIN only.
// Query params: days, level (multi comma), source (multi comma), route,
//               fingerprint, tenantId, search, limit, offset
// Response: { success: true, data: { items, total, limit, offset } }
export async function GET(request: Request) {
    // 1. Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = checkRateLimit(`api:platform:errors:GET:${ip}`, 30, 60000);
    if (!rateLimitResult.success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // 2. Auth + RBAC check — SUPERADMIN only (platform:view via route-permissions)
    const auth = await requirePermissionForRoute(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        // 3. Parse & sanitize query params (clamp; param optional kosong → default)
        const params = new URL(request.url).searchParams;
        const days = clampIntParam(params.get('days'), 7, 1, 31);
        const limit = clampIntParam(params.get('limit'), 200, 1, 1000);
        const offset = clampIntParam(params.get('offset'), 0, 0, 1000000);
        const levels = parseCommaListParam<ErrorLogLevel>(params.get('level'), ERROR_LOG_LEVEL_VALUES);
        const sources = parseCommaListParam<ErrorLogSource>(params.get('source'), ERROR_LOG_SOURCE_VALUES);
        const routeFilter = params.get('route')?.trim() || undefined;
        const fingerprint = params.get('fingerprint')?.trim() || undefined;
        const tenantId = params.get('tenantId')?.trim() || undefined;
        const search = params.get('search')?.trim() || undefined;

        const options: ReadErrorLogsOptions = {
            days,
            limit,
            offset,
            ...(levels.length > 0 ? { levels } : {}),
            ...(sources.length > 0 ? { sources } : {}),
            ...(routeFilter !== undefined ? { route: routeFilter } : {}),
            ...(fingerprint !== undefined ? { fingerprint } : {}),
            ...(tenantId !== undefined ? { tenantId } : {}),
            ...(search !== undefined ? { search } : {}),
        };

        // 4. Read + count (parallel) — reader menangani direktori kosong dengan gracefull
        const [items, total] = await Promise.all([readErrorLogs(options), countErrorLogs(options)]);

        return NextResponse.json({
            success: true,
            data: { items, total, limit, offset },
        });
    } catch (e) {
        return handleApiError(e, { route: '/api/platform/errors', method: 'GET' });
    }
}
