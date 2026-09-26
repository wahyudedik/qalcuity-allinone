/**
 * @qalcuity/web — Control Pipeline Orchestrator
 *
 * Core evaluation engine untuk Unified Control Engine (UCE).
 * Menerima transaksi, evaluates ControlPolicy, checks SoD rules,
 * creates SLA tracker jika perlu, dan returns decision.
 *
 * Flow: Transaction → Policy Evaluation → SoD Check → SLA → Decision
 */

import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PipelineContext {
    tenantId: string;
    entityType: string;
    entityId: string;
    action: string; // "create" | "update" | "delete" | "approve"
    userId: string;
    userRole: string;
    amount?: number;
    metadata?: Record<string, unknown>;
}

export interface SoDViolation {
    ruleId: string;
    ruleName: string;
    role1: string;
    role2: string;
    module: string;
    message: string;
}

export interface PipelineResult {
    allowed: boolean;
    requiresApproval: boolean;
    policies: Array<{
        id: string;
        name: string;
        effect: string;
        priority: number;
    }>;
    sodViolations: SoDViolation[];
    slaTracker?: {
        id: string;
        entityType: string;
        entityId: string;
        stage: string;
        deadline: Date;
    };
    reason?: string;
}

// ─── Policy Condition Evaluation ────────────────────────────────────────────

interface PolicyConditions {
    minAmount?: number;
    maxAmount?: number;
    roles?: string[];
    departments?: string[];
    entityTypes?: string[];
    custom?: Record<string, unknown>;
}

/**
 * Evaluate a single policy's conditions against the pipeline context.
 */
function evaluateConditions(
    conditions: unknown,
    ctx: PipelineContext
): boolean {
    if (!conditions || typeof conditions !== 'object') {
        // No conditions = always matches
        return true;
    }

    const cond = conditions as PolicyConditions;

    // Amount range check
    if (cond.minAmount !== undefined && ctx.amount !== undefined) {
        if (ctx.amount < cond.minAmount) return false;
    }
    if (cond.maxAmount !== undefined && ctx.amount !== undefined) {
        if (ctx.amount > cond.maxAmount) return false;
    }

    // Role check
    if (cond.roles && cond.roles.length > 0) {
        if (!cond.roles.includes(ctx.userRole)) return false;
    }

    // Entity type check
    if (cond.entityTypes && cond.entityTypes.length > 0) {
        if (!cond.entityTypes.includes(ctx.entityType)) return false;
    }

    return true;
}

// ─── Main Pipeline Function ─────────────────────────────────────────────────

/**
 * Evaluate the control pipeline for a transaction.
 *
 * @param ctx - Pipeline context with transaction details
 * @returns PipelineResult with decision, matched policies, and SoD violations
 */
export async function evaluateControlPipeline(
    ctx: PipelineContext
): Promise<PipelineResult> {
    const { tenantId, entityType, entityId, action, userId, userRole } = ctx;

    const result: PipelineResult = {
        allowed: true,
        requiresApproval: false,
        policies: [],
        sodViolations: [],
    };

    try {
        // Step 1: Load applicable policies (sorted by priority DESC)
        const policies = await prisma.controlPolicy.findMany({
            where: {
                tenantId,
                enabled: true,
                module: entityType, // policies are keyed by module (entity type)
            },
            orderBy: { priority: 'desc' },
        });

        // Step 2: Evaluate each policy (first matching policy wins)
        let matchedPolicy: typeof policies[number] | null = null;

        const filteredPolicies = policies.filter(
            (p) => p.action === action || p.action === '*'
        );

        for (const policy of filteredPolicies) {
            if (evaluateConditions(policy.conditions, ctx)) {
                matchedPolicy = policy;
                break;
            }
        }

        if (matchedPolicy) {
            result.policies.push({
                id: matchedPolicy.id,
                name: matchedPolicy.name,
                effect: matchedPolicy.effect,
                priority: matchedPolicy.priority,
            });

            if (matchedPolicy.effect === 'deny') {
                result.allowed = false;
                result.reason = `Blocked by policy: ${matchedPolicy.name}`;
                return result;
            }

            // Check if this policy requires approval
            const cond = matchedPolicy.conditions as PolicyConditions;
            if (cond && typeof cond === 'object') {
                const requireApproval = (cond as Record<string, unknown>).requireApproval;
                if (requireApproval === true) {
                    result.requiresApproval = true;
                }
            }
        }

        // Step 3: Check SoD rules
        const sodRules = await prisma.soDRule.findMany({
            where: {
                tenantId,
                enabled: true,
                module: entityType,
            },
        });

        for (const rule of sodRules) {
            // Check if the user's role conflicts
            const rolesMatch =
                (userRole === rule.role1 || userRole === rule.role2);
            const actionMatches = !rule.action || rule.action === action;

            if (rolesMatch && actionMatches) {
                result.sodViolations.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    role1: rule.role1,
                    role2: rule.role2,
                    module: rule.module,
                    message: `SoD violation: User role "${userRole}" conflicts with rule "${rule.name}" (roles: ${rule.role1} ↔ ${rule.role2})`,
                });
            }
        }

        // If SoD violations exist, block the transaction
        if (result.sodViolations.length > 0) {
            result.allowed = false;
            result.reason = `SoD violations detected: ${result.sodViolations.map(v => v.ruleName).join(', ')}`;
        }

        // Step 4: If approval needed, create SLA tracker
        if (result.requiresApproval && result.allowed) {
            const slaTracker = await createSLATracker({
                tenantId,
                entityType,
                entityId,
                stage: 'pending_approval',
                targetHours: 48, // Default 48h SLA, can be configurable
            });

            result.slaTracker = {
                id: slaTracker.id,
                entityType: slaTracker.entityType,
                entityId: slaTracker.entityId,
                stage: slaTracker.stage,
                deadline: slaTracker.deadline,
            };
        }

        // Step 5: Record transaction state
        await recordTransactionState({
            tenantId,
            entityType,
            entityId,
            currentState: result.requiresApproval ? 'PENDING_APPROVAL' : (result.allowed ? 'APPROVED' : 'BLOCKED'),
            previousState: null,
            changedBy: userId,
        });

        return result;
    } catch (error) {
        logger.error('Control pipeline evaluation failed', { tenantId, entityType, entityId, error });
        // Fail open — allow transaction but log the error
        result.allowed = true;
        result.reason = 'Pipeline evaluation failed — defaulting to allow';
        return result;
    }
}


// ─── SLA Tracker ────────────────────────────────────────────────────────────

interface CreateSLAParams {
    tenantId: string;
    entityType: string;
    entityId: string;
    stage: string;
    targetHours: number;
}

/**
 * Create an SLA tracker for an entity.
 */
async function createSLATracker(params: CreateSLAParams) {
    const { tenantId, entityType, entityId, stage, targetHours } = params;
    const now = new Date();
    const deadline = new Date(now.getTime() + targetHours * 60 * 60 * 1000);

    // Check if there's already an active SLA tracker for this entity
    const existing = await prisma.sLATracker.findFirst({
        where: {
            tenantId,
            entityType,
            entityId,
            status: 'active',
        },
    });

    if (existing) {
        return existing;
    }

    return prisma.sLATracker.create({
        data: {
            tenantId,
            entityType,
            entityId,
            stage,
            targetHours,
            deadline,
            status: 'active',
        },
    });
}

// ─── Transaction State Recording ────────────────────────────────────────────

interface RecordStateParams {
    tenantId: string;
    entityType: string;
    entityId: string;
    currentState: string;
    previousState: string | null;
    changedBy: string;
    metadata?: Record<string, unknown>;
}

/**
 * Record a transaction state change.
 */
async function recordTransactionState(params: RecordStateParams) {
    const { tenantId, entityType, entityId, currentState, previousState, changedBy, metadata } = params;

    // Upsert — update existing or create new
    const existing = await prisma.transactionState.findUnique({
        where: {
            tenantId_entityType_entityId: { tenantId, entityType, entityId },
        },
    });

    if (existing) {
        return prisma.transactionState.update({
            where: {
                tenantId_entityType_entityId: { tenantId, entityType, entityId },
            },
            data: {
                previousState: existing.currentState,
                currentState,
                changedBy,
                changedAt: new Date(),
                metadata: (metadata as never) ?? undefined,
            },
        });
    }

    return prisma.transactionState.create({
        data: {
            tenantId,
            entityType,
            entityId,
            currentState,
            previousState,
            changedBy,
            metadata: (metadata as never) ?? undefined,
        },
    });
}

// ─── Public: Lock Management ────────────────────────────────────────────────

export interface LockResult {
    success: boolean;
    lockId?: string;
    lockedBy?: string;
    message?: string;
}

/**
 * Acquire a pessimistic lock on an entity.
 */
export async function acquireLock(params: {
    tenantId: string;
    entityType: string;
    entityId: string;
    userId: string;
    lockType?: string;
    durationMinutes?: number;
    reason?: string;
}): Promise<LockResult> {
    const { tenantId, entityType, entityId, userId, lockType = 'edit', durationMinutes = 30, reason } = params;

    // Check existing lock
    const existing = await prisma.lockRecord.findUnique({
        where: {
            tenantId_entityType_entityId: { tenantId, entityType, entityId },
        },
    });

    if (existing) {
        // Check if lock has expired
        if (existing.expiresAt < new Date()) {
            // Expired — delete and re-acquire
            await prisma.lockRecord.delete({ where: { id: existing.id } });
        } else {
            // Lock is held by someone else
            if (existing.lockedBy !== userId) {
                return {
                    success: false,
                    lockedBy: existing.lockedBy,
                    message: `Record is locked by another user until ${existing.expiresAt.toISOString()}`,
                };
            }
            // Same user — extend lock
            const newExpiry = new Date(Date.now() + durationMinutes * 60 * 1000);
            await prisma.lockRecord.update({
                where: { id: existing.id },
                data: { expiresAt: newExpiry },
            });
            return { success: true, lockId: existing.id };
        }
    }

    // Acquire new lock
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    const lock = await prisma.lockRecord.create({
        data: {
            tenantId,
            entityType,
            entityId,
            lockedBy: userId,
            lockType,
            expiresAt,
            reason,
        },
    });

    return { success: true, lockId: lock.id };
}

/**
 * Release a lock on an entity.
 */
export async function releaseLock(params: {
    tenantId: string;
    entityType: string;
    entityId: string;
    userId: string;
}): Promise<void> {
    const { tenantId, entityType, entityId, userId } = params;

    const existing = await prisma.lockRecord.findUnique({
        where: {
            tenantId_entityType_entityId: { tenantId, entityType, entityId },
        },
    });

    if (existing && existing.lockedBy === userId) {
        await prisma.lockRecord.delete({ where: { id: existing.id } });
    }
}

/**
 * Check if an entity is locked (and by whom).
 */
export async function checkLock(params: {
    tenantId: string;
    entityType: string;
    entityId: string;
}): Promise<{ locked: boolean; lockedBy?: string; expiresAt?: Date }> {
    const { tenantId, entityType, entityId } = params;

    const existing = await prisma.lockRecord.findUnique({
        where: {
            tenantId_entityType_entityId: { tenantId, entityType, entityId },
        },
    });

    if (!existing) {
        return { locked: false };
    }

    // Check if expired
    if (existing.expiresAt < new Date()) {
        await prisma.lockRecord.delete({ where: { id: existing.id } });
        return { locked: false };
    }

    return {
        locked: true,
        lockedBy: existing.lockedBy,
        expiresAt: existing.expiresAt,
    };
}

// ─── Public: SLA Status ─────────────────────────────────────────────────────

/**
 * Get SLA status for an entity.
 */
export async function getSLAStatus(params: {
    tenantId: string;
    entityType: string;
    entityId: string;
}): Promise<{
    hasSLA: boolean;
    status?: string;
    deadline?: Date;
    isOverdue?: boolean;
}> {
    const { tenantId, entityType, entityId } = params;

    const tracker = await prisma.sLATracker.findFirst({
        where: {
            tenantId,
            entityType,
            entityId,
            status: 'active',
        },
        orderBy: { createdAt: 'desc' },
    });

    if (!tracker) {
        return { hasSLA: false };
    }

    const isOverdue = tracker.deadline < new Date();

    return {
        hasSLA: true,
        status: tracker.status,
        deadline: tracker.deadline,
        isOverdue,
    };
}

// ─── Public: Transaction State Query ────────────────────────────────────────

/**
 * Get the current state of a transaction.
 */
export async function getTransactionState(params: {
    tenantId: string;
    entityType: string;
    entityId: string;
}): Promise<{
    currentState: string;
    previousState: string | null;
    changedAt: Date;
    changedBy: string | null;
} | null> {
    const { tenantId, entityType, entityId } = params;

    const state = await prisma.transactionState.findUnique({
        where: {
            tenantId_entityType_entityId: { tenantId, entityType, entityId },
        },
    });

    if (!state) return null;

    return {
        currentState: state.currentState,
        previousState: state.previousState,
        changedAt: state.changedAt,
        changedBy: state.changedBy,
    };
}
