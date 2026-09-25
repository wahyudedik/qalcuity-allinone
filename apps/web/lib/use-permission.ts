// ─── Client-side Permission Hook ──────────────────────────────────────────────
// Hook untuk permission checking di client components.
// Menggunakan permissions array dari session (resolved saat login dari system role atau custom role).
//
// Untuk custom roles, permissions di-resolve di server-side (auth.ts) dan disimpan di JWT.
// Hook ini membaca permissions dari session dan menggunakan PermissionEngine.hasFlatPermission().

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
    const permissions = session?.user?.permissions ?? [];

    /**
     * Check apakah user memiliki permission tertentu.
     * Menggunakan resolved permissions dari session (system role atau custom role).
     *
     * @param permission - Permission string (e.g., 'finance:view', 'finance:create')
     * @returns boolean
     */
    const hasPermission = (permission: string): boolean => {
        if (permissions.length === 0) return false;
        return PermissionEngine.hasFlatPermission(permissions, permission);
    };

    /**
     * Check apakah user bisa melakukan mutasi (create/edit/delete) di module tertentu.
     * Memeriksa apakah user memiliki setidaknya permission create, edit, atau delete.
     * Works with both system roles and custom roles.
     *
     * @param module - Module name (e.g., 'finance', 'crm', 'hr', 'inventory')
     * @returns boolean
     */
    const canMutate = (module: string): boolean => {
        if (permissions.length === 0) return false;
        return (
            permissions.includes(`${module}:create`) ||
            permissions.includes(`${module}:edit`) ||
            permissions.includes(`${module}:delete`)
        );
    };

    /**
     * Check apakah user bisa delete di module tertentu.
     *
     * @param module - Module name
     * @returns boolean
     */
    const canDelete = (module: string): boolean => {
        if (permissions.length === 0) return false;
        return permissions.includes(`${module}:delete`);
    };

    /**
     * Check apakah user bisa approve di module tertentu.
     *
     * @param module - Module name
     * @returns boolean
     */
    const canApprove = (module: string): boolean => {
        if (permissions.length === 0) return false;
        return permissions.includes(`${module}:approve`);
    };

    /**
     * Check apakah user adalah ADMIN atau SUPERADMIN (system roles only).
     * Untuk custom roles, use hasPermission() instead.
     *
     * @returns boolean
     */
    const isAdmin = (): boolean => {
        return role === 'ADMIN' || role === 'SUPERADMIN';
    };

    /**
     * Check apakah user adalah SUPERADMIN (system role only).
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
        permissions,
    };
}
