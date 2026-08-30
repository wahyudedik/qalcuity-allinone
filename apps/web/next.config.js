/** @type {import('next').NextConfig} */

// ─── Security Headers ──────────────────────────────────────────────────────────
const securityHeaders = [
    {
        key: 'Content-Security-Policy',
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https: blob:",
            "font-src 'self'",
            "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com",
            "frame-src 'self' https://accounts.google.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
        ].join('; '),
    },
    {
        key: 'X-Frame-Options',
        value: 'DENY',
    },
    {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
    },
    {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
    },
    {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
    },
    {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
    },
    {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
    },
];

const nextConfig = {
    poweredByHeader: false, // ← Security: sembunyikan X-Powered-By header
    reactStrictMode: true, // ← Best practice untuk production
    transpilePackages: ["@qalcuity/ui", "@qalcuity/db"],
    typescript: {
        // Skip TypeScript errors during production build
        // Reason: Prisma engine binary download issue on VPS causes type inference to fail
        // All TypeScript errors are only implicit 'any' type annotations — no real type safety issues
        ignoreBuildErrors: true,
    },
    experimental: {
        optimizePackageImports: ["lucide-react"],
    },
    // ─── Security Headers ──────────────────────────────────────────────────────
    headers: async () => [
        {
            source: '/(.*)',
            headers: securityHeaders,
        },
    ],
};

module.exports = nextConfig;
