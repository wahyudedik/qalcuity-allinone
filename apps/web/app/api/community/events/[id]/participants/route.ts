export const dynamic = 'force-dynamic';

/**
 * Peserta kegiatan (Fase 3) — referensi: plans/community-phase3-implementation.md §4.2.
 * GET  = community:view  (BENDAHARA boleh melihat daftar peserta)
 * POST = community:manage (tambah peserta manual / reaktivasi baris CANCELLED)
 *
 * Kuota: `CommunityEvent.maxCapacity` (null = tanpa batas) men-count peserta
 * AKTIF (REGISTERED + ATTENDED); CANCELLED membebaskan slot. Check kuota berada
 * di dalam $transaction (meredam race) + lapisan kedua tangkap P2002 → 409.
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
import { sanitizeObject } from '@/lib/sanitize';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { createCommunityEventParticipantSchema, formatZodError } from '@/lib/validation-schemas';

function isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/** Status aktif (mengisi kuota) — konsisten di seluruh route peserta. */
const ACTIVE_STATUSES = ['REGISTERED', 'ATTENDED'] as const;

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
 * GET /api/community/events/[id]/participants — daftar peserta kegiatan (community:view).
 * Include nama/kode/telepon warga; urut registeredAt. 404 bila kegiatan bukan milik tenant.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-participants:${ip}`, 100, 60_000);
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
            select: { id: true, maxCapacity: true },
        });
        if (!event) {
            return NextResponse.json({ error: MSG_COMMUNITY_EVENTS.EVENT_NOT_FOUND }, { status: 404 });
        }

        const [rows, total] = await Promise.all([
            prisma.communityEventParticipant.findMany({
                where: { tenantId, eventId: params.id },
                select: PARTICIPANT_SELECT,
                orderBy: { registeredAt: 'asc' },
            }),
            prisma.communityEventParticipant.count({ where: { tenantId, eventId: params.id } }),
        ]);

        return NextResponse.json({ success: true, data: rows, total });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * POST /api/community/events/[id]/participants — tambah peserta manual (community:manage).
 * Body: { memberId, note? } — status SELALU REGISTERED di server.
 * Baris CANCELLED → reaktivasi in-place (flip REGISTERED + registeredAt baru).
 * Errors: 400 Zod · 404 EVENT_NOT_FOUND/MEMBER_NOT_FOUND · 409 ALREADY_REGISTERED/EVENT_FULL.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-participants-create:${ip}`, 30, 60_000);
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
        const parsed = createCommunityEventParticipantSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }
        const { memberId, note } = parsed.data;

        const event = await prisma.communityEvent.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            select: { id: true, maxCapacity: true },
        });
        if (!event) {
            return NextResponse.json({ error: MSG_COMMUNITY_EVENTS.EVENT_NOT_FOUND }, { status: 404 });
        }

        const member = await prisma.communityMember.findFirst({
            where: { id: memberId, tenantId, deletedAt: null },
            select: { id: true, code: true, fullName: true },
        });
        if (!member) {
            return NextResponse.json({ error: MSG_COMMUNITY_PARTICIPANTS.MEMBER_NOT_FOUND }, { status: 404 });
        }

        const now = new Date();
        const result = await prisma.$transaction(async (tx) => {
            // Kuota: hitung peserta aktif (REGISTERED + ATTENDED) vs maxCapacity.
            if (event.maxCapacity != null) {
                const activeCount = await tx.communityEventParticipant.count({
                    where: { tenantId, eventId: event.id, status: { in: [...ACTIVE_STATUSES] } },
                });
                if (activeCount >= event.maxCapacity) return { conflict: 'EVENT_FULL' as const };
            }

            const existing = await tx.communityEventParticipant.findUnique({
                where: {
                    tenantId_eventId_memberId: { tenantId, eventId: event.id, memberId },
                },
            });

            if (existing && existing.status !== 'CANCELLED') {
                return { conflict: 'ALREADY_REGISTERED' as const };
            }

            if (existing) {
                // Reaktivasi in-place — flip CANCELLED → REGISTERED (unique terjaga).
                const updated = await tx.communityEventParticipant.update({
                    where: { id: existing.id },
                    data: { status: 'REGISTERED', registeredAt: now, note: note ?? null, createdBy: userId },
                    select: PARTICIPANT_SELECT,
                });
                return { row: updated, reactivated: true };
            }

            const created = await tx.communityEventParticipant.create({
                data: {
                    tenantId,
                    eventId: event.id,
                    memberId,
                    status: 'REGISTERED',
                    note: note ?? null,
                    registeredAt: now,
                    createdBy: userId,
                },
                select: PARTICIPANT_SELECT,
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
        // Lapisan kedua anti-race: unique violation [tenantId, eventId, memberId].
        if (isUniqueViolation(error)) {
            return NextResponse.json(
                { error: MSG_COMMUNITY_PARTICIPANTS.ALREADY_REGISTERED },
                { status: 409 }
            );
        }
        return handleApiError(error);
    }
}
