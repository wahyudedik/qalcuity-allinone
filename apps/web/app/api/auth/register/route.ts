import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// Mock users database - akan diganti dengan Prisma di Phase 4
const users: Array<{
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    companyId: string;
}> = [];

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

        // Cek apakah email sudah terdaftar
        const existingUser = users.find((u) => u.email === email);
        if (existingUser) {
            return NextResponse.json(
                { error: "Email sudah terdaftar" },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Buat user baru
        const newUser = {
            id: String(users.length + 1),
            email,
            name: fullName,
            password: hashedPassword,
            role: "ADMIN",
            companyId: String(users.length + 1),
        };

        users.push(newUser);

        // Return success tanpa password
        const { password: _, ...userWithoutPassword } = newUser;

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
