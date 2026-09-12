export const dynamic = 'force-dynamic';

/**
 * Mobile Auth â€” Token Refresh Endpoint
 * 
 * POST /api/mobile/auth/refresh
 * 
 * Refreshes access token using refresh token.
 * Returns new access token + refresh token.
 * 
 * Request:  { refreshToken: string }
 * Response: { success: boolean, token: string, refreshToken: string }
 * 
 * Security:
 * - Rate limited: 10 attempts per IP per 5 minutes
 * - Refresh token verified with separate secret
 * - User existence and active status checked
 */

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { refreshMobileToken } from '@/lib/mobile-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        // Rate limiting
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:mobile-refresh:${ip}`, 10, 300000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Too many attempts. Please try again in 5 minutes.', code: 'RATE_LIMITED' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { refreshToken } = body;

        if (!refreshToken || typeof refreshToken !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Refresh token is required', code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        const tokens = await refreshMobileToken(refreshToken);

        return NextResponse.json({
            success: true,
            token: tokens.token,
            refreshToken: tokens.refreshToken,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'An internal server error occurred';

        // JWT verification errors
        let status = 500;
        if (message.includes('invalid signature') || message.includes('jwt malformed') || message.includes('Token')) {
            status = 401;
        } else if (message.includes('expired')) {
            status = 401;
        } else if (message.includes('not found') || message.includes('dinonaktifkan')) {
            status = 401;
        }

        logger.error('[MobileAuth] Refresh error:', message);

        return NextResponse.json(
            { success: false, error: 'Token is invalid or has expired', code: 'INVALID_TOKEN' },
            { status }
        );
    }
}
