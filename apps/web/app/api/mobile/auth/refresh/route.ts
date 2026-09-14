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
import { handleApiError } from '@/lib/api-error';
import { refreshMobileToken } from '@/lib/mobile-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { mobileRefreshSchema, formatZodError } from '@/lib/validation-schemas';

export async function POST(request: Request) {
    try {
        // Rate limiting
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:mobile-refresh:${ip}`, 10, 300000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS, code: 'RATE_LIMITED' },
                { status: 429 }
            );
        }

        const body = await request.json();

        // Zod validation
        const validation = mobileRefreshSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { refreshToken } = validation.data;

        const tokens = await refreshMobileToken(refreshToken);

        return NextResponse.json({
            success: true,
            token: tokens.token,
            refreshToken: tokens.refreshToken,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
