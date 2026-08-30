import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizeInput, isValidEmail } from "@/lib/sanitize";

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:register:${ip}`, 5, 300000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { error: "Terlalu banyak percobaan registrasi. Coba lagi dalam 5 menit." },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { companyName, fullName, email, password } = body;

        // Sanitize text inputs
        const sanitizedCompany = typeof companyName === 'string' ? sanitizeInput(companyName) : '';
        const sanitizedName = typeof fullName === 'string' ? sanitizeInput(fullName) : '';
        const sanitizedEmail = typeof email === 'string' ? sanitizeInput(email) : '';

        // Validasi input
        if (!sanitizedCompany || !sanitizedName || !sanitizedEmail || !password) {
            return NextResponse.json(
                { error: "Semua field harus diisi" },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "Password minimal 8 karakter" },
                { status: 400 }
            );
        }

        // Validasi email format using sanitize utility
        if (!isValidEmail(sanitizedEmail)) {
            return NextResponse.json(
                { error: "Format email tidak valid" },
                { status: 400 }
            );
        }

        // Cek apakah email sudah terdaftar
        const existingUser = await prisma.user.findUnique({
            where: { email: sanitizedEmail },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Email sudah terdaftar" },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Buat tenant baru untuk perusahaan
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

        return NextResponse.json(
            {
                message: "Registrasi berhasil",
                user: userWithoutPassword,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Register error:", error);
        return NextResponse.json(
            { error: "Terjadi kesalahan server" },
            { status: 500 }
        );
    }
}
