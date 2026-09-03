import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({
                success: true,
                data: {
                    revenueByMonth: { labels: [], data: [] },
                    expenseByCategory: { labels: [], data: [] },
                    topProducts: { labels: [], data: [] },
                    orderTrend: { labels: [], data: [] },
                },
            });
        }

        const { tenantId } = auth;
        const now = new Date();
        const monthsToShow = 6;

        // Revenue by month (last 6 months)
        const revenuePayments = await prisma.payment.findMany({
            where: {
                tenantId,
                type: 'INCOME',
                status: 'completed',
                paymentDate: {
                    gte: new Date(now.getFullYear(), now.getMonth() - monthsToShow + 1, 1),
                },
            },
            select: { amount: true, paymentDate: true },
        });

        const revenueByMonth: number[] = [];
        const revenueLabels: string[] = [];
        for (let i = monthsToShow - 1; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const month = monthDate.getMonth();
            const year = monthDate.getFullYear();
            const monthTotal = revenuePayments
                .filter((p) => {
                    const pDate = new Date(p.paymentDate);
                    return pDate.getMonth() === month && pDate.getFullYear() === year;
                })
                .reduce((sum, p) => sum + Number(p.amount || 0), 0);
            revenueByMonth.push(monthTotal);
            revenueLabels.push(MONTH_LABELS[month]);
        }

        // Expense by category (this month)
        const expensePayments = await prisma.payment.findMany({
            where: {
                tenantId,
                type: 'EXPENSE',
                status: 'completed',
                paymentDate: {
                    gte: new Date(now.getFullYear(), now.getMonth(), 1),
                },
            },
            select: { amount: true, reference: true, notes: true },
        });

        // Group expenses by reference/notes as category proxy
        const expenseCategories: Record<string, number> = {};
        expensePayments.forEach((p) => {
            const category = p.reference || p.notes || 'Lainnya';
            expenseCategories[category] = (expenseCategories[category] || 0) + Number(p.amount || 0);
        });

        // Sort by amount and take top 6
        const sortedCategories = Object.entries(expenseCategories)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6);

        // Top selling products (by stock movement OUT)
        const topProducts = await prisma.product.findMany({
            where: {
                tenantId,
                stockMovements: {
                    some: {
                        type: 'OUT',
                        createdAt: {
                            gte: new Date(now.getFullYear(), now.getMonth() - monthsToShow, 1),
                        },
                    },
                },
            },
            select: {
                name: true,
                stockMovements: {
                    where: {
                        type: 'OUT',
                        createdAt: {
                            gte: new Date(now.getFullYear(), now.getMonth() - monthsToShow, 1),
                        },
                    },
                    select: { quantity: true },
                },
            },
            take: 6,
        });

        const topProductsData = topProducts
            .map((p) => ({
                name: p.name,
                totalSold: p.stockMovements.reduce((sum, m) => sum + Math.abs(m.quantity), 0),
            }))
            .sort((a, b) => b.totalSold - a.totalSold)
            .slice(0, 6);

        // Order trend (invoices created per month)
        const orderCounts: number[] = [];
        const orderLabels: string[] = [];
        for (let i = monthsToShow - 1; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            const count = await prisma.invoice.count({
                where: {
                    tenantId,
                    createdAt: { gte: monthDate, lt: nextMonth },
                },
            });
            orderCounts.push(count);
            orderLabels.push(MONTH_LABELS[monthDate.getMonth()]);
        }

        return NextResponse.json({
            success: true,
            data: {
                revenueByMonth: {
                    labels: revenueLabels,
                    data: revenueByMonth,
                },
                expenseByCategory: {
                    labels: sortedCategories.map(([label]) => label),
                    data: sortedCategories.map(([, value]) => value),
                },
                topProducts: {
                    labels: topProductsData.map((p) => p.name),
                    data: topProductsData.map((p) => p.totalSold),
                },
                orderTrend: {
                    labels: orderLabels,
                    data: orderCounts,
                },
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
