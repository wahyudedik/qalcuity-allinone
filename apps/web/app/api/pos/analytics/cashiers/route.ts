import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:analytics:cashiers:${ip}`, 60, 60000);
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
        const period = searchParams.get('period') || 'monthly';

        // Build date filter
        const now = new Date();
        let dateFrom: Date;

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
                dateFrom.setMonth(dateFrom.getMonth() - 1);
        }

        // Get all sessions with their cashier info and transaction aggregates
        const sessions = await prisma.posSession.findMany({
            where: {
                tenantId,
                createdAt: { gte: dateFrom },
            },
            include: {
                transactions: {
                    where: { status: 'COMPLETED' },
                    select: {
                        totalAmount: true,
                        createdAt: true,
                    },
                },
            },
        });

        // Group by cashier
        const cashierMap = new Map<string, {
            cashierName: string;
            transactionCount: number;
            totalSales: number;
            sessionCount: number;
        }>();

        for (const session of sessions) {
            const existing = cashierMap.get(session.cashierId) || {
                cashierName: session.cashierName,
                transactionCount: 0,
                totalSales: 0,
                sessionCount: 0,
            };
            existing.sessionCount += 1;
            for (const tx of session.transactions) {
                existing.transactionCount += 1;
                existing.totalSales += Number(tx.totalAmount);
            }
            cashierMap.set(session.cashierId, existing);
        }

        const cashiers = Array.from(cashierMap.entries())
            .map(([cashierId, data]) => ({
                cashierId,
                cashierName: data.cashierName,
                transactionCount: data.transactionCount,
                totalSales: data.totalSales,
                avgTransactionValue: data.transactionCount > 0
                    ? data.totalSales / data.transactionCount
                    : 0,
                sessionCount: data.sessionCount,
            }))
            .sort((a, b) => b.totalSales - a.totalSales);

        return NextResponse.json({
            success: true,
            data: {
                cashiers,
                meta: {
                    period,
                    startDate: dateFrom.toISOString(),
                    totalCashiers: cashiers.length,
                },
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
