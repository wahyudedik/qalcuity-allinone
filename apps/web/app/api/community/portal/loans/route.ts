export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { MSG, MSG_COMMUNITY } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { PORTAL_LOAN_SELECT, resolvePortalMember, serializePortalLoan } from '@/lib/community';

/**
 * GET /api/community/portal/loans — "Pinjaman Saya" untuk warga (read-only,
 * community:portal). Projection STRICT 8 field (plans §3.5):
 * `{ assetCode, assetName, loanDate, dueDate, returnedAt, isOverdue,
 *    conditionAtLoan, conditionAtReturn }` — TANPA notes/returnNotes/createdBy/
 * returnedBy (identitas pengurus = internal) dan TANPA angka finansial apa pun
 * (kebijakan transparansi Fase 4A + ratifikasi Session 76).
 *
 * `resolvePortalMember` null → `{ data: [], member: null }` (empty state UI:
 * akun belum terhubung dengan data warga). Tanpa pagination (pola portal assets
 * — pinjaman per warga puluhan maks).
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-portal-loans:${ip}`, 60, 60_000);
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

        const { tenantId, userId } = auth;
        const member = await resolvePortalMember(tenantId, userId);
        if (!member) {
            return NextResponse.json({ success: true, data: [], member: null, total: 0 });
        }

        const rows = await prisma.communityAssetLoan.findMany({
            where: { tenantId, memberId: member.id },
            select: PORTAL_LOAN_SELECT,
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            success: true,
            data: rows.map((row) => serializePortalLoan(row)),
            member,
            total: rows.length,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
