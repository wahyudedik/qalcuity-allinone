export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }

        // Rate limiting: 60 requests per minute per IP for dashboard stats
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:dashboard-stats:${auth.tenantId}:${ip}`, 60, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429 }
            );
        }
        const tenantId = auth.tenantId;

        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        // ── Parallel queries for all dashboard stats ──────────────────────────
        const [
            // Finance
            currentRevenue,
            previousRevenue,
            outstandingInvoices,
            totalExpensesThisMonth,
            totalExpensesPreviousMonth,
            // CRM
            activeDeals,
            dealsWonThisMonth,
            dealsWonPreviousMonth,
            newLeadsThisMonth,
            newLeadsPreviousMonth,
            // HR
            totalEmployees,
            activeEmployees,
            // Inventory
            totalProducts,
            lowStockProducts,
            // Recent activity & alerts
            recentAuditLogs,
            overdueInvoices,
        ] = await Promise.all([
            // ── Finance: Revenue from completed income payments (current month) ──
            prisma.payment.aggregate({
                where: {
                    tenantId,
                    type: 'INCOME',
                    status: 'completed',
                    paymentDate: { gte: currentMonthStart },
                },
                _sum: { amount: true },
            }),
            // Revenue previous month
            prisma.payment.aggregate({
                where: {
                    tenantId,
                    type: 'INCOME',
                    status: 'completed',
                    paymentDate: { gte: previousMonthStart, lte: previousMonthEnd },
                },
                _sum: { amount: true },
            }),
            // Outstanding invoices (SENT or OVERDUE, past due date)
            prisma.invoice.findMany({
                where: {
                    tenantId,
                    status: { in: ['SENT', 'OVERDUE'] },
                    dueDate: { lt: now },
                },
                select: { id: true, total: true },
            }),
            // Total expenses this month (from expense payments)
            prisma.payment.aggregate({
                where: {
                    tenantId,
                    type: 'EXPENSE',
                    status: 'completed',
                    paymentDate: { gte: currentMonthStart },
                },
                _sum: { amount: true },
            }),
            // Total expenses previous month
            prisma.payment.aggregate({
                where: {
                    tenantId,
                    type: 'EXPENSE',
                    status: 'completed',
                    paymentDate: { gte: previousMonthStart, lte: previousMonthEnd },
                },
                _sum: { amount: true },
            }),
            // ── CRM: Active deals (stage NOT IN closed) ──
            prisma.deal.count({
                where: {
                    tenantId,
                    stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
                },
            }),
            // Deals won this month
            prisma.deal.count({
                where: {
                    tenantId,
                    stage: 'CLOSED_WON',
                    updatedAt: { gte: currentMonthStart },
                },
            }),
            // Deals won previous month
            prisma.deal.count({
                where: {
                    tenantId,
                    stage: 'CLOSED_WON',
                    updatedAt: { gte: previousMonthStart, lte: previousMonthEnd },
                },
            }),
            // New leads this month
            prisma.lead.count({
                where: {
                    tenantId,
                    createdAt: { gte: currentMonthStart },
                },
            }),
            // New leads previous month
            prisma.lead.count({
                where: {
                    tenantId,
                    createdAt: { gte: previousMonthStart, lte: previousMonthEnd },
                },
            }),
            // ── HR: Total employees ──
            prisma.employee.count({
                where: { tenantId, deletedAt: null },
            }),
            // Active employees
            prisma.employee.count({
                where: { tenantId, status: 'ACTIVE', deletedAt: null },
            }),
            // ── Inventory: Total products ──
            prisma.product.count({
                where: { tenantId, isActive: true, deletedAt: null },
            }),
            // Low stock products (stock <= minStock)
            prisma.product.findMany({
                where: {
                    tenantId,
                    isActive: true,
                    deletedAt: null,
                    minStock: { gt: 0 },
                },
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    stock: true,
                    minStock: true,
                },
                take: 50,
            }),
            // Recent audit logs for activities
            prisma.auditLog.findMany({
                where: { tenantId },
                include: { user: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            // Overdue invoices for alerts
            prisma.invoice.findMany({
                where: {
                    tenantId,
                    status: { in: ['SENT', 'OVERDUE'] },
                    dueDate: { lt: now },
                },
                select: {
                    id: true,
                    invoiceNumber: true,
                    total: true,
                    dueDate: true,
                    contact: { select: { name: true } },
                },
                take: 5,
            }),
        ]);

        // ── Compute derived values ────────────────────────────────────────────

        // Finance
        const revenueCurrent = Number(currentRevenue._sum?.amount || 0);
        const revenuePrevious = Number(previousRevenue._sum?.amount || 0);
        const revenueChange = revenuePrevious > 0
            ? Math.round(((revenueCurrent - revenuePrevious) / revenuePrevious) * 100)
            : revenueCurrent > 0 ? 100 : 0;

        const outstandingTotal = outstandingInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

        const expensesCurrent = Number(totalExpensesThisMonth._sum?.amount || 0);
        const expensesPrevious = Number(totalExpensesPreviousMonth._sum?.amount || 0);
        const expensesChange = expensesPrevious > 0
            ? Math.round(((expensesCurrent - expensesPrevious) / expensesPrevious) * 100)
            : expensesCurrent > 0 ? 100 : 0;

        // CRM
        const dealsWonChange = dealsWonPreviousMonth > 0
            ? Math.round(((dealsWonThisMonth - dealsWonPreviousMonth) / dealsWonPreviousMonth) * 100)
            : dealsWonThisMonth > 0 ? 100 : 0;

        const leadsChange = newLeadsPreviousMonth > 0
            ? Math.round(((newLeadsThisMonth - newLeadsPreviousMonth) / newLeadsPreviousMonth) * 100)
            : newLeadsThisMonth > 0 ? 100 : 0;

        // Filter low stock products in JS (Prisma can't compare two columns)
        const filteredLowStockProducts = lowStockProducts
            .filter((p) => p.stock <= p.minStock)
            .slice(0, 5);

        // ── Build recent activities from audit logs ───────────────────────────
        const entityIcons: Record<string, string> = {
            Invoice: 'dollar-sign',
            Deal: 'trending-up',
            Contact: 'users',
            Product: 'package',
            Employee: 'user',
            Lead: 'target',
            Payment: 'credit-card',
            Quotation: 'file-text',
            PurchaseOrder: 'shopping-cart',
            StockMovement: 'package',
        };

        const recentActivities = recentAuditLogs.map((log) => ({
            id: log.id,
            icon: entityIcons[log.entity] || 'clipboard-list',
            title: `${log.action} ${log.entity}`,
            description: `${log.user?.name || 'User'} melakukan ${log.action.toLowerCase()} pada ${log.entity}`,
            amount: log.newValues || '',
            timestamp: log.createdAt.toISOString(),
            moduleId: log.entity.toLowerCase(),
        }));

        // ── Build alerts ──────────────────────────────────────────────────────
        const alerts: Array<{ id: string; type: string; title: string; message: string; moduleId: string }> = [];

        overdueInvoices.forEach((inv) => {
            alerts.push({
                id: `overdue-${inv.id}`,
                type: 'danger',
                title: 'Invoice Overdue',
                message: `Invoice ${inv.invoiceNumber} sudah overdue - ${inv.contact?.name || 'Customer'} - Rp ${Number(inv.total || 0).toLocaleString('id-ID')}`,
                moduleId: 'finance',
            });
        });

        filteredLowStockProducts.forEach((prod) => {
            alerts.push({
                id: `lowstock-${prod.id}`,
                type: 'warning',
                title: 'Stock Low',
                message: `${prod.name} (${prod.sku}) hanya tersisa ${prod.stock} unit`,
                moduleId: 'inventory',
            });
        });

        // ── Build response ────────────────────────────────────────────────────
        const stats = {
            // Finance
            revenue: {
                current: revenueCurrent,
                previous: revenuePrevious,
                change: revenueChange,
                currency: 'IDR',
            },
            outstandingInvoices: {
                count: outstandingInvoices.length,
                total: outstandingTotal,
            },
            expenses: {
                current: expensesCurrent,
                previous: expensesPrevious,
                change: expensesChange,
            },
            // CRM
            activeDeals,
            dealsWon: {
                current: dealsWonThisMonth,
                previous: dealsWonPreviousMonth,
                change: dealsWonChange,
            },
            newLeads: {
                current: newLeadsThisMonth,
                previous: newLeadsPreviousMonth,
                change: leadsChange,
            },
            // HR
            employees: {
                total: totalEmployees,
                active: activeEmployees,
            },
            // Inventory
            products: {
                total: totalProducts,
                lowStock: filteredLowStockProducts.length,
                lowStockItems: filteredLowStockProducts.map((p) => ({
                    id: p.id,
                    name: p.name,
                    stock: p.stock,
                    minStock: p.minStock,
                })),
            },
            // Activity & alerts
            recentActivities,
            alerts: alerts.slice(0, 5),
        };

        return NextResponse.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
