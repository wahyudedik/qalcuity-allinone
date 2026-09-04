import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:dashboard:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [
            totalTransactions,
            activeSessions,
            todayTransactions,
            recentTransactions,
            paymentMethodSummary,
        ] = await Promise.all([
            prisma.posTransaction.count({
                where: { tenantId, status: 'COMPLETED' },
            }),
            prisma.posSession.count({
                where: { tenantId, status: 'OPEN' },
            }),
            prisma.posTransaction.aggregate({
                where: {
                    tenantId,
                    status: 'COMPLETED',
                    createdAt: { gte: today, lt: tomorrow },
                },
                _count: true,
                _sum: { totalAmount: true, taxAmount: true },
            }),
            prisma.posTransaction.findMany({
                where: { tenantId },
                select: {
                    id: true,
                    transactionNo: true,
                    totalAmount: true,
                    paymentMethod: true,
                    status: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            prisma.posTransaction.groupBy({
                by: ['paymentMethod'],
                where: {
                    tenantId,
                    status: 'COMPLETED',
                    createdAt: { gte: today, lt: tomorrow },
                },
                _count: true,
                _sum: { totalAmount: true },
            }),
        ]);

        const data = {
            todaySales: todayTransactions._sum.totalAmount ? Number(todayTransactions._sum.totalAmount) : 0,
            todayTax: todayTransactions._sum.taxAmount ? Number(todayTransactions._sum.taxAmount) : 0,
            todayTransactionCount: todayTransactions._count,
            totalTransactions,
            activeSessions,
            recentTransactions: recentTransactions.map((t) => ({
                id: t.id,
                transactionNo: t.transactionNo,
                totalAmount: Number(t.totalAmount),
                paymentMethod: t.paymentMethod,
                status: t.status,
                createdAt: t.createdAt.toISOString(),
            })),
            paymentMethods: paymentMethodSummary.map((pm) => ({
                method: pm.paymentMethod,
                count: pm._count,
                total: pm._sum.totalAmount ? Number(pm._sum.totalAmount) : 0,
            })),
        };

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}
