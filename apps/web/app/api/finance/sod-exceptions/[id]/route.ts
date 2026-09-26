export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { approveSoDException, getSoDExceptionById } from '@/lib/sod-exception';
import { z } from 'zod';

const decisionSchema = z.object({
    decision: z.enum(['APPROVED', 'REJECTED'], { message: 'Decision harus "APPROVED" atau "REJECTED"' }),
    comments: z.string().max(1000, 'Comments maksimal 1000 karakter').optional(),
});

// ─── GET: Get a single SoD exception by ID ──────────────────────────────────

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
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

        const exception = await getSoDExceptionById({
            exceptionId: params.id,
            tenantId,
        });

        if (!exception) {
            return NextResponse.json({ success: false, error: MSG.DATA_NOT_FOUND }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: exception });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT: Approve or reject a SoD exception ─────────────────────────────────

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:sod-exceptions:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Verify exception exists and belongs to tenant
        const existing = await getSoDExceptionById({
            exceptionId: params.id,
            tenantId,
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: MSG.DATA_NOT_FOUND }, { status: 404 });
        }

        const body = await request.json();
        const validation = decisionSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, errors: validation.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { decision, comments } = validation.data;

        const result = await approveSoDException({
            exceptionId: params.id,
            approverId: userId,
            decision,
            comments,
            request,
        });

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        return handleApiError(error);
    }
}
