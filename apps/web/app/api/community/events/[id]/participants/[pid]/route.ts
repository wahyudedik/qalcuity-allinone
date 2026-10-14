export const dynamic = 'force-dynamic';

/**
 * Peserta kegiatan (Fase 3) — PATCH/DELETE per baris.
 * Referensi: plans/community-phase3-implementation.md §4.2.
 * PATCH = community:manage — ubah status (transisi ter-guard) / catatan.
 * DELETE = community:manage — soft-cancel IN-PLACE (flip status CANCELLED;
 *          baris dipertahankan untuk riwayat + unique constraint — BUKAN hapus permanen).
 *
 * Aturan transisi status (§4.2):
 *   REGISTERED → ATTENDED   ✅
 *   REGISTERED → CANCELLED  ✅
 *   CANCELLED  → REGISTERED ✅ (aktivasi ulang)
 *   ATTENDED   → *          ❌ 400 INVALID_STATUS_TRANSITION (kehadiran final)
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { MSG, MSG_COMMUNITY, MSG_COMMUNITY_EVENTS, MSG_COMMUNITY_PARTICIPANTS } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { logAudit, toAuditPayload, diffValues } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { updateCommunityEventParticipantSchema, formatZodError } from '@/lib/validation-schemas';

type Status = 'REGISTERED' | 'ATTENDED' | 'CANCELLED';

/** Transisi status yang diizinkan (current → next). ATTENDED tidak punya outgoing. */
const ALLOWED_TRANSITIONS: Record<Status, Status[]> = {
    REGISTERED: ['REGISTERED', 'ATTENDED', 'CANCELLED'],
    CANCELLED: ['REGISTERED', 'CANCELLED'],
    ATTENDED: ['ATTENDED'],
};

const PARTICIPANT_SELECT = {
    id: true,
    eventId: true,
    memberId: true,
    status: true,
    note: true,
    registeredAt: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
    member: { select: { id: true, code: true, fullName: true, phone: true } },
} as const;

/**
 * Guard gabungan PATCH/DELETE — NextResponse bila gagal (429/401/403/404),
 * objek context bila lolos. Pemanggil cukup `g instanceof NextResponse`.
 */
async function guards(
    request: Request,
    eventId: string
): Promise<NextResponse | { tenantId: string; userId: string; event: { id: string; maxCapacity: number | null } }> {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`community-participant-row:${ip}`, 60, 60_000);
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

    const { tenantId } = auth;
    const event = await prisma.communityEvent.findFirst({
        where: { id: eventId, tenantId, deletedAt: null },
        select: { id: true, maxCapacity: true },
    });
    if (!event) {
        return NextResponse.json({ error: MSG_COMMUNITY_EVENTS.EVENT_NOT_FOUND }, { status: 404 });
    }

    return { tenantId, userId: auth.userId, event };
}

/**
 * PATCH /api/community/events/[id]/participants/[pid] — ubah status/catatan.
 * Status baru melanggar aturan transisi → 400 INVALID_STATUS_TRANSITION.
 * CANCELLED → REGISTERED menambah slot kuota → dicek ulang (409 EVENT_FULL).
 */
export async function PATCH(
    request: Request,
    { params }: { params: { id: string; pid: string } }
) {
    try {
        const g = await guards(request, params.id);
        if (g instanceof NextResponse) return g;

        const { tenantId, userId, event } = g;

        const body = sanitizeObject(await request.json().catch(() => ({})));
        const parsed = updateCommunityEventParticipantSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }
        const { status: newStatus, note } = parsed.data;

        const existing = await prisma.communityEventParticipant.findFirst({
            where: { id: params.pid, tenantId, eventId: event.id },
            select: PARTICIPANT_SELECT,
        });
        if (!existing) {
            return NextResponse.json({ error: MSG_COMMUNITY_PARTICIPANTS.PARTICIPANT_NOT_FOUND }, { status: 404 });
        }

        if (newStatus !== undefined && newStatus !== existing.status) {
            const allowed = ALLOWED_TRANSITIONS[existing.status as Status] ?? [];
            if (!allowed.includes(newStatus)) {
                return NextResponse.json(
                    { error: MSG_COMMUNITY_PARTICIPANTS.INVALID_STATUS_TRANSITION },
                    { status: 400 }
                );
            }

            // Aktivasi ulang mengisi kuota — cek ulang kapasitas.
            if (
                newStatus === 'REGISTERED' &&
                event.maxCapacity != null &&
                existing.status === 'CANCELLED'
            ) {
                const activeCount = await prisma.communityEventParticipant.count({
                    where: {
                        tenantId,
                        eventId: event.id,
                        status: { in: ['REGISTERED', 'ATTENDED'] },
                        id: { not: existing.id },
                    },
                });
                if (activeCount >= event.maxCapacity) {
                    return NextResponse.json(
                        { error: MSG_COMMUNITY_PARTICIPANTS.EVENT_FULL },
                        { status: 409 }
                    );
                }
            }
        }

        const data: { status?: string; note?: string | null } = {};
        if (newStatus !== undefined && newStatus !== existing.status) data.status = newStatus;
        if (note !== undefined) data.note = note;

        if (Object.keys(data).length === 0) {
            // Tidak ada perubahan nyata — kembalikan baris apa adanya (idempotent).
            return NextResponse.json({ success: true, data: existing });
        }

        const updated = await prisma.communityEventParticipant.update({
            where: { id: existing.id },
            data,
            select: PARTICIPANT_SELECT,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'CommunityEventParticipant',
            entityId: updated.id,
            oldValues: toAuditPayload(existing),
            newValues: diffValues(existing, updated),
            request,
        });

        return NextResponse.json({
            success: true,
            message:
                data.status === 'ATTENDED'
                    ? MSG_COMMUNITY_PARTICIPANTS.MARKED_ATTENDED
                    : data.status === 'CANCELLED'
                        ? MSG_COMMUNITY_PARTICIPANTS.CANCELLED
                        : MSG_COMMUNITY_PARTICIPANTS.UPDATED,
            data: updated,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * DELETE /api/community/events/[id]/participants/[pid] — batalkan peserta (soft-cancel
 * in-place, spec §4.2: response { ...row, status: 'CANCELLED' }).
 * Baris ATTENDED tidak bisa dibatalkan (kehadiran final) → 400 INVALID_STATUS_TRANSITION.
 * Baris sudah CANCELLED → idempotent 200.
 */
export async function DELETE(
    request: Request,
    { params }: { params: { id: string; pid: string } }
) {
    try {
        const g = await guards(request, params.id);
        if (g instanceof NextResponse) return g;

        const { tenantId, userId, event } = g;

        const existing = await prisma.communityEventParticipant.findFirst({
            where: { id: params.pid, tenantId, eventId: event.id },
            select: PARTICIPANT_SELECT,
        });
        if (!existing) {
            return NextResponse.json({ error: MSG_COMMUNITY_PARTICIPANTS.PARTICIPANT_NOT_FOUND }, { status: 404 });
        }

        if (existing.status === 'ATTENDED') {
            return NextResponse.json(
                { error: MSG_COMMUNITY_PARTICIPANTS.INVALID_STATUS_TRANSITION },
                { status: 400 }
            );
        }

        if (existing.status === 'CANCELLED') {
            // Idempotent — sudah dibatalkan, kembalikan baris apa adanya.
            return NextResponse.json({ success: true, data: existing });
        }

        const updated = await prisma.communityEventParticipant.update({
            where: { id: existing.id },
            data: { status: 'CANCELLED' },
            select: PARTICIPANT_SELECT,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'CommunityEventParticipant',
            entityId: updated.id,
            oldValues: toAuditPayload(existing),
            newValues: diffValues(existing, updated),
            request,
        });

        return NextResponse.json({
            success: true,
            message: MSG_COMMUNITY_PARTICIPANTS.CANCELLED,
            data: updated,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
