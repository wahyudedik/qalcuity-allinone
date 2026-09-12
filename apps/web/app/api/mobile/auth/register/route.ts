export const dynamic = 'force-dynamic';

/**
 * Mobile Auth â€” Register Endpoint
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
import { MSG } from '@/lib/api-messages';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { generateMobileToken, generateRefreshToken, type MobileUser } from '@/lib/mobile-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeInput } from '@/lib/sanitize';
import { logger } from '@/lib/logger';
import { mobileRegisterSchema, formatZodError } from '@/lib/validation-schemas';

export async function POST(request: Request) {
    try {
        // Rate limiting
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:mobile-register:${ip}`, 5, 300000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Too many registration attempts. Please try again in 5 minutes.', code: 'RATE_LIMITED' },
                { status: 429 }
            );
        }

        const body = await request.json();

        // Validate input with Zod schema
        const validation = mobileRegisterSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { name, email, password, companyName } = validation.data;

        // Sanitize inputs
        const sanitizedName = sanitizeInput(name);
        const sanitizedEmail = email.trim().toLowerCase();
        const sanitizedCompany = sanitizeInput(companyName);

        // Check duplicate email
        const existingUser = await prisma.user.findUnique({
            where: { email: sanitizedEmail },
        });

        if (existingUser) {
            return NextResponse.json(
                { success: false, error: 'Email already registered', code: 'DUPLICATE_EMAIL' },
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
                logger.error(`[MobileAuth] Unique constraint violation on field: ${field}`);
                return NextResponse.json(
                    { success: false, error: `Data sudah ada untuk ${String(field)}` },
                    { status: 400 }
                );
            }

            logger.error('[MobileAuth] Prisma error:', prismaError.code);
            return NextResponse.json(
                { success: false, error: 'Terjadi kesalahan database' },
                { status: 500 }
            );
        }

        const message = error instanceof Error ? error.message : 'Terjadi kesalahan server';
        logger.error('[MobileAuth] Register error:', message);

        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
