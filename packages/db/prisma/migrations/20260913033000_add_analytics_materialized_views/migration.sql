-- ============================================
-- Migration: Add Analytics Materialized Views
-- Issue #13: Analytics Materialized Views
-- 
-- Materialized views untuk pre-computing aggregated data
-- yang sering digunakan di analytics routes.
-- 
-- CATATAN: Migration ini tidak mengubah Prisma schema.
-- Views dimaintain terpisah via raw SQL.
-- ============================================

-- ============================================
-- View 1: mv_daily_revenue
-- Daily revenue summary dari Invoice + Payment
-- Digunakan untuk: revenue charts, KPI calculations
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_revenue AS
SELECT
    i."tenantId",
    DATE(i."createdAt") AS date,
    COUNT(DISTINCT i.id) AS invoice_count,
    SUM(i.total) AS total_revenue,
    SUM(COALESCE(p.amount, 0)) AS total_paid
FROM "Invoice" i
LEFT JOIN "Payment" p ON p."invoiceId" = i.id
GROUP BY i."tenantId", DATE(i."createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_revenue
    ON mv_daily_revenue("tenantId", date);

-- ============================================
-- View 2: mv_top_products
-- Top products by sales dari InvoiceItem + Product
-- Digunakan untuk: product analytics, sales reports
-- 
-- CATATAN: InvoiceItem tidak punya tenantId langsung,
-- jadi kita join via Invoice untuk mendapatkan tenantId.
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_products AS
SELECT
    i."tenantId",
    ii."productId",
    p.name AS product_name,
    SUM(ii.quantity) AS total_quantity,
    SUM(ii."unitPrice" * ii.quantity) AS total_revenue
FROM "InvoiceItem" ii
JOIN "Invoice" i ON i.id = ii."invoiceId"
JOIN "Product" p ON p.id = ii."productId"
GROUP BY i."tenantId", ii."productId", p.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_products
    ON mv_top_products("tenantId", "productId");

-- ============================================
-- View 3: mv_pos_sales_summary
-- POS sales summary dari PosTransaction
-- Digunakan untuk: POS analytics, sales dashboards
-- 
-- CATATAN: PosTransaction menggunakan totalAmount
-- (bukan grandTotal). Tidak ada customerId field,
-- jadi unique_customers dihitung dari customerName.
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_pos_sales_summary AS
SELECT
    t."tenantId",
    DATE(t."createdAt") AS date,
    COUNT(DISTINCT t.id) AS transaction_count,
    SUM(t."totalAmount") AS total_sales,
    COUNT(DISTINCT t."customerName") FILTER (WHERE t."customerName" IS NOT NULL) AS unique_customers
FROM "PosTransaction" t
WHERE t.status = 'COMPLETED'
GROUP BY t."tenantId", DATE(t."createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_pos_sales_summary
    ON mv_pos_sales_summary("tenantId", date);

-- ============================================
-- Refresh Function
-- Refresh semua materialized views secara concurrent.
-- Menggunakan CONCURRENTLY agar tidak blocking reads.
-- 
-- Penggunaan: SELECT refresh_analytics_views();
-- Atau via API route: /api/analytics/refresh (POST)
-- ============================================
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_products;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_pos_sales_summary;
END;
$$ LANGUAGE plpgsql;
