export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { MSG, MSG_COMMUNITY } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { logAudit } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { payCommunityBillSchema, formatZodError } from '@/lib/validation-schemas';
import { dailyNumberPrefix, formatSeq3 } from '@/lib/community';

function isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * Nomor harian collision-safe: max-existing + bump.
 * Unique constraint [tenantId, number] tetap jadi safety net —
 * caller me-retry (fetch max baru) jika kena P2002 race.
 */
async function nextDailySeq(
    tx: Prisma.TransactionClient,
    tenantId: string,
    prefix: 'BYR' | 'KAS',
    when: Date
): Promise<string> {
    const dayPrefix = dailyNumberPrefix(prefix, when);
    let lastNumber: string | null = null;
    if (prefix === 'BYR') {
        const last = await tx.communityDuesPayment.findFirst({
            where: { tenantId, paymentNumber: { startsWith: dayPrefix } },
            orderBy: { paymentNumber: 'desc' },
            select: { paymentNumber: true },
        });
        lastNumber = last?.paymentNumber ?? null;
    } else {
        const last = await tx.communityCashTransaction.findFirst({
            where: { tenantId, txNumber: { startsWith: dayPrefix } },
            orderBy: { txNumber: 'desc' },
            select: { txNumber: true },
        });
        lastNumber = last?.txNumber ?? null;
    }

    let seq = 1;
    if (lastNumber) {
        const parsed = parseInt(lastNumber.slice(dayPrefix.length), 10);
        if (!Number.isNaN(parsed)) seq = parsed + 1;
    }
    return dayPrefix + formatSeq3(Math.min(seq, 999));
}

/**
 * POST /api/community/bills/[id]/pay — catat pembayaran iuran (community:finance).
 *
 * Semua proses dalam satu prisma.$transaction:
 * 1. Create CommunityDuesPayment (nomor BYR/<YYYYMMDD>-<seq> collision-safe)
 * 2. Update bill amountPaid + status (PARTIAL / PAID + paidAt)
 * 3. Create CommunityCashTransaction INCOME (nomor KAS/<YYYYMMDD>-<seq>, APPROVED
 *    langsung — ini auto-post fakta penerimaan uang, bukan approval manual bendahara)
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-bills-pay:${ip}`, 30, 60_000);
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

        const body = sanitizeObject(await request.json().catch(() => ({})));
        const parsed = payCommunityBillSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        const { tenantId, userId } = auth;
        const amount = Number(parsed.data.amount);
        const paidAt = parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date();

        // Retry loop: P2002 (race nomor harian) → tx rollback → fetch max baru → ulang
        let lastUniqueError: unknown = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const result = await prisma.$transaction(async (tx) => {
                    const bill = await tx.communityDuesBill.findFirst({
                        where: { id: params.id, tenantId, deletedAt: null },
                        select: {
                            id: true,
                            billNumber: true,
                            memberId: true,
                            duesTypeId: true,
                            amountDue: true,
                            amountPaid: true,
                            status: true,
                        },
                    });
                    if (!bill) return { error: MSG_COMMUNITY.BILL_NOT_FOUND, status: 404 };
                    if (bill.status === 'VOID') return { error: MSG_COMMUNITY.BILL_ALREADY_VOID, status: 409 };
                    if (bill.status === 'PAID') return { error: MSG_COMMUNITY.BILL_ALREADY_PAID, status: 409 };

                    const remaining = Number(bill.amountDue) - Number(bill.amountPaid);
                    if (amount > remaining + 1e-9) {
                        return { error: MSG_COMMUNITY.PAYMENT_EXCEEDS_DUE, status: 400 };
                    }

                    const paymentNumber = await nextDailySeq(tx, tenantId, 'BYR', paidAt);

                    const payment = await tx.communityDuesPayment.create({
                        data: {
                            tenantId,
                            paymentNumber,
                            billId: bill.id,
                            memberId: bill.memberId,
                            amount,
                            paidAt,
                            method: parsed.data.method,
                            receiptUrl: parsed.data.receiptUrl || null,
                            notes: parsed.data.notes || null,
                            createdBy: userId,
                        },
                        select: {
                            id: true,
                            paymentNumber: true,
                            amount: true,
                            paidAt: true,
                            method: true,
                            receiptUrl: true,
                            notes: true,
                        },
                    });

                    const newPaid = Number(bill.amountPaid) + amount;
                    const fullyPaid = newPaid >= Number(bill.amountDue) - 1e-9;

                    const updatedBill = await tx.communityDuesBill.update({
                        where: { id: bill.id },
                        data: {
                            amountPaid: newPaid,
                            status: fullyPaid ? 'PAID' : 'PARTIAL',
                            paidAt: fullyPaid ? paidAt : null,
                        },
                        select: {
                            id: true,
                            billNumber: true,
                            amountDue: true,
                            amountPaid: true,
                            status: true,
                            paidAt: true,
                        },
                    });

                    const txNumber = await nextDailySeq(tx, tenantId, 'KAS', paidAt);

                    await tx.communityCashTransaction.create({
                        data: {
                            tenantId,
                            txNumber,
                            type: 'INCOME',
                            category: 'Iuran',
                            duesTypeId: bill.duesTypeId,
                            amount,
                            description: `Pembayaran iuran ${bill.billNumber}`,
                            txDate: paidAt,
                            status: 'APPROVED',
                            approvedBy: userId,
                            approvedAt: new Date(),
                            createdBy: userId,
                        },
                    });

                    return {
                        data: {
                            payment: {
                                ...payment,
                                amount: Number(payment.amount),
                            },
                            bill: {
                                ...updatedBill,
                                amountDue: Number(updatedBill.amountDue),
                                amountPaid: Number(updatedBill.amountPaid),
                            },
                        },
                    };
                });

                if ('error' in result) {
                    return NextResponse.json({ error: result.error }, { status: result.status });
                }

                void logAudit({
                    userId,
                    tenantId,
                    action: 'PAY',
                    entity: 'CommunityDuesBill',
                    entityId: params.id,
                    newValues: {
                        amount,
                        method: parsed.data.method,
                        paymentNumber: result.data.payment.paymentNumber,
                    },
                    request,
                });

                return NextResponse.json({ success: true, data: result.data }, { status: 201 });
            } catch (error) {
                if (!isUniqueViolation(error)) return handleApiError(error);
                lastUniqueError = error; // race nomor harian → retry dengan max baru
            }
        }
        return handleApiError(lastUniqueError);
    } catch (error) {
        return handleApiError(error);
    }
}
