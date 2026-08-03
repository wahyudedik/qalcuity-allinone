/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ["@qalcuity/ui", "@qalcuity/db"],
    experimental: {
        optimizePackageImports: ["lucide-react"],
    },
};

module.exports = nextConfig;
