import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';

/**
 * GET /api/pos/analytics/customers
 *
 * Customer analytics — repeat rate, avg spend, top customers, loyalty stats.
 *
 * Query params:
 *   - dateFrom: ISO date string (default: 30 days ago)
 *   - dateTo: ISO date string (default: today)
 *   - limit: number of top customers (default: 10)
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:analytics:customers:${ip}`, 60, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const { searchParams } = new URL(request.url);
        const now = new Date();
        const dateTo = searchParams.get('dateTo')
            ? new Date(searchParams.get('dateTo')!)
            : now;
        const dateFrom = searchParams.get('dateFrom')
            ? new Date(searchParams.get('dateFrom')!)
            : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const limit = parseInt(searchParams.get('limit') || '10');

        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);

        // ─── Total unique customers in period ───
        // Customer = identified by customerName or customerPhone
        const totalCustomersResult = await prisma.$queryRawUnsafe<
            Array<{ total_customers: number }>
        >(
            `SELECT COUNT(DISTINCT COALESCE(NULLIF("customerName", ''), "customerPhone"))::text AS total_customers
            FROM "PosTransaction"
            WHERE "tenantId" = $1
              AND "status" = 'COMPLETED'
              AND "createdAt" >= $2
              AND "createdAt" <= $3
              AND (COALESCE(NULLIF("customerName", ''), "customerPhone") IS NOT NULL)`,
            tenantId,
            dateFrom,
            endDate
        );
        const totalCustomers = totalCustomersResult[0]?.total_customers || 0;

        // ─── Total transactions (including anonymous) ───
        const totalTransactionsResult = await prisma.$queryRawUnsafe<
            Array<{ total_transactions: number }>
        >(
            `SELECT COUNT(*)::int AS total_transactions
            FROM "PosTransaction"
            WHERE "tenantId" = $1
              AND "status" = 'COMPLETED'
              AND "createdAt" >= $2
              AND "createdAt" <= $3`,
            tenantId,
            dateFrom,
            endDate
        );
        const totalTransactions = totalTransactionsResult[0]?.total_transactions || 0;

        // ─── Repeat customers (2+ transactions) ───
        const repeatCustomersResult = await prisma.$queryRawUnsafe<
            Array<{ repeat_customers: number }>
        >(
            `SELECT COUNT(*)::int AS repeat_customers
            FROM (
                SELECT COALESCE(NULLIF("customerName", ''), "customerPhone") AS customer_id
                FROM "PosTransaction"
                WHERE "tenantId" = $1
                  AND "status" = 'COMPLETED'
                  AND "createdAt" >= $2
                  AND "createdAt" <= $3
                  AND (COALESCE(NULLIF("customerName", ''), "customerPhone") IS NOT NULL)
                GROUP BY customer_id
                HAVING COUNT(*) >= 2
            ) sub`,
            tenantId,
            dateFrom,
            endDate
        );
        const repeatCustomers = repeatCustomersResult[0]?.repeat_customers || 0;
        const repeatRate = totalCustomers > 0
            ? Math.round((repeatCustomers / totalCustomers) * 10000) / 100
            : 0;

        // ─── Top customers by total spend ───
        const topCustomers = await prisma.$queryRawUnsafe<
            Array<{
                customer_name: string;
                customer_phone: string;
                total_spend: number;
                transaction_count: number;
                avg_spend: number;
                first_purchase: Date;
                last_purchase: Date;
            }>
        >(
            `SELECT
                COALESCE(NULLIF("customerName", ''), "customerPhone") AS customer_name,
                "customerPhone" AS customer_phone,
                SUM("totalAmount")::float AS total_spend,
                COUNT(*)::int AS transaction_count,
                AVG("totalAmount")::float AS avg_spend,
                MIN("createdAt") AS first_purchase,
                MAX("createdAt") AS last_purchase
            FROM "PosTransaction"
            WHERE "tenantId" = $1
              AND "status" = 'COMPLETED'
              AND "createdAt" >= $2
              AND "createdAt" <= $3
              AND (COALESCE(NULLIF("customerName", ''), "customerPhone") IS NOT NULL)
            GROUP BY customer_name, "customerPhone"
            ORDER BY total_spend DESC
            LIMIT $4`,
            tenantId,
            dateFrom,
            endDate,
            limit
        );

        // ─── Loyalty member stats ───
        const loyaltyStats = await prisma.$queryRawUnsafe<
            Array<{
                total_members: number;
                total_points: number;
                avg_points: number;
                total_spent: number;
                tiers: Array<{ tier: string; count: number }>;
            }>
        >(
            `SELECT
                COUNT(*)::int AS total_members,
                SUM(points)::int AS total_points,
                AVG(points)::float AS avg_points,
                SUM("totalSpent")::float AS total_spent
            FROM "LoyaltyMember"
            WHERE "tenantId" = $1`,
            tenantId
        );

        const tierBreakdown = await prisma.$queryRawUnsafe<
            Array<{ tier: string; count: number }>
        >(
            `SELECT tier, COUNT(*)::int AS count
            FROM "LoyaltyMember"
            WHERE "tenantId" = $1
            GROUP BY tier
            ORDER BY count DESC`,
            tenantId
        );

        // ─── New vs returning customers ───
        const newCustomersResult = await prisma.$queryRawUnsafe<
            Array<{ new_customers: number }>
        >(
            `SELECT COUNT(DISTINCT customer_key)::int AS new_customers
            FROM (
                SELECT
                    COALESCE(NULLIF("customerName", ''), "customerPhone") AS customer_key,
                    MIN("createdAt") AS first_purchase
                FROM "PosTransaction"
                WHERE "tenantId" = $1
                  AND "status" = 'COMPLETED'
                  AND COALESCE(NULLIF("customerName", ''), "customerPhone") IS NOT NULL
                GROUP BY customer_key
            ) sub
            WHERE first_purchase >= $2 AND first_purchase <= $3`,
            tenantId,
            dateFrom,
            endDate
        );
        const newCustomers = newCustomersResult[0]?.new_customers || 0;
        const returningCustomers = totalCustomers - newCustomers;

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    totalCustomers,
                    totalTransactions,
                    repeatCustomers,
                    repeatRate,
                    newCustomers,
                    returningCustomers,
                    avgCustomerSpend: totalCustomers > 0
                        ? Math.round(
                            (topCustomers.reduce((sum, c) => sum + (c.total_spend || 0), 0) /
                                Math.max(topCustomers.length, 1)) * 100
                        ) / 100
                        : 0,
                },
                topCustomers: topCustomers.map((c) => ({
                    customerName: c.customer_name,
                    customerPhone: c.customer_phone,
                    totalSpend: Math.round((c.total_spend || 0) * 100) / 100,
                    transactionCount: c.transaction_count,
                    avgSpend: Math.round((c.avg_spend || 0) * 100) / 100,
                    firstPurchase: c.first_purchase,
                    lastPurchase: c.last_purchase,
                })),
                loyalty: {
                    totalMembers: loyaltyStats[0]?.total_members || 0,
                    totalPoints: loyaltyStats[0]?.total_points || 0,
                    avgPoints: Math.round((loyaltyStats[0]?.avg_points || 0) * 100) / 100,
                    totalSpent: Math.round((loyaltyStats[0]?.total_spent || 0) * 100) / 100,
                    tierBreakdown: tierBreakdown.map((t) => ({
                        tier: t.tier,
                        count: t.count,
                    })),
                },
                dateFrom: dateFrom.toISOString(),
                dateTo: endDate.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
