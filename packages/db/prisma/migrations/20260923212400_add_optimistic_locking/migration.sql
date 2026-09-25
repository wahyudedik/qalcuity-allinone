-- AlterTable: Add version column for Optimistic Concurrency Control (OCC)
-- Applied to critical transactional models only.

ALTER TABLE "Invoice" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PurchaseOrder" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Quotation" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Deal" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Employee" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
