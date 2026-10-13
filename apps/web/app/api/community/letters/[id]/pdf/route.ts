export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { MSG, MSG_COMMUNITY, MSG_COMMUNITY_LETTERS } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { LETTER_DETAIL_SELECT } from '@/lib/community-letter';
import { renderCommunityLetterPdf } from '@/lib/community-letter-pdf';

/**
 * GET /api/community/letters/[id]/pdf — unduh/preview PDF surat (community:manage).
 *
 * - DRAFT: legal diunduh (preview sekretaris) dengan watermark
 *   "DRAF — BUKAN DOKUMEN RESMI" (spec §3.8#4) — filename `DRAF-<id>.pdf`.
 * - REVOKED: DITOLAK 400 LETTER_REVOKED_NO_PDF — surat batal tidak layak
 *   dicetak ulang.
 * - NIK plain hanya hidup di memori render (safeDecrypt) — tidak ikut response.
 *
 * `runtime = 'nodejs'` WAJIB (jsPDF + qrcode) — jangan pindah ke edge.
 * Response `application/pdf` + `Content-Disposition: inline; filename="<nomor>.pdf"`.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-letters-pdf:${ip}`, 30, 60_000);
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

        const { tenantId } = auth;

        const letter = await prisma.communityLetter.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            select: LETTER_DETAIL_SELECT,
        });
        if (!letter) {
            return NextResponse.json({ error: MSG_COMMUNITY_LETTERS.LETTER_NOT_FOUND }, { status: 404 });
        }
        if (letter.status === 'REVOKED') {
            return NextResponse.json(
                { error: MSG_COMMUNITY_LETTERS.LETTER_REVOKED_NO_PDF },
                { status: 400 }
            );
        }

        const member = letter.member;
        if (!member) {
            return NextResponse.json({ error: MSG_COMMUNITY.MEMBER_NOT_FOUND }, { status: 404 });
        }

        const tenant = await prisma.tenant.findFirst({
            where: { id: tenantId },
            select: { name: true, address: true, settings: true },
        });
        if (!tenant) {
            // Tenant dari session selalu ada — bila tidak, kondisi ini anomali sistem.
            throw new Error('Tenant tidak ditemukan untuk render surat');
        }

        const pdfBytes = await renderCommunityLetterPdf(
            {
                letterNumber: letter.letterNumber,
                letterType: letter.letterType,
                purpose: letter.purpose,
                destination: letter.destination,
                status: letter.status,
                issuedAt: letter.issuedAt,
                signedByName: letter.signedByName,
                bodySnapshot: letter.bodySnapshot ?? undefined,
                verifyToken: letter.verifyToken ?? undefined,
            },
            member,
            tenant
        );

        const filename = letter.letterNumber ? `${letter.letterNumber}.pdf` : `DRAF-${letter.id}.pdf`;

        return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${filename}"`,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
