-- Migration: Add soft delete fields to financial models
-- This migration adds deletedAt and deletedBy columns to all financial models
-- for audit trail and data recovery purposes.
--
-- FIXED: Bill and Expense tables were never created via migrations (billing models
-- migration was a stub). This migration now creates them IF NOT EXISTS.
-- All ALTER TABLE statements are wrapped in DO blocks to handle idempotent re-runs
-- (in case of partial application before the previous failure).

-- ============================================
-- Invoice (exists since init migration)
-- ============================================
DO $$ BEGIN
    ALTER TABLE "Invoice" ADD COLUMN "deletedAt" TIMESTAMP(3);
    ALTER TABLE "Invoice" ADD COLUMN "deletedBy" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "Invoice_deletedAt_idx" ON "Invoice"("deletedAt");

-- ============================================
-- Payment (exists since init migration)
-- ============================================
DO $$ BEGIN
    ALTER TABLE "Payment" ADD COLUMN "deletedAt" TIMESTAMP(3);
    ALTER TABLE "Payment" ADD COLUMN "deletedBy" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "Payment_deletedAt_idx" ON "Payment"("deletedAt");

-- ============================================
-- PurchaseOrder (exists since init migration)
-- ============================================
DO $$ BEGIN
    ALTER TABLE "PurchaseOrder" ADD COLUMN "deletedAt" TIMESTAMP(3);
    ALTER TABLE "PurchaseOrder" ADD COLUMN "deletedBy" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "PurchaseOrder_deletedAt_idx" ON "PurchaseOrder"("deletedAt");

-- ============================================
-- Quotation (exists since init migration)
-- ============================================
DO $$ BEGIN
    ALTER TABLE "Quotation" ADD COLUMN "deletedAt" TIMESTAMP(3);
    ALTER TABLE "Quotation" ADD COLUMN "deletedBy" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "Quotation_deletedAt_idx" ON "Quotation"("deletedAt");

-- ============================================
-- Bill: table was never created via migrations
-- (billing models migration 20260829174415 was a stub)
-- Create the table with ALL columns including soft delete fields.
-- ============================================
CREATE TABLE IF NOT EXISTS "Bill" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "vendorId" TEXT,
    "vendorName" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(19,4) NOT NULL,
    "taxAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(19,4) NOT NULL,
    "paidAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- Add indexes for Bill
CREATE INDEX IF NOT EXISTS "Bill_tenantId_status_idx" ON "Bill"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Bill_tenantId_dueDate_idx" ON "Bill"("tenantId", "dueDate");
CREATE INDEX IF NOT EXISTS "Bill_deletedAt_idx" ON "Bill"("deletedAt");

-- Unique constraint on (tenantId, billNumber)
DO $$ BEGIN
    ALTER TABLE "Bill" ADD CONSTRAINT "Bill_tenantId_billNumber_key" UNIQUE ("tenantId", "billNumber");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Foreign key: Bill.tenantId -> Tenant.id
DO $$ BEGIN
    ALTER TABLE "Bill" ADD CONSTRAINT "Bill_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- Expense: table was never created via migrations
-- Create the table with ALL columns including soft delete fields.
-- ============================================
CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "expenseNumber" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "taxAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(19,4) NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "receiptUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- Add indexes for Expense
CREATE INDEX IF NOT EXISTS "Expense_tenantId_status_idx" ON "Expense"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Expense_tenantId_category_idx" ON "Expense"("tenantId", "category");
CREATE INDEX IF NOT EXISTS "Expense_tenantId_expenseDate_idx" ON "Expense"("tenantId", "expenseDate");
CREATE INDEX IF NOT EXISTS "Expense_deletedAt_idx" ON "Expense"("deletedAt");

-- Unique constraint on (tenantId, expenseNumber)
DO $$ BEGIN
    ALTER TABLE "Expense" ADD CONSTRAINT "Expense_tenantId_expenseNumber_key" UNIQUE ("tenantId", "expenseNumber");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Foreign key: Expense.tenantId -> Tenant.id
DO $$ BEGIN
    ALTER TABLE "Expense" ADD CONSTRAINT "Expense_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- PosTransaction (exists since add_pos_models migration)
-- ============================================
DO $$ BEGIN
    ALTER TABLE "PosTransaction" ADD COLUMN "deletedAt" TIMESTAMP(3);
    ALTER TABLE "PosTransaction" ADD COLUMN "deletedBy" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "PosTransaction_deletedAt_idx" ON "PosTransaction"("deletedAt");

-- ============================================
-- PosRefund (exists since add_pos_models migration)
-- ============================================
DO $$ BEGIN
    ALTER TABLE "PosRefund" ADD COLUMN "deletedAt" TIMESTAMP(3);
    ALTER TABLE "PosRefund" ADD COLUMN "deletedBy" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "PosRefund_deletedAt_idx" ON "PosRefund"("deletedAt");
