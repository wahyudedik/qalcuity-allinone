-- CreateTable
CREATE TABLE "CoAAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "parentId" TEXT,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoAAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unmatched',
    "matchedAccountId" TEXT,
    "bankReference" TEXT,
    "discrepancyNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoAAccount_tenantId_idx" ON "CoAAccount"("tenantId");

-- CreateIndex
CREATE INDEX "CoAAccount_parentId_idx" ON "CoAAccount"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "CoAAccount_tenantId_code_key" ON "CoAAccount"("tenantId", "code");

-- CreateIndex
CREATE INDEX "BankTransaction_tenantId_status_idx" ON "BankTransaction"("tenantId", "status");

-- CreateIndex
CREATE INDEX "BankTransaction_matchedAccountId_idx" ON "BankTransaction"("matchedAccountId");

-- AddForeignKey
ALTER TABLE "CoAAccount" ADD CONSTRAINT "CoAAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoAAccount" ADD CONSTRAINT "CoAAccount_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CoAAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_matchedAccountId_fkey" FOREIGN KEY ("matchedAccountId") REFERENCES "CoAAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
