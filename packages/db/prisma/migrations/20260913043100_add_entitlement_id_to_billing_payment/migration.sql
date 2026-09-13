-- AlterTable: Add nullable entitlementId to BillingPayment
ALTER TABLE "BillingPayment" ADD COLUMN "entitlementId" TEXT;

-- CreateIndex: Index on entitlementId for fast lookups
CREATE INDEX "BillingPayment_entitlementId_idx" ON "BillingPayment"("entitlementId");

-- AddForeignKey: Link BillingPayment → TenantEntitlement (SET NULL on delete)
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_entitlementId_fkey"
  FOREIGN KEY ("entitlementId") REFERENCES "TenantEntitlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: Map existing BillingPayment.subscriptionId → TenantSubscription → TenantEntitlement
UPDATE "BillingPayment" bp
SET "entitlementId" = te.id
FROM "TenantSubscription" ts
INNER JOIN "TenantEntitlement" te ON te."tenantId" = ts."tenantId"
WHERE bp."subscriptionId" = ts.id
  AND te.id IS NOT NULL;
