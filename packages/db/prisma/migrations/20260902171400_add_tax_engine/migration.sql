-- AlterTable: Add taxCode and totalBeforeTax to Invoice, change default taxRate from 11 to 0
ALTER TABLE "Invoice" ADD COLUMN "taxCode" TEXT,
ADD COLUMN "totalBeforeTax" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ALTER COLUMN "taxRate" SET DEFAULT 0;

-- CreateTable: TaxRate
CREATE TABLE "TaxRate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'VAT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: TaxRate
CREATE INDEX "TaxRate_tenantId_idx" ON "TaxRate"("tenantId");
CREATE UNIQUE INDEX "TaxRate_tenantId_code_key" ON "TaxRate"("tenantId", "code");

-- AddForeignKey: TaxRate -> Tenant
ALTER TABLE "TaxRate" ADD CONSTRAINT "TaxRate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
