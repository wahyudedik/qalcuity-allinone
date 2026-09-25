// ─── Permission Definitions ────────────────────────────────────────────────────
// Semua permissions dalam system Qalcuity didefinisikan di sini.
// Format: "module:action"

import type { PermissionCategory, PermissionDefinition } from './types';

// ─── Permission Constants ──────────────────────────────────────────────────────

export const PERMISSIONS = {
    // ── Finance ──────────────────────────────────────────────────────────────
    FINANCE_VIEW: 'finance:view',
    FINANCE_CREATE: 'finance:create',
    FINANCE_EDIT: 'finance:edit',
    FINANCE_DELETE: 'finance:delete',
    FINANCE_APPROVE: 'finance:approve',

    // ── CRM ──────────────────────────────────────────────────────────────────
    CRM_VIEW: 'crm:view',
    CRM_CREATE: 'crm:create',
    CRM_EDIT: 'crm:edit',
    CRM_DELETE: 'crm:delete',
    CRM_IMPORT: 'crm:import',

    // ── HR ───────────────────────────────────────────────────────────────────
    HR_VIEW: 'hr:view',
    HR_CREATE: 'hr:create',
    HR_EDIT: 'hr:edit',
    HR_DELETE: 'hr:delete',
    HR_APPROVE: 'hr:approve',

    // ── Inventory ────────────────────────────────────────────────────────────
    INVENTORY_VIEW: 'inventory:view',
    INVENTORY_CREATE: 'inventory:create',
    INVENTORY_EDIT: 'inventory:edit',
    INVENTORY_DELETE: 'inventory:delete',

    // ── Settings ─────────────────────────────────────────────────────────────
    SETTINGS_VIEW: 'settings:view',
    SETTINGS_EDIT: 'settings:edit',
    SETTINGS_TEAM: 'settings:team',
    SETTINGS_BILLING: 'settings:billing',

    // ── Reports ──────────────────────────────────────────────────────────────
    REPORTS_VIEW: 'reports:view',
    REPORTS_CREATE: 'reports:create',

    // ── Analytics ────────────────────────────────────────────────────────────
    ANALYTICS_VIEW: 'analytics:view',
    ANALYTICS_EDIT: 'analytics:edit',

    // ── Audit ────────────────────────────────────────────────────────────────
    AUDIT_VIEW: 'audit:view',

    // ── Approval Engine ──────────────────────────────────────────────────────
    APPROVAL_VIEW: 'approval:view',
    APPROVAL_VIEW_ALL: 'approval:viewAll',
    APPROVAL_CREATE: 'approval:create',
    APPROVAL_EDIT: 'approval:edit',
    APPROVAL_DELETE: 'approval:delete',
    APPROVAL_APPROVE: 'approval:approve',
    APPROVAL_REJECT: 'approval:reject',

    // ── Workflow Engine ──────────────────────────────────────────────────────
    WORKFLOW_VIEW: 'workflow:view',
    WORKFLOW_CREATE: 'workflow:create',
    WORKFLOW_EDIT: 'workflow:edit',
    WORKFLOW_DELETE: 'workflow:delete',
    WORKFLOW_TRANSITION: 'workflow:transition',

    // ── POS (Point of Sale) ──────────────────────────────────────────────────
    POS_VIEW: 'pos:view',
    POS_CREATE: 'pos:create',
    POS_EDIT: 'pos:edit',
    POS_DELETE: 'pos:delete',

    // ── Billing ──────────────────────────────────────────────────────────────
    BILLING_VIEW: 'billing:view',
    BILLING_CREATE: 'billing:create',
    BILLING_EDIT: 'billing:edit',
    BILLING_DELETE: 'billing:delete',

    // ── Dashboard ────────────────────────────────────────────────────────────
    DASHBOARD_VIEW: 'dashboard:view',

    // ── Projects & Operations ────────────────────────────────────────────────
    PROJECT_VIEW: 'project:view',
    PROJECT_CREATE: 'project:create',
    PROJECT_EDIT: 'project:edit',
    PROJECT_DELETE: 'project:delete',

    OPERATIONS_VIEW: 'operations:view',
    OPERATIONS_CREATE: 'operations:create',
    OPERATIONS_EDIT: 'operations:edit',
    OPERATIONS_DELETE: 'operations:delete',

    // ── Notifications ────────────────────────────────────────────────────────
    NOTIFICATION_VIEW: 'notification:view',

    // ── System ───────────────────────────────────────────────────────────────
    SYSTEM_VIEW: 'system:view',
    SYSTEM_ADMIN: 'system:admin',

    // ── AI Features ──────────────────────────────────────────────────────────
    AI_VIEW: 'ai:view',

    // ── Platform Admin (SUPERADMIN only) ─────────────────────────────────────
    PLATFORM_VIEW: 'platform:view',
} as const;

/**
 * Array dari semua permission values — berguna untuk validasi.
 */
export const ALL_PERMISSIONS: string[] = Object.values(PERMISSIONS);

/**
 * Map module name ke permission actions — berguna untuk wildcard matching.
 */
export const MODULE_PERMISSIONS: Record<string, string[]> = {
    finance: ['view', 'create', 'edit', 'delete', 'approve'],
    crm: ['view', 'create', 'edit', 'delete', 'import'],
    hr: ['view', 'create', 'edit', 'delete', 'approve'],
    inventory: ['view', 'create', 'edit', 'delete'],
    settings: ['view', 'edit', 'team', 'billing'],
    reports: ['view', 'create'],
    analytics: ['view', 'edit'],
    audit: ['view'],
    approval: ['view', 'viewAll', 'create', 'edit', 'delete', 'approve', 'reject'],
    workflow: ['view', 'create', 'edit', 'delete', 'transition'],
    pos: ['view', 'create', 'edit', 'delete'],
    billing: ['view', 'create', 'edit', 'delete'],
    dashboard: ['view'],
    project: ['view', 'create', 'edit', 'delete'],
    operations: ['view', 'create', 'edit', 'delete'],
    notification: ['view'],
    system: ['view', 'admin'],
    ai: ['view'],
    platform: ['view'],
};

// ─── Permission Categories (for UI) ───────────────────────────────────────────

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
    {
        key: 'finance',
        label: 'Finance',
        permissions: [
            { key: PERMISSIONS.FINANCE_VIEW, label: 'View Finance', description: 'Melihat data keuangan' },
            { key: PERMISSIONS.FINANCE_CREATE, label: 'Create Finance', description: 'Membuat transaksi keuangan' },
            { key: PERMISSIONS.FINANCE_EDIT, label: 'Edit Finance', description: 'Mengubah transaksi keuangan' },
            { key: PERMISSIONS.FINANCE_DELETE, label: 'Delete Finance', description: 'Menghapus transaksi keuangan' },
            { key: PERMISSIONS.FINANCE_APPROVE, label: 'Approve Finance', description: 'Menyetujui transaksi keuangan' },
        ],
    },
    {
        key: 'crm',
        label: 'CRM',
        permissions: [
            { key: PERMISSIONS.CRM_VIEW, label: 'View CRM', description: 'Melihat data CRM' },
            { key: PERMISSIONS.CRM_CREATE, label: 'Create CRM', description: 'Membuat data CRM' },
            { key: PERMISSIONS.CRM_EDIT, label: 'Edit CRM', description: 'Mengubah data CRM' },
            { key: PERMISSIONS.CRM_DELETE, label: 'Delete CRM', description: 'Menghapus data CRM' },
            { key: PERMISSIONS.CRM_IMPORT, label: 'Import CRM', description: 'Import data CRM' },
        ],
    },
    {
        key: 'hr',
        label: 'HR',
        permissions: [
            { key: PERMISSIONS.HR_VIEW, label: 'View HR', description: 'Melihat data HR' },
            { key: PERMISSIONS.HR_CREATE, label: 'Create HR', description: 'Membuat data HR' },
            { key: PERMISSIONS.HR_EDIT, label: 'Edit HR', description: 'Mengubah data HR' },
            { key: PERMISSIONS.HR_DELETE, label: 'Delete HR', description: 'Menghapus data HR' },
            { key: PERMISSIONS.HR_APPROVE, label: 'Approve HR', description: 'Menyetujui data HR' },
        ],
    },
    {
        key: 'inventory',
        label: 'Inventory',
        permissions: [
            { key: PERMISSIONS.INVENTORY_VIEW, label: 'View Inventory', description: 'Melihat data inventory' },
            { key: PERMISSIONS.INVENTORY_CREATE, label: 'Create Inventory', description: 'Membuat data inventory' },
            { key: PERMISSIONS.INVENTORY_EDIT, label: 'Edit Inventory', description: 'Mengubah data inventory' },
            { key: PERMISSIONS.INVENTORY_DELETE, label: 'Delete Inventory', description: 'Menghapus data inventory' },
        ],
    },
    {
        key: 'settings',
        label: 'Settings',
        permissions: [
            { key: PERMISSIONS.SETTINGS_VIEW, label: 'View Settings', description: 'Melihat pengaturan' },
            { key: PERMISSIONS.SETTINGS_EDIT, label: 'Edit Settings', description: 'Mengubah pengaturan' },
            { key: PERMISSIONS.SETTINGS_TEAM, label: 'Manage Team', description: 'Mengelola tim' },
            { key: PERMISSIONS.SETTINGS_BILLING, label: 'Manage Billing', description: 'Mengelola billing' },
        ],
    },
    {
        key: 'reports',
        label: 'Reports',
        permissions: [
            { key: PERMISSIONS.REPORTS_VIEW, label: 'View Reports', description: 'Melihat laporan' },
            { key: PERMISSIONS.REPORTS_CREATE, label: 'Create Reports', description: 'Membuat laporan' },
        ],
    },
    {
        key: 'analytics',
        label: 'Analytics',
        permissions: [
            { key: PERMISSIONS.ANALYTICS_VIEW, label: 'View Analytics', description: 'Melihat analytics' },
            { key: PERMISSIONS.ANALYTICS_EDIT, label: 'Edit Analytics', description: 'Mengubah analytics' },
        ],
    },
    {
        key: 'audit',
        label: 'Audit',
        permissions: [
            { key: PERMISSIONS.AUDIT_VIEW, label: 'View Audit Log', description: 'Melihat audit log' },
        ],
    },
    {
        key: 'approval',
        label: 'Approval',
        permissions: [
            { key: PERMISSIONS.APPROVAL_VIEW, label: 'View Approval', description: 'Melihat data approval' },
            { key: PERMISSIONS.APPROVAL_VIEW_ALL, label: 'View All Approvals', description: 'Melihat semua approval requests (bukan hanya yang eligible)' },
            { key: PERMISSIONS.APPROVAL_CREATE, label: 'Create Approval', description: 'Membuat approval request' },
            { key: PERMISSIONS.APPROVAL_EDIT, label: 'Edit Approval', description: 'Mengubah approval' },
            { key: PERMISSIONS.APPROVAL_DELETE, label: 'Delete Approval', description: 'Menghapus approval' },
            { key: PERMISSIONS.APPROVAL_APPROVE, label: 'Approve', description: 'Menyetujui approval request' },
            { key: PERMISSIONS.APPROVAL_REJECT, label: 'Reject', description: 'Menolak approval request' },
        ],
    },
    {
        key: 'workflow',
        label: 'Workflow',
        permissions: [
            { key: PERMISSIONS.WORKFLOW_VIEW, label: 'View Workflow', description: 'Melihat workflow' },
            { key: PERMISSIONS.WORKFLOW_CREATE, label: 'Create Workflow', description: 'Membuat workflow' },
            { key: PERMISSIONS.WORKFLOW_EDIT, label: 'Edit Workflow', description: 'Mengubah workflow' },
            { key: PERMISSIONS.WORKFLOW_DELETE, label: 'Delete Workflow', description: 'Menghapus workflow' },
            { key: PERMISSIONS.WORKFLOW_TRANSITION, label: 'Transition Workflow', description: 'Melakukan transisi workflow' },
        ],
    },
    {
        key: 'pos',
        label: 'POS (Point of Sale)',
        permissions: [
            { key: PERMISSIONS.POS_VIEW, label: 'View POS', description: 'Melihat data POS' },
            { key: PERMISSIONS.POS_CREATE, label: 'Create POS', description: 'Membuat transaksi POS' },
            { key: PERMISSIONS.POS_EDIT, label: 'Edit POS', description: 'Mengubah data POS' },
            { key: PERMISSIONS.POS_DELETE, label: 'Delete POS', description: 'Menghapus data POS' },
        ],
    },
    {
        key: 'billing',
        label: 'Billing',
        permissions: [
            { key: PERMISSIONS.BILLING_VIEW, label: 'View Billing', description: 'Melihat data billing' },
            { key: PERMISSIONS.BILLING_CREATE, label: 'Create Billing', description: 'Membuat data billing' },
            { key: PERMISSIONS.BILLING_EDIT, label: 'Edit Billing', description: 'Mengubah data billing' },
            { key: PERMISSIONS.BILLING_DELETE, label: 'Delete Billing', description: 'Menghapus data billing' },
        ],
    },
    {
        key: 'dashboard',
        label: 'Dashboard',
        permissions: [
            { key: PERMISSIONS.DASHBOARD_VIEW, label: 'View Dashboard', description: 'Melihat dashboard' },
        ],
    },
    {
        key: 'project',
        label: 'Projects',
        permissions: [
            { key: PERMISSIONS.PROJECT_VIEW, label: 'View Projects', description: 'Melihat proyek' },
            { key: PERMISSIONS.PROJECT_CREATE, label: 'Create Projects', description: 'Membuat proyek' },
            { key: PERMISSIONS.PROJECT_EDIT, label: 'Edit Projects', description: 'Mengubah proyek' },
            { key: PERMISSIONS.PROJECT_DELETE, label: 'Delete Projects', description: 'Menghapus proyek' },
        ],
    },
    {
        key: 'operations',
        label: 'Operations',
        permissions: [
            { key: PERMISSIONS.OPERATIONS_VIEW, label: 'View Operations', description: 'Melihat operasi' },
            { key: PERMISSIONS.OPERATIONS_CREATE, label: 'Create Operations', description: 'Membuat operasi' },
            { key: PERMISSIONS.OPERATIONS_EDIT, label: 'Edit Operations', description: 'Mengubah operasi' },
            { key: PERMISSIONS.OPERATIONS_DELETE, label: 'Delete Operations', description: 'Menghapus operasi' },
        ],
    },
    {
        key: 'notification',
        label: 'Notifications',
        permissions: [
            { key: PERMISSIONS.NOTIFICATION_VIEW, label: 'View Notifications', description: 'Melihat notifikasi' },
        ],
    },
    {
        key: 'system',
        label: 'System',
        permissions: [
            { key: PERMISSIONS.SYSTEM_VIEW, label: 'View System', description: 'Melihat informasi sistem' },
            { key: PERMISSIONS.SYSTEM_ADMIN, label: 'Admin System', description: 'Administrasi sistem' },
        ],
    },
    {
        key: 'ai',
        label: 'AI Features',
        permissions: [
            { key: PERMISSIONS.AI_VIEW, label: 'View AI', description: 'Menggunakan fitur AI' },
        ],
    },
    {
        key: 'platform',
        label: 'Platform Admin',
        permissions: [
            { key: PERMISSIONS.PLATFORM_VIEW, label: 'View Platform', description: 'Melihat data platform' },
        ],
    },
];

/**
 * Helper: get permission definition by key
 */
export function getPermissionDef(key: string): PermissionDefinition | undefined {
    for (const cat of PERMISSION_CATEGORIES) {
        const found = cat.permissions.find(p => p.key === key);
        if (found) return found;
    }
    return undefined;
}

/**
 * Helper: check if a permission string is valid
 */
export function isValidPermission(perm: string): boolean {
    // Wildcard permissions are always valid
    if (perm === '*' || perm.endsWith(':*')) {
        const module = perm === '*' ? '*' : perm.split(':')[0];
        if (perm === '*') return true;
        return module in MODULE_PERMISSIONS;
    }
    return ALL_PERMISSIONS.includes(perm);
}
