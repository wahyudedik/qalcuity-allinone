// ─── Permission Types ──────────────────────────────────────────────────────────
// Definisi tipe untuk Permission Engine Qalcuity

/**
 * Permission string format: "module:action"
 * Contoh: "finance:view", "crm:create", "hr:approve"
 */
export type PermissionString = string;

/**
 * Wildcard permission: "module:*" — mengizinkan semua aksi dalam module
 * Contoh: "finance:*" mengizinkan finance:view, finance:create, dll.
 */
export type WildcardPermission = `${string}:*`;

/**
 * Superadmin wildcard — mengizinkan SEMUA permissions
 */
export const SUPERADMIN_WILDCARD = '*' as const;

/**
 * Permission check result
 */
export interface PermissionCheckResult {
    granted: boolean;
    reason?: string;
}

/**
 * Role definition — digunakan untuk role management API
 */
export interface RoleDefinition {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
}

/**
 * System role names — tidak bisa dihapus/diubah
 */
export type SystemRoleName = 'SUPERADMIN' | 'ADMIN' | 'MEMBER' | 'VIEWER';

/**
 * Permission categories — untuk UI grouping
 */
export interface PermissionCategory {
    key: string;
    label: string;
    permissions: PermissionDefinition[];
}

/**
 * Single permission definition — untuk UI rendering
 */
export interface PermissionDefinition {
    key: string;
    label: string;
    description: string;
}
