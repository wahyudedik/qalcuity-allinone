export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { MSG, MSG_COMMUNITY, MSG_COMMUNITY_ASSETS } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { createCommunityAssetSchema, formatZodError } from '@/lib/validation-schemas';
import {
    ASSET_LIST_SELECT,
    formatYmd,
    nextAssetNumber,
    serializeCommunityAsset,
} from '@/lib/community';

function isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * GET /api/community/assets — daftar aset komunitas (community:view).
 *
 * Filter: `?search=` (ILIKE name), `?category=`, `?condition=`, `?status=` +
 * paginasi standar (plans §4.1). `where` selalu `tenantId` + `deletedAt: null`
 * (tenant isolation + soft-delete). Setiap baris menyertakan `custodian`
 * (select ringkas) — projection publik memakai endpoint portal terpisah.
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-assets:${ip}`, 100, 60_000);
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
        const url = new URL(request.url);
        const search = url.searchParams.get('search')?.trim();
        const category = url.searchParams.get('category');
        const condition = url.searchParams.get('condition');
        const status = url.searchParams.get('status');
        const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10) || 20));

        const where: Prisma.CommunityAssetWhereInput = { tenantId, deletedAt: null };
        if (search) where.name = { contains: search, mode: 'insensitive' };
        if (category) where.category = category;
        if (condition) where.condition = condition;
        if (status) where.status = status;

        const [rows, total] = await Promise.all([
            prisma.communityAsset.findMany({
                where,
                select: ASSET_LIST_SELECT,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.communityAsset.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: rows.map((row) => serializeCommunityAsset(row)),
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * POST /api/community/assets — buat aset (community:manage).
 *
 * Nomor `AST/<YYYY>-<seq3>` di-assign saat CREATE (plans §2.6) — tahun =
 * tahun berjalan (APP_TIMEZONE). Max+bump di dalam transaksi + retry ×1 saat
 * P2002 unique `[tenantId, assetCode]`; gagal lagi → 409 DUPLICATE_ASSET_CODE.
 * `custodianMemberId` divalidasi milik tenant → 404 MEMBER_NOT_FOUND.
 */
export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-assets-create:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission(session, 'community:manage'))) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const { tenantId, userId } = auth;

        const body = sanitizeObject(await request.json().catch(() => ({})));
        const parsed = createCommunityAssetSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        const {
            name,
            category,
            condition,
            status,
            acquisitionDate,
            acquisitionCost,
            location,
            custodianMemberId,
            notes,
        } = parsed.data;

        // Validasi custodian = member milik tenant, belum di-soft-delete (plans §4.2).
        if (custodianMemberId) {
            const member = await prisma.communityMember.findFirst({
                where: { id: custodianMemberId, tenantId, deletedAt: null },
                select: { id: true },
            });
            if (!member) {
                return NextResponse.json({ error: MSG_COMMUNITY.MEMBER_NOT_FOUND }, { status: 404 });
            }
        }

        const year = parseInt(formatYmd(new Date()).slice(0, 4), 10);

        // Retry loop: P2002 (race nomor aset) → tx rollback → ulang (max 2).
        let lastUniqueError: unknown = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const result = await prisma.$transaction(async (tx) => {
                    const assetCode = await nextAssetNumber(tx, tenantId, year);
                    const created = await tx.communityAsset.create({
                        data: {
                            tenantId,
                            assetCode,
                            name: name!,
                            category: category ?? 'LAINNYA',
                            condition: condition ?? 'BAIK',
                            status: status ?? 'AKTIF',
                            acquisitionDate: acquisitionDate ?? null,
                            acquisitionCost:
                                acquisitionCost !== undefined
                                    ? new Prisma.Decimal(acquisitionCost)
                                    : null,
                            location: location ?? null,
                            custodianMemberId: custodianMemberId ?? null,
                            notes: notes ?? null,
                            createdBy: userId,
                        },
                        select: ASSET_LIST_SELECT,
                    });
                    return { data: created };
                });

                void logAudit({
                    userId,
                    tenantId,
                    action: 'CREATE',
                    entity: 'CommunityAsset',
                    entityId: result.data.id,
                    newValues: toAuditPayload({
                        ...parsed.data,
                        assetCode: result.data.assetCode,
                        acquisitionCost:
                            acquisitionCost !== undefined ? Number(acquisitionCost) : undefined,
                    }),
                    request,
                });

                return NextResponse.json(
                    {
                        success: true,
                        message: MSG_COMMUNITY_ASSETS.ASSET_CREATED,
                        data: serializeCommunityAsset(result.data),
                    },
                    { status: 201 }
                );
            } catch (error) {
                if (isUniqueViolation(error)) {
                    lastUniqueError = error;
                    continue;
                }
                return handleApiError(error);
            }
        }

        // Race masih bentrok setelah retry → 409 eksplisit (plans §4.2).
        void lastUniqueError;
        return NextResponse.json(
            { error: MSG_COMMUNITY_ASSETS.DUPLICATE_ASSET_CODE },
            { status: 409 }
        );
    } catch (error) {
        return handleApiError(error);
    }
}
