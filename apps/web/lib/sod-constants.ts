/**
 * @qalcuity/web — SoD Canonical Constants (client-safe)
 *
 * Canonical module/action values used by SoD enforcement hooks and
 * tenant-configurable SoD rules (SoDRule.module / SoDRule.action).
 * Rules must use these exact strings to match enforcement.
 *
 * This module is intentionally zero-import (client-safe) so UI code can
 * import it without pulling server-only dependencies (prisma via
 * sod-engine) into the client bundle. Server code re-exports these from
 * sod-enforcement.ts for a single import path.
 *
 * See docs/DECISIONS.md — Session 70m (enforcement) / 70n (UI).
 */

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
