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
import { updateCommunityDuesTypeSchema, formatZodError } from '@/lib/validation-schemas';

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
 * In-route hasPermission('community:manage') WAJIB — fallback role-hierarchy di
 * requirePermissionForRoute melewatkan system ADMIN tanpa permission community.
 */
async function requireManage() {
    const session = await getServerSession(authOptions);
    if (!session || !(await hasPermission(session, 'community:manage'))) return null;
    return session;
}

/**
 * GET    /api/community/dues-types/[id] — detail jenis iuran.
 * PUT    /api/community/dues-types/[id] — update jenis iuran.
 * DELETE /api/community/dues-types/[id] — nonaktifkan (bukan hard delete).
 *
 * DELETE: jenis iuran yang sudah punya tagihan TIDAK boleh dihapus → 409.
 * Jika belum ada tagihan, DELETE tetap melakukan soft-deactivate (isActive=false)
 * sesuai prinsip "deactivate instead of deleting".
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-dues-types-detail:${ip}`, 100, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const session = await requireManage();
        if (!session) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const row = await prisma.communityDuesType.findFirst({
            where: { id: params.id, tenantId: session.user.tenantId },
            select: DUES_TYPE_SELECT,
        });
        if (!row) {
            return NextResponse.json({ error: MSG_COMMUNITY.DUES_TYPE_NOT_FOUND }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: serializeDuesType(row) });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-dues-types-update:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const session = await requireManage();
        if (!session) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }
        const tenantId = session.user.tenantId;
        const userId = session.user.id;

        const existing = await prisma.communityDuesType.findFirst({
            where: { id: params.id, tenantId },
            select: { id: true, code: true },
        });
        if (!existing) {
            return NextResponse.json({ error: MSG_COMMUNITY.DUES_TYPE_NOT_FOUND }, { status: 404 });
        }

        const body = sanitizeObject(await request.json().catch(() => ({})));
        const parsed = updateCommunityDuesTypeSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        // Cek unik code jika code berubah
        if (parsed.data.code && parsed.data.code !== existing.code) {
            const dup = await prisma.communityDuesType.findFirst({
                where: { tenantId, code: parsed.data.code, NOT: { id: params.id } },
                select: { id: true },
            });
            if (dup) {
                return NextResponse.json({ error: MSG_COMMUNITY.DUES_TYPE_CODE_EXISTS }, { status: 409 });
            }
        }

        const updated = await prisma.communityDuesType.update({
            where: { id: params.id },
            data: { ...parsed.data },
            select: DUES_TYPE_SELECT,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'CommunityDuesType',
            entityId: params.id,
            oldValues: { code: existing.code },
            newValues: toAuditPayload({ ...parsed.data, amount: parsed.data.amount !== undefined ? Number(parsed.data.amount) : undefined }),
            request,
        });

        return NextResponse.json({ success: true, data: serializeDuesType(updated) });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-dues-types-delete:${ip}`, 20, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const session = await requireManage();
        if (!session) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }
        const tenantId = session.user.tenantId;
        const userId = session.user.id;

        const existing = await prisma.communityDuesType.findFirst({
            where: { id: params.id, tenantId },
            select: { id: true, code: true, isActive: true },
        });
        if (!existing) {
            return NextResponse.json({ error: MSG_COMMUNITY.DUES_TYPE_NOT_FOUND }, { status: 404 });
        }

        // Jika sudah ada tagihan tergenerate → tolak, sarankan deactivate
        const billCount = await prisma.communityDuesBill.count({
            where: { tenantId, duesTypeId: params.id },
        });
        if (billCount > 0) {
            return NextResponse.json({ error: MSG_COMMUNITY.DUES_TYPE_HAS_BILLS }, { status: 409 });
        }

        // Soft-deactivate (bukan hard delete) — data aman untuk audit
        await prisma.communityDuesType.update({
            where: { id: params.id },
            data: { isActive: false },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'CommunityDuesType',
            entityId: params.id,
            oldValues: { code: existing.code, isActive: existing.isActive },
            newValues: { isActive: false },
            request,
        });

        return NextResponse.json({ success: true, message: 'Dues type deactivated' });
    } catch (error) {
        return handleApiError(error);
    }
}
