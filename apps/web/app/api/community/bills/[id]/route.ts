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
import { updateCommunityBillSchema, formatZodError } from '@/lib/validation-schemas';

function serializeBill(row: Record<string, unknown>): Record<string, unknown> {
    return {
        ...row,
        amountDue: row.amountDue !== null && row.amountDue !== undefined ? Number(row.amountDue) : 0,
        amountPaid: row.amountPaid !== null && row.amountPaid !== undefined ? Number(row.amountPaid) : 0,
    };
}

function serializePayment(row: Record<string, unknown>): Record<string, unknown> {
    return {
        ...row,
        amount: row.amount !== null && row.amount !== undefined ? Number(row.amount) : 0,
    };
}

async function requireFinance() {
    const session = await getServerSession(authOptions);
    if (!session || !(await hasPermission(session, 'community:finance'))) return null;
    return session;
}

/**
 * GET /api/community/bills/[id] — detail tagihan + riwayat pembayaran.
 * PUT /api/community/bills/[id] — edit dueDate/notes, atau VOID tagihan.
 *
 * VOID hanya boleh jika belum ada pembayaran (audit trail konsisten) —
 * jika sudah ada pembayaran → 409 BILL_HAS_PAYMENTS.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-bills-detail:${ip}`, 100, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const session = await requireFinance();
        if (!session) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const bill = await prisma.communityDuesBill.findFirst({
            where: { id: params.id, tenantId: session.user.tenantId, deletedAt: null },
            include: {
                member: { select: { id: true, code: true, fullName: true, address: true, rtRw: true } },
                duesType: { select: { id: true, code: true, name: true, frequency: true } },
                payments: {
                    orderBy: { paidAt: 'desc' },
                    select: {
                        id: true,
                        paymentNumber: true,
                        amount: true,
                        paidAt: true,
                        method: true,
                        receiptUrl: true,
                        notes: true,
                        createdBy: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!bill) {
            return NextResponse.json({ error: MSG_COMMUNITY.BILL_NOT_FOUND }, { status: 404 });
        }

        const { payments, ...billRest } = bill as unknown as Record<string, unknown> & {
            payments: Record<string, unknown>[];
        };

        return NextResponse.json({
            success: true,
            data: {
                ...serializeBill(billRest),
                payments: payments.map(serializePayment),
                remaining:
                    (billRest.amountDue !== null && billRest.amountDue !== undefined ? Number(billRest.amountDue) : 0) -
                    (billRest.amountPaid !== null && billRest.amountPaid !== undefined ? Number(billRest.amountPaid) : 0),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-bills-update:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const session = await requireFinance();
        if (!session) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }
        const tenantId = session.user.tenantId;
        const userId = session.user.id;

        const existing = await prisma.communityDuesBill.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            select: { id: true, billNumber: true, status: true, dueDate: true, notes: true },
        });
        if (!existing) {
            return NextResponse.json({ error: MSG_COMMUNITY.BILL_NOT_FOUND }, { status: 404 });
        }

        const body = sanitizeObject(await request.json().catch(() => ({})));
        const parsed = updateCommunityBillSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        const wantsVoid = parsed.data.status === 'VOID';

        if (wantsVoid) {
            if (existing.status === 'VOID') {
                return NextResponse.json({ error: MSG_COMMUNITY.BILL_ALREADY_VOID }, { status: 409 });
            }
            const paymentCount = await prisma.communityDuesPayment.count({
                where: { tenantId, billId: params.id },
            });
            if (paymentCount > 0) {
                return NextResponse.json({ error: MSG_COMMUNITY.BILL_HAS_PAYMENTS }, { status: 409 });
            }
        }

        const updateData: Record<string, unknown> = {};
        if (parsed.data.dueDate !== undefined) updateData.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
        if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes || null;
        if (wantsVoid) updateData.status = 'VOID';

        const updated = await prisma.communityDuesBill.update({
            where: { id: params.id },
            data: updateData,
            include: {
                member: { select: { id: true, code: true, fullName: true } },
                duesType: { select: { id: true, code: true, name: true } },
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: wantsVoid ? 'VOID' : 'UPDATE',
            entity: 'CommunityDuesBill',
            entityId: params.id,
            oldValues: { status: existing.status, dueDate: existing.dueDate, notes: existing.notes },
            newValues: toAuditPayload(updateData),
            request,
        });

        return NextResponse.json({ success: true, data: serializeBill(updated as unknown as Record<string, unknown>) });
    } catch (error) {
        return handleApiError(error);
    }
}
