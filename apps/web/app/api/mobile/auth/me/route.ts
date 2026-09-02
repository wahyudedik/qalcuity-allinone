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
import { getMobileUserFromToken } from '@/lib/mobile-auth';

export async function GET(request: Request) {
    try {
        // Extract token from Authorization header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'Token tidak ditemukan' },
                { status: 401 }
            );
        }

        const token = authHeader.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Token tidak ditemukan' },
                { status: 401 }
            );
        }

        const user = await getMobileUserFromToken(token);

        return NextResponse.json({
            success: true,
            user,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Terjadi kesalahan server';

        let status = 500;
        if (message.includes('invalid signature') || message.includes('jwt malformed') || message.includes('Token')) {
            status = 401;
        } else if (message.includes('expired')) {
            status = 401;
        } else if (message.includes('tidak ditemukan') || message.includes('dinonaktifkan')) {
            status = 401;
        }

        console.error('[MobileAuth] Get user error:', message);

        return NextResponse.json(
            { success: false, error: 'Token tidak valid atau sudah expired' },
            { status }
        );
    }
}
