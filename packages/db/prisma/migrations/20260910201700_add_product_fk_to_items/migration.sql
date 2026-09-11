-- Migration: Add productId FK to InvoiceItem and PurchaseOrderItem
-- Purpose: Link invoice/PO items to products for stock management and reporting
-- Nullable FK — does not break existing data

-- ============================================
-- InvoiceItem: Add productId column + index + FK
-- ============================================
ALTER TABLE "InvoiceItem" ADD COLUMN "productId" TEXT;

CREATE INDEX "InvoiceItem_productId_idx" ON "InvoiceItem"("productId");

ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- PurchaseOrderItem: Add productId column + index + FK
-- ============================================
ALTER TABLE "PurchaseOrderItem" ADD COLUMN "productId" TEXT;

CREATE INDEX "PurchaseOrderItem_productId_idx" ON "PurchaseOrderItem"("productId");

ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
