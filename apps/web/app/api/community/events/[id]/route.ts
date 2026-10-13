export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { MSG, MSG_COMMUNITY, MSG_COMMUNITY_EVENTS } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { logAudit, toAuditPayload, diffValues } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { updateCommunityEventSchema, formatZodError } from '@/lib/validation-schemas';
import { EVENT_LIST_SELECT, serializeCommunityEvent } from '@/lib/community';

/** Hitungan transaksi kas ter-link (belum dihapus) — konsisten dengan list route. */
const EVENT_TX_COUNT = {
    _count: { select: { transactions: { where: { deletedAt: null } } } },
} as const;

/**
 * GET /api/community/events/[id] — detail kegiatan (community:view).
 *
 * Menyertakan `_count.transactions` = jumlah transaksi kas ter-link yang
 * belum dihapus (badge UI + indikasi proteksi delete).
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-events-detail:${ip}`, 100, 60_000);
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
        const event = await prisma.communityEvent.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            select: { ...EVENT_LIST_SELECT, ...EVENT_TX_COUNT },
        });
        if (!event) {
            return NextResponse.json({ error: MSG_COMMUNITY_EVENTS.EVENT_NOT_FOUND }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: serializeCommunityEvent(event) });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * PUT /api/community/events/[id] — ubah kegiatan (community:manage).
 *
 * Nomor kegiatan TIDAK berubah setelah dibuat (spec §5.1#13). Status boleh
 * diubah bebas termasuk ke DONE/CANCELLED. `budgetAmount` Decimal dikonversi
 * dari number Zod. Konsistensi tanggal divalidasi ulang terhadap nilai
 * eksisting (efektif `startsAt`/`endsAt` setelah merge partial) → 400
 * EVENT_INVALID_DATE.
 */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-events-update:${ip}`, 30, 60_000);
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
        const parsed = updateCommunityEventSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        const existing = await prisma.communityEvent.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            select: EVENT_LIST_SELECT,
        });
        if (!existing) {
            return NextResponse.json({ error: MSG_COMMUNITY_EVENTS.EVENT_NOT_FOUND }, { status: 404 });
        }

        const {
            title,
            description,
            category,
            startsAt,
            endsAt,
            location,
            maxCapacity,
            budgetAmount,
            announcementId,
            publishedAt,
            status,
        } = parsed.data;

        // Konsistensi tanggal efektif (merge payload + nilai eksisting).
        const effectiveStart = startsAt ?? existing.startsAt;
        const effectiveEnd = endsAt ?? existing.endsAt;
        if (effectiveEnd && effectiveEnd < effectiveStart) {
            return NextResponse.json({ error: MSG_COMMUNITY_EVENTS.EVENT_INVALID_DATE }, { status: 400 });
        }

        // Update parsial — hanya field yang dikirim yang diubah (nomor tidak tersentuh).
        // Unchecked variant — scalar FK announcementId hanya ada di varian ini.
        const data: Prisma.CommunityEventUncheckedUpdateInput = {};
        if (title !== undefined) data.title = title;
        if (description !== undefined) data.description = description;
        if (category !== undefined) data.category = category;
        if (startsAt !== undefined) data.startsAt = startsAt;
        if (endsAt !== undefined) data.endsAt = endsAt;
        if (location !== undefined) data.location = location;
        if (maxCapacity !== undefined) data.maxCapacity = maxCapacity;
        if (budgetAmount !== undefined) data.budgetAmount = new Prisma.Decimal(budgetAmount);
        if (announcementId !== undefined) data.announcementId = announcementId || null;
        if (publishedAt !== undefined) data.publishedAt = publishedAt;
        if (status !== undefined) data.status = status;

        const updated = await prisma.communityEvent.update({
            where: { id: params.id },
            data,
            select: EVENT_LIST_SELECT,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'CommunityEvent',
            entityId: updated.id,
            oldValues: toAuditPayload(existing),
            newValues: diffValues(existing, serializeCommunityEvent(updated)),
            request,
        });

        return NextResponse.json({
            success: true,
            message: MSG_COMMUNITY_EVENTS.EVENT_UPDATED,
            data: serializeCommunityEvent(updated),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * DELETE /api/community/events/[id] — hapus kegiatan (community:manage, soft delete).
 *
 * Diblokir 409 bila masih ada transaksi kas ter-link aktif (status ≠ REJECTED,
 * belum dihapus) — spec §5.1#14 → EVENT_HAS_TRANSACTIONS.
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-events-delete:${ip}`, 20, 60_000);
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

        const existing = await prisma.communityEvent.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            select: EVENT_LIST_SELECT,
        });
        if (!existing) {
            return NextResponse.json({ error: MSG_COMMUNITY_EVENTS.EVENT_NOT_FOUND }, { status: 404 });
        }

        // Transaksi kas ter-link aktif (≠ REJECTED, belum dihapus) memblokir delete.
        const activeTxCount = await prisma.communityCashTransaction.count({
            where: { eventId: params.id, tenantId, deletedAt: null, status: { not: 'REJECTED' } },
        });
        if (activeTxCount > 0) {
            return NextResponse.json(
                { error: MSG_COMMUNITY_EVENTS.EVENT_HAS_TRANSACTIONS },
                { status: 409 }
            );
        }

        await prisma.communityEvent.update({
            where: { id: params.id },
            data: { deletedAt: new Date(), deletedBy: userId },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'CommunityEvent',
            entityId: existing.id,
            oldValues: toAuditPayload(existing),
            request,
        });

        return NextResponse.json({
            success: true,
            message: MSG_COMMUNITY_EVENTS.EVENT_DELETED,
            data: { id: existing.id, deleted: true },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
