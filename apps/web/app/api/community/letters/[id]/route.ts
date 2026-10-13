export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { MSG, MSG_COMMUNITY, MSG_COMMUNITY_LETTERS } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { logAudit, toAuditPayload, diffValues } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { updateCommunityLetterSchema, formatZodError } from '@/lib/validation-schemas';
import { LETTER_DETAIL_SELECT, LETTER_LIST_SELECT, serializeLetter } from '@/lib/community-letter';

/** Select minimal untuk cek status & audit oldValues. */
const LETTER_STATE_SELECT = {
    id: true,
    letterNumber: true,
    letterType: true,
    memberId: true,
    purpose: true,
    destination: true,
    notes: true,
    status: true,
} as const;

/**
 * GET    /api/community/letters/[id] — detail surat (community:manage).
 * PUT    /api/community/letters/[id] — update parsial, HANYA DRAFT (§5.1#4).
 * DELETE /api/community/letters/[id] — soft delete, HANYA DRAFT (§5.1#5).
 *
 * Response detail memakai serializeLetter(): flag hasSnapshot/hasNik/nikStored
 * menggantikan bodySnapshot & nikEncrypted — NIK plain tidak pernah ke JSON.
 * Selain DRAFT → 400 LETTER_NOT_DRAFT (surat terbit bersifat immutable).
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-letters-detail:${ip}`, 100, 60_000);
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

        const row = await prisma.communityLetter.findFirst({
            where: { id: params.id, tenantId: auth.tenantId, deletedAt: null },
            select: LETTER_DETAIL_SELECT,
        });
        if (!row) {
            return NextResponse.json({ error: MSG_COMMUNITY_LETTERS.LETTER_NOT_FOUND }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: serializeLetter(row) });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-letters-update:${ip}`, 30, 60_000);
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
        const parsed = updateCommunityLetterSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        const { tenantId, userId } = auth;

        const existing = await prisma.communityLetter.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            select: LETTER_STATE_SELECT,
        });
        if (!existing) {
            return NextResponse.json({ error: MSG_COMMUNITY_LETTERS.LETTER_NOT_FOUND }, { status: 404 });
        }
        if (existing.status !== 'DRAFT') {
            return NextResponse.json({ error: MSG_COMMUNITY_LETTERS.LETTER_NOT_DRAFT }, { status: 400 });
        }

        if (parsed.data.memberId) {
            const member = await prisma.communityMember.findFirst({
                where: { id: parsed.data.memberId, tenantId, deletedAt: null },
                select: { id: true },
            });
            if (!member) {
                return NextResponse.json({ error: MSG_COMMUNITY.MEMBER_NOT_FOUND }, { status: 404 });
            }
        }

        const updated = await prisma.communityLetter.update({
            where: { id: existing.id },
            data: { ...parsed.data },
            select: LETTER_LIST_SELECT,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'CommunityLetter',
            entityId: existing.id,
            oldValues: toAuditPayload(existing),
            newValues: diffValues(existing, updated),
            request,
        });

        return NextResponse.json({ success: true, data: serializeLetter(updated) });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-letters-delete:${ip}`, 20, 60_000);
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

        const existing = await prisma.communityLetter.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            select: LETTER_STATE_SELECT,
        });
        if (!existing) {
            return NextResponse.json({ error: MSG_COMMUNITY_LETTERS.LETTER_NOT_FOUND }, { status: 404 });
        }
        if (existing.status !== 'DRAFT') {
            return NextResponse.json({ error: MSG_COMMUNITY_LETTERS.LETTER_NOT_DRAFT }, { status: 400 });
        }

        await prisma.communityLetter.update({
            where: { id: existing.id },
            data: { deletedAt: new Date(), deletedBy: userId },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'CommunityLetter',
            entityId: existing.id,
            oldValues: toAuditPayload(existing),
            request,
        });

        return NextResponse.json({ success: true, data: { id: existing.id, deleted: true } });
    } catch (error) {
        return handleApiError(error);
    }
}
