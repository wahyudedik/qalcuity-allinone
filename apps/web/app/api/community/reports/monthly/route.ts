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
import { periodBounds } from '@/lib/community';

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));

/**
 * GET /api/community/reports/monthly — laporan bulanan iuran + kas (community:view).
 *
 * Query: ?period=YYYY-MM (default: bulan berjalan). Format salah → 400.
 * Response:
 * {
 *   period,
 *   dues:   { billed, collected, outstanding, collectionRate, byType[] },
 *   cash:   { openingBalance, income, expense, closingBalance, byCategory[] },
 *   topArrears: [ { member: {id, code, fullName, phone}, outstanding } ],
 * }
 *
 * Angka kas HANYA dari transaksi APPROVED (belum dihapus) — PENDING/REJECTED
 * tidak menghitung saldo. `openingBalance` = total (INCOME − EXPENSE) seluruh
 * transaksi APPROVED sebelum awal periode.
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-reports:${ip}`, 30, 60_000);
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

        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || '';
        if (!PERIOD_RE.test(period)) {
            return NextResponse.json({ error: MSG_COMMUNITY.REPORT_PERIOD_INVALID }, { status: 400 });
        }

        const { tenantId } = auth;
        const { start, end } = periodBounds(period);
        const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));

        // ── Iuran (tagihan periode berjalan; VOID tidak dihitung) ──────────────
        const billsWhere = {
            tenantId,
            period,
            deletedAt: null,
            status: { not: 'VOID' },
        } as const;

        const [duesAgg, duesByType, duesTypes] = await Promise.all([
            prisma.communityDuesBill.aggregate({
                where: billsWhere,
                _sum: { amountDue: true, amountPaid: true },
            }),
            prisma.communityDuesBill.groupBy({
                by: ['duesTypeId'],
                where: billsWhere,
                _sum: { amountDue: true, amountPaid: true },
            }),
            prisma.communityDuesType.findMany({
                where: { tenantId },
                select: { id: true, code: true, name: true },
            }),
        ]);

        const typeMap = new Map(duesTypes.map((t) => [t.id, t]));
        const billed = num(duesAgg._sum.amountDue);
        const collected = num(duesAgg._sum.amountPaid);

        const byType = duesByType
            .map((row) => {
                const dt = typeMap.get(row.duesTypeId);
                return {
                    duesTypeId: row.duesTypeId,
                    code: dt?.code ?? null,
                    name: dt?.name ?? null,
                    billed: num(row._sum.amountDue),
                    collected: num(row._sum.amountPaid),
                };
            })
            .sort((a, b) => b.billed - a.billed);

        // ── Kas (hanya APPROVED; saldo kumulatif sampai awal periode) ─────────
        const [openingByType, cashByType, cashByCategory] = await Promise.all([
            prisma.communityCashTransaction.groupBy({
                by: ['type'],
                where: {
                    tenantId,
                    status: 'APPROVED',
                    deletedAt: null,
                    txDate: { lt: start },
                },
                _sum: { amount: true },
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
            prisma.communityCashTransaction.groupBy({
                by: ['type', 'category'],
                where: {
                    tenantId,
                    status: 'APPROVED',
                    deletedAt: null,
                    txDate: { gte: start, lte: end },
                },
                _sum: { amount: true },
            }),
        ]);

        const sumByType = (rows: { type: string; _sum: { amount: unknown } }[], type: string): number =>
            num(rows.find((r) => r.type === type)?._sum.amount);

        const openingBalance = sumByType(openingByType, 'INCOME') - sumByType(openingByType, 'EXPENSE');
        const income = sumByType(cashByType, 'INCOME');
        const expense = sumByType(cashByType, 'EXPENSE');

        const byCategory = cashByCategory
            .map((row) => ({
                type: row.type,
                category: row.category,
                amount: num(row._sum.amount),
            }))
            .sort((a, b) => b.amount - a.amount);

        // ── Tunggakan terbesar (seluruh periode; UNPAID/PARTIAL) ──────────────
        const arrearsGroups = await prisma.communityDuesBill.groupBy({
            by: ['memberId'],
            where: {
                tenantId,
                deletedAt: null,
                status: { in: ['UNPAID', 'PARTIAL'] },
            },
            _sum: { amountDue: true, amountPaid: true },
        });

        const arrearsMemberIds = arrearsGroups
            .map((g) => ({
                memberId: g.memberId,
                outstanding: num(g._sum.amountDue) - num(g._sum.amountPaid),
            }))
            .filter((g) => g.outstanding > 0)
            .sort((a, b) => b.outstanding - a.outstanding)
            .slice(0, 10);

        const arrearsMembers = arrearsMemberIds.length
            ? await prisma.communityMember.findMany({
                where: { tenantId, id: { in: arrearsMemberIds.map((a) => a.memberId) }, deletedAt: null },
                select: { id: true, code: true, fullName: true, phone: true },
            })
            : [];
        const memberMap = new Map(arrearsMembers.map((m) => [m.id, m]));

        const topArrears = arrearsMemberIds
            .map((a) => ({
                member: memberMap.get(a.memberId) ?? null,
                outstanding: a.outstanding,
            }))
            .filter((a) => a.member !== null);

        return NextResponse.json({
            success: true,
            data: {
                period,
                dues: {
                    billed,
                    collected,
                    outstanding: billed - collected,
                    collectionRate: billed > 0 ? Math.round((collected / billed) * 1000) / 10 : 0,
                    byType,
                },
                cash: {
                    openingBalance,
                    income,
                    expense,
                    closingBalance: openingBalance + income - expense,
                    byCategory,
                },
                topArrears,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
