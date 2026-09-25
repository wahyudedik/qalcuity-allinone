// ─── Role Definitions ──────────────────────────────────────────────────────────
// Default permissions untuk setiap system role di Qalcuity.
// Format wildcard: "module:*" = semua aksi dalam module tersebut.

import { PERMISSIONS } from './permissions';

// ─── System Role Permissions ───────────────────────────────────────────────────

/**
 * Default permissions per system role.
 * - SUPERADMIN: '*' (all permissions)
 * - ADMIN: full access ke semua module (kecuali system:admin dan platform:view)
 * - MEMBER: view + create + edit (limited)
 * - VIEWER: view only
 */
export const SYSTEM_ROLE_PERMISSIONS: Record<string, string[]> = {
    SUPERADMIN: ['*'],

    ADMIN: [
        // Finance — full access
        PERMISSIONS.FINANCE_VIEW,
        PERMISSIONS.FINANCE_CREATE,
        PERMISSIONS.FINANCE_EDIT,
        PERMISSIONS.FINANCE_DELETE,
        PERMISSIONS.FINANCE_APPROVE,

        // CRM — full access
        PERMISSIONS.CRM_VIEW,
        PERMISSIONS.CRM_CREATE,
        PERMISSIONS.CRM_EDIT,
        PERMISSIONS.CRM_DELETE,
        PERMISSIONS.CRM_IMPORT,

        // HR — full access
        PERMISSIONS.HR_VIEW,
        PERMISSIONS.HR_CREATE,
        PERMISSIONS.HR_EDIT,
        PERMISSIONS.HR_DELETE,
        PERMISSIONS.HR_APPROVE,

        // Inventory — full access
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INVENTORY_CREATE,
        PERMISSIONS.INVENTORY_EDIT,
        PERMISSIONS.INVENTORY_DELETE,

        // Settings — full access
        PERMISSIONS.SETTINGS_VIEW,
        PERMISSIONS.SETTINGS_EDIT,
        PERMISSIONS.SETTINGS_TEAM,
        PERMISSIONS.SETTINGS_BILLING,

        // Reports — full access
        PERMISSIONS.REPORTS_VIEW,
        PERMISSIONS.REPORTS_CREATE,

        // Analytics — full access
        PERMISSIONS.ANALYTICS_VIEW,
        PERMISSIONS.ANALYTICS_EDIT,

        // Audit — view only (even for ADMIN)
        PERMISSIONS.AUDIT_VIEW,

        // Approval — full access
        PERMISSIONS.APPROVAL_VIEW,
        PERMISSIONS.APPROVAL_VIEW_ALL,
        PERMISSIONS.APPROVAL_CREATE,
        PERMISSIONS.APPROVAL_EDIT,
        PERMISSIONS.APPROVAL_DELETE,
        PERMISSIONS.APPROVAL_APPROVE,
        PERMISSIONS.APPROVAL_REJECT,

        // Workflow — full access
        PERMISSIONS.WORKFLOW_VIEW,
        PERMISSIONS.WORKFLOW_CREATE,
        PERMISSIONS.WORKFLOW_EDIT,
        PERMISSIONS.WORKFLOW_DELETE,
        PERMISSIONS.WORKFLOW_TRANSITION,

        // POS — full access
        PERMISSIONS.POS_VIEW,
        PERMISSIONS.POS_CREATE,
        PERMISSIONS.POS_EDIT,
        PERMISSIONS.POS_DELETE,

        // Billing — full access
        PERMISSIONS.BILLING_VIEW,
        PERMISSIONS.BILLING_CREATE,
        PERMISSIONS.BILLING_EDIT,
        PERMISSIONS.BILLING_DELETE,

        // Dashboard — view
        PERMISSIONS.DASHBOARD_VIEW,

        // Projects — full access
        PERMISSIONS.PROJECT_VIEW,
        PERMISSIONS.PROJECT_CREATE,
        PERMISSIONS.PROJECT_EDIT,
        PERMISSIONS.PROJECT_DELETE,

        // Operations — full access
        PERMISSIONS.OPERATIONS_VIEW,
        PERMISSIONS.OPERATIONS_CREATE,
        PERMISSIONS.OPERATIONS_EDIT,
        PERMISSIONS.OPERATIONS_DELETE,

        // Notifications — view
        PERMISSIONS.NOTIFICATION_VIEW,

        // System — view only (no admin)
        PERMISSIONS.SYSTEM_VIEW,

        // AI — view
        PERMISSIONS.AI_VIEW,
    ],

    MEMBER: [
        // Finance — view, create, edit (no delete, no approve)
        PERMISSIONS.FINANCE_VIEW,
        PERMISSIONS.FINANCE_CREATE,
        PERMISSIONS.FINANCE_EDIT,

        // CRM — view, create, edit (no delete, no import)
        PERMISSIONS.CRM_VIEW,
        PERMISSIONS.CRM_CREATE,
        PERMISSIONS.CRM_EDIT,

        // HR — view, create (no edit, no delete, no approve)
        PERMISSIONS.HR_VIEW,
        PERMISSIONS.HR_CREATE,

        // Inventory — view, create, edit (no delete)
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INVENTORY_CREATE,
        PERMISSIONS.INVENTORY_EDIT,

        // Settings — view only
        PERMISSIONS.SETTINGS_VIEW,

        // Reports — view only
        PERMISSIONS.REPORTS_VIEW,

        // Analytics — view only
        PERMISSIONS.ANALYTICS_VIEW,

        // Approval — view + create (request approval)
        PERMISSIONS.APPROVAL_VIEW,
        PERMISSIONS.APPROVAL_CREATE,

        // Workflow — view only
        PERMISSIONS.WORKFLOW_VIEW,

        // POS — view, create (cashier operations)
        PERMISSIONS.POS_VIEW,
        PERMISSIONS.POS_CREATE,

        // Billing — view only
        PERMISSIONS.BILLING_VIEW,

        // Dashboard — view
        PERMISSIONS.DASHBOARD_VIEW,

        // Projects — view, create, edit
        PERMISSIONS.PROJECT_VIEW,
        PERMISSIONS.PROJECT_CREATE,
        PERMISSIONS.PROJECT_EDIT,

        // Operations — view, create, edit
        PERMISSIONS.OPERATIONS_VIEW,
        PERMISSIONS.OPERATIONS_CREATE,
        PERMISSIONS.OPERATIONS_EDIT,

        // Notifications — view
        PERMISSIONS.NOTIFICATION_VIEW,

        // AI — view
        PERMISSIONS.AI_VIEW,
    ],

    VIEWER: [
        // Semua module — view only
        PERMISSIONS.FINANCE_VIEW,
        PERMISSIONS.CRM_VIEW,
        PERMISSIONS.HR_VIEW,
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.REPORTS_VIEW,
        PERMISSIONS.ANALYTICS_VIEW,
        PERMISSIONS.APPROVAL_VIEW,
        PERMISSIONS.WORKFLOW_VIEW,
        PERMISSIONS.POS_VIEW,
        PERMISSIONS.BILLING_VIEW,
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.PROJECT_VIEW,
        PERMISSIONS.OPERATIONS_VIEW,
        PERMISSIONS.NOTIFICATION_VIEW,
    ],
};

// ─── Role Hierarchy ────────────────────────────────────────────────────────────

/**
 * Role hierarchy — urutan dari highest ke lowest.
 * Digunakan untuk fallback permission check.
 */
export const ROLE_HIERARCHY: string[] = ['SUPERADMIN', 'ADMIN', 'MEMBER', 'VIEWER'];

/**
 * System roles — tidak bisa dihapus atau di-rename.
 */
export const SYSTEM_ROLES: string[] = ['SUPERADMIN', 'ADMIN', 'MEMBER', 'VIEWER'];

/**
 * Check if a role is a system role
 */
export function isSystemRole(roleName: string): boolean {
    return SYSTEM_ROLES.includes(roleName);
}

/**
 * Get role hierarchy level (lower = more privileged)
 */
export function getRoleLevel(roleName: string): number {
    const idx = ROLE_HIERARCHY.indexOf(roleName);
    return idx === -1 ? ROLE_HIERARCHY.length : idx;
}

/**
 * Check if roleA has higher privilege than roleB
 */
export function hasHigherPrivilege(roleA: string, roleB: string): boolean {
    return getRoleLevel(roleA) < getRoleLevel(roleB);
}

/**
 * Get default description for system roles
 */
export function getSystemRoleDescription(roleName: string): string {
    const descriptions: Record<string, string> = {
        SUPERADMIN: 'Full access ke semua fitur dan pengaturan platform',
        ADMIN: 'Akses penuh ke semua modul bisnis dan pengaturan',
        MEMBER: 'Akses terbatas untuk operasi sehari-hari',
        VIEWER: 'Hanya bisa melihat data, tidak bisa mengubah',
    };
    return descriptions[roleName] || '';
}
