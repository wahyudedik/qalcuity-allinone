export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { getUnlockRequestById } from '@/lib/unlock-request';

// ─── GET: Status temporary unlock untuk satu unlock request ─────────────────
// Menjawab: "apakah temporary unlock masih berlaku?" — active, expiresAt,
// minutesRemaining, plus data request beserta effective status (EXPIRED).

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:unlock-requests:status:${ip}`, 100, 60000);
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

        // VIEWER hanya boleh melihat status request miliknya sendiri
        if (role === 'VIEWER' && unlockRequest.requestedBy !== auth.userId) {
            return NextResponse.json(
                { success: false, error: MSG.FORBIDDEN, code: 'FORBIDDEN' },
                { status: 403 }
            );
        }

        const active =
            unlockRequest.status === 'APPROVED' &&
            unlockRequest.temporaryUnlockActive &&
            !!unlockRequest.temporaryUnlockExpiresAt &&
            new Date(unlockRequest.temporaryUnlockExpiresAt) > new Date();

        return NextResponse.json({
            success: true,
            data: {
                requestId: unlockRequest.id,
                status: unlockRequest.status,
                active,
                expiresAt: unlockRequest.temporaryUnlockExpiresAt,
                minutesRemaining: active ? unlockRequest.minutesRemaining : 0,
                level: unlockRequest.level,
                periodIds: temporaryUnlock?.periodIds ?? unlockRequest.targetPeriods.map((p) => p.id),
                temporaryUnlock: temporaryUnlock ?? null,
                request: unlockRequest,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
