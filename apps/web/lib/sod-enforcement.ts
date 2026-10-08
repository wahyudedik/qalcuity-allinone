/**
 * @qalcuity/web — SoD Enforcement Helper
 *
 * Wraps the SoD engine with self-approval detection and audit logging.
 * Called by approval routes before allowing APPROVED status transitions
 * or unlock-request decisions.
 *
 * Enforcement layers:
 *   1. Self-approval check — creator cannot approve their own transaction
 *   2. SoD rule check — role conflicts via checkSoDConflictsWithExceptions
 *      (exception-aware; fail-open on engine error, consistent with engine)
 *
 * Both layers write an audit trail when an action is blocked.
 *
 * Session 70m — UCE SoD Enforcement
 */

// Relative imports — required for vitest unit-test mock interception
// (vitest has no '@/' alias config; relative mocks in __tests__ resolve
// against these specifiers, same pattern as audit.ts importing './db').
import { checkSoDConflictsWithExceptions, type SoDConflict } from './sod-engine';
import { logAudit } from './audit';
import { MSG } from './api-messages';
import { logger } from './logger';

// ─── Module/Action Convention ────────────────────────────────────────────────
// Canonical values used by enforcement hooks. Tenant-configurable SoD rules
// (SoDRule.module / SoDRule.action) must use these exact strings to match.
// See docs/DECISIONS.md — Session 70m.

export const SOD_MODULE = {
    /** Finance module — expenses, bills, payments, locks */
    FINANCE: 'finance',
} as const;

export const SOD_ACTION = {
    /** Expense approval (PUT status → APPROVED) */
    EXPENSE_APPROVE: 'expense.approve',
    /** Bill approval (PUT status → APPROVED) */
    BILL_APPROVE: 'bill.approve',
    /** Unlock request decision (approve/reject) */
    UNLOCK_REQUEST_DECIDE: 'unlock_request.decide',
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SoDEnforcementParams {
    tenantId: string;
    userId: string;
    userRole: string;
    /** SoD rule module — use SOD_MODULE constants */
    module: string;
    /** SoD rule action — use SOD_ACTION constants */
    action: string;
    /** Entity being approved (expense id, bill id, etc.) — for audit trail */
    entityId?: string;
    /**
     * Creator of the entity. When provided and equal to userId,
     * self-approval is blocked. Omit to skip the self-approval check
     * (e.g. when the underlying library already enforces it).
     */
    createdByUserId?: string;
    /** Request object for audit IP/User-Agent extraction */
    request?: Request;
}

export interface SoDEnforcementResult {
    allowed: boolean;
    selfApproval: boolean;
    violations: SoDConflict[];
    message: string | null;
}

// ─── Core Function ───────────────────────────────────────────────────────────

/**
 * Enforce SoD controls before an approval action is committed.
 *
 * Returns `{ allowed: true }` when both checks pass (or fail open on engine
 * error, consistent with the SoD engine's design). When blocked, the result
 * carries the violation details and a user-facing message; an audit entry
 * is written for every blocked attempt.
 */
export async function enforceSoDApproval(params: SoDEnforcementParams): Promise<SoDEnforcementResult> {
    const { tenantId, userId, userRole, module, action, entityId, createdByUserId, request } = params;

    // ── Layer 1: Self-approval check ─────────────────────────────────────
    if (createdByUserId && createdByUserId === userId) {
        const blocked: SoDEnforcementResult = {
            allowed: false,
            selfApproval: true,
            violations: [],
            message: MSG.SOD_SELF_APPROVAL_BLOCKED,
        };

        void logAudit({
            userId,
            tenantId,
            action: 'SOD_BLOCKED',
            entity: 'SoDEnforcement',
            entityId,
            newValues: {
                reason: 'SELF_APPROVAL',
                module,
                action,
                message: blocked.message,
            },
            request,
        });

        logger.warn('[SoDEnforcement] Self-approval blocked', {
            tenantId,
            userId,
            module,
            action,
            entityId,
        });

        return blocked;
    }

    // ── Layer 2: SoD rule check (with exception awareness) ───────────────
    try {
        const result = await checkSoDConflictsWithExceptions({
            tenantId,
            userId,
            userRole,
            module,
            action,
            metadata: entityId ? { entityId } : undefined,
        });

        if (!result.hasConflict || result.conflicts.length === 0) {
            return { allowed: true, selfApproval: false, violations: [], message: null };
        }

        const blocking = result.conflicts.filter((c) => c.severity === 'blocking');
        if (blocking.length === 0) {
            // Warnings only — allow without blocking
            return { allowed: true, selfApproval: false, violations: result.conflicts, message: null };
        }

        const blocked: SoDEnforcementResult = {
            allowed: false,
            selfApproval: false,
            violations: blocking,
            message: blocking.map((c) => c.message).join('; ') || MSG.SOD_CONFLICT_DETECTED,
        };

        void logAudit({
            userId,
            tenantId,
            action: 'SOD_BLOCKED',
            entity: 'SoDEnforcement',
            entityId,
            newValues: {
                reason: 'SOD_RULE_CONFLICT',
                module,
                action,
                violations: blocking.map((c) => ({
                    ruleId: c.ruleId,
                    ruleName: c.ruleName,
                    role1: c.role1,
                    role2: c.role2,
                })),
                message: blocked.message,
            },
            request,
        });

        logger.warn('[SoDEnforcement] SoD rule conflict blocked approval', {
            tenantId,
            userId,
            userRole,
            module,
            action,
            entityId,
            conflictCount: blocking.length,
        });

        return blocked;
    } catch (error) {
        // Fail open — consistent with SoD engine error handling
        logger.error('[SoDEnforcement] SoD check failed — failing open', {
            tenantId,
            userId,
            module,
            action,
            error,
        });
        return { allowed: true, selfApproval: false, violations: [], message: null };
    }
}
