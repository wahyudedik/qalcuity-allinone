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
