export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { trackLoginSession } from '@/lib/session-tracker';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/session-track — Track a login session
 *
 * Called by the client after successful login to create a UserSession record.
 * This is a safe way to hook into the login flow without modifying auth.ts.
 *
 * Body: { token: string, device?: string, ipAddress?: string, userAgent?: string }
 *
 * Rate limit: Default auth rate limit (via middleware)
 */
export async function POST(request: Request) {
    try {
        const auth = await requireAuth();
        const { userId, tenantId } = auth;

        const body = await request.json();
        const { token, device, ipAddress, userAgent } = body;

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Token is required' },
                { status: 400 }
            );
        }

        // Track the session (errors are handled gracefully inside)
        await trackLoginSession(userId, tenantId, token, device, ipAddress, userAgent);

        return NextResponse.json({
            success: true,
            message: 'Session tracked successfully',
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        // Session tracking should never break the flow
        logger.error('[SessionTrack] Failed to track session', error);
        return handleApiError(error);
    }
}
