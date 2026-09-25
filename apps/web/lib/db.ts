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

// ─── Tenant-Scoped Prisma Client ─────────────────────────────────────────────
// `prismaTenant` extends the base `prisma` client with automatic tenant isolation.
// When used inside a `tenantStorage.run()` context, ALL queries for tenant-scoped
// models automatically inject `tenantId` — no manual filtering needed.
//
// USAGE:
//   import { prismaTenant } from '@/lib/db';
//   import { tenantStorage } from '@/lib/tenant-context';
//
//   return tenantStorage.run({ tenantId: auth.tenantId, userId: auth.userId }, async () => {
//     // tenantId is auto-injected — no manual where: { tenantId } needed
//     const contacts = await prismaTenant.contact.findMany({ where: { type: 'CUSTOMER' } });
//   });
//
// IMPORTANT:
//   - Always wrap business logic with `tenantStorage.run()` for auto-scoping
//   - The extension only injects tenantId when NOT already present (backward-compatible)
//   - `prisma` (unfiltered) should still be used for platform/superadmin routes
//   - `findUnique` (by ID) is NOT intercepted — ID lookups are safe
import { modelExtensions } from './prisma-tenant';

export const prismaTenant = prisma.$extends(modelExtensions as any);

// ─── Tenant Isolation Utilities ───────────────────────────────────────────────
// Re-export tenant isolation utilities for convenient access.
// See prisma-tenant.ts for the Prisma Client Extension that auto-injects tenantId.
// See tenant-context.ts for the AsyncLocalStorage-based tenant context.

export { getScopedPrisma, isTenantScopedModel, getTenantScopedModelCount, TENANT_SCOPED_MODELS, modelExtensions } from './prisma-tenant';
export { getTenantId, getUserId, getTenantContext, hasTenantContext, tenantStorage } from './tenant-context';
export type { TenantContext } from './tenant-context';
