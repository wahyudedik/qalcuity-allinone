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
import { logAudit, toAuditPayload } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { revokeCommunityLetterSchema, formatZodError } from '@/lib/validation-schemas';
import { LETTER_DETAIL_SELECT, serializeLetter } from '@/lib/community-letter';

/**
 * POST /api/community/letters/[id]/revoke — ISSUED → REVOKED (community:approve).
 *
 * Surat batal tidak layak dicetak ulang (route PDF menolak REVOKED).
 * Alasan wajib (3–500 karakter) — diarsipkan di `revokeReason`.
 * Hanya ISSUED yang bisa di-revoke: DRAFT belum terbit (tidak ada yang
 * dibatalkan), REVOKED tidak bisa di-revoke lagi → 400 LETTER_INVALID_TRANSITION.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-letters-revoke:${ip}`, 20, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission(session, 'community:approve'))) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const { tenantId, userId } = auth;

        const body = sanitizeObject(await request.json().catch(() => ({})));
        const parsed = revokeCommunityLetterSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        const existing = await prisma.communityLetter.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            select: LETTER_DETAIL_SELECT,
        });
        if (!existing) {
            return NextResponse.json({ error: MSG_COMMUNITY_LETTERS.LETTER_NOT_FOUND }, { status: 404 });
        }
        if (existing.status !== 'ISSUED') {
            return NextResponse.json(
                { error: MSG_COMMUNITY_LETTERS.LETTER_INVALID_TRANSITION },
                { status: 400 }
            );
        }

        const revokedAt = new Date();
        const updated = await prisma.communityLetter.update({
            where: { id: existing.id },
            data: {
                status: 'REVOKED',
                revokedAt,
                revokedBy: userId,
                revokeReason: parsed.data.reason,
            },
            select: LETTER_DETAIL_SELECT,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'CommunityLetter',
            entityId: existing.id,
            oldValues: toAuditPayload({ status: 'ISSUED' }),
            newValues: toAuditPayload({
                status: 'REVOKED',
                revokedAt,
                revokedBy: userId,
                revokeReason: parsed.data.reason,
            }),
            request,
        });

        return NextResponse.json({
            success: true,
            message: MSG_COMMUNITY_LETTERS.LETTER_REVOKED,
            data: serializeLetter(updated),
        });
    } catch (error) {
        return handleApiError(error);
    }
}
