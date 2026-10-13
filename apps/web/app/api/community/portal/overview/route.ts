/**
 * GET /api/community/portal/overview — beranda portal warga (read-only).
 *
 * Response (spec §3 baris 29):
 * {
 *   member: { code, fullName } | null,
 *   billsThisPeriod: { total, paid, partial, unpaid, amountDue, amountPaid },  // tagihan MILIK sendiri, periode berjalan
 *   cashThisMonth: { income, expense, balance },                              // kas RT (buku kas bersama) bulan berjalan
 *   latestAnnouncements: [{ id, title, category, priority, publishedAt }]      // pengumuman aktif terbaru
 * }
 *
 * Bila session user belum terpasang dengan data warga → `member: null` + angka
 * nol + empty-state di UI ("Data warga Anda belum terdaftar — hubungi bendahara",
 * spec §5 catatan resolusi Warga→User).
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
import { currentPeriod, periodBounds, resolvePortalMember, portalAnnouncementWhere } from '@/lib/community';

export const dynamic = 'force-dynamic';

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));

const ANNOUNCEMENT_SELECT = {
    id: true,
    title: true,
    category: true,
    priority: true,
    publishedAt: true,
} as const;

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-portal-overview:${ip}`, 60, 60_000);
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
        const period = currentPeriod();
        const { start, end } = periodBounds(period);
        const member = await resolvePortalMember(tenantId, session.user.id);

        const billsAgg = member
            ? await prisma.communityDuesBill.aggregate({
                where: {
                    tenantId,
                    memberId: member.id,
                    period,
                    deletedAt: null,
                    status: { not: 'VOID' },
                },
                _count: { _all: true },
                _sum: { amountDue: true, amountPaid: true },
            })
            : null;

        const billStatusGroups = member
            ? await prisma.communityDuesBill.groupBy({
                by: ['status'],
                where: {
                    tenantId,
                    memberId: member.id,
                    period,
                    deletedAt: null,
                    status: { not: 'VOID' },
                },
                _count: { _all: true },
            })
            : [];

        // Kas RT = buku kas bersama; hanya transaksi APPROVED yang dihitung.
        const [cashGroups, latestAnnouncements] = await Promise.all([
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
            prisma.communityAnnouncement.findMany({
                where: { tenantId, deletedAt: null, ...portalAnnouncementWhere() },
                select: ANNOUNCEMENT_SELECT,
                orderBy: { publishedAt: 'desc' },
                take: 5,
            }),
        ]);

        const countByStatus = (status: string): number =>
            billStatusGroups.find((g) => g.status === status)?._count._all ?? 0;

        return NextResponse.json({
            success: true,
            data: {
                member: member ? { code: member.code, fullName: member.fullName } : null,
                billsThisPeriod: {
                    total: billsAgg?._count._all ?? 0,
                    paid: countByStatus('PAID'),
                    partial: countByStatus('PARTIAL'),
                    unpaid: countByStatus('UNPAID'),
                    amountDue: num(billsAgg?._sum.amountDue),
                    amountPaid: num(billsAgg?._sum.amountPaid),
                },
                cashThisMonth: {
                    income: num(cashGroups.find((g) => g.type === 'INCOME')?._sum.amount),
                    expense: num(cashGroups.find((g) => g.type === 'EXPENSE')?._sum.amount),
                    balance:
                        num(cashGroups.find((g) => g.type === 'INCOME')?._sum.amount) -
                        num(cashGroups.find((g) => g.type === 'EXPENSE')?._sum.amount),
                },
                latestAnnouncements,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
