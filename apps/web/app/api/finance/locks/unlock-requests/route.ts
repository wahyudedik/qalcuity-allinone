export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { listUnlockRequests } from '@/lib/unlock-request';

// ─── GET: List unlock request (filter status/user/active + pagination) ───────

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:unlock-requests:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId, role } = auth;

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || undefined;
        const active = searchParams.get('active') === 'true';
        const mine = searchParams.get('mine') === 'true';
        const page = parseInt(searchParams.get('page') || '1', 10) || 1;
        const limit = parseInt(searchParams.get('limit') || '20', 10) || 20;

        // VIEWER hanya melihat request miliknya sendiri
        const requesterId = role === 'VIEWER' ? auth.userId : mine ? auth.userId : undefined;

        const result = await listUnlockRequests({
            tenantId,
            status,
            requesterId,
            active,
            page,
            limit,
        });

        return NextResponse.json({
            success: true,
            data: result.data,
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
