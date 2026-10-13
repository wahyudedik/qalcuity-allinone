export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { MSG, MSG_COMMUNITY, MSG_COMMUNITY_LETTERS } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { formatYmd } from '@/lib/community';
import {
    LETTER_DETAIL_SELECT,
    buildLetterSnapshot,
    generateUniqueVerifyToken,
    nextLetterNumber,
    serializeLetter,
} from '@/lib/community-letter';

function isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * POST /api/community/letters/[id]/issue — DRAFT → ISSUED (community:approve).
 *
 * Satu prisma.$transaction (retry ×3 saat P2002 race nomor/token — pola Fase 1):
 * 1. Nomor surat `SRT/<PNG|DOM|SKT|KTR>/<YYYY>-<seq3>` (max+bump; tahun = tahun
 *    penerbitan dalam APP_TIMEZONE — spec §3.4).
 * 2. `verifyToken` 32-hex unik global (QR → /verify/community-letter/<token>).
 * 3. `bodySnapshot` dibekukan (immutability dokumen). NIK plain hasil safeDecrypt
 *    HANYA hidup di snapshot ini untuk render PDF — tidak pernah ke response JSON.
 * 4. `issuedAt`/`signedBy`/`signedByName` di-assign server-side.
 *
 * Self-issue DIBOLEHKAN (spec §3.5) — surat administratif, bukan gerbang uang.
 * Sudah ISSUED → 400 LETTER_ALREADY_ISSUED; REVOKED → 400 LETTER_INVALID_TRANSITION.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-letters-issue:${ip}`, 20, 60_000);
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

        const letter = await prisma.communityLetter.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            select: {
                id: true,
                letterType: true,
                memberId: true,
                purpose: true,
                destination: true,
                status: true,
            },
        });
        if (!letter) {
            return NextResponse.json({ error: MSG_COMMUNITY_LETTERS.LETTER_NOT_FOUND }, { status: 404 });
        }
        if (letter.status === 'ISSUED') {
            return NextResponse.json({ error: MSG_COMMUNITY_LETTERS.LETTER_ALREADY_ISSUED }, { status: 400 });
        }
        if (letter.status !== 'DRAFT') {
            return NextResponse.json({ error: MSG_COMMUNITY_LETTERS.LETTER_INVALID_TRANSITION }, { status: 400 });
        }

        const member = await prisma.communityMember.findFirst({
            where: { id: letter.memberId, tenantId, deletedAt: null },
            select: {
                code: true,
                fullName: true,
                nikEncrypted: true,
                address: true,
                rtRw: true,
                gender: true,
            },
        });
        if (!member) {
            return NextResponse.json({ error: MSG_COMMUNITY.MEMBER_NOT_FOUND }, { status: 404 });
        }

        const tenant = await prisma.tenant.findFirst({
            where: { id: tenantId },
            select: { name: true, address: true, settings: true },
        });
        if (!tenant) {
            // Tenant dari session selalu ada — bila tidak, kondisi ini anomali sistem.
            throw new Error('Tenant tidak ditemukan untuk penerbitan surat');
        }

        const issuedAt = new Date();
        const year = parseInt(formatYmd(issuedAt).slice(0, 4), 10);
        const signedByName = session.user.name?.trim() || session.user.email || null;

        // Retry loop: P2002 (race nomor surat / verifyToken) → tx rollback → ulang (max 3).
        let lastUniqueError: unknown = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const result = await prisma.$transaction(async (tx) => {
                    const current = await tx.communityLetter.findFirst({
                        where: { id: letter.id, tenantId, deletedAt: null },
                        select: { status: true },
                    });
                    if (!current) {
                        return { error: MSG_COMMUNITY_LETTERS.LETTER_NOT_FOUND, status: 404 };
                    }
                    if (current.status === 'ISSUED') {
                        return { error: MSG_COMMUNITY_LETTERS.LETTER_ALREADY_ISSUED, status: 400 };
                    }
                    if (current.status !== 'DRAFT') {
                        return { error: MSG_COMMUNITY_LETTERS.LETTER_INVALID_TRANSITION, status: 400 };
                    }

                    const letterNumber = await nextLetterNumber(tx, tenantId, letter.letterType, year);
                    const verifyToken = await generateUniqueVerifyToken(tx);
                    const snapshot = buildLetterSnapshot(
                        member,
                        tenant,
                        letter.letterType,
                        letter.purpose,
                        letter.destination,
                        { letterNumber, issuedAt, signedByName }
                    );

                    const updated = await tx.communityLetter.update({
                        where: { id: letter.id },
                        data: {
                            status: 'ISSUED',
                            letterNumber,
                            verifyToken,
                            bodySnapshot: snapshot as unknown as Prisma.InputJsonValue,
                            issuedAt,
                            signedBy: userId,
                            signedByName,
                        },
                        select: LETTER_DETAIL_SELECT,
                    });
                    return { data: updated };
                });

                if ('error' in result) {
                    return NextResponse.json({ error: result.error }, { status: result.status });
                }

                void logAudit({
                    userId,
                    tenantId,
                    action: 'UPDATE',
                    entity: 'CommunityLetter',
                    entityId: letter.id,
                    oldValues: toAuditPayload({ status: 'DRAFT' }),
                    newValues: toAuditPayload({
                        status: 'ISSUED',
                        letterNumber: result.data.letterNumber,
                        issuedAt,
                        signedBy: userId,
                        signedByName,
                    }),
                    request,
                });

                return NextResponse.json({ success: true, data: serializeLetter(result.data) });
            } catch (error) {
                if (isUniqueViolation(error)) {
                    lastUniqueError = error;
                    continue;
                }
                return handleApiError(error);
            }
        }

        return handleApiError(lastUniqueError);
    } catch (error) {
        return handleApiError(error);
    }
}
