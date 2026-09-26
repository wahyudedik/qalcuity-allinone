/**
 * Mobile Auth Guard — Helper untuk mobile API routes.
 *
 * Mobile app mengirim Authorization: Bearer <jwt_token> header.
 * Guard ini mengekstrak token dari header dan memverifikasi via getMobileUserFromToken().
 *
 * Pattern: Setiap mobile route harus memanggil requireMobileAuth(req).
 * Jika null → return 401 Unauthorized.
 */

import { getMobileUserFromToken, MobileUser } from '@/lib/mobile-auth';

/**
 * Authenticate mobile user dari JWT token di Authorization header.
 * Return MobileUser jika valid, null jika tidak.
 *
 * @param req - Request object dari Next.js route handler
 * @returns MobileUser atau null
 */
export async function requireMobileAuth(req: Request): Promise<MobileUser | null> {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return null;
        }

        const token = authHeader.substring(7);
        if (!token) {
            return null;
        }

        const user = await getMobileUserFromToken(token);
        return user;
    } catch {
        // Token invalid, expired, atau user inactive
        return null;
    }
}

/**
 * Check apakah mobile user memiliki role tertentu.
 * Digunakan untuk mobile route-level authorization.
 *
 * @param user - MobileUser dari requireMobileAuth
 * @param allowedRoles - Array of role strings yang diizinkan
 * @returns boolean
 */
export function hasMobileRole(user: MobileUser, allowedRoles: string[]): boolean {
    return allowedRoles.includes(user.role);
}
