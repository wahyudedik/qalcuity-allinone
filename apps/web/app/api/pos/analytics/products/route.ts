export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';
import { posAnalyticsDateRangeQuerySchema, formatZodError } from '@/lib/validation-schemas';

/**
 * GET /api/pos/analytics/products
 *
 * Product analytics -- top sellers, slow movers, category breakdown, profit margins.
 *
 * Query params:
 *   - dateFrom: ISO date string (default: 30 days ago)
 *   - dateTo: ISO date string (default: today)
 *   - limit: number of top products (default: 10)
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:analytics:products:${ip}`, 60, 60000);
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
        const queryValidation = posAnalyticsDateRangeQuerySchema.safeParse(
            Object.fromEntries(searchParams.entries())
        );
        if (!queryValidation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(queryValidation.error) },
                { status: 400 }
            );
        }
        const { dateFrom: dateFromStr, dateTo: dateToStr, limit } = queryValidation.data;

        const now = new Date();
        const dateTo = dateToStr ? new Date(dateToStr) : now;
        const dateFrom = dateFromStr
            ? new Date(dateFromStr)
            : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);

        // --- Top selling products ---
        const topProducts = await prisma.$queryRaw<
            Array<{
                product_id: string;
                product_name: string;
                product_sku: string;
                total_quantity: number;
                total_revenue: number;
                avg_unit_price: number;
                transaction_count: number;
            }>
        >(
            Prisma.sql`SELECT
                pti."productId" AS product_id,
                pti."productName" AS product_name,
                pti."productSku" AS product_sku,
                SUM(pti."quantity")::float AS total_quantity,
                SUM(pti."subtotal")::float AS total_revenue,
                AVG(pti."unitPrice")::float AS avg_unit_price,
                COUNT(DISTINCT pti."transactionId")::int AS transaction_count
            FROM "PosTransactionItem" pti
            INNER JOIN "PosTransaction" pt ON pt."id" = pti."transactionId"
            WHERE pt."tenantId" = ${tenantId}
              AND pt."status" = 'COMPLETED'
              AND pt."createdAt" >= ${dateFrom}
              AND pt."createdAt" <= ${endDate}
            GROUP BY pti."productId", pti."productName", pti."productSku"
            ORDER BY total_revenue DESC
            LIMIT ${limit}`
        );

        // --- Slow movers (products with lowest sales) ---
        // Products that exist but have few or no sales
        const slowMovers = await prisma.$queryRaw<
            Array<{
                product_id: string;
                product_name: string;
                product_sku: string;
                total_quantity: number;
                total_revenue: number;
            }>
        >(
            Prisma.sql`SELECT
                p."id" AS product_id,
                p."name" AS product_name,
                p."sku" AS product_sku,
                COALESCE(sales.total_quantity, 0) AS total_quantity,
                COALESCE(sales.total_revenue, 0) AS total_revenue
            FROM "Product" p
            LEFT JOIN (
                SELECT
                    pti."productId",
                    SUM(pti."quantity")::float AS total_quantity,
                    SUM(pti."subtotal")::float AS total_revenue
                FROM "PosTransactionItem" pti
                INNER JOIN "PosTransaction" pt ON pt."id" = pti."transactionId"
                WHERE pt."tenantId" = ${tenantId}
                  AND pt."status" = 'COMPLETED'
                  AND pt."createdAt" >= ${dateFrom}
                  AND pt."createdAt" <= ${endDate}
                GROUP BY pti."productId"
            ) sales ON sales."productId" = p."id"
            WHERE p."tenantId" = ${tenantId}
              AND p."isActive" = true
            ORDER BY COALESCE(sales.total_revenue, 0) ASC, p."name" ASC
            LIMIT ${limit}`
        );

        // --- Category breakdown ---
        const categoryBreakdown = await prisma.$queryRaw<
            Array<{
                category_name: string;
                total_quantity: number;
                total_revenue: number;
                product_count: number;
            }>
        >(
            Prisma.sql`SELECT
                COALESCE(c."name", 'Tanpa Kategori') AS category_name,
                SUM(pti."quantity")::float AS total_quantity,
                SUM(pti."subtotal")::float AS total_revenue,
                COUNT(DISTINCT pti."productId")::int AS product_count
            FROM "PosTransactionItem" pti
            INNER JOIN "PosTransaction" pt ON pt."id" = pti."transactionId"
            LEFT JOIN "Product" p ON p."id" = pti."productId"
            LEFT JOIN "Category" c ON c."id" = p."categoryId"
            WHERE pt."tenantId" = ${tenantId}
              AND pt."status" = 'COMPLETED'
              AND pt."createdAt" >= ${dateFrom}
              AND pt."createdAt" <= ${endDate}
            GROUP BY c."name"
            ORDER BY total_revenue DESC`
        );

        // --- Product profit margins ---
        const profitMargins = await prisma.$queryRaw<
            Array<{
                product_id: string;
                product_name: string;
                total_quantity: number;
                total_revenue: number;
                total_cost: number;
                profit: number;
                margin_percent: number;
            }>
        >(
            Prisma.sql`SELECT
                pti."productId" AS product_id,
                pti."productName" AS product_name,
                SUM(pti."quantity")::float AS total_quantity,
                SUM(pti."subtotal")::float AS total_revenue,
                SUM(pti."quantity" * p."cost")::float AS total_cost,
                SUM(pti."subtotal" - pti."quantity" * p."cost")::float AS profit,
                CASE
                    WHEN SUM(pti."subtotal") > 0
                    THEN ROUND((SUM(pti."subtotal" - pti."quantity" * p."cost") / SUM(pti."subtotal")) * 100, 2)
                    ELSE 0
                END AS margin_percent
            FROM "PosTransactionItem" pti
            INNER JOIN "PosTransaction" pt ON pt."id" = pti."transactionId"
            LEFT JOIN "Product" p ON p."id" = pti."productId"
            WHERE pt."tenantId" = ${tenantId}
              AND pt."status" = 'COMPLETED'
              AND pt."createdAt" >= ${dateFrom}
              AND pt."createdAt" <= ${endDate}
            GROUP BY pti."productId", pti."productName"
            ORDER BY profit DESC
            LIMIT ${limit}`
        );

        return NextResponse.json({
            success: true,
            data: {
                topProducts: topProducts.map((p) => ({
                    productId: p.product_id,
                    productName: p.product_name,
                    productSku: p.product_sku,
                    totalQuantity: Math.round(p.total_quantity),
                    totalRevenue: Math.round((p.total_revenue || 0) * 100) / 100,
                    avgUnitPrice: Math.round((p.avg_unit_price || 0) * 100) / 100,
                    transactionCount: p.transaction_count,
                })),
                slowMovers: slowMovers.map((p) => ({
                    productId: p.product_id,
                    productName: p.product_name,
                    productSku: p.product_sku,
                    totalQuantity: Math.round(p.total_quantity || 0),
                    totalRevenue: Math.round((p.total_revenue || 0) * 100) / 100,
                })),
                categoryBreakdown: categoryBreakdown.map((c) => ({
                    categoryName: c.category_name,
                    totalQuantity: Math.round(c.total_quantity),
                    totalRevenue: Math.round((c.total_revenue || 0) * 100) / 100,
                    productCount: c.product_count,
                })),
                profitMargins: profitMargins.map((p) => ({
                    productId: p.product_id,
                    productName: p.product_name,
                    totalQuantity: Math.round(p.total_quantity),
                    totalRevenue: Math.round((p.total_revenue || 0) * 100) / 100,
                    totalCost: Math.round((p.total_cost || 0) * 100) / 100,
                    profit: Math.round((p.profit || 0) * 100) / 100,
                    marginPercent: Number(p.margin_percent || 0),
                })),
                dateFrom: dateFrom.toISOString(),
                dateTo: endDate.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
