-- AlterTable: Add soft delete fields to financial models
-- This migration adds deletedAt and deletedBy columns to all financial models
-- for audit trail and data recovery purposes.

-- Invoice
ALTER TABLE "Invoice" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedBy" TEXT;
CREATE INDEX "Invoice_deletedAt_idx" ON "Invoice"("deletedAt");

-- Payment
ALTER TABLE "Payment" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedBy" TEXT;
CREATE INDEX "Payment_deletedAt_idx" ON "Payment"("deletedAt");

-- PurchaseOrder
ALTER TABLE "PurchaseOrder" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedBy" TEXT;
CREATE INDEX "PurchaseOrder_deletedAt_idx" ON "PurchaseOrder"("deletedAt");

-- Quotation
ALTER TABLE "Quotation" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedBy" TEXT;
CREATE INDEX "Quotation_deletedAt_idx" ON "Quotation"("deletedAt");

-- Bill
ALTER TABLE "Bill" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedBy" TEXT;
CREATE INDEX "Bill_deletedAt_idx" ON "Bill"("deletedAt");

-- Expense
ALTER TABLE "Expense" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedBy" TEXT;
CREATE INDEX "Expense_deletedAt_idx" ON "Expense"("deletedAt");

-- PosTransaction
ALTER TABLE "PosTransaction" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedBy" TEXT;
CREATE INDEX "PosTransaction_deletedAt_idx" ON "PosTransaction"("deletedAt");

-- PosRefund
ALTER TABLE "PosRefund" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedBy" TEXT;
CREATE INDEX "PosRefund_deletedAt_idx" ON "PosRefund"("deletedAt");
