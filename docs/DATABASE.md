# DATABASE

> Dokumentasi database schema Qalcuity — Prisma ORM dengan 26 models.
> Last Updated: 2026-08-29

---

## Table of Contents

1. [Overview](#1-overview)
2. [Entity Relationship Diagram](#2-entity-relationship-diagram)
3. [Model Reference](#3-model-reference)
4. [Relationships](#4-relationships)
5. [Tenant Isolation Rules](#5-tenant-isolation-rules)
6. [Indexes & Constraints](#6-indexes--constraints)
7. [Soft Delete Policy](#7-soft-delete-policy)
8. [Audit Fields](#8-audit-fields)
9. [Migration Rules](#9-migration-rules)

---

## 1. Overview

| Property | Value |
|----------|-------|
| **ORM** | Prisma 5.15+ |
| **Database** | PostgreSQL |
| **Schema Location** | [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma) |
| **Total Models** | 26 |
| **Generator** | `prisma-client-js` |

### Design Principles

1. **Multi-tenant** — Every business entity has `tenantId` field
2. **Soft delete** — Critical entities use `deletedAt` instead of hard delete
3. **Audit fields** — `createdAt`, `updatedAt` on all mutable entities
4. **CUID IDs** — All primary keys use `@default(cuid())`
5. **String enums** — Status/type fields use String with comments (not Prisma enums)
6. **Decimal types** — Monetary fields use native `Decimal @db.Decimal(15, 2)` for exact arithmetic
7. **JSON type** — Settings field uses native PostgreSQL `Json` type

---

## 2. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TENANT & AUTH                                      │
│                                                                             │
│  ┌──────────────┐         ┌──────────────┐                                 │
│  │    Tenant     │ 1────* │     User     │                                 │
│  │              │         │              │                                 │
│  │ id (PK)      │         │ id (PK)      │                                 │
│  │ name         │         │ email (UQ)   │                                 │
│  │ slug (UQ)    │         │ name         │                                 │
│  │ logo         │         │ passwordHash │                                 │
│  │ address      │         │ role         │                                 │
│  │ phone        │         │ isActive     │                                 │
│  │ email        │         │ tenantId(FK) │                                 │
│  │ website      │         └──────────────┘                                 │
│  │ settings     │                                                          │
│  │ subscription │                                                          │
│  │ Status       │                                                          │
│  └──────┬───────┘                                                          │
│         │                                                                   │
│         │ Has many (all business entities)                                 │
│         │                                                                   │
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
│         │                                           └──────────────┘        │
│         │ Has many: Invoice[], Quotation[]                                 │
└─────────┼───────────────────────────────────────────────────────────────────┘
          │
          ▼
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
│                                  │                                          │
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
│         │                                               │                   │
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
│  │ userId (FK)  │  │ maxUsers     │  │ startDate    │  │                   │
│  │ tenantId(FK) │  │ features     │  │ endDate      │  │                   │
│  └──────────────┘  └──────────────┘  └──────┬───────┘  │                   │
│                                              │ 1        │                   │
│                                              │          │                   │
│                                              │ *        │                   │
│                                       ┌──────────────┐  │                   │
│                                       │BillingPayment│  │                   │
│                                       │              │  │                   │
│                                       │ id (PK)      │  │                   │
│                                       │ subscription │  │                   │
│                                       │   Id (FK)    │  │                   │
│                                       │ tenantId(FK) │  │                   │
│                                       │ amount       │  │                   │
│                                       │ status       │  │                   │
│                                       └──────────────┘  │                   │
└─────────────────────────────────────────────────────────┴───────────────────┘
```

### Legend

| Symbol | Meaning |
|--------|---------|
| `PK` | Primary Key |
| `FK` | Foreign Key |
| `UQ` | Unique constraint |
| `UQ/T` | Unique per tenant (compound unique) |
| `UQ/E` | Unique per entity per tenant |
| `1────*` | One-to-many relationship |
| `*────1` | Many-to-one relationship |
| `*` | Optional FK (nullable) |

---

## 3. Model Reference

### 3.1 Tenant & Auth

#### Tenant

> Root entity. Every other business entity belongs to a Tenant.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `name` | String | — | Company/tenant name |
| `slug` | String | `@unique` | URL-friendly identifier |
| `logo` | String? | — | Logo URL/path |
| `address` | String? | — | Company address |
| `phone` | String? | — | Company phone |
| `email` | String? | — | Company email |
| `website` | String? | — | Company website |
| `settings` | Json | `"{}"` | JSON object for tenant settings |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last update timestamp |
| `deletedAt` | DateTime? | — | Soft delete timestamp |
| `subscriptionStatus` | String | `"TRIAL"` | TRIAL, ACTIVE, PENDING_PAYMENT, SUSPENDED, CANCELLED |
| `trialEndsAt` | DateTime? | — | Trial expiration date |
| `currentPlanSlug` | String? | — | starter, growth, business |

**Relations:** Has many → User, Contact, Product, Category, Supplier, StockMovement, Invoice, Payment, PurchaseOrder, Quotation, Lead, Deal, Employee, AttendanceRecord, LeaveRequest, PayrollRecord, AuditLog, TenantSubscription, BillingPayment

---

#### User

> System user with role-based access within a Tenant.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `email` | String | `@unique` | Login email (global unique) |
| `name` | String | — | Display name |
| `passwordHash` | String | — | bcrypt hashed password |
| `avatar` | String? | — | Avatar URL |
| `phone` | String? | — | Phone number |
| `role` | String | `"USER"` | SUPERADMIN, ADMIN, MEMBER, VIEWER |
| `isActive` | Boolean | `true` | Account active status |
| `lastLoginAt` | DateTime? | — | Last login timestamp |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last update timestamp |
| `deletedAt` | DateTime? | — | Soft delete timestamp |
| `tenantId` | String | — | FK → Tenant |

**Relations:** Belongs to → Tenant; Has many → AuditLog

**Indexes:** `[tenantId]`

---

### 3.2 CRM

#### Contact

> Customer or supplier contact record.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `name` | String | — | Contact name |
| `type` | String | `"CUSTOMER"` | CUSTOMER, SUPPLIER, BOTH |
| `company` | String? | — | Company name |
| `email` | String? | — | Email address |
| `phone` | String? | — | Phone number |
| `address` | String? | — | Full address |
| `city` | String? | — | City |
| `province` | String? | — | Province |
| `postalCode` | String? | — | Postal code |
| `taxId` | String? | — | NPWP (tax ID) |
| `notes` | String? | — | Additional notes |
| `isActive` | Boolean | `true` | Active status |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last update timestamp |
| `deletedAt` | DateTime? | — | Soft delete timestamp |
| `tenantId` | String | — | FK → Tenant |

**Relations:** Belongs to → Tenant; Has many → Invoice, Lead, Deal, Quotation

**Indexes:** `[tenantId]`, `[type]`

---

#### Lead

> Potential customer or sales opportunity.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `name` | String | — | Lead name |
| `company` | String? | — | Company name |
| `email` | String? | — | Email |
| `phone` | String? | — | Phone |
| `source` | String? | — | WEBSITE, REFERRAL, COLD_CALL, SOCIAL_MEDIA, OTHER |
| `status` | String | `"NEW"` | NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST |
| `value` | Decimal | `0` | Estimated value |
| `notes` | String? | — | Notes |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last update timestamp |
| `tenantId` | String | — | FK → Tenant |
| `contactId` | String? | — | FK → Contact (optional) |

**Relations:** Belongs to → Tenant, Contact (optional); Has many → Deal

**Indexes:** `[tenantId]`, `[status]`

---

#### Deal

> Sales deal in the pipeline.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `title` | String | — | Deal title |
| `value` | Decimal | `0` | Deal value |
| `stage` | String | `"DISCOVERY"` | DISCOVERY, PROPOSAL, NEGOTIATION, CLOSING, CLOSED_WON, CLOSED_LOST |
| `probability` | Int | `0` | Win probability (0-100) |
| `closeDate` | DateTime? | — | Expected close date |
| `notes` | String? | — | Notes |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last update timestamp |
| `tenantId` | String | — | FK → Tenant |
| `contactId` | String? | — | FK → Contact (optional) |
| `leadId` | String? | — | FK → Lead (optional) |

**Relations:** Belongs to → Tenant, Contact (optional), Lead (optional)

**Indexes:** `[tenantId]`, `[stage]`

---

### 3.3 Finance

#### Invoice

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `invoiceNumber` | String | — | Unique invoice number |
| `status` | String | `"DRAFT"` | DRAFT, SENT, PAID, OVERDUE, CANCELLED |
| `dueDate` | DateTime | — | Payment due date |
| `notes` | String? | — | Notes |
| `subtotal` | Decimal | `0` | Subtotal before tax |
| `taxRate` | Decimal | `11` | Tax rate (default 11% PPN) |
| `taxAmount` | Decimal | `0` | Calculated tax |
| `total` | Decimal | `0` | Total amount |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last update timestamp |
| `tenantId` | String | — | FK → Tenant |
| `contactId` | String? | — | FK → Contact (customer) |

**Relations:** Belongs to → Tenant, Contact; Has many → InvoiceItem, Payment

**Indexes:** `[tenantId]`, `[status]`, `[contactId]`

---

#### InvoiceItem

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `description` | String | — | Item description |
| `quantity` | Decimal | `1` | Quantity |
| `unitPrice` | Decimal | `0` | Unit price |
| `total` | Decimal | `0` | Line total |
| `invoiceId` | String | — | FK → Invoice (cascade delete) |

**Relations:** Belongs to → Invoice

**Indexes:** `[invoiceId]`

---

#### Payment

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `paymentNumber` | String | — | Unique payment number |
| `amount` | Decimal | — | Payment amount |
| `paymentDate` | DateTime | — | Payment date |
| `method` | String | `"BANK_TRANSFER"` | BANK_TRANSFER, CASH, CREDIT_CARD, E_WALLET |
| `status` | String | `"COMPLETED"` | COMPLETED, PENDING, FAILED |
| `notes` | String? | — | Notes |
| `reference` | String? | — | Reference number |
| `type` | String | `"INCOME"` | INCOME, EXPENSE |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `tenantId` | String | — | FK → Tenant |
| `invoiceId` | String? | — | FK → Invoice (optional) |

**Relations:** Belongs to → Tenant, Invoice (optional)

**Indexes:** `[tenantId]`, `[invoiceId]`

---

#### PurchaseOrder

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `poNumber` | String | — | PO number |
| `status` | String | `"DRAFT"` | DRAFT, SENT, RECEIVED, CANCELLED |
| `orderDate` | DateTime | — | Order date |
| `deliveryDate` | DateTime? | — | Expected delivery |
| `notes` | String? | — | Notes |
| `subtotal` | Decimal | `0` | Subtotal |
| `taxRate` | Decimal | `11` | Tax rate |
| `taxAmount` | Decimal | `0` | Tax amount |
| `total` | Decimal | `0` | Total |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last update timestamp |
| `tenantId` | String | — | FK → Tenant |
| `supplierId` | String? | — | FK → Supplier (optional) |

**Relations:** Belongs to → Tenant, Supplier (optional); Has many → PurchaseOrderItem

**Indexes:** `[tenantId]`, `[status]`, `[supplierId]`

---

#### PurchaseOrderItem

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `description` | String | — | Item description |
| `quantity` | Decimal | `1` | Quantity |
| `unitPrice` | Decimal | `0` | Unit price |
| `total` | Decimal | `0` | Line total |
| `purchaseOrderId` | String | — | FK → PurchaseOrder (cascade delete) |

**Relations:** Belongs to → PurchaseOrder

**Indexes:** `[purchaseOrderId]`

---

#### Quotation

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `quotationNumber` | String | — | Quotation number |
| `status` | String | `"DRAFT"` | DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED |
| `validUntil` | DateTime | — | Valid until date |
| `notes` | String? | — | Notes |
| `terms` | String? | — | Terms & conditions |
| `subtotal` | Decimal | `0` | Subtotal |
| `taxRate` | Decimal | `11` | Tax rate |
| `taxAmount` | Decimal | `0` | Tax amount |
| `discount` | Decimal | `0` | Discount amount |
| `total` | Decimal | `0` | Total |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last update timestamp |
| `tenantId` | String | — | FK → Tenant |
| `contactId` | String? | — | FK → Contact (optional) |

**Relations:** Belongs to → Tenant, Contact (optional); Has many → QuotationItem

**Indexes:** `[tenantId]`, `[status]`, `[contactId]`

---

#### QuotationItem

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `description` | String | — | Item description |
| `quantity` | Decimal | `1` | Quantity |
| `unitPrice` | Decimal | `0` | Unit price |
| `total` | Decimal | `0` | Line total |
| `quotationId` | String | — | FK → Quotation (cascade delete) |

**Relations:** Belongs to → Quotation

**Indexes:** `[quotationId]`

---

### 3.4 Inventory

#### Category

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `name` | String | — | Category name |
| `description` | String? | — | Description |
| `isActive` | Boolean | `true` | Active status |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last update timestamp |
| `tenantId` | String | — | FK → Tenant |

**Unique:** `[name, tenantId]`

**Relations:** Belongs to → Tenant; Has many → Product

**Indexes:** `[tenantId]`

---

#### Supplier

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `name` | String | — | Supplier name |
| `contactPerson` | String? | — | Contact person |
| `email` | String? | — | Email |
| `phone` | String? | — | Phone |
| `address` | String? | — | Address |
| `city` | String? | — | City |
| `rating` | Decimal | `0` | Supplier rating (0-5) |
| `notes` | String? | — | Notes |
| `isActive` | Boolean | `true` | Active status |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last update timestamp |
| `tenantId` | String | — | FK → Tenant |

**Relations:** Belongs to → Tenant; Has many → PurchaseOrder

**Indexes:** `[tenantId]`

---

#### Product

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `sku` | String | — | Stock keeping unit |
| `name` | String | — | Product name |
| `description` | String? | — | Description |
| `unit` | String | `"pcs"` | Unit of measure |
| `price` | Decimal | `0` | Selling price |
| `cost` | Decimal | `0` | Cost price |
| `stock` | Int | `0` | Current stock |
| `minStock` | Int | `0` | Minimum stock alert |
| `isActive` | Boolean | `true` | Active status |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last update timestamp |
| `deletedAt` | DateTime? | — | Soft delete |
| `tenantId` | String | — | FK → Tenant |
| `categoryId` | String? | — | FK → Category (optional) |

**Unique:** `[sku, tenantId]`

**Relations:** Belongs to → Tenant, Category (optional); Has many → StockMovement

**Indexes:** `[tenantId]`, `[categoryId]`

---

#### StockMovement

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `type` | String | — | IN, OUT, ADJUSTMENT |
| `quantity` | Int | — | Movement quantity |
| `reference` | String? | — | PO number, Invoice number, etc. |
| `notes` | String? | — | Notes |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `tenantId` | String | — | FK → Tenant |
| `productId` | String | — | FK → Product |

**Relations:** Belongs to → Tenant, Product

**Indexes:** `[tenantId]`, `[productId]`, `[type]`

---

### 3.5 HR

#### Employee

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `employeeId` | String | — | Employee ID (per-tenant unique) |
| `name` | String | — | Full name |
| `email` | String | — | Email |
| `phone` | String? | — | Phone |
| `position` | String | — | Job position |
| `department` | String? | — | Department |
| `joinDate` | DateTime | — | Join date |
| `salary` | Decimal | `0` | Monthly salary |
| `status` | String | `"ACTIVE"` | ACTIVE, INACTIVE, TERMINATED |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last update timestamp |
| `deletedAt` | DateTime? | — | Soft delete |
| `tenantId` | String | — | FK → Tenant |

**Unique:** `[employeeId, tenantId]`

**Relations:** Belongs to → Tenant; Has many → AttendanceRecord, LeaveRequest, PayrollRecord

**Indexes:** `[tenantId]`

---

#### AttendanceRecord

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `date` | DateTime | — | Attendance date |
| `clockIn` | DateTime? | — | Clock in time |
| `clockOut` | DateTime? | — | Clock out time |
| `status` | String | `"PRESENT"` | PRESENT, LATE, ABSENT, LEAVE, WFH |
| `workHours` | Decimal | `0` | Total work hours |
| `notes` | String? | — | Notes |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `tenantId` | String | — | FK → Tenant |
| `employeeId` | String | — | FK → Employee |

**Unique:** `[employeeId, date, tenantId]`

**Relations:** Belongs to → Tenant, Employee

**Indexes:** `[tenantId]`, `[employeeId]`, `[date]`

---

#### LeaveRequest

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `type` | String | `"ANNUAL"` | ANNUAL, SICK, PERSONAL, MATERNITY, UNPAID |
| `startDate` | DateTime | — | Leave start date |
| `endDate` | DateTime | — | Leave end date |
| `days` | Int | — | Number of days |
| `reason` | String? | — | Reason |
| `status` | String | `"PENDING"` | PENDING, APPROVED, REJECTED |
| `appliedDate` | DateTime | `@default(now())` | Application date |
| `approvedBy` | String? | — | Approver name |
| `notes` | String? | — | Notes |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last update timestamp |
| `tenantId` | String | — | FK → Tenant |
| `employeeId` | String | — | FK → Employee |

**Relations:** Belongs to → Tenant, Employee

**Indexes:** `[tenantId]`, `[employeeId]`, `[status]`

---

#### PayrollRecord

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `period` | String | — | Period (e.g., "2026-08") |
| `baseSalary` | Decimal | — | Base salary |
| `allowances` | Decimal | `0` | Allowances |
| `deductions` | Decimal | `0` | Deductions |
| `bonus` | Decimal | `0` | Bonus |
| `netSalary` | Decimal | — | Net salary |
| `status` | String | `"PENDING"` | PENDING, PROCESSED, PAID |
| `paidAt` | DateTime? | — | Payment timestamp |
| `notes` | String? | — | Notes |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last update timestamp |
| `tenantId` | String | — | FK → Tenant |
| `employeeId` | String | — | FK → Employee |

**Unique:** `[employeeId, period, tenantId]`

**Relations:** Belongs to → Tenant, Employee

**Indexes:** `[tenantId]`, `[employeeId]`, `[period]`

---

### 3.6 Audit & Billing

#### AuditLog

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `action` | String | — | CREATE, UPDATE, DELETE |
| `entity` | String | — | Model name (e.g., Invoice, Deal) |
| `entityId` | String? | — | ID of affected record |
| `oldValues` | String? | — | JSON string of old values |
| `newValues` | String? | — | JSON string of new values |
| `ipAddress` | String? | — | Client IP address |
| `userAgent` | String? | — | Client user agent |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `userId` | String | — | FK → User |
| `tenantId` | String | — | FK → Tenant |

**Relations:** Belongs to → User, Tenant

**Indexes:** `[userId]`, `[tenantId]`, `[entity]`

---

#### SubscriptionPlan

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `name` | String | — | Plan name (Starter, Growth, Business) |
| `slug` | String | `@unique` | URL-friendly slug |
| `description` | String? | — | Plan description |
| `price` | Int | — | Price in Rupiah |
| `billingPeriod` | String | `"monthly"` | monthly, yearly |
| `maxUsers` | Int | `5` | Maximum users |
| `maxProducts` | Int | `100` | Maximum products |
| `maxStorage` | String? | — | Storage limit (e.g., "5GB") |
| `features` | String? | — | JSON string array of features |
| `isActive` | Boolean | `true` | Active status |
| `sortOrder` | Int | `0` | Display order |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last update timestamp |

**Relations:** Has many → TenantSubscription

---

#### TenantSubscription

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `tenantId` | String | — | FK → Tenant (cascade delete) |
| `planId` | String | — | FK → SubscriptionPlan |
| `status` | String | `"TRIAL"` | TRIAL, ACTIVE, PENDING_PAYMENT, SUSPENDED, CANCELLED |
| `startDate` | DateTime | `@default(now())` | Subscription start |
| `endDate` | DateTime? | — | Subscription end |
| `nextBillingDate` | DateTime? | — | Next billing date |
| `paymentMethod` | String? | — | manual_transfer |
| `notes` | String? | — | Notes |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last update timestamp |

**Relations:** Belongs to → Tenant, SubscriptionPlan; Has many → BillingPayment

**Indexes:** `[tenantId]`, `[status]`

---

#### BillingPayment

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (cuid) | `@default(cuid())` | Primary key |
| `subscriptionId` | String | — | FK → TenantSubscription (cascade delete) |
| `tenantId` | String | — | FK → Tenant (cascade delete) |
| `amount` | Int | — | Amount in Rupiah |
| `paymentMethod` | String | — | manual_transfer |
| `bankName` | String? | — | Bank name (BRI, JAGO, BTN, BSI) |
| `accountNumber` | String? | — | Sender account number |
| `accountName` | String? | — | Sender account name |
| `proofFileUrl` | String? | — | Proof file URL/path |
| `proofFileName` | String? | — | Original filename |
| `reference` | String? | — | Reference number |
| `status` | String | `"PENDING"` | PENDING, VERIFIED, REJECTED |
| `verifiedById` | String? | — | userId of admin who verified |
| `verifiedAt` | DateTime? | — | Verification timestamp |
| `rejectReason` | String? | — | Rejection reason |
| `notes` | String? | — | Notes |
| `waConfirmed` | Boolean | `false` | WhatsApp confirmation flag |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last update timestamp |

**Relations:** Belongs to → TenantSubscription, Tenant

**Indexes:** `[tenantId]`, `[status]`, `[subscriptionId]`

---

## 4. Relationships

### Summary

| Parent | Child | Type | Cascade |
|--------|-------|------|---------|
| Tenant | User | 1:N | — |
| Tenant | Contact | 1:N | — |
| Tenant | Product | 1:N | — |
| Tenant | Category | 1:N | — |
| Tenant | Supplier | 1:N | — |
| Tenant | Invoice | 1:N | — |
| Tenant | Payment | 1:N | — |
| Tenant | PurchaseOrder | 1:N | — |
| Tenant | Quotation | 1:N | — |
| Tenant | Lead | 1:N | — |
| Tenant | Deal | 1:N | — |
| Tenant | Employee | 1:N | — |
| Tenant | AuditLog | 1:N | — |
| Tenant | TenantSubscription | 1:N | Cascade |
| Tenant | BillingPayment | 1:N | Cascade |
| Contact | Invoice | 1:N | — |
| Contact | Lead | 1:N | — |
| Contact | Deal | 1:N | — |
| Contact | Quotation | 1:N | — |
| Invoice | InvoiceItem | 1:N | Cascade |
| Invoice | Payment | 1:N | — |
| PurchaseOrder | PurchaseOrderItem | 1:N | Cascade |
| Quotation | QuotationItem | 1:N | Cascade |
| Category | Product | 1:N | — |
| Product | StockMovement | 1:N | — |
| Supplier | PurchaseOrder | 1:N | — |
| Employee | AttendanceRecord | 1:N | — |
| Employee | LeaveRequest | 1:N | — |
| Employee | PayrollRecord | 1:N | — |
| User | AuditLog | 1:N | — |
| SubscriptionPlan | TenantSubscription | 1:N | — |
| TenantSubscription | BillingPayment | 1:N | Cascade |

---

## 5. Tenant Isolation Rules

### Rule 1: Every Query Must Filter by tenantId

```typescript
// ✅ CORRECT
const invoices = await prisma.invoice.findMany({
  where: { tenantId: session.user.tenantId }
});

// ❌ WRONG — leaks data across tenants
const invoices = await prisma.invoice.findMany();
```

### Rule 2: tenantId Comes from JWT Session

```typescript
const session = await getServerSession(authOptions);
const tenantId = session?.user?.tenantId;
// Never accept tenantId from client request body
```

### Rule 3: Registration Creates Tenant + User

```typescript
// POST /api/auth/register
const tenant = await prisma.tenant.create({ data: { name, slug } });
const user = await prisma.user.create({
  data: { email, passwordHash, role: "SUPERADMIN", tenantId: tenant.id }
});
```

### Rule 4: No Cross-Tenant Queries

Even SUPERADMIN cannot query across tenants in normal API routes. Cross-tenant operations are only available through admin-level system routes (not yet implemented).

---

## 6. Indexes & Constraints

### Indexes Summary

| Model | Indexes |
|-------|---------|
| User | `[tenantId]` |
| Contact | `[tenantId]`, `[type]` |
| Invoice | `[tenantId]`, `[status]`, `[contactId]` |
| InvoiceItem | `[invoiceId]` |
| Payment | `[tenantId]`, `[invoiceId]` |
| PurchaseOrder | `[tenantId]`, `[status]`, `[supplierId]` |
| PurchaseOrderItem | `[purchaseOrderId]` |
| Quotation | `[tenantId]`, `[status]`, `[contactId]` |
| QuotationItem | `[quotationId]` |
| Category | `[tenantId]` + unique `[name, tenantId]` |
| Supplier | `[tenantId]` |
| Product | `[tenantId]`, `[categoryId]` + unique `[sku, tenantId]` |
| StockMovement | `[tenantId]`, `[productId]`, `[type]` |
| Employee | `[tenantId]` + unique `[employeeId, tenantId]` |
| AttendanceRecord | `[tenantId]`, `[employeeId]`, `[date]` + unique `[employeeId, date, tenantId]` |
| LeaveRequest | `[tenantId]`, `[employeeId]`, `[status]` |
| PayrollRecord | `[tenantId]`, `[employeeId]`, `[period]` + unique `[employeeId, period, tenantId]` |
| AuditLog | `[userId]`, `[tenantId]`, `[entity]` |
| TenantSubscription | `[tenantId]`, `[status]` |
| BillingPayment | `[tenantId]`, `[status]`, `[subscriptionId]` |

### Constraints

| Constraint | Models | Fields |
|------------|--------|--------|
| **Global Unique** | User | `email` |
| **Global Unique** | SubscriptionPlan | `slug` |
| **Global Unique** | Tenant | `slug` |
| **Tenant Unique** | Category | `[name, tenantId]` |
| **Tenant Unique** | Product | `[sku, tenantId]` |
| **Tenant Unique** | Employee | `[employeeId, tenantId]` |
| **Tenant Unique** | AttendanceRecord | `[employeeId, date, tenantId]` |
| **Tenant Unique** | PayrollRecord | `[employeeId, period, tenantId]` |

---

## 7. Soft Delete Policy

### Entities with Soft Delete (`deletedAt`)

| Model | Field | Notes |
|-------|-------|-------|
| Tenant | `deletedAt` | Tenant-level soft delete |
| User | `deletedAt` | User account deactivation |
| Contact | `deletedAt` | Contact archival |
| Product | `deletedAt` | Product archival |
| Employee | `deletedAt` | Employee record archival |

### Pattern

```typescript
// Soft delete
await prisma.contact.update({
  where: { id },
  data: { deletedAt: new Date() }
});

// Query (exclude soft-deleted)
const contacts = await prisma.contact.findMany({
  where: { tenantId, deletedAt: null }
});
```

### Note

Soft-deleted records are **not** automatically excluded by Prisma. All queries must explicitly filter `deletedAt: null`.

---

## 8. Audit Fields

### Standard Audit Fields

| Field | Type | Present On | Description |
|-------|------|-----------|-------------|
| `createdAt` | DateTime | All mutable entities | Auto-set on creation |
| `updatedAt` | DateTime | All mutable entities | Auto-updated on modification |
| `deletedAt` | DateTime? | Soft-deletable entities | Set on soft delete |

### Audit Trail (Separate Model)

The `AuditLog` model captures mutation history:

```typescript
// Logged via apps/web/lib/audit.ts
await logAudit({
  userId: session.user.id,
  tenantId: session.user.tenantId,
  action: "CREATE",     // CREATE | UPDATE | DELETE
  entity: "Invoice",
  entityId: invoice.id,
  oldValues: oldData,    // Only for UPDATE/DELETE
  newValues: newData,    // Only for CREATE/UPDATE
  request: request,      // Auto-extracts IP + User-Agent
});
```

---

## 9. Migration Rules

### Development Workflow

```bash
# 1. Edit schema.prisma
# 2. Push changes to dev database
pnpm db:push

# 3. Generate Prisma client
pnpm db:generate

# 4. Seed demo data
pnpm db:seed

# 5. Open Prisma Studio (visual DB browser)
pnpm db:studio
```

### Production Migration Rules

1. **Never** modify production schema without a migration plan
2. **Always** test migrations on staging first
3. **Use** `prisma migrate dev` for development migrations
4. **Use** `prisma migrate deploy` for production deployments
5. **Backup** database before any migration
6. **Decimal fields** — Monetary fields use `Decimal @db.Decimal(15, 2)` for exact arithmetic

### Naming Convention

- Models: PascalCase (`InvoiceItem`)
- Fields: camelCase (`invoiceNumber`)
- Tables: PascalCase (Prisma default, matches model name)
- Indexes: Auto-generated by Prisma

---

## File Reference

| File | Purpose |
|------|---------|
| [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma) | Prisma schema (source of truth) |
| [`packages/db/prisma/seed.ts`](packages/db/prisma/seed.ts) | Database seeder |
| [`packages/db/src/index.ts`](packages/db/src/index.ts) | Package entry point |
| [`apps/web/lib/db.ts`](apps/web/lib/db.ts) | Prisma client singleton |
| [`apps/web/lib/audit.ts`](apps/web/lib/audit.ts) | Audit trail logging |
