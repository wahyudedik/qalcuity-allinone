/**
 * GET /api/community/portal/announcements — pengumuman aktif untuk warga (read-only).
 * Query: ?page=&limit= (default 10, max 50) — spec §3 baris 32.
 *
 * Visibility: `isActive && publishedAt <= now && (expiresAt == null || expiresAt > now)`
 * (portalAnnouncementWhere di lib/community). Data bersifat tenant-wide — tidak perlu
 * resolusi member. Kolom internal (createdBy, dsb.) tidak di-expose.
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
import { portalAnnouncementWhere } from '@/lib/community';

export const dynamic = 'force-dynamic';

const ANNOUNCEMENT_SELECT = {
    id: true,
    title: true,
    content: true,
    category: true,
    priority: true,
    publishedAt: true,
    expiresAt: true,
} as const;

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-portal-announcements:${ip}`, 60, 60_000);
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

        const where = { tenantId, deletedAt: null, ...portalAnnouncementWhere() };

        const [rows, total] = await Promise.all([
            prisma.communityAnnouncement.findMany({
                where,
                select: ANNOUNCEMENT_SELECT,
                orderBy: { publishedAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.communityAnnouncement.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
