-- ============================================================
-- Analytics Read Model — 12 Materialized Views
-- Multi-tenant read model for analytics dashboard & reporting.
-- All views include tenantId column for tenant isolation.
-- ============================================================

-- 1. mv_monthly_revenue — Monthly revenue by tenant and category
-- Source: Invoice + InvoiceItem
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_revenue AS
SELECT
    i."tenantId",
    EXTRACT(MONTH FROM i."createdAt")::int AS month,
    EXTRACT(YEAR FROM i."createdAt")::int AS year,
    p."categoryId",
    COALESCE(SUM(ii.total), 0)::double precision AS "totalRevenue",
    COUNT(DISTINCT i.id)::int AS "invoiceCount",
    CASE
        WHEN COUNT(DISTINCT i.id) > 0
        THEN (COALESCE(SUM(ii.total), 0) / COUNT(DISTINCT i.id))::double precision
        ELSE 0
    END AS "avgInvoiceValue"
FROM "Invoice" i
JOIN "InvoiceItem" ii ON ii."invoiceId" = i.id
LEFT JOIN "Product" p ON p.id = ii."productId"
WHERE i.status IN ('SENT', 'PAID', 'OVERDUE')
GROUP BY i."tenantId", EXTRACT(MONTH FROM i."createdAt"), EXTRACT(YEAR FROM i."createdAt"), p."categoryId";

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_revenue_pk
    ON mv_monthly_revenue ("tenantId", month, year, "categoryId");
CREATE INDEX IF NOT EXISTS idx_mv_monthly_revenue_tenant
    ON mv_monthly_revenue ("tenantId");

-- 2. mv_monthly_expenses — Monthly expenses by tenant and category
-- Source: Payment (type=EXPENSE)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_expenses AS
SELECT
    p."tenantId",
    EXTRACT(MONTH FROM p."paymentDate")::int AS month,
    EXTRACT(YEAR FROM p."paymentDate")::int AS year,
    COALESCE(p.notes, 'UNCATEGORIZED') AS "categoryId",
    COALESCE(SUM(p.amount), 0)::double precision AS "totalExpenses",
    COUNT(p.id)::int AS "paymentCount"
FROM "Payment" p
WHERE p.type = 'EXPENSE' AND p.status = 'COMPLETED'
GROUP BY p."tenantId", EXTRACT(MONTH FROM p."paymentDate"), EXTRACT(YEAR FROM p."paymentDate"), COALESCE(p.notes, 'UNCATEGORIZED');

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_expenses_pk
    ON mv_monthly_expenses ("tenantId", month, year, "categoryId");
CREATE INDEX IF NOT EXISTS idx_mv_monthly_expenses_tenant
    ON mv_monthly_expenses ("tenantId");

-- 3. mv_profit_loss_summary — Monthly P&L summary
-- Source: mv_monthly_revenue + mv_monthly_expenses
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_profit_loss_summary AS
SELECT
    r."tenantId",
    r.month,
    r.year,
    r."totalRevenue" AS revenue,
    COALESCE(e."totalExpenses", 0) AS expenses,
    (r."totalRevenue" - COALESCE(e."totalExpenses", 0))::double precision AS "grossProfit",
    CASE
        WHEN r."totalRevenue" > 0
        THEN ((r."totalRevenue" - COALESCE(e."totalExpenses", 0)) / r."totalRevenue" * 100)::double precision
        ELSE 0
    END AS "profitMargin"
FROM (
    SELECT "tenantId", month, year, SUM("totalRevenue") AS "totalRevenue"
    FROM mv_monthly_revenue
    GROUP BY "tenantId", month, year
) r
LEFT JOIN (
    SELECT "tenantId", month, year, SUM("totalExpenses") AS "totalExpenses"
    FROM mv_monthly_expenses
    GROUP BY "tenantId", month, year
) e ON e."tenantId" = r."tenantId" AND e.month = r.month AND e.year = r.year;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_profit_loss_summary_pk
    ON mv_profit_loss_summary ("tenantId", month, year);
CREATE INDEX IF NOT EXISTS idx_mv_profit_loss_summary_tenant
    ON mv_profit_loss_summary ("tenantId");

-- 4. mv_accounts_receivable_aging — AR aging buckets
-- Source: Invoice (unpaid/partial)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_accounts_receivable_aging AS
SELECT
    i."tenantId",
    i."contactId" AS "customerId",
    i.id AS "invoiceId",
    i."invoiceNumber",
    COALESCE(i.total, 0)::double precision AS "totalAmount",
    CASE WHEN (CURRENT_DATE - i."createdAt"::date) <= 0 THEN COALESCE(i.total, 0)::double precision ELSE 0 END AS current,
    CASE WHEN (CURRENT_DATE - i."createdAt"::date) BETWEEN 1 AND 30 THEN COALESCE(i.total, 0)::double precision ELSE 0 END AS "days30",
    CASE WHEN (CURRENT_DATE - i."createdAt"::date) BETWEEN 31 AND 60 THEN COALESCE(i.total, 0)::double precision ELSE 0 END AS "days60",
    CASE WHEN (CURRENT_DATE - i."createdAt"::date) BETWEEN 61 AND 90 THEN COALESCE(i.total, 0)::double precision ELSE 0 END AS "days90",
    CASE WHEN (CURRENT_DATE - i."createdAt"::date) > 90 THEN COALESCE(i.total, 0)::double precision ELSE 0 END AS "over90",
    i."dueDate",
    (CURRENT_DATE - i."createdAt"::date)::int AS "daysOutstanding"
FROM "Invoice" i
WHERE i.status IN ('SENT', 'OVERDUE');

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_accounts_receivable_aging_pk
    ON mv_accounts_receivable_aging ("tenantId", "invoiceId");
CREATE INDEX IF NOT EXISTS idx_mv_accounts_receivable_aging_tenant
    ON mv_accounts_receivable_aging ("tenantId");
CREATE INDEX IF NOT EXISTS idx_mv_accounts_receivable_aging_customer
    ON mv_accounts_receivable_aging ("tenantId", "customerId");

-- 5. mv_accounts_payable_aging — AP aging buckets
-- Source: PurchaseOrder (unpaid/partial)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_accounts_payable_aging AS
SELECT
    po."tenantId",
    po."supplierId",
    po.id AS "poId",
    po."poNumber",
    COALESCE(po.total, 0)::double precision AS "totalAmount",
    CASE WHEN (CURRENT_DATE - po."orderDate"::date) <= 0 THEN COALESCE(po.total, 0)::double precision ELSE 0 END AS current,
    CASE WHEN (CURRENT_DATE - po."orderDate"::date) BETWEEN 1 AND 30 THEN COALESCE(po.total, 0)::double precision ELSE 0 END AS "days30",
    CASE WHEN (CURRENT_DATE - po."orderDate"::date) BETWEEN 31 AND 60 THEN COALESCE(po.total, 0)::double precision ELSE 0 END AS "days60",
    CASE WHEN (CURRENT_DATE - po."orderDate"::date) BETWEEN 61 AND 90 THEN COALESCE(po.total, 0)::double precision ELSE 0 END AS "days90",
    CASE WHEN (CURRENT_DATE - po."orderDate"::date) > 90 THEN COALESCE(po.total, 0)::double precision ELSE 0 END AS "over90",
    po."deliveryDate",
    (CURRENT_DATE - po."orderDate"::date)::int AS "daysOutstanding"
FROM "PurchaseOrder" po
WHERE po.status IN ('SENT', 'RECEIVED');

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_accounts_payable_aging_pk
    ON mv_accounts_payable_aging ("tenantId", "poId");
CREATE INDEX IF NOT EXISTS idx_mv_accounts_payable_aging_tenant
    ON mv_accounts_payable_aging ("tenantId");
CREATE INDEX IF NOT EXISTS idx_mv_accounts_payable_aging_supplier
    ON mv_accounts_payable_aging ("tenantId", "supplierId");

-- 6. mv_top_products — Top selling products
-- Source: InvoiceItem + Product
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_products AS
SELECT
    ii."tenantId",
    ii."productId",
    p.name AS "productName",
    p.sku AS "productSku",
    COALESCE(SUM(ii.quantity), 0)::double precision AS "totalQuantity",
    COALESCE(SUM(ii.total), 0)::double precision AS "totalRevenue",
    COUNT(DISTINCT ii."invoiceId")::int AS "orderCount"
FROM "InvoiceItem" ii
JOIN "Invoice" i ON i.id = ii."invoiceId"
LEFT JOIN "Product" p ON p.id = ii."productId"
WHERE i.status IN ('SENT', 'PAID', 'OVERDUE')
  AND ii."productId" IS NOT NULL
GROUP BY ii."tenantId", ii."productId", p.name, p.sku;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_products_pk
    ON mv_top_products ("tenantId", "productId");
CREATE INDEX IF NOT EXISTS idx_mv_top_products_tenant
    ON mv_top_products ("tenantId");
CREATE INDEX IF NOT EXISTS idx_mv_top_products_revenue
    ON mv_top_products ("tenantId", "totalRevenue" DESC);

-- 7. mv_top_customers — Top customers by revenue
-- Source: Invoice + Contact
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_customers AS
SELECT
    i."tenantId",
    i."contactId" AS "customerId",
    c.name AS "customerName",
    COALESCE(SUM(i.total), 0)::double precision AS "totalRevenue",
    COUNT(i.id)::int AS "invoiceCount",
    CASE
        WHEN COUNT(i.id) > 0
        THEN (COALESCE(SUM(i.total), 0) / COUNT(i.id))::double precision
        ELSE 0
    END AS "avgOrderValue"
FROM "Invoice" i
LEFT JOIN "Contact" c ON c.id = i."contactId"
WHERE i.status IN ('SENT', 'PAID', 'OVERDUE')
  AND i."contactId" IS NOT NULL
GROUP BY i."tenantId", i."contactId", c.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_customers_pk
    ON mv_top_customers ("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS idx_mv_top_customers_tenant
    ON mv_top_customers ("tenantId");
CREATE INDEX IF NOT EXISTS idx_mv_top_customers_revenue
    ON mv_top_customers ("tenantId", "totalRevenue" DESC);

-- 8. mv_inventory_summary — Current inventory levels
-- Source: Product
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_inventory_summary AS
SELECT
    p."tenantId",
    p.id AS "productId",
    p.name AS "productName",
    p.sku AS "productSku",
    p."categoryId",
    p.stock,
    p."minStock" AS "reorderLevel",
    (p.stock * p.cost)::double precision AS "stockValue",
    p.price AS "unitPrice",
    p.cost AS "unitCost",
    CASE
        WHEN p.stock <= 0 THEN 'OUT_OF_STOCK'
        WHEN p.stock <= p."minStock" THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
    END AS "stockStatus"
FROM "Product" p
WHERE p."isActive" = true
  AND p."deletedAt" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_inventory_summary_pk
    ON mv_inventory_summary ("tenantId", "productId");
CREATE INDEX IF NOT EXISTS idx_mv_inventory_summary_tenant
    ON mv_inventory_summary ("tenantId");
CREATE INDEX IF NOT EXISTS idx_mv_inventory_summary_category
    ON mv_inventory_summary ("tenantId", "categoryId");
CREATE INDEX IF NOT EXISTS idx_mv_inventory_summary_status
    ON mv_inventory_summary ("tenantId", "stockStatus");

-- 9. mv_sales_by_category — Sales breakdown by category
-- Source: InvoiceItem + Product + Category
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sales_by_category AS
SELECT
    ii."tenantId",
    p."categoryId",
    c.name AS "categoryName",
    COALESCE(SUM(ii.total), 0)::double precision AS "totalRevenue",
    COALESCE(SUM(ii.quantity), 0)::double precision AS "totalQuantity",
    COUNT(DISTINCT ii."productId")::int AS "productCount"
FROM "InvoiceItem" ii
JOIN "Invoice" i ON i.id = ii."invoiceId"
LEFT JOIN "Product" p ON p.id = ii."productId"
LEFT JOIN "Category" c ON c.id = p."categoryId"
WHERE i.status IN ('SENT', 'PAID', 'OVERDUE')
  AND p."categoryId" IS NOT NULL
GROUP BY ii."tenantId", p."categoryId", c.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_sales_by_category_pk
    ON mv_sales_by_category ("tenantId", "categoryId");
CREATE INDEX IF NOT EXISTS idx_mv_sales_by_category_tenant
    ON mv_sales_by_category ("tenantId");
CREATE INDEX IF NOT EXISTS idx_mv_sales_by_category_revenue
    ON mv_sales_by_category ("tenantId", "totalRevenue" DESC);

-- 10. mv_employee_attendance_summary — Monthly attendance
-- Source: AttendanceRecord
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_employee_attendance_summary AS
SELECT
    ar."tenantId",
    ar."employeeId",
    EXTRACT(MONTH FROM ar.date)::int AS month,
    EXTRACT(YEAR FROM ar.date)::int AS year,
    COUNT(*) FILTER (WHERE ar.status = 'PRESENT')::int AS "presentDays",
    COUNT(*) FILTER (WHERE ar.status = 'ABSENT')::int AS "absentDays",
    COUNT(*) FILTER (WHERE ar.status = 'LATE')::int AS "lateDays",
    COALESCE(SUM(ar."workHours"), 0)::double precision AS "totalHours",
    COUNT(*)::int AS "totalRecords"
FROM "AttendanceRecord" ar
GROUP BY ar."tenantId", ar."employeeId", EXTRACT(MONTH FROM ar.date), EXTRACT(YEAR FROM ar.date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_employee_attendance_summary_pk
    ON mv_employee_attendance_summary ("tenantId", "employeeId", month, year);
CREATE INDEX IF NOT EXISTS idx_mv_employee_attendance_summary_tenant
    ON mv_employee_attendance_summary ("tenantId");

-- 11. mv_crm_pipeline_value — Pipeline value by stage
-- Source: Deal
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_crm_pipeline_value AS
SELECT
    d."tenantId",
    d.stage,
    COUNT(d.id)::int AS "dealCount",
    COALESCE(SUM(d.value), 0)::double precision AS "totalValue",
    CASE
        WHEN COUNT(d.id) > 0
        THEN (COALESCE(SUM(d.value), 0) / COUNT(d.id))::double precision
        ELSE 0
    END AS "avgDealValue",
    COALESCE(SUM(d.value * d.probability / 100.0), 0)::double precision AS "weightedValue"
FROM "Deal" d
GROUP BY d."tenantId", d.stage;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_crm_pipeline_value_pk
    ON mv_crm_pipeline_value ("tenantId", stage);
CREATE INDEX IF NOT EXISTS idx_mv_crm_pipeline_value_tenant
    ON mv_crm_pipeline_value ("tenantId");

-- 12. mv_pos_hourly_sales — POS hourly sales pattern
-- Source: PosTransaction
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_pos_hourly_sales AS
SELECT
    pt."tenantId",
    EXTRACT(HOUR FROM pt."createdAt")::int AS hour,
    EXTRACT(DOW FROM pt."createdAt")::int AS "dayOfWeek",
    COUNT(pt.id)::int AS "transactionCount",
    COALESCE(SUM(pt."totalAmount"), 0)::double precision AS "totalRevenue",
    CASE
        WHEN COUNT(pt.id) > 0
        THEN (COALESCE(SUM(pt."totalAmount"), 0) / COUNT(pt.id))::double precision
        ELSE 0
    END AS "avgTicketSize"
FROM "PosTransaction" pt
WHERE pt.status = 'COMPLETED'
GROUP BY pt."tenantId", EXTRACT(HOUR FROM pt."createdAt"), EXTRACT(DOW FROM pt."createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_pos_hourly_sales_pk
    ON mv_pos_hourly_sales ("tenantId", hour, "dayOfWeek");
CREATE INDEX IF NOT EXISTS idx_mv_pos_hourly_sales_tenant
    ON mv_pos_hourly_sales ("tenantId");
