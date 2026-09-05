-- CreateTable
CREATE TABLE "PosKitchenStation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosKitchenStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosKitchenOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "transactionId" TEXT,
    "stationId" TEXT,
    "orderNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "estimatedMinutes" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "servedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosKitchenOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosKitchenOrderItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kitchenOrderId" TEXT NOT NULL,
    "transactionItemId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosKitchenOrderItem_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add fields to Product
ALTER TABLE "Product" ADD COLUMN "preparationMinutes" INTEGER;
ALTER TABLE "Product" ADD COLUMN "isPreparedItem" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add fields to PosTransactionItem
ALTER TABLE "PosTransactionItem" ADD COLUMN "itemNotes" TEXT;
ALTER TABLE "PosTransactionItem" ADD COLUMN "kitchenStatus" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PosKitchenStation_tenantId_name_key" ON "PosKitchenStation"("tenantId", "name");

-- CreateIndex
CREATE INDEX "PosKitchenStation_tenantId_isActive_idx" ON "PosKitchenStation"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "PosKitchenOrder_tenantId_status_idx" ON "PosKitchenOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PosKitchenOrder_tenantId_stationId_idx" ON "PosKitchenOrder"("tenantId", "stationId");

-- CreateIndex
CREATE INDEX "PosKitchenOrder_tenantId_createdAt_idx" ON "PosKitchenOrder"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "PosKitchenOrderItem_tenantId_kitchenOrderId_idx" ON "PosKitchenOrderItem"("tenantId", "kitchenOrderId");

-- CreateIndex
CREATE INDEX "PosKitchenOrderItem_tenantId_status_idx" ON "PosKitchenOrderItem"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "PosKitchenStation" ADD CONSTRAINT "PosKitchenStation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosKitchenOrder" ADD CONSTRAINT "PosKitchenOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosKitchenOrder" ADD CONSTRAINT "PosKitchenOrder_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "PosKitchenStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosKitchenOrderItem" ADD CONSTRAINT "PosKitchenOrderItem_kitchenOrderId_fkey" FOREIGN KEY ("kitchenOrderId") REFERENCES "PosKitchenOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
