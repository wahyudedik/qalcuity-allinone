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
