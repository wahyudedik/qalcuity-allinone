-- AlterTable: Add idempotencyKey field to PosTransaction
ALTER TABLE "PosTransaction" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex: Unique constraint for idempotency (tenantId + idempotencyKey)
-- Note: PostgreSQL allows multiple NULL values in unique constraints,
-- so existing transactions without idempotencyKey won't conflict.
CREATE UNIQUE INDEX "PosTransaction_tenantId_idempotencyKey_key" ON "PosTransaction"("tenantId", "idempotencyKey");
