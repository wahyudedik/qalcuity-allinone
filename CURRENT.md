> **Last Updated:** 3 September 2026 (Batch 1C — 2FA Setup + Session Management)
> **Version:** v6.1.2
> **Status:** Active Development — All Foundation Engines Integrated, GL/Journal Entry, Tax Engine MVP, Period Closing, Approval Engine Implemented, Decimal Type Fixed, 2FA + Session Management

---

## 🎯 Current Sprint

**Fokus:** Batch 1C — Security Critical: 2FA Setup + Session Management

- ✅ **Batch 1C:** 2FA Setup + Session Management — TOTP-based 2FA, session tracking, login history
- ✅ Prisma schema updated: `twoFactorEnabled`, `twoFactorSecret`, `twoFactorBackupCodes` added to User model
- ✅ New models: `UserSession` (session tracking), `LoginLog` (login history)
- ✅ Migration SQL: `20260903031900_add_2fa_sessions_login_logs/migration.sql`
- ✅ TOTP utility: `apps/web/lib/totp.ts` — RFC 6238 compliant, no external dependencies
- ✅ API routes: `/api/settings/security/password`, `/sessions`, `/login-history`, `/2fa`
- ✅ Security page enhanced: Real 2FA flow, session management, login history with pagination
- ✅ Zod schemas: `enable2faSchema`, `disable2faSchema`, `verify2faSchema`, `revokeSessionSchema`
- ✅ TypeScript check PASS (0 errors)

### Previous Batches
- ✅ **Batch 1A:** Fix Decimal Type — All monetary fields upgraded to `Decimal(19,4)`
- ✅ **Batch 1B:** (if applicable)

### Previous Milestones
- ✅ **FASE 3C:** Sidebar Navigation — 11 new pages added to sidebar
- ✅ **FASE 4A:** Tax Engine MVP — TaxRate model, CRUD API, invoice integration
- ✅ **FASE 4B:** Period Closing Wizard — AccountingPeriod model, 4-step wizard, period management service
- ✅ **FASE 4C:** Multi-level Approval Engine — ApprovalLevel + ApprovalRequest models, API routes (requests, approve, reject)

### Previous Batches (Complete)
- ✅ **Batch 1:** ConfirmDialog (24 `window.confirm` replaced), inline error banners (4 `alert()` replaced), emoji→Lucide icons, SVG→Lucide (14 icons)
- ✅ **Batch 2:** Dark mode (8 components), 33 i18n keys added, navigation fixes
- ✅ **Batch 3:** Reports page mobile cards (12 sub-components)
- ✅ **Batch 4:** Toast system (`toast.tsx` + `ToastProvider`), 3 loading states, payments fix
- ✅ **Batch 5:** `.gitignore` +6 patterns, `.env.production` untracked, `dev.db` untracked, `.env.example` updated
- ✅ **Batch 6:** Google OAuth setup, Mail server setup
- ✅ **Batch 7A:** Permission Engine Integration — ~90 API routes with `can()` checks
- ✅ **Batch 7B:** Workflow Engine Integration — 5 entities (Invoice, Payment, PO, Quotation, Leaves)
- ✅ **Batch 7C:** General Ledger + Journal Entry — CoA API, Journal Entry API + UI, Double-entry validation
- ✅ **Batch 7D:** Redis Rate Limiter — Production-ready rate limiting with Redis fallback to in-memory
- ✅ **Batch 7E:** Entitlement Engine — Plan-based module access, feature limits, usage tracking

---

## 📈 Progress Overview

| Category | Status | Completion |
|----------|--------|------------|
| **Authentication & RBAC** | ✅ Production-ready | 100% |
| **Permission Engine Integration** | ✅ Production-ready | 95% (~90 API routes) |
| **Workflow Engine Integration** | ✅ Production-ready | 80% (5 entities) |
| **Core CRUD (Finance, CRM, HR, Inventory)** | ✅ Production-ready | ~95% |
| **General Ledger & Journal Entry** | ✅ Implemented | 70% (CoA + Journal + Validation) |
| **Tax Engine MVP** | ✅ Implemented | 40% (TaxRate CRUD + Invoice integration, belum Coretax/e-Faktur) |
| **Period Closing Wizard** | ✅ Implemented | 50% (4-step wizard, belum 7-step full) |
| **Multi-level Approval Engine** | ✅ Implemented | 40% (Basic levels + requests, belum delegation/SLA) |
| **Billing & Subscription** | ✅ Working | 100% |
| **Entitlement Engine** | ✅ Implemented | 75% (Plan-based access + limits) |
| **Security (Validation, Sanitization, Audit)** | ✅ Hardened | 95% |
| **Redis Rate Limiter** | ✅ Production-ready | 90% (Redis + in-memory fallback) |
| **UI/UX (Responsive, i18n, Dark Mode)** | ✅ Production-ready | 99% |
| **Reporting & Charts** | ✅ Working | 85% |
| **Analytics & Decision Intelligence** | ✅ Phase 1 MVP + Studio Architecture + Workspace UI | 75% |
| **AI Features** | ⚠️ Basic/Mock | 20% |
| **Payment Gateway** | ✅ Midtrans Snap Integrated | 80% |
| **Mobile App (Auth)** | ✅ JWT Auth Flow | 40% |
| **Desktop App** | ⚠️ Placeholder only | 5% |
| **POS Module** | 📋 Planned | 0% |
| **Platform Control Center** | ✅ MVP Implemented (UI + API) | 40% |

---

## ✅ Completed Features

### Authentication & Authorization
- [x] Authentication — NextAuth JWT with CredentialsProvider ([`apps/web/lib/auth.ts`](apps/web/lib/auth.ts))
- [x] RBAC — 4 roles: SUPERADMIN, ADMIN, MEMBER, VIEWER ([`apps/web/middleware.ts`](apps/web/middleware.ts))
- [x] Registration — [`/api/auth/register`](apps/web/app/api/auth/register/route.ts)
- [x] Session management — JWT strategy with role + tenantId in token
- [x] Password hashing — bcryptjs
- [x] **RBAC Defense-in-depth** — 3 lapisan: middleware + API route + UI visibility
  - [`requireMutateAuth()`](apps/web/lib/session.ts) dan [`requireAdminAuth()`](apps/web/lib/session.ts) helpers
  - Role checks di 35 API routes
  - Page-level role checks di settings, audit, billing
  - UI action visibility di 22 pages

### Core Modules
- [x] **CRM** — Leads, Contacts, Deals, Pipeline (6 stages: DISCOVERY → CLOSED_LOST) `production_ready`
- [x] **Inventory** — Products, Categories, Suppliers, Stock Movements `production_ready`
- [x] **HR** — Employees, Attendance, Leaves, Payroll `production_ready`
- [x] **Finance** — Invoices, Payments, Quotations, Purchase Orders, Chart of Accounts, Reconciliation, General Ledger, Journal Entry `production_ready`

### Foundation Engines (Phase 9)
- [x] **Permission Engine** — `@qalcuity/permissions` package: granular permission check `can(user, action, resource, context)`, roles, resource/action definitions ([`packages/permissions/`](packages/permissions/))
- [x] **Workflow Engine** — `@qalcuity/workflow` package: configurable state machine, status transitions, guards, default definitions ([`packages/workflow/`](packages/workflow/))
- [x] **Industry Configuration Engine** — `@qalcuity/industry-config` package: industry packs, custom fields, custom documents, custom reports ([`packages/industry-config/`](packages/industry-config/))
- [x] **Permission Engine Integration (Batch 7A)** — ~90 API routes integrated with `can()` permission checks via [`apps/web/lib/route-permissions.ts`](apps/web/lib/route-permissions.ts)
- [x] **Workflow Engine Integration (Batch 7B)** — 5 entities: Invoice, Payment, PO, Quotation, Leaves integrated with workflow transitions
- [x] **Roles API** — CRUD roles di `/api/settings/roles` dengan tenant isolation ([`apps/web/app/api/settings/roles/`](apps/web/app/api/settings/roles/))
- [x] **Workflow API** — Definition CRUD, transition, history di `/api/workflow/` ([`apps/web/app/api/workflow/`](apps/web/app/api/workflow/))
- [x] **Industry Config API** — Settings, defaults, fields di `/api/settings/industry/` ([`apps/web/app/api/settings/industry/`](apps/web/app/api/settings/industry/))
- [x] **Custom Fields API** — CRUD custom fields di `/api/settings/custom-fields/` ([`apps/web/app/api/settings/custom-fields/`](apps/web/app/api/settings/custom-fields/))
- [x] **Helper Libraries** — [`apps/web/lib/permissions.ts`](apps/web/lib/permissions.ts), [`apps/web/lib/workflow.ts`](apps/web/lib/workflow.ts), [`apps/web/lib/industry-config.ts`](apps/web/lib/industry-config.ts)

### Platform Control Center (Phase 14)
- [x] **Platform Layout** — Purple-themed sidebar + header + route group ([`apps/web/components/layout/platform-sidebar.tsx`](apps/web/components/layout/platform-sidebar.tsx), [`apps/web/components/layout/platform-header.tsx`](apps/web/components/layout/platform-header.tsx), [`apps/web/components/layout/platform-layout.tsx`](apps/web/components/layout/platform-layout.tsx))
- [x] **Platform Dashboard** — Stats cards (Tenants, MRR, Users, Health), Recent Activity, Quick Actions, System Metrics ([`apps/web/app/platform/page.tsx`](apps/web/app/platform/page.tsx))
- [x] **Platform Tenants** — List with search/filter/sort/pagination + Detail with stats/activity ([`apps/web/app/platform/tenants/page.tsx`](apps/web/app/platform/tenants/page.tsx), [`apps/web/app/platform/tenants/[id]/page.tsx`](apps/web/app/platform/tenants/[id]/page.tsx))
- [x] **Platform Billing** — MRR/ARR stats, Plan Distribution, Payment History ([`apps/web/app/platform/billing/page.tsx`](apps/web/app/platform/billing/page.tsx))
- [x] **Platform Monitoring** — System Health, Services Status, Resource Usage, Incidents ([`apps/web/app/platform/monitoring/page.tsx`](apps/web/app/platform/monitoring/page.tsx))
- [x] **Platform Support** — Ticket list, search, filter, ticket detail modal ([`apps/web/app/platform/support/page.tsx`](apps/web/app/platform/support/page.tsx))
- [x] **Platform Security** — Security events, stats, filters, event detail modal ([`apps/web/app/platform/security/page.tsx`](apps/web/app/platform/security/page.tsx))
- [x] **Platform Settings** — General settings, Security toggles, Plan Limits, About ([`apps/web/app/platform/settings/page.tsx`](apps/web/app/platform/settings/page.tsx))
- [x] **Platform API Routes** — Stats, Tenants CRUD, Tenant detail/suspend/reactivate ([`apps/web/app/api/platform/stats/route.ts`](apps/web/app/api/platform/stats/route.ts), [`apps/web/app/api/platform/tenants/route.ts`](apps/web/app/api/platform/tenants/route.ts), [`apps/web/app/api/platform/tenants/[id]/route.ts`](apps/web/app/api/platform/tenants/[id]/route.ts))
- [x] **SUPERADMIN RBAC** — Middleware enforces SUPERADMIN-only access to `/platform/*` ([`apps/web/middleware.ts`](apps/web/middleware.ts))

### Infrastructure
- [x] **Audit Trail** — All mutations logged with old/new values ([`apps/web/lib/audit.ts`](apps/web/lib/audit.ts))
- [x] **Rate Limiting (Redis)** — Production-ready rate limiter with Redis + in-memory fallback ([`apps/web/lib/rate-limit.ts`](apps/web/lib/rate-limit.ts), [`apps/web/lib/rate-limit-config.ts`](apps/web/lib/rate-limit-config.ts), [`apps/web/lib/with-rate-limit.ts`](apps/web/lib/with-rate-limit.ts))
- [x] **Rate Limit Monitor** — Logging, analytics, suspicious pattern detection ([`apps/web/lib/rate-limit-monitor.ts`](apps/web/lib/rate-limit-monitor.ts))
- [x] **Redis Client** — Redis connection manager with fallback ([`apps/web/lib/redis.ts`](apps/web/lib/redis.ts))
- [x] **Health Check** — [`/api/health`](apps/web/app/api/health/route.ts)
- [x] **Global Search** — Ctrl+K search across all modules ([`/api/search`](apps/web/app/api/search/route.ts))
- [x] **Zod Validation** — 14+ schemas, 20+ API routes ([`apps/web/lib/validation-schemas.ts`](apps/web/lib/validation-schemas.ts))
- [x] **Dynamic Overview Pages** — 5 halaman fetch dari real API (Finance, HR, Inventory, CRM, Dashboard)
- [x] **Integrations API** — `/api/settings/integrations` untuk dynamic connection status
- [x] **Settings Real Backend** — Notifications & integrations API connected to Prisma DB

### Security Hardening
- [x] **Input Validation** — Zod schemas untuk semua API mutation routes
- [x] **Input Sanitization** — [`apps/web/lib/sanitize.ts`](apps/web/lib/sanitize.ts)
- [x] **RBAC API Routes** — Role checks di 35 API routes
- [x] **RBAC UI** — Action visibility di 22 pages (buttons, menus)
- [x] **Page-level Auth** — Settings, audit, billing pages protected
- [x] **CSP Headers** — Content-Security-Policy implemented di [`apps/web/middleware.ts`](apps/web/middleware.ts) + [`apps/web/next.config.js`](apps/web/next.config.js) — `unsafe-eval` removed untuk XSS protection
- [x] **CORS Configuration** — Explicit CORS config di [`apps/web/next.config.js`](apps/web/next.config.js)
- [x] **NEXTAUTH_SECRET Mandatory** — Throw error di production jika env var tidak ada (bukan hardcoded fallback)
- [x] **Rate Limiter Hardened** — Security warnings untuk in-memory mode di production

### General Ledger & Journal Entry (Batch 7C)
- [x] **General Ledger API** — CoA API, Journal Entry CRUD with double-entry validation ([`apps/web/app/api/finance/journal-entries/`](apps/web/app/api/finance/journal-entries/))
- [x] **Journal Entry UI** — Journal entry page with create/view functionality ([`apps/web/app/dashboard/finance/journal-entries/`](apps/web/app/dashboard/finance/journal-entries/))
- [x] **Double-entry Validation** — Zod schema validates debit = credit, minimum 2 items per entry
- [x] **Journal Entry Schema** — [`apps/web/lib/validation-schemas.ts`](apps/web/lib/validation-schemas.ts) — `createJournalEntrySchema`, `journalEntryItemSchema`

### Tax Engine MVP (FASE 4A)
- [x] **TaxRate Model** — Prisma model with name, code, rate, type (VAT/INCOME_TAX/OTHER), isActive, isDefault ([`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma))
- [x] **Tax Rate CRUD API** — GET/POST di [`/api/finance/tax-rates`](apps/web/app/api/finance/tax-rates/route.ts), GET/PUT/DELETE di [`/api/finance/tax-rates/[id]`](apps/web/app/api/finance/tax-rates/[id]/route.ts) dengan tenant isolation + RBAC
- [x] **Tax Rate UI** — List page dengan search/filter di [`/dashboard/finance/tax-rates`](apps/web/app/dashboard/finance/tax-rates/page.tsx) + loading state
- [x] **Invoice Tax Integration** — Invoice form terintegrasi dengan TaxRate (select tax rate, auto-calculate taxAmount) ([`apps/web/components/finance/invoice-form.tsx`](apps/web/components/finance/invoice-form.tsx))
- [x] **Tax Zod Schema** — `createTaxRateSchema` di [`apps/web/lib/validation-schemas.ts`](apps/web/lib/validation-schemas.ts)
- [x] **Prisma Migration** — `TaxRate` model + `tenantId_code` unique index

### Period Closing Wizard (FASE 4B)
- [x] **AccountingPeriod Model** — Prisma model with name, startDate, endDate, status (OPEN/CLOSING/CLOSED), closedBy, closedAt, closeNotes ([`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma))
- [x] **Period Management Service** — [`apps/web/lib/period-closing.ts`](apps/web/lib/period-closing.ts) — 4-step wizard logic (pre-checks, exceptions, review, closing)
- [x] **Period CRUD API** — GET/POST di [`/api/finance/periods`](apps/web/app/api/finance/periods/route.ts), GET/PUT di [`/api/finance/periods/[id]`](apps/web/app/api/finance/periods/[id]/route.ts)
- [x] **Period Close API** — POST di [`/api/finance/periods/[id]/close`](apps/web/app/api/finance/periods/[id]/close/route.ts) — execute period closing
- [x] **Period UI** — List page di [`/dashboard/finance/periods`](apps/web/app/dashboard/finance/periods/page.tsx) + loading state
- [x] **Prisma Migration** — `AccountingPeriod` model + `tenantId_startDate` unique index

### Multi-level Approval Engine (FASE 4C)
- [x] **ApprovalLevel Model** — Prisma model with entityType, level, name, requiredRole ([`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma))
- [x] **ApprovalRequest Model** — Prisma model with entityType, entityId, currentLevel, status (PENDING/APPROVED/REJECTED/CANCELLED), requestedBy, resolvedBy
- [x] **Approval Request API** — GET/POST di [`/api/approval/requests`](apps/web/app/api/approval/requests/route.ts), GET di [`/api/approval/requests/[id]`](apps/web/app/api/approval/requests/[id]/route.ts)
- [x] **Approval Actions API** — POST approve di [`/api/approval/requests/[id]/approve`](apps/web/app/api/approval/requests/[id]/approve/route.ts), POST reject di [`/api/approval/requests/[id]/reject`](apps/web/app/api/approval/requests/[id]/reject/route.ts)
- [x] **Approval UI** — Approvals page di [`/dashboard/approvals`](apps/web/app/dashboard/approvals/page.tsx)
- [x] **Prisma Migration** — `ApprovalLevel` + `ApprovalRequest` models

### Sidebar Navigation (FASE 3C)
- [x] **11 New Pages Added** — Tax Rates, Periods, Approvals, dan halaman lainnya ditambahkan ke sidebar navigation

### Entitlement Engine (Batch 7E)
- [x] **Entitlement Engine** — Plan-based module access, feature limits, usage tracking ([`apps/web/lib/entitlement.ts`](apps/web/lib/entitlement.ts))
- [x] **Entitlements Config** — Default entitlements per plan (Starter, Growth, Business) ([`apps/web/lib/entitlements-config.ts`](apps/web/lib/entitlements-config.ts))
- [x] **Entitlement API** — `/api/billing/entitlement` for entitlement check
- [x] **Feature Check API** — `/api/billing/feature-check` for real-time feature access
- [x] **Usage Tracking API** — `/api/billing/usage` for usage metering

### Reporting
- [x] **Advanced Reporting** — 12 report types with aggregate from DB
- [x] **Export** — CSV/Excel/Print export functionality ([`apps/web/lib/export.ts`](apps/web/lib/export.ts))
- [x] **Charts** — Bar, Pie, Line chart components ([`apps/web/components/ui/charts.tsx`](apps/web/components/ui/charts.tsx))

### Analytics & Decision Intelligence (Phase 1 MVP)
- [x] **Analytics Dashboard** — Overview page with KPI cards, trend charts, alerts, quick actions ([`apps/web/app/dashboard/analytics/page.tsx`](apps/web/app/dashboard/analytics/page.tsx))
- [x] **Data Explorer** — Point-and-click query builder with 15 datasets, filters, dimensions, measures ([`apps/web/app/dashboard/analytics/explorer/page.tsx`](apps/web/app/dashboard/analytics/explorer/page.tsx))
- [x] **KPI Management** — Create, track, evaluate KPIs with target/direction/period ([`apps/web/app/dashboard/analytics/kpi/page.tsx`](apps/web/app/dashboard/analytics/kpi/page.tsx))
- [x] **Saved Reports** — Save, star, organize reports from Data Explorer ([`apps/web/app/dashboard/analytics/reports/page.tsx`](apps/web/app/dashboard/analytics/reports/page.tsx))
- [x] **Data Alerts** — Create alert rules with severity, conditions, thresholds ([`apps/web/app/dashboard/analytics/alerts/page.tsx`](apps/web/app/dashboard/analytics/alerts/page.tsx))
- [x] **Analytics API** — 15 API routes: dashboard, kpi, kpi/[id], metrics, reports, reports/[id], reports/[id]/execute, explorer, kpi/[id]/evaluate, insights, anomaly, forecast, charts, dashboards, dashboards/[id], dashboards/[id]/widgets, query-history, dictionary, scheduled
- [x] **@qalcuity/analytics package** — Types, dimensions, metrics, engine, utils ([`packages/analytics/`](packages/analytics/))
- [x] **Analytics i18n** — 200+ keys for id and en locale
- [x] **Analytics Workspace UI** — 5 pages: Charts, Dashboards, Dictionary, History, Scheduled ([`apps/web/app/dashboard/analytics/`](apps/web/app/dashboard/analytics/))
- [x] **Analytics Loading States** — 5 loading.tsx files untuk workspace pages
- [x] **Analytics Prisma Models** — 13 models: KPI, KPIEvaluation, AlertRule, AlertTrigger, SavedReport, AnalyticsDataset, AnalyticsQueryHistory, AnalyticsChart, AnalyticsDashboard, AnalyticsDashboardWidget, DataDictionaryEntry, ScheduledQuery, MetricDefinition

### Billing & Subscription
- [x] Subscription plans — Starter, Growth, Business
- [x] Manual transfer payment — Upload bukti transfer
- [x] Superadmin approval/reject workflow
- [x] WhatsApp confirmation flag
- [x] Notification bell for admin payments
- [x] **Midtrans Snap Integration** — Real payment gateway for subscription payments ([`apps/web/lib/payment/midtrans.ts`](apps/web/lib/payment/midtrans.ts))
  - Create transaction API — [`/api/billing/payments/midtrans`](apps/web/app/api/billing/payments/midtrans/route.ts)
  - Webhook/callback handler — [`/api/billing/payments/midtrans/callback`](apps/web/app/api/billing/payments/midtrans/callback/route.ts)
  - HMAC SHA512 signature verification
  - Billing page Midtrans payment button
  - Payment success redirect flow

### AI Features (Basic)
- [x] AI Chat — Floating button component ([`components/ai/ai-chat.tsx`](apps/web/components/ai/ai-chat.tsx))
- [x] AI Provider abstraction — OpenAI provider + Mock fallback ([`apps/web/lib/ai/provider.ts`](apps/web/lib/ai/provider.ts))
- [x] AI Insights — Business insight cards on dashboard

### UI/UX
- [x] **i18n** — Bahasa Indonesia + English ([`apps/web/lib/i18n.tsx`](apps/web/lib/i18n.tsx)), 22+ pages localized, 433+ keys
- [x] **Responsive Design** — Mobile-first, 44x44px touch targets
- [x] **Responsive Tables** — Dual layout (mobile cards + desktop tables) di 19 halaman + Reports mobile cards (12 sub-components)
- [x] **Dark Mode** — Class-based toggle (Tailwind `darkMode: "class"`), 8 components dengan dark mode support
- [x] **Icons** — Lucide React throughout (emoji→Lucide, SVG→Lucide — 14 icons replaced)
- [x] **Empty States** — All CRUD pages have empty state components
- [x] **Toast System** — Centralized toast provider ([`apps/web/components/ui/toast.tsx`](apps/web/components/ui/toast.tsx) + `ToastProvider`), CRUD operation success/error feedback dengan Lucide Check/X icons
- [x] **ConfirmDialog** — Centralized confirmation component ([`apps/web/components/ui/confirm-dialog.tsx`](apps/web/components/ui/confirm-dialog.tsx)), 24 `window.confirm` replaced, delete operations (14+ pages)
- [x] **Inline Error Banners** — Inline error display replacing 4 `alert()` calls
- [x] **Navigation Links** — Cross-entity navigation (e.g., Invoice → Contact), navigation fixes
- [x] **Loading States** — 28 loading.tsx files untuk detail & workspace pages
- [x] **UI/UX Audit Fixes (P0/P1)** — 6 fixes dari UI/UX audit:
  - 🔒 **P0:** Password URL exposure removed dari login page
  - 🔒 **P0:** "Adjust Stok" button functional dengan modal/form
  - ✏️ **P1:** "Edit Profile" button functional di Employee Detail (inline edit)
  - ✏️ **P1:** "Edit" button functional di Product Detail (inline edit)
  - 📤 **P1:** "Export" button functional di Reconciliation (CSV export)
  - ☑️ **P1:** "Remember Me" checkbox wired ke signIn function

### Phase 13: UI Completeness Fixes (1 Sep 2026)
- [x] **13a:** Finance detail page buttons — all functional (invoice, payment, PO, quotation actions)
- [x] **13b:** CRM detail page buttons — all functional (contact, lead, deal actions)
- [x] **13c:** HR detail page buttons — all functional (employee, attendance, leave, payroll actions)
- [x] **13d:** Inventory detail page buttons — all functional (product, supplier, category, stock actions)
- [x] **13e:** HR attendance stats — real API data replacing hardcoded values
- [x] **13f:** Settings notifications SMTP — real Nodemailer API integration ([`apps/web/app/api/settings/smtp/route.ts`](apps/web/app/api/settings/smtp/route.ts))
- [x] **13g:** Settings profile buttons — export (CSV), upload photo (base64), delete account functional
- [x] **13h:** Analytics dashboards — create modal functional with form validation
- [x] **13i:** Responsive design — mobile card views added for billing & settings/billing pages
- [x] **13j:** i18n — Audit & AI pages fully localized with `useTranslation()` (400+ keys total)
- [x] **13k:** TypeScript verification — `npx tsc --noEmit` PASS (0 errors)

### UI/UX Audit & Fixes (31 Aug 2026)
- [x] **Security P0:** Password URL exposure — removed dari login page, password tidak lagi di-expose di URL
- [x] **Functional P0:** "Adjust Stok" button — sekarang functional dengan modal form untuk stock adjustment
- [x] **Functional P1:** Edit buttons — Employee Detail dan Product Detail pages sekarang memiliki edit functionality
- [x] **Functional P1:** Export reconciliation CSV — tombol export di reconciliation page berfungsi
- [x] **Auth P1:** Remember Me checkbox — wired ke signIn function dengan proper session handling
- [x] **Type Fix:** UserRole type mismatch — [`packages/types`](packages/types/src/index.ts) disesuaikan dengan actual codebase (SUPERADMIN, ADMIN, MEMBER, VIEWER)
- [x] **Security:** NEXTAUTH_SECRET handling — throw error di production jika env var tidak ada (bukan fallback ke hardcoded)
- [x] **Build:** ignoreBuildErrors disabled — next.config.js不再 menggunakan `ignoreBuildErrors: true`
- [x] **Validation:** Client-side Zod validation — finance forms (invoice, quotation, payment, PO) sekarang validate di client sebelum submit
- [x] **Audit:** Audit logging — attendance [`[id]`](apps/web/app/api/hr/attendance/[id]/route.ts) routes sekarang log mutations
- [x] **i18n:** Hardcoded Indonesian text — header, error pages, error boundary diganti dengan i18n keys
- [x] **Links:** Dead links — forgot-password link disabled (belum ada route), Google register functional
- [x] **Functional:** Non-functional secondary buttons — print, stock history, order history buttons sekarang functional

### Phase 4 Low Priority Fixes (P3) — 31 Aug 2026
- [x] **CSP Hardening:** Removed `unsafe-eval` dari CSP headers ([`apps/web/middleware.ts`](apps/web/middleware.ts), [`apps/web/next.config.js`](apps/web/next.config.js)) — meningkatkan XSS protection. `unsafe-inline` dipertahankan karena diperlukan oleh Next.js inline scripts dan Tailwind CSS
- [x] **Prisma Logging:** Toggle logging via env var `ENABLE_PRISMA_LOGGING` ([`apps/web/lib/db.ts`](apps/web/lib/db.ts)) — default off di development, hanya warn+error
- [x] **Emoji Icons:** Semua emoji icons diganti ke Lucide React — auth layout (`BarChart3`, `TrendingUp`, `Bot`), login page (`FlaskConical`), reports page (`Star`)
- [x] **Hardcoded Text:** Tab labels dan placeholder di analytics reports diganti ke i18n keys
- [x] **Loading States:** 4 loading.tsx baru ditambahkan untuk analytics sub-pages (alerts, explorer, kpi, reports)
- [x] **Error States:** 4 error.tsx baru ditambahkan untuk analytics sub-pages (alerts, explorer, kpi, reports)

### CRM Import
- [x] **CSV Parser** — Parse CSV files for CRM contacts & leads ([`apps/web/lib/csv-parser.ts`](apps/web/lib/csv-parser.ts))
- [x] **Excel Parser** — Parse XLSX files using xlsx library ([`apps/web/lib/excel-parser.ts`](apps/web/lib/excel-parser.ts))
- [x] **Contacts Import API** — `/api/crm/contacts/import` dengan bulk validation ([`apps/web/app/api/crm/contacts/import/route.ts`](apps/web/app/api/crm/contacts/import/route.ts))
- [x] **Leads Import API** — `/api/crm/leads/import` dengan bulk validation ([`apps/web/app/api/crm/leads/import/route.ts`](apps/web/app/api/crm/leads/import/route.ts))
- [x] **Import Modal UI** — Upload file, preview, mapping, progress ([`apps/web/components/crm/import-modal.tsx`](apps/web/components/crm/import-modal.tsx))

### @qalcuity/ui Component Library
- [x] **Button** — Configurable button component ([`packages/ui/src/components/Button.tsx`](packages/ui/src/components/Button.tsx))
- [x] **Input** — Form input component ([`packages/ui/src/components/Input.tsx`](packages/ui/src/components/Input.tsx))
- [x] **Select** — Dropdown select component ([`packages/ui/src/components/Select.tsx`](packages/ui/src/components/Select.tsx))
- [x] **Table** — Data table component ([`packages/ui/src/components/Table.tsx`](packages/ui/src/components/Table.tsx))
- [x] **Modal** — Dialog/modal component ([`packages/ui/src/components/Modal.tsx`](packages/ui/src/components/Modal.tsx))
- [x] **Card** — Content card component ([`packages/ui/src/components/Card.tsx`](packages/ui/src/components/Card.tsx))
- [x] **Badge** — Status badge component ([`packages/ui/src/components/Badge.tsx`](packages/ui/src/components/Badge.tsx))
- [x] **Alert** — Alert/notification component ([`packages/ui/src/components/Alert.tsx`](packages/ui/src/components/Alert.tsx))
- [x] **Spinner** — Loading spinner component ([`packages/ui/src/components/Spinner.tsx`](packages/ui/src/components/Spinner.tsx))

### Data
- [x] **Mock Data Migrated** — All demo data uses Prisma queries, no hardcoded mocks
- [x] **Seed Script** — Comprehensive seed data ([`packages/db/prisma/seed.ts`](packages/db/prisma/seed.ts))
- [x] **Demo Load API** — [`/api/demo/load`](apps/web/app/api/demo/load/route.ts) for demo data loading

### Platforms
- [x] **Web App** — Core Next.js application, production-ready ([`apps/web/`](apps/web/))
- [x] **Desktop App** — Electron wrapper, placeholder ([`apps/desktop/`](apps/desktop/))
- [x] **Mobile App** — React Native/Expo, 14 screens, JWT auth flow ([`apps/mobile/`](apps/mobile/))
  - Auth flow: Login, Register screens + AuthContext ([`apps/mobile/lib/auth-context.tsx`](apps/mobile/lib/auth-context.tsx))
  - Mobile auth API: login, register, refresh, me ([`apps/web/app/api/mobile/auth/`](apps/web/app/api/mobile/auth/))
  - [`apps/web/lib/mobile-auth.ts`](apps/web/lib/mobile-auth.ts) — JWT helper for mobile auth

---

## 🏗️ Architecture Vision: Business Operating System

**Date:** 2026-08-31
**Status:** Accepted (Formalized)
**Reference:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 1-11

> **"Qalcuity — Business Operating System yang dapat dikonfigurasi untuk berbagai jenis industri."**
> Bukan "Qalcuity ERP untuk perusahaan dagang."

### Three Foundation Engines

| Engine | Package | Responsibility | Status |
|--------|---------|---------------|--------|
| **Permission Engine** | `@qalcuity/permissions` | Industry-agnostic granular permissions: `can()` engine, roles, resource definitions | ✅ Implemented & Verified |
| **Workflow Engine** | `@qalcuity/workflow` | Configurable state machine: status transitions, guards, default definitions | ✅ Implemented & Verified |
| **Industry Configuration Engine** | `@qalcuity/industry-config` | Industry packs + custom fields/documents/reports/dashboard config | ✅ Implemented & Verified |

### Key Decisions

1. **Core + Configuration Philosophy** — Core modules bersifat universal, configuration layer memungkinkan customisasi per industri
2. **Industry Packs = Configuration, bukan Hardcoding** — Industry Pack mendefinisikan default configuration, bukan code baru
3. **Decision Tree for AI Agent** — Core Capability → Configuration → Industry Module → Custom Module
4. **Anti-pattern: No Hardcoded Industry Logic** — `if (industry === 'X')` dilarang di core code
5. **Dashboard by Industry + Role + Module + Permission** — Dashboard dikonfigurasi, bukan hardcoded

### Industry Packs Planned

| Industry | Custom Workflows | Custom Fields | Custom Documents |
|----------|-----------------|---------------|-----------------|
| Retail | POS, Stock Replenishment | Barcode, Shelf Location | Stock Opname Report |
| Wholesale/Distribution | Order → Delivery → Invoice | Route, Driver, Vehicle | Delivery Order |
| Manufacturing | Sales Order → WO → QC → Delivery | Production Line, Batch, BOM | Work Order, QC Report |
| Construction | Project → Milestone → Billing | Site, Contract, Progress | Progress Report, BAST |
| Consulting/Agency | Proposal → SOW → Timesheet → Invoice | Project, Billable Hours | SOW, Timesheet |
| Logistics | Order → Pickup → Ship → Deliver | Route, Driver, Vehicle | Delivery Note, POD |
| Education | Registration → Enrollment → Graduation | Student, Class, Semester | Transcript, Certificate |

**Impact:** High — strategic direction for entire platform
**Timeline:** Phase 11 in ROADMAP.md (Industry Configuration Engine)

---

## 🏗️ POS Module: Core Architecture Decision

**Date:** 2026-08-31
**Status:** Accepted (Documented)
**Reference:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 22

> **POS (Point of Sale) adalah Core Module dalam Qalcuity — bukan produk terpisah.** POS terintegrasi langsung ke seluruh ekosistem ERP: Inventory → Finance → Accounting → CRM → Audit.

### POS Key Concepts

- **Core Module:** POS bersifat universal — berlaku untuk SEMUA industri yang membutuhkan transaksi penjualan langsung
- **Industry-Configurable:** POS flow dikonfigurasi per industri (Retail, F&B, Bengkel, Apotek) melalui Industry Configuration Engine
- **ERP Integration:** POS → Inventory (stock deduction) → Finance (payment) → Accounting (journal) → CRM (customer) → Audit (trail)
- **Permission-based:** 3 roles (Cashier, Supervisor, Manager) dengan permission matrix granular
- **Control Engine:** Shift lifecycle (SHIFT_OPEN → TRANSACTIONS → SHIFT_CLOSING → APPROVAL → LOCKED)
- **Offline Mode:** Transaksi offline dengan sync rules ketat (stock cache, conflict resolution, duplicate prevention)
- **Uses Same Engines:** Permission Engine, Workflow Engine, Audit Trail — tidak ada engine baru

### POS Integration Flow

```
POS Sale → Stock berkurang (Inventory) → Payment tercatat (Finance) → Revenue tercatat (Finance)
→ Tax tercatat (Accounting) → Accounting entry (Journal) → Shift cashier (Shift Management)
→ Daily closing (Closing) → Audit trail (Audit)
```

### POS by Industry

| Industry | POS Flow | Special Features |
|----------|----------|-----------------|
| Retail | Barcode → Cart → Payment → Receipt | Multi-item cart, barcode scanning |
| F&B | Order → Kitchen → Preparation → Payment | Kitchen display, table management |
| Bengkel | Customer → Vehicle → Service → Parts → Invoice → Payment | Vehicle database, service history |
| Apotek | Product → Batch → Expiry → Sale → Payment | Batch tracking, expiry management |

**Impact:** High — POS is a major revenue driver for retail/F&B/service industries
**Timeline:** Phase 22 in ROADMAP.md (POS Module Core)

---

## 🏗️ Architecture Decision: Unified Control Engine

**Date:** 2026-08-30
**Status:** Accepted (Design Phase)
**Reference:** [ADR-017](docs/DECISIONS.md#adr-017-unified-control-engine) s/d [ADR-023](docs/DECISIONS.md#adr-023-control-dashboard-tiers)

> **Evolved dari 6 engine terpisah menjadi Unified Control Engine dengan 14 sub-komponen.** Model lama (ADR-015) digantikan oleh model terpadu (ADR-017) yang mengikuti pola enterprise seperti SAP dan Microsoft Dynamics.

Qalcuity Unified Control Engine = **1 engine terpadu** dengan pipeline:

```
Transaction → Policy Engine → Workflow → Approval → Escalation+SLA+Delegation → Notification → Locking → Audit Trail
```

**Key Concepts (Updated):**
- **Unified Pipeline:** Satu alur terpadu, bukan 6 engine terpisah
- **Policy Engine:** Rules bisnis konfigurabel (WHEN condition THEN action) per perusahaan
- **Amount Threshold Approvals:** Tiered approval: <10jt auto, 10-50jt Manager, 50-200jt Director, >200jt Board
- **Segregation of Duties (SoD):** Prevent konflik kepentingan: Create ≠ Receive ≠ Approve ≠ Pay
- **SLA Tracking:** Color-coded compliance (🟢 0-50%, 🟡 50-100%, 🔴 >100%)
- **Delegation:** Manager bisa delegate approval authority saat absent
- **Work Inbox:** Personal dashboard per user (overdue, approvals, assigned, escalated)
- **Exception Center:** Centralized anomaly dashboard (overdue, SLA breach, SoD conflicts, policy violations)
- **Reason Required:** WAJIB isi reason untuk edit/delete/override transaksi submitted
- **Transaction Timeline:** Full history (Who, When, What, Status, Approval chain, Comments)
- **Unlock as Exception:** User Request → Reason → Manager Approval → Temporary Unlock → Edit → Re-submit
- **Emergency Access:** Temporary elevated permission dengan Director approval + auto-revoke
- **Access Review:** Periodic permission review oleh managers (quarterly)
- **Period Closing Wizard:** 7-step closing process (Pre-checks → Exceptions → Resolution → Review → Approval → Lock → Report)
- **Control Dashboard (3 Tiers):** My Dashboard (user) → Management Dashboard (manager) → Control Center (admin/auditor)
- **Transaction lifecycle:** DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → POSTED → COMPLETED → LOCKED
- **Hierarchical locking:** Transaction → Day → Month → Quarter → Year (higher level = all lower locked)
- **Immutable transactions:** No physical delete, use Adjustment entries
- **Lock Policy:** Per-company configurable (monthly closing, yearly closing, edit/delete rules)

**16 Recommendations Documented:** ADR-017 s/d ADR-023 (7 ADR baru)

**Impact:** High — core differentiator for Qalcuity as operational ERP (not just recording system)
**Timeline:** Phase 10 in ROADMAP.md (expanded from 12 items to 35+ items across 6 sub-phases)

---

## 🏗️ Architecture Decision: Permission Engine

**Date:** 2026-08-30
**Status:** Accepted (Design Phase)
**Reference:** [ADR-013](docs/DECISIONS.md#adr-013-permission-engine-architecture) | [ADR-014](docs/DECISIONS.md#adr-014-platform-vs-tenant-architecture)

Qalcuity akan menggunakan **granular permission engine** sebagai fondasi arsitektur, menggantikan 4-role RBAC saat ini:

- **Model:** `User → Membership → Role → Permission → Scope`
- **Engine:** `can(user, action, resource, context) → boolean`
- **Two universes:** Platform (internal) + Tenant (customer)
- **Cross-platform:** Web, Mobile, Desktop, API, AI Agent
- **New app:** `apps/platform-admin` untuk Qalcuity Owner dashboard
- **New packages:** `@qalcuity/auth`, `@qalcuity/permissions`

**Impact:** High — affects all modules, requires schema migration
**Timeline:** Phase 9 in ROADMAP.md (Permission Engine Foundation)

### Key Changes

| Aspect | Current (v1.0) | Target (v2.0) |
|--------|----------------|---------------|
| **Authorization** | 4 hardcoded roles | Granular permission engine |
| **Check method** | `role === "ADMIN"` | `can(user, action, resource, context)` |
| **Scope** | Tenant-level only | Branch + Department level |
| **Platform Admin** | Not separated | Separate `apps/platform-admin` |
| **AI Agent** | No permission checks | Tool-level `can()` before execution |

---

## 🔄 In Progress

- [ ] **Full AI Agent Suite** — Replace mock responses with real database queries per module
- [ ] **Advanced ML Models** — Predictions, anomaly detection, forecasting
- [ ] **Offline Capability** — Service worker, local cache for mobile/desktop
- [ ] **Unified Control Engine** — Policy Engine, configurable approval, SLA, Delegation, SoD (Phase 10)
- [ ] **Documentation Update** — CURRENT.md, FEATURES.md updated for Phase 13 (✅ Done)

---

## 📋 Known Issues

| # | Issue | Severity | Module | Status |
|---|-------|----------|--------|--------|
| 1 | Rate limiter is in-memory (not suitable for multi-instance deployment) | 🟡 Low | API | ⚠️ Pre-existing (hardened with warnings) |
| 2 | TypeScript Decimal type arithmetic errors (pre-existing) | 🟡 Low | Finance/Reports | ⚠️ Pre-existing |
| 3 | Some detail pages missing delete functionality (categories fixed) | 🟡 Low | UI | ⚠️ Partially fixed |
| 5 | ~~No CSP (Content-Security-Policy) headers~~ | 🟠 Medium | Security | ✅ Fixed |
| 6 | ~~No explicit CORS configuration~~ | 🟠 Medium | Security | ✅ Fixed |
| 7 | ~~`@qalcuity/ui` package — tokens only, no React components~~ | 🟠 Medium | Packages | ✅ Fixed — 9 React components added |
| 8 | `@qalcuity/api` package — mentioned but not created | 🟡 Low | Packages | ❌ Not created |
| 9 | ~~Settings pages simulated backend~~ | 🟡 Low | Settings | ✅ Fixed — Notifications & integrations connected to Prisma DB |
| 10 | Password policy — basic min 8 chars, belum configurable rules | 🟡 Low | Auth | ✅ Fixed (min 8 chars enforced) |
| 11 | ~~CRM Import feature — placeholder only~~ | 🟡 Low | CRM | ✅ Fixed — CSV/Excel parser + import API + modal |
| 12 | ~~Analytics code duplication~~ | 🟠 Medium | Analytics | ✅ Fixed |
| 13 | **Analytics — No Materialized Views** | 🟠 Medium | Analytics | 📋 Planned |
| 14 | **Analytics — No Permission Guard** | 🔴 High | Analytics | 📋 Planned (Permission Engine now available) |
| 15 | ~~Hardcoded NEXTAUTH_SECRET fallback~~ | 🔴 High | Security | ✅ Fixed |
| 16 | ~~No CSP `unsafe-eval` removal~~ | 🟠 Medium | Security | ✅ Fixed |
| 17 | ~~Prisma logging uncontrolled~~ | 🟡 Low | Infrastructure | ✅ Fixed |
| 18 | ~~Emoji icons di production~~ | 🟡 Low | UI | ✅ Fixed |
| 19 | `.env` file tracked in git history | 🟠 Medium | Security | ⚠️ Added to .gitignore + .env.production untracked |
| 20 | ConfirmDialog not yet applied to platform pages | 🟡 Low | UI | 📋 Planned — platform pages still use browser confirm |
| 21 | **Prisma generate needed on VPS** | 🟡 Low | Infrastructure | ⚠️ 3 new migrations (tax engine, period closing, approval engine) require `npx prisma generate` on deployment |

---

## 🚫 Blockers

_None currently._

---

## 🏗️ Architecture Status

```
┌─────────────────────────────────────────────────────────┐
│                     PLATFORMS                            │
│  Web (Next.js 14)  │  Desktop (Electron)  │ Mobile (RN) │
│  ✅ Production     │  ⚠️ Placeholder      │ ✅ JWT Auth │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                    API LAYER                             │
│  Next.js Route Handlers (80+ routes, 60+ files)         │
│  + Middleware RBAC + Zod Validation + Audit Logging      │
│  + CSP Headers + CORS Config + Security Hardening       │
│  + Redis Rate Limiter + Entitlement Checks              │
│  + Permission Engine Integration (~90 routes)           │
│  + Workflow Engine Integration (5 entities)             │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│              FOUNDATION ENGINES (Phase 9)                │
│  Permission │ Workflow │ Industry Configuration         │
│  ✅ Integrated│ ✅ Integrated│ ✅ Engine + Custom Fields │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                 BUSINESS LOGIC                           │
│  Finance │ CRM │ HR │ Inventory │ Billing │ Analytics   │
│  ✅ CRUD+GL│✅ CRUD│✅ CRUD│ ✅ CRUD   │ ✅ Entitle│ ✅ Studio│
│  Tax ✅   │ Period ✅│ Approval ✅│              │           │           │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                  DATA LAYER                              │
│  Prisma 5.15 → PostgreSQL (48+ models, 60+ indexes)    │
│  + Redis Cache + Rate Limit Log + Entitlement Models    │
│  + General Ledger + Journal Entry + Workflow History    │
│  + TaxRate + AccountingPeriod + ApprovalLevel/Request   │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Version | Status |
|-------|-----------|---------|--------|
| **Framework** | Next.js (App Router) | 14.x | ✅ Active |
| **Language** | TypeScript | 5.5 | ✅ Strict |
| **Styling** | Tailwind CSS | 3.4 | ✅ Active |
| **Icons** | Lucide React | latest | ✅ Active |
| **ORM** | Prisma | 5.15 | ✅ Active |
| **Database** | PostgreSQL (DBngin) | 18.4 | ✅ Active |
| **Auth** | NextAuth (JWT) | 4.24 | ✅ Active |
| **Validation** | Zod | latest | ✅ Active (14+ schemas) |
| **Monorepo** | pnpm workspaces | latest | ✅ Active |
| **Desktop** | Electron | — | ⚠️ Placeholder |
| **Mobile** | React Native / Expo | — | ✅ JWT Auth Flow |
| **i18n** | Custom provider | — | ✅ Active (433+ keys) |

### Shared Packages

| Package | Status | Notes |
|---------|--------|-------|
| `@qalcuity/db` | ✅ Active | Prisma schema + migrations + seed |
| `@qalcuity/types` | ✅ Active | Shared TypeScript types |
| `@qalcuity/utils` | ✅ Active | Utility functions |
| `@qalcuity/config` | ✅ Active | App constants + env config |
| `@qalcuity/validation` | ✅ Active | Zod schemas |
| `@qalcuity/i18n` | ✅ Active | i18n utilities |
| `@qalcuity/analytics` | ✅ Active | Analytics engine — types, metrics, dimensions, engine, utils ([`packages/analytics/`](packages/analytics/)) |
| `@qalcuity/permissions` | ✅ Active | Permission engine — `can()` check, roles, resource/action defs ([`packages/permissions/`](packages/permissions/)) |
| `@qalcuity/workflow` | ✅ Active | Workflow engine — state machine, transitions, guards, definitions ([`packages/workflow/`](packages/workflow/)) |
| `@qalcuity/industry-config` | ✅ Active | Industry config — packs, custom fields, documents, reports ([`packages/industry-config/`](packages/industry-config/)) |
| `@qalcuity/ui` | ✅ Active | 11 React components: Button, Input, Select, Table, Modal, Card, Badge, Alert, Spinner, ConfirmDialog, ToastProvider ([`packages/ui/`](packages/ui/)) |
| `@qalcuity/api` | ❌ Not created | Mentioned but not yet implemented |

---

## 🏗️ Platform Control Center: Architecture Decision

**Date:** 2026-08-31
**Status:** Accepted (Documented)
**Reference:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 23, [`FEATURES.md`](FEATURES.md) Section 19, [`ROADMAP.md`](ROADMAP.md) Phase 23-25

> **Platform Control Center = "4 Worlds" yang terpisah dari Customer ERP.**
> Superadmin Qalcuity BUKAN "Admin ERP customer" — mereka adalah operator/control plane dari seluruh platform.

### 4 Worlds Separation

| World | Scope | Status |
|-------|-------|--------|
| **Platform World** | Billing, support, monitoring, tenant management | ✅ MVP Implemented |
| **Tenant World** | ERP, POS, CRM, HR, Inventory — per tenant | ✅ Production |
| **Control Engine World** | Workflow, approval, escalation, locking, audit | 🔄 Partial |
| **Public World** | Login, register, landing page, pricing | ✅ Implemented |

### Superadmin Roles (7)

| Role | Scope | Phase |
|------|-------|-------|
| Qalcuity Owner | Platform-wide (highest authority) | Phase 23 |
| Platform Admin | Day-to-day platform operations | Phase 23 |
| Billing Admin | Financial operations | Phase 23 |
| Support Agent | Customer-facing support | Phase 25 |
| Technical Operator | System monitoring | Phase 24 |
| Security Admin | Security operations | Phase 25 |
| Auditor | Compliance & audit (read-only) | Phase 25 |

### Platform Phases

| Phase | Name | Status |
|-------|------|--------|
| **Phase 23** | Platform Control Center Core | ✅ MVP Implemented |
| **Phase 24** | Platform Monitoring & Error Center | ✅ Basic Implemented |
| **Phase 25** | Platform Support & Impersonation | 🔄 Partial (Support UI done) |

### Key Decisions

1. **Platform ≠ Customer** — Separate routes (`/platform/*` vs `/dashboard/*`), sessions, UI, audit tables
2. **Entitlement Engine** — Plan → Entitlement → What tenant can use (no hardcoded `if plan == "professional"`)
3. **Subscription Lifecycle** — ACTIVE → PAST_DUE → GRACE_PERIOD → SUSPENDED → ARCHIVED
4. **Error Grouping** — Same error × N = 1 group, tenant-isolated, severity-based
5. **Impersonation** — Request → Reason → Approval → Temporary Session → Audit Log (max 30 min)

**Impact:** High — defines the entire platform operations layer
**Timeline:** Phase 23-25 in ROADMAP.md (Platform Control Center)
**Architecture:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 23 (23.1-23.14)
**Features:** [`FEATURES.md`](FEATURES.md) Section 19 (65+ planned features)

---

## 📊 Metrics

### Codebase Stats (Updated: 1 September 2026 — Improvement Sprint Complete)

| Metric | Count |
|--------|-------|
| TypeScript files (apps/web) | ~140+ |
| TypeScript files (packages) | ~45+ |
| API route files | 60+ |
| API routes | 80+ |
| Pages | 40+ |
| Prisma models | 48+ |
| Database indexes | 60+ |
| Zod schemas | 18+ |
| i18n keys | 433+ |
| Loading states | 30+ |
| E2E tests | 63 (63 PASS) |
| Shared packages | 12 (11 active, 1 not created) |
| Foundation Engines | 3 (Permission, Workflow, Industry Config) |
| UI Components | 11 (Button, Input, Select, Table, Modal, Card, Badge, Alert, Spinner, ConfirmDialog, ToastProvider) |
| Mobile screens | 14 (12 + Login + Register) |
| Permission-integrated routes | ~90 |
| Workflow-integrated entities | 5 (Invoice, Payment, PO, Quotation, Leaves) |
| Prisma Migrations (FASE 3C-4C) | 3 (Tax Engine, Period Closing, Approval Engine) |

### Test Results

| Test Category | Result |
|---------------|--------|
| CRM CRUD | ✅ PASS |
| Finance CRUD | ✅ PASS |
| HR CRUD | ✅ PASS |
| Inventory CRUD | ✅ PASS |
| Billing | ✅ PASS |
| Dashboard | ✅ PASS |
| Reports | ✅ PASS |
| RBAC | ✅ PASS |
| Performance (N+1 detection) | ✅ PASS |
| Tenant Isolation | ⏭️ SKIP (perlu 2+ tenants) |

### Performance Audit

- Reports route: Fixed 9 sequential queries → `Promise.all()` parallel execution (~60-70% faster)
- All other routes: Already use proper `include`/`select` patterns (no N+1 issues)
- 7 performance indexes added via Prisma migration

---

## 📅 Recent Changes

### 1 September 2026 — Improvement Sprint (Batch 7A-7E)

**Batch 7A — Permission Engine Integration:**
- ✅ **~90 API Routes** — Integrated `can()` permission checks across all API routes via [`apps/web/lib/route-permissions.ts`](apps/web/lib/route-permissions.ts)
- ✅ **Permission Constants** — Centralized action/resource definitions ([`apps/web/lib/permissions.ts`](apps/web/lib/permissions.ts))
- ✅ **TypeScript Fix** — `rate-limit-monitor.ts` typo fix (`viation` → `violation`)

**Batch 7B — Workflow Engine Integration:**
- ✅ **5 Entities** — Invoice, Payment, Purchase Order, Quotation, Leaves integrated with Workflow Engine
- ✅ **Workflow Transitions** — Status transitions validated via `@qalcuity/workflow` engine
- ✅ **Workflow History** — All transitions logged to `WorkflowHistory` model

**Batch 7C — General Ledger & Journal Entry:**
- ✅ **Journal Entry API** — CRUD with double-entry validation (debit = credit) ([`apps/web/app/api/finance/journal-entries/`](apps/web/app/api/finance/journal-entries/))
- ✅ **Journal Entry UI** — Create/view journal entries ([`apps/web/app/dashboard/finance/journal-entries/`](apps/web/app/dashboard/finance/journal-entries/))
- ✅ **Zod Schema** — `createJournalEntrySchema` with double-entry validation
- ✅ **Prisma Migration** — `GeneralLedger`, `JournalEntry`, `JournalEntryItem` models

**Batch 7D — Redis Rate Limiter:**
- ✅ **Redis Client** — Connection manager with in-memory fallback ([`apps/web/lib/redis.ts`](apps/web/lib/redis.ts))
- ✅ **Rate Limit Config** — Per-endpoint rate limits ([`apps/web/lib/rate-limit-config.ts`](apps/web/lib/rate-limit-config.ts))
- ✅ **Rate Limit Wrapper** — `withRateLimit()` HOF for API routes ([`apps/web/lib/with-rate-limit.ts`](apps/web/lib/with-rate-limit.ts))
- ✅ **Rate Limit Monitor** — Violation logging, suspicious pattern detection ([`apps/web/lib/rate-limit-monitor.ts`](apps/web/lib/rate-limit-monitor.ts))
- ✅ **Prisma Migration** — `RateLimitLog` model

**Batch 7E — Entitlement Engine:**
- ✅ **Entitlement Engine** — Plan-based module access control ([`apps/web/lib/entitlement.ts`](apps/web/lib/entitlement.ts))
- ✅ **Entitlements Config** — Starter/Growth/Business plan definitions ([`apps/web/lib/entitlements-config.ts`](apps/web/lib/entitlements-config.ts))
- ✅ **Entitlement API** — `/api/billing/entitlement`, `/api/billing/feature-check`, `/api/billing/usage`
- ✅ **Prisma Migration** — `Entitlement`, `EntitlementUsage` models

**Bug Fixes:**
- ✅ Fix `rate-limit-monitor.ts` typo (`viation` → `violation`)
- ✅ Fix `validation-schemas.ts` Zod API mismatch (`errorMap` → `error`)

### 2 September 2026 — Feature Sprint (FASE 3C-4C)

**FASE 3C — Sidebar Navigation:**
- ✅ **11 New Pages** — Added navigation entries for Tax Rates, Periods, Approval, and other sub-pages across Finance, HR, Inventory, and Settings modules

**FASE 4A — Tax Engine MVP:**
- ✅ **TaxRate Model** — Prisma model with tenantId, name, code, rate, type, isActive, isDefault ([`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma))
- ✅ **Tax Rate CRUD API** — GET/POST at `/api/finance/tax-rates`, GET/PUT/DELETE at `/api/finance/tax-rates/[id]` ([`apps/web/app/api/finance/tax-rates/route.ts`](apps/web/app/api/finance/tax-rates/route.ts))
- ✅ **Tax Rate UI** — List page + loading state ([`apps/web/app/dashboard/finance/tax-rates/page.tsx`](apps/web/app/dashboard/finance/tax-rates/page.tsx))
- ✅ **Invoice Integration** — Tax rate selection in invoice form ([`apps/web/components/finance/invoice-form.tsx`](apps/web/components/finance/invoice-form.tsx))
- ✅ **Zod Validation** — `createTaxRateSchema`, `updateTaxRateSchema` ([`apps/web/lib/validation-schemas.ts`](apps/web/lib/validation-schemas.ts))
- ✅ **Prisma Migration** — `20260902171400_add_tax_engine`

**FASE 4B — Period Closing Wizard:**
- ✅ **AccountingPeriod Model** — Prisma model with name, startDate, endDate, status (OPEN/CLOSING/CLOSED) ([`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma))
- ✅ **Period Closing Service** — 4-step wizard logic ([`apps/web/lib/period-closing.ts`](apps/web/lib/period-closing.ts))
- ✅ **Period API** — CRUD at `/api/finance/periods`, close at `/api/finance/periods/[id]/close` ([`apps/web/app/api/finance/periods/route.ts`](apps/web/app/api/finance/periods/route.ts))
- ✅ **Period UI** — List page + loading state ([`apps/web/app/dashboard/finance/periods/page.tsx`](apps/web/app/dashboard/finance/periods/page.tsx))
- ✅ **Prisma Migration** — `20260902173400_add_period_closing`

**FASE 4C — Multi-level Approval Engine:**
- ✅ **ApprovalLevel Model** — entityType, level, name, requiredRole ([`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma))
- ✅ **ApprovalRequest Model** — entityType, entityId, currentLevel, status ([`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma))
- ✅ **Approval API** — CRUD at `/api/approval/requests`, approve/reject endpoints ([`apps/web/app/api/approval/`](apps/web/app/api/approval/))
- ✅ **Prisma Migration** — `20260902200400_add_approval_engine`

### 1 September 2026 — UI Modernization Sprint (Batch 1-5)

**Batch 1 — UI Polish & Error Handling:**
- ✅ **ConfirmDialog Component** — 24 `window.confirm` replaced dengan centralized ConfirmDialog component ([`apps/web/components/ui/confirm-dialog.tsx`](apps/web/components/ui/confirm-dialog.tsx))
- ✅ **Inline Error Banners** — 4 `alert()` replaced dengan inline error banners
- ✅ **Emoji → Lucide** — Semua emoji icons diganti ke Lucide React
- ✅ **SVG → Lucide** — 14 SVG icons diganti ke Lucide React icons

**Batch 2 — Dark Mode & i18n:**
- ✅ **Dark Mode** — 8 components ditambahkan dark mode support (class-based, Tailwind `darkMode: "class"`)
- ✅ **i18n Expansion** — 33 i18n keys baru ditambahkan (total: 433+)
- ✅ **Navigation Fixes** — Sidebar navigation improvements

**Batch 3 — Reports Mobile Cards:**
- ✅ **Reports Mobile Cards** — 12 sub-components untuk Reports page mobile card layout

**Batch 4 — Toast System & Loading:**
- ✅ **Toast System** — Centralized toast provider ([`apps/web/components/ui/toast.tsx`](apps/web/components/ui/toast.tsx) + `ToastProvider`)
- ✅ **Loading States** — 3 loading.tsx baru (total: 28)
- ✅ **Payments Fix** — Bug fix di payments page

**Batch 5 — Security & Config:**
- ✅ **`.gitignore`** — 6 patterns baru ditambahkan (`.env.production`, `dev.db`, etc.)
- ✅ **`.env.production` untracked** — Removed dari git tracking
- ✅ **`dev.db` untracked** — Removed dari git tracking
- ✅ **`.env.example` updated** — Updated dengan semua environment variables
- ✅ **TypeScript Check** — `npx tsc --noEmit` PASS (0 errors)
- ✅ **Documentation Update** — CURRENT.md, FEATURES.md, ROADMAP.md, AGENT.md updated

### 1 September 2026 — Phase 13: UI Completeness Fixes
- ✅ **13a:** Finance detail page buttons — all functional (invoice, payment, PO, quotation actions)
- ✅ **13b:** CRM detail page buttons — all functional (contact, lead, deal actions)
- ✅ **13c:** HR detail page buttons — all functional (employee, attendance, leave, payroll actions)
- ✅ **13d:** Inventory detail page buttons — all functional (product, supplier, category, stock actions)
- ✅ **13e:** HR attendance stats — real API data replacing hardcoded values
- ✅ **13f:** Settings notifications SMTP — real Nodemailer API integration ([`apps/web/app/api/settings/smtp/route.ts`](apps/web/app/api/settings/smtp/route.ts))
- ✅ **13g:** Settings profile buttons — export (CSV), upload photo (base64), delete account functional
- ✅ **13h:** Analytics dashboards — create modal functional with form validation
- ✅ **13i:** Responsive design — mobile card views added for billing & settings/billing pages
- ✅ **13j:** i18n — Audit & AI pages fully localized with `useTranslation()` (400+ keys total)
- ✅ **13k:** TypeScript verification — `npx tsc --noEmit` PASS (0 errors)
- ✅ **13l:** Documentation update — CURRENT.md, FEATURES.md updated

### 1 September 2026 — Phase 9: Foundation Engines Complete
- ✅ **Permission Engine** — `@qalcuity/permissions` package: types, permissions, roles, engine (`can()` function), index ([`packages/permissions/`](packages/permissions/))
  - 7 files: types.ts, permissions.ts, roles.ts, engine.ts, index.ts, package.json, tsconfig.json
- ✅ **Workflow Engine** — `@qalcuity/workflow` package: types, definitions, engine (state machine), index ([`packages/workflow/`](packages/workflow/))
  - 6 files: types.ts, definitions.ts, engine.ts, index.ts, package.json, tsconfig.json
- ✅ **Industry Configuration Engine** — `@qalcuity/industry-config` package: types, defaults (9 industries), engine, index ([`packages/industry-config/`](packages/industry-config/))
  - 6 files: types.ts, defaults.ts, engine.ts, index.ts, package.json, tsconfig.json
- ✅ **Roles API** — CRUD roles di `/api/settings/roles` + `/api/settings/roles/[id]` dengan tenant isolation
- ✅ **Workflow API** — Definition CRUD + transition + history di `/api/workflow/definitions`, `/api/workflow/transition`, `/api/workflow/history`
- ✅ **Industry Config API** — Settings + defaults + fields di `/api/settings/industry/`, `/api/settings/custom-fields/`
- ✅ **Helper Libraries** — [`apps/web/lib/permissions.ts`](apps/web/lib/permissions.ts), [`apps/web/lib/workflow.ts`](apps/web/lib/workflow.ts), [`apps/web/lib/industry-config.ts`](apps/web/lib/industry-config.ts)
- ✅ **Prisma Schema Extensions** — 5 models baru: Role, WorkflowDefinition, WorkflowHistory, IndustryConfiguration, TenantCustomField
- ✅ **@qalcuity/ui Components** — 9 React components: Button, Input, Select, Table, Modal, Card, Badge, Alert, Spinner ([`packages/ui/`](packages/ui/))
- ✅ **CRM Import** — CSV/Excel parser + import API + import modal ([`apps/web/lib/csv-parser.ts`](apps/web/lib/csv-parser.ts), [`apps/web/lib/excel-parser.ts`](apps/web/lib/excel-parser.ts))
- ✅ **Settings Real Backend** — Notifications & integrations API connected to Prisma DB
- ✅ **Mobile Auth Flow** — JWT-based auth: login, register, refresh, me endpoints + AuthContext + Login/Register screens
- ✅ **TypeScript Check** — `npx tsc --noEmit` PASS (0 errors)
- ✅ **Documentation Update** — CURRENT.md, FEATURES.md, AGENT.md updated to v5.0

### 31 Agustus 2026 — Analytics Studio Implementation Sprint
- ✅ **Security: CSP Headers** — Content-Security-Policy headers implemented di [`apps/web/middleware.ts`](apps/web/middleware.ts) dengan directive yang ketat
- ✅ **Security: CORS Configuration** — Explicit CORS config di [`apps/web/next.config.js`](apps/web/next.config.js) dengan allowed origins
- ✅ **Security: NEXTAUTH_SECRET Mandatory** — Hardcoded fallback dihapus, throw error di semua environment jika env var tidak ada
- ✅ **Security: Rate Limiter Hardened** — Security warnings untuk in-memory mode di production
- ✅ **Analytics Code Refactor** — Dataset definitions di-refactor, import dari `@qalcuity/analytics` package:
  - [`apps/web/app/api/analytics/explorer/route.ts`](apps/web/app/api/analytics/explorer/route.ts) — explorer route
  - [`apps/web/app/api/analytics/metrics/route.ts`](apps/web/app/api/analytics/metrics/route.ts) — metrics route
  - [`apps/web/app/api/analytics/kpi/[id]/evaluate/route.ts`](apps/web/app/api/analytics/kpi/[id]/evaluate/route.ts) — KPI evaluate route
- ✅ **Prisma Schema Extensions** — 8 model baru untuk Analytics Studio:
  - `AnalyticsDataset` — Saved queries sebagai dataset
  - `AnalyticsQueryHistory` — Riwayat query analyst
  - `AnalyticsChart` — Konfigurasi chart
  - `AnalyticsDashboard` — Dashboard builder
  - `AnalyticsDashboardWidget` — Widget dalam dashboard
  - `DataDictionaryEntry` — Metadata browser
  - `ScheduledQuery` — Scheduled queries
  - `MetricDefinition` — Custom metrics
- ✅ **New API Routes (8)** — Analytics workspace API routes:
  - [`/api/analytics/charts`](apps/web/app/api/analytics/charts/route.ts) — GET, POST
  - [`/api/analytics/charts/[id]`](apps/web/app/api/analytics/charts/[id]/route.ts) — GET, PUT, DELETE
  - [`/api/analytics/dashboards`](apps/web/app/api/analytics/dashboards/route.ts) — GET, POST
  - [`/api/analytics/dashboards/[id]`](apps/web/app/api/analytics/dashboards/[id]/route.ts) — GET, PUT, DELETE
  - [`/api/analytics/dashboards/[id]/widgets`](apps/web/app/api/analytics/dashboards/[id]/widgets/route.ts) — GET, POST
  - [`/api/analytics/query-history`](apps/web/app/api/analytics/query-history/route.ts) — GET, POST
  - [`/api/analytics/dictionary`](apps/web/app/api/analytics/dictionary/route.ts) — GET, POST
  - [`/api/analytics/scheduled`](apps/web/app/api/analytics/scheduled/route.ts) — GET, POST
- ✅ **Analytics Workspace UI (5 pages)** — New workspace pages:
  - [`apps/web/app/dashboard/analytics/charts/page.tsx`](apps/web/app/dashboard/analytics/charts/page.tsx) — Charts management
  - [`apps/web/app/dashboard/analytics/dashboards/page.tsx`](apps/web/app/dashboard/analytics/dashboards/page.tsx) — Dashboard management
  - [`apps/web/app/dashboard/analytics/dictionary/page.tsx`](apps/web/app/dashboard/analytics/dictionary/page.tsx) — Data dictionary
  - [`apps/web/app/dashboard/analytics/history/page.tsx`](apps/web/app/dashboard/analytics/history/page.tsx) — Query history
  - [`apps/web/app/dashboard/analytics/scheduled/page.tsx`](apps/web/app/dashboard/analytics/scheduled/page.tsx) — Scheduled queries
- ✅ **Analytics Loading States (5)** — Loading skeletons untuk semua workspace pages
- ✅ **Analytics Layout Updated** — [`apps/web/app/dashboard/analytics/layout.tsx`](apps/web/app/dashboard/analytics/layout.tsx) — 10 tabs navigation

### 31 Agustus 2026 — Analytics Studio Architecture Documentation
- ✅ **`docs/ANALYTICS-STUDIO.md`** — Arsitektur lengkap Analytics Studio didokumentasikan (6 sections: Overview, Core Architecture, Data Layer, Analytics Pipeline, UI/UX Design, Implementation Roadmap)
- ✅ **FEATURES.md v4.4** — Section 8 (Analytics & Decision Intelligence) di-update dengan semua fitur Analytics Studio
- ✅ **`@qalcuity/analytics` package** — 6 files verified: types, metrics, dimensions, engine, utils, index
- ✅ **Analytics API Routes** — 13 route files verified: dashboard, explorer, kpi, kpi/[id], alerts, alerts/[id], reports, reports/[id], reports/[id]/execute, metrics, insights, anomaly, forecast
- ✅ **Prisma Models** — 5 models verified: KPI, KPIEvaluation, AlertRule, AlertTrigger, SavedReport
- ✅ **CURRENT.md** — Status terkini Analytics Studio di-update

### 31 Agustus 2026 — UI/UX Audit & Fixes
- ✅ **Security P0 Fix** — Password URL exposure removed dari login page
- ✅ **Functional P0 Fix** — "Adjust Stok" button sekarang functional dengan modal form
- ✅ **Functional P1 Fix** — Edit buttons di Employee Detail dan Product Detail pages
- ✅ **Export Fix** — Reconciliation CSV export functionality
- ✅ **Auth Fix** — Remember Me checkbox wired ke signIn function
- ✅ **Type Fix** — UserRole type mismatch di packages/types disesuaikan
- ✅ **Security Fix** — NEXTAUTH_SECRET throw di production (bukan hardcoded fallback)
- ✅ **Build Fix** — ignoreBuildErrors disabled di next.config.js
- ✅ **Validation Fix** — Client-side Zod validation di finance forms
- ✅ **Audit Fix** — Audit logging di attendance [id] routes
- ✅ **i18n Fix** — Hardcoded Indonesian text diganti i18n keys (header, error pages, error boundary)
- ✅ **Link Fix** — Dead links: forgot-password disabled, Google register functional
- ✅ **Functional Fix** — Non-functional secondary buttons (print, stock history, order history)
- ✅ **TypeScript Check** — `npx tsc --noEmit` PASS (0 errors)

### 31 Agustus 2026 — Final Review & Security Hardening (30 Issues Fixed)
- ✅ **Security Hardening Complete** — 30 issues fixed across 4 phases (P0 Critical → P3 Low):
  - **Phase 1 (P0 Critical — 7 issues):** NEXTAUTH_SECRET mandatory, CSP headers, CORS config, rate limiting, input sanitization
  - **Phase 2 (P1 High — 14 issues):** RBAC defense-in-depth, Zod validation, audit logging, email fallback, session management
  - **Phase 3 (P2 Medium — 9 issues):** Prisma logging toggle, export XSS protection, Emoji→Lucide icons, error states, loading states
  - **Phase 4 (P3 Low — 4 issues):** `unsafe-eval` removal, i18n hardcoded text, secondary button fixes, dead link cleanup
- ✅ **Final Review Verified** — 32+ files reviewed across all modules:
  - **Authentication:** All 19 API route files use `requireAuth()` / `requireMutateAuth()` / `requireAdminAuth()` (237 auth checks)
  - **Tenant Isolation:** All queries filter by `tenantId` (300+ occurrences)
  - **Audit Logging:** All mutation endpoints call `logAudit()` (132 occurrences)
  - **Zod Validation:** 14+ schemas imported and used in route handlers
  - **Rate Limiting:** Applied to all routes with appropriate limits (5-100 req/min)
  - **Security Headers:** CSP (no `unsafe-eval`), CORS (explicit origin), HSTS, X-Frame-Options, Permissions-Policy
  - **Input Sanitization:** `sanitizeInput()` + `escapeHtml()` + `escapeCSVValue()` across all user inputs
- ✅ **TypeScript Compilation** — `npx tsc --noEmit` di `apps/web` PASS (0 errors)
- ✅ **Export XSS Protection** — [`apps/web/lib/export.ts`](apps/web/lib/export.ts) added `escapeHtml()` dan `escapeCSVValue()` untuk mencegah XSS di CSV/Excel export
- ✅ **Email SMTP Fallback** — [`apps/web/lib/email.ts`](apps/web/lib/email.ts) graceful fallback ke `console.log` jika SMTP tidak dikonfigurasi
- ✅ **Environment Validation** — [`apps/web/lib/env-validation.ts`](apps/web/lib/env-validation.ts) required vars: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `DATABASE_URL`
- ✅ **Prisma Logging Control** — [`apps/web/lib/db.ts`](apps/web/lib/db.ts) toggle via `ENABLE_PRISMA_LOGGING` env var
- ✅ **Build Safety** — [`apps/web/next.config.js`](apps/web/next.config.js) `ignoreBuildErrors: false`, `poweredByHeader: false`

### 1 September 2026 — Phase 14: Button Fix + Platform Control Center MVP

**Button Fixes (12 buttons across 8 files):**
- ✅ **Phase 14a** — Settings Security 2FA button: enable/disable modals functional
- ✅ **Phase 14b** — HR Attendance Detail buttons: edit/delete/mark-absent functional
- ✅ **Phase 14c** — Finance Reconciliation Detail + Browse buttons functional
- ✅ **Phase 14d** — Finance Payments Create button: record payment modal functional
- ✅ **Phase 14e** — Analytics Scheduled Create + Reports Edit/Share buttons functional
- ✅ **Phase 14f** — Inventory Categories menu + Import buttons functional

**Platform Control Center MVP:**
- ✅ **Phase 14g** — Platform Layout: purple-themed sidebar, header, route group (`/platform/*`)
- ✅ **Phase 14h** — Platform Dashboard: stats cards, activity feed, quick actions, system metrics
- ✅ **Phase 14i** — Platform Tenants: list with search/filter/sort + detail page
- ✅ **Phase 14j** — Platform Billing: MRR/ARR stats, plan distribution, payment history
- ✅ **Phase 14k** — Platform Monitoring + Support + Security: health dashboard, ticket management, security events
- ✅ **Phase 14l** — Platform API Routes: stats, tenants CRUD, tenant detail/suspend/reactivate + Settings page
- ✅ **Phase 14m** — TypeScript check PASS (0 errors) + Documentation updated

**Files Created:** 14 new files (7 pages + 3 layout components + 3 API routes + 1 middleware update)
**Files Modified:** 2 (middleware.ts, payments/page.tsx JSX fix)

### 31 Agustus 2026 — Platform Control Center Architecture
- ✅ **ARCHITECTURE.md Section 23** — Platform Architecture formalized: 4 Worlds, 7 Superadmin Roles, Subscription Lifecycle, Entitlement, Payment Review, Error Center, Tenant Health, Impersonation, Support, Feature Flags, Usage Metering, Security Center
- ✅ **ROADMAP Phase 23-25** — Platform Control Center Core (23A-23F), Monitoring & Error Center (24A-24D), Support & Impersonation (25A-25E)
- ✅ **FEATURES Section 19** — 65+ planned platform features across 9 subsections
- ✅ **4 Worlds Separation** — Platform (billing/support/monitoring), Tenant (ERP/POS/CRM/HR), Control Engine (workflow/approval/escalation/locking/audit), Public (login/register/landing)

### 30 Agustus 2026 — Code Quality & Dynamic Data Sprint
- ✅ **Security Fix** — Hardcoded NEXTAUTH_SECRET fallback dihapus, sekarang mandatory env var
- ✅ **Dynamic Overview Pages** — 5 halaman di-rewrite dari hardcoded ke dynamic API:
  - Finance Overview → fetch dari `/api/finance/invoices` + `/api/finance/payments`
  - HR Overview → fetch dari `/api/hr/employees` + `/api/hr/leaves` + `/api/hr/attendance`
  - Inventory Overview → fetch dari `/api/inventory/products` + `/api/inventory/suppliers` + `/api/inventory/categories`
  - CRM Overview → fetch dari `/api/crm/leads` + `/api/crm/deals` + `/api/crm/contacts`
  - Main Dashboard → dynamic revenue chart + AI insights dari real data
- ✅ **Categories DELETE** — DELETE handler ditambahkan ke `/api/inventory/categories`, page di-connect ke API
- ✅ **New API Route** — `/api/settings/integrations` untuk dynamic connection status
- ✅ **Integrations Page** — Hardcoded connection status diganti dynamic fetch dari API
- ✅ **Emoji Cleanup** — Emoji diganti Lucide icons di dashboard stats API, audit page, landing page
- ✅ **Alert → Toast** — 11 instances `alert()` diganti toast notification (reconciliation 6, billing 5)
- ✅ **Toast Icons** — ✓/✕ characters diganti Lucide Check/X icons di 14 files
- ✅ **Loading States** — 3 loading.tsx baru (billing, crm root, finance root) → total 15
- ✅ **Error Boundaries** — 3 error.tsx baru (audit, billing, reports)
- ✅ **Env Configuration** — .env.example lengkap, .env local, .env.production template
- ✅ **Code Cleanup** — console.log dihapus dari company/page.tsx

### 30 Agustus 2026 — Unified Control Engine Documentation
- ✅ **ADR-017 s/d ADR-023** — 7 new architectural decisions documented ([`docs/DECISIONS.md`](docs/DECISIONS.md))
- ✅ **Unified Control Engine** — Evolved from 6 engines to 14 sub-components ([`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md))
- ✅ **Phase 10 Expanded** — 12 items → 35+ items across 6 sub-phases ([`ROADMAP.md`](ROADMAP.md))
- ✅ **30+ New Features** — Section 12 expanded from 7 to 17 subsections ([`FEATURES.md`](FEATURES.md))
- ✅ **16 Recommendations** — All documented with ADR references and architecture diagrams

### 30 Agustus 2026 — Phase 3B: Dynamic Overview Pages (CRM + Dashboard)
- ✅ **CRM Overview** — Rewrite dari hardcoded ke dynamic data dari `/api/crm/leads` + `/api/crm/deals` + `/api/crm/contacts` ([`apps/web/app/dashboard/crm/page.tsx`](apps/web/app/dashboard/crm/page.tsx))
  - Summary cards: Total Leads, Active Deals, Revenue (won deals), Win Rate — semua dari data real
  - Top 5 Deals: sort by value desc, active stages only
  - Recent Activities: gabungan leads + deals terbaru berdasarkan tanggal
  - Pipeline Summary: grouping deals by stage (DISCOVERY/PROPOSAL/NEGOTIATION/CLOSING)
  - Loading skeleton, error state, empty state
- ✅ **Main Dashboard** — Rewrite revenue chart + AI insights ke dynamic data ([`apps/web/app/dashboard/page.tsx`](apps/web/app/dashboard/page.tsx))
  - Revenue chart: data dari `/api/finance/payments` (group by month, last 6 months)
  - AI Insights: Revenue change (this month vs last month), Overdue invoices (dari `/api/finance/invoices`), Low stock products (dari `/api/inventory/products`)
  - Pertahankan stats cards + alerts + recent activities dari `/api/dashboard/stats`

### 30 Agustus 2026 — E2E Testing & Performance Audit
- ✅ **E2E Test Suite** — 63 tests covering all modules ([`apps/web/__tests__/e2e-test.ts`](apps/web/__tests__/e2e-test.ts))
- ✅ **Performance Audit** — Fixed N+1 queries in reports route
- ✅ **Database Indexes** — 7 performance indexes added (total: 57)
- ✅ **Documentation Update** — AGENT.md v3.0 + CURRENT.md refresh

### 29 Agustus 2026 — Known Issues Resolution
- ✅ **Billing endpoints** — Prisma migration + client generate + bug fix
- ✅ **CoA & Reconciliation** — migrasi dari in-memory ke Prisma DB
- ✅ **SMTP** — install nodemailer + real SMTP transport
- ✅ **AI Chat** — abstraction layer + OpenAI provider + Mock fallback

### 28-29 Agustus 2026 — Security & Validation
- ✅ **Zod Validation** — 14+ schemas diterapkan ke 19 API route files
- ✅ **Audit Logging** — 77 panggilan `logAudit()` ke 10 API mutation endpoints
- ✅ **RBAC Defense-in-depth** — 3 lapisan: middleware + API route + UI
- ✅ **Responsive Tables** — Dual layout di 17 halaman
- ✅ **i18n** — 20+ halaman di-i18n, 200+ i18n keys
- ✅ **Settings Pages** — 6 settings pages lengkap dengan i18n

### 31 Agustus 2026 — CRM Create Buttons + 404 Pages Fix
- ✅ **CRM Leads Create Modal** — Tombol "+ Lead Baru" sekarang membuka modal form dengan validasi ([`apps/web/app/dashboard/crm/leads/page.tsx`](apps/web/app/dashboard/crm/leads/page.tsx))
  - Fields: nama, email, telepon, perusahaan, sumber, status, nilai, catatan
  - Submit ke POST `/api/crm/leads` dengan Zod validation + sanitize
  - Toast notification success/error + refresh list
- ✅ **CRM Contacts Create Modal** — Tombol "+ Kontak Baru" sekarang membuka modal form ([`apps/web/app/dashboard/crm/contacts/page.tsx`](apps/web/app/dashboard/crm/contacts/page.tsx))
  - Fields: nama, email, telepon, tipe (Pelanggan/Pemasok/Mitra/Prospek), alamat, kota, provinsi, kode pos, NPWP, catatan
  - Submit ke POST `/api/crm/contacts`
- ✅ **CRM Deals Create Modal** — Tombol "+ Deal Baru" sekarang membuka modal form ([`apps/web/app/dashboard/crm/deals/page.tsx`](apps/web/app/dashboard/crm/deals/page.tsx))
  - Fields: judul, nilai, stage (6 options), tanggal target closing, contact ID, catatan
  - Auto-set probability berdasarkan stage
  - Submit ke POST `/api/crm/deals`
- ✅ **CRM Import Buttons** — Import buttons di Leads & Contacts sekarang membuka modal placeholder dengan UI upload file
- ✅ **Forgot Password Page** — Buat halaman `/forgot-password` dengan form email reset ([`apps/web/app/(auth)/forgot-password/page.tsx`](apps/web/app/(auth)/forgot-password/page.tsx))
- ✅ **Terms & Conditions Page** — Buat halaman `/terms` dengan konten profesional ([`apps/web/app/terms/page.tsx`](apps/web/app/terms/page.tsx))
- ✅ **Privacy Policy Page** — Buat halaman `/privacy` dengan konten UU PDP compliant ([`apps/web/app/privacy/page.tsx`](apps/web/app/privacy/page.tsx))

### Bug Fixes
- ✅ Fix CRM Create buttons non-functional — semua tombol (+ Lead Baru, + Kontak Baru, + Deal Baru) sekarang membuka modal form
- ✅ Fix 404 errors di production — `/forgot-password`, `/terms`, `/privacy` sekarang memiliki halaman
- ✅ Fix Pipeline stage name mismatch — tambah CLOSED_WON dan CLOSED_LOST stages
- ✅ Fix billing path in sidebar — redirect ke `/dashboard/settings/billing`
- ✅ Fix sidebar navigation — reorder menu sesuai spesifikasi, hapus broken links
- ✅ Fix sidebar scrolling di desktop — ubah ke flex-based layout (`lg:static` sidebar + `overflow-y-auto` content area)

---

## 📊 Analytics Studio — Current Status

> **Analytics Studio Phase 1 MVP selesai + Workspace UI diimplementasi + arsitektur didokumentasikan.** Berikut adalah status terkini dan rencana pengembangan.

### ✅ DONE — Phase 1 MVP (Agustus 2026)

| Fitur | Status | Lokasi |
|-------|--------|--------|
| Analytics Overview Dashboard | ✅ Selesai | [`apps/web/app/dashboard/analytics/page.tsx`](apps/web/app/dashboard/analytics/page.tsx) |
| Data Explorer | ✅ Selesai | [`apps/web/app/dashboard/analytics/explorer/page.tsx`](apps/web/app/dashboard/analytics/explorer/page.tsx) |
| KPI Management | ✅ Selesai | [`apps/web/app/dashboard/analytics/kpi/page.tsx`](apps/web/app/dashboard/analytics/kpi/page.tsx) |
| Saved Reports | ✅ Selesai | [`apps/web/app/dashboard/analytics/reports/page.tsx`](apps/web/app/dashboard/analytics/reports/page.tsx) |
| Data Alerts | ✅ Selesai | [`apps/web/app/dashboard/analytics/alerts/page.tsx`](apps/web/app/dashboard/analytics/alerts/page.tsx) |
| Charts Management | ✅ Selesai | [`apps/web/app/dashboard/analytics/charts/page.tsx`](apps/web/app/dashboard/analytics/charts/page.tsx) |
| Dashboards Management | ✅ Selesai | [`apps/web/app/dashboard/analytics/dashboards/page.tsx`](apps/web/app/dashboard/analytics/dashboards/page.tsx) |
| Data Dictionary | ✅ Selesai | [`apps/web/app/dashboard/analytics/dictionary/page.tsx`](apps/web/app/dashboard/analytics/dictionary/page.tsx) |
| Query History | ✅ Selesai | [`apps/web/app/dashboard/analytics/history/page.tsx`](apps/web/app/dashboard/analytics/history/page.tsx) |
| Scheduled Queries | ✅ Selesai | [`apps/web/app/dashboard/analytics/scheduled/page.tsx`](apps/web/app/dashboard/analytics/scheduled/page.tsx) |
| Analytics API (15 routes) | ✅ Selesai | [`apps/web/app/api/analytics/`](apps/web/app/api/analytics/) |
| `@qalcuity/analytics` package (6 files) | ✅ Selesai | [`packages/analytics/`](packages/analytics/) — types, metrics, dimensions, engine, utils, index |
| Analytics i18n (200+ keys) | ✅ Selesai | ID + EN |
| Analytics Studio Architecture | ✅ Selesai | [`docs/ANALYTICS-STUDIO.md`](docs/ANALYTICS-STUDIO.md) — arsitektur lengkap (6 sections) |
| FEATURES.md Section 8 (Analytics) | ✅ Updated | v4.5 — semua fitur Analytics Studio didokumentasikan |

### 📦 Infrastructure Status

| Komponen | Status | Detail |
|----------|--------|--------|
| **`@qalcuity/analytics` package** | ✅ 6 files | `types.ts`, `metrics.ts`, `dimensions.ts`, `engine.ts`, `utils.ts`, `index.ts` |
| **API Routes Analytics** | ✅ 21 files | dashboard, explorer, kpi, kpi/[id], kpi/[id]/evaluate, alerts, alerts/[id], reports, reports/[id], reports/[id]/execute, metrics, insights, anomaly, forecast, charts, charts/[id], dashboards, dashboards/[id], dashboards/[id]/widgets, query-history, dictionary, scheduled |
| **Prisma Models** | ✅ 13 models | KPI, KPIEvaluation, AlertRule, AlertTrigger, SavedReport, AnalyticsDataset, AnalyticsQueryHistory, AnalyticsChart, AnalyticsDashboard, AnalyticsDashboardWidget, DataDictionaryEntry, ScheduledQuery, MetricDefinition |
| **UI Analytics Workspace** | ✅ 100% | 10 tabs: Overview, Explorer, KPI, Reports, Alerts, Charts, Dashboards, Dictionary, History, Scheduled |
| **SQL Studio** | ❌ 0% | Belum ada — Phase 3 |
| **Visual Query Builder** | ❌ 0% | Belum ada — Phase 3 |
| **Dashboard Builder** | 🔄 Partial | Widget API ready, UI drag-and-drop belum ada |
| **Chart Builder** | 🔄 Partial | CRUD chart config ready, visual builder belum ada |

### ⚠️ PLANNED — Phase 2: Advanced Analytics (Target: Q4 2026)

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Chart Builder** | Drag & drop chart builder dengan multiple chart types | 🔄 Partial — CRUD config ready |
| **Dashboard Builder** | Drag & drop widget builder dengan multiple layout options | 🔄 Partial — Widget API ready |
| **Pivot & OLAP** | Cross-tabulation analysis dengan row/column dimensions | 📋 Planned |
| **Drill-down** | Hierarchical drill-down dari summary ke transaction detail | 📋 Planned |
| **Scheduled Reports** | Automated report scheduling (daily/weekly/monthly) | 🔄 Partial — ScheduledQuery model + API ready |
| **Data Dictionary** | Metadata browser untuk semua metrics dan fields | ✅ Implemented — CRUD + UI page |
| **Comparative Analysis** | Period-over-period comparison (MoM, QoQ, YoY) | 📋 Planned |

### ⚠️ PLANNED — Phase 3: Intelligence Layer (Target: Q1 2027)

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **SQL Studio** | SQL editor dengan read-only, tenant-scoped, query timeout | ❌ Belum ada — **0%** |
| **Visual Query Builder** | Point-and-click query builder dengan drag & drop | ❌ Belum ada — **0%** |
| **Data Lineage** | Visualisasi asal-usul data/metrics | 📋 Planned |
| **Anomaly Detection** | Statistical anomaly detection dengan severity levels | 📋 Planned |
| **Forecasting** | Predictive analytics untuk sales, cash flow, inventory, demand | 📋 Planned |
| **Industry Analytics** | Configurable analytics templates per industri (Retail, Manufacturing, Construction, Service) | 📋 Planned |
| **Advanced Segmentation** | Customer/product segmentation analysis | 📋 Planned |

### ⚠️ PLANNED — Phase 4: Decision Intelligence (Target: Q2 2027)

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **AI Analyst Assistant** | Natural language query → analysis + chart + summary | 📋 Planned |
| **Natural Language Query** | "Tampilkan penjualan bulan ini" → query execution | 📋 Planned |
| **Automated Insights** | AI-generated insights dari data patterns | 📋 Planned |
| **Automated Reports** | AI-generated reports dengan penjelasan | 📋 Planned |
| **Decision Intelligence** | AI-powered decision recommendations | 📋 Planned |

### 🔧 Known Issues — Analytics

| # | Issue | Severity | Action Plan |
|---|-------|----------|-------------|
| 1 | ~~Dataset definitions di-hardcode inline di API routes~~ | 🟠 Medium | ✅ Fixed — refactored ke `@qalcuity/analytics` package |
| 2 | Belum ada Materialized Views untuk Read Model | 🟠 Medium | Buat materialized views untuk query performance |
| 3 | Belum ada Permission Guard (dataset/column/row level) | 🔴 High | Depend on Permission Engine (Phase 9) |
| 4 | ~~UI Analytics Workspace belum ada~~ | 🟠 Medium | ✅ Fixed — 10 tabs workspace implemented |
| 5 | SQL Studio belum ada | 🟡 Low | Phase 3 — setelah Permission Engine |

> **Referensi:** [`docs/ANALYTICS-STUDIO.md`](docs/ANALYTICS-STUDIO.md) untuk arsitektur lengkap, [`docs/ANALYTICS.md`](docs/ANALYTICS.md) untuk analytics overview, [`FEATURES.md`](FEATURES.md) Section 8 untuk detail fitur.

---

## 🔜 Next Steps (Priority Order)

> **📄 Dokumentasi lengkap semua remaining work ada di [`docs/REMAINING-WORK.md`](docs/REMAINING-WORK.md).** Document ini berisi daftar detail semua fitur yang belum diimplementasi, organized by priority (CRITICAL → HIGH → MEDIUM → LOW), dengan item ID, complexity estimate, dependency, dan file references. Gunakan dokumen tersebut sebagai **single source of truth** untuk sprint planning dan task breakdown.

### Ringkasan Status (per 2 September 2026)

| Kategori | Jumlah | Keterangan |
|----------|--------|------------|
| 🟢 **Production Ready** | ~70 features | Sudah deployed dan tested |
| 🟡 **Partial/Implemented** | ~50 features | CRUD ada, fitur lanjutan belum |
| 🔴 **Belum Dikerjakan** | ~155 features | Perlu implementasi, ~39% dari total |
| 📦 **Shared Packages** | 12 packages | 9 active, 2 new (permissions, workflow, industry-config), 1 not created (api) |
| 🗄️ **Prisma Models** | 48 models | Core modules + foundation engines + analytics + tax + period + approval |
| ⚙️ **Foundation Engines** | 3 engines | Permission ✅, Workflow ✅, Industry Config ✅ |

### Prioritas Eksekusi

| # | Prioritas | Target | Estimasi | Status |
|---|-----------|--------|----------|--------|
| 1 | 🔴 **CRITICAL: Security & Infrastructure** | Q3 2026 | 3-4 minggu | ✅ Selesai — RBAC hardening, CSP, CORS, audit |
| 2 | 🔴 **HIGH: Permission Engine** (`@qalcuity/permissions`) | Q3 2026 | 3-4 minggu | ✅ Selesai — `can()` engine, roles, resource definitions |
| 3 | 🔴 **HIGH: Workflow Engine** (`@qalcuity/workflow`) | Q3-Q4 2026 | 3-4 minggu | ✅ Selesai — state machine, transitions, guards |
| 4 | 🔴 **HIGH: Industry Config Engine** (`@qalcuity/industry-config`) | Q4 2026 | 3-4 minggu | ✅ Selesai — custom fields, documents, reports, 9 packs |
| 5 | 🟠 **HIGH: Unified Control Engine** | Q4 2026 | 6-8 minggu | 📋 39 items — Policy, Approval, SLA, Delegation, SoD, Locking, Exception |
| 6 | 🟠 **HIGH: Analytics Studio — Foundation** | Q4 2026 | 4-6 minggu | 📋 ~20 items — Security Pipeline, Dataset Config, KPI Engine |
| 7 | 🟠 **MEDIUM: Finance GL/Tax** | Q4 2026 | 4-6 minggu | 📋 GL module, tax engine, multi-currency, bank reconciliation |
| 8 | 🟠 **MEDIUM: CRM Pipeline** | Q4 2026 | 3-4 minggu | 📋 Pipeline config, email integration, win probability, automation |
| 9 | 🟡 **MEDIUM: HR Expansion** | Q1 2027 | 4-6 minggu | 📋 Recruitment, performance review, training, onboarding |
| 10 | 🟡 **MEDIUM: Inventory Advanced** | Q1 2027 | 3-4 minggu | 📋 Multi-warehouse, lot tracking, expiry, MRP, barcode |
| 11 | 🟡 **MEDIUM: Integration Hub** | Q1 2027 | 4-6 minggu | 📋 Payment gateway, e-invoicing, WhatsApp, marketplace |
| 12 | ⚪ **LOW: AI Agent Suite** | Q1-Q2 2027 | 6-8 minggu | 📋 Finance/Sales/Inventory/HR/Support agents, NLQ |
| 13 | ⚪ **LOW: Analytics Phase 2-3** | Q2-Q3 2027 | 8-12 minggu | 📋 SQL Studio, Visual Query, Chart Engine, Dashboard Builder |
| 14 | ⚪ **LOW: Mobile Auth & Features** | Q2 2027 | 6-8 minggu | 📋 Auth flow, offline sync, push notifications |
| 15 | ⚪ **LOW: POS Module** | Q2-Q3 2027 | 6-8 minggu | 📋 Core POS, offline mode, receipt printer, industry config |
| 16 | ⚪ **LOW: Industry Packs** | Q3-Q4 2027 | 12-16 minggu | 📋 9 industry packs, config engine, dashboard per industri |
| 17 | ⚪ **LOW: Platform Control Center** | Q4 2027 | 8-12 minggu | 📋 Tenant mgmt, billing, impersonation, feature flags, health |

> **Total estimasi remaining work: ~18-24 bulan untuk tim kecil (1-3 developer).**

### Checklist Singkat per Modul

- [x] **Security & Infrastructure** — RBAC hardening, session expiry, CSP review, Prisma extensions, email service, audit migration, CI/CD pipeline
- [x] **Permission Engine** — Package setup, resource definitions, `can()` engine, RBAC integration, middleware, UI guards, caching, UI components
- [x] **Workflow Engine** — Package setup, state machine, configurable workflows, transitions, lifecycle hooks, history, UI builder, ADR-018 s/d ADR-023
- [x] **Industry Config** — Package setup, registry, custom fields engine, custom documents, custom reports, dashboard config, 9 default packs
- [ ] **Unified Control Engine** — Policy Engine, configurable approval, SLA engine, delegation, SoD validation, document locking, exception center, notifications, ADR-017
- [ ] **Analytics Studio** — Security Pipeline (5 layers), Dataset Config CRUD, Materialized Views (12 views), KPI Engine, Chart Engine, Pivot/OLAP, SQL Studio, Visual Query Builder, Dashboard Builder, Data Lineage, Anomaly Detection, Forecasting
- [ ] **Finance** — GL module ✅, journal entries ✅, tax rate management ✅, period closing ✅, approval engine ✅, trial balance, P&L, balance sheet, multi-currency, bank reconciliation, revenue recognition
- [ ] **CRM** — Pipeline config, email integration, calendar sync, win probability, lead scoring, automation rules
- [ ] **HR** — Recruitment, performance review, training, onboarding, expense claims, PTO management
- [ ] **Inventory** — Multi-warehouse, lot/serial tracking, expiry management, MRP, barcode/QR, cycle count, ABC analysis
- [ ] **Integration** — Payment gateway, e-invoicing, WhatsApp, marketplace, bank feeds, project management, time tracking, support portal
- [ ] **AI Agents** — Hub setup, 5 domain agents, NLQ, document extraction, template generator, anomaly detection
- [x] **Mobile Auth** — JWT auth flow (login, register, refresh, me), AuthContext, Login/Register screens
- [ ] **POS** — Core module, offline mode, receipt printer, barcode scanner, industry config, multi-outlet, cash drawer
- [ ] **Industry Packs** — Framework engine, 9 default industry packs, dashboard config per industri
- [ ] **Platform Control Center** — Tenant management, billing, error center, health dashboard, support, impersonation, feature flags, usage metering, security center

> **📄 Detail lengkap: [`docs/REMAINING-WORK.md`](docs/REMAINING-WORK.md)**

---

## Do Not Touch

> ⛔ **File/section ini TIDAK BOLEH DIMODIFIKASI tanpa approval eksplisit.**

| System | Reason | File/Location |
|--------|--------|---------------|
| Authentication system | Security-critical, affects all users | [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts), [`apps/web/app/api/auth/`](apps/web/app/api/auth/) |
| Tenant isolation | Data security — cross-tenant leak = critical bug | All API routes (`tenantId` filtering) |
| Audit trail system | Compliance requirement | [`apps/web/lib/audit.ts`](apps/web/lib/audit.ts) |
| Prisma schema | Production safety — changes require migration | [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma) |
| Middleware RBAC | Authorization-critical | [`apps/web/middleware.ts`](apps/web/middleware.ts) |
| Session helpers | Security-critical auth helpers | [`apps/web/lib/session.ts`](apps/web/lib/session.ts) |

---

**Maintainer:** Qalcuity AI Team
**Document Version:** 6.1 — Feature Sprint Complete (FASE 3C-4C)
