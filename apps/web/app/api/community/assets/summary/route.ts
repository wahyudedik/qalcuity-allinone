export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { MSG, MSG_COMMUNITY } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

/** Serialisasi Decimal Prisma → number aman-JSON (null-safe). */
function decimalToNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

/**
 * GET /api/community/assets/summary — ringkasan aset komunitas (community:view).
 *
 * groupBy kategori (count + sum nilai perolehan), kondisi (count), status (count)
 * + totalAset + totalNilaiPerolehan (plans §4.6). Endpoint TERPISAH dari
 * /reports/monthly (spec §4.6 — ringkasan aset tidak mengubah laporan bulanan).
 * `where` selalu `tenantId` + `deletedAt: null`.
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-assets-summary:${ip}`, 60, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission(session, 'community:view'))) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const { tenantId } = auth;
        const where: Prisma.CommunityAssetWhereInput = { tenantId, deletedAt: null };

        const [byCategory, byCondition, byStatus, totalStats] = await Promise.all([
            prisma.communityAsset.groupBy({
                by: ['category'],
                where,
                _count: { _all: true },
                _sum: { acquisitionCost: true },
                orderBy: { category: 'asc' },
            }),
            prisma.communityAsset.groupBy({
                by: ['condition'],
                where,
                _count: { _all: true },
                orderBy: { condition: 'asc' },
            }),
            prisma.communityAsset.groupBy({
                by: ['status'],
                where,
                _count: { _all: true },
                orderBy: { status: 'asc' },
            }),
            prisma.communityAsset.aggregate({
                where,
                _count: { _all: true },
                _sum: { acquisitionCost: true },
            }),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                totalAssets: totalStats._count._all,
                totalAcquisitionCost: decimalToNumber(totalStats._sum.acquisitionCost),
                byCategory: byCategory.map((row) => ({
                    category: row.category,
                    count: row._count._all,
                    totalAcquisitionCost: decimalToNumber(row._sum.acquisitionCost),
                })),
                byCondition: byCondition.map((row) => ({
                    condition: row.condition,
                    count: row._count._all,
                })),
                byStatus: byStatus.map((row) => ({
                    status: row.status,
                    count: row._count._all,
                })),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
