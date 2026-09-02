import { getServerSession, Session } from "next-auth";
import { authOptions } from "./auth";
import { getPermissionForRoute } from "./route-permissions";

export async function getSession() {
    return await getServerSession(authOptions);
}

export async function requireAuth() {
    const session = await getSession();
    if (!session?.user?.tenantId) {
        throw new Error("Unauthorized");
    }
    return {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        role: session.user.role,
    };
}

/**
 * Cek apakah user boleh melakukan operasi mutasi (create, update, delete).
 * VIEWER tidak boleh melakukan operasi mutasi.
 * Backward compatible — tetap menggunakan role string check.
 */
export async function requireMutateAuth() {
    const auth = await requireAuth();
    if (auth.role === "VIEWER") {
        throw new Error("Forbidden: Anda tidak memiliki akses untuk mengubah data");
    }
    return auth;
}

/**
 * Cek apakah user adalah ADMIN atau SUPERADMIN.
 * Digunakan untuk halaman/endpoint yang hanya boleh diakses ADMIN+.
 * Backward compatible — tetap menggunakan role string check.
 */
export async function requireAdminAuth() {
    const auth = await requireAuth();
    if (auth.role !== "ADMIN" && auth.role !== "SUPERADMIN") {
        throw new Error("Forbidden: Hanya admin yang dapat mengakses halaman ini");
    }
    return auth;
}

/**
 * Require specific permission — menggunakan Permission Engine.
 * Cek permission berdasarkan system role defaults atau custom role dari database.
 *
 * @param permission - Permission string (e.g., 'finance:view')
 * @returns Auth object dengan userId, tenantId, role
 * @throws Error jika unauthorized atau permission denied
 */
export async function requirePermission(permission: string) {
    const auth = await requireAuth();

    // Dynamic import untuk avoid circular dependency
    const { hasPermission: checkPermission } = await import("./permissions");
    const { getServerSession } = await import("next-auth");
    const session = await getServerSession(authOptions);

    if (!session) {
        throw new Error("Unauthorized");
    }

    const allowed = await checkPermission(session, permission);
    if (!allowed) {
        throw new Error(
            `Forbidden: Anda tidak memiliki permission "${permission}"`
        );
    }

    return auth;
}

/**
 * Check apakah user memiliki permission tertentu (tanpa throw).
 * Berguna untuk conditional UI rendering.
 *
 * @param session - NextAuth session
 * @param permission - Permission string
 * @returns boolean
 */
export async function checkPermission(
    session: Session | null,
    permission: string
): Promise<boolean> {
    if (!session?.user) return false;

    const { hasPermission: checkPerm } = await import("./permissions");
    return checkPerm(session, permission);
}

// ─── Role Helper Functions ───────────────────────────────────────────────────────
// Role hierarchy: SUPERADMIN > ADMIN > MEMBER > VIEWER
// These functions are used at the application layer for permission checking.
// No migration needed — SUPERADMIN is stored as a plain string in the existing `role` field.

/**
 * Check if the user has the SUPERADMIN role.
 */
export function isSuperAdmin(session: Session | null): boolean {
    return session?.user?.role === "SUPERADMIN";
}

/**
 * Check if the user is an ADMIN or SUPERADMIN.
 * ADMIN is the default role for the tenant owner (set during registration).
 */
export function isAdmin(session: Session | null): boolean {
    const role = session?.user?.role;
    return role === "ADMIN" || role === "SUPERADMIN";
}

/**
 * Check if the user can manage team members (invite, update roles, deactivate).
 * Only ADMIN and SUPERADMIN can manage the team.
 */
export function canManageTeam(session: Session | null): boolean {
    return isAdmin(session);
}

/**
 * Check if the user can access settings pages (company, billing, security, etc.).
 * Only ADMIN and SUPERADMIN can access settings.
 */
export function canAccessSettings(session: Session | null): boolean {
    return isAdmin(session);
}

/**
 * Check if the user can perform delete operations.
 * Only ADMIN and SUPERADMIN can delete records.
 */
export function canDelete(session: Session | null): boolean {
    return isAdmin(session);
}

// ─── Permission-based Auth for API Routes ──────────────────────────────────────

/**
 * Return type for requirePermissionForRoute.
 * On success: contains userId, tenantId, role.
 * On failure: contains error and status code.
 */
export type PermissionAuthResult =
    | { error: string; status: number; userId?: never; tenantId?: never; role?: never }
    | { error?: never; status?: never; userId: string; tenantId: string; role: string };

/**
 * Require permission for a route — integrates Permission Engine with route-level auth.
 *
 * Checks:
 * 1. Session exists (authentication)
 * 2. Route has permission config (from route-permissions.ts)
 * 3. User has required permission (via Permission Engine) OR has fallback role
 *
 * Skipped routes (always allowed):
 * - /api/auth/* (NextAuth)
 * - /api/mobile/* (mobile JWT auth)
 * - /api/health (health check)
 * - /api/search (global search)
 * - /api/demo/load (demo data)
 * - /api/dashboard/stats (dashboard stats)
 * - /api/platform/* (platform admin)
 *
 * @param req - The incoming Request object
 * @returns PermissionAuthResult — check `.error` for failure, or destructure `.userId`, `.tenantId`, `.role` on success
 */
export async function requirePermissionForRoute(req: Request): Promise<PermissionAuthResult> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { error: 'Unauthorized', status: 401 };
    }

    const pathname = new URL(req.url).pathname;
    const method = req.method;

    // Skip routes that don't need permission checking
    if (
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/mobile') ||
        pathname === '/api/health' ||
        pathname === '/api/search' ||
        pathname === '/api/demo/load' ||
        pathname === '/api/dashboard/stats' ||
        pathname.startsWith('/api/platform')
    ) {
        return {
            userId: session.user.id,
            tenantId: session.user.tenantId,
            role: session.user.role,
        };
    }

    const routeConfig = getPermissionForRoute(pathname, method);
    if (!routeConfig) {
        // No permission config found — allow (backward compatible)
        return {
            userId: session.user.id,
            tenantId: session.user.tenantId,
            role: session.user.role,
        };
    }

    // Try permission-based check first
    try {
        const { hasPermission: checkPermission } = await import("./permissions");
        const hasPerm = await checkPermission(session, routeConfig.permission);
        if (hasPerm) {
            return {
                userId: session.user.id,
                tenantId: session.user.tenantId,
                role: session.user.role,
            };
        }
    } catch {
        // Permission engine error — fall through to role fallback
    }

    // Fallback to role-based check (backward compatible)
    const role = session.user.role;
    const fallbackRole = routeConfig.fallbackRole || 'ADMIN';

    // Role hierarchy: SUPERADMIN > ADMIN > MEMBER > VIEWER
    const roleHierarchy: Record<string, number> = {
        'SUPERADMIN': 4,
        'ADMIN': 3,
        'MEMBER': 2,
        'VIEWER': 1,
    };

    const userRoleLevel = roleHierarchy[role] || 0;
    const requiredRoleLevel = roleHierarchy[fallbackRole] || 3;

    if (userRoleLevel >= requiredRoleLevel) {
        return {
            userId: session.user.id,
            tenantId: session.user.tenantId,
            role: session.user.role,
        };
    }

    return { error: 'Forbidden: Anda tidak memiliki akses ke resource ini', status: 403 };
}
