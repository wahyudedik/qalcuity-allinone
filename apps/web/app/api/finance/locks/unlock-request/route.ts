export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { handleApiError } from '@/lib/api-error';
import { formatZodError, createUnlockRequestSchema } from '@/lib/validation-schemas';
import { requestUnlock } from '@/lib/unlock-request';
import type { UnlockErrorCode } from '@/lib/unlock-request';

function unlockErrorStatus(code: UnlockErrorCode): number {
    switch (code) {
        case 'PERIOD_NOT_FOUND':
        case 'UNLOCK_REQUEST_NOT_FOUND':
            return 404;
        case 'UNLOCK_REQUEST_FORBIDDEN_ROLE':
            return 403;
        case 'UNLOCK_LEVEL_NOT_ALLOWED':
        case 'REASON_INVALID':
            return 400;
        default:
            return 400;
    }
}

// ─── POST: Ajukan unlock request (semua role kecuali VIEWER) ─────────────────

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:unlock-request:POST:${ip}`, 20, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId, role } = auth;

        // VIEWER tidak boleh mengajukan unlock request
        if (role === 'VIEWER') {
            return NextResponse.json(
                { success: false, error: MSG.FORBIDDEN, code: 'UNLOCK_REQUEST_FORBIDDEN_ROLE' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);

        const validation = createUnlockRequestSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: formatZodError(validation.error), code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true },
        });

        const result = await requestUnlock({
            tenantId,
            userId,
            userRole: role,
            userName: user?.name ?? null,
            userEmail: user?.email ?? null,
            level: validation.data.level,
            periodId: validation.data.periodId,
            reason: validation.data.reason,
            request,
        });

        if (!result.ok) {
            return NextResponse.json(
                {
                    success: false,
                    error: result.message || MSG.INVALID_INPUT,
                    code: result.code,
                },
                { status: unlockErrorStatus(result.code || 'REASON_INVALID') }
            );
        }

        return NextResponse.json(
            {
                success: true,
                data: result.request,
                temporaryUnlock: result.temporaryUnlock ?? null,
                autoApproved: result.autoApproved ?? false,
                duplicate: result.duplicate ?? false,
                message: result.duplicate
                    ? MSG.UNLOCK_REQUEST_ALREADY_EXISTS
                    : result.autoApproved
                        ? MSG.UNLOCK_GRANTED
                        : MSG.UNLOCK_REQUEST_CREATED,
            },
            { status: result.duplicate ? 200 : 201 }
        );
    } catch (error) {
        return handleApiError(error);
    }
}
