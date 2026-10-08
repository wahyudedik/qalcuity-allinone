export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { handleApiError } from '@/lib/api-error';
import { formatZodError, decideUnlockRequestSchema } from '@/lib/validation-schemas';
import { decideUnlockRequest } from '@/lib/unlock-request';
import type { UnlockErrorCode } from '@/lib/unlock-request';
import { enforceSoDApproval, SOD_MODULE, SOD_ACTION } from '@/lib/sod-enforcement';

// ─── Error mapping (konsisten dengan route unlock-request) ──────────────────

function decideErrorStatus(code: UnlockErrorCode): number {
    switch (code) {
        case 'UNLOCK_REQUEST_NOT_FOUND':
            return 404;
        case 'UNLOCK_APPROVAL_FORBIDDEN_ROLE':
        case 'UNLOCK_SELF_APPROVAL_FORBIDDEN':
            return 403;
        case 'UNLOCK_REQUEST_NOT_PENDING':
            return 409;
        default:
            return 400;
    }
}

// ─── POST: Approve unlock request (ADMIN+/manager sesuai lock policy) ───────

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:unlock-requests:approve:${ip}`, 20, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId, role } = auth;

        // Body opsional: { comments? } — decision selalu APPROVED (dipaksa di route)
        let comments: string | undefined;
        try {
            const body = await request.json();
            const sanitizedBody = sanitizeObject(body);
            const validation = decideUnlockRequestSchema.safeParse(sanitizedBody);
            if (!validation.success) {
                return NextResponse.json(
                    { success: false, error: formatZodError(validation.error), code: 'VALIDATION_ERROR' },
                    { status: 400 }
                );
            }
            comments = validation.data.comments;
        } catch {
            // Body kosong / bukan JSON — comments opsional, lanjut tanpa comments
            comments = undefined;
        }

        // SoD rule check (self-approval sudah ditangani decideUnlockRequest)
        const sod = await enforceSoDApproval({
            tenantId,
            userId,
            userRole: role,
            module: SOD_MODULE.FINANCE,
            action: SOD_ACTION.UNLOCK_REQUEST_DECIDE,
            entityId: params.id,
            request,
        });
        if (!sod.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: sod.message || MSG.SOD_VIOLATION,
                    code: 'SOD_VIOLATION',
                    violations: sod.violations,
                },
                { status: 403 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true },
        });

        const result = await decideUnlockRequest({
            tenantId,
            requestId: params.id,
            approverId: userId,
            approverRole: role,
            approverName: user?.name ?? null,
            decision: 'APPROVED',
            comments,
            request,
        });

        if (!result.ok) {
            return NextResponse.json(
                {
                    success: false,
                    error: result.message || MSG.INTERNAL_SERVER_ERROR,
                    code: result.code,
                },
                { status: decideErrorStatus(result.code || 'UNLOCK_REQUEST_NOT_PENDING') }
            );
        }

        return NextResponse.json({
            success: true,
            data: result.request,
            temporaryUnlock: result.temporaryUnlock ?? null,
            message: MSG.UNLOCK_GRANTED,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
