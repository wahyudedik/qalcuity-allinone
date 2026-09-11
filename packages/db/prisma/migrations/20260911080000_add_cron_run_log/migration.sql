-- CreateTable
CREATE TABLE "CronRunLog" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CronRunLog_taskId_idx" ON "CronRunLog"("taskId");

-- CreateIndex
CREATE INDEX "CronRunLog_createdAt_idx" ON "CronRunLog"("createdAt");

-- CreateIndex
CREATE INDEX "CronRunLog_taskId_createdAt_idx" ON "CronRunLog"("taskId", "createdAt" DESC);
