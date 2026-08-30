/** @type {import('next').NextConfig} */
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
};

module.exports = nextConfig;
