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
import { logAudit, toAuditPayload, diffValues } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { updateCommunityCashTransactionSchema, formatZodError } from '@/lib/validation-schemas';

function serializeCashTx(row: Record<string, unknown>): Record<string, unknown> {
    const { amount, ...rest } = row;
    return { ...rest, amount: Number(amount) };
}

// GET /api/community/cash-transactions/[id] — detail transaksi kas (community:finance).
export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-cash-detail:${ip}`, 100, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission(session, 'community:finance'))) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const tx = await prisma.communityCashTransaction.findFirst({
            where: { id: params.id, tenantId: auth.tenantId, deletedAt: null },
            include: { duesType: { select: { id: true, code: true, name: true } } },
        });
        if (!tx) {
            return NextResponse.json({ error: MSG_COMMUNITY.CASH_TX_NOT_FOUND }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: serializeCashTx(tx) });
    } catch (error) {
        return handleApiError(error);
    }
}

// PUT /api/community/cash-transactions/[id] — update parsial, hanya saat PENDING;
// creator-only atau KETUA (community:approve) (community:finance).
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-cash-update:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission(session, 'community:finance'))) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const existing = await prisma.communityCashTransaction.findFirst({
            where: { id: params.id, tenantId: auth.tenantId, deletedAt: null },
            select: { id: true, txNumber: true, status: true, createdBy: true },
        });
        if (!existing) {
            return NextResponse.json({ error: MSG_COMMUNITY.CASH_TX_NOT_FOUND }, { status: 404 });
        }
        if (existing.status !== 'PENDING') {
            return NextResponse.json({ error: MSG_COMMUNITY.CASH_TX_EDIT_NOT_ALLOWED }, { status: 409 });
        }
        // Edit hanya oleh pencatat atau KETUA (pemegang community:approve).
        const isApprover = await hasPermission(session, 'community:approve');
        if (existing.createdBy !== auth.userId && !isApprover) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const body = sanitizeObject(await request.json().catch(() => ({})));
        const parsed = updateCommunityCashTransactionSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        const { type, category, duesTypeId, amount, description, txDate, attachmentUrl } = parsed.data;
        const updateData: Record<string, unknown> = {};
        if (type !== undefined) updateData.type = type;
        if (category !== undefined) updateData.category = category || null;
        if (duesTypeId !== undefined) updateData.duesTypeId = duesTypeId || null;
        if (amount !== undefined) updateData.amount = amount;
        if (description !== undefined) updateData.description = description;
        if (txDate !== undefined) updateData.txDate = new Date(txDate);
        if (attachmentUrl !== undefined) updateData.attachmentUrl = attachmentUrl || null;

        const updated = await prisma.communityCashTransaction.update({
            where: { id: existing.id },
            data: updateData,
            include: { duesType: { select: { id: true, code: true, name: true } } },
        });

        const oldValues = { txNumber: existing.txNumber, status: existing.status };
        const newValues = toAuditPayload({ ...updateData, amount: updateData.amount !== undefined ? Number(updateData.amount) : undefined });
        void logAudit({
            tenantId: auth.tenantId,
            userId: auth.userId,
            action: 'UPDATE',
            entity: 'CommunityCashTransaction',
            entityId: existing.id,
            oldValues,
            newValues: diffValues(oldValues, newValues),
        });

        return NextResponse.json({ success: true, data: serializeCashTx(updated), message: 'Cash transaction updated' });
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE /api/community/cash-transactions/[id] — soft delete, hanya saat PENDING;
// creator-only atau KETUA (community:approve) (community:finance).
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-cash-delete:${ip}`, 20, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission(session, 'community:finance'))) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const existing = await prisma.communityCashTransaction.findFirst({
            where: { id: params.id, tenantId: auth.tenantId, deletedAt: null },
            select: { id: true, txNumber: true, status: true, createdBy: true },
        });
        if (!existing) {
            return NextResponse.json({ error: MSG_COMMUNITY.CASH_TX_NOT_FOUND }, { status: 404 });
        }
        if (existing.status !== 'PENDING') {
            return NextResponse.json({ error: MSG_COMMUNITY.CASH_TX_DELETE_NOT_ALLOWED }, { status: 409 });
        }
        const isApprover = await hasPermission(session, 'community:approve');
        if (existing.createdBy !== auth.userId && !isApprover) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        await prisma.communityCashTransaction.update({
            where: { id: existing.id },
            data: { deletedAt: new Date(), deletedBy: auth.userId },
        });

        void logAudit({
            tenantId: auth.tenantId,
            userId: auth.userId,
            action: 'DELETE',
            entity: 'CommunityCashTransaction',
            entityId: existing.id,
            oldValues: { txNumber: existing.txNumber, status: existing.status },
        });

        return NextResponse.json({ success: true, message: 'Cash transaction deleted' });
    } catch (error) {
        return handleApiError(error);
    }
}
