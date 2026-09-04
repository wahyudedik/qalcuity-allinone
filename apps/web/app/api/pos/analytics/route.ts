import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:analytics:${ip}`, 60, 60000);
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
        const period = searchParams.get('period') || 'daily';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Build date filter
        const now = new Date();
        let dateFrom: Date;
        let dateTo: Date = new Date(now);
        dateTo.setHours(23, 59, 59, 999);

        if (startDate && endDate) {
            dateFrom = new Date(startDate);
            dateTo = new Date(endDate);
            dateTo.setHours(23, 59, 59, 999);
        } else {
            switch (period) {
                case 'daily':
                    dateFrom = new Date(now);
                    dateFrom.setHours(0, 0, 0, 0);
                    break;
                case 'weekly':
                    dateFrom = new Date(now);
                    dateFrom.setDate(dateFrom.getDate() - 7);
                    break;
                case 'monthly':
                    dateFrom = new Date(now);
                    dateFrom.setMonth(dateFrom.getMonth() - 1);
                    break;
                default:
                    dateFrom = new Date(now);
                    dateFrom.setDate(dateFrom.getDate() - 30);
            }
        }

        const whereClause: Prisma.PosTransactionWhereInput = {
            tenantId,
            status: 'COMPLETED',
            createdAt: { gte: dateFrom, lte: dateTo },
        };

        // Fetch all completed transactions with items for the period
        const transactions = await prisma.posTransaction.findMany({
            where: whereClause,
            include: {
                items: {
                    select: {
                        productName: true,
                        quantity: true,
                        unitPrice: true,
                        subtotal: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        // 1. Sales by period (grouped by date)
        const salesByPeriodMap = new Map<string, { total: number; count: number }>();
        for (const tx of transactions) {
            const dateKey = tx.createdAt.toISOString().split('T')[0];
            const entry = salesByPeriodMap.get(dateKey) || { total: 0, count: 0 };
            entry.total += Number(tx.totalAmount);
            entry.count += 1;
            salesByPeriodMap.set(dateKey, entry);
        }
        const salesByPeriod = Array.from(salesByPeriodMap.entries())
            .map(([date, v]) => ({ date, total: v.total, count: v.count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // 2. Top products (top 10 by quantity sold)
        const productMap = new Map<string, { quantity: number; revenue: number }>();
        for (const tx of transactions) {
            for (const item of tx.items) {
                const prod = productMap.get(item.productName) || { quantity: 0, revenue: 0 };
                prod.quantity += Number(item.quantity);
                prod.revenue += Number(item.subtotal);
                productMap.set(item.productName, prod);
            }
        }
        const topProducts = Array.from(productMap.entries())
            .map(([name, v]) => ({ name, ...v }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        // 3. Sales by category (need to join with products)
        const productNames = Array.from(productMap.keys());
        const products = await prisma.product.findMany({
            where: { tenantId, name: { in: productNames } },
            select: { name: true, categoryId: true, category: { select: { name: true } } },
        });
        const productNameToCategory = new Map<string, string>();
        for (const p of products) {
            productNameToCategory.set(p.name, p.category?.name || 'Lainnya');
        }

        const categoryMap = new Map<string, { quantity: number; revenue: number }>();
        for (const [name, prod] of productMap) {
            const cat = productNameToCategory.get(name) || 'Lainnya';
            const entry = categoryMap.get(cat) || { quantity: 0, revenue: 0 };
            entry.quantity += prod.quantity;
            entry.revenue += prod.revenue;
            categoryMap.set(cat, entry);
        }
        const salesByCategory = Array.from(categoryMap.entries())
            .map(([category, v]) => ({ category, ...v }))
            .sort((a, b) => b.revenue - a.revenue);

        // 4. Hourly trend (for today only, or for the selected period)
        const hourlyMap = new Map<number, { count: number; total: number }>();
        for (let h = 0; h < 24; h++) {
            hourlyMap.set(h, { count: 0, total: 0 });
        }
        for (const tx of transactions) {
            const hour = tx.createdAt.getHours();
            const entry = hourlyMap.get(hour)!;
            entry.count += 1;
            entry.total += Number(tx.totalAmount);
        }
        const hourlyTrend = Array.from(hourlyMap.entries())
            .map(([hour, v]) => ({ hour, ...v }));

        // 5. Payment method breakdown
        const paymentMap = new Map<string, { count: number; total: number }>();
        for (const tx of transactions) {
            const entry = paymentMap.get(tx.paymentMethod) || { count: 0, total: 0 };
            entry.count += 1;
            entry.total += Number(tx.totalAmount);
            paymentMap.set(tx.paymentMethod, entry);
        }
        const totalTxCount = transactions.length;
        const paymentMethodBreakdown = Array.from(paymentMap.entries())
            .map(([method, v]) => ({
                method,
                count: v.count,
                total: v.total,
                percentage: totalTxCount > 0 ? Math.round((v.count / totalTxCount) * 100) : 0,
            }))
            .sort((a, b) => b.total - a.total);

        return NextResponse.json({
            success: true,
            data: {
                salesByPeriod,
                topProducts,
                salesByCategory,
                hourlyTrend,
                paymentMethodBreakdown,
                meta: {
                    period,
                    startDate: dateFrom.toISOString(),
                    endDate: dateTo.toISOString(),
                    totalTransactions: totalTxCount,
                },
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
