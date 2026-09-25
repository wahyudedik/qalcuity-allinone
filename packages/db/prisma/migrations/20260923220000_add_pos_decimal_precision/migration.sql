-- Migration: Add explicit Decimal precision to POS monetary fields
-- Changes bare NUMERIC (unspecified precision) to NUMERIC(precision, scale)
-- This ensures consistent monetary precision across the codebase.
--
-- Precision Guide:
--   @db.Decimal(19, 4) => NUMERIC(19, 4) -- monetary fields (up to 999,999,999,999.9999)
--   @db.Decimal(10, 2) => NUMERIC(10, 2) -- quantity fields
--   @db.Decimal(5, 2)  => NUMERIC(5, 2)  -- percentage/rate fields (up to 999.99)
--
-- Note: PostgreSQL handles NUMERIC => NUMERIC(precision, scale) conversion automatically.
-- Existing data is preserved; values exceeding new precision will cause an error
-- (which is the desired behavior -- catch data issues early).

-- ============================================
-- Pre-flight: Drop materialized views that depend on PosTransaction columns
-- PostgreSQL cannot ALTER COLUMN TYPE when a view/rule depends on that column.
-- These views will be recreated after all ALTER statements complete.
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS "mv_pos_hourly_sales";

-- ============================================
-- PosSession: Cash management fields
-- ============================================
ALTER TABLE "PosSession" ALTER COLUMN "openingCash" TYPE NUMERIC(19,4);
ALTER TABLE "PosSession" ALTER COLUMN "closingCash" TYPE NUMERIC(19,4);
ALTER TABLE "PosSession" ALTER COLUMN "expectedCash" TYPE NUMERIC(19,4);
ALTER TABLE "PosSession" ALTER COLUMN "variance" TYPE NUMERIC(19,4);

-- ============================================
-- PosTransaction: Transaction-level monetary fields
-- ============================================
ALTER TABLE "PosTransaction" ALTER COLUMN "subtotal" TYPE NUMERIC(19,4);
ALTER TABLE "PosTransaction" ALTER COLUMN "discountAmount" TYPE NUMERIC(19,4);
ALTER TABLE "PosTransaction" ALTER COLUMN "discountPercent" TYPE NUMERIC(5,2);

-- Add missing discount/promo columns if they don't exist yet
-- (schema.prisma expects these but no prior migration added them to production)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PosTransaction' AND column_name = 'discountType') THEN
        ALTER TABLE "PosTransaction" ADD COLUMN "discountType" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PosTransaction' AND column_name = 'discountValue') THEN
        ALTER TABLE "PosTransaction" ADD COLUMN "discountValue" NUMERIC(65,30) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PosTransaction' AND column_name = 'promoCode') THEN
        ALTER TABLE "PosTransaction" ADD COLUMN "promoCode" TEXT;
    END IF;
END $$;

ALTER TABLE "PosTransaction" ALTER COLUMN "discountValue" TYPE NUMERIC(19,4);
ALTER TABLE "PosTransaction" ALTER COLUMN "taxAmount" TYPE NUMERIC(19,4);
ALTER TABLE "PosTransaction" ALTER COLUMN "totalAmount" TYPE NUMERIC(19,4);
ALTER TABLE "PosTransaction" ALTER COLUMN "paidAmount" TYPE NUMERIC(19,4);
ALTER TABLE "PosTransaction" ALTER COLUMN "changeAmount" TYPE NUMERIC(19,4);

-- ============================================
-- PosTransactionItem: Line-item fields
-- ============================================
ALTER TABLE "PosTransactionItem" ALTER COLUMN "quantity" TYPE NUMERIC(10,2);
ALTER TABLE "PosTransactionItem" ALTER COLUMN "unitPrice" TYPE NUMERIC(19,4);
ALTER TABLE "PosTransactionItem" ALTER COLUMN "discountAmount" TYPE NUMERIC(19,4);
ALTER TABLE "PosTransactionItem" ALTER COLUMN "discountPercent" TYPE NUMERIC(5,2);
ALTER TABLE "PosTransactionItem" ALTER COLUMN "taxRate" TYPE NUMERIC(5,2);
ALTER TABLE "PosTransactionItem" ALTER COLUMN "taxAmount" TYPE NUMERIC(19,4);
ALTER TABLE "PosTransactionItem" ALTER COLUMN "subtotal" TYPE NUMERIC(19,4);

-- ============================================
-- PosPayment: Payment amount
-- ============================================
ALTER TABLE "PosPayment" ALTER COLUMN "amount" TYPE NUMERIC(19,4);

-- ============================================
-- PosRefund: Refund amount
-- ============================================
ALTER TABLE "PosRefund" ALTER COLUMN "amount" TYPE NUMERIC(19,4);

-- ============================================
-- Post-flight: Recreate materialized views
-- Recreated from: migration 20260916000000_add_analytics_read_model
-- ============================================

-- mv_pos_hourly_sales — POS hourly sales pattern
-- Source: PosTransaction
CREATE MATERIALIZED VIEW IF NOT EXISTS "mv_pos_hourly_sales" AS
SELECT
    pt."tenantId",
    EXTRACT(HOUR FROM pt."createdAt")::int AS hour,
    EXTRACT(DOW FROM pt."createdAt")::int AS "dayOfWeek",
    COUNT(pt.id)::int AS "transactionCount",
    COALESCE(SUM(pt."totalAmount"), 0)::double precision AS "totalRevenue",
    CASE
        WHEN COUNT(pt.id) > 0
        THEN (COALESCE(SUM(pt."totalAmount"), 0) / COUNT(pt.id))::double precision
        ELSE 0
    END AS "avgTicketSize"
FROM "PosTransaction" pt
WHERE pt.status = 'COMPLETED'
GROUP BY pt."tenantId", EXTRACT(HOUR FROM pt."createdAt"), EXTRACT(DOW FROM pt."createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_mv_pos_hourly_sales_pk"
    ON "mv_pos_hourly_sales" ("tenantId", hour, "dayOfWeek");
CREATE INDEX IF NOT EXISTS "idx_mv_pos_hourly_sales_tenant"
    ON "mv_pos_hourly_sales" ("tenantId");
