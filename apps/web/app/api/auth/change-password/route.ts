export const dynamic = 'force-dynamic';

/**
 * API Route: POST /api/auth/change-password
 *
 * Changes user password with policy validation and history checking.
 * Validates current password, checks new password against tenant policy,
 * saves to history, and updates the password hash.
 */

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { validatePassword, checkPasswordHistory, getDefaultPolicy, savePasswordHistory } from '@/lib/password-policy';
import { changePasswordApiSchema, formatZodError } from '@/lib/validation-schemas';

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId } = auth;

        const body = await request.json();

        const validation = changePasswordApiSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { currentPassword, newPassword } = validation.data;

        // Get current user
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, passwordHash: true, tenantId: true, updatedAt: true },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: MSG.USER_NOT_FOUND, code: 'USER_NOT_FOUND' },
                { status: 404 }
            );
        }

        // Tenant isolation check
        if (user.tenantId !== tenantId) {
            return NextResponse.json(
                { success: false, error: MSG.FORBIDDEN, code: 'FORBIDDEN' },
                { status: 403 }
            );
        }

        // Verify current password
        const bcrypt = await import('bcryptjs');
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isCurrentPasswordValid) {
            return NextResponse.json(
                { success: false, error: MSG.INVALID_CURRENT_PASSWORD, code: 'INVALID_PASSWORD' },
                { status: 400 }
            );
        }

        // Get tenant's password policy
        const policy = await getDefaultPolicy(tenantId);

        // Validate new password against policy
        const passwordCheck = validatePassword(newPassword, policy);
        if (!passwordCheck.valid) {
            return NextResponse.json(
                {
                    success: false,
                    error: MSG.PASSWORD_DOES_NOT_MEET_POLICY,
                    code: 'PASSWORD_POLICY_VIOLATION',
                    details: { errors: passwordCheck.errors },
                },
                { status: 400 }
            );
        }

        // Check password history
        const newHash = await bcrypt.hash(newPassword, 12);
        if (policy.preventReuse > 0) {
            const isNotReused = await checkPasswordHistory(userId, newHash, tenantId, policy.preventReuse);
            if (!isNotReused) {
                return NextResponse.json(
                    {
                        success: false,
                        error: MSG.PASSWORD_REUSED,
                        code: 'PASSWORD_REUSED',
                    },
                    { status: 400 }
                );
            }
        }

        // Save current password to history before updating
        await savePasswordHistory(userId, user.passwordHash);

        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newHash },
        });

        // Invalidate all other sessions for this user (security best practice)
        await prisma.userSession.updateMany({
            where: { userId, isActive: true },
            data: { isActive: false },
        });

        // Audit log
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'User',
            entityId: userId,
            oldValues: { passwordChanged: true },
            newValues: { passwordChanged: true },
            request,
        });

        logger.info(`[ChangePassword] Password changed for user ${userId}`);

        return NextResponse.json({
            success: true,
            message: MSG.PASSWORD_CHANGED_SUCCESS,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
