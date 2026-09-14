export const dynamic = 'force-dynamic';

/**
 * Mobile Auth — Get Current User Endpoint
 *
 * GET /api/mobile/auth/me
 *
 * Returns current user data from JWT access token.
 *
 * Headers: Authorization: Bearer <token>
 * Response: { success: boolean, user: MobileUser }
 *
 * Security:
 * - JWT token verified
 * - User existence and active status checked
 */

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';
import { getMobileUserFromToken } from '@/lib/mobile-auth';

export async function GET(request: Request) {
    try {
        // Extract token from Authorization header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'Token not found', code: 'TOKEN_NOT_FOUND' },
                { status: 401 }
            );
        }

        const token = authHeader.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Token not found', code: 'TOKEN_NOT_FOUND' },
                { status: 401 }
            );
        }

        const user = await getMobileUserFromToken(token);

        return NextResponse.json({
            success: true,
            user,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
