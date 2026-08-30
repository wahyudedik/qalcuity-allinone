import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import prisma from "./db";

if (!process.env.NEXTAUTH_SECRET) {
    console.error('[AUTH] NEXTAUTH_SECRET is not set in environment variables!');
}

export const authOptions: NextAuthOptions = {
    providers: [
        // Google OAuth Provider — hanya aktif jika env vars ter-set
        ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ? [
                GoogleProvider({
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                }),
            ]
            : []),
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
        // Callback signIn — handle OAuth user (Google)
        async signIn({ user, account }) {
            // Hanya proses untuk OAuth providers (bukan credentials)
            if (account?.provider !== "google") {
                return true;
            }

            try {
                // Cari user berdasarkan email
                const existingUser = await prisma.user.findUnique({
                    where: { email: user.email! },
                });

                if (existingUser) {
                    // User sudah ada — izinkan sign in
                    // Update lastLoginAt (non-blocking)
                    prisma.user.update({
                        where: { id: existingUser.id },
                        data: { lastLoginAt: new Date() },
                    }).catch((err) => {
                        console.error("[Auth] Failed to update lastLoginAt:", err);
                    });
                    return true;
                }

                // User belum ada — buat Tenant baru + User baru
                const slugBase = (user.name || user.email!.split("@")[0])
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "");

                // Pastikan slug unik dengan suffix
                let slug = slugBase || "tenant";
                let slugExists = true;
                let attempt = 0;
                while (slugExists) {
                    const found = await prisma.tenant.findUnique({ where: { slug } });
                    if (!found) {
                        slugExists = false;
                    } else {
                        attempt++;
                        slug = `${slugBase}-${attempt}`;
                    }
                }

                // Buat Tenant baru
                const tenant = await prisma.tenant.create({
                    data: {
                        name: user.name || user.email!.split("@")[0],
                        slug,
                        email: user.email!,
                    },
                });

                // Buat User baru dengan role MEMBER
                await prisma.user.create({
                    data: {
                        email: user.email!,
                        name: user.name || user.email!.split("@")[0],
                        passwordHash: "", // OAuth users tidak perlu password
                        role: "MEMBER",
                        tenantId: tenant.id,
                        avatar: user.image || null,
                        isActive: true,
                    },
                });

                // Set tenantId pada user object agar tersimpan di JWT
                user.tenantId = tenant.id;
                user.role = "MEMBER";

                return true;
            } catch (error) {
                console.error("[Auth] Error in Google OAuth signIn callback:", error);
                return false;
            }
        },
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
