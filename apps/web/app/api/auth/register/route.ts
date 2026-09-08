import { NextResponse } from "next/server";
import { MSG } from '@/lib/api-messages';
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizeInput, isValidEmail } from "@/lib/sanitize";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:register:${ip}`, 5, 300000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { error: "Too many registration attempts. Please try again in 5 minutes.", code: 'RATE_LIMITED' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { companyName, fullName, email, password } = body;

        // Sanitize text inputs
        const sanitizedCompany = typeof companyName === 'string' ? sanitizeInput(companyName) : '';
        const sanitizedName = typeof fullName === 'string' ? sanitizeInput(fullName) : '';
        const sanitizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        // Validasi input
        if (!sanitizedCompany || !sanitizedName || !sanitizedEmail || !password) {
            return NextResponse.json(
                { error: "All fields are required", code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters", code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        // Validasi email format
        if (!isValidEmail(sanitizedEmail)) {
            return NextResponse.json(
                { error: "Invalid email format", code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        // Cek apakah email sudah terdaftar
        const existingUser = await prisma.user.findUnique({
            where: { email: sanitizedEmail },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Email already registered", code: 'DUPLICATE_EMAIL' },
                { status: 400 }
            );
        }

        // Hash password with cost factor 12 (consistent with security change password)
        const hashedPassword = await bcrypt.hash(password, 12);

        // Buat slug dari nama perusahaan
        const slug = sanitizedCompany
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        // Gunakan transaction untuk memastikan atomicitas
        const result = await prisma.$transaction(async (tx) => {
            // Buat tenant
            const tenant = await tx.tenant.create({
                data: {
                    name: sanitizedCompany,
                    slug: `${slug}-${Date.now()}`,
                },
            });

            // Buat user admin untuk tenant
            // SECURITY: Role is ALWAYS "ADMIN" for new registrations.
            // SUPERADMIN role is exclusively for the platform owner (info@qalcuity.com)
            // and can ONLY be assigned via direct database update by the platform owner.
            // No API endpoint should ever assign SUPERADMIN to a new user.
            const user = await tx.user.create({
                data: {
                    email: sanitizedEmail,
                    name: sanitizedName,
                    passwordHash: hashedPassword,
                    role: "ADMIN",
                    tenantId: tenant.id,
                },
            });

            return { tenant, user };
        });

        // Return success tanpa password
        const { passwordHash: _, ...userWithoutPassword } = result.user;

        // Fire-and-forget welcome email (graceful — never crashes)
        void sendWelcomeEmail(
            { name: result.user.name, email: result.user.email },
            { name: result.tenant.name, id: result.tenant.id }
        );

        return NextResponse.json(
            {
                message: "Registrasi berhasil",
                user: userWithoutPassword,
            },
            { status: 201 }
        );
    } catch (error: unknown) {
        // Handle Prisma-specific errors
        if (error && typeof error === 'object' && 'code' in error) {
            const prismaError = error as { code: string; meta?: Record<string, unknown> };

            // Unique constraint violation
            if (prismaError.code === 'P2002') {
                const target = prismaError.meta?.target;
                const field = Array.isArray(target) ? target[0] : 'field';
                console.error(`[Register] Unique constraint violation on field: ${field}`);
                return NextResponse.json(
                    { error: `Data already exists for ${String(field)}`, code: 'DUPLICATE_DATA' },
                    { status: 400 }
                );
            }

            // Foreign key constraint
            if (prismaError.code === 'P2003') {
                console.error("[Register] Foreign key constraint violation");
                return NextResponse.json(
                    { error: "Invalid data reference", code: 'INVALID_REFERENCE' },
                    { status: 400 }
                );
            }

            // Record not found
            if (prismaError.code === 'P2025') {
                console.error("[Register] Record not found");
                return NextResponse.json(
                    { error: "Data not found", code: 'NOT_FOUND' },
                    { status: 404 }
                );
            }

            console.error("[Register] Prisma error:", prismaError.code);
            return NextResponse.json(
                { error: "A database error occurred", code: 'DATABASE_ERROR' },
                { status: 500 }
            );
        }

        // Handle other errors
        console.error("[Register] Unexpected error:", error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { error: "An internal server error occurred", code: 'INTERNAL_SERVER_ERROR' },
            { status: 500 }
        );
    }
}
