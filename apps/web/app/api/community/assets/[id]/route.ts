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
import { logAudit, toAuditPayload, diffValues } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { updateCommunityAssetSchema, formatZodError } from '@/lib/validation-schemas';
import { ASSET_LIST_SELECT, serializeCommunityAsset, computeAssetBookValue } from '@/lib/community';

/**
 * GET /api/community/assets/[id] — detail aset komunitas (community:view).
 *
 * Tenant isolation + soft-delete via `findFirst { id, tenantId, deletedAt: null }`.
 * 404 ASSET_NOT_FOUND bila tidak ada / milik tenant lain / sudah dihapus.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-assets-detail:${ip}`, 100, 60_000);
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
        const asset = await prisma.communityAsset.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            select: ASSET_LIST_SELECT,
        });
        if (!asset) {
            return NextResponse.json({ error: MSG_COMMUNITY_ASSETS.ASSET_NOT_FOUND }, { status: 404 });
        }

        // Depresiasi informatif (spec §5): straight-line on-the-fly — TIDAK menyimpan
        // kolom bookValue di DB. `bookValue` null bila biaya/tanggal perolehan tidak
        // lengkap; `usefulLifeYears` selalu terisi (default 5 thn utk LAINNYA).
        const { bookValue, usefulLifeYears } = computeAssetBookValue(asset);

        return NextResponse.json({
            success: true,
            data: { ...serializeCommunityAsset(asset), bookValue, usefulLifeYears },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * PUT /api/community/assets/[id] — ubah aset (community:manage).
 *
 * `assetCode` TIDAK bisa diedit (di-assign otomatis saat CREATE). `custodianMemberId`
 * divalidasi ulang milik tenant & belum dihapus → 404 MEMBER_NOT_FOUND. Update parsial
 * — hanya field yang dikirim yang diubah. `acquisitionCost` Decimal dikonversi dari
 * number Zod; `custodianMemberId: ''` → null (clear custodian).
 */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-assets-update:${ip}`, 30, 60_000);
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
        const parsed = updateCommunityAssetSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        const existing = await prisma.communityAsset.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            select: ASSET_LIST_SELECT,
        });
        if (!existing) {
            return NextResponse.json({ error: MSG_COMMUNITY_ASSETS.ASSET_NOT_FOUND }, { status: 404 });
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

        // Validasi custodian baru bila dikirim (non-kosong) — milik tenant, belum dihapus.
        if (custodianMemberId) {
            const member = await prisma.communityMember.findFirst({
                where: { id: custodianMemberId, tenantId, deletedAt: null },
                select: { id: true },
            });
            if (!member) {
                return NextResponse.json({ error: MSG_COMMUNITY.MEMBER_NOT_FOUND }, { status: 404 });
            }
        }

        // Update parsial — hanya field yang dikirim yang diubah (assetCode tidak tersentuh).
        // Unchecked variant — scalar FK custodianMemberId hanya ada di varian ini.
        const data: Prisma.CommunityAssetUncheckedUpdateInput = {};
        if (name !== undefined) data.name = name;
        if (category !== undefined) data.category = category;
        if (condition !== undefined) data.condition = condition;
        if (status !== undefined) data.status = status;
        if (acquisitionDate !== undefined) data.acquisitionDate = acquisitionDate;
        if (acquisitionCost !== undefined) data.acquisitionCost = new Prisma.Decimal(acquisitionCost);
        if (location !== undefined) data.location = location || null;
        if (custodianMemberId !== undefined) data.custodianMemberId = custodianMemberId || null;
        if (notes !== undefined) data.notes = notes || null;

        const updated = await prisma.communityAsset.update({
            where: { id: params.id },
            data,
            select: ASSET_LIST_SELECT,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'CommunityAsset',
            entityId: updated.id,
            oldValues: toAuditPayload(existing),
            newValues: diffValues(existing, serializeCommunityAsset(updated)),
            request,
        });

        return NextResponse.json({
            success: true,
            message: MSG_COMMUNITY_ASSETS.ASSET_UPDATED,
            data: serializeCommunityAsset(updated),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * DELETE /api/community/assets/[id] — hapus aset (community:manage, soft delete).
 *
 * Soft delete: `deletedAt` + `deletedBy` (plans §2.4). Relasi custodian dari sisi
 * member lain tidak terpengaruh (FK SET NULL di skema hanya aktif untuk hard delete).
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-assets-delete:${ip}`, 20, 60_000);
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

        const existing = await prisma.communityAsset.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            select: ASSET_LIST_SELECT,
        });
        if (!existing) {
            return NextResponse.json({ error: MSG_COMMUNITY_ASSETS.ASSET_NOT_FOUND }, { status: 404 });
        }

        const deleted = await prisma.communityAsset.update({
            where: { id: params.id },
            data: { deletedAt: new Date(), deletedBy: userId },
            select: { id: true, deletedAt: true },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'CommunityAsset',
            entityId: existing.id,
            oldValues: toAuditPayload(existing),
            request,
        });

        return NextResponse.json({
            success: true,
            message: MSG_COMMUNITY_ASSETS.ASSET_DELETED,
            data: { id: deleted.id, deletedAt: deleted.deletedAt, deleted: true },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
