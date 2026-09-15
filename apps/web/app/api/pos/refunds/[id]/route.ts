export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createPosRefundSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';
import { MSG } from '@/lib/api-messages';
import { invalidatePosAnalyticsCache, invalidatePosDashboardCache } from '@/lib/pos-cache';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:refunds:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (status) {
            where.status = status.toUpperCase();
        }

        const [refunds, total] = await Promise.all([
            prisma.posRefund.findMany({
                where,
                include: {
                    transaction: {
                        select: {
                            id: true,
                            transactionNo: true,
                            totalAmount: true,
                            customerName: true,
                            paymentMethod: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.posRefund.count({ where }),
        ]);

        const data = refunds.map((r) => ({
            id: r.id,
            refundNo: r.refundNo,
            transactionId: r.transactionId,
            transactionNo: r.transaction.transactionNo,
            transactionTotal: Number(r.transaction.totalAmount),
            customerName: r.transaction.customerName || '-',
            paymentMethod: r.transaction.paymentMethod,
            amount: Number(r.amount),
            reason: r.reason,
            status: r.status,
            approvedBy: r.approvedBy,
            approvedAt: r.approvedAt?.toISOString() || null,
            createdBy: r.createdBy,
            createdAt: r.createdAt.toISOString(),
        }));

        return NextResponse.json({
            success: true,
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:refunds:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = createPosRefundSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Verify transaction exists and is COMPLETED
        const transaction = await prisma.posTransaction.findFirst({
            where: { id: validatedData.transactionId, tenantId, status: 'COMPLETED' },
        });
        if (!transaction) {
            return NextResponse.json(
                { success: false, error: MSG.TRANSACTION_NOT_COMPLETED },
                { status: 400 }
            );
        }

        // Validate refund amount doesn't exceed transaction total
        if (validatedData.amount > Number(transaction.totalAmount)) {
            return NextResponse.json(
                { success: false, error: MSG.REFUND_AMOUNT_EXCEEDS_TRANSACTION },
                { status: 400 }
            );
        }

        // Generate refund number
        const refundCount = await prisma.posRefund.count({ where: { tenantId } });
        const refundNo = `RFN-${new Date().getFullYear()}-${String(refundCount + 1).padStart(6, '0')}`;

        const refund = await prisma.posRefund.create({
            data: {
                tenantId,
                transactionId: validatedData.transactionId,
                refundNo,
                amount: validatedData.amount,
                reason: validatedData.reason,
                createdBy: userId,
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'PosRefund',
            entityId: refund.id,
            newValues: {
                refundNo,
                transactionId: validatedData.transactionId,
                amount: validatedData.amount,
                reason: validatedData.reason,
            },
            request,
        });

        // Fire-and-forget: invalidate POS analytics + dashboard cache (refunds affect revenue metrics)
        invalidatePosAnalyticsCache(tenantId).catch(() => { });
        invalidatePosDashboardCache(tenantId).catch(() => { });

        return NextResponse.json({ success: true, data: { id: refund.id, refundNo: refund.refundNo } }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:refunds:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        const { id } = params;

        // Get refund by id + tenantId
        const refund = await prisma.posRefund.findFirst({
            where: { id, tenantId },
            include: {
                transaction: {
                    select: { id: true, status: true },
                },
            },
        });
        if (!refund) {
            return NextResponse.json(
                { success: false, error: MSG.REFUND_NOT_FOUND },
                { status: 404 }
            );
        }

        // Validate: refund must be PENDING
        if (refund.status !== 'PENDING') {
            return NextResponse.json(
                { success: false, error: MSG.REFUND_ALREADY_PROCESSED },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { status, notes } = body;

        if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
            return NextResponse.json(
                { success: false, error: MSG.REFUND_STATUS_INVALID },
                { status: 400 }
            );
        }

        if (status === 'APPROVED') {
            // Update refund + update transaction + restore stock atomically
            await prisma.$transaction(async (tx) => {
                // Update refund: status=APPROVED
                await tx.posRefund.update({
                    where: { id },
                    data: {
                        status: 'APPROVED',
                        approvedBy: userId,
                        approvedAt: new Date(),
                    },
                });

                // Update transaction: status=REFUNDED
                await tx.posTransaction.update({
                    where: { id: refund.transactionId },
                    data: { status: 'REFUNDED' },
                });

                // Restore stock: query transaction items, for each item with productId
                const items = await tx.posTransactionItem.findMany({
                    where: { transactionId: refund.transactionId },
                    select: { productId: true, quantity: true },
                });

                for (const item of items) {
                    if (item.productId) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { stock: { increment: Number(item.quantity) } },
                        });
                    }
                }
            });
        } else {
            // REJECTED: just update refund status
            await prisma.posRefund.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    approvedBy: userId,
                    approvedAt: new Date(),
                },
            });
        }

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'PosRefund',
            entityId: refund.id,
            oldValues: { status: 'PENDING' },
            newValues: {
                status,
                approvedBy: userId,
                notes: notes || null,
            },
            request,
        });

        // Fire-and-forget: invalidate POS analytics + dashboard cache
        invalidatePosAnalyticsCache(tenantId).catch(() => { });
        invalidatePosDashboardCache(tenantId).catch(() => { });

        // Fetch updated refund
        const updatedRefund = await prisma.posRefund.findFirst({
            where: { id },
            include: {
                transaction: {
                    select: {
                        id: true,
                        transactionNo: true,
                        totalAmount: true,
                        customerName: true,
                        paymentMethod: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: updatedRefund!.id,
                refundNo: updatedRefund!.refundNo,
                transactionId: updatedRefund!.transactionId,
                transactionNo: updatedRefund!.transaction.transactionNo,
                amount: Number(updatedRefund!.amount),
                reason: updatedRefund!.reason,
                status: updatedRefund!.status,
                approvedBy: updatedRefund!.approvedBy,
                approvedAt: updatedRefund!.approvedAt?.toISOString() || null,
                createdAt: updatedRefund!.createdAt.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
