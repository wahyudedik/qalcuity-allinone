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
import { logAudit, toAuditPayload } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { createCommunityAnnouncementSchema, formatZodError } from '@/lib/validation-schemas';

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

const CATEGORY_VALUES = ['GENERAL', 'MEETING', 'PAYMENT', 'EVENT', 'EMERGENCY'] as const;
const PRIORITY_VALUES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;

/**
 * GET  /api/community/announcements — daftar pengumuman (community:manage).
 * POST /api/community/announcements — buat pengumuman baru.
 *
 * In-route hasPermission('community:manage') WAJIB — fallback role-hierarchy di
 * requirePermissionForRoute melewatkan system ADMIN tanpa permission community.
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-announcements:${ip}`, 100, 60_000);
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

        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const priority = searchParams.get('priority');
        const active = searchParams.get('active');
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

        const where: Record<string, unknown> = { tenantId: auth.tenantId };
        if (category && (CATEGORY_VALUES as readonly string[]).includes(category)) where.category = category;
        if (priority && (PRIORITY_VALUES as readonly string[]).includes(priority)) where.priority = priority;
        if (active === 'true') where.isActive = true;
        else if (active === 'false') where.isActive = false;

        const [rows, total] = await Promise.all([
            prisma.communityAnnouncement.findMany({
                where,
                select: ANNOUNCEMENT_SELECT,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
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
            totalPages: Math.max(1, Math.ceil(total / limit)),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-announcements-create:${ip}`, 30, 60_000);
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
        const parsed = createCommunityAnnouncementSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        const { tenantId, userId } = auth;

        const created = await prisma.communityAnnouncement.create({
            data: {
                ...parsed.data,
                tenantId,
                createdBy: userId,
            },
            select: ANNOUNCEMENT_SELECT,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'CommunityAnnouncement',
            entityId: created.id,
            newValues: toAuditPayload(parsed.data),
            request,
        });

        return NextResponse.json({ success: true, data: created }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
