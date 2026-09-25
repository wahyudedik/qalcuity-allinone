/**
 * Tenant Context — AsyncLocalStorage-based tenant isolation context.
 *
 * Provides a request-scoped storage for `tenantId` and `userId` so that
 * Prisma Client Extensions (see prisma-tenant.ts) can automatically inject
 * `tenantId` into every query without requiring each API route to pass it
 * explicitly.
 *
 * USAGE:
 *   1. In API routes, wrap your business logic with `tenantStorage.run()`:
 *
 *      import { tenantStorage } from '@/lib/tenant-context';
 *
 *      const auth = await requireAuth();
 *      return tenantStorage.run({ tenantId: auth.tenantId, userId: auth.userId }, async () => {
 *        // All prisma queries inside here will automatically filter by tenantId
 *        const leads = await prisma.lead.findMany({ where: { status: 'NEW' } });
 *      });
 *
 *   2. Or use `getTenantId()` / `getUserId()` anywhere inside the context:
 *
 *      import { getTenantId } from '@/lib/tenant-context';
 *      const tenantId = getTenantId(); // returns string | undefined
 *
 * INCREMENTAL ADOPTION:
 *   - Existing routes that manually filter by tenantId continue to work.
 *   - New routes (or routes being refactored) can use this context.
 *   - The Prisma extension (prisma-tenant.ts) only injects tenantId when
 *     a context is active AND the query doesn't already include tenantId.
 */

import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
    /** The tenant ID for the current request. */
    tenantId: string;
    /** The authenticated user ID for the current request. */
    userId: string;
}

/**
 * AsyncLocalStorage instance that holds the tenant context for the
 * duration of a single request. Each request gets its own isolated
 * context — no data leaks between concurrent requests.
 *
 * @see https://nodejs.org/api/async_hooks.html#class-asynclocalstorage
 */
export const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Get the current request's tenant ID.
 * Returns `undefined` if called outside a `tenantStorage.run()` context
 * (e.g., in background jobs, cron tasks, or legacy routes that haven't
 * adopted the context yet).
 */
export function getTenantId(): string | undefined {
    return tenantStorage.getStore()?.tenantId;
}

/**
 * Get the current request's user ID.
 * Returns `undefined` if called outside a `tenantStorage.run()` context.
 */
export function getUserId(): string | undefined {
    return tenantStorage.getStore()?.userId;
}

/**
 * Get the full tenant context for the current request.
 * Returns `undefined` if called outside a `tenantStorage.run()` context.
 */
export function getTenantContext(): TenantContext | undefined {
    return tenantStorage.getStore();
}

/**
 * Check if a tenant context is currently active.
 * Useful for conditional logic where you want to know whether
 * automatic tenant isolation is available.
 */
export function hasTenantContext(): boolean {
    return tenantStorage.getStore() !== undefined;
}
