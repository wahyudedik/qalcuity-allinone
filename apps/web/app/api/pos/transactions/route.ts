import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createPosTransactionSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:transactions:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
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
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        const body = await request.json();
        const validation = createPosTransactionSchema.safeParse(body);
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
                { success: false, error: 'Sesi tidak ditemukan atau sudah ditutup' },
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
        const discountAmount = validatedData.discountAmount || 0;
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
        const paidAmount = validatedData.paidAmount;
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

            // Create payment record
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
                paymentMethod: validatedData.paymentMethod || 'CASH',
            },
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: transaction.id,
                transactionNo: transaction.transactionNo,
                totalAmount: Number(transaction.totalAmount),
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
