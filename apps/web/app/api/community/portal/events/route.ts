/**
 * GET /api/community/portal/events — kegiatan publik untuk warga (read-only, spec §3.8).
 * Query: ?page=&limit= (default 10, max 50).
 *
 * Visibility (tenant-wide, pola portal/announcements):
 * - `publishedAt != null && publishedAt <= now`
 * - status ≠ CANCELLED
 * - PLANNED/ONGOING tampil semua; DONE hanya 30 hari terakhir — window pada
 *   (`endsAt ?? startsAt`) yang diekspresikan sebagai OR dua bentuk tanggal.
 * Kolom internal (createdBy, createdAt, updatedAt, budgetAmount, announcementId)
 * tidak di-expose ke portal.
 *
 * Fase 3 (spec §4.3/R8 — join hanya MENAMBAH field, response lama tetap kompatibel):
 * - `participantStatus`: status peserta milik warga login ini (REGISTERED/ATTENDED/
 *   CANCELLED) atau `null` bila belum pernah mendaftar / akun tidak terpasangkan member.
 * - `participantCount`: jumlah peserta AKTIF (REGISTERED+ATTENDED) + `maxCapacity`
 *   agar UI portal bisa menampilkan "X peserta" dan sisa kuota.
 * Kedua field dihitung dari `session.user.id` via `resolvePortalMember` — memberId
 * TIDAK pernah datang dari query/body (anti mass-assignment).
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { MSG, MSG_COMMUNITY } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { resolvePortalMember } from '@/lib/community';

export const dynamic = 'force-dynamic';

const PORTAL_EVENT_SELECT = {
    id: true,
    eventNumber: true,
    title: true,
    description: true,
    category: true,
    startsAt: true,
    endsAt: true,
    location: true,
    maxCapacity: true,
    status: true,
    publishedAt: true,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-portal-events:${ip}`, 60, 60_000);
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
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10));
        const skip = (page - 1) * limit;

        const now = new Date();
        const since30d = new Date(now.getTime() - 30 * DAY_MS);

        const where: Prisma.CommunityEventWhereInput = {
            tenantId,
            deletedAt: null,
            publishedAt: { not: null, lte: now },
            status: { not: 'CANCELLED' },
            OR: [
                { status: { in: ['PLANNED', 'ONGOING'] } },
                // DONE tampil 30 hari terakhir — window pada (endsAt ?? startsAt).
                { status: 'DONE', endsAt: { gte: since30d } },
                { status: 'DONE', endsAt: null, startsAt: { gte: since30d } },
            ],
        };

        const [rows, total] = await Promise.all([
            prisma.communityEvent.findMany({
                where,
                select: PORTAL_EVENT_SELECT,
                orderBy: { startsAt: 'asc' },
                skip,
                take: limit,
            }),
            prisma.communityEvent.count({ where }),
        ]);

        // —— Fase 3: embed status peserta milik warga login + jumlah peserta aktif ——
        const eventIds = rows.map((r) => r.id);
        const member = await resolvePortalMember(tenantId, session.user.id);

        type RowWithParticipants = (typeof rows)[number] & {
            participantStatus: string | null;
            participantCount: { active: number; maxCapacity: number | null };
        };
        let data: RowWithParticipants[] = rows.map((r) => ({
            ...r,
            participantStatus: null,
            participantCount: { active: 0, maxCapacity: r.maxCapacity },
        }));

        if (eventIds.length > 0) {
            const [ownRows, activeGroups] = await Promise.all([
                member
                    ? prisma.communityEventParticipant.findMany({
                        where: { tenantId, memberId: member.id, eventId: { in: eventIds } },
                        select: { eventId: true, status: true },
                    })
                    : Promise.resolve([]),
                prisma.communityEventParticipant.groupBy({
                    by: ['eventId'],
                    where: { tenantId, eventId: { in: eventIds }, status: { in: ['REGISTERED', 'ATTENDED'] } },
                    _count: { _all: true },
                }),
            ]);

            const ownByEvent = new Map(ownRows.map((r) => [r.eventId, r.status]));
            const activeByEvent = new Map(activeGroups.map((g) => [g.eventId, g._count._all]));

            data = rows.map((r) => ({
                ...r,
                participantStatus: ownByEvent.get(r.id) ?? null,
                participantCount: {
                    active: activeByEvent.get(r.id) ?? 0,
                    maxCapacity: r.maxCapacity,
                },
            }));
        }

        return NextResponse.json({
            success: true,
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
