export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { MSG, MSG_COMMUNITY } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

/**
 * Projection publik portal warga — HANYA 5 field (plans §2.3 / §4.7):
 * `{ assetCode, name, category, condition, location }`.
 * `acquisitionCost`, nama custodian, dan notes TIDAK dipublikasikan.
 */
const PORTAL_ASSET_SELECT = {
    assetCode: true,
    name: true,
    category: true,
    condition: true,
    location: true,
} as const;

/**
 * GET /api/community/portal/assets — daftar aset untuk warga (read-only, community:portal).
 *
 * Tanpa search/filter/pagination (spec §4.7) — list ringkas penuh. Exclude
 * soft-deleted (`deletedAt: null`). Response `{ success, data, total }`.
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-portal-assets:${ip}`, 60, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission(session, 'community:portal'))) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const { tenantId } = auth;
        const where = { tenantId, deletedAt: null };

        const [rows, total] = await Promise.all([
            prisma.communityAsset.findMany({
                where,
                select: PORTAL_ASSET_SELECT,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.communityAsset.count({ where }),
        ]);

        return NextResponse.json({ success: true, data: rows, total });
    } catch (error) {
        return handleApiError(error);
    }
}
