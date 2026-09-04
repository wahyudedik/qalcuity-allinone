-- CreateTable: PosTerminal
CREATE TABLE "PosTerminal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosTerminal_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PosSession
CREATE TABLE "PosSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "cashierName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openingCash" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "closingCash" DECIMAL(65,30),
    "expectedCash" DECIMAL(65,30),
    "variance" DECIMAL(65,30),
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PosTransaction
CREATE TABLE "PosTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "transactionNo" TEXT NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "discountPercent" DECIMAL(65,30),
    "taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "changeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PosTransactionItem
CREATE TABLE "PosTransactionItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productSku" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "discountPercent" DECIMAL(65,30),
    "taxRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosTransactionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PosPayment
CREATE TABLE "PosPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PosRefund
CREATE TABLE "PosRefund" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "refundNo" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosRefund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: PosTerminal
CREATE UNIQUE INDEX "PosTerminal_tenantId_code_key" ON "PosTerminal"("tenantId", "code");
CREATE INDEX "PosTerminal_tenantId_idx" ON "PosTerminal"("tenantId");

-- CreateIndex: PosSession
CREATE INDEX "PosSession_tenantId_idx" ON "PosSession"("tenantId");
CREATE INDEX "PosSession_tenantId_terminalId_idx" ON "PosSession"("tenantId", "terminalId");
CREATE INDEX "PosSession_tenantId_status_idx" ON "PosSession"("tenantId", "status");

-- CreateIndex: PosTransaction
CREATE UNIQUE INDEX "PosTransaction_tenantId_transactionNo_key" ON "PosTransaction"("tenantId", "transactionNo");
CREATE INDEX "PosTransaction_tenantId_idx" ON "PosTransaction"("tenantId");
CREATE INDEX "PosTransaction_tenantId_sessionId_idx" ON "PosTransaction"("tenantId", "sessionId");
CREATE INDEX "PosTransaction_tenantId_createdAt_idx" ON "PosTransaction"("tenantId", "createdAt");

-- CreateIndex: PosTransactionItem
CREATE INDEX "PosTransactionItem_tenantId_idx" ON "PosTransactionItem"("tenantId");
CREATE INDEX "PosTransactionItem_tenantId_transactionId_idx" ON "PosTransactionItem"("tenantId", "transactionId");

-- CreateIndex: PosPayment
CREATE INDEX "PosPayment_tenantId_idx" ON "PosPayment"("tenantId");
CREATE INDEX "PosPayment_tenantId_transactionId_idx" ON "PosPayment"("tenantId", "transactionId");

-- CreateIndex: PosRefund
CREATE UNIQUE INDEX "PosRefund_tenantId_refundNo_key" ON "PosRefund"("tenantId", "refundNo");
CREATE INDEX "PosRefund_tenantId_idx" ON "PosRefund"("tenantId");
CREATE INDEX "PosRefund_tenantId_transactionId_idx" ON "PosRefund"("tenantId", "transactionId");

-- AddForeignKey: PosTerminal
ALTER TABLE "PosTerminal" ADD CONSTRAINT "PosTerminal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: PosSession
ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "PosTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: PosTransaction
ALTER TABLE "PosTransaction" ADD CONSTRAINT "PosTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosTransaction" ADD CONSTRAINT "PosTransaction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PosSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: PosTransactionItem
ALTER TABLE "PosTransactionItem" ADD CONSTRAINT "PosTransactionItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosTransactionItem" ADD CONSTRAINT "PosTransactionItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "PosTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: PosPayment
ALTER TABLE "PosPayment" ADD CONSTRAINT "PosPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPayment" ADD CONSTRAINT "PosPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "PosTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: PosRefund
ALTER TABLE "PosRefund" ADD CONSTRAINT "PosRefund_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosRefund" ADD CONSTRAINT "PosRefund_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "PosTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
