-- CreateIndex for PosOrder
CREATE INDEX "PosOrder_tenantId_idx" ON "PosOrder"("tenantId");
CREATE INDEX "PosOrder_sessionId_idx" ON "PosOrder"("sessionId");
CREATE INDEX "PosOrder_createdAt_idx" ON "PosOrder"("createdAt");

-- CreateIndex for PosOrderItem
CREATE INDEX "PosOrderItem_orderId_idx" ON "PosOrderItem"("orderId");
