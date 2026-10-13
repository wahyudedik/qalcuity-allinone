export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { MSG, MSG_COMMUNITY } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { logAudit, toAuditPayload, diffValues } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { updateCommunityAnnouncementSchema, formatZodError } from '@/lib/validation-schemas';

/** Select kolom pengumuman (tidak ada data sensitif). */
const ANNOUNCEMENT_SELECT = {
    id: true,
    title: true,
    content: true,
    category: true,
    priority: true,
    publishedAt: true,
    expiresAt: true,
    isActive: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
} as const;

/**
 * GET    /api/community/announcements/[id] — detail pengumuman (community:manage).
 * PUT    /api/community/announcements/[id] — update parsial.
 * DELETE /api/community/announcements/[id] — soft delete.
 *
 * In-route hasPermission('community:manage') WAJIB — fallback role-hierarchy di
 * requirePermissionForRoute melewatkan system ADMIN tanpa permission community.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-announcement-detail:${ip}`, 100, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission(session, 'community:manage'))) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const row = await prisma.communityAnnouncement.findFirst({
            where: { id: params.id, tenantId: auth.tenantId, deletedAt: null },
            select: ANNOUNCEMENT_SELECT,
        });
        if (!row) {
            return NextResponse.json({ error: MSG_COMMUNITY.ANNOUNCEMENT_NOT_FOUND }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: row });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-announcements-update:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission(session, 'community:manage'))) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const body = sanitizeObject(await request.json().catch(() => ({})));
        const parsed = updateCommunityAnnouncementSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        const { tenantId, userId } = auth;

        const existing = await prisma.communityAnnouncement.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            select: ANNOUNCEMENT_SELECT,
        });
        if (!existing) {
            return NextResponse.json({ error: MSG_COMMUNITY.ANNOUNCEMENT_NOT_FOUND }, { status: 404 });
        }

        const updated = await prisma.communityAnnouncement.update({
            where: { id: existing.id },
            data: { ...parsed.data },
            select: ANNOUNCEMENT_SELECT,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'CommunityAnnouncement',
            entityId: existing.id,
            oldValues: toAuditPayload(existing),
            newValues: diffValues(existing, updated),
            request,
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-announcements-delete:${ip}`, 20, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission(session, 'community:manage'))) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const { tenantId, userId } = auth;

        const existing = await prisma.communityAnnouncement.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            select: { id: true, title: true },
        });
        if (!existing) {
            return NextResponse.json({ error: MSG_COMMUNITY.ANNOUNCEMENT_NOT_FOUND }, { status: 404 });
        }

        await prisma.communityAnnouncement.update({
            where: { id: existing.id },
            data: { deletedAt: new Date(), deletedBy: userId },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'CommunityAnnouncement',
            entityId: existing.id,
            oldValues: toAuditPayload({ id: existing.id, title: existing.title }),
            request,
        });

        return NextResponse.json({ success: true, data: { id: existing.id, deleted: true } });
    } catch (error) {
        return handleApiError(error);
    }
}
