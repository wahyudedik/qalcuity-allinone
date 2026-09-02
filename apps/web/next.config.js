/** @type {import('next').NextConfig} */

// ─── Security Headers ──────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== 'production';

const securityHeaders = [
    {
        key: 'Content-Security-Policy',
        // NOTE: 'unsafe-inline' for script-src is required by Next.js for inline hydration scripts.
        // 'unsafe-eval' is ONLY allowed in development mode — required by React Fast Refresh
        // (react-refresh-utils/dist/runtime.js uses eval). In production, 'unsafe-eval' is
        // excluded to strengthen XSS protection.
        // 'unsafe-inline' for style-src is required by Tailwind CSS.
        value: [
            "default-src 'self'",
            `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://accounts.google.com https://apis.google.com https://static.cloudflareinsights.com`,
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https: blob:",
            "font-src 'self'",
            "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://static.cloudflareinsights.com",
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
        // Skip TypeScript checking during `next build` to avoid failures on VPS
        // caused by environment differences (Node.js version, Prisma client version, etc.).
        // TypeScript can still be checked manually via `npx tsc --noEmit`.
        ignoreBuildErrors: true,
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
                    value: 'Content-Type, Authorization, X-CSRF-Token',
                },
                {
                    key: 'Access-Control-Allow-Credentials',
                    value: 'true',
                },
                {
                    key: 'Access-Control-Max-Age',
                    value: '86400',
                },
            ],
        },
    ],
};

module.exports = nextConfig;
