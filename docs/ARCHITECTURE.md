# 🏗️ Qalcuity — Technical Architecture

> **Last Updated:** 30 Agustus 2026
> **Current Version:** v1.0.0-beta.1

---

## 📋 Daftar Isi

1. [System Overview](#1-system-overview)
2. [Tech Stack](#2-tech-stack)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Permission Architecture](#4-permission-architecture)
5. [Application Architecture](#5-application-architecture)
6. [Shared Packages](#6-shared-packages)
7. [Data Flow](#7-data-flow)
8. [Security Layers](#8-security-layers)
9. [API Design](#9-api-design)
10. [Control Center Architecture](#10-control-center-architecture)
11. [Deployment Architecture](#11-deployment-architecture)

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PLATFORMS                                            │
│                                                                             │
│  ┌──────────────┐  ┌──────────────────┐  ┌────────────────────────┐        │
│  │   Web App    │  │   Desktop App    │  │     Mobile App         │        │
│  │  (Next.js)   │  │  (Electron)      │  │  (React Native/Expo)   │        │
│  │  apps/web/   │  │  apps/desktop/   │  │  apps/mobile/          │        │
│  │  ✅ Active   │  │  ⚠️ Placeholder  │  │  ⚠️ Partial            │        │
│  └──────┬───────┘  └────────┬─────────┘  └───────────┬────────────┘        │
│         │                   │                         │                     │
│         └───────────────────┼─────────────────────────┘                     │
│                             │ HTTPS / REST API                              │
└─────────────────────────────┼───────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────────────┐
│                        NEXT.JS SERVER                                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     MIDDLEWARE LAYER                                 │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐          │   │
│  │  │  NextAuth    │  │    RBAC      │  │   Rate Limiter   │          │   │
│  │  │  (JWT Auth)  │  │  (4 Roles)   │  │  (Per-IP)        │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   ROUTE HANDLERS (35 routes, 19 files)               │   │
│  │                                                                      │   │
│  │  /api/auth/*          Auth (login, register, session)               │   │
│  │  /api/crm/*           CRM (leads, contacts, deals)                  │   │
│  │  /api/finance/*       Finance (invoices, payments, PO, CoA)        │   │
│  │  /api/hr/*            HR (employees, attendance, leaves, payroll)   │   │
│  │  /api/inventory/*     Inventory (products, categories, suppliers)   │   │
│  │  /api/reports/*       Reporting (12 report types)                   │   │
│  │  /api/settings/*      Settings (company, team, notifications)       │   │
│  │  /api/audit/*         Audit Trail                                   │   │
│  │  /api/search/*        Global Search (Ctrl+K)                        │   │
│  │  /api/health/*        Health Check                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    BUSINESS LOGIC LAYER                              │   │
│  │                                                                      │   │
│  │  lib/auth.ts        Auth configuration & JWT callbacks              │   │
│  │  lib/db.ts          Prisma client singleton                         │   │
│  │  lib/session.ts     Session helpers (requireMutateAuth, etc.)       │   │
│  │  lib/audit.ts       Audit trail logging                             │   │
│  │  lib/rate-limit.ts  In-memory rate limiter                          │   │
│  │  lib/sanitize.ts    Input sanitization                              │   │
│  │  lib/export.ts      CSV/Excel/Print export                          │   │
│  │  lib/email.ts       Email notification (SMTP)                       │   │
│  │  lib/validation-schemas.ts  Zod schemas (14+)                       │   │
│  │  lib/i18n.tsx       Internationalization provider                   │   │
│  │  lib/ai/provider.ts AI provider abstraction                         │   │
│  │  lib/payment/       Payment gateway abstraction (Midtrans/Xendit)   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
└──────────────────────────────┼──────────────────────────────────────────────┘
                               │ Prisma ORM
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Prisma Schema (packages/db/prisma/schema.prisma)               │   │
│  │  26 models │ Multi-tenant │ Soft delete │ Audit fields          │   │
│  │  57 indexes │ Decimal(15,2) │ CUID IDs                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│         ┌────────────────────────────────────────┐                          │
│         ▼                                        ▼                          │
│  ┌──────────────────┐              ┌──────────────────┐                    │
│  │ PostgreSQL 18.4  │              │ In-Memory Store  │                    │
│  │ (DBngin local)   │              │ (AI mock data)   │                    │
│  │ Trust auth       │              └──────────────────┘                    │
│  └──────────────────┘                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

| Layer | Technology | Version | Status |
|-------|-----------|---------|--------|
| **Framework** | Next.js | 14+ (App Router) | ✅ Active |
| **Language** | TypeScript | 5.x (Strict) | ✅ Active |
| **UI Library** | React | 18.3+ | ✅ Active |
| **Styling** | Tailwind CSS | 3.4 | ✅ Active |
| **Icons** | Lucide React | 1.31+ | ✅ Active |
| **ORM** | Prisma | 5.22 | ✅ Active |
| **Database** | PostgreSQL | 18.4 (DBngin) | ✅ Active |
| **Auth** | NextAuth.js | 4.24 (JWT) | ✅ Active |
| **Validation** | Zod | 3.x | ✅ Active |
| **Monorepo** | pnpm workspaces | — | ✅ Active |
| **Desktop** | Electron | — | ⚠️ Placeholder |
| **Mobile** | React Native / Expo | — | ⚠️ Partial |

---

## 3. Monorepo Structure (Updated)

```
qalcuity-allinone/
├── apps/
│   ├── web/                    # @qalcuity/web — Next.js core app (Customer ERP)
│   │   ├── app/                # Next.js App Router pages
│   │   │   ├── api/            # API Route Handlers (35 routes)
│   │   │   ├── dashboard/      # Dashboard pages (SSR)
│   │   │   ├── (auth)/         # Auth pages (login, register)
│   │   │   ├── layout.tsx      # Root layout
│   │   │   └── page.tsx        # Landing page
│   │   ├── components/         # React components
│   │   ├── lib/                # Utility libraries
│   │   ├── messages/           # i18n translation files
│   │   └── types/              # TypeScript type definitions
│   ├── desktop/                # Electron desktop app (Customer ERP)
│   │   ├── main.js             # Electron main process
│   │   ├── preload.js          # Preload script
│   │   └── package.json        # Desktop dependencies
│   ├── mobile/                 # React Native / Expo mobile app (Customer ERP)
│   │   ├── screens/            # Screen components
│   │   ├── lib/                # API utilities
│   │   ├── App.tsx             # App entry point
│   │   └── app.json            # Expo config
│   └── platform-admin/         # Qalcuity Admin dashboard [PLANNED]
│       └── ...                 # Platform management UI
├── packages/
│   ├── auth/                   # @qalcuity/auth — Auth logic [PLANNED]
│   │   └── src/
│   │       ├── index.ts
│   │       ├── session.ts      # Session management
│   │       └── providers.ts    # Auth providers
│   ├── permissions/            # @qalcuity/permissions — Permission engine [PLANNED]
│   │   └── src/
│   │       ├── index.ts
│   │       ├── engine.ts       # can() permission engine
│   │       ├── types.ts        # Permission types
│   │       └── constants.ts    # Permission definitions
│   ├── db/                     # @qalcuity/db — Prisma schema + client
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema (26+ models)
│   │   │   └── seed.ts         # Database seeder
│   │   └── src/index.ts        # Package entry point
│   ├── types/                  # @qalcuity/types — Shared TypeScript types
│   │   └── src/index.ts
│   ├── utils/                  # @qalcuity/utils — Shared utilities
│   │   └── src/index.ts
│   ├── config/                 # @qalcuity/config — App constants + env config
│   │   └── src/
│   │       ├── constants.ts
│   │       ├── env.ts
│   │       └── features.ts
│   ├── validation/             # @qalcuity/validation — Zod schemas
│   │   └── src/index.ts
│   ├── ui/                     # @qalcuity/ui — Design tokens (partial)
│   │   └── src/
│   │       ├── tokens.ts
│   │       ├── theme.ts
│   │       └── icons.ts
│   └── i18n/                   # @qalcuity/i18n — i18n utilities
├── docs/                       # Documentation
├── plans/                      # Development plans
├── pnpm-workspace.yaml         # Workspace configuration
└── package.json                # Root scripts
```

---

## 4. Permission Architecture

### Model

```
User → Membership → Role → Permission → Scope → Resource → Action
```

### Permission Engine

```typescript
// Core permission check
can(user, action, resource, context) → boolean

// Example usage
can(budi, "approve", "invoice", { branch: "Surabaya" })
// → true if budi has invoice.approve permission for Surabaya branch
```

### Two Universes

| Universe | Scope | Examples |
|----------|-------|----------|
| **Platform Permissions** | Internal Qalcuity operations | `tenant.view`, `subscription.manage`, `system.monitor`, `platform.billing` |
| **Tenant Permissions** | Customer organization operations | `invoice.approve`, `employee.view`, `payroll.manage`, `inventory.adjust` |

> ⚠️ Keduanya tidak boleh tercampur.

### Permission Flow

```
User
 ↓
Organization Membership
 ↓
Role
 ↓
Permission
 ↓
Resource
 ↓
Action
 ↓
Scope (Branch / Department)
```

### Cross-platform Enforcement

| Platform | Enforcement Method | Notes |
|----------|-------------------|-------|
| **Web** | UI conditional rendering + API middleware | Current: role-based. Target: permission-based |
| **Mobile** | Same permission engine | `@qalcuity/permissions` package |
| **Desktop** | Same permission engine | `@qalcuity/permissions` package |
| **API** | Middleware enforcement | `can()` check on every route |
| **AI Agent** | Tool-level permission checks | Agent checks before executing actions |

### Current vs Target

| Aspect | Current (v1.0) | Target (v2.0) |
|--------|----------------|---------------|
| **Model** | 4 hardcoded roles | Granular permission engine |
| **Check** | `role === "ADMIN"` | `can(user, action, resource, context)` |
| **Scope** | Tenant-level only | Branch + Department level |
| **Platforms** | Web only | Web + Mobile + Desktop + API + AI Agent |
| **Platform Admin** | Not separated | Separate `apps/platform-admin` |

---

## 5. Application Architecture

### Next.js App Router Patterns

**Route Groups:**
- `(auth)` — Login, register pages (centered card layout)
- `dashboard` — Main app (sidebar + header layout)

**Page Patterns:**
- `page.tsx` — Main page component (server component)
- `loading.tsx` — Loading skeleton (auto-wrapped by Next.js)
- `error.tsx` — Error boundary (auto-wrapped by Next.js)
- `[id]/page.tsx` — Dynamic detail pages
- `[id]/loading.tsx` — Detail page loading states

**API Route Patterns:**
- `route.ts` — Next.js App Router API handlers
- `GET` — List/read operations
- `POST` — Create operations
- `PUT` — Update operations
- `DELETE` — Delete operations

### Middleware Architecture

```
Request → NextAuth (JWT) → RBAC Check → Rate Limiter → Route Handler
              │                 │              │
              ▼                 ▼              ▼
         Validate token    Check role     Check IP limit
         Extract session   Route access   Reject if exceeded
```

### Component Architecture

```
apps/web/components/
├── auth/               # Auth-related components
├── finance/            # Finance form components
├── layout/             # Layout (sidebar, header, dashboard-layout)
├── ui/                 # Generic UI components
│   ├── charts/         # Chart components (Bar, Pie, Line)
│   ├── modal.tsx       # Reusable modal
│   └── confirmation-dialog.tsx  # Delete confirmation
└── ai/                 # AI chat component
```

> **Note:** Starting from Phase 7 (Permission Engine), all UI components will use permission-based conditional rendering instead of role-based checks.

---

## 6. Shared Packages

### Package Dependency Graph

```
@apps/web ──→ @qalcuity/db          (Prisma client)
           ──→ @qalcuity/types       (Shared types)
           ──→ @qalcuity/utils       (Utility functions)
           ──→ @qalcuity/config      (Constants, env)
           ──→ @qalcuity/validation  (Zod schemas)
           ──→ @qalcuity/i18n        (i18n utilities)
           ──→ @qalcuity/ui          (Design tokens)
           ──→ @qalcuity/auth        (Auth logic) [PLANNED]
           ──→ @qalcuity/permissions (Permission engine) [PLANNED]

@apps/mobile ──→ @qalcuity/types    (Shared types)
              ──→ @qalcuity/permissions [PLANNED]

@apps/desktop ──→ (Web app as renderer)

@apps/platform-admin ──→ @qalcuity/db
                       ──→ @qalcuity/permissions [PLANNED]
                       ──→ @qalcuity/auth [PLANNED]
```

### Package Status

| Package | Status | Notes |
|---------|--------|-------|
| `@qalcuity/db` | ✅ Active | Prisma schema + migrations |
| `@qalcuity/types` | ✅ Active | Shared TypeScript types |
| `@qalcuity/utils` | ✅ Active | Utility functions |
| `@qalcuity/config` | ✅ Active | App constants + env config |
| `@qalcuity/validation` | ✅ Active | Zod schemas |
| `@qalcuity/i18n` | ✅ Active | i18n utilities |
| `@qalcuity/ui` | ⚠️ Partial | Tokens only, no React components yet |
| `@qalcuity/auth` | 📋 Planned | Auth logic (extract from web) |
| `@qalcuity/permissions` | 📋 Planned | Permission engine (`can()` function) |

---

## 7. Data Flow

### Standard Request Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Client  │ ──→ │  Middleware  │ ──→ │  API Route   │ ──→ │   Prisma     │
│  Request │     │  Auth+RBAC   │     │  Validation  │     │   Query      │
└──────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                       │                      │                     │
                       ▼                      ▼                     ▼
                 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
                 │ JWT Validate │     │ Zod Parse    │     │ tenantId     │
                 │ Role Check   │     │ Sanitize     │     │ Filter       │
                 │ Rate Limit   │     │ Audit Log    │     │ Execute      │
                 └──────────────┘     └──────────────┘     └──────────────┘
                       │                      │                     │
                       ▼                      ▼                     ▼
                 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
                 │ Allow/Deny   │     │ Process      │     │ Response     │
                 │              │     │ Business     │     │ JSON         │
                 │              │     │ Logic        │     │              │
                 └──────────────┘     └──────────────┘     └──────────────┘
```

### Mutations (Create/Update/Delete)

```
1. Auth check     → getServerSession(authOptions)
2. RBAC check     → requireMutateAuth(req) or role-based check
3. Tenant filter  → session.user.tenantId
4. Validation     → zodSchema.parse(body)
5. Sanitization   → sanitize(body)
6. Execute query  → prisma.model.create/update/delete({ where: { tenantId, ... } })
7. Audit log      → logAudit({ action, entity, entityId, tenantId, userId, oldValue, newValue })
8. Response       → NextResponse.json(result)
```

---

## 8. Security Layers

### Defense-in-Depth Pattern

```
Layer 1: Middleware          → Route protection, role-based redirect
Layer 2: API Route          → Session validation, RBAC check
Layer 3: Business Logic     → Input validation, tenant isolation
Layer 4: Database           → tenantId filter, CUID IDs
Layer 5: UI                 → Role-based rendering, hide/disable actions
```

### Auth Configuration

- **Library:** NextAuth.js 4.24
- **Strategy:** JWT (not database sessions)
- **Provider:** CredentialsProvider (email + password)
- **Config:** [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts)

### RBAC Implementation

| Layer | Implementation | File |
|-------|---------------|------|
| **Middleware** | Route protection by path prefix | [`apps/web/middleware.ts`](apps/web/middleware.ts) |
| **API Route** | `requireMutateAuth(req)` for mutations | [`apps/web/lib/session.ts`](apps/web/lib/session.ts) |
| **UI** | Role-based button/link visibility | Page components |

---

## 9. API Design

### Route Inventory

| Module | Routes | Files | Methods |
|--------|--------|-------|---------|
| **Auth** | 3 | 2 | POST, GET |
| **Finance** | 12 | 6 | GET, POST, PUT, DELETE |
| **CRM** | 6 | 4 | GET, POST, PUT, DELETE |
| **HR** | 8 | 4 | GET, POST, PUT, DELETE |
| **Inventory** | 8 | 4 | GET, POST, PUT, DELETE |
| **Reports** | 1 | 1 | GET, POST |
| **Settings** | 5 | 5 | GET, PUT |
| **Audit** | 1 | 1 | GET |
| **Search** | 1 | 1 | GET |
| **Health** | 1 | 1 | GET |
| **Total** | **35** | **19** | — |

### Response Format

```typescript
// Success
{ data: T }                          // Single item
{ data: T[], total: number }         // List with pagination

// Error
{ error: string }                    // Error message
{ error: string, details: ZodError } // Validation error
```

---

## 10. Unified Control Engine Architecture

### Overview

Qalcuity Unified Control Engine adalah **satu engine terpadu** yang menjadi operational backbone platform — memastikan pekerjaan selesai, keputusan memiliki penanggung jawab, keterlambatan naik ke level yang tepat, dan transaksi yang sudah ditutup tidak bisa sembarangan diubah.

> Lihat [ADR-017](DECISIONS.md#adr-017-unified-control-engine), [ADR-015](DECISIONS.md#adr-015-qalcuity-control-center), dan [ADR-016](DECISIONS.md#adr-016-transaction-lifecycle--locking-engine).

### Unified Pipeline

Berbeda dari model sebelumnya (6 engine terpisah), Unified Control Engine menggunakan **satu pipeline terpadu**:

```
┌─────────────┐
│ Transaction │ ── User creates/edits a transaction
└──────┬──────┘
       ▼
┌──────────────┐
│ Policy Engine│ ── Evaluates business rules (WHEN condition THEN action)
└──────┬───────┘
       ▼
┌────────────┐
│  Workflow  │ ── Determines status transition
└──────┬─────┘
       ▼
┌────────────┐
│  Approval  │ ── Routes to approver(s) based on rules + amount threshold
└──────┬─────┘
       ▼
┌─────────────────────────────┐
│ Escalation + SLA + Delegation│ ── Monitors deadline, escalates if breached
└──────┬──────────────────────┘
       ▼
┌────────────────┐
│  Notification  │ ── Alerts relevant parties
└──────┬─────────┘
       ▼
┌────────────┐
│  Locking   │ ── Locks transaction/period if applicable
└──────┬─────┘
       ▼
┌──────────────┐
│ Audit Trail  │ ── Logs every step (immutable)
└──────────────┘
```

> Lihat [ADR-017](DECISIONS.md#adr-017-unified-control-engine) untuk detail arsitektur pipeline.

### Sub-Components

| Sub-Engine | Responsibility | Key Feature | Reference |
|------------|---------------|-------------|-----------|
| **Policy Engine** | Rules bisnis konfigurabel | WHEN condition THEN action, policy versioning | [ADR-018](DECISIONS.md#adr-018-policy-engine-architecture) |
| **Workflow** | Transaction lifecycle | Status transitions (DRAFT → LOCKED) | [ADR-016](DECISIONS.md#adr-016-transaction-lifecycle--locking-engine) |
| **Approval** | Multi-level approvals | Chain-based + amount threshold | [ADR-015](DECISIONS.md#adr-015-qalcuity-control-center) |
| **Escalation** | Deadline management | Automatic escalation on SLA breach | [ADR-020](DECISIONS.md#adr-020-sla--delegation-framework) |
| **SLA Engine** | Service level tracking | Color-coded compliance metrics | [ADR-020](DECISIONS.md#adr-020-sla--delegation-framework) |
| **Delegation** | Authority delegation | Temporary authority transfer | [ADR-020](DECISIONS.md#adr-020-sla--delegation-framework) |
| **Notification** | Real-time alerts | Connected to all sub-engines | [ADR-015](DECISIONS.md#adr-015-qalcuity-control-center) |
| **Locking** | Period protection | Hierarchical locking | [ADR-016](DECISIONS.md#adr-016-transaction-lifecycle--locking-engine) |
| **Audit Trail** | Change tracking | Immutable trail | [ADR-015](DECISIONS.md#adr-015-qalcuity-control-center) |
| **SoD Engine** | Segregation of Duties | Conflict detection & prevention | [ADR-019](DECISIONS.md#adr-019-segregation-of-duties) |
| **Exception Center** | Anomaly dashboard | Centralized exception tracking | [ADR-021](DECISIONS.md#adr-021-exception-center--emergency-access) |
| **Emergency Access** | Temporary elevated permission | Auto-revoke, full audit | [ADR-021](DECISIONS.md#adr-021-exception-center--emergency-access) |
| **Work Inbox** | Personal work dashboard | Tasks, approvals, escalations | [ADR-023](DECISIONS.md#adr-023-control-dashboard-tiers) |
| **Period Closing** | Period closing wizard | Step-by-step with pre-checks | [ADR-022](DECISIONS.md#adr-022-period-closing-wizard) |

### 10.1 Policy Engine

Rules bisnis konfigurabel per perusahaan. Lihat [ADR-018](DECISIONS.md#adr-018-policy-engine-architecture).

```yaml
Policy Rule:
  WHEN:
    - "transaction.type == 'invoice'"
    - "transaction.amount > 50000000"
  THEN:
    action: "require_approval"
    approvers: ["finance_manager", "director"]
    sla_hours: 24
```

- **Conditions:** amount threshold, department, branch, transaction type, vendor/category
- **Actions:** require_approval, auto_approve, block, flag_for_review, notify
- **Versioning:** rules berlaku sejak tanggal tertentu, histori tetap ada

### 10.2 Segregation of Duties (SoD)

Mencegah konflik kepentingan dalam proses bisnis. Lihat [ADR-019](DECISIONS.md#adr-019-segregation-of-duties).

```
Pencatat Invoice ≠ Penerima Barang ≠ Penerima Pembayaran ≠ Yang Approve
```

- SoD matrix dikonfigurasi per perusahaan
- Conflict detection real-time saat assignment
- Exception approval untuk override (Director level)

### 10.3 Amount Threshold Approvals

Tiered approval berdasarkan nominal transaksi:

```
< Rp 10 juta     → Auto-approve
Rp 10-50 juta    → Manager approval
Rp 50-200 juta   → Director approval
> Rp 200 juta    → Board approval
```

- Threshold dikonfigurasi per departemen/jenis transaksi
- Kombinasi dengan Policy Engine rules

### 10.4 SLA & Delegation

SLA tracking dengan automatic escalation. Lihat [ADR-020](DECISIONS.md#adr-020-sla--delegation-framework).

**SLA Color Coding:**

| Status | Time Range | Color |
|--------|-----------|-------|
| On Track | 0-50% SLA | 🟢 Green |
| Warning | 50-100% SLA | 🟡 Yellow |
| Breached | >100% SLA | 🔴 Red |

**Delegation Framework:**

- Manager delegate approval authority saat absent
- Scope: siapa → ke siapa, periode, scope
- Auto-expire setelah periode selesai
- Full audit trail

### 10.5 Work Inbox

Personal dashboard untuk setiap user:

| Section | Description |
|---------|-------------|
| **Overdue Tasks** | Tasks yang sudah melewati deadline |
| **Approval Required** | Transaksi menunggu approval user ini |
| **Awaiting Action** | Transaksi yang perlu input dari user |
| **Assigned to Me** | Task yang ditugaskan ke user |
| **Escalated to Me** | Transaksi yang di-escalate ke user |
| **Recently Completed** | Aktivitas terakhir yang sudah selesai |

### 10.6 Exception Center

Dashboard terpusat untuk semua anomali. Lihat [ADR-021](DECISIONS.md#adr-021-exception-center--emergency-access).

| Exception Type | Severity |
|---------------|----------|
| Transactions Overdue | 🟠 High |
| SLA Breached | 🔴 Critical |
| SoD Conflicts | 🔴 Critical |
| Negative Stock Alerts | 🟠 High |
| Unreconciled Payments | 🟡 Medium |
| Policy Violations | 🔴 Critical |

### 10.7 Reason Required & Transaction Timeline

**Reason Required:**

- SETIAP edit/delete/override pada transaksi yang sudah submitted WAJIB isi reason
- Reason field mandatory + optional attachment
- Disimpan di audit trail

**Transaction Timeline:**

- Full history: Who, When, What, Status changes, Approval chain, Comments
- Visual timeline di halaman detail transaksi
- "Why am I seeing this?" — contextual help di UI

### 10.8 Emergency Access

Temporary elevated permission untuk situasi darurat:

```
Request → Reason → Director Approval → Temporary Grant → Auto-revoke → Security Alert
```

- Maximum duration: 24 jam
- Full audit trail
- Security team notification

### 10.9 Access Review

Periodic review oleh managers:

- Review permission setiap bawahannya
- Revoke akses yang tidak diperlukan
- Scheduled review (quarterly)
- Review status: reviewed, pending, overdue

### 10.10 Period Closing Wizard

Step-by-step wizard untuk menutup periode akuntansi. Lihat [ADR-022](DECISIONS.md#adr-022-period-closing-wizard).

```
1. Pre-checks (semua transaksi ter-posting?)
2. Show exceptions (overdue, unreconciled, policy violations)
3. Require resolution atau explicit exception approval
4. Final review summary
5. Approval (Director/Finance Manager)
6. Lock period
7. Generate period summary report
```

### 10.11 Control Dashboard (3 Tiers)

Lihat [ADR-023](DECISIONS.md#adr-023-control-dashboard-tiers).

| Tier | View | Who Sees It |
|------|------|-------------|
| **My Dashboard** | Personal work inbox, pending approvals, overdue items | All users |
| **Management Dashboard** | Team workload, SLA compliance, escalation alerts | Manager, Director |
| **Control Center** | Organization-wide policy violations, SoD conflicts, compliance metrics | Director, Admin, Auditor |

### Transaction Lifecycle

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → POSTED → COMPLETED → LOCKED
```

### Lock Hierarchy

```
Transaction → Day → Month → Quarter → Year
```

> Higher level lock = all lower levels automatically locked.

### Immutable Transactions

- Tidak ada physical DELETE untuk transaksi yang sudah locked
- Corrections via Adjustment entries → Reference original → Approval → Audit Trail
- Histori tetap ada

### Permission-Based Control

```
transaction.view | transaction.create | transaction.edit | transaction.delete
transaction.submit | transaction.approve | transaction.lock | transaction.unlock
transaction.adjust | transaction.export
```

> `lock`, `unlock`, `adjust` = permission sangat sensitif.

### Lock Policy (Per-Company Configurable)

```yaml
Transaction Lock:
  Automatically lock when completed: true

Monthly Closing:
  Enable: true
  Closing day: 5

Yearly Closing:
  Enable: true

Edit locked: Require approval
Delete locked: Disabled
Backdated: Require approval
```

---

## 11. Deployment Architecture

### Development Setup

| Component | Technology | Port |
|-----------|-----------|------|
| **PostgreSQL** | DBngin | 5432 |
| **Next.js Dev** | Next.js CLI | 3000 |
| **Electron** | Electron CLI | — |

### Production Setup (Planned)

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                          │
│                  (Nginx / Cloudflare)                     │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  Docker Containers                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Next.js     │  │  PostgreSQL  │  │  Redis       │  │
│  │  (App)       │  │  (Database)  │  │  (Cache)     │  │
│  │  Port 3000   │  │  Port 5432   │  │  Port 6379   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Environment Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | `packages/db/.env` | PostgreSQL connection |
| `NEXTAUTH_SECRET` | `apps/web/.env` | JWT signing key |
| `NEXTAUTH_URL` | `apps/web/.env` | App URL |
| `SMTP_HOST` | `apps/web/.env` | Email server |
| `SMTP_PORT` | `apps/web/.env` | Email port |

---

> **Note:** Permission middleware will be added to the security layers during Phase 7 (Permission Engine Foundation).

> **Note:** Control Center engines will be implemented in Phase 10 (Control Center Foundation).

---

**Last Updated:** August 30, 2026
**Maintainer:** Qalcuity Engineering Team
