/**
 * GET /api/community/portal/cash — ringkasan kas RT bulan berjalan (read-only).
 * Query: ?period=YYYY-MM (default periode berjalan) — spec §3 baris 31.
 *
 * Kas RT adalah buku kas bersama seluruh warga (bukan per-member); hanya
 * transaksi APPROVED + tidak di-soft-delete yang dihitung (cash-so-figures rule).
 * Menyertakan 5 transaksi terbaru sebagai konteks riwayat (additive, aman —
 * data kas memang terbuka untuk warga via portal).
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { MSG } from '@/lib/api-messages';
import { MSG_COMMUNITY } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { currentPeriod, periodBounds, resolvePortalMember } from '@/lib/community';

export const dynamic = 'force-dynamic';

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-portal-cash:${ip}`, 60, 60_000);
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
        const period = searchParams.get('period') || currentPeriod();
        if (!PERIOD_RE.test(period)) {
            return NextResponse.json({ error: MSG_COMMUNITY.REPORT_PERIOD_INVALID }, { status: 400 });
        }

        const member = await resolvePortalMember(tenantId, session.user.id);
        if (!member) {
            return NextResponse.json({ error: MSG_COMMUNITY.PORTAL_MEMBER_NOT_FOUND }, { status: 404 });
        }

        const { start, end } = periodBounds(period);
        const approvedWhere = {
            tenantId,
            status: 'APPROVED' as const,
            deletedAt: null,
            txDate: { gte: start, lte: end },
        };

        const [groups, recent] = await Promise.all([
            prisma.communityCashTransaction.groupBy({
                by: ['type'],
                where: approvedWhere,
                _sum: { amount: true },
            }),
            prisma.communityCashTransaction.findMany({
                where: approvedWhere,
                select: {
                    id: true,
                    txNumber: true,
                    type: true,
                    category: true,
                    amount: true,
                    description: true,
                    txDate: true,
                },
                orderBy: { txDate: 'desc' },
                take: 5,
            }),
        ]);

        const income = num(groups.find((g) => g.type === 'INCOME')?._sum.amount);
        const expense = num(groups.find((g) => g.type === 'EXPENSE')?._sum.amount);

        return NextResponse.json({
            success: true,
            data: {
                period,
                income,
                expense,
                balance: income - expense,
                recent: recent.map((tx) => ({ ...tx, amount: num(tx.amount) })),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
