export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { MSG, MSG_COMMUNITY, MSG_COMMUNITY_LOANS } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { updateCommunityLoanSchema, formatZodError } from '@/lib/validation-schemas';
import { LOAN_LIST_SELECT, serializeCommunityAssetLoan } from '@/lib/community';

/**
 * PUT /api/community/loans/[id] — perpanjangan peminjaman (community:manage).
 *
 * Hanya `dueDate` / `notes` yang bisa diubah (Zod pick 2 field, partial).
 * Scope: loan `tenantId` sama (model tanpa soft-delete) → 404 LOAN_NOT_FOUND;
 * hanya `status === 'ACTIVE'` → 409 LOAN_ALREADY_RETURNED (plans §3.3).
 * `dueDate >= loanDate` divalidasi Zod refine (400 bila melanggar).
 */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-loans-update:${ip}`, 30, 60_000);
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
        const parsed = updateCommunityLoanSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        const existing = await prisma.communityAssetLoan.findFirst({
            where: { id: params.id, tenantId },
            select: LOAN_LIST_SELECT,
        });
        if (!existing) {
            return NextResponse.json({ error: MSG_COMMUNITY_LOANS.LOAN_NOT_FOUND }, { status: 404 });
        }
        if (existing.status !== 'ACTIVE') {
            return NextResponse.json({ error: MSG_COMMUNITY_LOANS.LOAN_ALREADY_RETURNED }, { status: 409 });
        }

        const { dueDate, notes } = parsed.data;
        const data: Prisma.CommunityAssetLoanUpdateInput = {};
        if (dueDate !== undefined) data.dueDate = dueDate;
        if (notes !== undefined) data.notes = notes;

        const updated = await prisma.communityAssetLoan.update({
            where: { id: existing.id },
            data,
            select: LOAN_LIST_SELECT,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'CommunityAssetLoan',
            entityId: updated.id,
            oldValues: toAuditPayload({ dueDate: existing.dueDate, notes: existing.notes }),
            newValues: toAuditPayload({ dueDate: updated.dueDate, notes: updated.notes }),
            request,
        });

        return NextResponse.json({
            success: true,
            message: MSG_COMMUNITY_LOANS.LOAN_UPDATED,
            data: serializeCommunityAssetLoan(updated),
        });
    } catch (error) {
        return handleApiError(error);
    }
}
