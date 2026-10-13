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
import { createCommunityDuesTypeSchema, formatZodError } from '@/lib/validation-schemas';

/** Select kolom dues type (tidak ada data sensitif). */
const DUES_TYPE_SELECT = {
    id: true,
    code: true,
    name: true,
    description: true,
    amount: true,
    frequency: true,
    isActive: true,
    startDate: true,
    endDate: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
} as const;

/** Decimal → number untuk response JSON. */
function serializeDuesType(row: Record<string, unknown>): Record<string, unknown> {
    return {
        ...row,
        amount: row.amount !== null && row.amount !== undefined ? Number(row.amount) : 0,
    };
}

/**
 * GET  /api/community/dues-types — daftar jenis iuran (community:manage).
 * POST /api/community/dues-types — buat jenis iuran baru.
 *
 * In-route hasPermission('community:manage') WAJIB — fallback role-hierarchy di
 * requirePermissionForRoute melewatkan system ADMIN tanpa permission community.
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-dues-types:${ip}`, 100, 60_000);
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
        const includeInactive = searchParams.get('includeInactive') === 'true';

        const where: Record<string, unknown> = { tenantId: auth.tenantId };
        if (!includeInactive) where.isActive = true;

        const rows = await prisma.communityDuesType.findMany({
            where,
            select: DUES_TYPE_SELECT,
            orderBy: { code: 'asc' },
        });

        return NextResponse.json({ success: true, data: rows.map(serializeDuesType) });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-dues-types-create:${ip}`, 30, 60_000);
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
        const parsed = createCommunityDuesTypeSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        const { tenantId, userId } = auth;

        const existing = await prisma.communityDuesType.findFirst({
            where: { tenantId, code: parsed.data.code },
            select: { id: true },
        });
        if (existing) {
            return NextResponse.json({ error: MSG_COMMUNITY.DUES_TYPE_CODE_EXISTS }, { status: 409 });
        }

        const created = await prisma.communityDuesType.create({
            data: {
                ...parsed.data,
                tenantId,
                createdBy: userId,
            },
            select: DUES_TYPE_SELECT,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'CommunityDuesType',
            entityId: created.id,
            newValues: toAuditPayload({ ...parsed.data, amount: Number(parsed.data.amount) }),
            request,
        });

        return NextResponse.json({ success: true, data: serializeDuesType(created) }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
