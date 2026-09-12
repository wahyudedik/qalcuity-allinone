// ─── Client-side Permission Hook ──────────────────────────────────────────────
// Hook untuk permission checking di client components.
// Menggunakan PermissionEngine dari @qalcuity/permissions (pure function, no DB).
//
// Untuk custom roles, gunakan server-side hasPermission() dari apps/web/lib/permissions.ts.
// Hook ini menggunakan SYSTEM_ROLE_PERMISSIONS sebagai fallback.

'use client';

import { useSession } from 'next-auth/react';
import { PermissionEngine } from '@qalcuity/permissions';

/**
 * Permission hook untuk client components.
 *
 * @example
 * const { canMutate, hasPermission, isAdmin } = usePermission();
 *
 * // Check if user can create/edit in a module
 * const canCreateInvoice = canMutate('finance');
 *
 * // Check specific permission
 * const canApprove = hasPermission('finance:approve');
 *
 * // Check if user is admin
 * if (isAdmin()) { ... }
 */
export function usePermission() {
    const { data: session } = useSession();
    const role = session?.user?.role;

    /**
     * Check apakah user memiliki permission tertentu.
     * Menggunakan system role defaults (bukan custom role dari DB).
     *
     * @param permission - Permission string (e.g., 'finance:view', 'finance:create')
     * @returns boolean
     */
    const hasPermission = (permission: string): boolean => {
        if (!role) return false;
        return PermissionEngine.hasRolePermission(role, permission);
    };

    /**
     * Check apakah user bisa melakukan mutasi (create/edit/delete) di module tertentu.
     * Memeriksa apakah role memiliki setidaknya permission create atau edit.
     *
     * @param module - Module name (e.g., 'finance', 'crm', 'hr', 'inventory')
     * @returns boolean
     */
    const canMutate = (module: string): boolean => {
        if (!role) return false;
        if (role === 'VIEWER') return false;
        return (
            PermissionEngine.hasRolePermission(role, `${module}:create`) ||
            PermissionEngine.hasRolePermission(role, `${module}:edit`) ||
            PermissionEngine.hasRolePermission(role, `${module}:delete`)
        );
    };

    /**
     * Check apakah user bisa delete di module tertentu.
     *
     * @param module - Module name
     * @returns boolean
     */
    const canDelete = (module: string): boolean => {
        if (!role) return false;
        return PermissionEngine.hasRolePermission(role, `${module}:delete`);
    };

    /**
     * Check apakah user bisa approve di module tertentu.
     *
     * @param module - Module name
     * @returns boolean
     */
    const canApprove = (module: string): boolean => {
        if (!role) return false;
        return PermissionEngine.hasRolePermission(role, `${module}:approve`);
    };

    /**
     * Check apakah user adalah ADMIN atau SUPERADMIN.
     *
     * @returns boolean
     */
    const isAdmin = (): boolean => {
        return role === 'ADMIN' || role === 'SUPERADMIN';
    };

    /**
     * Check apakah user adalah SUPERADMIN.
     *
     * @returns boolean
     */
    const isSuperAdmin = (): boolean => {
        return role === 'SUPERADMIN';
    };

    return {
        hasPermission,
        canMutate,
        canDelete,
        canApprove,
        isAdmin,
        isSuperAdmin,
        role,
    };
}
