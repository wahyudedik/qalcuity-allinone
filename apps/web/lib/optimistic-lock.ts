/**
 * Optimistic Concurrency Control (OCC) helper for Qalcuity.
 *
 * Prevents lost updates when multiple users edit the same record concurrently.
 * Uses a `version` integer field on each model — every UPDATE must check
 * the version matches before modifying, then increment atomically.
 *
 * Strategy: Use `prisma.$executeRawUnsafe` for the atomic version-checking
 * UPDATE, which works across all models without TypeScript union-type issues.
 */

import { prisma } from '@/lib/db';

// ---------------------------------------------------------------------------
// Custom error class for version conflicts
// ---------------------------------------------------------------------------

/**
 * Thrown when a concurrent modification is detected (version mismatch).
 * API routes should catch this and return 409 Conflict.
 */
export class ConflictError extends Error {
    public readonly statusCode = 409;
    public readonly code = 'CONCURRENT_MODIFICATION';

    constructor(entity: string, id: string) {
        super(`Data "${entity}" (${id}) has been modified by another user. Please refresh and try again.`);
        this.name = 'ConflictError';
    }
}

// ---------------------------------------------------------------------------
// Versioned update helper — uses raw SQL for atomic version check + update
// ---------------------------------------------------------------------------

/**
 * Perform an atomic optimistic-concurrency-safe UPDATE via raw SQL.
 *
 * Executes: UPDATE <table> SET <setClauses>, version = version + 1
 *           WHERE id = $1 AND tenant_id = $2 AND version = $3
 *
 * If affected rows = 0, throws ConflictError.
 *
 * @param table       Database table name (e.g., 'Invoice', 'Product')
 * @param id          Record ID
 * @param tenantId    Tenant ID for multi-tenant isolation
 * @param currentVersion  The version the caller last read
 * @param setClauses  SQL SET clauses (e.g., 'status = $4, notes = $5')
 * @param values      Additional parameter values (beyond id, tenantId, version)
 * @returns void — throws ConflictError on version mismatch
 *
 * @example
 * ```ts
 * await optimisticUpdateRaw('Invoice', id, tenantId, version, 'status = $4, notes = $5', ['PAID', 'Updated']);
 * ```
 */
export async function optimisticUpdateRaw(
    table: string,
    id: string,
    tenantId: string,
    currentVersion: number,
    setClauses: string,
    values: unknown[] = [],
): Promise<void> {
    // Build parameter positions: $1=id, $2=tenantId, $3=version, $4...=values
    const params = [id, tenantId, currentVersion, ...values];

    const sql = `
        UPDATE "${table}"
        SET ${setClauses}, version = version + 1, "updatedAt" = NOW()
        WHERE id = $1 AND "tenantId" = $2 AND version = $3
    `;

    const affectedRows = await prisma.$executeRawUnsafe(sql, ...params);

    if (affectedRows === 0) {
        throw new ConflictError(table, id);
    }
}

/**
 * Verify that a record's version matches the expected version.
 * Use this inside a $transaction for complex multi-step updates.
 *
 * @param table       Database table name
 * @param id          Record ID
 * @param tenantId    Tenant ID
 * @param currentVersion  Expected version
 * @throws ConflictError if version mismatch or record not found
 */
export async function verifyVersion(
    table: string,
    id: string,
    tenantId: string,
    currentVersion: number,
): Promise<void> {
    const sql = `
        SELECT id FROM "${table}"
        WHERE id = $1 AND "tenantId" = $2 AND version = $3
        LIMIT 1
    `;

    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        sql, id, tenantId, currentVersion
    );

    if (rows.length === 0) {
        throw new ConflictError(table, id);
    }
}

/**
 * Map of model names to their database table names for OCC.
 */
export const OCC_TABLE_MAP: Record<string, string> = {
    invoice: 'Invoice',
    payment: 'Payment',
    purchaseOrder: 'PurchaseOrder',
    quotation: 'Quotation',
    deal: 'Deal',
    product: 'Product',
    employee: 'Employee',
};
