/**
 * Soft Delete Helper for Financial Models
 *
 * Provides utility functions for soft-deleting financial records.
 * Soft-deleted records are excluded from normal queries but can be
 * restored by administrators if needed.
 */

import { PrismaClient } from '@prisma/client';

type PrismaModel = {
    updateMany: (args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
    }) => Promise<{ count: number }>;
};

/**
 * Perform a soft delete on a record by setting deletedAt and deletedBy.
 *
 * @param prisma - Prisma client instance (or transaction client)
 * @param model - Model name (e.g., 'invoice', 'payment')
 * @param id - Record ID
 * @param tenantId - Tenant ID for isolation
 * @param userId - User performing the delete
 * @returns Update result with count of affected rows
 */
export async function softDelete(
    prisma: PrismaClient | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
    model: string,
    id: string,
    tenantId: string,
    userId: string
): Promise<{ count: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelClient = (prisma as any)[model] as PrismaModel;
    if (!modelClient) {
        throw new Error(`Model "${model}" not found in Prisma client`);
    }

    return modelClient.updateMany({
        where: {
            id,
            tenantId,
            deletedAt: null,
        },
        data: {
            deletedAt: new Date(),
            deletedBy: userId,
        },
    });
}

/**
 * Perform a restore of a soft-deleted record by clearing deletedAt and deletedBy.
 * Only usable by admins to recover accidentally or incorrectly deleted records.
 *
 * @param prisma - Prisma client instance (or transaction client)
 * @param model - Model name (e.g., 'invoice', 'payment')
 * @param id - Record ID
 * @param tenantId - Tenant ID for isolation
 * @returns Update result with count of affected rows
 */
export async function restoreDeleted(
    prisma: PrismaClient | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
    model: string,
    id: string,
    tenantId: string
): Promise<{ count: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelClient = (prisma as any)[model] as PrismaModel;
    if (!modelClient) {
        throw new Error(`Model "${model}" not found in Prisma client`);
    }

    return modelClient.updateMany({
        where: {
            id,
            tenantId,
            deletedAt: { not: null },
        },
        data: {
            deletedAt: null,
            deletedBy: null,
        },
    });
}

/**
 * Build a Prisma where clause that excludes soft-deleted records.
 * Use this in all GET queries for financial models.
 *
 * @param extraWhere - Additional where conditions to merge
 * @returns Where clause with deletedAt: null included
 */
export function whereNotDeleted<T extends Record<string, unknown>>(
    extraWhere: T = {} as T
): T & { deletedAt: null } {
    return {
        ...extraWhere,
        deletedAt: null,
    };
}
