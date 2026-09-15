export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:sessions:report:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const { id } = params;

        // Get session by id + tenantId
        const posSession = await prisma.posSession.findFirst({
            where: { id, tenantId },
            include: {
                terminal: { select: { id: true, name: true, code: true } },
            },
        });
        if (!posSession) {
            return NextResponse.json(
                { success: false, error: MSG.SESSION_NOT_FOUND },
                { status: 404 }
            );
        }

        // Query all transactions in this session (COMPLETED + VOIDED + REFUNDED)
        const transactions = await prisma.posTransaction.findMany({
            where: {
                sessionId: id,
                tenantId,
            },
            include: {
                items: {
                    select: {
                        productName: true,
                        quantity: true,
                        unitPrice: true,
                        subtotal: true,
                    },
                },
                payments: {
                    select: {
                        method: true,
                        amount: true,
                        status: true,
                    },
                },
                refunds: {
                    select: {
                        amount: true,
                        status: true,
                    },
                },
            },
        });

        // Separate by status
        const completed = transactions.filter((t) => t.status === 'COMPLETED');
        const voided = transactions.filter((t) => t.status === 'VOIDED');
        const refunded = transactions.filter((t) => t.status === 'REFUNDED');

        // ── Sales Summary ──────────────────────────────────────────────────
        const grossSales = completed.reduce((sum, t) => sum + Number(t.subtotal), 0);
        const totalDiscounts = completed.reduce((sum, t) => sum + Number(t.discountAmount), 0);
        const totalTax = completed.reduce((sum, t) => sum + Number(t.taxAmount), 0);
        const netSales = grossSales - totalDiscounts;
        const totalRevenue = completed.reduce((sum, t) => sum + Number(t.totalAmount), 0);

        // ── Payment Method Breakdown ───────────────────────────────────────
        const paymentMethodMap = new Map<string, { count: number; total: number }>();
        for (const t of completed) {
            for (const p of t.payments) {
                if (p.status !== 'COMPLETED') continue;
                const existing = paymentMethodMap.get(p.method) || { count: 0, total: 0 };
                existing.count += 1;
                existing.total += Number(p.amount);
                paymentMethodMap.set(p.method, existing);
            }
        }
        const paymentMethods = Array.from(paymentMethodMap.entries()).map(([method, data]) => ({
            method,
            count: data.count,
            total: data.total,
        }));

        // ── Top Products ───────────────────────────────────────────────────
        const productMap = new Map<string, { name: string; quantity: number; total: number }>();
        for (const t of completed) {
            for (const item of t.items) {
                const existing = productMap.get(item.productName) || {
                    name: item.productName,
                    quantity: 0,
                    total: 0,
                };
                existing.quantity += Number(item.quantity);
                existing.total += Number(item.subtotal);
                productMap.set(item.productName, existing);
            }
        }
        const topProducts = Array.from(productMap.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        // ── Refunds ────────────────────────────────────────────────────────
        const allRefunds = transactions.flatMap((t) => t.refunds);
        const approvedRefunds = allRefunds.filter((r) => r.status === 'APPROVED');
        const refundCount = approvedRefunds.length;
        const refundTotal = approvedRefunds.reduce((sum, r) => sum + Number(r.amount), 0);

        // ── Voids ──────────────────────────────────────────────────────────
        const voidCount = voided.length;
        const voidTotal = voided.reduce((sum, t) => sum + Number(t.totalAmount), 0);

        // ── Cash Summary ───────────────────────────────────────────────────
        const cashTransactions = completed.filter((t) => t.payments.some((p) => p.method === 'CASH' && p.status === 'COMPLETED'));
        const cashSales = cashTransactions.reduce((sum, t) => {
            const cashPaid = t.payments
                .filter((p) => p.method === 'CASH' && p.status === 'COMPLETED')
                .reduce((s, p) => s + Number(p.amount), 0);
            return sum + cashPaid;
        }, 0);

        // Cash refunds (approved refunds for transactions paid with CASH)
        const cashRefundsData = await prisma.posRefund.findMany({
            where: {
                tenantId,
                status: 'APPROVED',
                transaction: {
                    sessionId: id,
                    paymentMethod: 'CASH',
                },
            },
            select: { amount: true },
        });
        const cashRefunds = cashRefundsData.reduce((sum, r) => sum + Number(r.amount), 0);
        const expectedCash = Number(posSession.openingCash) + cashSales - cashRefunds;

        const report = {
            sessionId: posSession.id,
            terminal: { name: posSession.terminal.name, code: posSession.terminal.code },
            cashier: { name: posSession.cashierName },
            period: { openedAt: posSession.openedAt.toISOString(), closedAt: null },

            sales: {
                totalTransactions: completed.length,
                grossSales,
                totalDiscounts,
                totalTax,
                netSales,
                totalRevenue,
            },

            paymentMethods,

            topProducts,

            refunds: {
                count: refundCount,
                total: refundTotal,
            },

            voids: {
                count: voidCount,
                total: voidTotal,
            },

            cashSummary: {
                openingCash: Number(posSession.openingCash),
                cashSales,
                cashRefunds,
                expectedCash,
            },
        };

        return NextResponse.json({ success: true, data: report });
    } catch (error) {
        return handleApiError(error);
    }
}
