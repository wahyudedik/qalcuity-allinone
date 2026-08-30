import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./db";

if (!process.env.NEXTAUTH_SECRET) {
    console.error('[AUTH] NEXTAUTH_SECRET is not set in environment variables!');
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email dan password harus diisi");
                }

                try {
                    // Cari user berdasarkan email dari database
                    const user = await prisma.user.findUnique({
                        where: { email: credentials.email },
                        include: { tenant: true },
                    });

                    if (!user) {
                        throw new Error("Email tidak terdaftar");
                    }

                    if (!user.isActive) {
                        throw new Error("Akun sudah dinonaktifkan");
                    }

                    // Verifikasi password dengan bcrypt
                    const isPasswordValid = await bcrypt.compare(
                        credentials.password,
                        user.passwordHash
                    );

                    if (!isPasswordValid) {
                        throw new Error("Password salah");
                    }

                    // Update last login timestamp (non-blocking)
                    prisma.user.update({
                        where: { id: user.id },
                        data: { lastLoginAt: new Date() },
                    }).catch((err) => {
                        console.error("[Auth] Failed to update lastLoginAt:", err);
                    });

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        tenantId: user.tenantId,
                    };
                } catch (error) {
                    // Re-throw known errors (validation messages)
                    if (error instanceof Error) {
                        throw error;
                    }
                    console.error("[Auth] Unexpected error in authorize:", error);
                    throw new Error("Terjadi kesalahan saat memverifikasi kredensial");
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.tenantId = user.tenantId;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub!;
                session.user.role = token.role;
                session.user.tenantId = token.tenantId;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET!,
};
