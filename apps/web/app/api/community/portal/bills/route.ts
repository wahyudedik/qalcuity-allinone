/**
 * GET /api/community/portal/bills — tagihan iuran MILIK session user (read-only).
 * Query: ?period=YYYY-MM (opsional, filter 1 periode) & ?page=&limit= (spec §3 baris 30).
 *
 * Resolusi warga: CommunityMember.userId → fallback email/phone (lib/community).
 * Bila tidak terdaftar → 404 PORTAL_MEMBER_NOT_FOUND (UI tampilkan empty state).
 * NIK TIDAK PERNAH muncul di response portal.
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
import { resolvePortalMember } from '@/lib/community';

export const dynamic = 'force-dynamic';

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const BILL_SELECT = {
    id: true,
    billNumber: true,
    period: true,
    amountDue: true,
    amountPaid: true,
    status: true,
    dueDate: true,
    paidAt: true,
    notes: true,
    createdAt: true,
    duesType: { select: { code: true, name: true } },
} as const;

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-portal-bills:${ip}`, 60, 60_000);
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
        const period = searchParams.get('period');
        if (period && !PERIOD_RE.test(period)) {
            return NextResponse.json({ error: MSG_COMMUNITY.REPORT_PERIOD_INVALID }, { status: 400 });
        }

        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10));
        const skip = (page - 1) * limit;

        const member = await resolvePortalMember(tenantId, session.user.id);
        if (!member) {
            return NextResponse.json({ error: MSG_COMMUNITY.PORTAL_MEMBER_NOT_FOUND }, { status: 404 });
        }

        const where = {
            tenantId,
            memberId: member.id,
            deletedAt: null,
            status: { not: 'VOID' as const },
            ...(period ? { period } : {}),
        };

        const [rows, total] = await Promise.all([
            prisma.communityDuesBill.findMany({
                where,
                select: BILL_SELECT,
                orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
                skip,
                take: limit,
            }),
            prisma.communityDuesBill.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: rows.map((row) => ({
                ...row,
                amountDue: num(row.amountDue),
                amountPaid: num(row.amountPaid),
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
