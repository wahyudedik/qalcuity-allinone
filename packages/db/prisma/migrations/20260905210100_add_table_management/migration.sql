-- CreateTable
CREATE TABLE "PosTable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "zone" TEXT,
    "floor" TEXT,
    "posX" DOUBLE PRECISION,
    "posY" DOUBLE PRECISION,
    "width" DOUBLE PRECISION DEFAULT 1,
    "height" DOUBLE PRECISION DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentSessionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosTableReservation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tableId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "partySize" INTEGER NOT NULL,
    "reservationTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosTableReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PosTable_tenantId_number_key" ON "PosTable"("tenantId", "number");

-- CreateIndex
CREATE INDEX "PosTable_tenantId_status_idx" ON "PosTable"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PosTable_tenantId_zone_idx" ON "PosTable"("tenantId", "zone");

-- CreateIndex
CREATE INDEX "PosTableReservation_tenantId_reservationTime_idx" ON "PosTableReservation"("tenantId", "reservationTime");

-- CreateIndex
CREATE INDEX "PosTableReservation_tenantId_status_idx" ON "PosTableReservation"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "PosTable" ADD CONSTRAINT "PosTable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosTableReservation" ADD CONSTRAINT "PosTableReservation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosTableReservation" ADD CONSTRAINT "PosTableReservation_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "PosTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
