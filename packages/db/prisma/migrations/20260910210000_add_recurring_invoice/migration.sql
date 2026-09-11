-- Migration: Add Payment Reminder Logs, Recurring Invoices, and related tables
-- Date: 2026-09-10
-- Phase 2: ERP Strengthening

-- ============================================
-- 1. PaymentReminderLog Table
-- ============================================
CREATE TABLE "PaymentReminderLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "reminderCount" INTEGER NOT NULL DEFAULT 1,
    "daysOverdue" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReminderLog_pkey" PRIMARY KEY ("id")
);

-- Indexes for PaymentReminderLog
CREATE INDEX "PaymentReminderLog_tenantId_idx" ON "PaymentReminderLog"("tenantId");
CREATE INDEX "PaymentReminderLog_invoiceId_idx" ON "PaymentReminderLog"("invoiceId");
CREATE INDEX "PaymentReminderLog_sentAt_idx" ON "PaymentReminderLog"("sentAt");

-- Foreign keys for PaymentReminderLog
ALTER TABLE "PaymentReminderLog" ADD CONSTRAINT "PaymentReminderLog_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentReminderLog" ADD CONSTRAINT "PaymentReminderLog_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- 2. RecurringInvoice Table
-- ============================================
CREATE TABLE "RecurringInvoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "taxRate" DECIMAL(5,2),
    "frequency" TEXT NOT NULL,
    "dayOfMonth" INTEGER,
    "dayOfWeek" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "lastRunDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringInvoice_pkey" PRIMARY KEY ("id")
);

-- Indexes for RecurringInvoice
CREATE INDEX "RecurringInvoice_tenantId_idx" ON "RecurringInvoice"("tenantId");
CREATE INDEX "RecurringInvoice_nextRunDate_idx" ON "RecurringInvoice"("nextRunDate");
CREATE INDEX "RecurringInvoice_status_idx" ON "RecurringInvoice"("status");

-- Foreign keys for RecurringInvoice
ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- 3. RecurringInvoiceItem Table
-- ============================================
CREATE TABLE "RecurringInvoiceItem" (
    "id" TEXT NOT NULL,
    "recurringInvoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- Indexes for RecurringInvoiceItem
CREATE INDEX "RecurringInvoiceItem_recurringInvoiceId_idx" ON "RecurringInvoiceItem"("recurringInvoiceId");

-- Foreign keys for RecurringInvoiceItem
ALTER TABLE "RecurringInvoiceItem" ADD CONSTRAINT "RecurringInvoiceItem_recurringInvoiceId_fkey"
    FOREIGN KEY ("recurringInvoiceId") REFERENCES "RecurringInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecurringInvoiceItem" ADD CONSTRAINT "RecurringInvoiceItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- 4. Add recurringInvoiceId to Invoice table
-- ============================================
ALTER TABLE "Invoice" ADD COLUMN "recurringInvoiceId" TEXT;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_recurringInvoiceId_fkey"
    FOREIGN KEY ("recurringInvoiceId") REFERENCES "RecurringInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- 5. Add relations to Tenant model (via Prisma schema only — no SQL needed for reverse relations)
-- ============================================
-- Note: The reverse relations (Tenant.paymentReminderLogs, Tenant.recurringInvoiceTemplates,
-- Contact.recurringInvoiceTemplates, Invoice.paymentReminderLogs, Invoice.recurringInvoice,
-- Product.recurringInvoiceItems) are handled by Prisma schema and don't need explicit SQL.
