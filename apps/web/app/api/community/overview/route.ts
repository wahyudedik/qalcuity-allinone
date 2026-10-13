export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { MSG, MSG_COMMUNITY } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { currentPeriod, periodBounds } from '@/lib/community';

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));

/**
 * GET /api/community/overview — ringkasan dashboard (community:view).
 *
 * Response:
 * {
 *   memberActive, memberInactive, memberTotal,
 *   billsThisPeriod: { total, paid, partial, unpaid, amountDue, amountPaid },
 *   cashThisMonth:   { income, expense, balance },
 *   pendingApprovals,
 * }
 *
 * Angka kas HANYA dari transaksi APPROVED (belum dihapus). `pendingApprovals`
 * = jumlah transaksi kas PENDING yang menunggu keputusan KETUA.
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-overview:${ip}`, 100, 60_000);
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
        const period = currentPeriod();
        const { start, end } = periodBounds(period);

        const [memberActive, memberInactive, memberTotal, billStatusGroups, cashByType, pendingApprovals] =
            await Promise.all([
                prisma.communityMember.count({
                    where: { tenantId, status: 'ACTIVE', deletedAt: null },
                }),
                prisma.communityMember.count({
                    where: { tenantId, status: 'INACTIVE', deletedAt: null },
                }),
                prisma.communityMember.count({
                    where: { tenantId, deletedAt: null },
                }),
                prisma.communityDuesBill.groupBy({
                    by: ['status'],
                    where: {
                        tenantId,
                        period,
                        deletedAt: null,
                        status: { not: 'VOID' },
                    },
                    _count: { _all: true },
                    _sum: { amountDue: true, amountPaid: true },
                }),
                prisma.communityCashTransaction.groupBy({
                    by: ['type'],
                    where: {
                        tenantId,
                        status: 'APPROVED',
                        deletedAt: null,
                        txDate: { gte: start, lte: end },
                    },
                    _sum: { amount: true },
                }),
                prisma.communityCashTransaction.count({
                    where: { tenantId, status: 'PENDING', deletedAt: null },
                }),
            ]);

        const countByStatus = (status: string): number =>
            num(billStatusGroups.find((g) => g.status === status)?._count?._all);
        const sumDue = billStatusGroups.reduce((acc, g) => acc + num(g._sum.amountDue), 0);
        const sumPaid = billStatusGroups.reduce((acc, g) => acc + num(g._sum.amountPaid), 0);

        const income = num(cashByType.find((g) => g.type === 'INCOME')?._sum.amount);
        const expense = num(cashByType.find((g) => g.type === 'EXPENSE')?._sum.amount);

        return NextResponse.json({
            success: true,
            data: {
                memberActive,
                memberInactive,
                memberTotal,
                billsThisPeriod: {
                    total: billStatusGroups.reduce((acc, g) => acc + num(g._count?._all), 0),
                    paid: countByStatus('PAID'),
                    partial: countByStatus('PARTIAL'),
                    unpaid: countByStatus('UNPAID'),
                    amountDue: sumDue,
                    amountPaid: sumPaid,
                },
                cashThisMonth: {
                    income,
                    expense,
                    balance: income - expense,
                },
                pendingApprovals,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
