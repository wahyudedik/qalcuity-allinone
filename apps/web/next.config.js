/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone', // ← WAJIB untuk PM2/VPS deployment
    poweredByHeader: false, // ← Security: sembunyikan X-Powered-By header
    reactStrictMode: true, // ← Best practice untuk production
    transpilePackages: ["@qalcuity/ui", "@qalcuity/db"],
    experimental: {
        optimizePackageImports: ["lucide-react"],
    },
};

module.exports = nextConfig;
