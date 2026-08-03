import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

// Mock user database - akan diganti dengan Prisma di Phase 4
const users = [
    {
        id: "1",
        email: "admin@qalcuity.com",
        name: "Admin Qalcuity",
        password: "$2a$10$hashedpassword", // password: admin123
        role: "ADMIN",
        companyId: "1",
    },
    {
        id: "2",
        email: "user@qalcuity.com",
        name: "User Demo",
        password: "$2a$10$hashedpassword", // password: user123
        role: "USER",
        companyId: "1",
    },
];

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

                // Cari user berdasarkan email
                const user = users.find((u) => u.email === credentials.email);
                if (!user) {
                    throw new Error("Email tidak terdaftar");
                }

                // Untuk demo, langsung accept password
                // Di production, gunakan bcrypt.compare(credentials.password, user.password)
                if (credentials.password !== "admin123" && credentials.password !== "user123") {
                    throw new Error("Password salah");
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    companyId: user.companyId,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.companyId = user.companyId;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub;
                session.user.role = token.role as string;
                session.user.companyId = token.companyId as string;
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
    secret: process.env.NEXTAUTH_SECRET || "qalcuity-secret-key-change-in-production",
};
