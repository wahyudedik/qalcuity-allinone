/**
 * Mobile Auth — Login Endpoint
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
import { authenticateMobileUser } from '@/lib/mobile-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
    try {
        // Rate limiting
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:mobile-login:${ip}`, 5, 300000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak percobaan login. Coba lagi dalam 5 menit.' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { email, password } = body;

        // Validate required fields
        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: 'Email dan password harus diisi' },
                { status: 400 }
            );
        }

        if (typeof email !== 'string' || typeof password !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Format input tidak valid' },
                { status: 400 }
            );
        }

        // Authenticate
        const result = await authenticateMobileUser(email.trim().toLowerCase(), password);

        return NextResponse.json({
            success: true,
            user: result.user,
            token: result.token,
            refreshToken: result.refreshToken,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Terjadi kesalahan server';

        // Determine appropriate status code
        let status = 500;
        if (message.includes('tidak terdaftar') || message.includes('Password salah')) {
            status = 401;
        } else if (message.includes('dinonaktifkan')) {
            status = 403;
        }

        console.error('[MobileAuth] Login error:', message);

        return NextResponse.json(
            { success: false, error: message },
            { status }
        );
    }
}
