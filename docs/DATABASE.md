# 🗄️ Qalcuity — Database Architecture

> **Last Updated:** 30 Agustus 2026
> **Current Version:** v1.0.0-beta.1

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
| **Total Models** | 26 |
| **Total Indexes** | 57 |
| **Migrations** | 1 (clean init) |
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

### Finance

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Invoice` | Customer invoice | invoiceNumber, status, dueDate, subtotal, taxAmount, total, contactId, tenantId |
| `InvoiceItem` | Invoice line item | description, quantity, unitPrice, total, invoiceId (FK) |
| `Payment` | Payment record | paymentNumber, amount, method, status, type, invoiceId, tenantId |
| `PurchaseOrder` | Supplier PO | poNumber, status, supplierId, tenantId |
| `Quotation` | Customer quote | quotNumber, status, validUntil, contactId, tenantId |
| `QuotationItem` | Quotation line item | description, quantity, unitPrice, total, quotId (FK) |
| `CoAAccount` | Chart of accounts | code (UQ/tenant), name, type, parentId, tenantId |
| `BankTransaction` | Bank statement | date, description, amount, type, reconciled, tenantId |

### CRM

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Contact` | Business contact | name, type, company, email, phone, tenantId |
| `Lead` | Sales lead | name, company, status, value, contactId, tenantId |
| `Deal` | Sales opportunity | title, value, stage, probability, contactId, leadId, tenantId |

### Inventory

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Product` | Product catalog | sku (UQ/tenant), name, price, cost, stock, minStock, categoryId, tenantId |
| `Category` | Product category | name (UQ/tenant), description, tenantId |
| `Supplier` | Supplier info | name, contactPerson, email, phone, rating, tenantId |
| `StockMovement` | Stock history | type, quantity, productId, tenantId |

### HR

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Employee` | Employee record | employeeId, name, position, department, salary, status, tenantId |
| `AttendanceRecord` | Daily attendance | date (UQ/employee), clockIn, clockOut, status, workHours, employeeId, tenantId |
| `LeaveRequest` | Leave application | type, startDate, endDate, days, status, employeeId, tenantId |
| `PayrollRecord` | Payroll record | period (UQ/employee), baseSalary, netSalary, status, employeeId, tenantId |

### System

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `AuditLog` | Audit trail | action, entity, entityId, oldValue, newValue, userId, tenantId |
| `SubscriptionPlan` | Billing plans | name, slug (UQ), price, interval, features, tenantId |
| `TenantSubscription` | Tenant subscription | tenantId, planId, status, startDate, endDate |
| `BillingPayment` | Payment proof | amount, method, status, proofUrl, tenantId, subscriptionId |

---

## 4. Multi-tenant Pattern

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

### Total: 57 Indexes

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

**Last Updated:** August 30, 2026
**Maintainer:** Qalcuity Engineering Team
