export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { prisma } from '@/lib/db';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

/**
 * GET /api/settings/sessions — List active sessions for the current user
 *
 * Returns all active sessions with device info, IP, and last active time.
 * The current session is identified by comparing the session token.
 *
 * Rate limit: 30/60s (via middleware)
 */
export async function GET(request: Request) {
    try {
        const auth = await requireAuth();
        const { userId, tenantId } = auth;

        // Fetch active sessions for this user
        const sessions = await prisma.userSession.findMany({
            where: {
                userId,
                tenantId,
                isActive: true,
            },
            orderBy: { lastActiveAt: 'desc' },
            select: {
                id: true,
                token: true,
                device: true,
                ipAddress: true,
                userAgent: true,
                lastActiveAt: true,
                expiresAt: true,
                createdAt: true,
            },
        });

        // Identify current session via x-session-token header or cookie
        const currentSessionToken = request.headers.get('x-session-token') || null;

        const data = sessions.map((session) => ({
            id: session.id,
            device: session.device || 'Unknown Device',
            ipAddress: session.ipAddress || 'Unknown IP',
            userAgent: session.userAgent || 'Unknown Browser',
            isCurrent: currentSessionToken ? session.token === currentSessionToken : false,
            lastActiveAt: session.lastActiveAt.toISOString(),
            expiresAt: session.expiresAt.toISOString(),
            createdAt: session.createdAt.toISOString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }
        logger.error('[Sessions API] Failed to list sessions', error);
        return handleApiError(error);
    }
}
