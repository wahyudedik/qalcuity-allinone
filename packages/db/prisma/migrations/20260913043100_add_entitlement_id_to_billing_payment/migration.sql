-- AlterTable: Add nullable entitlementId to BillingPayment (idempotent)
DO $$ BEGIN
    ALTER TABLE "BillingPayment" ADD COLUMN "entitlementId" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- CreateIndex: Index on entitlementId for fast lookups (idempotent)
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS "BillingPayment_entitlementId_idx" ON "BillingPayment"("entitlementId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- AddForeignKey: Link BillingPayment -> TenantEntitlement (SET NULL on delete) (idempotent)
DO $$ BEGIN
    ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_entitlementId_fkey"
      FOREIGN KEY ("entitlementId") REFERENCES "TenantEntitlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
