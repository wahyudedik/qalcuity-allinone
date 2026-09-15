export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createPosTransactionSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';
import { MSG } from '@/lib/api-messages';
import { invalidatePosAnalyticsCache, invalidatePosDashboardCache } from '@/lib/pos-cache';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:transactions:${ip}`, 100, 60000);
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
        const paymentMethod = searchParams.get('paymentMethod');
        const sessionId = searchParams.get('sessionId');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (status) {
            where.status = status.toUpperCase();
        }

        if (paymentMethod) {
            where.paymentMethod = paymentMethod.toUpperCase();
        }

        if (sessionId) {
            where.sessionId = sessionId;
        }

        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
            }
            if (dateTo) {
                const endDate = new Date(dateTo);
                endDate.setHours(23, 59, 59, 999);
                (where.createdAt as Record<string, unknown>).lte = endDate;
            }
        }

        const [transactions, total] = await Promise.all([
            prisma.posTransaction.findMany({
                where,
                include: {
                    items: { select: { id: true, productName: true, quantity: true, unitPrice: true, subtotal: true } },
                    payments: { select: { id: true, method: true, amount: true, reference: true, status: true } },
                    refunds: { select: { id: true, amount: true, reason: true, status: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.posTransaction.count({ where }),
        ]);

        const data = transactions.map((t) => ({
            id: t.id,
            transactionNo: t.transactionNo,
            customerName: t.customerName || '-',
            subtotal: Number(t.subtotal),
            discountAmount: Number(t.discountAmount),
            taxAmount: Number(t.taxAmount),
            totalAmount: Number(t.totalAmount),
            paidAmount: Number(t.paidAmount),
            changeAmount: Number(t.changeAmount),
            paymentMethod: t.paymentMethod,
            status: t.status,
            notes: t.notes,
            itemCount: t.items.length,
            items: t.items.map((item) => ({
                id: item.id,
                productName: item.productName,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                subtotal: Number(item.subtotal),
            })),
            payments: t.payments.map((p) => ({
                id: p.id,
                method: p.method,
                amount: Number(p.amount),
                reference: p.reference,
                status: p.status,
            })),
            refunds: t.refunds.map((r) => ({
                id: r.id,
                amount: Number(r.amount),
                reason: r.reason,
                status: r.status,
            })),
            createdAt: t.createdAt.toISOString(),
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
        const rateLimitResult = checkRateLimit(`api:pos:transactions:POST:${ip}`, 30, 60000);
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
        const validation = createPosTransactionSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Verify session exists and is OPEN
        const session = await prisma.posSession.findFirst({
            where: { id: validatedData.sessionId, tenantId, status: 'OPEN' },
        });
        if (!session) {
            return NextResponse.json(
                { success: false, error: MSG.SESSION_CLOSED },
                { status: 400 }
            );
        }

        // Calculate totals
        const subtotal = validatedData.items.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
        );
        const itemDiscountTotal = validatedData.items.reduce(
            (sum, item) => sum + (item.discountAmount || 0),
            0
        );

        // Calculate order-level discount on backend (don't trust frontend)
        let orderDiscountAmount = 0;
        let orderDiscountType: string | null = null;
        let orderDiscountValue = 0;
        let promoCodeUsed: string | null = null;

        if (validatedData.discountType && validatedData.discountValue !== undefined && validatedData.discountValue > 0) {
            orderDiscountType = validatedData.discountType;
            orderDiscountValue = validatedData.discountValue;

            if (validatedData.discountType === 'PERCENTAGE') {
                // Percentage: calculate from (subtotal - itemDiscountTotal)
                const baseForDiscount = subtotal - itemDiscountTotal;
                orderDiscountAmount = Math.round(baseForDiscount * (validatedData.discountValue / 100));
                // Clamp to not exceed base
                if (orderDiscountAmount > baseForDiscount) {
                    orderDiscountAmount = baseForDiscount;
                }
            } else {
                // FIXED: nominal discount, clamp to subtotal - itemDiscount
                const baseForDiscount = subtotal - itemDiscountTotal;
                orderDiscountAmount = Math.min(validatedData.discountValue, baseForDiscount);
            }
        }

        // Handle promo code (MVP: hardcoded promo validation)
        if (validatedData.promoCode && !orderDiscountType) {
            const code = validatedData.promoCode.toUpperCase().trim();
            // MVP promo codes — simple hardcoded validation
            const promoCodes: Record<string, { type: 'PERCENTAGE' | 'FIXED'; value: number; maxDiscount?: number; minOrder?: number }> = {
                'DISKON10': { type: 'PERCENTAGE', value: 10, maxDiscount: 50000 },
                'HEMAT20': { type: 'PERCENTAGE', value: 20, maxDiscount: 100000 },
                'POTONGAN5K': { type: 'FIXED', value: 5000, minOrder: 25000 },
                'POTONGAN10K': { type: 'FIXED', value: 10000, minOrder: 50000 },
                'GRATIS5': { type: 'PERCENTAGE', value: 5 },
            };

            const promo = promoCodes[code];
            if (promo) {
                const baseForDiscount = subtotal - itemDiscountTotal;
                // Check minimum order if specified
                if (promo.minOrder && baseForDiscount < promo.minOrder) {
                    return NextResponse.json(
                        { success: false, error: `Minimum pembelian ${promo.minOrder.toLocaleString('id-ID')} untuk promo ${code}` },
                        { status: 400 }
                    );
                }

                promoCodeUsed = code;
                orderDiscountType = promo.type;
                orderDiscountValue = promo.value;

                if (promo.type === 'PERCENTAGE') {
                    orderDiscountAmount = Math.round(baseForDiscount * (promo.value / 100));
                    if (promo.maxDiscount && orderDiscountAmount > promo.maxDiscount) {
                        orderDiscountAmount = promo.maxDiscount;
                    }
                } else {
                    orderDiscountAmount = Math.min(promo.value, baseForDiscount);
                }
            } else {
                return NextResponse.json(
                    { success: false, error: `Kode promo "${code}" tidak valid` },
                    { status: 400 }
                );
            }
        }

        const discountAmount = (validatedData.discountAmount || 0) + orderDiscountAmount;
        const taxableAmount = subtotal - itemDiscountTotal - discountAmount;

        // Calculate tax from items
        const taxAmount = validatedData.items.reduce(
            (sum, item) => {
                const itemTaxable = (item.quantity * item.unitPrice) - (item.discountAmount || 0);
                return sum + itemTaxable * ((item.taxRate || 0) / 100);
            },
            0
        );

        const totalAmount = taxableAmount + taxAmount;

        // Determine payment method and paid amount
        // Support both single payment and split payment (payments array)
        const splitPayments = validatedData.payments;
        const isSplitPayment = Array.isArray(splitPayments) && splitPayments.length >= 2;
        const paymentMethod = isSplitPayment
            ? splitPayments[0].method  // Primary method for the transaction record
            : (validatedData.paymentMethod || 'CASH');
        const paidAmount = isSplitPayment
            ? splitPayments.reduce((sum: number, p: { method: string; amount: number }) => sum + p.amount, 0)
            : validatedData.paidAmount;
        const changeAmount = paidAmount > totalAmount ? paidAmount - totalAmount : 0;

        // Generate transaction number
        const transactionCount = await prisma.posTransaction.count({ where: { tenantId } });
        const transactionNo = `TRX-${new Date().getFullYear()}-${String(transactionCount + 1).padStart(6, '0')}`;

        const transaction = await prisma.$transaction(async (tx) => {
            // Create transaction
            const trx = await tx.posTransaction.create({
                data: {
                    tenantId,
                    sessionId: validatedData.sessionId,
                    terminalId: session.terminalId,
                    transactionNo,
                    customerName: validatedData.customerName || null,
                    customerPhone: validatedData.customerPhone || null,
                    subtotal,
                    discountAmount,
                    discountPercent: validatedData.discountPercent || null,
                    discountType: orderDiscountType,
                    discountValue: orderDiscountValue > 0 ? orderDiscountValue : null,
                    promoCode: promoCodeUsed,
                    taxAmount,
                    totalAmount,
                    paidAmount,
                    changeAmount,
                    paymentMethod: validatedData.paymentMethod || 'CASH',
                    status: 'COMPLETED',
                    notes: validatedData.notes || null,
                    createdBy: userId,
                },
            });

            // Create transaction items
            await tx.posTransactionItem.createMany({
                data: validatedData.items.map((item) => ({
                    tenantId,
                    transactionId: trx.id,
                    productId: item.productId,
                    productName: item.productName,
                    productSku: item.productSku || null,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discountAmount: item.discountAmount || 0,
                    discountPercent: item.discountPercent || null,
                    taxRate: item.taxRate || 0,
                    taxAmount: (item.quantity * item.unitPrice - (item.discountAmount || 0)) * ((item.taxRate || 0) / 100),
                    subtotal: item.quantity * item.unitPrice - (item.discountAmount || 0),
                })),
            });

            // Create payment record(s)
            if (isSplitPayment && splitPayments) {
                // Split payment: create one record per method
                await tx.posPayment.createMany({
                    data: splitPayments.map((p: { method: string; amount: number }) => ({
                        tenantId,
                        transactionId: trx.id,
                        method: p.method,
                        amount: p.amount,
                        reference: null,
                        status: 'COMPLETED',
                    })),
                });
            } else {
                // Single payment
                await tx.posPayment.create({
                    data: {
                        tenantId,
                        transactionId: trx.id,
                        method: validatedData.paymentMethod || 'CASH',
                        amount: paidAmount,
                        reference: null,
                        status: 'COMPLETED',
                    },
                });
            }

            return trx;
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'PosTransaction',
            entityId: transaction.id,
            newValues: {
                transactionNo,
                totalAmount,
                paymentMethod,
                discountAmount: orderDiscountAmount > 0 ? orderDiscountAmount : undefined,
                promoCode: promoCodeUsed || undefined,
                ...(isSplitPayment && { splitPayments: splitPayments?.map((p: { method: string; amount: number }) => `${p.method}: ${p.amount}`) }),
            },
            request,
        });

        // Fire-and-forget: invalidate POS analytics + dashboard cache
        invalidatePosAnalyticsCache(tenantId).catch(() => { });
        invalidatePosDashboardCache(tenantId).catch(() => { });

        return NextResponse.json({
            success: true,
            data: {
                id: transaction.id,
                transactionNo: transaction.transactionNo,
                totalAmount: Number(transaction.totalAmount),
                discountAmount: Number(transaction.discountAmount),
                discountType: transaction.discountType,
                discountValue: transaction.discountValue ? Number(transaction.discountValue) : null,
                promoCode: transaction.promoCode,
                paidAmount: Number(transaction.paidAmount),
                changeAmount: Number(transaction.changeAmount),
                paymentMethod: transaction.paymentMethod,
                status: transaction.status,
                createdAt: transaction.createdAt.toISOString(),
            },
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
