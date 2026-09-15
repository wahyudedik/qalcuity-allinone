export const dynamic = 'force-dynamic';

/**
 * API Route: /api/settings/password-policy
 *
 * GET  — Get current tenant's password policy (admin only)
 * PUT  — Update password policy (admin only)
 *
 * Requires ADMIN+ role.
 */

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { getDefaultPolicy, updatePasswordPolicy } from '@/lib/password-policy';
import { updatePasswordPolicySchema, formatZodError } from '@/lib/validation-schemas';
import { logger } from '@/lib/logger';

// ─── GET /api/settings/password-policy ────────────────────────────────────────

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }
        const { tenantId } = auth;

        const policy = await getDefaultPolicy(tenantId);

        return NextResponse.json({
            success: true,
            data: policy,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT /api/settings/password-policy ────────────────────────────────────────

export async function PUT(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId } = auth;

        const body = await request.json();

        const validation = updatePasswordPolicySchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const updated = await updatePasswordPolicy(tenantId, validation.data);

        // Audit log
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'PasswordPolicy',
            entityId: tenantId,
            oldValues: { policyUpdated: true },
            newValues: validation.data,
            request,
        });

        logger.info(`[PasswordPolicy] Updated for tenant ${tenantId}`);

        return NextResponse.json({
            success: true,
            data: updated,
            message: 'Password policy updated successfully',
        });
    } catch (error) {
        return handleApiError(error);
    }
}
