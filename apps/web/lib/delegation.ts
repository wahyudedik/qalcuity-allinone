/**
 * @qalcuity/web — Delegation Framework
 *
 * In-memory delegation framework for approval delegation.
 * Allows users to delegate their approval authority to another user
 * for a specific module during a time period.
 *
 * Phase 5 — UCE Locking & Delegation
 */

import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Delegation {
    id: string;
    tenantId: string;
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    toUserName: string;
    module: string; // e.g., "finance", "hr", "all"
    startDate: Date;
    endDate: Date;
    reason?: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateDelegationParams {
    tenantId: string;
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    toUserName: string;
    module: string;
    startDate: Date;
    endDate: Date;
    reason?: string;
}

// ─── Storage ────────────────────────────────────────────────────────────────
// Delegations are stored in Tenant.settings JSON field (no dedicated Prisma model).
// This keeps the schema clean while providing full delegation functionality.

/**
 * Get all delegations for a tenant.
 *
 * @param tenantId - Tenant ID
 * @returns Array of delegation records
 */
export async function getDelegations(tenantId: string): Promise<Delegation[]> {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { settings: true },
        });

        if (!tenant?.settings) return [];

        const settings = tenant.settings as Record<string, unknown>;
        const delegations = settings.delegations as Array<Record<string, unknown>> | undefined;

        if (!delegations || !Array.isArray(delegations)) return [];

        return delegations.map((d) => ({
            id: String(d.id || ''),
            tenantId,
            fromUserId: String(d.fromUserId || ''),
            fromUserName: String(d.fromUserName || ''),
            toUserId: String(d.toUserId || ''),
            toUserName: String(d.toUserName || ''),
            module: String(d.module || 'all'),
            startDate: new Date(String(d.startDate)),
            endDate: new Date(String(d.endDate)),
            reason: d.reason ? String(d.reason) : undefined,
            enabled: d.enabled !== false,
            createdAt: d.createdAt ? new Date(String(d.createdAt)) : new Date(),
            updatedAt: d.updatedAt ? new Date(String(d.updatedAt)) : new Date(),
        }));
    } catch (error) {
        logger.error('Failed to get delegations', { tenantId, error });
        return [];
    }
}

/**
 * Save delegations to tenant settings.
 */
async function saveDelegations(tenantId: string, delegations: Array<Record<string, unknown>>): Promise<void> {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
    });

    const settings = (tenant?.settings as Record<string, unknown>) || {};

    await prisma.tenant.update({
        where: { id: tenantId },
        data: {
            settings: {
                ...settings,
                delegations,
            } as never,
        },
    });
}

/**
 * Create a new delegation.
 *
 * @param params - Delegation parameters
 * @returns Created delegation
 */
export async function delegateAuthority(params: CreateDelegationParams): Promise<Delegation> {
    const { tenantId, fromUserId, fromUserName, toUserId, toUserName, module, startDate, endDate, reason } = params;

    // Validate dates
    if (endDate <= startDate) {
        throw new Error('End date must be after start date');
    }

    // Check for overlapping delegations
    const existing = await getDelegations(tenantId);
    const overlap = existing.find(
        (d) =>
            d.enabled &&
            d.fromUserId === fromUserId &&
            d.module === module &&
            d.startDate <= endDate &&
            d.endDate >= startDate
    );

    if (overlap) {
        throw new Error(`Overlapping delegation exists: ${overlap.id} (${overlap.startDate.toISOString()} to ${overlap.endDate.toISOString()})`);
    }

    const now = new Date();
    const id = `del-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const delegation: Delegation = {
        id,
        tenantId,
        fromUserId,
        fromUserName,
        toUserId,
        toUserName,
        module,
        startDate,
        endDate,
        reason,
        enabled: true,
        createdAt: now,
        updatedAt: now,
    };

    // Add to tenant settings
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
    });

    const settings = (tenant?.settings as Record<string, unknown>) || {};
    const delegations = (Array.isArray(settings.delegations) ? settings.delegations : []) as Array<Record<string, unknown>>;

    delegations.push({
        ...delegation,
        startDate: delegation.startDate.toISOString(),
        endDate: delegation.endDate.toISOString(),
        createdAt: delegation.createdAt.toISOString(),
        updatedAt: delegation.updatedAt.toISOString(),
    });

    await saveDelegations(tenantId, delegations);

    // Audit log
    await logAudit({
        userId: fromUserId,
        tenantId,
        action: 'CREATE',
        entity: 'Delegation',
        entityId: id,
        newValues: {
            fromUserId,
            toUserId,
            module,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            reason: reason || null,
        },
    });

    return delegation;
}

/**
 * Check if a user has an active delegation for a module.
 * Returns the delegated-to user if delegation is active.
 *
 * @param tenantId - Tenant ID
 * @param userId - User ID to check
 * @param module - Module name
 * @returns Delegation record if active, null otherwise
 */
export async function checkDelegation(
    tenantId: string,
    userId: string,
    module: string
): Promise<Delegation | null> {
    const delegations = await getDelegations(tenantId);
    const now = new Date();

    const active = delegations.find(
        (d) =>
            d.enabled &&
            d.fromUserId === userId &&
            (d.module === module || d.module === 'all') &&
            d.startDate <= now &&
            d.endDate >= now
    );

    return active || null;
}

/**
 * Check if a user is a delegate for another user.
 * Returns the delegation record if the user is the delegatee.
 *
 * @param tenantId - Tenant ID
 * @param delegateeUserId - The user who is acting as delegate
 * @param module - Module name
 * @returns Delegation record if active, null otherwise
 */
export async function checkDelegateFor(
    tenantId: string,
    delegateeUserId: string,
    module: string
): Promise<Delegation | null> {
    const delegations = await getDelegations(tenantId);
    const now = new Date();

    const active = delegations.find(
        (d) =>
            d.enabled &&
            d.toUserId === delegateeUserId &&
            (d.module === module || d.module === 'all') &&
            d.startDate <= now &&
            d.endDate >= now
    );

    return active || null;
}

/**
 * Revoke a delegation.
 *
 * @param tenantId - Tenant ID
 * @param delegationId - Delegation ID to revoke
 * @param revokedBy - User who is revoking
 * @returns true if revoked, false if not found
 */
export async function revokeDelegation(
    tenantId: string,
    delegationId: string,
    revokedBy: string
): Promise<boolean> {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
    });

    if (!tenant?.settings) return false;

    const settings = tenant.settings as Record<string, unknown>;
    const delegations = (Array.isArray(settings.delegations) ? settings.delegations : []) as Array<Record<string, unknown>>;

    const targetIndex = delegations.findIndex((d) => d.id === delegationId);
    if (targetIndex < 0) return false;

    const target = delegations[targetIndex];

    // Disable instead of delete (for audit trail)
    delegations[targetIndex] = {
        ...target,
        enabled: false,
        updatedAt: new Date().toISOString(),
        revokedBy,
        revokedAt: new Date().toISOString(),
    };

    await saveDelegations(tenantId, delegations);

    // Audit log
    await logAudit({
        userId: revokedBy,
        tenantId,
        action: 'UPDATE',
        entity: 'Delegation',
        entityId: delegationId,
        oldValues: { enabled: true },
        newValues: { enabled: false },
    });

    return true;
}

/**
 * Get all active delegations for a tenant.
 *
 * @param tenantId - Tenant ID
 * @returns Active delegation records
 */
export async function getActiveDelegations(tenantId: string): Promise<Delegation[]> {
    const allDelegations = await getDelegations(tenantId);
    const now = new Date();

    return allDelegations.filter(
        (d) => d.enabled && d.startDate <= now && d.endDate >= now
    );
}

/**
 * Get delegations for a specific user (as delegator or delegatee).
 *
 * @param tenantId - Tenant ID
 * @param userId - User ID
 * @returns Array of delegation records involving this user
 */
export async function getUserDelegations(
    tenantId: string,
    userId: string
): Promise<Delegation[]> {
    const allDelegations = await getDelegations(tenantId);

    return allDelegations.filter(
        (d) => d.fromUserId === userId || d.toUserId === userId
    );
}
