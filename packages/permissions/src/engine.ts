// ─── Permission Engine Core ────────────────────────────────────────────────────
// Core permission checking logic untuk Qalcuity.
// Mendukung wildcard matching, role hierarchy, dan custom roles.

import { ALL_PERMISSIONS, MODULE_PERMISSIONS } from './permissions';
import { SYSTEM_ROLE_PERMISSIONS, getRoleLevel } from './roles';
import type { PermissionCheckResult } from './types';

export class PermissionEngine {
    // ─── Core Permission Check ─────────────────────────────────────────────

    /**
     * Check apakah sebuah role memiliki permission tertentu.
     * Mendukung wildcard matching:
     * - '*' = all permissions
     * - 'finance:*' = all finance permissions
     * - 'finance:view' = specific permission
     *
     * @param role - Role name (SUPERADMIN, ADMIN, MEMBER, VIEWER) atau custom role
     * @param permissions - Array of permission strings yang dimiliki role
     * @param required - Permission yang diperlukan
     * @returns boolean
     */
    static hasPermission(rolePermissions: string[], required: string): boolean {
        for (const granted of rolePermissions) {
            if (this.matchPermission(required, granted)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check permission dengan role name (menggunakan system defaults).
     * Berguna untuk quick check tanpa database lookup.
     *
     * @param role - Role name
     * @param required - Permission yang diperlukan
     * @returns boolean
     */
    static hasRolePermission(role: string, required: string): boolean {
        const permissions = SYSTEM_ROLE_PERMISSIONS[role];
        if (!permissions) return false;
        return this.hasPermission(permissions, required);
    }

    /**
     * Wildcard permission matching.
     *
     * Rules:
     * - granted='*' → matches everything
     * - granted='finance:*' → matches 'finance:view', 'finance:create', etc.
     * - granted='finance:view' → matches only 'finance:view'
     * - granted='finance:view' does NOT match 'finance:create'
     *
     * @param required - Permission yang diperlukan (e.g., 'finance:view')
     * @param granted - Permission yang diberikan (e.g., 'finance:*', 'finance:view', '*')
     * @returns boolean
     */
    static matchPermission(required: string, granted: string): boolean {
        // Superadmin wildcard — matches everything
        if (granted === '*') return true;

        // Exact match
        if (required === granted) return true;

        // Wildcard match: 'module:*' matches 'module:action'
        if (granted.endsWith(':*')) {
            const grantedModule = granted.split(':')[0];
            const requiredModule = required.split(':')[0];
            return grantedModule === requiredModule;
        }

        return false;
    }

    // ─── Get Permissions ───────────────────────────────────────────────────

    /**
     * Dapatkan semua flat permissions untuk sebuah role.
     * Jika role memiliki wildcard (e.g., '*'), return ALL_PERMISSIONS.
     * Jika role memiliki module wildcard (e.g., 'finance:*'), expand ke semua finance permissions.
     *
     * @param permissions - Array of permission strings
     * @returns Array of resolved permission strings
     */
    static resolvePermissions(permissions: string[]): string[] {
        // Check for superadmin wildcard
        if (permissions.includes('*')) {
            return [...ALL_PERMISSIONS];
        }

        const resolved = new Set<string>();

        for (const perm of permissions) {
            if (perm.endsWith(':*')) {
                // Module wildcard — expand ke semua permissions dalam module
                const module = perm.split(':')[0];
                const modulePerms = MODULE_PERMISSIONS[module];
                if (modulePerms) {
                    for (const action of modulePerms) {
                        resolved.add(`${module}:${action}`);
                    }
                }
            } else if (ALL_PERMISSIONS.includes(perm)) {
                resolved.add(perm);
            }
        }

        return Array.from(resolved);
    }

    /**
     * Dapatkan semua permissions untuk system role.
     *
     * @param role - Role name
     * @returns Array of resolved permission strings
     */
    static getSystemRolePermissions(role: string): string[] {
        const permissions = SYSTEM_ROLE_PERMISSIONS[role];
        if (!permissions) return [];
        return this.resolvePermissions(permissions);
    }

    /**
     * Check apakah role memiliki permission tertentu menggunakan flat permissions.
     *
     * @param permissions - Array of resolved (flat) permission strings
     * @param required - Permission yang diperlukan
     * @returns boolean
     */
    static hasFlatPermission(permissions: string[], required: string): boolean {
        return permissions.includes(required);
    }

    // ─── Permission Groups (for UI) ────────────────────────────────────────

    /**
     * Dapatkan permissions per module untuk UI rendering.
     * Berguna untuk permission editor di settings page.
     *
     * @param permissions - Array of permission strings
     * @returns Record of module → actions
     */
    static getPermissionsByModule(permissions: string[]): Record<string, string[]> {
        const result: Record<string, string[]> = {};

        for (const perm of permissions) {
            const [module, action] = perm.split(':');
            if (!result[module]) {
                result[module] = [];
            }
            result[module].push(action);
        }

        return result;
    }

    /**
     * Check apakah role memiliki semua permissions dalam module tertentu.
     *
     * @param permissions - Array of permission strings
     * @param module - Module name (e.g., 'finance')
     * @returns boolean
     */
    static hasFullModuleAccess(permissions: string[], module: string): boolean {
        const modulePerms = MODULE_PERMISSIONS[module];
        if (!modulePerms) return false;

        return modulePerms.every(action =>
            this.hasPermission(permissions, `${module}:${action}`)
        );
    }

    // ─── Validation ────────────────────────────────────────────────────────

    /**
     * Validate apakah semua permission dalam array valid.
     *
     * @param permissions - Array of permission strings
     * @returns object dengan valid status dan invalid permissions
     */
    static validatePermissions(permissions: string[]): {
        valid: boolean;
        invalid: string[];
    } {
        const invalid: string[] = [];

        for (const perm of permissions) {
            // Wildcard permissions
            if (perm === '*') continue;
            if (perm.endsWith(':*')) {
                const module = perm.split(':')[0];
                if (!(module in MODULE_PERMISSIONS)) {
                    invalid.push(perm);
                }
                continue;
            }

            // Exact permissions
            if (!ALL_PERMISSIONS.includes(perm)) {
                invalid.push(perm);
            }
        }

        return { valid: invalid.length === 0, invalid };
    }

    // ─── Comparison ────────────────────────────────────────────────────────

    /**
     * Bandingkan permissions dua role.
     *
     * @param permissionsA - Permissions dari role pertama
     * @param permissionsB - Permissions dari role kedua
     * @returns object dengan added, removed, dan common permissions
     */
    static comparePermissions(
        permissionsA: string[],
        permissionsB: string[]
    ): { added: string[]; removed: string[]; common: string[] } {
        const resolvedA = new Set(this.resolvePermissions(permissionsA));
        const resolvedB = new Set(this.resolvePermissions(permissionsB));

        const added = Array.from(resolvedB).filter(p => !resolvedA.has(p));
        const removed = Array.from(resolvedA).filter(p => !resolvedB.has(p));
        const common = Array.from(resolvedA).filter(p => resolvedB.has(p));

        return { added, removed, common };
    }
}
