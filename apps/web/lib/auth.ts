import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import prisma from "./db";
import { logger } from '@/lib/logger';

// ─── Security: NEXTAUTH_SECRET is MANDATORY in ALL environments ────────────────
// Previously, development mode used an insecure fallback. This is now removed
// to prevent accidental deployment to production without a proper secret.
// See: docs/SECURITY.md — H01 (Hardcoded NEXTAUTH_SECRET)
const secret = process.env.NEXTAUTH_SECRET;
if (!secret) {
    throw new Error(
        '[AUTH] CRITICAL: NEXTAUTH_SECRET is not set! ' +
        'Set it in apps/web/.env (or .env.local). ' +
        'Generate one with: openssl rand -base64 32'
    );
}

// ─── Google OAuth Graceful Degradation ──────────────────────────────────────────
// Validates Google OAuth credentials format. Returns true only if:
// 1. Both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set
// 2. Values are non-empty and not placeholder strings
// This prevents registering a broken Google provider on VPS/production
// where env vars may be set but Google OAuth is unreachable or misconfigured.
function isGoogleOAuthConfigured(): boolean {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return false;
    }

    // Reject empty, too-short, or placeholder values
    if (clientId.length < 10 || clientSecret.length < 10) {
        return false;
    }

    const placeholderPatterns = ['your-', 'xxx', 'placeholder', 'REPLACE_ME', 'CHANGE_THIS'];
    const isPlaceholder = placeholderPatterns.some(
        p => clientId.toLowerCase().includes(p.toLowerCase()) ||
            clientSecret.toLowerCase().includes(p.toLowerCase())
    );

    if (isPlaceholder) {
        logger.warn(
            '[Auth] Google OAuth credentials appear to be placeholder values. ' +
            'Google login is disabled.'
        );
        return false;
    }

    return true;
}

export const authOptions: NextAuthOptions = {
    // trustHost: REQUIRED — VPS runs behind Nginx reverse proxy (aaPanel).
    // Without this, NextAuth v4.24+ host validation fails during OAuth redirect flow,
    // causing OAuthSignin error. See: https://next-auth.js.org/configuration/options#trusthost
    // @ts-expect-error — trustHost exists at runtime in next-auth v4.24+ but types lag behind
    trustHost: true,
    providers: [
        // Google OAuth Provider — hanya aktif jika credentials valid
        // Graceful degradation: jika env vars tidak ada atau tidak valid,
        // Google provider tidak didaftarkan dan login hanya via email/password.
        // Lihat juga: /api/auth/providers untuk client-side availability check.
        ...(isGoogleOAuthConfigured()
            ? [
                GoogleProvider({
                    clientId: process.env.GOOGLE_CLIENT_ID!,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
                    // Explicit authorization params — ensures correct redirect URI.
                    // NextAuth derives the callback URL from NEXTAUTH_URL + provider id:
                    //   callbackUrl = `${NEXTAUTH_URL}/api/auth/callback/google`
                    // This MUST match the "Authorized redirect URI" in Google Cloud Console.
                    authorization: {
                        params: {
                            prompt: "consent",
                            access_type: "offline",
                            response_type: "code",
                            url: "https://accounts.google.com/o/oauth2/v2/auth",
                        },
                    },
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
                        logger.error("[Auth] Failed to update lastLoginAt", err);
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
                    logger.error("[Auth] Unexpected error in authorize", error);
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

            // Verbose console logging for OAuth diagnostics (temporary — remove after fix verified)
            console.log('[Auth] Google sign-in attempt:', {
                email: user?.email,
                provider: account?.provider,
                hasToken: !!account?.access_token,
            });

            try {
                logger.info("[Auth] Google OAuth signIn attempt", {
                    email: user.email,
                    name: user.name,
                    provider: account.provider,
                });

                // Cari user berdasarkan email
                const existingUser = await prisma.user.findUnique({
                    where: { email: user.email! },
                });

                if (existingUser) {
                    // User sudah ada — izinkan sign in
                    logger.info("[Auth] Google OAuth: existing user found", {
                        userId: existingUser.id,
                        tenantId: existingUser.tenantId,
                        role: existingUser.role,
                    });

                    // CRITICAL: Set tenantId & role on user object so JWT callback
                    // can store them in the token. Without this, the JWT would have
                    // undefined values for role/tenantId, breaking dashboard access.
                    user.tenantId = existingUser.tenantId;
                    user.role = existingUser.role;

                    // Update lastLoginAt (non-blocking)
                    prisma.user.update({
                        where: { id: existingUser.id },
                        data: { lastLoginAt: new Date() },
                    }).catch((err) => {
                        logger.error("[Auth] Failed to update lastLoginAt", err);
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
                // Log detailed error for debugging OAuthSignin issues.
                // Common causes:
                //   1. VPS cannot reach Google OAuth endpoints (firewall/DNS)
                //   2. Redirect URI mismatch (Google Cloud Console vs NEXTAUTH_URL)
                //   3. Invalid/expired client secret
                //   4. Database error (tenant/user creation failed)
                logger.error("[Auth] Error in Google OAuth signIn callback", {
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    email: user.email,
                    name: user.name,
                    nextauthUrl: process.env.NEXTAUTH_URL,
                    // Diagnostic: check if VPS can reach Google
                    googleClientId: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + "...",
                });
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
        // Redirect callback — safety net to prevent redirect loops.
        // When signIn() with redirect:true succeeds, NextAuth calls this to determine
        // where to redirect. Without this, default behavior may redirect back to /login
        // in edge cases (e.g., after registration when callbackUrl points to /login).
        // This ensures post-auth redirects always go to a safe app page.
        async redirect({ url, baseUrl }) {
            // If url is already on the app (same origin), allow it
            if (url.startsWith('/')) return `${baseUrl}${url}`;
            // If url is on the same origin, allow it
            try {
                const urlObj = new URL(url);
                const baseObj = new URL(baseUrl);
                if (urlObj.origin === baseObj.origin) return url;
            } catch {
                // Invalid URL — fall through to default
            }
            // Default: redirect to dashboard
            return `${baseUrl}/dashboard`;
        },
    },
    // Custom error page — NextAuth redirects here on OAuth errors.
    // The error code (e.g., OAuthSignin, OAuthCallback) is passed as ?error= query param.
    // This allows the login page to display user-friendly error messages.
    // @see https://next-auth.js.org/configuration/pages#error-page
    pages: {
        signIn: "/login",
        error: "/login",
    },
    session: {
        strategy: "jwt",
    },
    secret,
    // Debug mode in development — logs OAuth flow details to console.
    // Remove or set to false in production once OAuth is working.
    // Debug mode — ENABLED temporarily for production OAuth diagnostics.
    // Remove or revert to `process.env.NODE_ENV === "development"` after OAuth fix is verified.
    debug: true,
};
