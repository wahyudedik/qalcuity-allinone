/**
 * @qalcuity/web — Policy Versioning Engine
 *
 * Manages version history for ControlPolicy records.
 * Supports auto-increment, audit trail logging, and revert to previous versions.
 *
 * Phase 2 — UCE Policy Engine Enhancements
 */

import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PolicyVersionSnapshot {
    id: string;
    policyId: string;
    version: number;
    name: string;
    description: string | null;
    module: string;
    action: string;
    conditions: Record<string, unknown>;
    effect: string;
    priority: number;
    enabled: boolean;
    snapshotBy: string;
    snapshotAt: Date;
    changeReason: string | null;
}

export interface VersionDiff {
    field: string;
    oldValue: unknown;
    newValue: unknown;
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Create a version snapshot of a policy before an update.
 * Stores the current state as an audit record.
 *
 * @param params.policyId - The policy ID
 * @param params.userId - User performing the change
 * @param params.reason - Optional reason for the change
 * @param params.request - Optional Request object for audit logging
 * @returns The created snapshot
 */
export async function createPolicySnapshot(params: {
    policyId: string;
    userId: string;
    reason?: string;
    request?: Request;
}): Promise<PolicyVersionSnapshot> {
    const { policyId, userId, reason, request } = params;

    const policy = await prisma.controlPolicy.findUnique({
        where: { id: policyId },
    });

    if (!policy) {
        throw new Error('Policy tidak ditemukan');
    }

    // Log the snapshot to audit trail with full policy state
    const snapshotData = {
        policyId: policy.id,
        version: policy.version,
        name: policy.name,
        description: policy.description,
        module: policy.module,
        action: policy.action,
        conditions: policy.conditions,
        effect: policy.effect,
        priority: policy.priority,
        enabled: policy.enabled,
    };

    void logAudit({
        userId,
        tenantId: policy.tenantId,
        action: 'READ',
        entity: 'PolicyVersion',
        entityId: policy.id,
        newValues: {
            ...snapshotData,
            changeReason: reason ?? null,
            snapshotType: 'pre-update',
        } as never,
        request,
    });

    return {
        id: `snapshot_${policy.id}_v${policy.version}`,
        policyId: policy.id,
        version: policy.version,
        name: policy.name,
        description: policy.description,
        module: policy.module,
        action: policy.action,
        conditions: (policy.conditions as Record<string, unknown>) ?? {},
        effect: policy.effect,
        priority: policy.priority,
        enabled: policy.enabled,
        snapshotBy: userId,
        snapshotAt: new Date(),
        changeReason: reason ?? null,
    };
}

/**
 * Get the version history of a policy.
 * Returns all version snapshots from audit trail.
 *
 * @param params.tenantId - Tenant ID
 * @param params.policyId - Policy ID
 * @param params.limit - Max number of versions to return (default: 50)
 * @returns Array of version snapshots ordered by version DESC
 */
export async function getPolicyVersionHistory(params: {
    tenantId: string;
    policyId: string;
    limit?: number;
}): Promise<PolicyVersionSnapshot[]> {
    const { tenantId, policyId, limit = 50 } = params;

    // Verify policy belongs to tenant
    const policy = await prisma.controlPolicy.findFirst({
        where: { id: policyId, tenantId },
    });

    if (!policy) {
        throw new Error('Policy tidak ditemukan');
    }

    // Query audit trail for policy version snapshots
    const auditLogs = await prisma.auditLog.findMany({
        where: {
            tenantId,
            entity: 'PolicyVersion',
            entityId: policyId,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });

    const snapshots: PolicyVersionSnapshot[] = auditLogs.map((log) => {
        const newVals = ((log.newValues as unknown as Record<string, unknown>) ?? {}) as Record<string, unknown>;
        return {
            id: `snapshot_${policyId}_v${newVals['version'] ?? 0}`,
            policyId,
            version: (newVals['version'] as number) ?? 0,
            name: (newVals['name'] as string) ?? '',
            description: (newVals['description'] as string) ?? null,
            module: (newVals['module'] as string) ?? '',
            action: (newVals['action'] as string) ?? '',
            conditions: (newVals['conditions'] as Record<string, unknown>) ?? {},
            effect: (newVals['effect'] as string) ?? 'allow',
            priority: (newVals['priority'] as number) ?? 0,
            enabled: (newVals['enabled'] as boolean) ?? true,
            snapshotBy: log.userId ?? 'unknown',
            snapshotAt: log.createdAt,
            changeReason: (newVals['changeReason'] as string) ?? null,
        };
    });

    return snapshots;
}

/**
 * Compute the diff between two versions of a policy.
 *
 * @param oldVersion - Previous version snapshot
 * @param newVersion - Current/new version snapshot
 * @returns Array of field-level diffs
 */
export function computePolicyDiff(
    oldVersion: PolicyVersionSnapshot,
    newVersion: PolicyVersionSnapshot
): VersionDiff[] {
    const diffs: VersionDiff[] = [];
    const fieldsToCompare: Array<keyof PolicyVersionSnapshot> = [
        'name',
        'description',
        'module',
        'action',
        'effect',
        'priority',
        'enabled',
    ];

    for (const field of fieldsToCompare) {
        const oldVal = oldVersion[field];
        const newVal = newVersion[field];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            diffs.push({ field, oldValue: oldVal, newValue: newVal });
        }
    }

    // Compare conditions separately (deep comparison)
    const oldCond = JSON.stringify(oldVersion.conditions);
    const newCond = JSON.stringify(newVersion.conditions);
    if (oldCond !== newCond) {
        diffs.push({
            field: 'conditions',
            oldValue: oldVersion.conditions,
            newValue: newVersion.conditions,
        });
    }

    return diffs;
}

/**
 * Revert a policy to a previous version.
 * Creates a new version with the old version's data (does not delete history).
 *
 * @param params.tenantId - Tenant ID
 * @param params.policyId - Policy ID to revert
 * @param params.targetVersion - The version to revert to (from history)
 * @param params.userId - User performing the revert
 * @param params.reason - Reason for the revert
 * @param params.request - Optional Request object
 * @returns The updated policy
 */
export async function revertPolicyToVersion(params: {
    tenantId: string;
    policyId: string;
    targetVersion: number;
    userId: string;
    reason: string;
    request?: Request;
}) {
    const { tenantId, policyId, targetVersion, userId, reason, request } = params;

    // Verify policy exists and belongs to tenant
    const policy = await prisma.controlPolicy.findFirst({
        where: { id: policyId, tenantId },
    });

    if (!policy) {
        throw new Error('Policy tidak ditemukan');
    }

    // Find the target version from audit trail
    const versionHistory = await getPolicyVersionHistory({
        tenantId,
        policyId,
        limit: 100,
    });

    const targetSnapshot = versionHistory.find((v) => v.version === targetVersion);
    if (!targetSnapshot) {
        throw new Error(`Version ${targetVersion} tidak ditemukan dalam history`);
    }

    // Create a snapshot of current state before revert
    await createPolicySnapshot({
        policyId,
        userId,
        reason: `Pre-revert snapshot: reverting to v${targetVersion}`,
        request,
    });

    // Revert: update policy with target version's data
    const revertedPolicy = await prisma.controlPolicy.update({
        where: { id: policyId },
        data: {
            name: targetSnapshot.name,
            description: targetSnapshot.description,
            module: targetSnapshot.module,
            action: targetSnapshot.action,
            conditions: targetSnapshot.conditions as never,
            effect: targetSnapshot.effect,
            priority: targetSnapshot.priority,
            enabled: targetSnapshot.enabled,
            version: policy.version + 1,
        },
    });

    void logAudit({
        userId,
        tenantId,
        action: 'UPDATE',
        entity: 'ControlPolicy',
        entityId: policyId,
        oldValues: {
            name: policy.name,
            version: policy.version,
            effect: policy.effect,
            priority: policy.priority,
        },
        newValues: {
            name: targetSnapshot.name,
            version: revertedPolicy.version,
            effect: targetSnapshot.effect,
            priority: targetSnapshot.priority,
            revertedToVersion: targetVersion,
            reason,
        },
        request,
    });

    logger.info(`[PolicyVersioning] Policy ${policyId} reverted to v${targetVersion} as v${revertedPolicy.version}`, {
        tenantId,
        userId,
    });

    return revertedPolicy;
}

/**
 * Get a specific version snapshot of a policy.
 *
 * @param params.tenantId - Tenant ID
 * @param params.policyId - Policy ID
 * @param params.version - Version number to retrieve
 * @returns The version snapshot or null
 */
export async function getPolicyVersion(params: {
    tenantId: string;
    policyId: string;
    version: number;
}): Promise<PolicyVersionSnapshot | null> {
    const { tenantId, policyId, version } = params;

    const snapshots = await getPolicyVersionHistory({ tenantId, policyId, limit: 100 });
    return snapshots.find((s) => s.version === version) ?? null;
}
