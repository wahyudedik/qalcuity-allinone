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
import { encrypt } from '@/lib/encryption';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import {
    COMMUNITY_MEMBER_SELECT,
    serializeCommunityMember,
} from '@/lib/community';
import { updateCommunityMemberSchema, formatZodError } from '@/lib/validation-schemas';

/**
 * GET    /api/community/members/[id] — detail warga (nikStored flag saja).
 * PUT    /api/community/members/[id] — update; NIK/NKK re-encrypt HANYA bila berubah.
 * DELETE /api/community/members/[id] — soft-delete; ditolak bila masih ada tagihan terbuka.
 *
 * Semua handler melakukan in-route hasPermission('community:manage') — fallback
 * role-hierarchy di requirePermissionForRoute melewatkan system ADMIN (spec §3.2).
 */
async function requireManage() {
    const session = await getServerSession(authOptions);
    if (!session || !(await hasPermission(session, 'community:manage'))) {
        return null;
    }
    return session;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-members-detail:${ip}`, 100, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await requireManage();
        if (!session) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const row = await prisma.communityMember.findFirst({
            where: { id: params.id, tenantId: auth.tenantId, deletedAt: null },
            select: COMMUNITY_MEMBER_SELECT,
        });
        if (!row) {
            return NextResponse.json({ error: MSG_COMMUNITY.MEMBER_NOT_FOUND }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: serializeCommunityMember(row) });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-members-update:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await requireManage();
        if (!session) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const existing = await prisma.communityMember.findFirst({
            where: { id: params.id, tenantId: auth.tenantId, deletedAt: null },
            select: { id: true, code: true, nikEncrypted: true, nomorKkEncrypted: true },
        });
        if (!existing) {
            return NextResponse.json({ error: MSG_COMMUNITY.MEMBER_NOT_FOUND }, { status: 404 });
        }

        const body = sanitizeObject(await request.json().catch(() => ({})));
        const parsed = updateCommunityMemberSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        const { tenantId, userId } = auth;
        const { nik, nomorKk, ...rest } = parsed.data;

        // Code uniqueness bila berubah.
        if (rest.code && rest.code !== existing.code) {
            const dup = await prisma.communityMember.findFirst({
                where: { tenantId, code: rest.code, deletedAt: null, NOT: { id: params.id } },
                select: { id: true },
            });
            if (dup) {
                return NextResponse.json({ error: MSG_COMMUNITY.MEMBER_CODE_EXISTS }, { status: 409 });
            }
        }

        // Re-encrypt HANYA bila nilai baru diberikan (undefined = tidak diubah).
        const updateData: Record<string, unknown> = { ...rest };
        if (typeof nik === 'string') {
            if (!nik) {
                updateData.nikEncrypted = null;
            } else {
                try {
                    updateData.nikEncrypted = encrypt(nik);
                } catch {
                    return NextResponse.json({ error: MSG_COMMUNITY.NIK_ENCRYPT_FAILED }, { status: 500 });
                }
            }
        }
        if (typeof nomorKk === 'string') {
            if (!nomorKk) {
                updateData.nomorKkEncrypted = null;
            } else {
                try {
                    updateData.nomorKkEncrypted = encrypt(nomorKk);
                } catch {
                    return NextResponse.json({ error: MSG_COMMUNITY.NIK_ENCRYPT_FAILED }, { status: 500 });
                }
            }
        }

        const updated = await prisma.communityMember.update({
            where: { id: params.id },
            data: updateData,
            select: COMMUNITY_MEMBER_SELECT,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'CommunityMember',
            entityId: params.id,
            oldValues: { code: existing.code },
            newValues: {
                ...toAuditPayload(rest),
                nikChanged: typeof nik === 'string' && !!nik,
                nomorKkChanged: typeof nomorKk === 'string' && !!nomorKk,
            },
            request,
        });

        return NextResponse.json({ success: true, data: serializeCommunityMember(updated) });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-members-delete:${ip}`, 20, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await requireManage();
        if (!session) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const { tenantId, userId } = auth;
        const existing = await prisma.communityMember.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            select: { id: true, code: true, fullName: true },
        });
        if (!existing) {
            return NextResponse.json({ error: MSG_COMMUNITY.MEMBER_NOT_FOUND }, { status: 404 });
        }

        // Tolak soft-delete bila masih ada tagihan terbuka (UNPAID/PARTIAL).
        const openBills = await prisma.communityDuesBill.count({
            where: {
                tenantId,
                memberId: params.id,
                status: { in: ['UNPAID', 'PARTIAL'] },
            },
        });
        if (openBills > 0) {
            return NextResponse.json({ error: MSG_COMMUNITY.MEMBER_HAS_OPEN_BILLS }, { status: 409 });
        }

        await prisma.communityMember.update({
            where: { id: params.id },
            data: { deletedAt: new Date(), deletedBy: userId, status: 'INACTIVE' },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'CommunityMember',
            entityId: params.id,
            oldValues: toAuditPayload(existing),
            request,
        });

        return NextResponse.json({ success: true, message: 'Member deleted' });
    } catch (error) {
        return handleApiError(error);
    }
}
