/**
 * @qalcuity/workflow — Type Definitions
 *
 * Tipe data untuk Workflow Engine yang mendukung
 * configurable transaction lifecycle per entity.
 */

// ─── Transition ───────────────────────────────────────────────────────────────

/**
 * Deskripsi satu transisi dalam state machine.
 * - `from`: state asal
 * - `to`: state tujuan
 * - `action`: nama aksi yang memicu transisi
 * - `permissions`: permission strings yang dibutuhkan (opsional)
 * - `auto`: jika true, transisi dijalankan otomatis oleh sistem
 * - `condition`: expression string untuk conditional transition (opsional)
 */
export interface Transition {
    from: string;
    to: string;
    action: string;
    permissions?: string[];
    auto?: boolean;
    condition?: string;
}

// ─── Workflow Definition ──────────────────────────────────────────────────────

/**
 * Definisi lengkap workflow untuk satu entity type.
 * Disimpan sebagai JSON di database (WorkflowDefinition.config).
 */
export interface WorkflowDefinition {
    states: string[];
    transitions: Transition[];
    initialState: string;
    finalStates: string[];
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Hasil validasi workflow definition.
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

// ─── Transition Result ────────────────────────────────────────────────────────

/**
 * Hasil eksekusi transisi workflow.
 */
export interface TransitionResult {
    success: boolean;
    fromState: string;
    toState: string;
    action: string;
    error?: string;
}

// ─── Workflow Entity Types ────────────────────────────────────────────────────

/**
 * Entity types yang mendukung workflow.
 */
export type WorkflowEntityType =
    | 'invoice'
    | 'quotation'
    | 'purchase_order'
    | 'leave_request'
    | 'payroll'
    | 'deal';

/**
 * Entity type keys untuk DEFAULT_WORKFLOWS.
 */
export type WorkflowKey =
    | 'INVOICE'
    | 'QUOTATION'
    | 'PURCHASE_ORDER'
    | 'LEAVE_REQUEST'
    | 'PAYROLL'
    | 'DEAL';

/**
 * Map entity type ke workflow key.
 */
export const ENTITY_TYPE_MAP: Record<WorkflowEntityType, WorkflowKey> = {
    invoice: 'INVOICE',
    quotation: 'QUOTATION',
    purchase_order: 'PURCHASE_ORDER',
    leave_request: 'LEAVE_REQUEST',
    payroll: 'PAYROLL',
    deal: 'DEAL',
};
