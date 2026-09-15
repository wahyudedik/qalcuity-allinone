-- CreateIndex: PosTransaction (status index not in init)
CREATE INDEX "PosTransaction_tenantId_status_idx" ON "PosTransaction"("tenantId", "status");

-- CreateIndex: PosTransactionItem (productId index not in init)
CREATE INDEX "PosTransactionItem_tenantId_productId_idx" ON "PosTransactionItem"("tenantId", "productId");
