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
import { logAudit, toAuditPayload } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { createCommunityEventSchema, formatZodError } from '@/lib/validation-schemas';
import { formatYmd, EVENT_LIST_SELECT, serializeCommunityEvent } from '@/lib/community';
import { nextEventNumber } from '@/lib/community-letter';

function isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * Hitungan relasi ter-filter — attach di select list/detail.
 *
 * - `transactions` = transaksi kas ter-link yang belum dihapus (proteksi delete + badge UI).
 * - `participants` = peserta aktif (`REGISTERED`/`ATTENDED`) — konsisten dengan
 *   semantik kuota di POST participants (Fase 3). Baris `CANCELLED` tidak dihitung.
 */
/** Status peserta yang mengisi kuota (aktif) — dipakai `_count` badge daftar. */
const ACTIVE_PARTICIPANT_STATUSES: string[] = ['REGISTERED', 'ATTENDED'];

// Tanpa `as const` — Prisma select butuh array mutable (StringFilter.in: string[]).
const EVENT_TX_COUNT = {
    _count: {
        select: {
            transactions: { where: { deletedAt: null } },
            participants: { where: { status: { in: ACTIVE_PARTICIPANT_STATUSES } } },
        },
    },
};

/**
 * GET /api/community/events — daftar kegiatan (community:view).
 *
 * Filter: `?status=&year=` (`year` = tahun `startsAt`) + paginasi standar.
 * Setiap baris menyertakan `_count.transactions` (proteksi delete + badge UI)
 * dan `_count.participants` = jumlah peserta aktif (Fase 3, badge daftar).
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-events:${ip}`, 100, 60_000);
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
        const status = url.searchParams.get('status');
        const yearRaw = url.searchParams.get('year');
        const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10) || 20));

        const where: Prisma.CommunityEventWhereInput = { tenantId, deletedAt: null };
        if (status) where.status = status;
        const year = parseInt(yearRaw ?? '', 10);
        if (yearRaw && Number.isFinite(year)) {
            where.startsAt = {
                gte: new Date(Date.UTC(year, 0, 1)),
                lt: new Date(Date.UTC(year + 1, 0, 1)),
            };
        }

        const [rows, total] = await Promise.all([
            prisma.communityEvent.findMany({
                where,
                select: { ...EVENT_LIST_SELECT, ...EVENT_TX_COUNT },
                orderBy: { startsAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.communityEvent.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: rows.map((row) => serializeCommunityEvent(row)),
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
 * POST /api/community/events — buat kegiatan (community:manage).
 *
 * Nomor `KGT/<YYYY>-<seq3>` di-assign saat CREATE (spec §5.1#11) — tahun =
 * tahun kegiatan (`startsAt`, APP_TIMEZONE). Max+bump di dalam transaksi +
 * retry ×3 saat P2002 unique `[tenantId, eventNumber]` (pola Fase 1).
 * `budgetAmount` Decimal — dikonversi dari number Zod (pola expenses).
 */
export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-events-create:${ip}`, 30, 60_000);
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
        const parsed = createCommunityEventSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        // create schema menjamin title & startsAt terisi (refine) — non-null di bawah.
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

        const year = parseInt(formatYmd(startsAt!).slice(0, 4), 10);

        // Retry loop: P2002 (race nomor kegiatan) → tx rollback → ulang (max 3).
        let lastUniqueError: unknown = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const result = await prisma.$transaction(async (tx) => {
                    const eventNumber = await nextEventNumber(tx, tenantId, year);
                    const created = await tx.communityEvent.create({
                        data: {
                            tenantId,
                            eventNumber,
                            title: title!,
                            description: description ?? null,
                            category: category ?? null,
                            startsAt: startsAt!,
                            endsAt: endsAt ?? null,
                            location: location ?? null,
                            maxCapacity: maxCapacity ?? null,
                            budgetAmount:
                                budgetAmount !== undefined ? new Prisma.Decimal(budgetAmount) : null,
                            announcementId: announcementId ?? null,
                            publishedAt: publishedAt ?? null,
                            status: status ?? 'PLANNED',
                            createdBy: userId,
                        },
                        select: EVENT_LIST_SELECT,
                    });
                    return { data: created };
                });

                void logAudit({
                    userId,
                    tenantId,
                    action: 'CREATE',
                    entity: 'CommunityEvent',
                    entityId: result.data.id,
                    newValues: toAuditPayload({
                        ...parsed.data,
                        eventNumber: result.data.eventNumber,
                        budgetAmount: budgetAmount !== undefined ? Number(budgetAmount) : undefined,
                    }),
                    request,
                });

                return NextResponse.json(
                    {
                        success: true,
                        message: MSG_COMMUNITY_EVENTS.EVENT_CREATED,
                        data: serializeCommunityEvent(result.data),
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

        return handleApiError(lastUniqueError);
    } catch (error) {
        return handleApiError(error);
    }
}
