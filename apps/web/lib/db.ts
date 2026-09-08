import { PrismaClient } from "@prisma/client";

// Server-only: validate environment variables at startup.
// We guard this at the module level so that even if this module is
// transitively pulled into a client bundle (e.g., via anomaly-detection.ts),
// the validation code is completely tree-shaken away.
if (typeof window === 'undefined') {
    // Dynamic import to ensure validateEnv is only loaded server-side.
    // This prevents the entire env-validation module from being bundled
    // into client code, which would cause "Missing required env vars"
    // errors in the browser console.
    const { validateEnv } = require("./env-validation");
    validateEnv();
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Prisma query logging can be enabled via ENABLE_PRISMA_LOGGING=true in .env
// Defaults to disabled even in development to reduce noise.
const enablePrismaLogging =
    process.env.ENABLE_PRISMA_LOGGING === "true";

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: enablePrismaLogging
            ? ["query", "warn", "error"]
            : process.env.NODE_ENV === "development"
                ? ["warn", "error"]
                : [],
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
