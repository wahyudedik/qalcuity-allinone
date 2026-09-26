export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { requestSoDException, getSoDExceptions } from '@/lib/sod-exception';
import { z } from 'zod';

const requestExceptionSchema = z.object({
    ruleId: z.string().min(1, 'Rule ID wajib diisi'),
    reason: z.string().min(10, 'Alasan minimal 10 karakter').max(1000, 'Alasan maksimal 1000 karakter'),
    durationDays: z.number().int().min(1).max(90).optional(),
});

// ─── GET: List SoD exceptions for tenant ────────────────────────────────────

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:sod-exceptions:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') ?? undefined;
        const userId = searchParams.get('userId') ?? undefined;
        const ruleId = searchParams.get('ruleId') ?? undefined;

        const exceptions = await getSoDExceptions({
            tenantId,
            status,
            userId,
            ruleId,
        });

        const data = exceptions.map((e) => ({
            id: e.id,
            ruleId: e.ruleId,
            userId: e.userId,
            reason: e.reason,
            approverId: e.approverId,
            status: e.status,
            decision: e.decision,
            expiresAt: e.expiresAt.toISOString(),
            decidedAt: e.decidedAt?.toISOString() ?? null,
            createdAt: e.createdAt.toISOString(),
            updatedAt: e.updatedAt.toISOString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── POST: Request a SoD exception ──────────────────────────────────────────

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:sod-exceptions:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        const body = await request.json();
        const validation = requestExceptionSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, errors: validation.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { ruleId, reason, durationDays } = validation.data;

        const exception = await requestSoDException({
            tenantId,
            ruleId,
            userId,
            reason,
            durationDays,
            request,
        });

        return NextResponse.json({ success: true, data: exception }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
