-- ============================================================
-- Analytics Studio Models — Group B (Advanced)
-- 11 Prisma models + mv_daily_revenue materialized view
-- + refresh_analytics_views() PostgreSQL function
-- ============================================================
-- Generated: 2026-09-27
-- Reference: packages/db/prisma/schema.prisma (lines 1108-1627)
-- Follows pattern from: 20260904160000_add_analytics_notifications_models
-- ============================================================

-- ============================================
-- 1. SavedReport
-- ============================================
CREATE TABLE "SavedReport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'report',
    "config" JSONB NOT NULL,
    "ownerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "folder" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 2. SavedReportExecution
-- ============================================
CREATE TABLE "SavedReportExecution" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "executedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "result" JSONB,
    "rowcount" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedReportExecution_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 3. ScheduledReport
-- ============================================
CREATE TABLE "ScheduledReport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "time" TEXT NOT NULL DEFAULT '08:00',
    "outputFormats" TEXT[] DEFAULT ARRAY['email'],
    "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastExecutedAt" TIMESTAMP(3),
    "nextExecutionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 4. ScheduledReportExecution
-- ============================================
CREATE TABLE "ScheduledReportExecution" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "outputFormat" TEXT,
    "outputUrl" TEXT,
    "errorMessage" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ScheduledReportExecution_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 5. AnalyticsDataset
-- ============================================
CREATE TABLE "AnalyticsDataset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'QUERY',
    "sourceQuery" TEXT,
    "sourceView" TEXT,
    "schemaDef" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT,
    "columnCount" INTEGER NOT NULL DEFAULT 0,
    "rowCount" INTEGER,
    "lastRefreshed" TIMESTAMP(3),
    "refreshFreq" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AnalyticsDataset_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 6. AnalyticsQueryHistory
-- ============================================
CREATE TABLE "AnalyticsQueryHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "queryType" TEXT NOT NULL,
    "sql" TEXT NOT NULL,
    "visualConfig" TEXT,
    "datasetId" TEXT,
    "datasetName" TEXT,
    "executionMs" INTEGER NOT NULL,
    "rowsReturned" INTEGER NOT NULL,
    "rowsScanned" INTEGER,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "fromCache" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsQueryHistory_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 7. AnalyticsDashboard
-- ============================================
CREATE TABLE "AnalyticsDashboard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "layout" TEXT NOT NULL DEFAULT '{}',
    "theme" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT,
    "department" TEXT,
    "allowedRoles" TEXT,
    "allowedUsers" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "refreshAll" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AnalyticsDashboard_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 8. AnalyticsDashboardWidget
-- ============================================
CREATE TABLE "AnalyticsDashboardWidget" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "chartType" TEXT,
    "size" TEXT NOT NULL DEFAULT 'MEDIUM',
    "gridX" INTEGER NOT NULL DEFAULT 0,
    "gridY" INTEGER NOT NULL DEFAULT 0,
    "gridW" INTEGER NOT NULL DEFAULT 6,
    "gridH" INTEGER NOT NULL DEFAULT 4,
    "dataSource" TEXT NOT NULL DEFAULT 'METRIC',
    "metricId" TEXT,
    "chartId" TEXT,
    "queryId" TEXT,
    "sql" TEXT,
    "staticData" TEXT,
    "config" TEXT NOT NULL DEFAULT '{}',
    "refreshInterval" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsDashboardWidget_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 9. DataDictionaryEntry
-- ============================================
CREATE TABLE "DataDictionaryEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "businessDef" TEXT NOT NULL,
    "technicalDef" TEXT,
    "example" TEXT,
    "sourceModule" TEXT NOT NULL,
    "sourceModel" TEXT NOT NULL,
    "sourceField" TEXT,
    "formula" TEXT,
    "dependencies" TEXT,
    "upstreamDeps" TEXT,
    "downstreamDeps" TEXT,
    "freshness" TEXT,
    "reliability" TEXT,
    "lastVerified" TIMESTAMP(3),
    "owner" TEXT,
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataDictionaryEntry_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 10. ScheduledQuery
-- ============================================
CREATE TABLE "ScheduledQuery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "queryHistoryId" TEXT NOT NULL,
    "datasetId" TEXT,
    "cronExpression" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "timeOfDay" TEXT NOT NULL DEFAULT '08:00',
    "outputFormat" TEXT NOT NULL DEFAULT 'EMAIL',
    "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "alertOnFailure" BOOLEAN NOT NULL DEFAULT true,
    "alertOnAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "lastRunStatus" TEXT,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledQuery_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 11. MetricDefinition
-- ============================================
CREATE TABLE "MetricDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "format" TEXT,
    "unit" TEXT,
    "source" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isCustom" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricDefinition_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- Foreign Key Constraints
-- ============================================

-- SavedReport FKs
ALTER TABLE "SavedReport" ADD CONSTRAINT "SavedReport_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "SavedReport" ADD CONSTRAINT "SavedReport_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

-- SavedReportExecution FKs
ALTER TABLE "SavedReportExecution" ADD CONSTRAINT "SavedReportExecution_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "SavedReport"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

-- ScheduledReport FKs
ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "SavedReport"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

-- ScheduledReportExecution FKs
ALTER TABLE "ScheduledReportExecution" ADD CONSTRAINT "ScheduledReportExecution_scheduleId_fkey"
    FOREIGN KEY ("scheduleId") REFERENCES "ScheduledReport"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

-- AnalyticsDataset FKs
ALTER TABLE "AnalyticsDataset" ADD CONSTRAINT "AnalyticsDataset_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "AnalyticsDataset" ADD CONSTRAINT "AnalyticsDataset_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

-- AnalyticsQueryHistory FKs
ALTER TABLE "AnalyticsQueryHistory" ADD CONSTRAINT "AnalyticsQueryHistory_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "AnalyticsQueryHistory" ADD CONSTRAINT "AnalyticsQueryHistory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

-- AnalyticsDashboard FKs
ALTER TABLE "AnalyticsDashboard" ADD CONSTRAINT "AnalyticsDashboard_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "AnalyticsDashboard" ADD CONSTRAINT "AnalyticsDashboard_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

-- AnalyticsDashboardWidget FKs
ALTER TABLE "AnalyticsDashboardWidget" ADD CONSTRAINT "AnalyticsDashboardWidget_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "AnalyticsDashboardWidget" ADD CONSTRAINT "AnalyticsDashboardWidget_dashboardId_fkey"
    FOREIGN KEY ("dashboardId") REFERENCES "AnalyticsDashboard"("id") ON UPDATE CASCADE ON DELETE CASCADE;

-- DataDictionaryEntry FKs
ALTER TABLE "DataDictionaryEntry" ADD CONSTRAINT "DataDictionaryEntry_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

-- ScheduledQuery FKs
ALTER TABLE "ScheduledQuery" ADD CONSTRAINT "ScheduledQuery_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "ScheduledQuery" ADD CONSTRAINT "ScheduledQuery_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

-- MetricDefinition FKs
ALTER TABLE "MetricDefinition" ADD CONSTRAINT "MetricDefinition_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

-- ============================================
-- Indexes — SavedReport
-- ============================================
CREATE INDEX "SavedReport_tenantId_idx" ON "SavedReport"("tenantId");
CREATE INDEX "SavedReport_ownerId_idx" ON "SavedReport"("ownerId");
CREATE INDEX "SavedReport_tenantId_type_idx" ON "SavedReport"("tenantId", "type");
CREATE INDEX "SavedReport_tenantId_isStarred_idx" ON "SavedReport"("tenantId", "isStarred");

-- ============================================
-- Indexes — SavedReportExecution
-- ============================================
CREATE INDEX "SavedReportExecution_tenantId_idx" ON "SavedReportExecution"("tenantId");
CREATE INDEX "SavedReportExecution_reportId_idx" ON "SavedReportExecution"("reportId");

-- ============================================
-- Indexes — ScheduledReport
-- ============================================
CREATE INDEX "ScheduledReport_tenantId_idx" ON "ScheduledReport"("tenantId");
CREATE INDEX "ScheduledReport_tenantId_isActive_idx" ON "ScheduledReport"("tenantId", "isActive");
CREATE INDEX "ScheduledReport_nextExecutionAt_idx" ON "ScheduledReport"("nextExecutionAt");

-- ============================================
-- Indexes — ScheduledReportExecution
-- ============================================
CREATE INDEX "ScheduledReportExecution_tenantId_idx" ON "ScheduledReportExecution"("tenantId");
CREATE INDEX "ScheduledReportExecution_scheduleId_idx" ON "ScheduledReportExecution"("scheduleId");

-- ============================================
-- Indexes — AnalyticsDataset
-- ============================================
CREATE UNIQUE INDEX "AnalyticsDataset_tenantId_slug_key" ON "AnalyticsDataset"("tenantId", "slug");
CREATE INDEX "AnalyticsDataset_tenantId_idx" ON "AnalyticsDataset"("tenantId");
CREATE INDEX "AnalyticsDataset_ownerId_idx" ON "AnalyticsDataset"("ownerId");

-- ============================================
-- Indexes — AnalyticsQueryHistory
-- ============================================
CREATE INDEX "AnalyticsQueryHistory_tenantId_idx" ON "AnalyticsQueryHistory"("tenantId");
CREATE INDEX "AnalyticsQueryHistory_userId_idx" ON "AnalyticsQueryHistory"("userId");
CREATE INDEX "AnalyticsQueryHistory_createdAt_idx" ON "AnalyticsQueryHistory"("createdAt");
CREATE INDEX "AnalyticsQueryHistory_queryType_idx" ON "AnalyticsQueryHistory"("queryType");
CREATE INDEX "AnalyticsQueryHistory_status_idx" ON "AnalyticsQueryHistory"("status");

-- ============================================
-- Indexes — AnalyticsDashboard
-- ============================================
CREATE UNIQUE INDEX "AnalyticsDashboard_tenantId_slug_key" ON "AnalyticsDashboard"("tenantId", "slug");
CREATE INDEX "AnalyticsDashboard_tenantId_idx" ON "AnalyticsDashboard"("tenantId");
CREATE INDEX "AnalyticsDashboard_ownerId_idx" ON "AnalyticsDashboard"("ownerId");

-- ============================================
-- Indexes — AnalyticsDashboardWidget
-- ============================================
CREATE INDEX "AnalyticsDashboardWidget_tenantId_idx" ON "AnalyticsDashboardWidget"("tenantId");
CREATE INDEX "AnalyticsDashboardWidget_dashboardId_idx" ON "AnalyticsDashboardWidget"("dashboardId");

-- ============================================
-- Indexes — DataDictionaryEntry
-- ============================================
CREATE INDEX "DataDictionaryEntry_tenantId_idx" ON "DataDictionaryEntry"("tenantId");
CREATE INDEX "DataDictionaryEntry_type_idx" ON "DataDictionaryEntry"("type");
CREATE INDEX "DataDictionaryEntry_category_idx" ON "DataDictionaryEntry"("category");
CREATE INDEX "DataDictionaryEntry_name_idx" ON "DataDictionaryEntry"("name");

-- ============================================
-- Indexes — ScheduledQuery
-- ============================================
CREATE INDEX "ScheduledQuery_tenantId_idx" ON "ScheduledQuery"("tenantId");
CREATE INDEX "ScheduledQuery_isActive_idx" ON "ScheduledQuery"("isActive");
CREATE INDEX "ScheduledQuery_nextRunAt_idx" ON "ScheduledQuery"("nextRunAt");
CREATE INDEX "ScheduledQuery_ownerId_idx" ON "ScheduledQuery"("ownerId");

-- ============================================
-- Indexes — MetricDefinition
-- ============================================
CREATE INDEX "MetricDefinition_tenantId_idx" ON "MetricDefinition"("tenantId");
CREATE INDEX "MetricDefinition_category_idx" ON "MetricDefinition"("category");
CREATE INDEX "MetricDefinition_tenantId_category_idx" ON "MetricDefinition"("tenantId", "category");

-- ============================================================
-- MATERIALIZED VIEW: mv_daily_revenue
-- Daily revenue aggregation for analytics dashboard.
-- Referenced by: apps/web/app/api/analytics/dashboard/route.ts
-- Columns: tenantId, date, total_revenue
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_revenue AS
SELECT
    i."tenantId",
    DATE(i."createdAt") AS date,
    COALESCE(SUM(i.total), 0)::double precision AS total_revenue
FROM "Invoice" i
WHERE i.status IN ('SENT', 'PAID', 'OVERDUE')
GROUP BY i."tenantId", DATE(i."createdAt");

-- Unique index for CONCURRENTLY refresh support
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_revenue_pk
    ON mv_daily_revenue ("tenantId", date);
-- Tenant isolation index
CREATE INDEX IF NOT EXISTS idx_mv_daily_revenue_tenant
    ON mv_daily_revenue ("tenantId");
-- Date range filter index
CREATE INDEX IF NOT EXISTS idx_mv_daily_revenue_date
    ON mv_daily_revenue (date);

-- ============================================================
-- FUNCTION: refresh_analytics_views()
-- Refreshes all materialized views concurrently.
-- Called by: apps/web/app/api/analytics/refresh/route.ts
-- Usage: SELECT refresh_analytics_views();
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_revenue;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_expenses;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_profit_loss_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_accounts_receivable_aging;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_accounts_payable_aging;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_products;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_customers;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_by_category;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_employee_attendance_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_pipeline_value;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_pos_hourly_sales;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue;
END;
$$ LANGUAGE plpgsql;
