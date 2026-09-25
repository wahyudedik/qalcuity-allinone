# 🗄️ Qalcuity — Database Architecture

> **Last Updated:** 24 September 2026 (Documentation Sync)
> **Current Version:** v1.1.0

---

## 📋 Daftar Isi

1. [Overview](#1-overview)
2. [Schema Overview](#2-schema-overview)
3. [Key Models](#3-key-models)
4. [Multi-tenant Pattern](#4-multi-tenant-pattern)
5. [Index Strategy](#5-index-strategy)
6. [Design Principles](#6-design-principles)
7. [Seed Data](#7-seed-data)
8. [Migration Rules](#8-migration-rules)

---

## 1. Overview

| Property | Value |
|----------|-------|
| **ORM** | Prisma 5.22 |
| **Database** | PostgreSQL 18.4 (DBngin local) |
| **Schema Location** | [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma) |
| **Total Models** | 107 |
| **Total Indexes** | 243 (`@@index`) + 41 (`@@unique`) + 9 (inline `@unique`) = 293 |
| **Migrations** | 44 |
| **Generator** | `prisma-client-js` |
| **Auth** | Trust authentication (no password for local dev) |

### Connection

```
postgresql://postgres@localhost:5432/qalcuity?schema=public
```

---

## 2. Schema Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TENANT & AUTH                                      │
│                                                                             │
│  ┌──────────────┐         ┌──────────────┐                                  │
│  │    Tenant     │ 1────* │     User     │                                  │
│  │              │         │              │                                  │
│  │ id (PK)      │         │ id (PK)      │                                  │
│  │ name         │         │ email (UQ)   │                                  │
│  │ slug (UQ)    │         │ name         │                                  │
│  │ logo         │         │ passwordHash │                                  │
│  │ address      │         │ role         │                                  │
│  │ phone        │         │ isActive     │                                  │
│  │ email        │         │ tenantId(FK) │                                  │
│  │ website      │         └──────────────┘                                  │
│  │ settings     │                                                           │
│  │ subscription │                                                           │
│  │ Status       │                                                           │
│  └──────┬───────┘                                                           │
│         │ Has many (all business entities)                                  │
└─────────┼───────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CRM                                               │
│                                                                             │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐        │
│  │   Contact     │ 1────* │     Lead     │ 1────* │     Deal     │        │
│  │              │         │              │         │              │        │
│  │ id (PK)      │         │ id (PK)      │         │ id (PK)      │        │
│  │ name         │         │ name         │         │ title        │        │
│  │ type         │         │ company      │         │ value        │        │
│  │ company      │         │ status       │         │ stage        │        │
│  │ email        │         │ value        │         │ probability  │        │
│  │ phone        │         │ contactId*   │         │ contactId*   │        │
│  │ tenantId(FK) │         │ tenantId(FK) │         │ leadId*      │        │
│  └──────────────┘         └──────────────┘         │ tenantId(FK) │        │
│                                                    └──────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           FINANCE                                           │
│                                                                             │
│  ┌──────────────┐         ┌──────────────┐                                 │
│  │   Invoice     │ 1────* │ InvoiceItem  │                                 │
│  │              │         │              │                                 │
│  │ id (PK)      │         │ id (PK)      │                                 │
│  │ invoiceNumber│         │ description  │                                 │
│  │ status       │         │ quantity     │                                 │
│  │ dueDate      │         │ unitPrice    │                                 │
│  │ subtotal     │         │ total        │                                 │
│  │ taxRate      │         │ invoiceId(FK)│                                 │
│  │ taxAmount    │         └──────────────┘                                 │
│  │ total        │                                                          │
│  │ contactId*   │         ┌──────────────┐                                 │
│  │ tenantId(FK) │ 1────* │   Payment    │                                 │
│  └──────────────┘         │              │                                 │
│                           │ id (PK)      │                                 │
│  ┌──────────────┐         │ paymentNumber│                                 │
│  │ PurchaseOrder │ 1────* │ amount       │                                 │
│  │              │         │ method       │                                 │
│  │ id (PK)      │         │ status       │                                 │
│  │ poNumber     │         │ type         │                                 │
│  │ status       │         │ invoiceId*   │                                 │
│  │ supplierId*  │         │ tenantId(FK) │                                 │
│  │ tenantId(FK) │         └──────────────┘                                 │
│  └──────────────┘                                                          │
│                                                                             │
│  ┌──────────────┐         ┌──────────────┐                                 │
│  │  Quotation    │ 1────* │QuotationItem │                                 │
│  │              │         │              │                                 │
│  │ id (PK)      │         │ id (PK)      │                                 │
│  │ quotNumber   │         │ description  │                                 │
│  │ status       │         │ quantity     │                                 │
│  │ validUntil   │         │ unitPrice    │                                 │
│  │ contactId*   │         │ total        │                                 │
│  │ tenantId(FK) │         │ quotId (FK)  │                                 │
│  └──────────────┘         └──────────────┘                                 │
│                                                                             │
│  ┌──────────────┐         ┌──────────────┐                                 │
│  │  CoAAccount   │         │BankTransaction│                                │
│  │              │         │              │                                 │
│  │ id (PK)      │         │ id (PK)      │                                 │
│  │ code (UQ/T)  │         │ date         │                                 │
│  │ name         │         │ description  │                                 │
│  │ type         │         │ amount       │                                 │
│  │ parentId*    │         │ type         │                                 │
│  │ tenantId(FK) │         │ reconciled   │                                 │
│  └──────────────┘         │ tenantId(FK) │                                 │
│                           └──────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           INVENTORY                                         │
│                                                                             │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐        │
│  │   Category    │ 1────* │   Product    │ *────1 │  Supplier    │        │
│  │              │         │              │  (PO)   │              │        │
│  │ id (PK)      │         │ id (PK)      │         │ id (PK)      │        │
│  │ name (UQ/T)  │         │ sku (UQ/T)   │         │ name         │        │
│  │ description  │         │ name         │         │ contactPerson│        │
│  │ tenantId(FK) │         │ price        │         │ email        │        │
│  └──────────────┘         │ cost         │         │ phone        │        │
│                           │ stock        │         │ rating       │        │
│                           │ minStock     │         │ tenantId(FK) │        │
│                           │ categoryId*  │         └──────────────┘        │
│                           │ tenantId(FK) │                                  │
│                           └──────┬───────┘                                  │
│                                  │ 1                                        │
│                                  │ *                                        │
│                           ┌──────────────┐                                 │
│                           │StockMovement │                                 │
│                           │              │                                 │
│                           │ id (PK)      │                                 │
│                           │ type         │                                 │
│                           │ quantity     │                                 │
│                           │ productId(FK)│                                 │
│                           │ tenantId(FK) │                                 │
│                           └──────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           HR                                                │
│                                                                             │
│  ┌──────────────┐                                                          │
│  │   Employee    │                                                          │
│  │              │                                                          │
│  │ id (PK)      │ 1────────────────────────────────────┐                   │
│  │ employeeId   │                                       │                   │
│  │ name         │                                       │                   │
│  │ position     │                                       │                   │
│  │ department   │                                       │                   │
│  │ salary       │                                       │                   │
│  │ status       │                                       │                   │
│  │ tenantId(FK) │                                       │                   │
│  └──────────────┘                                       │                   │
│         │ 1────*          1────*               1────*   │                   │
│  ┌──────────────┐ ┌──────────────┐  ┌──────────────┐   │                   │
│  │AttendanceRec │ │ LeaveRequest │  │PayrollRecord │   │                   │
│  │              │ │              │  │              │   │                   │
│  │ id (PK)      │ │ id (PK)      │  │ id (PK)      │   │                   │
│  │ date (UQ/E)  │ │ type         │  │ period (UQ/E)│   │                   │
│  │ clockIn      │ │ startDate    │  │ baseSalary   │   │                   │
│  │ clockOut     │ │ endDate      │  │ netSalary    │   │                   │
│  │ status       │ │ days         │  │ status       │   │                   │
│  │ workHours    │ │ status       │  │ employeeId(FK│   │                   │
│  │ employeeId(FK│ │ employeeId(FK│  │ tenantId(FK) │   │                   │
│  │ tenantId(FK) │ │ tenantId(FK) │  └──────────────┘   │                   │
│  └──────────────┘ └──────────────┘                      │                   │
└─────────────────────────────────────────────────────────┼───────────────────┘
                                                           │
┌─────────────────────────────────────────────────────────┼───────────────────┐
│                    BILLING & AUDIT                      │                   │
│                                                         │                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │                   │
│  │AuditLog      │  │Subscription  │  │TenantSubscr. │  │                   │
│  │              │  │Plan          │  │              │  │                   │
│  │ id (PK)      │  │ id (PK)      │  │ id (PK)      │  │                   │
│  │ action       │  │ name         │  │ tenantId(FK) │  │                   │
│  │ entity       │  │ slug (UQ)    │  │ planId (FK)  │  │                   │
│  │ entityId     │  │ price        │  │ status       │  │                   │
│  │ oldValue     │  │ interval     │  │ startDate    │  │                   │
│  │ newValue     │  │ features     │  │ endDate      │  │                   │
│  │ userId(FK)   │  │ tenantId(FK) │  │ tenantId(FK) │  │                   │
│  │ tenantId(FK) │  └──────────────┘  └──────────────┘  │                   │
│  └──────────────┘                                       │                   │
│  ┌──────────────┐                                       │                   │
│  │BillingPayment│                                       │                   │
│  │              │                                       │                   │
│  │ id (PK)      │                                       │                   │
│  │ amount       │                                       │                   │
│  │ method       │                                       │                   │
│  │ status       │                                       │                   │
│  │ proofUrl     │                                       │                   │
│  │ tenantId(FK) │                                       │                   │
│  │ subscription │                                       │                   │
│  └──────────────┘                                       │                   │
└─────────────────────────────────────────────────────────┼───────────────────┘
```

---

## 3. Key Models

### Core SaaS

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Tenant` | Company/workspace | name, slug (UQ), logo, settings (JSON), subscription |
| `User` | User account | email (UQ), passwordHash, role, isActive, tenantId (FK) |

### Finance (16 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Invoice` | Customer invoice | invoiceNumber, status, dueDate, subtotal, taxAmount, total, contactId, tenantId |
| `InvoiceItem` | Invoice line item | description, quantity, unitPrice, total, invoiceId (FK) |
| `Bill` | Supplier bill | billNumber, status, dueDate, subtotal, taxAmount, total, supplierId, tenantId |
| `BillItem` | Bill line item | description, quantity, unitPrice, total, billId (FK) |
| `Payment` | Payment record | paymentNumber, amount, method, status, type, invoiceId, tenantId |
| `PaymentAllocation` | Payment allocation | amount, paymentId (FK), invoiceId (FK), tenantId |
| `Quotation` | Customer quote | quotNumber, status, validUntil, contactId, tenantId |
| `QuotationItem` | Quotation line item | description, quantity, unitPrice, total, quotId (FK) |
| `JournalEntry` | Journal entry | entryNumber, date, description, tenantId |
| `JournalEntryLine` | Journal entry line | debit, credit, accountId (FK), journalEntryId (FK), tenantId |
| `ChartOfAccount` | Chart of accounts | code (UQ/tenant), name, type, parentId, tenantId |
| `BankAccount` | Bank account | name, bankName, accountNumber, balance, tenantId |
| `BankReconciliation` | Bank reconciliation | statementDate, statementBalance, reconciledBalance, status, tenantId |
| `PeriodClosing` | Period closing | period, status, closedBy, tenantId |
| `TaxRate` | Tax configuration | name, rate, type, isActive, tenantId |
| `WithholdingTax` | Withholding tax | name, rate, type, isActive, tenantId |

### CRM (4 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Contact` | Business contact | name, type, company, email, phone, tenantId |
| `Lead` | Sales lead | name, company, status, value, contactId, tenantId |
| `Deal` | Sales opportunity | title, value, stage, probability, contactId, leadId, tenantId |
| `CrmActivity` | CRM activity | type, subject, description, dueDate, contactId, dealId, tenantId |

### HR (5 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Employee` | Employee record | employeeId, name, position, departmentId, salary, status, tenantId |
| `Department` | Department | name, description, managerId, tenantId |
| `LeaveRequest` | Leave application | type, startDate, endDate, days, status, employeeId, tenantId |
| `LeaveBalance` | Leave balance | employeeId, leaveType, balance, used, tenantId |
| `PayrollRecord` | Payroll record | period (UQ/employee), baseSalary, netSalary, status, employeeId, tenantId |

### Inventory (7 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Product` | Product catalog | sku (UQ/tenant), name, price, cost, stock, minStock, categoryId, tenantId |
| `Stock` | Stock record | productId, warehouseId, quantity, tenantId |
| `StockMovement` | Stock history | type, quantity, productId, tenantId |
| `Warehouse` | Warehouse | name, address, capacity, tenantId |
| `StockOpname` | Stock opname | opnameNumber, status, date, tenantId |
| `StockOpnameItem` | Stock opname item | productId, systemQty, actualQty, difference, stockOpnameId (FK), tenantId |
| `Supplier` | Supplier info | name, contactPerson, email, phone, rating, tenantId |

### POS (16 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `PosTransaction` | POS transaction | transactionNumber, status, total, tenantId |
| `PosItem` | POS item | productId, quantity, unitPrice, total, transactionId (FK), tenantId |
| `PosPayment` | POS payment | amount, method, status, transactionId (FK), tenantId |
| `PosShift` | POS shift | cashierId, startTime, endTime, status, tenantId |
| `PosTable` | POS table | number, capacity, status, tenantId |
| `PosReservation` | POS reservation | customerName, date, time, partySize, tableId, tenantId |
| `KitchenDisplay` | Kitchen display | name, station, tenantId |
| `KitchenOrder` | Kitchen order | status, priority, transactionId (FK), tenantId |
| `KitchenOrderItem` | Kitchen order item | menuItem, quantity, status, kitchenOrderId (FK), tenantId |
| `LoyaltyProgram` | Loyalty program | name, pointsPerCurrency, redemptionRate, isActive, tenantId |
| `LoyaltyTransaction` | Loyalty transaction | points, type, customerId, programId (FK), tenantId |
| `PosAnalytics` | POS analytics | metric, value, date, tenantId |

### Billing (8 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Subscription` | Tenant subscription | tenantId, planId, status, startDate, endDate |
| `Plan` | Subscription plan | name, slug (UQ), price, interval, features |
| `BillingPayment` | Payment proof | amount, method, status, proofUrl, subscriptionId, tenantId |
| `Entitlement` | Feature entitlement | planId, featureKey, limit, tenantId |
| `EntitlementUsage` | Entitlement usage | entitlementId, used, period, tenantId |
| `FeatureFlag` | Feature flag | key, enabled, description, tenantId |
| `PaymentGateway` | Payment gateway config | name, config (JSON), isActive, tenantId |
| `InvoiceRecurring` | Recurring invoice | frequency, nextRunDate, templateId, tenantId |

### Analytics (18 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `DashboardWidget` | Dashboard widget | type, config (JSON), position, dashboardId (FK), tenantId |
| `DashboardConfig` | Dashboard configuration | name, isDefault, layout (JSON), tenantId |
| `SavedReport` | Saved report | name, query (JSON), format, tenantId |
| `ReportSchedule` | Report schedule | reportId, frequency, recipients, nextRun, tenantId |
| `AnalyticsCache` | Analytics cache | key, data (JSON), expiresAt, tenantId |
| `AnalyticsMaterializedView` | Materialized view | viewName, query, refreshInterval, tenantId |
| `AnalyticsReadModel` | Read model | modelType, data (JSON), computedAt, tenantId |
| _(additional analytics models)_ | Various analytics | Various fields |

### Platform (5 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `PlatformSetting` | Platform settings | key, value (JSON), description |
| `PlatformAuditLog` | Platform audit | action, entity, entityId, userId, timestamp |
| `SupportTicket` | Support ticket | subject, status, priority, tenantId |
| `SupportMessage` | Support message | content, ticketId (FK), senderId |
| `TenantMetrics` | Tenant metrics | metricType, value, period, tenantId |

### Settings (6 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Setting` | App settings | key, value (JSON), tenantId |
| `Session` | User session | sessionToken, userId, expires |
| `LoginLog` | Login history | email, success, ip, userAgent, timestamp |
| `TwoFactorBackupCode` | 2FA backup codes | code, used, userId |
| `RateLimitLog` | Rate limit log | ip, path, timestamp |
| `CronRunLog` | Cron execution log | taskName, status, duration, ranAt |

### Security (4 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `PasswordHistory` | Password history | passwordHash, userId |
| `ApiKey` | API key | name, key, isActive, expiresAt, tenantId |
| `Webhook` | Webhook config | url, events (JSON), isActive, tenantId |
| `Notification` | Notification | title, message, read, userId, tenantId |

### Approval (3 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `ApprovalLevel` | Approval level | level, name, requiredRole, tenantId |
| `ApprovalRequest` | Approval request | entityType, entityId, status, requesterId, tenantId |
| `ApprovalHistory` | Approval history | action, comment, requestId (FK), approverId |

### Workflow (2 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `WorkflowDefinition` | Workflow definition | name, entityType, steps (JSON), tenantId |
| `WorkflowTransition` | Workflow transition | fromStatus, toStatus, definitionId (FK), tenantId |

### Industry (2 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `IndustryConfig` | Industry configuration | industryType, config (JSON), tenantId |
| `CustomField` | Custom field definition | entityType, fieldName, fieldType, config (JSON), tenantId |

### Other (5 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `ExtractionHistory` | Document extraction | documentType, status, result (JSON), tenantId |
| `DocumentTemplate` | Document template | name, type, content (JSON), tenantId |
| `AnomalyDetection` | Anomaly detection | entityType, entityId, severity, details (JSON), tenantId |
| `AnomalyAlert` | Anomaly alert | detectionId (FK), acknowledged, tenantId |
| `Version` | Version tracking | version, releasedAt, notes |

---

## 4. Multi-tenant Pattern

### Tenant Isolation Coverage

> **Per 24 September 2026 — Master Audit.**

| Metric | Value |
|--------|-------|
| **Models with `tenantId`** | 94 / 107 (87.9%) |
| **Models without `tenantId`** | 13 |

Models without `tenantId` are intentionally scoped to platform-wide or junction/log tables:

| Model | Reason |
|-------|--------|
| `Tenant` | Top-level entity — IS the tenant |
| `User` | Scoped via `tenantId` FK, but also used platform-wide |
| `Plan` | Platform-wide subscription plans |
| `Session` | Auth session — scoped via `userId` FK |
| `LoginLog` | Platform-wide login audit |
| `TwoFactorBackupCode` | Scoped via `userId` FK |
| `PasswordHistory` | Scoped via `userId` FK |
| `RateLimitLog` | Platform-wide rate limit tracking |
| `PlatformSetting` | Platform-wide settings |
| `PlatformAuditLog` | Platform-wide audit trail |
| `Version` | Platform-wide version tracking |
| `ApprovalHistory` | Junction/log — scoped via `requestId` FK |
| `KitchenDisplay` | POS config — scoped via `tenantId` on related models |

### Tenant Isolation Rule

> **Setiap query database WAJIB filter berdasarkan `tenantId`. Tidak ada exception.**

```typescript
// ✅ CORRECT — Always filter by tenantId
const data = await prisma.invoice.findMany({
  where: { tenantId }
});

// ❌ WRONG — Missing tenantId filter (cross-tenant leak!)
const data = await prisma.invoice.findMany({});
```

### Implementation Pattern

```typescript
// Every API route extracts tenantId from session
const session = await getServerSession(authOptions);
const tenantId = session?.user?.tenantId;

// Every query includes tenantId filter
const invoices = await prisma.invoice.findMany({
  where: { tenantId },
  include: { items: true, payments: true }
});

// Every mutation includes tenantId in where clause
await prisma.invoice.update({
  where: { id, tenantId },  // ← Include tenantId in where
  data: { status: 'PAID' }
});
```

### Unique Constraints (Per-Tenant)

Some unique constraints are scoped per-tenant using composite unique:

- `CoAAccount`: `@@unique([tenantId, code])`
- `Category`: `@@unique([tenantId, name])`
- `Product`: `@@unique([tenantId, sku])`
- `AttendanceRecord`: `@@unique([employeeId, date])`
- `PayrollRecord`: `@@unique([employeeId, period])`

---

## 5. Index Strategy

### Total: 243 Indexes (`@@index`) + 41 Unique Constraints (`@@unique`) + 9 Inline `@unique` = 293 Database Indexes

#### Auth & Tenant (5 indexes)

| Model | Index | Type | Purpose |
|-------|-------|------|---------|
| `User` | `email` | Unique | Login lookup |
| `User` | `tenantId` | Normal | Tenant scoping |
| `Tenant` | `slug` | Unique | URL-friendly lookup |
| `Tenant` | `name` | Normal | Search |
| `AuditLog` | `tenantId` | Normal | Tenant scoping |

#### Finance (18 indexes)

| Model | Index | Type | Purpose |
|-------|-------|------|---------|
| `Invoice` | `tenantId` | Normal | Tenant scoping |
| `Invoice` | `invoiceNumber` | Normal | Unique lookup |
| `Invoice` | `status` | Normal | Filter by status |
| `Invoice` | `contactId` | Normal | Contact lookup |
| `InvoiceItem` | `invoiceId` | Normal | Invoice items |
| `Payment` | `tenantId` | Normal | Tenant scoping |
| `Payment` | `paymentNumber` | Normal | Unique lookup |
| `Payment` | `invoiceId` | Normal | Invoice payments |
| `PurchaseOrder` | `tenantId` | Normal | Tenant scoping |
| `PurchaseOrder` | `poNumber` | Normal | Unique lookup |
| `PurchaseOrder` | `supplierId` | Normal | Supplier lookup |
| `Quotation` | `tenantId` | Normal | Tenant scoping |
| `Quotation` | `quotNumber` | Normal | Unique lookup |
| `Quotation` | `contactId` | Normal | Contact lookup |
| `QuotationItem` | `quotId` | Normal | Quotation items |
| `CoAAccount` | `tenantId_code` | Unique | Per-tenant code |
| `BankTransaction` | `tenantId` | Normal | Tenant scoping |
| `BankTransaction` | `date` | Normal | Date range queries |

#### CRM (9 indexes)

| Model | Index | Type | Purpose |
|-------|-------|------|---------|
| `Contact` | `tenantId` | Normal | Tenant scoping |
| `Lead` | `tenantId` | Normal | Tenant scoping |
| `Lead` | `contactId` | Normal | Contact lookup |
| `Lead` | `status` | Normal | Filter by status |
| `Deal` | `tenantId` | Normal | Tenant scoping |
| `Deal` | `contactId` | Normal | Contact lookup |
| `Deal` | `leadId` | Normal | Lead lookup |
| `Deal` | `stage` | Normal | Pipeline filtering |
| `Deal` | `status` | Normal | Filter by status |

#### Inventory (10 indexes)

| Model | Index | Type | Purpose |
|-------|-------|------|---------|
| `Product` | `tenantId` | Normal | Tenant scoping |
| `Product` | `sku` | Normal | SKU lookup |
| `Product` | `categoryId` | Normal | Category filtering |
| `Category` | `tenantId_name` | Unique | Per-tenant name |
| `Supplier` | `tenantId` | Normal | Tenant scoping |
| `StockMovement` | `tenantId` | Normal | Tenant scoping |
| `StockMovement` | `productId` | Normal | Product history |
| `StockMovement` | `type` | Normal | Movement type filter |
| `StockMovement` | `date` | Normal | Date range queries |
| `StockMovement` | `createdAt` | Normal | Chronological ordering |

#### HR (10 indexes)

| Model | Index | Type | Purpose |
|-------|-------|------|---------|
| `Employee` | `tenantId` | Normal | Tenant scoping |
| `Employee` | `employeeId` | Normal | Employee lookup |
| `Employee` | `department` | Normal | Department filtering |
| `Employee` | `status` | Normal | Active/inactive filter |
| `AttendanceRecord` | `employeeId_date` | Unique | Per-employee date |
| `AttendanceRecord` | `tenantId` | Normal | Tenant scoping |
| `LeaveRequest` | `tenantId` | Normal | Tenant scoping |
| `LeaveRequest` | `employeeId` | Normal | Employee lookup |
| `PayrollRecord` | `employeeId_period` | Unique | Per-employee period |
| `PayrollRecord` | `tenantId` | Normal | Tenant scoping |

#### System (5 indexes)

| Model | Index | Type | Purpose |
|-------|-------|------|---------|
| `AuditLog` | `action` | Normal | Action filtering |
| `AuditLog` | `entity` | Normal | Entity filtering |
| `AuditLog` | `createdAt` | Normal | Chronological ordering |
| `SubscriptionPlan` | `slug` | Unique | Plan lookup |
| `TenantSubscription` | `tenantId` | Normal | Tenant scoping |

---

## 6. Design Principles

| # | Principle | Description |
|---|-----------|-------------|
| 1 | **Multi-tenant** | Every business entity has `tenantId` field |
| 2 | **Soft delete** | Critical entities use `deletedAt` instead of hard delete |
| 3 | **Audit fields** | `createdAt`, `updatedAt` on all mutable entities |
| 4 | **CUID IDs** | All primary keys use `@default(cuid())` |
| 5 | **String enums** | Status/type fields use String with comments (not Prisma enums) |
| 6 | **Decimal types** | Monetary fields use native `Decimal @db.Decimal(15, 2)` for exact arithmetic |
| 7 | **JSON type** | Settings field uses native PostgreSQL `Json` type |

---

## 7. Seed Data

### 3-Layer Demo Data Strategy

| Layer | Purpose | Trigger |
|-------|---------|---------|
| **Demo Login** | Pre-loaded demo tenant for instant access | `/api/demo/login` |
| **Onboarding** | Load demo data for new tenants | Onboarding modal |
| **Settings** | Manual data load from settings page | Settings → Data |

### Demo Data Coverage

| Module | Records |
|--------|---------|
| **Finance** | Invoices, payments, POs, quotations, CoA accounts, bank transactions |
| **CRM** | Contacts, leads, deals |
| **Inventory** | Products, categories, suppliers, stock movements |
| **HR** | Employees, attendance records, leave requests, payroll records |
| **Billing** | Subscription plans, tenant subscriptions |

### Seed Files

| File | Purpose |
|------|---------|
| [`packages/db/prisma/seed.ts`](packages/db/prisma/seed.ts) | Main seeder |
| [`apps/web/lib/seed-data/demo.ts`](apps/web/lib/seed-data/demo.ts) | Demo data generator |
| [`apps/web/lib/seed-data/coa.ts`](apps/web/lib/seed-data/coa.ts) | Chart of Accounts data |
| [`apps/web/lib/seed-data/reconciliation.ts`](apps/web/lib/seed-data/reconciliation.ts) | Reconciliation data |

---

## 8. Migration Rules

### Do Not Touch

> ⛔ **Prisma schema requires approval before modification.**

- Schema changes require new migration
- Never modify existing migrations
- Always test migration on development first
- Back up production data before applying

### Migration Commands

```bash
# Create new migration
cd packages/db && npx prisma migrate dev --name <migration_name>

# Apply pending migrations
cd packages/db && npx prisma migrate deploy

# Check migration status
cd packages/db && npx prisma migrate status

# Reset database (development only!)
cd packages/db && npx prisma migrate reset

# Generate Prisma Client
cd packages/db && npx prisma generate
```

---

**Last Updated:** 24 September 2026
**Maintainer:** Qalcuity Engineering Team
