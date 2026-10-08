/**
 * SoD Enforcement Unit Tests
 *
 * Tests untuk enforceSoDApproval helper:
 * - Self-approval blocked (creator === approver)
 * - Self-approval not triggered when creator differs / undefined
 * - SoD rule conflict blocking (blocking severity)
 * - Warning-only conflicts → allowed
 * - No conflicts → allowed
 * - Engine error → fail open (allowed)
 *
 * Mock pattern mengikuti audit.test.ts: mock BOTH relative dan @/ alias path
 * karena modules di-import via '@/lib/...' tetapi test resolve relatif.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks (relative + alias, same pattern as audit.test.ts) ────────────────

vi.mock('../../../lib/db', () => ({
    prisma: {},
}));

vi.mock('@/lib/db', () => ({
    prisma: {},
}));

vi.mock('../../../lib/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock('../../../lib/sod-engine', () => ({
    checkSoDConflictsWithExceptions: vi.fn(),
}));

vi.mock('@/lib/sod-engine', () => ({
    checkSoDConflictsWithExceptions: vi.fn(),
}));

vi.mock('../../../lib/audit', () => ({
    logAudit: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
    logAudit: vi.fn(),
}));

// api-messages: pure constants module — mock to avoid alias resolution in vitest
vi.mock('../../../lib/api-messages', () => ({
    MSG: {
        SOD_SELF_APPROVAL_BLOCKED: 'Self-approval is not allowed (Separation of Duties)',
        SOD_CONFLICT_DETECTED: 'Separation of duties conflict detected',
        SOD_VIOLATION: 'Separation of duties violation — approval blocked',
    },
}));

vi.mock('@/lib/api-messages', () => ({
    MSG: {
        SOD_SELF_APPROVAL_BLOCKED: 'Self-approval is not allowed (Separation of Duties)',
        SOD_CONFLICT_DETECTED: 'Separation of duties conflict detected',
        SOD_VIOLATION: 'Separation of duties violation — approval blocked',
    },
}));

import { enforceSoDApproval, SOD_MODULE, SOD_ACTION } from '../../../lib/sod-enforcement';
import { checkSoDConflictsWithExceptions } from '../../../lib/sod-engine';
import { logAudit } from '../../../lib/audit';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockCheck = vi.mocked(checkSoDConflictsWithExceptions);
const mockLogAudit = vi.mocked(logAudit);

const baseParams = {
    tenantId: 'tenant-1',
    userId: 'approver-1',
    userRole: 'ADMIN',
    module: SOD_MODULE.FINANCE,
    action: SOD_ACTION.EXPENSE_APPROVE,
    entityId: 'expense-1',
};

const noConflict = { hasConflict: false, conflicts: [] };

const blockingConflict = {
    ruleId: 'rule-1',
    ruleName: 'Maker-Checker Finance',
    role1: 'ADMIN',
    role2: 'FINANCE',
    module: 'finance',
    action: 'expense.approve',
    message: 'SoD violation: Role "ADMIN" tidak boleh melakukan "expense.approve"',
    severity: 'blocking' as const,
};

const warningConflict = {
    ...blockingConflict,
    ruleId: 'rule-2',
    severity: 'warning' as const,
};

beforeEach(() => {
    vi.clearAllMocks();
    mockCheck.mockResolvedValue(noConflict);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SoD Enforcement — enforceSoDApproval', () => {
    describe('self-approval check', () => {
        it('should block when approver is the creator (self-approval)', async () => {
            const result = await enforceSoDApproval({
                ...baseParams,
                createdByUserId: 'approver-1', // same as userId
            });

            expect(result.allowed).toBe(false);
            expect(result.selfApproval).toBe(true);
            expect(result.violations).toEqual([]);
            expect(result.message).toContain('Self-approval');

            // SoD engine NOT consulted (self-approval short-circuits)
            expect(mockCheck).not.toHaveBeenCalled();

            // Audit trail written
            expect(mockLogAudit).toHaveBeenCalledTimes(1);
            expect(mockLogAudit).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'approver-1',
                    tenantId: 'tenant-1',
                    action: 'SOD_BLOCKED',
                    entity: 'SoDEnforcement',
                    entityId: 'expense-1',
                })
            );
        });

        it('should NOT block when creator differs from approver', async () => {
            const result = await enforceSoDApproval({
                ...baseParams,
                createdByUserId: 'creator-1',
            });

            expect(result.allowed).toBe(true);
            expect(result.selfApproval).toBe(false);
            expect(mockCheck).toHaveBeenCalled();
            expect(mockLogAudit).not.toHaveBeenCalled();
        });

        it('should skip self-approval check when createdByUserId is undefined', async () => {
            const result = await enforceSoDApproval(baseParams);

            expect(result.allowed).toBe(true);
            expect(result.selfApproval).toBe(false);
            expect(mockCheck).toHaveBeenCalled();
        });
    });

    describe('SoD rule conflict check', () => {
        it('should block when engine returns blocking conflict', async () => {
            mockCheck.mockResolvedValue({
                hasConflict: true,
                conflicts: [blockingConflict],
            });

            const result = await enforceSoDApproval(baseParams);

            expect(result.allowed).toBe(false);
            expect(result.selfApproval).toBe(false);
            expect(result.violations).toHaveLength(1);
            expect(result.violations[0].ruleId).toBe('rule-1');
            expect(result.message).toContain('SoD violation');

            // Engine called with correct context
            expect(mockCheck).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenantId: 'tenant-1',
                    userId: 'approver-1',
                    userRole: 'ADMIN',
                    module: 'finance',
                    action: 'expense.approve',
                })
            );

            // Audit trail written
            expect(mockLogAudit).toHaveBeenCalledTimes(1);
            expect(mockLogAudit).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'SOD_BLOCKED',
                    newValues: expect.objectContaining({
                        reason: 'SOD_RULE_CONFLICT',
                    }),
                })
            );
        });

        it('should ALLOW when conflicts are warning-only', async () => {
            mockCheck.mockResolvedValue({
                hasConflict: true,
                conflicts: [warningConflict],
            });

            const result = await enforceSoDApproval(baseParams);

            expect(result.allowed).toBe(true);
            expect(result.violations).toHaveLength(1); // warnings still reported
            expect(mockLogAudit).not.toHaveBeenCalled(); // no block → no audit
        });

        it('should ALLOW when no conflicts returned (rules absent or exceptions active)', async () => {
            mockCheck.mockResolvedValue(noConflict);

            const result = await enforceSoDApproval(baseParams);

            expect(result.allowed).toBe(true);
            expect(result.violations).toEqual([]);
            expect(result.message).toBeNull();
            expect(mockLogAudit).not.toHaveBeenCalled();
        });

        it('should mix blocking and warning — blocking wins', async () => {
            mockCheck.mockResolvedValue({
                hasConflict: true,
                conflicts: [warningConflict, blockingConflict],
            });

            const result = await enforceSoDApproval(baseParams);

            expect(result.allowed).toBe(false);
            // Only blocking conflicts are reported in violations
            expect(result.violations).toHaveLength(1);
            expect(result.violations[0].severity).toBe('blocking');
        });
    });

    describe('fail-open behavior', () => {
        it('should FAIL OPEN when SoD engine throws', async () => {
            mockCheck.mockRejectedValue(new Error('DB connection lost'));

            const result = await enforceSoDApproval(baseParams);

            expect(result.allowed).toBe(true);
            expect(result.violations).toEqual([]);
            expect(mockLogAudit).not.toHaveBeenCalled();
        });
    });

    describe('module/action constants', () => {
        it('should expose canonical module/action values', () => {
            expect(SOD_MODULE.FINANCE).toBe('finance');
            expect(SOD_ACTION.EXPENSE_APPROVE).toBe('expense.approve');
            expect(SOD_ACTION.BILL_APPROVE).toBe('bill.approve');
            expect(SOD_ACTION.UNLOCK_REQUEST_DECIDE).toBe('unlock_request.decide');
        });
    });
});
