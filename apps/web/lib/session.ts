import { getServerSession, Session } from "next-auth";
import { authOptions } from "./auth";

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
 */
export async function requireMutateAuth() {
    const auth = await requireAuth();
    if (auth.role === "VIEWER") {
        throw new Error("Forbidden: Andа tidak memiliki akses untuk mengubah data");
    }
    return auth;
}

/**
 * Cek apakah user adalah ADMIN atau SUPERADMIN.
 * Digunakan untuk halaman/endpoint yang hanya boleh diakses ADMIN+.
 */
export async function requireAdminAuth() {
    const auth = await requireAuth();
    if (auth.role !== "ADMIN" && auth.role !== "SUPERADMIN") {
        throw new Error("Forbidden: Hanya admin yang dapat mengakses halaman ini");
    }
    return auth;
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
