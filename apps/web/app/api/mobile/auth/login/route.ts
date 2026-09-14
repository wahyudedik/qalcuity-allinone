export const dynamic = 'force-dynamic';

/**
 * Mobile Auth â€” Login Endpoint
 * 
 * POST /api/mobile/auth/login
 * 
 * Authenticates mobile user with email and password.
 * Returns JWT access token + refresh token on success.
 * 
 * Request:  { email: string, password: string }
 * Response: { success: boolean, user: MobileUser, token: string, refreshToken: string }
 * 
 * Security:
 * - Rate limited: 5 attempts per IP per 5 minutes
 * - Input sanitization on email
 * - Password verified with bcrypt
 */

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';
import { authenticateMobileUser } from '@/lib/mobile-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { mobileLoginSchema, formatZodError } from '@/lib/validation-schemas';

export async function POST(request: Request) {
    try {
        // Rate limiting
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:mobile-login:${ip}`, 5, 300000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS, code: 'RATE_LIMITED' },
                { status: 429 }
            );
        }

        const body = await request.json();

        // Zod validation
        const validation = mobileLoginSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { email, password } = validation.data;

        // Authenticate
        const result = await authenticateMobileUser(email.trim().toLowerCase(), password);

        return NextResponse.json({
            success: true,
            user: result.user,
            token: result.token,
            refreshToken: result.refreshToken,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
