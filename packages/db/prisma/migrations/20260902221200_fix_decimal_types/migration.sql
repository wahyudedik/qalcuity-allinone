-- Migration: fix_decimal_types
-- Changes monetary fields from Int to Decimal(19,4) and upgrades Decimal(15,2) to Decimal(19,4)
-- This ensures consistent precision for all monetary/currency fields across the platform

-- ============================================
-- PART 1: Int -> Decimal(19,4) conversions
-- ============================================

-- SubscriptionPlan.price: Int -> Decimal(19,4)
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "price" SET DATA TYPE DECIMAL(19,4) USING "price"::DECIMAL(19,4);
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "price" SET DEFAULT 0;

-- BillingPayment.amount: Int -> Decimal(19,4)
ALTER TABLE "BillingPayment" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,4) USING "amount"::DECIMAL(19,4);
ALTER TABLE "BillingPayment" ALTER COLUMN "amount" SET DEFAULT 0;

-- Plan.priceMonthly: Int -> Decimal(19,4)
ALTER TABLE "Plan" ALTER COLUMN "priceMonthly" SET DATA TYPE DECIMAL(19,4) USING "priceMonthly"::DECIMAL(19,4);
ALTER TABLE "Plan" ALTER COLUMN "priceMonthly" SET DEFAULT 0;

-- Plan.priceYearly: Int? -> Decimal? (19,4)
ALTER TABLE "Plan" ALTER COLUMN "priceYearly" SET DATA TYPE DECIMAL(19,4) USING "priceYearly"::DECIMAL(19,4);

-- ============================================
-- PART 2: Upgrade Decimal(15,2) -> Decimal(19,4)
-- ============================================

-- Invoice model
ALTER TABLE "Invoice" ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(19,4);
ALTER TABLE "Invoice" ALTER COLUMN "taxAmount" SET DATA TYPE DECIMAL(19,4);
ALTER TABLE "Invoice" ALTER COLUMN "totalBeforeTax" SET DATA TYPE DECIMAL(19,4);
ALTER TABLE "Invoice" ALTER COLUMN "total" SET DATA TYPE DECIMAL(19,4);

-- InvoiceItem model
ALTER TABLE "InvoiceItem" ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(19,4);
ALTER TABLE "InvoiceItem" ALTER COLUMN "total" SET DATA TYPE DECIMAL(19,4);

-- Payment model
ALTER TABLE "Payment" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,4);

-- PurchaseOrder model
ALTER TABLE "PurchaseOrder" ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(19,4);
ALTER TABLE "PurchaseOrder" ALTER COLUMN "taxAmount" SET DATA TYPE DECIMAL(19,4);
ALTER TABLE "PurchaseOrder" ALTER COLUMN "total" SET DATA TYPE DECIMAL(19,4);

-- PurchaseOrderItem model
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(19,4);
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "total" SET DATA TYPE DECIMAL(19,4);

-- Quotation model
ALTER TABLE "Quotation" ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(19,4);
ALTER TABLE "Quotation" ALTER COLUMN "taxAmount" SET DATA TYPE DECIMAL(19,4);
ALTER TABLE "Quotation" ALTER COLUMN "discount" SET DATA TYPE DECIMAL(19,4);
ALTER TABLE "Quotation" ALTER COLUMN "total" SET DATA TYPE DECIMAL(19,4);

-- QuotationItem model
ALTER TABLE "QuotationItem" ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(19,4);
ALTER TABLE "QuotationItem" ALTER COLUMN "total" SET DATA TYPE DECIMAL(19,4);

-- Lead model
ALTER TABLE "Lead" ALTER COLUMN "value" SET DATA TYPE DECIMAL(19,4);

-- Deal model
ALTER TABLE "Deal" ALTER COLUMN "value" SET DATA TYPE DECIMAL(19,4);

-- Product model
ALTER TABLE "Product" ALTER COLUMN "price" SET DATA TYPE DECIMAL(19,4);
ALTER TABLE "Product" ALTER COLUMN "cost" SET DATA TYPE DECIMAL(19,4);

-- Employee model
ALTER TABLE "Employee" ALTER COLUMN "salary" SET DATA TYPE DECIMAL(19,4);

-- PayrollRecord model
ALTER TABLE "PayrollRecord" ALTER COLUMN "baseSalary" SET DATA TYPE DECIMAL(19,4);
ALTER TABLE "PayrollRecord" ALTER COLUMN "allowances" SET DATA TYPE DECIMAL(19,4);
ALTER TABLE "PayrollRecord" ALTER COLUMN "deductions" SET DATA TYPE DECIMAL(19,4);
ALTER TABLE "PayrollRecord" ALTER COLUMN "bonus" SET DATA TYPE DECIMAL(19,4);
ALTER TABLE "PayrollRecord" ALTER COLUMN "netSalary" SET DATA TYPE DECIMAL(19,4);

-- CoAAccount model
ALTER TABLE "CoAAccount" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(19,4);

-- BankTransaction model
ALTER TABLE "BankTransaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,4);

-- JournalEntry model
ALTER TABLE "JournalEntry" ALTER COLUMN "totalDebit" SET DATA TYPE DECIMAL(19,4);
ALTER TABLE "JournalEntry" ALTER COLUMN "totalCredit" SET DATA TYPE DECIMAL(19,4);

-- JournalEntryItem model
ALTER TABLE "JournalEntryItem" ALTER COLUMN "debit" SET DATA TYPE DECIMAL(19,4);
ALTER TABLE "JournalEntryItem" ALTER COLUMN "credit" SET DATA TYPE DECIMAL(19,4);
