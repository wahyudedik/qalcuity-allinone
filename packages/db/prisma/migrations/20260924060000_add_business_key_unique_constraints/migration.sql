-- Migration: Add unique constraints on business keys per tenant
-- This prevents duplicate invoice numbers, payment numbers, PO numbers, and quotation numbers
-- within the same tenant — critical for financial data integrity.
--
-- WARNING: If there are existing duplicate records, this migration will FAIL.
-- Before applying, run these checks:
--   SELECT "tenantId", "invoiceNumber", COUNT(*) FROM "Invoice" GROUP BY "tenantId", "invoiceNumber" HAVING COUNT(*) > 1;
--   SELECT "tenantId", "paymentNumber", COUNT(*) FROM "Payment" GROUP BY "tenantId", "paymentNumber" HAVING COUNT(*) > 1;
--   SELECT "tenantId", "poNumber", COUNT(*) FROM "PurchaseOrder" GROUP BY "tenantId", "poNumber" HAVING COUNT(*) > 1;
--   SELECT "tenantId", "quotationNumber", COUNT(*) FROM "Quotation" GROUP BY "tenantId", "quotationNumber" HAVING COUNT(*) > 1;
--
-- If duplicates exist, deduplicate BEFORE applying this migration.

-- ============================================
-- Invoice: Unique invoice number per tenant
-- ============================================
CREATE UNIQUE INDEX "Invoice_tenantId_invoiceNumber_key" ON "Invoice"("tenantId", "invoiceNumber");

-- ============================================
-- Payment: Unique payment number per tenant
-- ============================================
CREATE UNIQUE INDEX "Payment_tenantId_paymentNumber_key" ON "Payment"("tenantId", "paymentNumber");

-- ============================================
-- PurchaseOrder: Unique PO number per tenant
-- ============================================
CREATE UNIQUE INDEX "PurchaseOrder_tenantId_poNumber_key" ON "PurchaseOrder"("tenantId", "poNumber");

-- ============================================
-- Quotation: Unique quotation number per tenant
-- ============================================
CREATE UNIQUE INDEX "Quotation_tenantId_quotationNumber_key" ON "Quotation"("tenantId", "quotationNumber");
