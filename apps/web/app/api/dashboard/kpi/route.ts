import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({
                success: true,
                data: {
                    revenue: { current: 0, previous: 0, change: 0 },
                    expenses: { current: 0, previous: 0, change: 0 },
                    profit: { current: 0, previous: 0, change: 0 },
                    outstandingInvoices: { count: 0, total: 0 },
                    lowStockProducts: { count: 0, items: [] },
                    activeEmployees: 0,
                    activeDeals: 0,
                },
            });
        }

        const { tenantId } = auth;
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        // Revenue: total income payments this month vs last month
        const [currentIncome, previousIncome] = await Promise.all([
            prisma.payment.aggregate({
                where: {
                    tenantId,
                    type: 'INCOME',
                    status: 'completed',
                    paymentDate: { gte: currentMonthStart },
                },
                _sum: { amount: true },
            }),
            prisma.payment.aggregate({
                where: {
                    tenantId,
                    type: 'INCOME',
                    status: 'completed',
                    paymentDate: { gte: previousMonthStart, lte: previousMonthEnd },
                },
                _sum: { amount: true },
            }),
        ]);

        const revenueCurrent = Number(currentIncome._sum?.amount || 0);
        const revenuePrevious = Number(previousIncome._sum?.amount || 0);
        const revenueChange = revenuePrevious > 0
            ? Math.round(((revenueCurrent - revenuePrevious) / revenuePrevious) * 100)
            : revenueCurrent > 0 ? 100 : 0;

        // Expenses: total expense payments this month vs last month
        const [currentExpenses, previousExpenses] = await Promise.all([
            prisma.payment.aggregate({
                where: {
                    tenantId,
                    type: 'EXPENSE',
                    status: 'completed',
                    paymentDate: { gte: currentMonthStart },
                },
                _sum: { amount: true },
            }),
            prisma.payment.aggregate({
                where: {
                    tenantId,
                    type: 'EXPENSE',
                    status: 'completed',
                    paymentDate: { gte: previousMonthStart, lte: previousMonthEnd },
                },
                _sum: { amount: true },
            }),
        ]);

        const expensesCurrent = Number(currentExpenses._sum?.amount || 0);
        const expensesPrevious = Number(previousExpenses._sum?.amount || 0);
        const expensesChange = expensesPrevious > 0
            ? Math.round(((expensesCurrent - expensesPrevious) / expensesPrevious) * 100)
            : expensesCurrent > 0 ? 100 : 0;

        // Profit = Revenue - Expenses
        const profitCurrent = revenueCurrent - expensesCurrent;
        const profitPrevious = revenuePrevious - expensesPrevious;
        const profitChange = profitPrevious > 0
            ? Math.round(((profitCurrent - profitPrevious) / Math.abs(profitPrevious)) * 100)
            : profitCurrent > 0 ? 100 : 0;

        // Outstanding invoices
        const outstandingInvoices = await prisma.invoice.findMany({
            where: {
                tenantId,
                status: { in: ['SENT', 'OVERDUE'] },
                dueDate: { lt: now },
            },
            select: { id: true, total: true },
        });

        // Low stock products
        const lowStockProducts = await prisma.product.findMany({
            where: {
                tenantId,
                AND: [
                    { minStock: { gt: 0 } },
                    { stock: { lte: 10 } },
                ],
            },
            select: { id: true, name: true, stock: true, minStock: true },
            take: 5,
        });

        // Active employees
        const activeEmployees = await prisma.employee.count({
            where: { tenantId, status: 'ACTIVE' },
        });

        // Active deals
        const activeDeals = await prisma.deal.count({
            where: {
                tenantId,
                stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                revenue: {
                    current: revenueCurrent,
                    previous: revenuePrevious,
                    change: revenueChange,
                },
                expenses: {
                    current: expensesCurrent,
                    previous: expensesPrevious,
                    change: expensesChange,
                },
                profit: {
                    current: profitCurrent,
                    previous: profitPrevious,
                    change: profitChange,
                },
                outstandingInvoices: {
                    count: outstandingInvoices.length,
                    total: outstandingInvoices.reduce((sum, inv) => sum + Number(inv.total), 0),
                },
                lowStockProducts: {
                    count: lowStockProducts.length,
                    items: lowStockProducts.map((p) => ({
                        id: p.id,
                        name: p.name,
                        stock: p.stock,
                        minStock: p.minStock,
                    })),
                },
                activeEmployees,
                activeDeals,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
