/**
 * GET /api/community/portal/letters — surat MILIK warga login (read-only, spec §3.8).
 * Query: ?status=&page=&limit= (default 10, max 50).
 *
 * Resolusi warga: CommunityMember.userId → fallback email/phone (lib/community).
 * Bila tidak terdaftar → 404 PORTAL_MEMBER_NOT_FOUND (UI tampilkan empty state).
 * Hanya surat milik sendiri (memberId dari resolusi) — `verifyUrl` ikut tampil
 * (tautan verifikasi publik) TANPA preview PDF. NIK & bodySnapshot TIDAK PERNAH
 * muncul di response portal (dibuang oleh serializeLetter).
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { MSG, MSG_COMMUNITY } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { resolvePortalMember } from '@/lib/community';
import { LETTER_LIST_SELECT, LETTER_STATUSES, serializeLetter } from '@/lib/community-letter';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-portal-letters:${ip}`, 60, 60_000);
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
        const status = searchParams.get('status');
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10));
        const skip = (page - 1) * limit;

        const member = await resolvePortalMember(tenantId, session.user.id);
        if (!member) {
            return NextResponse.json({ error: MSG_COMMUNITY.PORTAL_MEMBER_NOT_FOUND }, { status: 404 });
        }

        // Own-only: memberId dari hasil resolusi — user tidak bisa membaca surat warga lain.
        const where = {
            tenantId,
            memberId: member.id,
            deletedAt: null,
            ...(status && (LETTER_STATUSES as readonly string[]).includes(status) ? { status } : {}),
        };

        const [rows, total] = await Promise.all([
            prisma.communityLetter.findMany({
                where,
                select: LETTER_LIST_SELECT,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.communityLetter.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: rows.map((row) => serializeLetter(row)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
