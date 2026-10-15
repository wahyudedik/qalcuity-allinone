export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { MSG, MSG_COMMUNITY, MSG_COMMUNITY_LOANS } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { returnCommunityLoanSchema, formatZodError } from '@/lib/validation-schemas';
import {
    LOAN_LIST_SELECT,
    LoanRequestError,
    serializeCommunityAssetLoan,
} from '@/lib/community';

/**
 * PATCH /api/community/loans/[id]/return — pengembalian aset (community:manage).
 *
 * Transaction (plans §3.4): load loan → 404 LOAN_NOT_FOUND → sudah RETURNED →
 * 409 LOAN_ALREADY_RETURNED → row-lock aset `FOR UPDATE` (serialize dengan
 * create bersamaan) → update `returnedAt`, `status: 'RETURNED'`,
 * `conditionAtReturn` (input ?? snapshot `conditionAtLoan`), `returnNotes`,
 * `returnedBy`. Schema return = semua field opsional (tanpa partial/refine).
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-loans-return:${ip}`, 30, 60_000);
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

        const body = sanitizeObject(await request.json().catch(() => ({})));
        const parsed = returnCommunityLoanSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        const { conditionAtReturn, returnNotes } = parsed.data;

        const result = await prisma.$transaction(async (tx) => {
            const loan = await tx.communityAssetLoan.findFirst({
                where: { id: params.id, tenantId },
                select: { id: true, assetId: true, status: true, conditionAtLoan: true },
            });
            if (!loan) {
                throw new LoanRequestError(404, MSG_COMMUNITY_LOANS.LOAN_NOT_FOUND);
            }
            if (loan.status === 'RETURNED') {
                throw new LoanRequestError(409, MSG_COMMUNITY_LOANS.LOAN_ALREADY_RETURNED);
            }

            // Serialize dengan POST create yang mungkin berjalan bersamaan untuk
            // aset yang sama (lock diambil SETELAH cek status — urutan konsisten).
            await tx.$queryRaw`
                SELECT "id" FROM "CommunityAsset"
                WHERE "id" = ${loan.assetId} AND "tenantId" = ${tenantId}
                FOR UPDATE
            `;

            return tx.communityAssetLoan.update({
                where: { id: loan.id },
                data: {
                    returnedAt: new Date(),
                    status: 'RETURNED',
                    conditionAtReturn: conditionAtReturn ?? loan.conditionAtLoan,
                    returnNotes: returnNotes ?? null,
                    returnedBy: userId,
                },
                select: LOAN_LIST_SELECT,
            });
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'CommunityAssetLoan',
            entityId: result.id,
            newValues: toAuditPayload({
                status: 'RETURNED',
                conditionAtReturn: result.conditionAtReturn,
                returnNotes: result.returnNotes,
            }),
            request,
        });

        return NextResponse.json({
            success: true,
            message: MSG_COMMUNITY_LOANS.LOAN_RETURNED,
            data: serializeCommunityAssetLoan(result),
        });
    } catch (error) {
        if (error instanceof LoanRequestError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        return handleApiError(error);
    }
}
