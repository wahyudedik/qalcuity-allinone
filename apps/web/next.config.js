/** @type {import('next').NextConfig} */

// ─── Security Headers ──────────────────────────────────────────────────────────
const securityHeaders = [
    {
        key: 'Content-Security-Policy',
        // NOTE: 'unsafe-inline' for script-src is required by Next.js for inline hydration scripts.
        // 'unsafe-eval' has been removed to strengthen XSS protection.
        // 'unsafe-inline' for style-src is required by Tailwind CSS.
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
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
        // TypeScript errors should NOT be ignored in production builds.
        // Previously set to true as workaround for Prisma engine binary issue on VPS.
        // Setting to false ensures type safety is enforced during build.
        ignoreBuildErrors: false,
    },
    experimental: {
        optimizePackageImports: ["lucide-react"],
    },
    // ─── Security Headers ──────────────────────────────────────────────────────
    // See: docs/SECURITY.md — H02 (CSP) & H03 (CORS)
    headers: async () => [
        {
            source: '/(.*)',
            headers: securityHeaders,
        },
        // ─── CORS for API routes ────────────────────────────────────────────────
        // Explicit CORS headers for API routes. Defense-in-depth: CORS is also
        // enforced at middleware level. This ensures headers are set even if
        // middleware is bypassed (e.g., internal Next.js API calls).
        {
            source: '/api/:path*',
            headers: [
                {
                    key: 'Access-Control-Allow-Origin',
                    value: process.env.NEXT_PUBLIC_APP_URL || 'https://qalcuity.com',
                },
                {
                    key: 'Access-Control-Allow-Methods',
                    value: 'GET, POST, PUT, DELETE, OPTIONS',
                },
                {
                    key: 'Access-Control-Allow-Headers',
                    value: 'Content-Type, Authorization',
                },
            ],
        },
    ],
};

module.exports = nextConfig;
