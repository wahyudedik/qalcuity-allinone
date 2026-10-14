export const dynamic = 'force-dynamic';

/**
 * GET /api/community/portal/events/[id]/participants/count — badge kuota untuk portal.
 * Referensi: plans/community-phase3-implementation.md §4.4 (opsional).
 * 200 { registered, attended, cancelled, maxCapacity, remaining }.
 * `remaining = null` bila maxCapacity null (tanpa batas).
 * Event tidak tayang di portal (draft/CANCELLED/dihapus) → 404 EVENT_NOT_FOUND.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { MSG, MSG_COMMUNITY, MSG_COMMUNITY_EVENTS } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-portal-participant-count:${ip}`, 60, 60_000);
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
        const now = new Date();
        const event = await prisma.communityEvent.findFirst({
            where: {
                id: params.id,
                tenantId,
                deletedAt: null,
                publishedAt: { not: null, lte: now },
                status: { not: 'CANCELLED' },
            },
            select: { id: true, maxCapacity: true },
        });
        if (!event) {
            return NextResponse.json({ error: MSG_COMMUNITY_EVENTS.EVENT_NOT_FOUND }, { status: 404 });
        }

        const grouped = await prisma.communityEventParticipant.groupBy({
            by: ['status'],
            where: { tenantId, eventId: event.id },
            _count: { _all: true },
        });
        const countOf = (status: string): number =>
            grouped.find((g) => g.status === status)?._count._all ?? 0;

        const registered = countOf('REGISTERED');
        const attended = countOf('ATTENDED');
        const cancelled = countOf('CANCELLED');
        const active = registered + attended;

        return NextResponse.json({
            success: true,
            data: {
                registered,
                attended,
                cancelled,
                maxCapacity: event.maxCapacity,
                remaining: event.maxCapacity == null ? null : Math.max(0, event.maxCapacity - active),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
