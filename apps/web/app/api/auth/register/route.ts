import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { companyName, fullName, email, password } = body;

        // Validasi input
        if (!companyName || !fullName || !email || !password) {
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

        // Validasi email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: "Format email tidak valid" },
                { status: 400 }
            );
        }

        // Cek apakah email sudah terdaftar
        const existingUser = await prisma.user.findUnique({
            where: { email },
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
        const slug = companyName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        // Gunakan transaction untuk memastikan atomicitas
        const result = await prisma.$transaction(async (tx) => {
            // Buat tenant
            const tenant = await tx.tenant.create({
                data: {
                    name: companyName,
                    slug: `${slug}-${Date.now()}`,
                },
            });

            // Buat user admin untuk tenant
            const user = await tx.user.create({
                data: {
                    email,
                    name: fullName,
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
