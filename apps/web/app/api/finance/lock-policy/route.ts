export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { handleApiError } from '@/lib/api-error';
import { formatZodError, updateLockPolicySchema } from '@/lib/validation-schemas';
import { getLockPolicy, updateLockPolicy } from '@/lib/lock-policy';

// ─── GET: Ambil lock policy tenant ───────────────────────────────────────────

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:lock-policy:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const policy = await getLockPolicy(tenantId);

        return NextResponse.json({ success: true, data: policy });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT: Update lock policy (ADMIN only) ────────────────────────────────────

export async function PUT(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:lock-policy:PUT:${ip}`, 20, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId, role } = auth;

        // Explicit ADMIN-only check (di samping fallback route permission)
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: MSG.FORBIDDEN, code: 'LOCK_POLICY_FORBIDDEN' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);

        const validation = updateLockPolicySchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: formatZodError(validation.error), code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        const oldPolicy = await getLockPolicy(tenantId);
        const newPolicy = await updateLockPolicy(tenantId, validation.data);

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'LockPolicy',
            entityId: tenantId,
            oldValues: oldPolicy as unknown as Record<string, unknown>,
            newValues: newPolicy as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({
            success: true,
            data: newPolicy,
            message: MSG.LOCK_POLICY_UPDATED,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
