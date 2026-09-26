export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { checkSoDConflictsWithExceptions } from '@/lib/sod-engine';
import { z } from 'zod';

const checkSoDSchema = z.object({
    userId: z.string().min(1, 'User ID wajib diisi'),
    userRole: z.string().min(1, 'User role wajib diisi'),
    action: z.string().min(1, 'Action wajib diisi'),
    module: z.string().min(1, 'Module wajib diisi'),
});

// ─── POST: Check SoD conflicts for a user + action ──────────────────────────

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:sod-rules:check:${ip}`, 60, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const body = await request.json();
        const validation = checkSoDSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, errors: validation.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { userId, userRole, action, module } = validation.data;

        const result = await checkSoDConflictsWithExceptions({
            tenantId,
            userId,
            userRole,
            action,
            module,
        });

        return NextResponse.json({
            success: true,
            data: {
                hasConflict: result.hasConflict,
                conflictCount: result.conflicts.length,
                conflicts: result.conflicts,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
