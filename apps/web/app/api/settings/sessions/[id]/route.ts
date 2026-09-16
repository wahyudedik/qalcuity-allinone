export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { prisma } from '@/lib/db';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

/**
 * DELETE /api/settings/sessions/[id] — Revoke a specific session
 *
 * Security checks:
 * - Session must belong to the current user (userId + tenantId match)
 * - Cannot revoke the current session (return 400)
 *
 * Rate limit: 10/60s (via middleware)
 */
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireAuth();
        const { userId, tenantId } = auth;
        const { id: sessionId } = params;

        if (!sessionId) {
            return NextResponse.json(
                { success: false, error: MSG.ID_REQUIRED },
                { status: 400 }
            );
        }

        // Find the session — must belong to current user
        const session = await prisma.userSession.findFirst({
            where: {
                id: sessionId,
                userId,
                tenantId,
                isActive: true,
            },
        });

        if (!session) {
            return NextResponse.json(
                { success: false, error: MSG.SESSION_NOT_FOUND_OR_DISABLED },
                { status: 404 }
            );
        }

        // Check if this is the current session
        const currentSessionToken = request.headers.get('x-session-token');
        if (currentSessionToken && session.token === currentSessionToken) {
            return NextResponse.json(
                { success: false, error: 'Cannot revoke your current session' },
                { status: 400 }
            );
        }

        // Deactivate the session
        await prisma.userSession.update({
            where: { id: sessionId },
            data: { isActive: false },
        });

        // Audit log
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'UserSession',
            entityId: sessionId,
            oldValues: { isActive: true },
            newValues: { isActive: false },
            request,
        });

        return NextResponse.json({
            success: true,
            message: 'Session revoked successfully',
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }
        logger.error('[Sessions API] Failed to revoke session', error);
        return handleApiError(error);
    }
}
