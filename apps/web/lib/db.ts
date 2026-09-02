import { PrismaClient } from "@prisma/client";
import { validateEnv } from "./env-validation";

// Validate environment variables at startup
validateEnv();

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
