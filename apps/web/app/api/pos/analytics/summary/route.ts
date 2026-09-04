import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:analytics:summary:${ip}`, 60, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        // Today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Yesterday's date range
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const [todayData, yesterdayData, activeSessions, totalTerminals] = await Promise.all([
            prisma.posTransaction.aggregate({
                where: {
                    tenantId,
                    status: 'COMPLETED',
                    createdAt: { gte: today, lt: tomorrow },
                },
                _count: true,
                _sum: { totalAmount: true, taxAmount: true },
                _avg: { totalAmount: true },
            }),
            prisma.posTransaction.aggregate({
                where: {
                    tenantId,
                    status: 'COMPLETED',
                    createdAt: { gte: yesterday, lt: today },
                },
                _count: true,
                _sum: { totalAmount: true, taxAmount: true },
                _avg: { totalAmount: true },
            }),
            prisma.posSession.count({
                where: { tenantId, status: 'OPEN' },
            }),
            prisma.posTerminal.count({
                where: { tenantId, status: 'ACTIVE' },
            }),
        ]);

        const todaySales = todayData._sum.totalAmount ? Number(todayData._sum.totalAmount) : 0;
        const yesterdaySales = yesterdayData._sum.totalAmount ? Number(yesterdayData._sum.totalAmount) : 0;
        const todayTax = todayData._sum.taxAmount ? Number(todayData._sum.taxAmount) : 0;
        const yesterdayTax = yesterdayData._sum.taxAmount ? Number(yesterdayData._sum.taxAmount) : 0;
        const todayCount = todayData._count;
        const yesterdayCount = yesterdayData._count;
        const todayAvg = todayData._avg.totalAmount ? Number(todayData._avg.totalAmount) : 0;
        const yesterdayAvg = yesterdayData._avg.totalAmount ? Number(yesterdayData._avg.totalAmount) : 0;

        // Calculate changes
        const salesChange = yesterdaySales > 0
            ? ((todaySales - yesterdaySales) / yesterdaySales) * 100
            : todaySales > 0 ? 100 : 0;
        const countChange = yesterdayCount > 0
            ? ((todayCount - yesterdayCount) / yesterdayCount) * 100
            : todayCount > 0 ? 100 : 0;
        const avgChange = yesterdayAvg > 0
            ? ((todayAvg - yesterdayAvg) / yesterdayAvg) * 100
            : todayAvg > 0 ? 100 : 0;

        return NextResponse.json({
            success: true,
            data: {
                today: {
                    sales: todaySales,
                    tax: todayTax,
                    transactionCount: todayCount,
                    avgTransactionValue: todayAvg,
                },
                yesterday: {
                    sales: yesterdaySales,
                    tax: yesterdayTax,
                    transactionCount: yesterdayCount,
                    avgTransactionValue: yesterdayAvg,
                },
                change: {
                    salesPercent: Math.round(salesChange * 100) / 100,
                    countPercent: Math.round(countChange * 100) / 100,
                    avgPercent: Math.round(avgChange * 100) / 100,
                },
                activeSessions,
                totalTerminals,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
