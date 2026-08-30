# ARCHITECTURE

> Dokumentasi arsitektur system Qalcuity All-in-One ERP/CRM.
> Last Updated: 2026-08-28

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Component Diagram](#2-component-diagram)
3. [Data Flow](#3-data-flow)
4. [API Design Principles](#4-api-design-principles)
5. [Multi-Tenant Architecture](#5-multi-tenant-architecture)
6. [Authentication Flow](#6-authentication-flow)
7. [Integration Architecture](#7-integration-architecture)
8. [Offline Architecture](#8-offline-architecture)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT PLATFORMS                                │
│                                                                         │
│  ┌──────────────┐  ┌──────────────────┐  ┌────────────────────────┐    │
│  │   Web App    │  │   Desktop App    │  │     Mobile App         │    │
│  │  (Next.js)   │  │  (Electron)      │  │  (React Native/Expo)   │    │
│  │  apps/web/   │  │  apps/desktop/   │  │  apps/mobile/          │    │
│  └──────┬───────┘  └────────┬─────────┘  └───────────┬────────────┘    │
│         │                   │                         │                 │
│         └───────────────────┼─────────────────────────┘                 │
│                             │                                           │
└─────────────────────────────┼───────────────────────────────────────────┘
                              │ HTTPS / REST API
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS SERVER                                    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     MIDDLEWARE LAYER                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │   │
│  │  │  NextAuth    │  │    RBAC      │  │   Rate Limiter   │      │   │
│  │  │  (JWT Auth)  │  │  (4 Roles)   │  │  (Per-IP)        │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   ROUTE HANDLERS (API)                           │   │
│  │                                                                  │   │
│  │  /api/auth/*          Auth (login, register, session)           │   │
│  │  /api/crm/*           CRM (leads, contacts, deals)             │   │
│  │  /api/finance/*       Finance (invoices, payments, PO, CoA)    │   │
│  │  /api/hr/*            HR (employees, attendance, leaves)        │   │
│  │  /api/inventory/*     Inventory (products, categories, stock)   │   │
│  │  /api/billing/*       Billing & Subscription                    │   │
│  │  /api/reports/*       Reporting (12 report types)               │   │
│  │  /api/settings/*      Settings (company, team, notifications)   │   │
│  │  /api/audit/*         Audit Trail                               │   │
│  │  /api/search/*        Global Search (Ctrl+K)                    │   │
│  │  /api/health/*        Health Check                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    BUSINESS LOGIC LAYER                          │   │
│  │                                                                  │   │
│  │  lib/auth.ts        Auth configuration & JWT callbacks          │   │
│  │  lib/db.ts          Prisma client singleton                     │   │
│  │  lib/audit.ts       Audit trail logging                         │   │
│  │  lib/rate-limit.ts  In-memory rate limiter                      │   │
│  │  lib/export.ts      CSV/Excel/Print export                      │   │
│  │  lib/email.ts       Email notification (placeholder)            │   │
│  │  lib/i18n.tsx       Internationalization provider                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │ Prisma ORM
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Prisma Schema (packages/db/prisma/schema.prisma)               │   │
│  │  26 models │ Multi-tenant │ Soft delete │ Audit fields          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│         ┌────────────────────┼────────────────────┐                    │
│         ▼                    ▼                    ▼                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐            │
│  │ SQLite (dev) │  │ PostgreSQL   │  │ In-Memory Store  │            │
│  │              │  │ (prod)       │  │ (CoA, Reconcil.) │            │
│  └──────────────┘  └──────────────┘  └──────────────────┘            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | Next.js | 14.2+ | React SSR/SSG, API routes, middleware |
| **Language** | TypeScript | 5.5+ | Type safety across entire codebase |
| **UI** | React | 18.3+ | Component-based UI |
| **Styling** | Tailwind CSS | 3.4+ | Utility-first CSS |
| **Icons** | Lucide React | 1.31+ | Consistent icon library |
| **ORM** | Prisma | 5.15+ | Database access, migrations, type safety |
| **Database** | SQLite / PostgreSQL | — | Dev: SQLite, Prod: PostgreSQL |
| **Auth** | NextAuth.js | 4.24+ | JWT-based authentication |
| **Monorepo** | pnpm + Turborepo | 9.0 / 2.0 | Workspace management, build orchestration |
| **Desktop** | Electron | — | Desktop app wrapper |
| **Mobile** | React Native / Expo | — | Mobile app (iOS/Android) |

---

## 2. Component Diagram

### Module Structure

```
apps/web/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API Route Handlers
│   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── [...nextauth]/    # NextAuth handler
│   │   │   └── register/         # User registration
│   │   ├── crm/                  # CRM endpoints
│   │   │   ├── contacts/         # CRUD contacts
│   │   │   ├── deals/            # CRUD deals
│   │   │   └── leads/            # CRUD leads
│   │   ├── finance/              # Finance endpoints
│   │   │   ├── accounts/         # Chart of Accounts (in-memory)
│   │   │   ├── invoices/         # CRUD invoices
│   │   │   ├── payments/         # CRUD payments + process
│   │   │   ├── purchase-orders/  # CRUD purchase orders
│   │   │   ├── quotations/       # CRUD quotations
│   │   │   └── reconciliation/   # Bank reconciliation (in-memory)
│   │   ├── hr/                   # HR endpoints
│   │   │   ├── employees/        # CRUD employees
│   │   │   ├── attendance/       # CRUD attendance
│   │   │   ├── leaves/           # CRUD leave requests
│   │   │   └── payroll/          # CRUD payroll records
│   │   ├── inventory/            # Inventory endpoints
│   │   │   ├── categories/       # CRUD categories
│   │   │   ├── products/         # CRUD products
│   │   │   └── suppliers/        # CRUD suppliers
│   │   ├── billing/              # Billing & subscription
│   │   ├── reports/              # Reporting engine
│   │   ├── settings/             # Settings management
│   │   ├── audit/                # Audit trail
│   │   ├── search/               # Global search
│   │   └── health/               # Health check
│   ├── dashboard/                # Dashboard pages (SSR)
│   │   ├── crm/                  # CRM views
│   │   ├── finance/              # Finance views
│   │   ├── hr/                   # HR views
│   │   ├── inventory/            # Inventory views
│   │   ├── reports/              # Reports view
│   │   ├── billing/              # Billing view
│   │   ├── settings/             # Settings views
│   │   ├── audit/                # Audit trail view
│   │   └── ai/                   # AI Hub page
│   ├── layout.tsx                # Root layout (Session + i18n providers)
│   └── page.tsx                  # Landing/redirect page
├── components/                   # Shared React components
│   ├── auth/                     # Auth-related components
│   ├── finance/                  # Finance form components
│   ├── layout/                   # Layout (sidebar, header, dashboard-layout)
│   ├── ui/                       # Generic UI components (charts, modal, etc.)
│   └── ai/                       # AI chat component
├── lib/                          # Utility libraries
│   ├── auth.ts                   # NextAuth configuration
│   ├── db.ts                     # Prisma client singleton
│   ├── audit.ts                  # Audit trail helpers
│   ├── rate-limit.ts             # Rate limiting
│   ├── export.ts                 # Export utilities
│   ├── email.ts                  # Email utilities
│   ├── email-templates.ts        # Email templates
│   ├── i18n.tsx                  # i18n provider + translations
│   └── api.ts                    # Client-side API helpers
├── messages/                     # Translation files
│   ├── id.json                   # Bahasa Indonesia
│   └── en.json                   # English
└── types/                        # TypeScript type definitions
    └── next-auth.d.ts            # NextAuth type augmentation

packages/
├── db/                           # Database package
│   ├── prisma/
│   │   ├── schema.prisma         # Prisma schema (26 models)
│   │   ├── seed.ts               # Database seeder
│   │   └── seed/                 # Seed data modules
│   └── src/index.ts              # Package entry point
├── types/                        # Shared TypeScript types
│   └── src/index.ts
└── utils/                        # Shared utilities
    └── src/index.ts

apps/desktop/                     # Electron desktop app
├── main.js                       # Electron main process
├── preload.js                    # Preload script
└── package.json

apps/mobile/                      # React Native mobile app
├── app.json                      # Expo config
├── App.tsx                       # Root component
├── components/                   # Mobile-specific components
├── screens/                      # Screen components
└── lib/                          # Mobile utilities
```

### Monorepo Structure

```
qalcuity-allinone/               # Root workspace
├── apps/
│   ├── web/                      # @qalcuity/web — Core Next.js app
│   ├── desktop/                  # Electron wrapper
│   └── mobile/                   # React Native / Expo
├── packages/
│   ├── db/                       # @qalcuity/db — Prisma schema + client
│   ├── types/                    # @qalcuity/types — Shared types
│   └── utils/                    # @qalcuity/utils — Shared utilities
├── plans/                        # Planning documents
├── pnpm-workspace.yaml           # Workspace definition
├── package.json                  # Root scripts (turbo dev/build/lint)
└── turbo.json                    # Turborepo configuration (if exists)
```

---

## 3. Data Flow

### Request Lifecycle

```
Client Request
      │
      ▼
┌─────────────┐
│  Middleware  │  1. Check JWT token (NextAuth)
│  (Next.js)  │  2. Verify role for admin-only paths
│             │  3. Apply rate limiting
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Route      │  4. Parse request body/params
│  Handler    │  5. Validate input
│  (API)      │  6. Extract tenantId from session
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Business   │  7. Apply business logic
│  Logic      │  8. Query database via Prisma
│             │  9. Log audit trail (for mutations)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Database   │  10. Execute query (tenant-scoped)
│  (Prisma)   │  11. Return result
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Response   │  12. Format JSON response
│             │  13. Return to client
└─────────────┘
```

### CRUD Operation Flow (with Audit)

```
POST /api/finance/invoices
      │
      ▼
1. Extract session (userId, tenantId, role)
      │
      ▼
2. Validate input (body parsing + field validation)
      │
      ▼
3. Check RBAC permission (role-based)
      │
      ▼
4. Check rate limit (per IP)
      │
      ▼
5. Create record in DB (with tenantId filter)
      │
      ▼
6. Log audit trail (CREATE action, newValues)
      │
      ▼
7. Return 201 + created record
```

---

## 4. API Design Principles

### URL Convention

| Pattern | Method | Description |
|---------|--------|-------------|
| `/api/{module}` | GET | List all (paginated) |
| `/api/{module}` | POST | Create new |
| `/api/{module}/[id]` | GET | Get by ID |
| `/api/{module}/[id]` | PUT | Update by ID |
| `/api/{module}/[id]` | DELETE | Soft delete by ID |
| `/api/{module}/{action}` | POST | Custom action (e.g., `/process`) |

### Response Format

```typescript
// Success
{
  "data": T | T[],
  "pagination"?: {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  }
}

// Error
{
  "error": string,
  "message": string
}
```

### Current API Endpoints

| Module | Endpoint | Methods |
|--------|----------|---------|
| **Auth** | `/api/auth/[...nextauth]` | GET, POST |
| **Auth** | `/api/auth/register` | POST |
| **CRM** | `/api/crm/contacts`, `/api/crm/contacts/[id]` | GET, POST, PUT, DELETE |
| **CRM** | `/api/crm/deals`, `/api/crm/deals/[id]` | GET, POST, PUT, DELETE |
| **CRM** | `/api/crm/leads`, `/api/crm/leads/[id]` | GET, POST, PUT, DELETE |
| **Finance** | `/api/finance/invoices`, `/api/finance/invoices/[id]` | GET, POST, PUT, DELETE |
| **Finance** | `/api/finance/payments`, `/api/finance/payments/[id]` | GET, POST, PUT, DELETE |
| **Finance** | `/api/finance/payments/process` | POST |
| **Finance** | `/api/finance/quotations`, `/api/finance/quotations/[id]` | GET, POST, PUT, DELETE |
| **Finance** | `/api/finance/purchase-orders`, `/api/finance/purchase-orders/[id]` | GET, POST, PUT, DELETE |
| **Finance** | `/api/finance/accounts` | GET, POST |
| **Finance** | `/api/finance/reconciliation` | GET, POST |
| **HR** | `/api/hr/employees`, `/api/hr/employees/[id]` | GET, POST, PUT, DELETE |
| **HR** | `/api/hr/attendance`, `/api/hr/attendance/[id]` | GET, POST, PUT, DELETE |
| **HR** | `/api/hr/leaves`, `/api/hr/leaves/[id]` | GET, POST, PUT, DELETE |
| **HR** | `/api/hr/payroll`, `/api/hr/payroll/[id]` | GET, POST, PUT, DELETE |
| **Inventory** | `/api/inventory/products`, `/api/inventory/products/[id]` | GET, POST, PUT, DELETE |
| **Inventory** | `/api/inventory/categories` | GET, POST |
| **Inventory** | `/api/inventory/suppliers`, `/api/inventory/suppliers/[id]` | GET, POST, PUT, DELETE |
| **Billing** | `/api/billing/plans` | GET |
| **Billing** | `/api/billing/subscription` | GET |
| **Billing** | `/api/billing/payments`, `/api/billing/payments/upload` | GET, POST |
| **Billing** | `/api/billing/admin/payments`, `/api/billing/admin/stats`, `/api/billing/admin/notifications` | GET, POST |
| **Reports** | `/api/reports` | GET |
| **Settings** | `/api/settings/company`, `/api/settings/team`, `/api/settings/notifications`, `/api/settings/security`, `/api/settings/profile` | GET, POST |
| **Audit** | `/api/audit/logs` | GET |
| **Search** | `/api/search` | GET |
| **Health** | `/api/health` | GET |

---

## 5. Multi-Tenant Architecture

### Model

Qalcuity menggunakan **shared database, shared schema** multi-tenancy. Setiap record memiliki `tenantId` yang menghubungkannya ke `Tenant` model.

```
┌─────────────────────────────────────────────────────┐
│                    TENANT MODEL                       │
│                                                       │
│  Tenant                                               │
│  ├── id (cuid)                                       │
│  ├── name, slug (unique)                             │
│  ├── logo, address, phone, email, website            │
│  ├── settings (JSON string)                          │
│  ├── subscriptionStatus (TRIAL/ACTIVE/PENDING/...)   │
│  ├── currentPlanSlug (starter/growth/business)       │
│  └── trialEndsAt                                     │
│                                                       │
│  Has Many:                                            │
│  ├── User[]                                          │
│  ├── Contact[], Product[], Category[], Supplier[]    │
│  ├── Invoice[], Payment[], PurchaseOrder[]           │
│  ├── Quotation[], Lead[], Deal[]                     │
│  ├── Employee[], AttendanceRecord[]                  │
│  ├── LeaveRequest[], PayrollRecord[]                 │
│  ├── AuditLog[]                                      │
│  ├── TenantSubscription[], BillingPayment[]          │
│  └── StockMovement[]                                 │
└─────────────────────────────────────────────────────┘
```

### Tenant Isolation Rules

1. **Every API request** extracts `tenantId` from the JWT session token
2. **Every database query** includes `WHERE tenantId = ?` filter
3. **No cross-tenant data access** — enforced at application layer
4. **Registration** creates a new Tenant + first User (SUPERADMIN)

### Implementation Pattern

```typescript
// Every API route follows this pattern:
const session = await getServerSession(authOptions);
const tenantId = session?.user?.tenantId;

// Query is always scoped to tenant
const data = await prisma.invoice.findMany({
  where: { tenantId },
  // ...other filters
});
```

---

## 6. Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Login   │ ──→ │ NextAuth │ ──→ │  JWT     │ ──→ │  Session │
│  Form    │     │ Provider │     │  Token   │     │  Cookie  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                      │                                   │
                      ▼                                   ▼
                 ┌──────────┐                       ┌──────────┐
                 │  Verify  │                       │ Middleware│
                 │ Password │                       │ (RBAC)   │
                 │ (bcrypt) │                       └──────────┘
                 └──────────┘

JWT Token Payload:
{
  "sub": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "ADMIN",           // SUPERADMIN | ADMIN | MEMBER | VIEWER
  "tenantId": "tenant-id"
}
```

### Role Hierarchy

| Role | Access Level | Description |
|------|-------------|-------------|
| **SUPERADMIN** | Full access | System administrator, can manage all tenants |
| **ADMIN** | Full module access | Tenant administrator, can access Settings & Audit |
| **MEMBER** | Module access | Regular user, cannot access Settings & Audit |
| **VIEWER** | Read-only | Read-only access, no create/edit/delete |

### Route Protection

- **Middleware** ([`apps/web/middleware.ts`](apps/web/middleware.ts)) protects `/dashboard/*` routes
- **Admin-only paths**: `/dashboard/settings`, `/dashboard/audit`
- **API routes** extract session server-side via `getServerSession(authOptions)`

---

## 7. Integration Architecture

### Current Integrations

| Integration | Status | Implementation |
|-------------|--------|---------------|
| **WhatsApp** | 🔲 Planned | User provides API key |
| **Marketplace** | 🔲 Planned | User provides API key |
| **Payment Gateway** | 🔲 Planned | Midtrans/Xendit config |
| **Email (SMTP)** | 🔲 Placeholder | [`apps/web/lib/email.ts`](apps/web/lib/email.ts) |
| **File Upload** | ✅ Basic | Drag & drop + logo upload |

### Integration Dashboard Pattern

```
┌─────────────────────────────────────────────────────┐
│              INTEGRATION DASHBOARD                    │
│                                                       │
│  User plugs in their own API keys:                    │
│                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │WhatsApp  │ │Payment GW│ │ Email    │            │
│  │API Key   │ │API Key   │ │ SMTP     │            │
│  │[User]    │ │[User]    │ │[User]    │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                       │
│  Qalcuity provides the framework                     │
│  User manages their own integrations                 │
└─────────────────────────────────────────────────────┘
```

---

## 8. Offline Architecture

### Current Status: 🔲 Planned

### Target Architecture

```
┌─────────────────────────────────────────────────────┐
│                OFFLINE MODE                          │
│                                                       │
│  ┌──────────────────┐    ┌──────────────────┐       │
│  │  Service Worker  │    │  Local Cache     │       │
│  │  (Web)           │    │  (IndexedDB)     │       │
│  └──────────────────┘    └──────────────────┘       │
│                                                       │
│  ┌──────────────────┐    ┌──────────────────┐       │
│  │  Electron Cache  │    │  SQLite Local    │       │
│  │  (Desktop)       │    │  (Mobile)        │       │
│  └──────────────────┘    └──────────────────┘       │
│                                                       │
│  Sync Strategy:                                       │
│  1. Queue writes locally when offline                 │
│  2. Sync on reconnect (conflict resolution)           │
│  3. Cache reads for offline access                    │
└─────────────────────────────────────────────────────┘
```

### Sync Strategy

1. **Read-through cache** — Serve from cache, update in background
2. **Write queue** — Queue mutations locally, sync when online
3. **Conflict resolution** — Last-write-wins with timestamp comparison
4. **Partial sync** — Sync only changed records (delta sync)

---

## File Reference

| File | Purpose |
|------|---------|
| [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma) | Database schema (26 models) |
| [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts) | NextAuth configuration |
| [`apps/web/lib/db.ts`](apps/web/lib/db.ts) | Prisma client singleton |
| [`apps/web/lib/audit.ts`](apps/web/lib/audit.ts) | Audit trail logging |
| [`apps/web/lib/rate-limit.ts`](apps/web/lib/rate-limit.ts) | Rate limiter |
| [`apps/web/middleware.ts`](apps/web/middleware.ts) | Route protection middleware |
| [`apps/web/app/layout.tsx`](apps/web/app/layout.tsx) | Root layout |
| [`apps/web/components/layout/sidebar.tsx`](apps/web/components/layout/sidebar.tsx) | Navigation sidebar |
| [`CURRENT.md`](CURRENT.md) | Current state source of truth |
