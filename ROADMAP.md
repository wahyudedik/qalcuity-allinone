# 🗺️ Qalcuity Development Roadmap

> **Last Updated:** 30 Agustus 2026
> **Current Version:** v1.0.0-beta.1
> **Status:** Core Modules Production-Ready (~65% production-ready, ~20% partial, ~15% planned)

---

## 📋 Daftar Isi

1. [Development Phases](#development-phases)
2. [Phase Overview](#phase-overview)
3. [Success Metrics](#success-metrics)
4. [Risks & Mitigation](#risks--mitigation)
5. [Changelog](#changelog)
6. [Documentation References](#documentation-references)

---

## Development Phases

### Phase 1: Core SaaS Foundation ✅ COMPLETED

> Multi-tenant architecture, authentication, authorization, audit, dan infrastructure dasar.

- [x] Multi-tenant architecture (shared DB, tenantId isolation)
- [x] Auth (NextAuth.js 4.24 + JWT)
- [x] RBAC (4 roles: SUPERADMIN, ADMIN, MEMBER, VIEWER)
- [x] RBAC Defense-in-depth (3 layers: Middleware + API Route + UI)
- [x] Registration flow (auto-create Tenant + User)
- [x] Session management (JWT with role + tenantId)
- [x] Password hashing (bcryptjs)
- [x] Audit trail (77+ logAudit calls, 10 mutation endpoints)
- [x] Zod validation (14+ schemas, 19 API routes)
- [x] i18n (Bahasa Indonesia + English, 200+ keys)
- [x] Rate limiting (per-IP, in-memory)
- [x] Health check endpoint (`/api/health`)
- [x] Global search (Ctrl+K across all modules)
- [x] Dark mode (class-based toggle)
- [x] Responsive design (mobile-first, 44x44px touch targets)
- [x] Responsive tables (dual layout: mobile cards + desktop tables)
- [x] Empty states, toast notifications, confirmation dialogs
- [x] Loading states (12 `loading.tsx` files for detail pages)
- [x] Error boundaries (`error.tsx` for all module sections)
- [x] Demo data strategy (3-layer: demo login + onboarding + settings)

### Phase 2: Finance Module ✅ COMPLETED

> Modul keuangan inti — Invoice, Payment, PO, Quotation, CoA, Bank Reconciliation.

- [x] Invoice CRUD + items + payment tracking
- [x] Payment CRUD + processing
- [x] Purchase Order CRUD
- [x] Quotation CRUD
- [x] Chart of Accounts (Prisma-backed)
- [x] Bank Reconciliation (Prisma-backed)
- [ ] General Ledger — PLANNED
- [ ] Journal Entry — PLANNED
- [ ] Trial Balance — PLANNED
- [ ] Financial Statements (Balance Sheet, Income Statement) — PLANNED

### Phase 3: CRM Module ✅ COMPLETED

> Manajemen kontak, leads, deals, dan pipeline.

- [x] Contacts CRUD
- [x] Leads CRUD
- [x] Deals CRUD + pipeline stages (6 stages)
- [x] Pipeline Kanban view
- [x] Pipeline list view (table with sorting & filtering)
- [ ] Lead Scoring — PLANNED

### Phase 4: Inventory Module ✅ COMPLETED

> Manajemen produk, kategori, supplier, dan stok.

- [x] Products CRUD + stock
- [x] Categories CRUD — Full CRUD with hierarchical support
- [x] Categories DELETE handler — connected to API
- [x] Suppliers CRUD
- [x] Stock movements tracking
- [ ] Multi-warehouse — PLANNED
- [ ] Batch/lot tracking — PLANNED
- [ ] Stock opname — PLANNED
- [ ] Auto-reorder suggestion — PLANNED

### Phase 5: HR Module ✅ COMPLETED

> Manajemen karyawan, absensi, cuti, dan payroll.

- [x] Employees CRUD
- [x] Attendance tracking
- [x] Leave requests + approval workflow
- [x] Payroll processing

### Phase 6: Reports & Analytics ✅ COMPLETED

> Dashboard stats, 12 report types, charts, dan export.

- [x] Dashboard stats (real-time overview)
- [x] 12 report types
- [x] Charts (Bar/Pie/Line — custom implementation)
- [x] Export (CSV/Excel/Print)
- [ ] Custom report builder — PLANNED
- [ ] Scheduled reports — PLANNED

### Phase 7: Settings & Admin ✅ COMPLETED

> Pengaturan perusahaan, tim, notifikasi, keamanan, dan billing.

- [x] Profile settings (CRUD + i18n)
- [x] Company settings (logo upload + CRUD + i18n)
- [x] Team management (CRUD + i18n)
- [x] Notification settings (SMTP config + CRUD + i18n)
- [x] Security settings (CRUD + i18n)
- [x] Integrations settings (CRUD + i18n + dynamic connection status from API)
- [x] Billing & Subscription (plan selection, manual transfer, superadmin approval)

### Phase 8: AI Features (Basic) ✅ COMPLETED

> AI foundation — chat component, hub page, dan insights cards.

- [x] AI Chat — floating button component (mock responses)
- [x] AI Hub — centralized page at `/dashboard/ai`
- [x] AI Insights — business insight cards on dashboard
- [x] AI Sidebar Menu — dedicated menu item
- [ ] Real DB queries (replace mock) — PLANNED
- [ ] AI Agents (Finance, Sales, Inventory, HR) — PLANNED
- [ ] Natural Language Query — PLANNED
- [ ] Document Extraction (PDF/OCR) — PLANNED

### Phase 9: Permission Engine Foundation 📋 PLANNED

> **Fondasi arsitektur — granular permission engine sebagai pengganti 4-role RBAC.**
> **Industry-agnostic** — Permission Engine tidak mengenal industri. Yang mengenal industri adalah Industry Configuration Engine.
> Lihat [ADR-013](docs/DECISIONS.md#adr-013-permission-engine-architecture) dan [ADR-014](docs/DECISIONS.md#adr-014-platform-vs-tenant-architecture).

#### 9A: Core Permission Engine

- [ ] Design permission model (Prisma schema: Permission, Role, Membership, Scope)
- [ ] Implement `@qalcuity/permissions` package (`can()` engine)
- [ ] Implement `@qalcuity/auth` package (extract from web)
- [ ] Create permission middleware for API routes
- [ ] Create permission hooks for UI components (`usePermission()`)
- [ ] Migrate from 4-role RBAC to granular permissions
- [ ] Migration strategy from current 4-role system

#### 9B: Platform Admin & Cross-platform

- [ ] Create `apps/platform-admin` (Qalcuity Admin dashboard)
- [ ] Platform Admin roles (Super Admin, Platform Admin, Developer, Support, Finance, Security, Analytics)
- [ ] Implement platform permissions (tenant, billing, system, support, feature_flags)
- [ ] Implement tenant permissions (finance, CRM, HR, inventory, settings)
- [ ] Add scope support (branch, department level)
- [ ] Permission-based conditional rendering in all pages
- [ ] AI Agent permission checks (tool-level `can()` before execution)
- [ ] Mobile permission support (same `@qalcuity/permissions` package)
- [ ] Desktop permission support (same `@qalcuity/permissions` package)

#### 9C: Industry-Agnostic Validation

- [ ] Validasi bahwa Permission Engine tidak mengandung hardcoded industry logic
- [ ] Permission engine berfungsi untuk SEMUA industri tanpa perubahan code
- [ ] Permission engine mendukung custom resources dari Industry Configuration Engine

### Phase 10: Unified Control Engine 📋 PLANNED

> **Modul fundamental — Unified Control Engine dengan 14 sub-komponen: Policy Engine, Workflow, Approval, Escalation, SLA, Delegation, Notification, Locking, Audit Trail, SoD, Exception Center, Work Inbox, Period Closing, Emergency Access.**
> Lihat [ADR-017](docs/DECISIONS.md#adr-017-unified-control-engine) s/d [ADR-023](docs/DECISIONS.md#adr-023-control-dashboard-tiers).

#### 10A: Core Pipeline (Foundational)

- [ ] Design Unified Control Engine Prisma schema (centralized state model)
- [ ] Implement Policy Engine — rules bisnis konfigurabel (WHEN condition THEN action) [ADR-018]
- [ ] Implement Policy versioning — rules berlaku sejak tanggal tertentu
- [ ] Implement Policy configuration UI — per-company rule management
- [ ] Implement Workflow Engine — transaction lifecycle (DRAFT → LOCKED) [ADR-016]
- [ ] Implement Approval Engine — multi-level chains + amount threshold approvals [ADR-015]
- [ ] Implement Amount Threshold configuration — tiered approval per department/type
- [ ] Implement Escalation Engine — deadline-based (PIC → Supervisor → Manager → Director)
- [ ] Implement Locking Engine — hierarchical (Transaction → Day → Month → Quarter → Year) [ADR-016]
- [ ] Implement Notification Engine — real-time + scheduled, connected to all sub-engines
- [ ] Audit trail integration — immutable trail for every pipeline step

#### 10B: Compliance & Control (Advanced)

- [ ] Implement Segregation of Duties (SoD) — conflict detection & prevention [ADR-019]
- [ ] Implement SoD matrix configuration — per-company configurable rules
- [ ] Implement SoD conflict detection — real-time check saat role assignment
- [ ] Implement SoD exception workflow — override dengan Director approval
- [ ] Implement SLA Engine — service level tracking dengan color coding (🟢🟡🔴) [ADR-020]
- [ ] Implement SLA metrics — average completion time, compliance rate, escalation rate
- [ ] Implement Delegation framework — temporary authority transfer [ADR-020]
- [ ] Implement Delegation audit trail — delegator, delegatee, period, reason
- [ ] Implement Delegation auto-expire — otomatis berakhir setelah periode

#### 10C: Visibility & Operations (UI & Dashboard)

- [ ] Implement Work Inbox — personal dashboard (overdue, approvals, assigned, escalated, completed) [ADR-023]
- [ ] Implement Exception Center — centralized anomaly dashboard [ADR-021]
- [ ] Implement My Dashboard (Tier 1) — personal work inbox + SLA compliance [ADR-023]
- [ ] Implement Management Dashboard (Tier 2) — team workload + SLA metrics [ADR-023]
- [ ] Implement Control Center (Tier 3) — organization-wide compliance + policy status [ADR-023]
- [ ] Implement Reason Required — mandatory reason untuk edit/delete/override
- [ ] Implement Transaction Timeline — full history (Who, When, What, Status, Approval chain)
- [ ] Implement "Why am I seeing this?" — contextual help di UI

#### 10D: Security & Access (Enterprise)

- [ ] Implement Emergency Access — temporary elevated permission [ADR-021]
- [ ] Implement Emergency Access flow — Request → Reason → Director Approval → Auto-revoke
- [ ] Implement Access Review — periodic permission review oleh managers
- [ ] Implement Access Review scheduling — quarterly review dengan status tracking

#### 10E: Period Management (Closing)

- [ ] Implement Period Closing Wizard — step-by-step closing [ADR-022]
- [ ] Implement Pre-checks — validate unposted, pending, unreconciled transactions
- [ ] Implement Exception resolution — resolve atau exception approval sebelum closing
- [ ] Implement Period lock — auto-lock setelah closing approval
- [ ] Implement Period summary report — generate after closing
- [ ] Support monthly, quarterly, yearly periods

#### 10F: Integration & Platform

- [ ] Permission integration — lock, unlock, adjust sebagai sensitive permissions
- [ ] Lock Policy configuration per tenant
- [ ] Mobile Control Center support
- [ ] AI Agent workflow integration

### Phase 11: Industry Configuration Engine 📋 PLANNED

> **Fondasi arsitektur — Industry Configuration Engine yang memungkinkan Qalcuity dikonfigurasi untuk berbagai industri.**
> Lihat [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 5 dan Section 7.

#### 11A: Core Configuration Engine

- [ ] Design Industry Configuration Engine architecture
- [ ] Implement `@qalcuity/industry-config` package
- [ ] Implement Custom Fields engine (dynamic fields per entity)
- [ ] Implement Custom Documents engine (document types + status + workflow)
- [ ] Implement Custom Reports engine (reports berdasarkan module + field)
- [ ] Design Industry Pack data model (Prisma schema)

#### 11B: Industry Pack Framework

- [ ] Create Industry Pack loader (load config per tenant)
- [ ] Create Industry Pack API (CRUD untuk managing packs)
- [ ] Create Industry Pack UI (dashboard untuk configuring packs)
- [ ] Implement default Industry Packs (template untuk setiap industri)
- [ ] Industry Pack: Retail (POS, Stock Replenishment, Barcode)
- [ ] Industry Pack: Wholesale/Distribution (Route, Driver, Delivery Order)
- [ ] Industry Pack: Manufacturing (Work Order, BOM, Quality Report)
- [ ] Industry Pack: Food & Beverage (Recipe, Expiry, Batch)
- [ ] Industry Pack: Construction (Site, Contract, Progress, BAST)
- [ ] Industry Pack: Property (Unit, Booking, Handover)
- [ ] Industry Pack: Logistics (Route, Vehicle, POD)
- [ ] Industry Pack: Consulting/Agency (Project, SOW, Timesheet)
- [ ] Industry Pack: Education (Student, Class, Enrollment)
- [ ] Industry Pack: Healthcare (Patient, Treatment, Insurance)

#### 11C: Dashboard Configuration

- [ ] Implement Dashboard Configuration engine (widgets per industry)
- [ ] Dashboard: Retail (Sales, Stock, Top Products, Cash, Customer)
- [ ] Dashboard: Manufacturing (Production, Material, Machine, Quality, WIP, Inventory)
- [ ] Dashboard: Construction (Projects, Budget, Progress, Purchase, Material, Workers)
- [ ] Dashboard: Services (Projects, Tickets, SLA, Employees, Billable Hours, Invoices)
- [ ] Dashboard: Logistics (Deliveries, Routes, Vehicles, Warehouse, Cost/Delivery)
- [ ] Dashboard: Education (Students, Classes, Enrollment, Revenue, Attendance)

#### 11D: Milestone

- [ ] **Milestone: Industry Pack Framework Ready** — Engine + 3 default packs + dashboard config

### Phase 12: Integration Layer 📋 PLANNED

> Email, payment gateway, dan webhook integrations.

- [x] Rate Limiter (Redis activation pending)
- [x] SMTP (Nodemailer — config ready, triggers pending)
- [x] Payment Gateway provider pattern (Midtrans/Xendit/Mock)
- [ ] Payment Gateway route (real integration) — PENDING
- [ ] Email triggers (actual send on events) — PENDING
- [ ] Webhook handlers — PENDING
- [ ] Omnichannel (WhatsApp, Email, Instagram) — PLANNED

### Phase 13: Security Hardening 📋 PLANNED

> Hardening keamanan untuk production deployment.

- [x] Fix hardcoded NEXTAUTH_SECRET fallback → env validation mandatory
- [ ] CSP (Content-Security-Policy) headers
- [ ] CORS configuration (explicit, not defaults)
- [ ] CSRF hardening
- [ ] Input sanitization audit
- [ ] Rate limiter migration to Redis
- [ ] Security penetration testing

### Phase 14: Production MVP 📋 PLANNED

> Infrastructure untuk production deployment.

- [ ] Docker setup (Dockerfile + docker-compose)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Monitoring & logging (structured logs, metrics)
- [ ] Performance optimization (query optimization, caching)
- [ ] Load testing
- [ ] Environment validation (mandatory env vars)

### Phase 15: Mobile Foundation 📋 PLANNED

> Mobile app harus diperlakukan sebagai platform terpisah (bukan "versi kecil Web").

- [ ] Auth flow (login/session management)
- [ ] Permission engine integration (`@qalcuity/permissions`)
- [ ] API integration (real endpoints, not mock)
- [ ] Offline capability (local cache + sync)
- [ ] Push notifications
- [ ] Biometric authentication
- [ ] Platform-specific UX (iOS/Android conventions)

### Phase 16: Desktop Enhancement 📋 PLANNED

> Desktop app memerlukan offline capability dan native integrasi.

- [ ] Offline capability (local DB + sync)
- [ ] Permission engine integration (`@qalcuity/permissions`)
- [ ] Native menus & shortcuts
- [ ] Auto-update mechanism
- [ ] System tray integration
- [ ] File system access

### Phase 17: Advanced Finance 📋 PLANNED

> Modul keuangan lanjutan — General Ledger, Tax Engine.

- [ ] General Ledger
- [ ] Journal Entry
- [ ] Trial Balance
- [ ] Balance Sheet
- [ ] Income Statement
- [ ] Tax Engine (Coretax, e-Faktur, PPh21, PPN)

### Phase 18: Enterprise Features 📋 PLANNED

> Fitur enterprise untuk skala besar.

- [ ] Multi-company support
- [ ] Inter-company transactions
- [ ] Advanced reporting (custom report builder)
- [ ] Custom workflows (approval routing, delegation)
- [ ] API marketplace (GraphQL, webhook builder)
- [ ] White-label platform (custom branding, reseller portal)
- [ ] SSO integration (SAML 2.0, OAuth 2.0)
- [ ] SOC 2 Type II compliance

### Phase 22: POS Module (Core) 📋 PLANNED

> **POS (Point of Sale) adalah Core Module — bukan produk terpisah.** POS terintegrasi langsung ke ERP: Inventory → Finance → Accounting → CRM → Audit. POS menggunakan Permission Engine, Workflow Engine, dan Audit Trail yang sama.
> Lihat [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 22.

#### 22A: POS Core

- [ ] POS Prisma schema (POSSession, POSTransaction, POSTransactionItem, POSTransactionPayment, POSRefund)
- [ ] POS Sale API — create transaction, add items, apply discounts
- [ ] POS Payment API — multi payment method (cash, card, e-wallet, QRIS)
- [ ] POS Return API — return items, partial return
- [ ] POS Refund API — refund processing with approval workflow
- [ ] POS Receipt — receipt generation and printing
- [ ] POS Tax Calculation — automatic tax computation per item/transaction
- [ ] POS Barcode — barcode scanning for product lookup
- [ ] POS Customer — customer management for loyalty/receipt

#### 22B: POS Shift & Cash Management

- [ ] POS Shift Management — open shift, track transactions, close shift
- [ ] POS Cash Drawer — cash in/out tracking, opening/closing cash count
- [ ] POS Daily Closing — end-of-day closing with approval workflow
- [ ] POS Cashier Management — cashier assignment and shift scheduling
- [ ] POS Shift Report — shift summary (total sales, refunds, discounts, cash count)

#### 22C: POS Offline Mode

- [ ] Offline transaction storage (IndexedDB/localStorage)
- [ ] Offline stock cache with background sync
- [ ] Offline transaction numbering (offline counter + merge)
- [ ] Sync conflict resolution (last-write-win + manual)
- [ ] Duplicate transaction prevention (idempotency key)
- [ ] Offline audit trail marking (`isOffline: true`)

#### 22D: POS Industry Configuration

- [ ] POS Industry Config Engine — configurable POS flow per industry
- [ ] POS Retail Config — Barcode → Cart → Payment → Receipt
- [ ] POS F&B Config — Order → Kitchen → Preparation → Payment
- [ ] POS Bengkel Config — Customer → Vehicle → Service → Parts → Invoice → Payment
- [ ] POS Apotek Config — Product → Batch → Expiry → Sale → Payment
- [ ] POS Hardware Config — barcode scanner, receipt printer, cash drawer, customer display

#### 22E: POS ERP Integration

- [ ] POS → Inventory integration (auto stock deduction on sale)
- [ ] POS → Finance integration (auto payment recording, revenue tracking)
- [ ] POS → Accounting integration (auto journal entry, tax entry)
- [ ] POS → CRM integration (customer purchase history, loyalty)
- [ ] POS → Audit Trail integration (all POS mutations logged)

#### 22F: POS Permissions & Security

- [ ] POS Permission Matrix — Cashier, Supervisor, Manager roles
- [ ] POS RBAC enforcement (Middleware + API + UI)
- [ ] POS Void permission (Supervisor+ only)
- [ ] POS Discount override permission (Supervisor+ only, >10%)
- [ ] POS Refund approval permission (Manager+ only)
- [ ] POS Price change permission (Manager+ only)

#### 22G: POS Reports & Analytics

- [ ] POS Sales Report — daily/weekly/monthly sales summary
- [ ] POS Product Report — top selling products, product performance
- [ ] POS Cashier Report — cashier performance, transaction count
- [ ] POS Shift Report — shift comparison, cash variance
- [ ] POS Tax Report — tax collected per period
- [ ] POS Discount Report — discount usage analysis

### Phase 23: Platform Control Center (Core) 📋 PLANNED

> **Platform Control Center = control plane operator untuk seluruh platform Qalcuity.** BUKAN "Admin ERP customer" — ini adalah operator/system admin dari seluruh sistem.
> Lihat [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 23.

#### 23A: Platform Foundation

- [ ] Design Platform Control Center architecture (separate from Customer ERP)
- [ ] Platform database schema (platform-level models: PlatformUser, PlatformRole, TenantRegistry, etc.)
- [ ] Platform authentication (separate from tenant auth — platform JWT)
- [ ] Platform authorization (7 roles: Owner, Platform Admin, Billing Admin, Support Agent, Technical Operator, Security Admin, Auditor)
- [ ] Platform RBAC middleware (platform routes ≠ tenant routes)
- [ ] Platform UI shell (layout, navigation, sidebar)

#### 23B: Tenant Management

- [ ] Tenant list (all tenants with status, plan, usage)
- [ ] Tenant detail (overview, subscription, usage, health, errors)
- [ ] Tenant search & filtering (by status, plan, industry, size)
- [ ] Tenant health dashboard (API latency, error rate, storage, active users)
- [ ] Tenant provisioning (create, activate, suspend, archive)
- [ ] Tenant settings override (platform-level configuration)

#### 23C: Subscription & Billing Management

- [ ] Subscription lifecycle management (ACTIVE → PAST_DUE → GRACE_PERIOD → SUSPENDED → ARCHIVED)
- [ ] Plan management (create, edit, deactivate plans)
- [ ] Entitlement engine (plan → module access + limits + features)
- [ ] Entitlement matrix configuration (per plan: modules, users, storage, API, AI features)
- [ ] Payment review workflow (transfer → PENDING_REVIEW → approve/reject)
- [ ] Payment history (all payments across all tenants)
- [ ] Manual payment approval (upload bukti → billing admin review)
- [ ] Subscription upgrade/downgrade workflow
- [ ] Invoice generation for subscriptions

#### 23D: Usage Metering

- [ ] Usage tracking per tenant (users, storage, API calls, transactions, documents, POS transactions)
- [ ] Usage dashboards (per tenant + aggregate)
- [ ] Usage alerts (80% → warning email, 90% → dashboard alert, 100% → policy enforcement)
- [ ] Usage history & trends
- [ ] Usage-based billing preparation

#### 23E: Platform API Routes

- [ ] `/api/platform/tenants` — CRUD + list + search
- [ ] `/api/platform/subscriptions` — list + manage
- [ ] `/api/platform/payments` — list + approve/reject
- [ ] `/api/platform/plans` — CRUD
- [ ] `/api/platform/entitlements` — CRUD + check
- [ ] `/api/platform/usage` — read + alerts
- [ ] `/api/platform/health` — tenant health metrics
- [ ] `/api/platform/monitoring` — system health
- [ ] `/api/platform/security` — security events
- [ ] `/api/platform/audit` — platform audit logs
- [ ] `/api/platform/feature-flags` — CRUD + toggle
- [ ] `/api/platform/support/tickets` — CRUD
- [ ] `/api/platform/support/impersonate` — start/stop impersonation
- [ ] `/api/platform/users` — internal user management

#### 23F: Platform UI Pages

- [ ] `/platform/dashboard` — Platform overview (tenants count, revenue, health, alerts)
- [ ] `/platform/tenants` — Tenant list with search/filter
- [ ] `/platform/tenants/[id]` — Tenant detail (overview, subscription, usage, health)
- [ ] `/platform/subscriptions` — Subscription list with status
- [ ] `/platform/payments` — Payment review queue
- [ ] `/platform/plans` — Plan management
- [ ] `/platform/entitlements` — Entitlement configuration
- [ ] `/platform/usage` — Usage dashboards
- [ ] `/platform/users` — Internal user management

### Phase 24: Platform Monitoring & Error Center 📋 PLANNED

> **Platform monitoring — system health, error tracking, log management, background jobs.**

#### 24A: System Health

- [ ] System health dashboard (CPU, memory, disk, network)
- [ ] Database health (connection pool, query performance, slow queries)
- [ ] API health (response time, throughput, error rate)
- [ ] Background job monitoring (queue depth, processing time, failures)
- [ ] Uptime tracking & SLA compliance

#### 24B: Error Center

- [ ] Error grouping (same error signature × N occurrences = 1 group)
- [ ] Error severity levels (Critical, Error, Warning)
- [ ] Error context (tenant, module, user, request ID, stack trace)
- [ ] Error filtering (tenant, module, severity, time range)
- [ ] Error trends & charts
- [ ] Error notification rules (critical → immediate alert)

#### 24C: Log Management

- [ ] Structured log ingestion (JSON format with tenantId, timestamp, severity)
- [ ] Log search & filtering (full-text search, regex support)
- [ ] Log retention policies (30-90 days configurable)
- [ ] Log export (CSV, JSON)
- [ ] Log aggregation (per tenant, per module, per severity)

#### 24D: Background Jobs

- [ ] Job queue monitoring (pending, processing, completed, failed)
- [ ] Job retry management (manual retry, auto-retry with backoff)
- [ ] Job scheduling (cron jobs, one-time jobs)
- [ ] Job history & audit

### Phase 25: Platform Support & Impersonation 📋 PLANNED

> **Platform support — ticket management, impersonation, feature flags, security center.**

#### 25A: Support Tickets

- [ ] Ticket CRUD (create, assign, update, resolve, close)
- [ ] Ticket statuses (Open, Investigating, Waiting Customer, Resolved, Closed)
- [ ] Auto-attach context (tenant, user, browser, OS, app version, request ID, recent errors)
- [ ] Ticket priority & SLA (P1: 4h, P2: 8h, P3: 24h, P4: 72h)
- [ ] Ticket assignment & routing (round-robin, skill-based)
- [ ] Internal notes (agent-to-agent communication)
- [ ] Customer communication (email notifications, status updates)
- [ ] Ticket dashboard (open, by priority, by age, by agent)

#### 25B: Impersonation

- [ ] Impersonation request (support agent → provide reason → approval)
- [ ] Impersonation approval (auto-approve or manual based on policy)
- [ ] Impersonation session (temporary session, max 30 min, time-limited)
- [ ] Impersonation restrictions (no delete, no settings change, no billing access)
- [ ] Impersonation audit trail (all actions logged during impersonation)
- [ ] Impersonation monitoring (real-time active impersonation sessions)

#### 25C: Feature Flags

- [ ] Feature flag CRUD (create, edit, delete flags)
- [ ] Feature flag types (percentage rollout, plan-based, tenant-specific, user-specific, kill switch)
- [ ] Rollout stages (Internal → 1 tenant → 5 tenants → 10% → 50% → 100%)
- [ ] Feature flag dashboard (all flags with status, rollout %, affected tenants)
- [ ] Feature flag audit trail (who changed what, when)
- [ ] Feature flag API (client-side SDK for flag evaluation)

#### 25D: Security Center

- [ ] Security events dashboard (failed login, suspicious activity, permission changes)
- [ ] Security event classification (Critical, High, Medium, Low)
- [ ] Security event response (auto-block, manual review, incident report)
- [ ] API key management (creation, revocation, usage tracking)
- [ ] Impersonation security monitoring
- [ ] Immutable audit log (platform-level, hash chain integrity)
- [ ] Audit log export (CSV, JSON for compliance)
- [ ] Audit log retention (7 years minimum, configurable)

#### 25E: Platform Integration

- [ ] Feature flag API for client-side evaluation
- [ ] Webhook for security events (Slack, email, PagerDuty)
- [ ] Integration with monitoring tools (Grafana, Prometheus — optional)
- [ ] Platform API documentation (OpenAPI/Swagger)

---

## Phase Overview

```
2026 Q3          2026 Q4          2027 Q1          2027 Q2          2027 Q3
   │                │                │                │                │
   ▼                ▼                ▼                ▼                ▼
┌──────┐        ┌──────┐        ┌──────┐        ┌──────┐        ┌──────┐
│Phase │   →    │Phase │   →    │Phase │   →    │Phase │   →    │Phase │   →    │Phase │
│1-8   │        │9-10  │        │11-13 │        │14-16 │        │17-18 │        │22-25 │
│✅Done │        │📋NEXT│        │📋PLAN│        │📋PLAN│        │📋PLAN│        │📋PLAN│
└──────┘        └──────┘        └──────┘        └──────┘        └──────┘        └──────┘
   │                │                │                │                │                │
 Aug '26        Sep '26         Oct-Nov '26     Dec '26-Feb '27  Mar-Aug '27     Sep-Nov '27
```

| Phase | Duration | Focus | Key Deliverables | Status |
|-------|----------|-------|------------------|--------|
| **1-8** | Aug 2026 | Core SaaS + All modules + Basic AI | Foundation ready | ✅ `completed` |
| **9** | Sep 2026 | Permission Engine Foundation | Granular permissions + Platform Admin (industry-agnostic) | 📋 `planned` |
| **10** | Sep 2026 | Unified Control Engine | Policy + Workflow + Approval + Escalation + SLA + Delegation + SoD + Exception + Locking | 📋 `planned` |
| **11** | Oct 2026 | Industry Configuration Engine | Industry packs + Custom fields/documents/reports + Dashboard config | 📋 `planned` |
| **12-13** | Oct-Nov 2026 | Integration, Security | Production-ready MVP | 📋 `planned` |
| **14-16** | Dec '26-Feb '27 | Production + Mobile + Desktop | Multi-platform ready | 📋 `planned` |
| **17** | Mar-May '27 | Advanced Finance | Full accounting suite | 📋 `planned` |
| **18** | Jun-Aug '27 | Enterprise features | Scale & monetization | 📋 `planned` |
| **22** | Sep-Oct '27 | POS Module (Core) | POS Core + Offline + Industry Config + ERP Integration | 📋 `planned` |
| **23** | Sep-Oct '27 | Platform Control Center (Core) | Tenant mgmt + Subscription + Billing + Entitlements + Usage | 📋 `planned` |
| **24** | Oct-Nov '27 | Platform Monitoring & Error Center | System health + Error center + Logs + Background jobs | 📋 `planned` |
| **25** | Nov-Dec '27 | Platform Support & Impersonation | Support tickets + Impersonation + Feature flags + Security center | 📋 `planned` |

### Success Criteria Per Phase

| Phase | Metric | Target |
|-------|--------|--------|
| **1-8** | Core flows working | 100% |
| **1-8** | Critical bugs | < 5 |
| **9** | Permission engine functional | 100% |
| **9** | Platform Admin dashboard ready | Yes |
| **9** | Industry-agnostic validation pass | 0 hardcoded industry logic |
| **10** | Unified Control Engine functional | 14 sub-components |
| **10** | Policy Engine configurable per company | 100% |
| **10** | Locking engine prevents unauthorized edits | 100% |
| **10** | SoD conflict detection working | 100% |
| **10** | SLA tracking with color coding | 100% |
| **11** | Industry Pack Framework ready | Engine + 3 default packs |
| **11** | Custom Fields engine functional | Dynamic fields per entity |
| **11** | Dashboard configuration functional | Industry-specific dashboards |
| **12-13** | Beta users | 50 companies |
| **12-13** | User satisfaction | > 3.5/5 |
| **14-16** | Mobile app store ready | Yes |
| **17** | Full accounting compliance | Indonesian GAAP |
| **18** | Paying customers | 100+ companies |
| **22** | POS operational for all industries | POS Core + Offline + Industry Config |
| **23** | Platform Control Center core functional | Tenant mgmt + Subscription + Billing + Entitlements |
| **24** | Monitoring & Error Center functional | System health + Error grouping + Log management |
| **25** | Support & Security operational | Ticket system + Impersonation + Feature flags + Security center |

---

## Success Metrics

### North Star Metric

**Monthly Recurring Revenue (MRR)**

### Supporting Metrics

| Category | Metric | Target (Dec 2027) |
|----------|--------|-------------------|
| **Growth** | MRR | Rp 500 juta |
| **Growth** | Total customers | 500 |
| **Growth** | Customer growth rate | 15% MoM |
| **Retention** | Monthly churn | < 5% |
| **Retention** | NPS | > 50 |
| **Engagement** | DAU/MAU ratio | > 40% |
| **Engagement** | AI feature usage | > 60% |
| **Efficiency** | CAC payback | < 6 months |
| **Efficiency** | LTV/CAC ratio | > 3x |

### Key Milestones

| Date | Milestone | Status |
|------|-----------|--------|
| **Aug 2026** | MVP Development Complete | ✅ Done |
| **Sep 2026** | Industry Pack Framework Ready | 📋 Planned |
| **Oct 2026** | MVP Beta Launch | 📋 Planned |
| **Dec 2026** | Production Deployment | 📋 Planned |
| **Feb 2027** | 20 Paying Customers | 📋 Planned |
| **May 2027** | 100 Paying Customers | 📋 Planned |
| **Aug 2027** | Enterprise Features Launch | 📋 Planned |

---

## Risks & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Scope creep** | High | High | Strict phase scope, feature flags |
| **Performance issues** | Medium | High | Load testing, optimization sprints |
| **Security breach** | Low | Critical | Security audit, bug bounty |
| **Integration failures** | Medium | Medium | Fallback options, mock services |
| **Mobile platform gaps** | High | Medium | Treat as separate platform, dedicated sprint |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Low adoption** | Medium | High | Early customer feedback, pivots |
| **Pricing resistance** | Medium | Medium | Tiered pricing, free trial |
| **Competitor response** | High | Medium | Speed to market, differentiation |
| **Regulatory changes** | Low | High | Compliance monitoring |

---

## Changelog

| Date | Change | Impact |
|------|--------|--------|
| 2026-08-30 | Code Quality Sprint — Dynamic pages, Categories DELETE, emoji cleanup, toast icons, loading/error states, env config, security fix | Code quality + UX |
| 2026-08-30 | Unified Control Engine — ADR-017 s/d ADR-023, 16 recommendations documented, Phase 10 expanded | Enterprise-grade operational control |
| 2026-08-30 | Control Center Architecture — ADR-015 & ADR-016, Phase 10 added, Control Center docs updated | Operational backbone |
| 2026-08-30 | Permission Engine Architecture — ADR-013 & ADR-014, Phase 9 added, docs updated | Architecture foundation |
| 2026-08-31 | Platform Control Center — ARCHITECTURE.md Section 23 (4 Worlds, Control Center, Superadmin roles, Subscription lifecycle, Entitlements, Error center, Tenant health, Impersonation, Feature flags, Usage metering, Security center) | Platform architecture |
| 2026-08-31 | POS Module Architecture — POS as Core Module in ARCHITECTURE.md Section 22, Phase 22 in ROADMAP, POS features in FEATURES | POS module foundation |
| 2026-08-31 | Architecture Formalization — Business Operating System vision, 3 Foundation Engines, Industry Packs, Decision Tree, Anti-patterns | Strategic architecture |
| 2026-08-30 | Documentation overhaul — ROADMAP, ARCHITECTURE, DATABASE, SECURITY, UI_UX, DECISIONS | Developer experience |
| 2026-08-29 | Zod Validation — 14+ schemas, 19 API routes validated | Input security |
| 2026-08-29 | Audit Logging — 77 audit calls across 10 mutation endpoints | Compliance |
| 2026-08-29 | RBAC Defense-in-depth — 3 layers, 35 API routes + 22 pages | Access control |
| 2026-08-29 | Responsive Tables — dual layout on 17 pages | Mobile UX |
| 2026-08-29 | i18n Expansion — 20+ pages localized, 200+ new keys | Internationalization |
| 2026-08-29 | Settings Pages — 6 pages completed with full i18n | Settings |
| 2026-08-29 | Detail Pages — 9 loading.tsx, delete on 6 pages, 48 i18n keys | CRUD completeness |
| 2026-08-29 | Pipeline Fix — stage name mismatch, CLOSED_WON/LOST added | CRM |
| 2026-08-29 | Sidebar Fix — navigation reorder, billing path fix | Navigation |
| 2026-08-28 | Billing & Subscription — Plan selection, manual transfer, superadmin approve/reject | Revenue management |
| 2026-08-28 | Role Superadmin — RBAC 4 role, sidebar filtering, middleware protection | Access control |
| 2026-08-28 | AI Features — Chat, Hub, Insights, sidebar menu | AI foundation |
| 2026-08-28 | Advanced Reporting — 12 report types, export, charts | Business intelligence |
| 2026-08-28 | Payment Gateway — Midtrans/Xendit config + processing API | Payment processing |
| 2026-08-28 | Email Notification — SMTP config + email templates | Communication |
| 2026-08-28 | Bank Reconciliation — manual page + API | Financial reconciliation |
| 2026-08-28 | Desktop App — Electron wrapper | Desktop platform |
| 2026-08-28 | Mobile App Polish — SearchBar, LoadingSkeleton, pull-to-refresh | Mobile UX |
| 2026-08-28 | Chart of Accounts — full CRUD tree view | Finance foundation |
| 2026-08-28 | Seed data — comprehensive demo data | Demo & testing |
| 2026-08-28 | Empty states, Toast notifications, Confirmation dialogs | UX improvements |
| 2026-08-28 | Mobile responsive, Navigation links, Lucide icons | UI consistency |
| 2026-08-18 | i18n support, All modules localized | Internationalization |
| 2026-08-06 | Dashboard stats, Audit trail, Global search, Dark mode | Core features |

---

## Documentation References

| Document | Purpose | Location |
|----------|---------|----------|
| **AGENT.md** | AI Agent development rules | [`AGENT.md`](AGENT.md) |
| **FEATURES.md** | Feature list with status | [`FEATURES.md`](FEATURES.md) |
| **CURRENT.md** | Current state & known issues | [`CURRENT.md`](CURRENT.md) |
| **ARCHITECTURE.md** | Technical architecture | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| **DATABASE.md** | Database architecture | [`docs/DATABASE.md`](docs/DATABASE.md) |
| **SECURITY.md** | Security architecture | [`docs/SECURITY.md`](docs/SECURITY.md) |
| **UI_UX.md** | UI/UX architecture | [`docs/UI_UX.md`](docs/UI_UX.md) |
| **DECISIONS.md** | Architectural decisions | [`docs/DECISIONS.md`](docs/DECISIONS.md) |

---

**Last Updated:** August 31, 2026
**Maintainer:** Qalcuity Product Team
