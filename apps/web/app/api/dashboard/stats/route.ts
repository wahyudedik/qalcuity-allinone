import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET() {
    try {
        const auth = await requireAuth();
        const tenantId = auth.tenantId;

        // Query real data from database
        const [
            totalInvoices,
            paidInvoices,
            totalDeals,
            totalContacts,
            totalProducts,
            totalEmployees,
            recentAuditLogs,
            overdueInvoices,
            lowStockProducts,
        ] = await Promise.all([
            // Total invoices this month
            prisma.invoice.aggregate({
                where: {
                    tenantId,
                    createdAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
                _sum: { total: true },
                _count: true,
            }),
            // Paid invoices this month
            prisma.invoice.aggregate({
                where: {
                    tenantId,
                    status: 'PAID',
                    createdAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
                _sum: { total: true },
                _count: true,
            }),
            // Total active deals
            prisma.deal.count({
                where: {
                    tenantId,
                    stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
                },
            }),
            // Total contacts
            prisma.contact.count({ where: { tenantId } }),
            // Total products
            prisma.product.count({ where: { tenantId } }),
            // Total employees
            prisma.employee.count({ where: { tenantId } }),
            // Recent audit logs for activities
            prisma.auditLog.findMany({
                where: { tenantId },
                include: { user: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            // Overdue invoices
            prisma.invoice.findMany({
                where: {
                    tenantId,
                    status: { in: ['SENT', 'OVERDUE'] },
                    dueDate: { lt: new Date() },
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
            // Low stock products
            prisma.product.findMany({
                where: {
                    tenantId,
                    stock: { lte: 10 },
                },
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    stock: true,
                },
                take: 5,
            }),
        ]);

        // Calculate revenue
        const currentRevenue = Number(paidInvoices._sum.total || 0);
        const totalRevenue = Number(totalInvoices._sum.total || 0);

        // Build recent activities from audit logs
        const recentActivities = recentAuditLogs.map((log: any) => {
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

            return {
                id: log.id,
                icon: entityIcons[log.entity] || 'clipboard-list',
                title: `${log.action} ${log.entity}`,
                description: `${log.user?.name || 'User'} melakukan ${log.action.toLowerCase()} pada ${log.entity}`,
                amount: log.newValues || '',
                timestamp: log.createdAt.toISOString(),
                moduleId: log.entity.toLowerCase(),
            };
        });

        // Build alerts
        const alerts: Array<{ id: string; type: string; title: string; message: string; moduleId: string }> = [];

        overdueInvoices.forEach((inv: any) => {
            alerts.push({
                id: `overdue-${inv.id}`,
                type: 'danger',
                title: 'Invoice Overdue',
                message: `Invoice ${inv.invoiceNumber} sudah overdue - ${inv.contact?.name || 'Customer'} - Rp ${Number(inv.total || 0).toLocaleString('id-ID')}`,
                moduleId: 'finance',
            });
        });

        lowStockProducts.forEach((prod: any) => {
            alerts.push({
                id: `lowstock-${prod.id}`,
                type: 'warning',
                title: 'Stock Low',
                message: `${prod.name} (${prod.sku}) hanya tersisa ${prod.stock} unit`,
                moduleId: 'inventory',
            });
        });

        // If no real data, provide minimal defaults
        const stats = {
            revenue: {
                current: currentRevenue,
                previous: totalRevenue - currentRevenue,
                change: totalRevenue > 0 ? Math.round((currentRevenue / (totalRevenue || 1)) * 100) : 0,
                currency: 'IDR',
            },
            orders: {
                current: totalInvoices._count,
                previous: 0,
                change: 0,
            },
            customers: {
                current: totalContacts,
                previous: 0,
                change: 0,
            },
            products: {
                current: totalProducts,
                previous: 0,
                change: 0,
            },
            recentActivities,
            alerts: alerts.slice(0, 5),
        };

        return NextResponse.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        // Fallback to mock data if auth fails (e.g., in development without session)
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({
                success: true,
                data: {
                    revenue: { current: 0, previous: 0, change: 0, currency: 'IDR' },
                    orders: { current: 0, previous: 0, change: 0 },
                    customers: { current: 0, previous: 0, change: 0 },
                    products: { current: 0, previous: 0, change: 0 },
                    recentActivities: [],
                    alerts: [],
                },
            });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
