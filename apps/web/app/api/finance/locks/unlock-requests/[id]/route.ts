export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { getUnlockRequestById } from '@/lib/unlock-request';

// ─── GET: Detail unlock request ──────────────────────────────────────────────

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:unlock-requests:[id]:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId, role } = auth;

        const { request: unlockRequest, temporaryUnlock } = await getUnlockRequestById({
            tenantId,
            requestId: params.id,
        });

        if (!unlockRequest) {
            return NextResponse.json(
                { success: false, error: MSG.UNLOCK_REQUEST_NOT_FOUND, code: 'UNLOCK_REQUEST_NOT_FOUND' },
                { status: 404 }
            );
        }

        // VIEWER hanya boleh melihat request miliknya sendiri
        if (role === 'VIEWER' && unlockRequest.requestedBy !== auth.userId) {
            return NextResponse.json(
                { success: false, error: MSG.FORBIDDEN, code: 'FORBIDDEN' },
                { status: 403 }
            );
        }

        return NextResponse.json({
            success: true,
            data: { ...unlockRequest, temporaryUnlock: temporaryUnlock ?? null },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
