# 📋 Qalcuity — Architectural Decisions

> **Last Updated:** 30 Agustus 2026
> **Current Version:** v1.0.0-beta.1

---

## 📋 Daftar Isi

- [ADR-001: Next.js App Router](#adr-001-nextjs-app-router)
- [ADR-002: Prisma ORM](#adr-002-prisma-orm)
- [ADR-003: NextAuth.js](#adr-003-nextauthjs)
- [ADR-004: PostgreSQL](#adr-004-postgresql)
- [ADR-005: Monorepo with pnpm](#adr-005-monorepo-with-pnpm)
- [ADR-006: Multi-tenant Architecture](#adr-006-multi-tenant-architecture)
- [ADR-007: Zod for Validation](#adr-007-zod-for-validation)
- [ADR-008: Tailwind CSS](#adr-008-tailwind-css)
- [ADR-009: Mobile Strategy](#adr-009-mobile-strategy)
- [ADR-010: AI Provider Abstraction](#adr-010-ai-provider-abstraction)
- [ADR-011: Payment Gateway Abstraction](#adr-011-payment-gateway-abstraction)
- [ADR-012: Demo Data Strategy](#adr-012-demo-data-strategy)
- [ADR-013: Permission Engine Architecture](#adr-013-permission-engine-architecture)
- [ADR-014: Platform vs Tenant Architecture](#adr-014-platform-vs-tenant-architecture)
- [ADR-015: Qalcuity Control Center](#adr-015-qalcuity-control-center)
- [ADR-016: Transaction Lifecycle & Locking Engine](#adr-016-transaction-lifecycle--locking-engine)
- [ADR-017: Unified Control Engine](#adr-017-unified-control-engine)
- [ADR-018: Policy Engine Architecture](#adr-018-policy-engine-architecture)
- [ADR-019: Segregation of Duties](#adr-019-segregation-of-duties)
- [ADR-020: SLA & Delegation Framework](#adr-020-sla--delegation-framework)
- [ADR-021: Exception Center & Emergency Access](#adr-021-exception-center--emergency-access)
- [ADR-022: Period Closing Wizard](#adr-022-period-closing-wizard)
- [ADR-023: Control Dashboard Tiers](#adr-023-control-dashboard-tiers)

---

## ADR-001: Next.js App Router

**Status:** Accepted
**Date:** 2026-08-25

### Decision

Use **Next.js 14+ with App Router** (`/app` directory).

### Rationale

| Feature | App Router | Pages Router |
|---------|-----------|--------------|
| **React Server Components** | ✅ Native | ❌ Not supported |
| **Layouts** | ✅ Nested layouts | ⚠️ Custom implementation |
| **Loading states** | ✅ `loading.tsx` | ❌ Manual |
| **Error handling** | ✅ `error.tsx` | ❌ Manual |
| **Route groups** | ✅ `(auth)`, `(dashboard)` | ❌ Not supported |
| **Streaming** | ✅ Native | ❌ Not supported |

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|------------|------|------|----------|
| **Pages Router** | More mature, more docs | No RSC, manual layouts | ❌ Rejected |
| **Remix** | Good DX, loaders | Smaller ecosystem | ❌ Rejected |
| **Vite + React** | Faster dev server | No SSR, manual routing | ❌ Rejected |

### Consequences

- ✅ Server Components reduce client-side JavaScript
- ✅ Nested layouts avoid re-rendering sidebar/header
- ✅ `loading.tsx` provides instant loading states
- ✅ `error.tsx` provides module-level error boundaries
- ⚠️ Some libraries not yet compatible with RSC
- ⚠️ Learning curve for developers familiar with Pages Router

---

## ADR-002: Prisma ORM

**Status:** Accepted
**Date:** 2026-08-25

### Decision

Use **Prisma 5.x** (not Drizzle, not TypeORM).

### Rationale

| Criterion | Prisma | Drizzle | TypeORM | Knex |
|-----------|--------|---------|---------|------|
| **Type safety** | ✅ Excellent | ✅ Good | ⚠️ Moderate | ❌ Manual |
| **Schema as code** | ✅ `.prisma` file | ✅ TypeScript | ⚠️ Decorators | ❌ Manual |
| **Migration** | ✅ `prisma migrate` | ✅ Drizzle Kit | ⚠️ Complex | ✅ Good |
| **DX** | ✅ Excellent | ✅ Good | ⚠️ Moderate | ⚠️ Moderate |
| **Multi-db** | ✅ SQLite/PG/MySQL | ✅ SQLite/PG | ✅ Many | ✅ Many |
| **Ecosystem** | ✅ Large | ⚠️ Growing | ✅ Large | ✅ Large |

### Consequences

- ✅ Type-safe database queries
- ✅ Excellent migration system
- ✅ Good developer experience
- ⚠️ Requires Prisma Client generation
- ⚠️ Schema changes require migration

---

## ADR-003: NextAuth.js

**Status:** Accepted
**Date:** 2026-08-25

### Decision

Use **NextAuth.js 4.x with JWT strategy** (not database sessions).

### Rationale

| Feature | NextAuth | Lucia | Custom |
|---------|----------|-------|--------|
| **JWT support** | ✅ Native | ✅ Yes | ⚠️ Manual |
| **CredentialsProvider** | ✅ Built-in | ⚠️ Custom | ✅ Full control |
| **Multi-tenant** | ✅ JWT payload | ⚠️ Complex | ✅ Full control |
| **Next.js integration** | ✅ Excellent | ✅ Good | ⚠️ Manual |
| **Ecosystem** | ✅ Large | ⚠️ Growing | ❌ None |

### Consequences

- ✅ Mature, well-documented
- ✅ Supports CredentialsProvider (email + password)
- ✅ JWT strategy works well with multi-tenant
- ✅ Role + tenantId stored in token
- ⚠️ Some complexity with custom callbacks

---

## ADR-004: PostgreSQL

**Status:** Accepted
**Date:** 2026-08-25

### Decision

Use **PostgreSQL** (not MySQL, not SQLite for production).

### Rationale

| Feature | PostgreSQL | MySQL | SQLite |
|---------|-----------|-------|--------|
| **JSON support** | ✅ Native `Json` type | ⚠️ Limited | ⚠️ Limited |
| **Full-text search** | ✅ Excellent | ✅ Good | ⚠️ Basic |
| **Decimal precision** | ✅ Native `Decimal(15,2)` | ✅ `DECIMAL` | ❌ `REAL` |
| **Concurrent access** | ✅ Excellent | ✅ Good | ⚠️ Limited |
| **Extensions** | ✅ Rich ecosystem | ✅ Good | ❌ Minimal |
| **Multi-tenant** | ✅ Schema-level isolation | ✅ Yes | ❌ No |

### Consequences

- ✅ Production-grade database
- ✅ Excellent JSON support (settings field)
- ✅ Native Decimal type for monetary values
- ✅ Full-text search capability
- ⚠️ Requires PostgreSQL server for development (DBngin)

---

## ADR-005: Monorepo with pnpm

**Status:** Accepted
**Date:** 2026-08-25

### Decision

Use **pnpm workspaces** (not Turborepo, not Nx).

### Rationale

| Alternative | Pros | Cons | Decision |
|------------|------|------|----------|
| **Multi-repo** | Independent deployment | Code duplication, dependency hell | ❌ Rejected |
| **npm/yarn workspaces** | Simpler setup | Slower, less efficient | ❌ Rejected |
| **Nx** | More features, better caching | Heavier, steeper learning curve | ❌ Rejected |
| **pnpm** | Fast, efficient, native workspace support | Newer ecosystem | ✅ Selected |

### Consequences

- ✅ Shared database schema across all platforms
- ✅ Shared types ensure consistency
- ✅ Fast package installation
- ✅ Efficient disk usage
- ⚠️ Requires understanding of workspace protocols

---

## ADR-006: Multi-tenant Architecture

**Status:** Accepted
**Date:** 2026-08-25

### Decision

Use **shared database, shared schema, tenantId isolation** (not DB-per-tenant).

### Rationale

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **DB-per-tenant** | Strong isolation | High cost, complex management | ❌ Rejected |
| **Schema-per-tenant** | Medium isolation | Medium cost, migration complexity | ❌ Rejected |
| **Shared schema + tenantId** | Cost-effective, simpler | Requires discipline in queries | ✅ Selected |

### Consequences

- ✅ Cost-effective for B2B SaaS
- ✅ Simpler deployment and maintenance
- ✅ Single database to manage
- ⚠️ Requires tenantId filter on every query
- ⚠️ Cross-tenant leak = critical bug

---

## ADR-007: Zod for Validation

**Status:** Accepted
**Date:** 2026-08-25

### Decision

Use **Zod** (not Yup, not Joi).

### Rationale

| Feature | Zod | Yup | Joi |
|---------|-----|-----|-----|
| **TypeScript-first** | ✅ Native | ⚠️ Infer | ⚠️ Infer |
| **Runtime validation** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Schema composition** | ✅ Excellent | ✅ Good | ✅ Good |
| **Type inference** | ✅ `z.infer<>` | ⚠️ `InferType<>` | ⚠️ Manual |
| **Bundle size** | ✅ Small | ⚠️ Medium | ❌ Large |
| **Next.js integration** | ✅ Excellent | ✅ Good | ⚠️ Manual |

### Consequences

- ✅ TypeScript-first design
- ✅ Excellent type inference (`z.infer<typeof schema>`)
- ✅ Runtime validation with clear error messages
- ✅ Schema composition for complex forms
- ⚠️ Requires learning Zod API

---

## ADR-008: Tailwind CSS

**Status:** Accepted
**Date:** 2026-08-25

### Decision

Use **Tailwind CSS** (not CSS modules, not styled-components).

### Rationale

| Feature | Tailwind | CSS Modules | styled-components |
|---------|----------|-------------|-------------------|
| **Utility-first** | ✅ Yes | ❌ No | ❌ No |
| **Consistent design** | ✅ Enforced | ⚠️ Manual | ⚠️ Manual |
| **Bundle size** | ✅ Small (purged) | ✅ Small | ❌ Large |
| **Dark mode** | ✅ Native (`dark:`) | ⚠️ Manual | ⚠️ Manual |
| **DX** | ✅ Excellent | ⚠️ Good | ⚠️ Good |
| **Design tokens** | ✅ Via config | ⚠️ Manual | ⚠️ Manual |

### Consequences

- ✅ Consistent design system
- ✅ Small bundle size (PurgeCSS)
- ✅ Native dark mode support
- ✅ Design tokens via `tailwind.config.js`
- ⚠️ Verbose class names

---

## ADR-009: Mobile Strategy

**Status:** Accepted
**Date:** 2026-08-28

### Decision

Use **React Native / Expo** for mobile.

### Rationale

| Feature | React Native | Flutter | PWA |
|---------|-------------|---------|-----|
| **Code sharing with web** | ✅ React (same paradigm) | ❌ Dart | ✅ Same codebase |
| **Ecosystem** | ✅ Large | ✅ Growing | ⚠️ Limited |
| **Native feel** | ✅ Yes | ✅ Yes | ❌ No |
| **Offline support** | ✅ Excellent | ✅ Excellent | ⚠️ Limited |
| **App store** | ✅ Yes | ✅ Yes | ❌ No |

### Consequences

- ✅ Code sharing with web (React paradigm)
- ✅ Large ecosystem and community
- ✅ Native performance
- ⚠️ Requires separate build pipeline
- ⚠️ Platform-specific code (iOS/Android)

### Important Note

> Mobile app harus diperlakukan sebagai **platform terpisah**, bukan "versi kecil Web". Mobile memiliki kebutuhan UX yang berbeda (offline, biometric, push notifications).

---

## ADR-010: AI Provider Abstraction

**Status:** Accepted
**Date:** 2026-08-30

### Decision

User brings their own API key, Qalcuity provides agent framework.

### Rationale

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Built-in AI (Qalcuity pays)** | Simpler UX | High cost, scaling issues | ❌ Rejected |
| **User's own API key** | No AI cost for Qalcuity | User manages keys | ✅ Selected |
| **Open-source local AI** | No external dependency | High resource usage | ❌ Rejected |

### Consequences

- ✅ No AI cost for Qalcuity
- ✅ User controls their AI spend
- ✅ User can choose their preferred AI provider
- ⚠️ User needs to configure API keys
- ⚠️ AI quality depends on user's provider

---

## ADR-011: Payment Gateway Abstraction

**Status:** Accepted
**Date:** 2026-08-30

### Decision

Provider pattern with Midtrans/Xendit/Mock.

### Rationale

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Single provider (Midtrans)** | Simpler integration | Vendor lock-in | ❌ Rejected |
| **Provider pattern** | Flexible, user choice | More code | ✅ Selected |
| **Mock only** | No external dependency | No real payments | ❌ Rejected |

### Consequences

- ✅ User configures their own payment provider
- ✅ Flexible provider switching
- ✅ Mock provider for testing
- ⚠️ Requires provider-specific adapters

---

## ADR-012: Demo Data Strategy

**Status:** Accepted
**Date:** 2026-08-30

### Decision

3-layer approach: demo login + onboarding + settings.

### Rationale

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Demo login only** | Quick access | Limited customization | ❌ Rejected |
| **Onboarding only** | Guided setup | Requires time | ❌ Rejected |
| **3-layer (all)** | Quick demo + full control | More code | ✅ Selected |

### Consequences

- ✅ Quick demo access for prospects
- ✅ Easy data loading for new users
- ✅ Manual data management from settings
- ⚠️ Requires maintaining seed data scripts

---

## ADR-013: Permission Engine Architecture

**Decision:** Qalcuity menggunakan granular permission engine dengan model User → Membership → Role → Permission → Resource → Action → Scope

**Status:** Accepted

**Date:** 2026-08-30

### Context

Qalcuity adalah multi-tenant B2B SaaS yang membutuhkan permission system enterprise-grade. Current RBAC (4 hardcoded roles) tidak cukup untuk:

- Multi-branch organizations
- Data-level access control
- Platform-level admin permissions
- AI Agent permission checks

### Decision

Implement permission engine dengan model:

```typescript
// Permission check
can(user, action, resource, context) → boolean

// Example
can(budi, "approve", "invoice", { branch: "Surabaya" })
// → true if budi has invoice.approve permission for Surabaya branch
```

**Two Permission Universes:**

| Universe | Scope | Examples |
|----------|-------|----------|
| **Platform Permissions** | Internal Qalcuity operations | `tenant.view`, `tenant.suspend`, `subscription.manage`, `platform.billing`, `system.monitor`, `support.manage`, `feature_flags.manage` |
| **Tenant Permissions** | Customer organization operations | `invoice.view`, `invoice.create`, `invoice.approve`, `inventory.adjust`, `employee.view`, `payroll.manage` |

> ⚠️ Keduanya tidak boleh tercampur.

**Permission Structure:**

```
User → Membership → Role → Permission → Scope
                                    ↓
                              Resource: Action
                              Scope: Branch/Department
```

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
Scope
```

### Alternatives Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Current 4-role RBAC** | Simple, already implemented | Not granular, no data-level access | ❌ Insufficient |
| **ABAC (Attribute-based)** | Very flexible | Complex, performance overhead | ❌ Over-engineered |
| **Granular Permission Engine** | Enterprise-grade, scalable | More complex than simple RBAC | ✅ Selected |
| **External IAM (Auth0/Clerk)** | Managed service | Vendor lock-in, cost | ❌ Rejected |

### Consequences

- ✅ Enterprise-grade access control from day one
- ✅ Consistent across Web, Mobile, Desktop, API, AI Agent
- ✅ Scalable for multi-branch, multi-department
- ✅ AI Agent can check permissions before executing actions
- ⚠️ More complex than simple role-based checks
- ⚠️ Requires new database models (Permission, Role, Membership, Scope)
- ⚠️ Migration from current 4-role system needed

### Implementation Plan

1. New packages: `@qalcuity/auth`, `@qalcuity/permissions`
2. New app: `apps/platform-admin` (Qalcuity Owner dashboard)
3. New Prisma models: Permission, Role, Membership, Scope
4. Permission middleware for API routes
5. Permission hooks for UI components
6. Permission checks for AI Agent tools

---

## ADR-014: Platform vs Tenant Architecture

**Decision:** Pisahkan dashboard Qalcuity Owner (platform-admin) dari dashboard Customer (web/mobile/desktop)

**Status:** Accepted

**Date:** 2026-08-30

### Context

Qalcuity memiliki dua jenis pengguna:

1. **Internal Qalcuity team** — mengelola platform, tenant, billing, support
2. **Customer organizations** — menggunakan ERP modules (Finance, CRM, HR, Inventory)

### Decision

- `apps/platform-admin` — dashboard khusus Qalcuity Owner/Admin
- `apps/web` — dashboard customer ERP
- `apps/mobile` — mobile customer ERP
- `apps/desktop` — desktop customer ERP

### Platform Admin Menu

```
Qalcuity Admin
├── Overview (platform stats)
├── Tenants / Organizations
├── Subscriptions
├── Plans
├── Billing
├── Users (all tenants)
├── Platform Usage
├── System Health
├── Integrations
├── API
├── Support
├── Feature Flags
├── Audit Logs
├── Security
├── Notifications
├── System Settings
└── Platform Analytics
```

### Target Monorepo Structure

```
apps/
├── web/              ← Customer ERP (Web)
├── mobile/           ← Customer ERP (Mobile)
├── desktop/          ← Customer ERP (Desktop)
└── platform-admin/   ← Qalcuity Owner Dashboard (BARU)

packages/
├── auth/             ← Authentication logic (BARU)
├── permissions/      ← Permission engine (BARU)
├── types/
├── api/
├── validation/
├── ui/
├── i18n/
└── utils/
```

### Alternatives Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Single app with role-based routing** | Simpler deployment | Complex routing logic, mixed concerns | ❌ Rejected |
| **Separate apps** | Clear separation, different permission models | Additional app to maintain | ✅ Selected |
| **Monolith with admin section** | No extra deployment | Security risk, mixed data contexts | ❌ Rejected |

### Consequences

- ✅ Clear separation of concerns
- ✅ Platform admin doesn't mix with customer data
- ✅ Different permission models for each
- ⚠️ Additional app to maintain
- ⚠️ Shared packages must work for both

---

## ADR-015: Qalcuity Control Center

**Decision:** Implement Control Center sebagai modul fundamental yang menggabungkan Workflow, Approval, Escalation, Notification, Locking, dan Audit engines.

**Status:** Accepted

**Date:** 2026-08-30

### Context

ERP bukan hanya tempat mencatat transaksi, tetapi sistem yang memastikan pekerjaan selesai, keputusan memiliki penanggung jawab, keterlambatan naik ke level yang tepat, dan transaksi yang sudah ditutup tidak bisa sembarangan diubah.

### Decision

Qalcuity Control Center terdiri dari 6 engines:

1. **Workflow Engine** — Transaction lifecycle management
2. **Approval Engine** — Multi-level approval workflows
3. **Escalation Engine** — Automatic escalation on deadline miss
4. **Notification Engine** — Connected to escalation and workflow
5. **Locking Engine** — Transaction/monthly/yearly locking
6. **Audit Engine** — Immutable audit trail

### Architecture

```
Control Center
├── Workflow Engine
│   └── Transaction lifecycle (DRAFT → LOCKED)
├── Approval Engine
│   └── Multi-level approval chains
├── Escalation Engine
│   └── Deadline-based escalation (PIC → Supervisor → Manager → Director)
├── Notification Engine
│   └── Real-time + scheduled notifications
├── Locking Engine
│   └── Hierarchical locking (Transaction → Day → Month → Quarter → Year)
└── Audit Engine
    └── Immutable audit trail for all changes
```

### Permission-Based

```
transaction.view
transaction.create
transaction.edit
transaction.delete
transaction.submit
transaction.approve
transaction.lock
transaction.unlock
transaction.adjust
transaction.export
```

> `lock`, `unlock`, `adjust` = permission sangat sensitif.

### Management Control Center Dashboard

```
┌──────────────────────────────┐
│ MANAGEMENT CONTROL CENTER    │
├──────────────────────────────┤
│ 🔴 12 Overdue                │
│ 🟠 8 Awaiting Approval       │
│ 🟡 5 Near Deadline           │
│ 🔒 3 Periods Locked          │
│ ⚠️ 4 Escalated               │
└──────────────────────────────┘
```

### Consequences

- ✅ ERP becomes operational control system, not just recording
- ✅ Clear accountability with escalation chains
- ✅ Financial integrity with locking engine
- ✅ Immutable transactions prevent data tampering
- ⚠️ Complex engine requiring careful design
- ⚠️ Multiple new Prisma models needed
- ⚠️ Integration with all existing modules

---

## ADR-016: Transaction Lifecycle & Locking Engine

**Decision:** Implement hierarchical transaction lifecycle with multi-level locking

**Status:** Accepted

**Date:** 2026-08-30

### Transaction Lifecycle

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → POSTED → COMPLETED → LOCKED
```

Tidak semua transaksi harus menggunakan semua status, tetapi engine-nya mendukung lifecycle tersebut.

### Lock Levels (Hierarchical)

```
Transaction Lock
    ↓
Day Lock
    ↓
Month Lock
    ↓
Quarter Lock
    ↓
Year Lock
```

> Higher level lock = all lower levels automatically locked.

### Immutable Transactions

- Tidak ada physical DELETE untuk transaksi yang sudah locked
- Corrections dilakukan via Adjustment entries
- Original data preserved, new transaction created
- Full audit trail maintained

### Lock Policy (Per-Company Configurable)

```yaml
Transaction Lock:
  Automatically lock when completed: true

Monthly Closing:
  Enable: true
  Closing day: 5

Yearly Closing:
  Enable: true

Edit locked transaction: Require approval
Delete locked transaction: Disabled
Backdated transaction: Require approval
```

### Permissions

- `transaction.lock` — Very sensitive
- `transaction.unlock` — Very sensitive
- `transaction.adjust` — Very sensitive
- All require special authorization

### Consequences

- ✅ Financial integrity with hierarchical locking
- ✅ Immutable transactions prevent data tampering
- ✅ Clear audit trail for all corrections
- ✅ Per-company configurable lock policy
- ⚠️ Complex locking logic with cascading effects
- ⚠️ Requires careful UX for locked period handling
- ⚠️ Adjustment workflow adds complexity

---

## ADR-017: Unified Control Engine

**Decision:** Evolve Control Center dari 6 engine terpisah menjadi SATU engine terpadu (Unified Control Engine) dengan alur pipeline yang konsisten.

**Status:** Accepted

**Date:** 2026-08-30

### Context

ADR-015 mendefinisikan Control Center sebagai 6 engine terpisah (Workflow, Approval, Escalation, Notification, Locking, Audit). Setelah analisis lebih lanjut — terinspirasi pola enterprise seperti SAP dan Microsoft Dynamics — diputuskan bahwa 6 engine terpisah memiliki kelemahan:

- **Koordinasi antar-engine kompleks** — setiap engine perlu tahu tentang engine lain
- **Alur transaksi sulit di-trace** — tidak ada satu pipeline yang jelas
- **Duplikasi state management** — beberapa engine mempertahankan state yang tumpang tindih
- **Sulit di-konfigurasi** — perusahaan harus konfigurasi 6 engine secara terpisah

### Decision

Implement **Unified Control Engine** — satu engine terpadu yang mengalir sebagai pipeline:

```
Transaction
    ↓
Policy Engine (rules & conditions)
    ↓
Workflow (status transitions)
    ↓
Approval (multi-level chains)
    ↓
Escalation + SLA + Delegation (deadline management)
    ↓
Notification (real-time alerts)
    ↓
Locking (period protection)
    ↓
Audit Trail (immutable log)
```

### Sub-Components

| Sub-Engine | Responsibility | Key Feature |
|------------|---------------|-------------|
| **Policy Engine** | Rules bisnis konfigurabel | WHEN condition THEN action |
| **Workflow** | Transaction lifecycle | Status transitions (DRAFT → LOCKED) |
| **Approval** | Multi-level approvals | Chain-based + amount threshold |
| **Escalation** | Deadline management | Automatic escalation on SLA breach |
| **SLA Engine** | Service level tracking | Color-coded compliance metrics |
| **Delegation** | Authority delegation | Temporary authority transfer |
| **Notification** | Real-time alerts | Connected to all sub-engines |
| **Locking** | Period protection | Hierarchical locking |
| **Audit Trail** | Change tracking | Immutable trail |

### Alur Pipeline

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
│  Workflow  │ ── Determines status transition (DRAFT → SUBMITTED → ...)
└──────┬─────┘
       ▼
┌────────────┐
│  Approval  │ ── Routes to approver(s) based on rules
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

### Keunggulan vs 6 Engine Terpisah

| Aspek | 6 Engine Terpisah (ADR-015) | Unified Control Engine |
|-------|---------------------------|----------------------|
| **Architecture** | 6 engine independent | 1 pipeline terpadu |
| **State Management** | Per-engine state | Centralized state |
| **Traceability** | Hard to trace across engines | Clear pipeline flow |
| **Configuration** | 6 separate configs | Single config interface |
| **Testing** | Per-engine testing | End-to-end pipeline testing |
| **Extensibility** | Add new engine | Add new sub-component |

### Consequences

- ✅ Satu pipeline yang jelas untuk setiap transaksi
- ✅ Mudah di-trace dari awal sampai akhir
- ✅ Configuration lebih terpusat
- ✅ Komponen bisa di-enable/disable per perusahaan
- ✅ Mengikuti pola enterprise (SAP, Microsoft Dynamics)
- ⚠️ Satu engine lebih kompleks dari engine individual
- ⚠️ Requires careful pipeline design untuk handle edge cases
- ⚠️ Migration dari model ADR-015 diperlukan

---

## ADR-018: Policy Engine Architecture

**Decision:** Implement Policy Engine sebagai rule-based system konfigurabel dengan pola WHEN-THEN dan policy versioning.

**Status:** Accepted

**Date:** 2026-08-30

### Context

Setiap perusahaan memiliki aturan bisnis yang berbeda untuk mengontrol transaksi mereka. Tanpa Policy Engine, aturan-aturan ini harus di-hardcode di application logic, yang membuat platform sulit di-customize per tenant.

### Decision

Implement Policy Engine dengan arsitektur:

```yaml
Policy Rule:
  id: rule_001
  name: "Approval required untuk invoice besar"
  version: 1
  effective_from: "2026-09-01"
  effective_to: null  # null = indefinite
  
  WHEN:
    - condition: "transaction.type == 'invoice'"
    - condition: "transaction.amount > 50000000"
    - condition: "transaction.department == 'finance'"
  
  THEN:
    action: "require_approval"
    approvers: ["finance_manager", "director"]
    sla_hours: 24
```

### Rule Structure

| Component | Description | Examples |
|-----------|-------------|----------|
| **WHEN conditions** | Kondisi yang harus terpenuhi | amount threshold, department, branch, transaction type, vendor/category |
| **THEN actions** | Aksi yang dilakukan | require_approval, auto_approve, block, flag_for_review, notify |
| **Priority** | Urutan evaluasi rules | Higher priority = evaluated first |
| **Version** | Versi rule | Rules berlaku sejak tanggal tertentu |
| **Scope** | Tenant/branch/department scope | Per-company configurable |

### Condition Types

| Condition | Operator | Example |
|-----------|----------|---------|
| **Amount** | >, <, >=, <=, ==, != | `amount > 50000000` |
| **Department** | ==, !=, in | `department in ['finance', 'procurement']` |
| **Branch** | ==, !=, in | `branch == 'Surabaya'` |
| **Transaction Type** | ==, !=, in | `type in ['invoice', 'purchase_order']` |
| **Vendor/Category** | ==, !=, in, contains | `vendor.category == 'strategic'` |

### Action Types

| Action | Description | Effect |
|--------|-------------|--------|
| **require_approval** | Route ke approval chain | Transaction masuk approval queue |
| **auto_approve** | Langsung approve | Transaction langsung ke status berikutnya |
| **block** | Blokir transaksi | Transaction tidak bisa diproses |
| **flag_for_review** | Tandai untuk review | Muncul di Exception Center |
| **notify** | Kirim notifikasi | Alert ke user/manager tertentu |

### Policy Versioning

```
Policy v1: 2026-01-01 s/d 2026-06-30
Policy v2: 2026-07-01 s/d 2026-12-31  ← active
Policy v3: 2027-01-01 s/d null         ← future
```

- Setiap perusahaan bisa punya rules sendiri
- Rules berlaku sejak tanggal tertentu (effective dating)
- Histori rules tetap ada (untuk audit)
- Override rules per department/branch

### Consequences

- ✅ Perusahaan bisa konfigurasi aturan bisnis sendiri
- ✅ Tidak perlu hardcode rules di application logic
- ✅ Policy versioning untuk compliance
- ✅ Audit trail untuk setiap perubahan rules
- ⚠️ Rule evaluation engine membutuhkan careful design
- ⚠️ Performance impact untuk banyak rules
- ⚠️ UI untuk rule configuration perlu user-friendly

---

## ADR-019: Segregation of Duties

**Decision:** Implement Segregation of Duties (SoD) untuk mencegah konflik kepentingan dalam proses bisnis.

**Status:** Accepted

**Date:** 2026-08-30

### Context

Dalam akuntansi dan bisnis, prinsip Segregation of Duties (SoD) adalah kontrol internal yang memastikan tidak ada satu orang yang mengontrol seluruh aspek dari transaksi. Tanpa SoD, risiko fraud dan error meningkat signifikan.

### Decision

Implement SoD Matrix yang bisa dikonfigurasi per perusahaan:

```yaml
SoD Rule:
  id: sod_001
  name: "Invoice Processing Separation"
  
  conflict_pairs:
    - role: "invoice_creator"
      cannot_also_be: ["invoice_approver", "payment_processor", "goods_receiver"]
    - role: "purchase_order_creator"
      cannot_also_be: ["goods_receiver", "payment_processor"]
    - role: "payment_processor"
      cannot_also_be: ["invoice_approver", "bank_reconciler"]
  
  scope: "per_company"  # or "per_branch", "per_department"
```

### SoD Matrix (Default)

| Role A (Create/Initiate) | Role B (Cannot Also Be) | Reason |
|--------------------------|------------------------|--------|
| Pencatat Invoice | Penerima Barang | Prevent fictitious invoices |
| Pencatat Invoice | Penerima Pembayaran | Prevent kickback schemes |
| Pencatat Invoice | Yang Approve | Prevent self-approval |
| Pembuat PO | Penerima Barang | Prevent fictitious purchases |
| Pembuat PO | Yang Approve PO | Prevent unauthorized purchases |
| Yang Approve | Yang Bayar | Prevent unauthorized payments |
| Pencatat Pembayaran | Bank Reconciler | Prevent concealment of fraud |

### Conflict Detection

```
Saat assignment:
  User assigned sebagai invoice_creator
  User juga sudah assignment sebagai invoice_approver
  → SYSTEM: ⚠️ SoD Conflict detected!
  → Warning: "User X tidak bisa menjadi invoice_creator DAN invoice_approver"
  → Action: Block atau require exception approval
```

### Exception Handling

- SoD conflict bisa di-override dengan **exception approval** (Director level)
- Setiap exception dicatat di audit trail
- Exception punya expiry date
- Exception bisa di-review periodic

### Consequences

- ✅ Mencegah konflik kepentingan dan fraud
- ✅ Compliance dengan standar akuntansi (SAP pattern)
- ✅ Configurable per perusahaan
- ✅ Conflict detection real-time saat assignment
- ⚠️ Membutuhkan role design yang matang
- ⚠️ Exception workflow menambah kompleksitas
- ⚠️ User experience perlu di-balance (tidak terlalu restrictive)

---

## ADR-020: SLA & Delegation Framework

**Decision:** Implement SLA-based tracking dengan automatic escalation dan delegation framework untuk continuous operations.

**Status:** Accepted

**Date:** 2026-08-30

### Context

Tanpa SLA tracking, organisasi tidak memiliki visibility terhadap berapa lama transaksi menunggu approval, dan manager tidak memiliki cara untuk delegate authority saat absent.

### Decision

### SLA Framework

Setiap transaction type punya SLA target:

| Transaction Type | Default SLA | Color Code |
|-----------------|-------------|------------|
| Invoice Approval | 24 hours | 🟢 0-12h, 🟡 12-24h, 🔴 >24h |
| Purchase Order Approval | 48 hours | 🟢 0-24h, 🟡 24-48h, 🔴 >48h |
| Leave Request | 24 hours | 🟢 0-12h, 🟡 12-24h, 🔴 >24h |
| Payment Processing | 72 hours | 🟢 0-36h, 🟡 36-72h, 🔴 >72h |
| Custom per tenant | Configurable | Per-company setting |

### SLA Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Average Completion Time** | Rata-rata waktu penyelesaian | < SLA target |
| **SLA Compliance Rate** | % transaksi selesai dalam SLA | > 90% |
| **Escalation Rate** | % transaksi yang di-escalate | < 10% |
| **On-time Rate** | % transaksi on-time | > 85% |

### SLA Pipeline

```
Transaction Created
    ↓
SLA Clock Starts
    ↓
┌─────────────────────────────────────┐
│ 🟢 0-50% SLA    → On Track         │
│ 🟡 50-100% SLA  → Warning          │
│ 🔴 >100% SLA    → Breach → Escalate│
└─────────────────────────────────────┘
```

### Delegation Framework

```yaml
Delegation:
  delegator: "Budi (Manager Finance)"
  delegatee: "Andi (Senior Staff)"
  period: "2026-09-01 s/d 2026-09-15"
  scope:
    - "invoice_approval"
    - "purchase_order_approval"
  reason: "Budi cuti ke luar negeri"
  auto_expire: true
  audit_trail:
    - created_by: "Budi"
    - created_at: "2026-08-28"
    - approved_by: "Director"
```

### Delegation Rules

| Rule | Description |
|------|-------------|
| **Scope限制** | Delegatee hanya bisa approve dalam scope yang didelegasikan |
| **Auto-expire** | Delegation otomatis berakhir setelah periode selesai |
| **Audit trail** | Setiap approval oleh delegatee dicatat dengan delegator info |
| **Work Inbox** | Delegatee melihat delegated items di Work Inbox |
| **Notification** | Delegator mendapat notifikasi saat delegation digunakan |

### Consequences

- ✅ Visibility terhadap SLA compliance
- ✅ Automatic escalation mengurangi bottleneck
- ✅ Delegation memastikan operations berjalan saat manager absent
- ✅ Full audit trail untuk delegation
- ⚠️ SLA configuration perlu per-transaction-type tuning
- ⚠️ Delegation abuse perlu monitoring
- ⚠️ Complex notification routing

---

## ADR-021: Exception Center & Emergency Access

**Decision:** Implement centralized Exception Center untuk semua anomali dan Emergency Access untuk situasi darurat.

**Status:** Accepted

**Date:** 2026-08-30

### Context

Organisasi membutuhkan satu tempat terpusat untuk melihat semua masalah yang memerlukan perhatian, dan mekanisme untuk akses darurat tanpa mengorbankan audit trail.

### Decision

### Exception Center

Dashboard terpusat yang menampilkan semua anomali:

| Exception Type | Severity | Auto-detected | Suggested Action |
|---------------|----------|---------------|------------------|
| **Transactions Overdue** | 🟠 High | ✅ | Contact approver, escalate |
| **SLA Breached** | 🔴 Critical | ✅ | Immediate escalation |
| **SoD Conflicts** | 🔴 Critical | ✅ | Reassign roles, exception approval |
| **Negative Stock Alerts** | 🟠 High | ✅ | Physical stock opname |
| **Unreconciled Payments** | 🟡 Medium | ✅ | Investigate, match transactions |
| **Policy Violations** | 🔴 Critical | ✅ | Review policy, exception approval |
| **Missing Approvals** | 🟡 Medium | ✅ | Follow up with approver |

### Exception Structure

```typescript
interface Exception {
  id: string;
  type: 'overdue' | 'sla_breach' | 'sod_conflict' | 'negative_stock' |
        'unreconciled' | 'policy_violation' | 'missing_approval';
  severity: 'critical' | 'high' | 'medium' | 'low';
  entity_type: string;      // e.g., 'invoice', 'purchase_order'
  entity_id: string;
  assigned_to: string;      // User responsible
  suggested_action: string;
  created_at: Date;
  resolved_at: Date | null;
  resolution_notes: string | null;
}
```

### Emergency Access

Flow untuk situasi darurat:

```
User Request Emergency Access
    ↓
Isi Reason (mandatory)
    ↓
Director Approval
    ↓
Temporary Grant (with duration & scope)
    ↓
Full Audit Trail Active
    ↓
Auto-revoke after duration
    ↓
Alert ke Security Team
```

### Emergency Access Rules

| Rule | Description |
|------|-------------|
| **Duration** | Maximum 24 jam, auto-revoke |
| **Scope** | Specific permissions only (tidak bisa all-access) |
| **Approval** | Director level minimum |
| **Audit** | Full trail: who requested, who approved, what access, when |
| **Alert** | Security team notified saat emergency access digunakan |
| **Review** | Post-incident review required |

### Consequences

- ✅ Single pane of glass untuk semua anomali
- ✅ Emergency access tanpa mengorbankan security
- ✅ Full audit trail untuk compliance
- ✅ Auto-revoke mencegah privilege creep
- ⚠️ Exception Center membutuhkan careful UX design
- ⚠️ Emergency access abuse perlu monitoring
- ⚠️ Notification overload jika tidak di-filter dengan baik

---

## ADR-022: Period Closing Wizard

**Decision:** Implement step-by-step wizard untuk menutup periode akuntansi dengan pre-checks, exception resolution, dan approval.

**Status:** Accepted

**Date:** 2026-08-30

### Context

Penutupan periode akuntansi (monthly, quarterly, yearly) adalah proses kritis yang memerlukan banyak langkah. Tanpa wizard, proses ini manual, rentan error, dan sulit di-audit.

### Decision

Implement Period Closing Wizard dengan 7 langkah:

```
Step 1: Pre-checks
    ↓ "Semua transaksi ter-posting? Ada yang pending?"
Step 2: Show Exceptions
    ↓ "Overdue, unreconciled, policy violations"
Step 3: Require Resolution
    ↓ "Resolve atau explicit exception approval"
Step 4: Final Review Summary
    ↓ "Ringkasan lengkap periode ini"
Step 5: Approval
    ↓ "Director / Finance Manager approve"
Step 6: Lock Period
    ↓ "Tidak bisa edit transaksi di periode ini"
Step 7: Generate Report
    ↓ "Period summary report"
```

### Pre-checks (Step 1)

| Check | Description | Status |
|-------|-------------|--------|
| **Unposted Transactions** | Transaksi belum ter-posting ke GL | ⚠️ Show count |
| **Pending Approvals** | Transaksi menunggu approval | ⚠️ Show count |
| **Unreconciled Payments** | Pembayaran belum reconcile | ⚠️ Show count |
| **Missing Journal Entries** | Journal entry belum dibuat | ⚠️ Show count |
| **Negative Stock** | Stok negatif | ⚠️ Show count |

### Exception Types in Closing

| Exception | Required Action |
|-----------|----------------|
| **Overdue approvals** | Approve atau reject sebelum closing |
| **Unreconciled payments** | Reconcile atau add exception note |
| **Policy violations** | Exception approval dari Director |
| **Missing documents** | Upload atau add exception note |

### Period Types

| Period | Frequency | Approval Level |
|--------|-----------|----------------|
| **Monthly** | Setiap akhir bulan | Finance Manager |
| **Quarterly** | Setiap akhir kuartal | Director |
| **Yearly** | Setiap akhir tahun | Board/Director |

### Lock After Closing

```
Periode tertutup:
  → Semua transaksi di periode ini ter-lock
  → Tidak bisa edit/delete tanpa unlock workflow
  → Unlock memerlukan Director approval
  → Full audit trail untuk setiap unlock
```

### Consequences

- ✅ Structured closing process, tidak ada langkah yang terlewat
- ✅ Pre-checks memastikan data lengkap
- ✅ Exception handling terdokumentasi
- ✅ Approval chain untuk accountability
- ✅ Auto-lock setelah closing
- ⚠️ Wizard complexity perlu careful UX design
- ⚠️ Performance untuk periode dengan banyak transaksi
- ⚠️ Rollback mechanism diperlukan jika closing gagal

---

## ADR-023: Control Dashboard Tiers

**Decision:** Implement 3-tier Control Dashboard dengan role-based views: My Dashboard, Management Dashboard, Control Center.

**Status:** Accepted

**Date:** 2026-08-30

### Context

Berbagai level pengguna membutuhkan visibility yang berbeda terhadap operasional. User individual butuh melihat tugasnya, manager butuh melihat timnya, dan admin/auditor butuh melihat keseluruhan organisasi.

### Decision

Implement 3-tier dashboard:

### Tier 1: My Dashboard (User Level)

```
┌──────────────────────────────────┐
│ MY DASHBOARD                     │
├──────────────────────────────────┤
│ 📋 My Work Inbox                │
│   ├── Overdue Tasks (3)          │
│   ├── Approval Required (5)      │
│   ├── Awaiting My Action (2)     │
│   ├── Assigned to Me (8)         │
│   ├── Escalated to Me (1)        │
│   └── Recently Completed (12)    │
│                                  │
│ 📊 My SLA Compliance            │
│   ├── On Track: 85%              │
│   ├── Warning: 10%               │
│   └── Breached: 5%               │
│                                  │
│ 📝 My Recent Activity           │
│   └── Last 10 actions            │
└──────────────────────────────────┘
```

### Tier 2: Management Dashboard (Manager Level)

```
┌──────────────────────────────────┐
│ MANAGEMENT DASHBOARD             │
├──────────────────────────────────┤
│ 👥 Team Workload                 │
│   ├── Pending approvals: 15      │
│   ├── Overdue items: 8           │
│   ├── SLA compliance: 82%        │
│   └── Team utilization: 75%      │
│                                  │
│ 🔴 Escalation Alerts            │
│   └── Items requiring attention  │
│                                  │
│ 📊 Team SLA Metrics             │
│   ├── Average completion: 18h    │
│   ├── Compliance rate: 88%       │
│   └── Bottleneck: PO Approval    │
│                                  │
│ 📋 Pending Approvals (Team)     │
│   └── All pending from team      │
└──────────────────────────────────┘
```

### Tier 3: Control Center (Admin/Auditor)

```
┌──────────────────────────────────┐
│ CONTROL CENTER                   │
├──────────────────────────────────┤
│ ⚠️ Organization Overview         │
│   ├── Policy violations: 5       │
│   ├── SoD conflicts: 2           │
│   ├── SLA breach rate: 12%       │
│   └── Exception count: 15        │
│                                  │
│ 🔒 Period Status                │
│   ├── Current: August 2026       │
│   ├── Status: Open               │
│   └── Days to closing: 2         │
│                                  │
│ 📊 Compliance Metrics           │
│   ├── Approval compliance: 92%   │
│   ├── SLA compliance: 88%        │
│   ├── SoD compliance: 100%       │
│   └── Audit coverage: 100%       │
│                                  │
│ 🚨 Exception Center             │
│   └── All unresolved exceptions  │
│                                  │
│ 📋 Policy Engine Status         │
│   └── Active rules: 25           │
└──────────────────────────────────┘
```

### Access Control per Tier

| Tier | Access Level | Who Sees It |
|------|-------------|-------------|
| **My Dashboard** | Personal data only | All users |
| **Management Dashboard** | Team data | Manager, Director, Admin |
| **Control Center** | Organization-wide | Director, Admin, Auditor |

### Consequences

- ✅ Right information for right people
- ✅ Reduced information overload
- ✅ Clear accountability per level
- ✅ Executive summary at Control Center level
- ⚠️ 3 dashboards to maintain
- ⚠️ Data aggregation complexity for Management/Control tiers
- ⚠️ Role-based rendering adds UI complexity

---

**Last Updated:** August 30, 2026
**Maintainer:** Qalcuity Architecture Team
