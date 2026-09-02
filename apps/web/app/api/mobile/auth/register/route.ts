/**
 * Mobile Auth — Register Endpoint
 * 
 * POST /api/mobile/auth/register
 * 
 * Registers new user + tenant for mobile app.
 * Returns JWT access token + refresh token on success.
 * 
 * Request:  { name: string, email: string, password: string, companyName: string }
 * Response: { success: boolean, user: MobileUser, token: string, refreshToken: string }
 * 
 * Security:
 * - Rate limited: 5 attempts per IP per 5 minutes
 * - Input sanitization on all text fields
 * - Password minimum 8 characters
 * - Email format validation
 * - Duplicate email check
 */

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { generateMobileToken, generateRefreshToken, type MobileUser } from '@/lib/mobile-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeInput, isValidEmail } from '@/lib/sanitize';

export async function POST(request: Request) {
    try {
        // Rate limiting
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:mobile-register:${ip}`, 5, 300000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak percobaan registrasi. Coba lagi dalam 5 menit.' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { name, email, password, companyName } = body;

        // Sanitize inputs
        const sanitizedName = typeof name === 'string' ? sanitizeInput(name) : '';
        const sanitizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        const sanitizedCompany = typeof companyName === 'string' ? sanitizeInput(companyName) : '';

        // Validate required fields
        if (!sanitizedName || !sanitizedEmail || !password || !sanitizedCompany) {
            return NextResponse.json(
                { success: false, error: 'Semua field harus diisi (name, email, password, companyName)' },
                { status: 400 }
            );
        }

        // Validate email format
        if (!isValidEmail(sanitizedEmail)) {
            return NextResponse.json(
                { success: false, error: 'Format email tidak valid' },
                { status: 400 }
            );
        }

        // Validate password
        if (typeof password !== 'string' || password.length < 8) {
            return NextResponse.json(
                { success: false, error: 'Password minimal 8 karakter' },
                { status: 400 }
            );
        }

        // Check duplicate email
        const existingUser = await prisma.user.findUnique({
            where: { email: sanitizedEmail },
        });

        if (existingUser) {
            return NextResponse.json(
                { success: false, error: 'Email sudah terdaftar' },
                { status: 400 }
            );
        }

        // Hash password (cost factor 12, consistent with web register)
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create slug from company name
        const slug = sanitizedCompany
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        // Atomic transaction: create tenant + user
        const result = await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: sanitizedCompany,
                    slug: `${slug}-${Date.now()}`,
                },
            });

            const user = await tx.user.create({
                data: {
                    email: sanitizedEmail,
                    name: sanitizedName,
                    passwordHash: hashedPassword,
                    role: 'ADMIN',
                    tenantId: tenant.id,
                },
            });

            return { tenant, user };
        });

        const mobileUser: MobileUser = {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
            tenantId: result.user.tenantId,
            avatar: result.user.avatar,
            isActive: result.user.isActive,
        };

        return NextResponse.json({
            success: true,
            user: mobileUser,
            token: generateMobileToken(mobileUser),
            refreshToken: generateRefreshToken(mobileUser),
        }, { status: 201 });
    } catch (error: unknown) {
        // Handle Prisma-specific errors
        if (error && typeof error === 'object' && 'code' in error) {
            const prismaError = error as { code: string; meta?: Record<string, unknown> };

            if (prismaError.code === 'P2002') {
                const target = prismaError.meta?.target;
                const field = Array.isArray(target) ? target[0] : 'field';
                console.error(`[MobileAuth] Unique constraint violation on field: ${field}`);
                return NextResponse.json(
                    { success: false, error: `Data sudah ada untuk ${String(field)}` },
                    { status: 400 }
                );
            }

            console.error('[MobileAuth] Prisma error:', prismaError.code);
            return NextResponse.json(
                { success: false, error: 'Terjadi kesalahan database' },
                { status: 500 }
            );
        }

        const message = error instanceof Error ? error.message : 'Terjadi kesalahan server';
        console.error('[MobileAuth] Register error:', message);

        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
