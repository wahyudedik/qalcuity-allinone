export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { prisma } from '@/lib/db';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

/**
 * POST /api/settings/sessions/revoke-all — Revoke all sessions except current
 *
 * Sets isActive = false on all user sessions except the current one.
 * Audit logs the bulk revocation.
 *
 * Rate limit: 5/60s (via middleware)
 */
export async function POST(request: Request) {
    try {
        const auth = await requireAuth();
        const { userId, tenantId } = auth;

        // Identify current session via header
        const currentSessionToken = request.headers.get('x-session-token');

        const result = await prisma.userSession.updateMany({
            where: {
                userId,
                tenantId,
                isActive: true,
                ...(currentSessionToken ? { token: { not: currentSessionToken } } : {}),
            },
            data: { isActive: false },
        });

        // Audit log
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'UserSession',
            entityId: 'all',
            oldValues: { revokedCount: result.count },
            newValues: { action: 'revoke_all_other_sessions' },
            request,
        });

        return NextResponse.json({
            success: true,
            message: `${result.count} other session(s) revoked successfully`,
            data: { revokedCount: result.count },
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }
        logger.error('[Sessions API] Failed to revoke all sessions', error);
        return handleApiError(error);
    }
}
