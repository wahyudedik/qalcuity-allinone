// ─── Analytics Read Model Service ─────────────────────────────────────────────
// Service layer untuk query materialized views.
// Menggunakan prisma.$queryRawUnsafe() karena Prisma tidak support MV natively.
//
// Semua queries menggunakan parameterized queries (bukan string concatenation)
// untuk mencegah SQL injection. tenantId WAJIB ada di setiap query.
//
// @see packages/db/prisma/migrations/20260916000000_add_analytics_read_model/migration.sql

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MonthlyRevenue {
    tenantId: string;
    month: number;
    year: number;
    categoryId: string | null;
    totalRevenue: number;
    invoiceCount: number;
    avgInvoiceValue: number;
}

export interface MonthlyExpenses {
    tenantId: string;
    month: number;
    year: number;
    categoryId: string;
    totalExpenses: number;
    paymentCount: number;
}

export interface ProfitLossSummary {
    tenantId: string;
    month: number;
    year: number;
    revenue: number;
    expenses: number;
    grossProfit: number;
    profitMargin: number;
}

export interface ARAging {
    tenantId: string;
    customerId: string | null;
    invoiceId: string;
    invoiceNumber: string;
    totalAmount: number;
    current: number;
    days30: number;
    days60: number;
    days90: number;
    over90: number;
    dueDate: Date;
    daysOutstanding: number;
}

export interface APAging {
    tenantId: string;
    supplierId: string | null;
    poId: string;
    poNumber: string;
    totalAmount: number;
    current: number;
    days30: number;
    days60: number;
    days90: number;
    over90: number;
    deliveryDate: Date | null;
    daysOutstanding: number;
}

export interface TopProduct {
    tenantId: string;
    productId: string;
    productName: string;
    productSku: string;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
}

export interface TopCustomer {
    tenantId: string;
    customerId: string;
    customerName: string;
    totalRevenue: number;
    invoiceCount: number;
    avgOrderValue: number;
}

export interface InventorySummary {
    tenantId: string;
    productId: string;
    productName: string;
    productSku: string;
    categoryId: string | null;
    stock: number;
    reorderLevel: number;
    stockValue: number;
    unitPrice: number;
    unitCost: number;
    stockStatus: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';
}

export interface SalesByCategory {
    tenantId: string;
    categoryId: string;
    categoryName: string;
    totalRevenue: number;
    totalQuantity: number;
    productCount: number;
}

export interface EmployeeAttendanceSummary {
    tenantId: string;
    employeeId: string;
    month: number;
    year: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    totalHours: number;
    totalRecords: number;
}

export interface CRMPipelineValue {
    tenantId: string;
    stage: string;
    dealCount: number;
    totalValue: number;
    avgDealValue: number;
    weightedValue: number;
}

export interface POSHourlySales {
    tenantId: string;
    hour: number;
    dayOfWeek: number;
    transactionCount: number;
    totalRevenue: number;
    avgTicketSize: number;
}

export interface MonthlyRevenueFilters {
    month?: number;
    year?: number;
    categoryId?: string;
}

export interface RefreshResult {
    viewName: string;
    success: boolean;
    duration: number;
    error?: string;
}

// ─── Materialized View Names ─────────────────────────────────────────────────

const ALL_VIEWS = [
    'mv_monthly_revenue',
    'mv_monthly_expenses',
    'mv_profit_loss_summary',
    'mv_accounts_receivable_aging',
    'mv_accounts_payable_aging',
    'mv_top_products',
    'mv_top_customers',
    'mv_inventory_summary',
    'mv_sales_by_category',
    'mv_employee_attendance_summary',
    'mv_crm_pipeline_value',
    'mv_pos_hourly_sales',
] as const;

// ─── Refresh Functions ───────────────────────────────────────────────────────

/**
 * Refresh semua materialized views secara concurrent (non-blocking).
 * Menggunakan REFRESH MATERIALIZED VIEW CONCURRENTLY agar query tidak ter-block.
 *
 * @returns Array of refresh results per view
 */
export async function refreshAllViews(): Promise<RefreshResult[]> {
    const results: RefreshResult[] = [];

    for (const viewName of ALL_VIEWS) {
        const result = await refreshView(viewName);
        results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    logger.info(`[Analytics ReadModel] Refresh complete: ${successCount} success, ${failCount} failed`);

    return results;
}

/**
 * Refresh satu materialized view.
 * @param viewName - Nama materialized view
 * @returns Refresh result
 */
export async function refreshView(viewName: string): Promise<RefreshResult> {
    const startTime = Date.now();
    try {
        await prisma.$executeRawUnsafe(
            `REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`
        );
        const duration = Date.now() - startTime;
        return { viewName, success: true, duration };
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[Analytics ReadModel] Failed to refresh ${viewName}:`, error);
        return { viewName, success: false, duration, error: errorMessage };
    }
}

// ─── Query Functions ─────────────────────────────────────────────────────────

/**
 * Query monthly revenue dari materialized view.
 */
export async function getMonthlyRevenue(
    tenantId: string,
    filters?: MonthlyRevenueFilters
): Promise<MonthlyRevenue[]> {
    let query = `
        SELECT "tenantId", month, year, "categoryId",
               "totalRevenue", "invoiceCount", "avgInvoiceValue"
        FROM mv_monthly_revenue
        WHERE "tenantId" = $1
    `;
    const params: (string | number)[] = [tenantId];
    let paramIndex = 2;

    if (filters?.month !== undefined) {
        query += ` AND month = $${paramIndex}`;
        params.push(filters.month);
        paramIndex++;
    }
    if (filters?.year !== undefined) {
        query += ` AND year = $${paramIndex}`;
        params.push(filters.year);
        paramIndex++;
    }
    if (filters?.categoryId) {
        query += ` AND "categoryId" = $${paramIndex}`;
        params.push(filters.categoryId);
        paramIndex++;
    }

    query += ' ORDER BY year DESC, month DESC';

    return prisma.$queryRawUnsafe<MonthlyRevenue[]>(query, ...params);
}

/**
 * Query monthly expenses dari materialized view.
 */
export async function getMonthlyExpenses(
    tenantId: string,
    filters?: MonthlyRevenueFilters
): Promise<MonthlyExpenses[]> {
    let query = `
        SELECT "tenantId", month, year, "categoryId",
               "totalExpenses", "paymentCount"
        FROM mv_monthly_expenses
        WHERE "tenantId" = $1
    `;
    const params: (string | number)[] = [tenantId];
    let paramIndex = 2;

    if (filters?.month !== undefined) {
        query += ` AND month = $${paramIndex}`;
        params.push(filters.month);
        paramIndex++;
    }
    if (filters?.year !== undefined) {
        query += ` AND year = $${paramIndex}`;
        params.push(filters.year);
        paramIndex++;
    }

    query += ' ORDER BY year DESC, month DESC';

    return prisma.$queryRawUnsafe<MonthlyExpenses[]>(query, ...params);
}

/**
 * Query profit & loss summary dari materialized view.
 */
export async function getProfitLossSummary(
    tenantId: string,
    filters?: MonthlyRevenueFilters
): Promise<ProfitLossSummary[]> {
    let query = `
        SELECT "tenantId", month, year, revenue, expenses,
               "grossProfit", "profitMargin"
        FROM mv_profit_loss_summary
        WHERE "tenantId" = $1
    `;
    const params: (string | number)[] = [tenantId];
    let paramIndex = 2;

    if (filters?.month !== undefined) {
        query += ` AND month = $${paramIndex}`;
        params.push(filters.month);
        paramIndex++;
    }
    if (filters?.year !== undefined) {
        query += ` AND year = $${paramIndex}`;
        params.push(filters.year);
        paramIndex++;
    }

    query += ' ORDER BY year DESC, month DESC';

    return prisma.$queryRawUnsafe<ProfitLossSummary[]>(query, ...params);
}

/**
 * Query accounts receivable aging dari materialized view.
 */
export async function getARAging(tenantId: string): Promise<ARAging[]> {
    return prisma.$queryRawUnsafe<ARAging[]>(
        `SELECT "tenantId", "customerId", "invoiceId", "invoiceNumber",
                "totalAmount", current, "days30", "days60", "days90", "over90",
                "dueDate", "daysOutstanding"
         FROM mv_accounts_receivable_aging
         WHERE "tenantId" = $1
         ORDER BY "daysOutstanding" DESC`,
        tenantId
    );
}

/**
 * Query accounts payable aging dari materialized view.
 */
export async function getAPAging(tenantId: string): Promise<APAging[]> {
    return prisma.$queryRawUnsafe<APAging[]>(
        `SELECT "tenantId", "supplierId", "poId", "poNumber",
                "totalAmount", current, "days30", "days60", "days90", "over90",
                "deliveryDate", "daysOutstanding"
         FROM mv_accounts_payable_aging
         WHERE "tenantId" = $1
         ORDER BY "daysOutstanding" DESC`,
        tenantId
    );
}

/**
 * Query top products dari materialized view.
 */
export async function getTopProducts(
    tenantId: string,
    limit: number = 10
): Promise<TopProduct[]> {
    return prisma.$queryRawUnsafe<TopProduct[]>(
        `SELECT "tenantId", "productId", "productName", "productSku",
                "totalQuantity", "totalRevenue", "orderCount"
         FROM mv_top_products
         WHERE "tenantId" = $1
         ORDER BY "totalRevenue" DESC
         LIMIT $2`,
        tenantId,
        limit
    );
}

/**
 * Query top customers dari materialized view.
 */
export async function getTopCustomers(
    tenantId: string,
    limit: number = 10
): Promise<TopCustomer[]> {
    return prisma.$queryRawUnsafe<TopCustomer[]>(
        `SELECT "tenantId", "customerId", "customerName",
                "totalRevenue", "invoiceCount", "avgOrderValue"
         FROM mv_top_customers
         WHERE "tenantId" = $1
         ORDER BY "totalRevenue" DESC
         LIMIT $2`,
        tenantId,
        limit
    );
}

/**
 * Query inventory summary dari materialized view.
 */
export async function getInventorySummary(tenantId: string): Promise<InventorySummary[]> {
    return prisma.$queryRawUnsafe<InventorySummary[]>(
        `SELECT "tenantId", "productId", "productName", "productSku",
                "categoryId", stock, "reorderLevel", "stockValue",
                "unitPrice", "unitCost", "stockStatus"
         FROM mv_inventory_summary
         WHERE "tenantId" = $1
         ORDER BY "stockValue" DESC`,
        tenantId
    );
}

/**
 * Query sales by category dari materialized view.
 */
export async function getSalesByCategory(tenantId: string): Promise<SalesByCategory[]> {
    return prisma.$queryRawUnsafe<SalesByCategory[]>(
        `SELECT "tenantId", "categoryId", "categoryName",
                "totalRevenue", "totalQuantity", "productCount"
         FROM mv_sales_by_category
         WHERE "tenantId" = $1
         ORDER BY "totalRevenue" DESC`,
        tenantId
    );
}

/**
 * Query employee attendance summary dari materialized view.
 */
export async function getEmployeeAttendanceSummary(
    tenantId: string,
    month: number,
    year: number
): Promise<EmployeeAttendanceSummary[]> {
    return prisma.$queryRawUnsafe<EmployeeAttendanceSummary[]>(
        `SELECT "tenantId", "employeeId", month, year,
                "presentDays", "absentDays", "lateDays",
                "totalHours", "totalRecords"
         FROM mv_employee_attendance_summary
         WHERE "tenantId" = $1 AND month = $2 AND year = $3
         ORDER BY "presentDays" DESC`,
        tenantId,
        month,
        year
    );
}

/**
 * Query CRM pipeline value dari materialized view.
 */
export async function getCRMPipelineValue(tenantId: string): Promise<CRMPipelineValue[]> {
    return prisma.$queryRawUnsafe<CRMPipelineValue[]>(
        `SELECT "tenantId", stage, "dealCount", "totalValue",
                "avgDealValue", "weightedValue"
         FROM mv_crm_pipeline_value
         WHERE "tenantId" = $1
         ORDER BY "totalValue" DESC`,
        tenantId
    );
}

/**
 * Query POS hourly sales pattern dari materialized view.
 */
export async function getPOSHourlySales(tenantId: string): Promise<POSHourlySales[]> {
    return prisma.$queryRawUnsafe<POSHourlySales[]>(
        `SELECT "tenantId", hour, "dayOfWeek",
                "transactionCount", "totalRevenue", "avgTicketSize"
         FROM mv_pos_hourly_sales
         WHERE "tenantId" = $1
         ORDER BY "dayOfWeek", hour`,
        tenantId
    );
}

/**
 * Check apakah materialized views sudah ada di database.
 * Berguna untuk fallback ke live queries jika MV belum di-create.
 */
export async function materializedViewsExist(): Promise<boolean> {
    try {
        const result = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
            `SELECT tablename FROM pg_tables
             WHERE schemaname = 'public' AND tablename LIKE 'mv_%'`
        );
        return result.length >= ALL_VIEWS.length;
    } catch {
        return false;
    }
}
