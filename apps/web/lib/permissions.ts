// ─── Permission Helpers for API Routes ─────────────────────────────────────────
// Helper functions untuk permission checking di API routes.
// Menggunakan Permission Engine dari @qalcuity/permissions.

import { getServerSession, Session } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from './db';
import { PermissionEngine, SYSTEM_ROLE_PERMISSIONS } from '@qalcuity/permissions';

/**
 * Dapatkan permissions untuk user berdasarkan role-nya.
 * - System roles: gunakan SYSTEM_ROLE_PERMISSIONS
 * - Custom roles: ambil dari database
 *
 * @param session - NextAuth session
 * @returns Array of permission strings (resolved/flat)
 */
export async function getUserPermissions(session: Session): Promise<string[]> {
    if (!session?.user) return [];

    const role = session.user.role;

    // Check if user has custom role (roleId in DB)
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            roleId: true,
            customRole: true,
        },
    });

    // If user has a custom role, use its permissions
    if (user?.customRole) {
        const customPerms = (user.customRole as any).permissions;
        if (Array.isArray(customPerms) && customPerms.length > 0) {
            return PermissionEngine.resolvePermissions(customPerms);
        }
    }

    // Fall back to system role permissions
    const systemPerms = SYSTEM_ROLE_PERMISSIONS[role];
    if (systemPerms) {
        return PermissionEngine.resolvePermissions(systemPerms);
    }

    return [];
}

/**
 * Check apakah user memiliki permission tertentu.
 *
 * @param session - NextAuth session
 * @param permission - Permission string (e.g., 'finance:view')
 * @returns boolean
 */
export async function hasPermission(
    session: Session,
    permission: string
): Promise<boolean> {
    if (!session?.user) return false;

    const permissions = await getUserPermissions(session);
    return PermissionEngine.hasFlatPermission(permissions, permission);
}

/**
 * Check apakah user memiliki semua permissions dalam array.
 *
 * @param session - NextAuth session
 * @param permissions - Array of permission strings
 * @returns boolean
 */
export async function hasAllPermissions(
    session: Session,
    permissions: string[]
): Promise<boolean> {
    if (!session?.user) return false;

    const userPerms = await getUserPermissions(session);
    return permissions.every(p => PermissionEngine.hasFlatPermission(userPerms, p));
}

/**
 * Check apakah user memiliki salah satu dari permissions.
 *
 * @param session - NextAuth session
 * @param permissions - Array of permission strings
 * @returns boolean
 */
export async function hasAnyPermission(
    session: Session,
    permissions: string[]
): Promise<boolean> {
    if (!session?.user) return false;

    const userPerms = await getUserPermissions(session);
    return permissions.some(p => PermissionEngine.hasFlatPermission(userPerms, p));
}

/**
 * Require permission — throw error jika user tidak memiliki permission.
 * Digunakan di API routes untuk guard akses.
 *
 * @param permission - Permission string yang diperlukan
 * @returns Session object jika authorized
 * @throws Error jika unauthorized
 */
export async function requirePermission(permission: string): Promise<Session> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    const hasPerm = await hasPermission(session, permission);
    if (!hasPerm) {
        throw new Error(
            `Forbidden: Anda tidak memiliki permission "${permission}"`
        );
    }

    return session;
}

/**
 * Require permission atau role fallback — untuk backward compatibility.
 * Cek permission dulu, jika tidak ada permission system, fallback ke role check.
 *
 * @param permission - Permission string
 * @param roleFallback - Callback untuk role-based check (backward compat)
 * @returns Session object jika authorized
 * @throws Error jika unauthorized
 */
export async function requirePermissionOrRole(
    permission: string,
    roleFallback: (role: string) => boolean
): Promise<Session> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    // Try permission-based check first
    const hasPerm = await hasPermission(session, permission);
    if (hasPerm) {
        return session;
    }

    // Fallback to role-based check
    const role = session.user.role;
    if (roleFallback(role)) {
        return session;
    }

    throw new Error(
        `Forbidden: Anda tidak memiliki akses ke resource ini`
    );
}

/**
 * Get current user's permission list — berguna untuk UI permission checking.
 *
 * @returns Object dengan user info dan permissions
 */
export async function getCurrentUserPermissions() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return null;
    }

    const permissions = await getUserPermissions(session);

    return {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        role: session.user.role,
        permissions,
    };
}
