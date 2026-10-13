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
import { createCommunityCashTransactionSchema, formatZodError } from '@/lib/validation-schemas';
import { periodBounds, dailyNumberPrefix, formatSeq3 } from '@/lib/community';

function isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function serializeCashTx(row: Record<string, unknown>): Record<string, unknown> {
    const { amount, ...rest } = row;
    return { ...rest, amount: Number(amount) };
}

/** Nomor kas harian collision-safe (KAS/<YYYYMMDD>-<seq3>) — max-existing + bump. */
async function nextKasNumber(tx: Prisma.TransactionClient, tenantId: string, when: Date): Promise<string> {
    const dayPrefix = dailyNumberPrefix('KAS', when);
    const last = await tx.communityCashTransaction.findFirst({
        where: { tenantId, txNumber: { startsWith: dayPrefix } },
        orderBy: { txNumber: 'desc' },
        select: { txNumber: true },
    });
    let seq = 1;
    if (last?.txNumber) {
        const parsed = parseInt(last.txNumber.slice(dayPrefix.length), 10);
        if (!Number.isNaN(parsed)) seq = parsed + 1;
    }
    return dayPrefix + formatSeq3(Math.min(seq, 999));
}

// GET /api/community/cash-transactions — list transaksi kas (community:finance).
// Query: ?period=YYYY-MM&type=INCOME|EXPENSE&status=PENDING|APPROVED|REJECTED&page=&limit=
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-cash:${ip}`, 100, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission(session, 'community:finance'))) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period');
        const type = searchParams.get('type');
        const status = searchParams.get('status');
        const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId: auth.tenantId, deletedAt: null };
        if (period && /^\d{4}-\d{2}$/.test(period)) {
            const bounds = periodBounds(period);
            where.txDate = { gte: bounds.start, lte: bounds.end };
        }
        if (type === 'INCOME' || type === 'EXPENSE') where.type = type;
        if (status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED') where.status = status;

        const [rows, total] = await Promise.all([
            prisma.communityCashTransaction.findMany({
                where,
                include: { duesType: { select: { id: true, code: true, name: true } } },
                orderBy: [{ txDate: 'desc' }, { createdAt: 'desc' }],
                skip,
                take: limit,
            }),
            prisma.communityCashTransaction.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: rows.map(serializeCashTx),
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST /api/community/cash-transactions — buat transaksi kas baru, status=PENDING (community:finance).
export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-cash-create:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission(session, 'community:finance'))) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const body = sanitizeObject(await request.json().catch(() => ({})));
        const parsed = createCommunityCashTransactionSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        const { type, category, duesTypeId, amount, description, txDate, attachmentUrl } = parsed.data;
        const txDateValue = txDate ? new Date(txDate) : new Date();
        const userId = auth.userId;

        // eventId (Fase 2) — opsi link ke kegiatan; di-parse DI LUAR Zod agar
        // schema Fase 1 tidak diubah (key tambahan diabaikan schema non-strict).
        const rawEventId: unknown = (body as Record<string, unknown>).eventId;
        const eventId = typeof rawEventId === 'string' && rawEventId.trim() ? rawEventId.trim() : null;
        if (eventId) {
            const event = await prisma.communityEvent.findFirst({
                where: { id: eventId, tenantId: auth.tenantId, deletedAt: null },
                select: { id: true },
            });
            if (!event) {
                return NextResponse.json({ error: MSG_COMMUNITY_EVENTS.EVENT_NOT_FOUND }, { status: 404 });
            }
        }

        // KAS number collision-safe: $transaction + P2002 retry loop (rollback → fetch max baru → retry).
        let lastUniqueError: unknown = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const created = await prisma.$transaction(async (tx) => {
                    const txNumber = await nextKasNumber(tx, auth.tenantId, txDateValue);
                    return tx.communityCashTransaction.create({
                        data: {
                            tenantId: auth.tenantId,
                            txNumber,
                            type,
                            category: category || null,
                            duesTypeId: duesTypeId || null,
                            eventId,
                            amount,
                            description,
                            txDate: txDateValue,
                            attachmentUrl: attachmentUrl || null,
                            status: 'PENDING',
                            createdBy: userId,
                        },
                    });
                });

                void logAudit({
                    tenantId: auth.tenantId,
                    userId,
                    action: 'CREATE',
                    entity: 'CommunityCashTransaction',
                    entityId: created.id,
                    newValues: toAuditPayload({ txNumber: created.txNumber, type, amount: Number(amount), description, eventId }),
                });

                return NextResponse.json({ success: true, data: serializeCashTx(created), message: 'Cash transaction recorded (pending approval)' }, { status: 201 });
            } catch (error) {
                if (isUniqueViolation(error)) {
                    lastUniqueError = error;
                    continue; // nomor bentrok → refetch max → retry
                }
                throw error;
            }
        }
        return handleApiError(lastUniqueError);
    } catch (error) {
        return handleApiError(error);
    }
}
