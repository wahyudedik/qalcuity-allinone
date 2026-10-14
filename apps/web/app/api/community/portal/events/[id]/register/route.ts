export const dynamic = 'force-dynamic';

/**
 * Pendaftaran mandiri warga (Fase 3) — referensi: plans/community-phase3-implementation.md §4.3.
 * POST   = daftar diri ke kegiatan published (community:portal, own-only via resolvePortalMember).
 * DELETE = batalkan diri sendiri (own-only secara struktural — memberId dari session).
 *
 * Syarat event layak daftar: ada di tenant, publishedAt != null && <= now, status ≠ CANCELLED.
 * Tidak layak → 404 EVENT_NOT_FOUND (bukan 403 — jangan bocorkan eksistensi draft ke warga).
 * Tanpa body request (anti mass-assignment) — memberId berasal dari session portal.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { MSG, MSG_COMMUNITY, MSG_COMMUNITY_EVENTS, MSG_COMMUNITY_PARTICIPANTS } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { resolvePortalMember } from '@/lib/community';

function isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

const ACTIVE_STATUSES = ['REGISTERED', 'ATTENDED'] as const;

const PORTAL_ROW_SELECT = {
    id: true,
    eventId: true,
    memberId: true,
    status: true,
    note: true,
    registeredAt: true,
    createdAt: true,
    updatedAt: true,
} as const;

/**
 * Guard gabungan POST/DELETE — NextResponse bila gagal (429/401/403/404),
 * objek context bila lolos. Pemanggil cukup `g instanceof NextResponse`.
 */
async function portalGate(
    request: Request
): Promise<NextResponse | { tenantId: string; userId: string; member: { id: string } }> {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`community-portal-register:${ip}`, 30, 60_000);
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

    const member = await resolvePortalMember(auth.tenantId, session.user.id);
    if (!member) {
        return NextResponse.json({ error: MSG_COMMUNITY.PORTAL_MEMBER_NOT_FOUND }, { status: 404 });
    }

    return { tenantId: auth.tenantId, userId: session.user.id, member };
}

/**
 * POST /api/community/portal/events/[id]/register — daftar diri.
 * 201 REGISTERED · 201 REACTIVATED (baris CANCELLED di-flip) ·
 * 404 PORTAL_MEMBER_NOT_FOUND/EVENT_NOT_FOUND · 409 ALREADY_REGISTERED/EVENT_FULL.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const g = await portalGate(request);
        if (g instanceof NextResponse) return g;

        const { tenantId, userId, member } = g;

        const event = await prisma.communityEvent.findFirst({
            where: {
                id: params.id,
                tenantId,
                deletedAt: null,
                publishedAt: { not: null, lte: new Date() },
                status: { not: 'CANCELLED' },
            },
            select: { id: true, maxCapacity: true },
        });
        if (!event) {
            return NextResponse.json({ error: MSG_COMMUNITY_EVENTS.EVENT_NOT_FOUND }, { status: 404 });
        }

        const now = new Date();
        const result = await prisma.$transaction(async (tx) => {
            if (event.maxCapacity != null) {
                const activeCount = await tx.communityEventParticipant.count({
                    where: { tenantId, eventId: event.id, status: { in: [...ACTIVE_STATUSES] } },
                });
                if (activeCount >= event.maxCapacity) return { conflict: 'EVENT_FULL' as const };
            }

            const existing = await tx.communityEventParticipant.findUnique({
                where: {
                    tenantId_eventId_memberId: { tenantId, eventId: event.id, memberId: member.id },
                },
            });

            if (existing && existing.status !== 'CANCELLED') {
                return { conflict: 'ALREADY_REGISTERED' as const };
            }

            if (existing) {
                // Reaktivasi in-place setelah cancel (S24).
                const updated = await tx.communityEventParticipant.update({
                    where: { id: existing.id },
                    data: { status: 'REGISTERED', registeredAt: now, createdBy: userId },
                    select: PORTAL_ROW_SELECT,
                });
                return { row: updated, reactivated: true };
            }

            const created = await tx.communityEventParticipant.create({
                data: {
                    tenantId,
                    eventId: event.id,
                    memberId: member.id,
                    status: 'REGISTERED',
                    registeredAt: now,
                    createdBy: userId,
                },
                select: PORTAL_ROW_SELECT,
            });
            return { row: created, reactivated: false };
        });

        if ('conflict' in result) {
            const code =
                result.conflict === 'EVENT_FULL'
                    ? MSG_COMMUNITY_PARTICIPANTS.EVENT_FULL
                    : MSG_COMMUNITY_PARTICIPANTS.ALREADY_REGISTERED;
            return NextResponse.json({ error: code }, { status: 409 });
        }

        void logAudit({
            userId,
            tenantId,
            action: result.reactivated ? 'UPDATE' : 'CREATE',
            entity: 'CommunityEventParticipant',
            entityId: result.row.id,
            newValues: toAuditPayload(result.row),
            request,
        });

        return NextResponse.json(
            {
                success: true,
                message: result.reactivated
                    ? MSG_COMMUNITY_PARTICIPANTS.REACTIVATED
                    : MSG_COMMUNITY_PARTICIPANTS.REGISTERED,
                data: result.row,
            },
            { status: 201 }
        );
    } catch (error) {
        if (isUniqueViolation(error)) {
            return NextResponse.json(
                { error: MSG_COMMUNITY_PARTICIPANTS.ALREADY_REGISTERED },
                { status: 409 }
            );
        }
        return handleApiError(error);
    }
}

/**
 * DELETE /api/community/portal/events/[id]/register — batalkan diri sendiri.
 * Own-only struktural: query selalu memfilter memberId = member hasil resolvePortalMember.
 * 200 CANCELLED · 404 PORTAL_MEMBER_NOT_FOUND/PORTAL_NOT_REGISTERED (termasuk baris
 * sudah CANCELLED) · 409 ALREADY_ATTENDED (kehadiran final) · 409 EVENT_STARTED
 * (now >= startsAt — batal mandiri hanya sebelum kegiatan mulai).
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const g = await portalGate(request);
        if (g instanceof NextResponse) return g;

        const { tenantId, userId, member } = g;

        const event = await prisma.communityEvent.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            select: { id: true, startsAt: true },
        });
        if (!event) {
            return NextResponse.json({ error: MSG_COMMUNITY_EVENTS.EVENT_NOT_FOUND }, { status: 404 });
        }

        const existing = await prisma.communityEventParticipant.findFirst({
            where: { tenantId, eventId: event.id, memberId: member.id },
            select: PORTAL_ROW_SELECT,
        });
        // Tidak ada baris ATAU sudah CANCELLED → dianggap belum terdaftar (404).
        if (!existing || existing.status === 'CANCELLED') {
            return NextResponse.json(
                { error: MSG_COMMUNITY_PARTICIPANTS.PORTAL_NOT_REGISTERED },
                { status: 404 }
            );
        }

        if (existing.status === 'ATTENDED') {
            return NextResponse.json(
                { error: MSG_COMMUNITY_PARTICIPANTS.ALREADY_ATTENDED },
                { status: 409 }
            );
        }

        if (new Date() >= event.startsAt) {
            return NextResponse.json(
                { error: MSG_COMMUNITY_PARTICIPANTS.EVENT_STARTED },
                { status: 409 }
            );
        }

        const updated = await prisma.communityEventParticipant.update({
            where: { id: existing.id },
            data: { status: 'CANCELLED' },
            select: PORTAL_ROW_SELECT,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'CommunityEventParticipant',
            entityId: updated.id,
            oldValues: toAuditPayload(existing),
            newValues: toAuditPayload(updated),
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
