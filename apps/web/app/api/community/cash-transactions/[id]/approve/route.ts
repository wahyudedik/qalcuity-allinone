import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { MSG, MSG_COMMUNITY } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { approveCommunityCashTransactionSchema, formatZodError } from '@/lib/validation-schemas';

export const dynamic = 'force-dynamic';

function serializeCashTx(row: Record<string, unknown>): Record<string, unknown> {
    const duesType = row.duesType as { id: string; code: string; name: string } | null;
    return {
        id: row.id,
        tenantId: row.tenantId,
        txNumber: row.txNumber,
        type: row.type,
        category: row.category,
        duesTypeId: row.duesTypeId,
        duesType: duesType ?? null,
        amount: Number(row.amount),
        description: row.description,
        txDate: row.txDate,
        attachmentUrl: row.attachmentUrl,
        status: row.status,
        approvedBy: row.approvedBy,
        approvedAt: row.approvedAt,
        rejectedBy: row.rejectedBy,
        rejectedAt: row.rejectedAt,
        rejectReason: row.rejectReason,
        createdBy: row.createdBy,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

/**
 * POST /api/community/cash-transactions/[id]/approve
 *
 * Approve a PENDING cash transaction.
 * Spec §3.4 — 2-layer SoD:
 *  1. In-route community:approve check (route-permissions longest-prefix falls to community:finance).
 *  2. Creator cannot approve own transaction (SELF_APPROVAL_FORBIDDEN).
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = await checkRateLimit(`community-approve:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: { code: 'RATE_LIMITED', message: MSG.TOO_MANY_REQUESTS } },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: auth.error } }, { status: auth.status });
        }

        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: MSG.UNAUTHORIZED } }, { status: 401 });
        }

        // Layer 1: explicit approve permission (NOT finance — Bendahara must not approve)
        const canApprove = await hasPermission(session, 'community:approve');
        if (!canApprove) {
            return NextResponse.json(
                { success: false, error: { code: 'FORBIDDEN', message: MSG_COMMUNITY.APPROVE_PERMISSION_DENIED } },
                { status: 403 }
            );
        }

        const body = sanitizeObject(await request.json().catch(() => ({})) as Record<string, unknown>);
        const parsed = approveCommunityCashTransactionSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: formatZodError(parsed.error) } },
                { status: 400 }
            );
        }

        const existing = await prisma.communityCashTransaction.findFirst({
            where: { id: params.id, tenantId: auth.tenantId, deletedAt: null },
            select: { id: true, txNumber: true, status: true, createdBy: true },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: MSG_COMMUNITY.CASH_TX_NOT_FOUND } },
                { status: 404 }
            );
        }

        if (existing.status !== 'PENDING') {
            return NextResponse.json(
                { success: false, error: { code: 'CONFLICT', message: MSG_COMMUNITY.ALREADY_DECIDED } },
                { status: 409 }
            );
        }

        // Layer 2: SoD — creator cannot approve own transaction
        if (existing.createdBy === auth.userId) {
            return NextResponse.json(
                { success: false, error: { code: 'FORBIDDEN', message: MSG_COMMUNITY.SELF_APPROVAL_FORBIDDEN } },
                { status: 403 }
            );
        }

        const notes = parsed.data.notes?.trim() || null;

        const updated = await prisma.communityCashTransaction.update({
            where: { id: existing.id },
            data: {
                status: 'APPROVED',
                approvedBy: auth.userId,
                approvedAt: new Date(),
            },
            include: { duesType: { select: { id: true, code: true, name: true } } },
        });

        void logAudit({
            tenantId: auth.tenantId,
            userId: auth.userId,
            action: 'APPROVE',
            entity: 'CommunityCashTransaction',
            entityId: existing.id,
            oldValues: toAuditPayload({ txNumber: existing.txNumber, status: existing.status }),
            newValues: toAuditPayload({ status: 'APPROVED', notes }),
        });

        return NextResponse.json({
            success: true,
            data: serializeCashTx(updated as unknown as Record<string, unknown>),
            message: 'Cash transaction approved',
        });
    } catch (error) {
        return handleApiError(error);
    }
}
