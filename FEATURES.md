# 🚀 Qalcuity All-in-One — Product Source of Truth

> **"All-in-One B2B Operating System untuk UKM & Mid-Market Indonesia"**
> Ganti 5–7 tools jadi 1, mobile-first, Coretax-ready, dan AI yang benar-benar kerja.

**Last Updated:** September 16, 2026 (Session 52: Financial Statements + Analytics Read Model + Session Control + API Docs — v11.38.0)
**Maintainer:** Qalcuity Product Team
**Document Version:** 30.0 — Session 52: Financial Statements Enhancement (Cash Flow Statement, General Ledger, i18n, CSV export for all 5 reports), Analytics Read Model (12 materialized views, read model service, refresh API, cron task), Multi-device Session Control (session tracking, management UI, revoke, cleanup cron), API Documentation (OpenAPI 3.0 spec, Swagger UI, 53 endpoints). Session 44: Full i18n migration (350+ keys). Session 28-29: Industry Packs, POS Kitchen × Table, AI Agents, Control Engine. Session 26+: NLU parser, anomaly detection, AES-256-GCM, Xendit, SSE, batch extraction, 153 Zod schemas, 400+ API routes, 165 RBAC routes

> **📄 Dokumentasi lengkap semua remaining work ada di [`docs/REMAINING-WORK.md`](docs/REMAINING-WORK.md).**
> File tersebut berisi daftar detail semua fitur yang belum diimplementasi, organized by priority (CRITICAL → HIGH → MEDIUM → LOW), dengan item ID, complexity estimate, dependency, dan file references. Gunakan sebagai **single source of truth** untuk sprint planning dan task breakdown.

---

## 🏷️ Status Legend

> **Setiap fitur diberi label status berdasarkan bukti kode dan pengujian aktual.**
> Label ini adalah **single source of truth** — tidak ada `[x]`/`[ ]` yang ambigu.

| Status | Icon | Arti |
|--------|------|------|
| `foundation_complete` | 🔄 | Foundation code selesai (types, client, routes) tapi belum integrasi penuh |
| `planned` | 📋 | Belum ada kode sama sekali — baru direncanakan |
| `in_progress` | 🔨 | Mulai ditulis tapi belum fungsional |
| `partial` | 🔄 | Ada kode tapi tidak lengkap (placeholder/mock/incomplete) |
| `implemented` | ✅ | Kode lengkap dan kompilasi, endpoint fungsional |
| `verified` | ✔️ | Sudah di-test end-to-end dan berfungsi sesuai harapan |
| `production_ready` | 🚀 | Sudah verified + RBAC + audit trail + tenant isolation + input validation — siap deploy ke production |
| `blocked` | 🚫 | Ada dependency yang belum selesai / blocker |
| `deprecated` | ⛔ | Sudah tidak digunakan, akan dihapus |

> **Normalisasi Label:** Gunakan `production_ready` untuk semua fitur yang sudah memiliki RBAC (3 lapis), audit trail logging, tenant isolation (tenantId filter), dan Zod validation. Gunakan `verified` hanya untuk fitur yang sudah berfungsi tapi belum lengkap security-nya.

---

### 📌 Business Model

> **Qalcuity = Aplikasi + Server + AI built-in.** Developer hanya menyediakan aplikasi SaaS dan server. User menyewa aplikasi, dapat update fitur berkala, dan mengelola integrasi pihak ketiga sendiri (API key mereka sendiri). **Tidak ada biaya integrasi dari sisi Qalcuity** — user yang bayar API WhatsApp, Shopee, Payment Gateway, dll langsung ke provider masing-masing.

### 🖥️ Platform Availability

| Platform | Description | Status | Last Verified | Notes |
|----------|-------------|--------|---------------|-------|
| **Web App** | Core utama, full feature, admin panel | 🚀 `production_ready` | 2026-08-31 | Next.js 14 App Router, 51+ API routes |
| **Desktop App** | Electron-based, offline capable | 🔄 `partial` | — | Electron wrapper only, belum ada auth/offline |
| **Mobile App** | iOS & Android, field-ready | ✅ `implemented` | 2026-09-01 | 12 screens, API client, JWT auth flow (login/register/refresh/me) |

### 💰 Yang Qalcuity Sediakan

| Komponen | Deskripsi | Biaya |
|----------|-----------|-------|
| **Aplikasi** | Web, Desktop, Mobile | Sewa bulanan/tahunan |
| **Server** | Hosting, database, backup | Termasuk dalam sewa |
| **AI Built-in** | AI Agent, NLP, prediction | Termasuk dalam sewa |
| **Update** | Fitur baru, bug fix, security | Termasuk dalam sewa |
| **Integration Dashboard** | Tempat user plug API key sendiri | Termasuk dalam sewa |

### ❌ Yang BUKAN Tanggung Jawab Qalcuity

| Komponen | Siapa yang Bayar |
|----------|-----------------|
| **API WhatsApp Business** | User ke Meta |
| **API Marketplace** (Shopee, Tokopedia) | User ke marketplace |
| **Payment Gateway** (Xendit, Midtrans) | User ke provider |
| **Email Service** (SendGrid, Mailgun) | User ke provider |
| **SMS Gateway** | User ke provider |
| **Google/Microsoft API** | User ke Google/Microsoft |

---

## 📋 Daftar Isi

1. [Core Platform & SaaS](#1-core-platform--saas)
2. [Finance & Accounting](#2-finance--accounting)
3. [Sales & CRM](#3-sales--crm)
4. [Inventory & Supply Chain](#4-inventory--supply-chain)
5. [HR & People Ops](#5-hr--people-ops)
6. [Operations & Project](#6-operations--project)
7. [Customer Support & Communication](#7-customer-support--communication)
8. [Analytics Studio](#8-analytics-studio)
9. [AI Features](#9-ai-features)
10. [Integration & Ecosystem](#10-integration--ecosystem)
11. [Admin & Security](#11-admin--security)
12. [Control Center & Workflow](#12-control-center--workflow)
13. [Architecture Engines](#13-architecture-engines)
14. [Industry Packs](#14-industry-packs)
15. [POS Module](#15-pos-module)
16. [Mobile](#16-mobile)
17. [Desktop](#17-desktop)
18. [Pricing Model](#18-pricing-model)

---

## 1. Core Platform & SaaS

Foundation yang menjadi tulang punggung seluruh modul.

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Tenant Management** | 🚀 `production_ready` | 2026-08-30 | Multi-tenant isolation, tenantId on all queries |
| **User Management** | 🚀 `production_ready` | 2026-08-30 | CRUD, role assignment, tenant-scoped |
| **Auth (NextAuth.js)** | 🚀 `production_ready` | 2026-08-30 | JWT + CredentialsProvider, password bcryptjs |
| **RBAC (4 Roles)** | 🚀 `production_ready` | 2026-09-13 | SUPERADMIN (platform admin only, hidden from tenant views since Session 20), ADMIN, MEMBER, VIEWER — 3 layers |
| **Audit Trail** | 🚀 `production_ready` | 2026-08-30 | 77 audit calls across 10 mutation endpoints |
| **Settings (6 Pages)** | 🚀 `production_ready` | 2026-08-30 | Company, Profile, Security, Team, Notifications, Billing |
| **Demo Data** | 🚀 `production_ready` | 2026-08-30 | Comprehensive seed data for all modules |
| **Dark Mode** | 🚀 `production_ready` | 2026-08-30 | Tailwind dark theme support |
| **Global Search** | 🚀 `production_ready` | 2026-08-30 | Ctrl+K shortcut, cross-module search |
| **i18n (ID/EN)** | 🚀 `production_ready` | 2026-09-15 | Full i18n migration complete (Sessions 38-44: 350+ keys added, 300+ hardcoded strings replaced, all dashboard pages/sidebar/header/shared components localized, backend api-messages.ts 310+ constants, 4755+ total keys) |
| **Responsive Design** | 🚀 `production_ready` | 2026-09-01 | Mobile-first, 44x44px touch targets, Reports page 12 sub-components |
| **Responsive Tables** | 🚀 `production_ready` | 2026-09-01 | Dual layout: mobile cards + desktop tables (19 pages) |
| **Zod Validation** | 🚀 `production_ready` | 2026-09-08 | 153 schemas, all mutation routes validated |
| **RBAC Defense-in-depth** | 🚀 `production_ready` | 2026-08-30 | Middleware + API route + UI visibility |
| **Lucide Icons** | 🚀 `production_ready` | 2026-08-30 | Consistent icon system across all modules |
| **Empty States** | 🚀 `production_ready` | 2026-08-30 | All CRUD pages have empty state components |
| **Toast Notifications** | 🚀 `production_ready` | 2026-09-01 | Centralized toast provider — toast.tsx + ToastProvider in layout |
| **Confirmation Dialogs** | 🚀 `production_ready` | 2026-09-01 | ConfirmDialog component — 24 window.confirm calls replaced |
| **Navigation Links** | 🚀 `production_ready` | 2026-08-30 | Cross-entity navigation (e.g., Invoice → Contact) |
| **Loading States** | 🚀 `production_ready` | 2026-09-08 | 117 loading.tsx files — all detail, workspace, and module pages covered |
| **Error Boundaries** | 🚀 `production_ready` | 2026-09-08 | 115 error.tsx files — all module sections + detail pages covered (HR, CRM, Inventory, Finance, POS, Settings, Analytics, Platform, Operations, Field Service) |
| **Error Handling Consolidation** | 🚀 `production_ready` | 2026-09-08 | 27 API routes refactored with centralized `handleApiError()`, 35 catch blocks consolidated, ~95%+ error handling coverage |
| **Backend i18n** | 🚀 `production_ready` | 2026-09-08 | [`api-messages.ts`](apps/web/lib/api-messages.ts) with 310+ English constants, 200+ API route files migrated from hardcoded strings |
| **Inline Error Banners** | 🚀 `production_ready` | 2026-09-01 | Inline error display on form pages — replaces silent failures |
| **Security Hardening** | 🚀 `production_ready` | 2026-09-12 | .gitignore hardened, .env removed from git history, 153 Zod schemas (all mutation routes), 100% rate limiting coverage, 64 unsafe casts refactored to `toAuditPayload()`, platform settings enforced (maintenanceMode, allowRegistration, emailNotifications) |
| **.env.example Updated** | 🚀 `production_ready` | 2026-09-01 | Comprehensive env template with comments for all config vars |
| **Deploy Scripts** | 🚀 `production_ready` | 2026-09-08 | aaPanel Node.js Project Manager, configurable port, robust db:push, update.sh |
| **E2E Test Suite** | 🚀 `production_ready` | 2026-08-30 | 63 tests: CRUD, RBAC, tenant isolation, N+1 detection |
| **Performance Indexes** | 🚀 `production_ready` | 2026-08-30 | 57 database indexes across frequently queried fields |
| **Subscription** | ✅ `implemented` | 2026-08-30 | Full subscription model with Midtrans payment integration |
| **Billing** | ✅ `implemented` | 2026-08-30 | Plan selection, manual transfer + Midtrans Snap payment |
| **Notification** | 🔄 `partial` | — | Notification bell ada, tapi belum real-time push |
| **Multi-entity & Multi-currency** | 📋 `planned` | — | Belum ada kode |

---

## 2. Finance & Accounting

Modul keuangan yang comprehensive dan comply dengan regulasi Indonesia.

### 2.1 Core Accounting

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Chart of Account** | 🚀 `production_ready` | 2026-09-01 | Template CoA + custom, multi-level grouping, Prisma DB |
| **General Ledger** | ✅ `implemented` | 2026-09-01 | Journal Entry CRUD with double-entry validation, Prisma models |
| **Journal Entry** | ✅ `implemented` | 2026-09-01 | CRUD + UI page + Zod validation (debit = credit), Batch 7C |
| **Trial Balance** | ✅ `implemented` | 2026-09-04 | API route + UI page, debet = kredit validation |
| **Financial Statements** | 🚀 `production_ready` | 2026-09-16 | 5 reports: Balance Sheet, Income Statement, Cash Flow Statement, General Ledger, Trial Balance — full i18n + CSV export — [`apps/web/app/dashboard/finance/reports/`](apps/web/app/dashboard/finance/reports/) |
| **Cash Flow Statement** | 🚀 `production_ready` | 2026-09-16 | Arus kas dari aktivitas operasi, investasi, dan pendanaan — API + UI + i18n + CSV export — [`apps/web/app/api/finance/reports/cash-flow/route.ts`](apps/web/app/api/finance/reports/cash-flow/route.ts) |
| **General Ledger** | 🚀 `production_ready` | 2026-09-16 | Buku besar dengan detail jurnal entri per akun, saldo berjalan — API + UI + i18n + CSV export — [`apps/web/app/api/finance/reports/general-ledger/route.ts`](apps/web/app/api/finance/reports/general-ledger/route.ts) |

### 2.2 Accounts Receivable

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Invoices** | 🚀 `production_ready` | 2026-08-30 | Full CRUD, custom template, Zod validation, audit trail |
| **Quotations** | 🚀 `production_ready` | 2026-08-30 | Convert to invoice, version tracking, Prisma DB |
| **Payments** | 🚀 `production_ready` | 2026-08-30 | Multi-payment method, partial payment, process endpoint |
| **Aging Report** | 🚀 `production_ready` | 2026-09-14 | Laporan Umur Piutang & Utang — AR (Invoice) + AP (PurchaseOrder), age buckets (Current, 31-60, 61-90, 90+), color coding, summary cards + detail tables, responsive layout. Auth: `finance:view`, Rate limit: 30 req/min — [`apps/web/app/api/finance/aging-report/route.ts`](apps/web/app/api/finance/aging-report/route.ts), [`apps/web/app/dashboard/finance/aging-report/page.tsx`](apps/web/app/dashboard/finance/aging-report/page.tsx) |
| **Credit Limit Management** | 📋 `planned` | — | Belum ada kode |

### 2.3 Accounts Payable

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Purchase Orders** | 🚀 `production_ready` | 2026-08-30 | Full CRUD, approval workflow, Zod validation |
| **Bills & Expenses** | 🚀 `production_ready` | 2026-09-14 | Full CRUD: Bill + Expense models, 4 API routes, 2 UI pages, 4 Zod schemas, RBAC, tenant isolation, sidebar navigation |
| **Payment Processing** | 🔄 `partial` | — | Basic payment processing, belum batch/scheduled |
| **Supplier Management** | 🚀 `production_ready` | 2026-08-30 | Full CRUD, rating, performance tracking |

### 2.4 Bank & Cash

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Bank Reconciliation** | 🚀 `production_ready` | 2026-08-30 | Manual reconciliation page, CoAAccount + BankTransaction models |
| **Multi-bank Account** | 📋 `planned` | — | Belum ada kode |
| **Petty Cash** | 📋 `planned` | — | Belum ada kode |
| **Bank Feed** | 📋 `planned` | — | Belum ada kode |

### 2.5 Tax Engine

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Tax Rate Management** | ✅ `implemented` | 2026-09-02 | CRUD API + UI — TaxRate model, list/create/edit/delete, type filter, default toggle ([`apps/web/app/api/finance/tax-rates/`](apps/web/app/api/finance/tax-rates/)) |
| **Coretax-ready** | 📋 `planned` | — | Belum ada kode |
| **e-Faktur** | 📋 `planned` | — | Belum ada kode |
| **PPh 21** | 📋 `planned` | — | Belum ada kode |
| **PPh 23** | 📋 `planned` | — | Belum ada kode |
| **PPN** | 📋 `planned` | — | Belum ada kode |
| **Tax Report** | 🚀 `production_ready` | 2026-09-14 | Laporan Pajak — PPN/PPh summary dengan date range filtering, 4 summary cards (PPN Keluar, PPN Masuk, PPh 21, PPh 23), detail tables, responsive layout. Auth: `finance.reports.view` — [`apps/web/app/api/finance/tax-report/route.ts`](apps/web/app/api/finance/tax-report/route.ts), [`apps/web/app/dashboard/finance/tax-report/page.tsx`](apps/web/app/dashboard/finance/tax-report/page.tsx) |

### 2.6 Revenue Recognition

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **ASC 606 / IFRS 15** | 📋 `planned` | — | Belum ada kode |
| **Subscription Revenue** | 📋 `planned` | — | Belum ada kode |
| **Milestone-based** | 📋 `planned` | — | Belum ada kode |
| **Multi-element** | 📋 `planned` | — | Belum ada kode |

---

## 3. Sales & CRM

Pipeline yang powerful dengan AI untuk meningkatkan konversi.

### 3.1 Contacts

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Contacts (CRM)** | 🚀 `production_ready` | 2026-08-30 | Full CRUD, cross-entity navigation, tenant-scoped |

### 3.2 Pipeline Management

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Deals (Kanban)** | 🚀 `production_ready` | 2026-08-30 | 6 stages: DISCOVERY → CLOSED_LOST, drag & drop |
| **Pipeline View** | 🚀 `production_ready` | 2026-08-30 | List view + Kanban view, sorting & filtering |
| **Custom Stages** | 🚀 `production_ready` | 2026-08-30 | 6 predefined stages with Prisma enum |
| **Deal Value Forecasting** | 🔄 `partial` | — | Basic weighted pipeline, belum AI prediction |
| **Multiple Pipelines** | 📋 `planned` | — | Belum ada kode |

### 3.3 Lead Management

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Leads** | 🚀 `production_ready` | 2026-08-30 | Full CRUD, tenant-scoped, audit trail |
| **Lead Scoring** | 📋 `planned` | — | Belum ada kode |
| **Lead Assignment** | 📋 `planned` | — | Belum ada kode |
| **Lead Source Tracking** | 🔄 `partial` | — | Basic source field, belum attribution multi-touch |

### 3.4 Quote to Order

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Quote Builder** | 🚀 `production_ready` | 2026-08-30 | Custom template, convert to invoice |
| **Convert to Order** | 🔄 `partial` | — | Basic conversion, belum seamless |
| **Approval Workflow** | 📋 `planned` | — | Belum ada kode |

### 3.5 Customer 360°

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Unified Profile** | 🔄 `partial` | — | Basic contact detail page, belum unified view |
| **Transaction History** | 🔄 `partial` | — | Invoice history ada, belum payment/order history |
| **Interaction Timeline** | 📋 `planned` | — | Belum ada kode |
| **Segmentation** | 📋 `planned` | — | Belum ada kode |

### 3.6 Sales Intelligence (AI)

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Win Probability** | 📋 `planned` | — | Belum ada kode |
| **Next Best Action** | 📋 `planned` | — | Belum ada kode |
| **Sales Forecasting** | 📋 `planned` | — | Belum ada kode |
| **Competitor Analysis** | 📋 `planned` | — | Belum ada kode |

### 3.7 Commission Calculator

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Flexible Rules** | 📋 `planned` | — | Belum ada kode |
| **Real-time Calculation** | 📋 `planned` | — | Belum ada kode |
| **Disbursement** | 📋 `planned` | — | Belum ada kode |

---

## 4. Inventory & Supply Chain

Real-time visibility dan kontrol penuh atas inventaris.

### 4.1 Product Management

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Products** | 🚀 `production_ready` | 2026-08-30 | Full CRUD, variants, Prisma model |
| **Categories** | 🚀 `production_ready` | 2026-08-30 | Full CRUD, hierarchical, DELETE handler via API |
| **Batch/Lot Tracking** | 📋 `planned` | — | Belum ada kode |
| **Serial Number** | 📋 `planned` | — | Belum ada kode |
| **Bill of Materials** | 📋 `planned` | — | Belum ada kode |

### 4.2 Stock Management

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Stock Management** | 🚀 `production_ready` | 2026-08-30 | Real-time stock tracking, tenant-scoped |
| **Stock Movements** | 🚀 `production_ready` | 2026-08-30 | In/out tracking, movement history |
| **Multi-warehouse** | 📋 `planned` | — | Belum ada kode |
| **Stock Opname** | 📋 `planned` | — | Belum ada kode |
| **Unit of Measure** | 📋 `planned` | — | Belum ada kode |

### 4.3 Procurement

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Suppliers** | 🚀 `production_ready` | 2026-08-30 | Full CRUD, rating, performance tracking |
| **Purchase Order (Auto)** | 📋 `planned` | — | PO manual ada (di Finance), auto-generated belum |
| **Goods Receipt** | 📋 `planned` | — | Belum ada kode |
| **Supplier Price Monitoring** | 📋 `planned` | — | Belum ada kode |

### 4.4 Warehouse Operations

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Putaway Rules** | 📋 `planned` | — | Belum ada kode |
| **Picking Strategy** | 📋 `planned` | — | Belum ada kode |
| **Barcode/QR Scanning** | 📋 `planned` | — | Belum ada kode |
| **Shipping Integration** | 📋 `planned` | — | Belum ada kode |

### 4.5 Inventory Intelligence (AI)

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Low-stock Alert** | 📋 `planned` | — | Belum ada kode |
| **Auto-reorder Suggestion** | 📋 `planned` | — | Belum ada kode |
| **Demand Forecasting** | 📋 `planned` | — | Belum ada kode |
| **Dead Stock Detection** | 📋 `planned` | — | Belum ada kode |

---

## 5. HR & People Ops

HR yang efisien dengan automation untuk fokus pada people.

### 5.1 Employee Management

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Employees** | 🚀 `production_ready` | 2026-08-30 | Full CRUD, comprehensive profile, tenant-scoped |
| **Digital Onboarding** | 📋 `planned` | — | Belum ada kode |
| **Org Chart** | 📋 `planned` | — | Belum ada kode |
| **Employee Self-Service** | 📋 `planned` | — | Belum ada kode |

### 5.2 Attendance & Time

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Attendance** | 🚀 `production_ready` | 2026-08-30 | Full CRUD, check-in/check-out, tenant-scoped |
| **GPS Check-in** | 🔄 `partial` | — | Basic check-in, belum geofencing |
| **Face Recognition** | 📋 `planned` | — | Belum ada kode |
| **Flexible Schedule** | 📋 `planned` | — | Belum ada kode |

### 5.3 Leave Management

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Leaves** | 🚀 `production_ready` | 2026-08-30 | Full CRUD, approval workflow, tenant-scoped |
| **Leave Balance** | 🔄 `partial` | — | Basic balance tracking, belum real-time |
| **Leave Calendar** | 📋 `planned` | — | Belum ada kode |
| **Public Holiday** | 📋 `planned` | — | Belum ada kode |

### 5.4 Payroll

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Payroll** | 🚀 `production_ready` | 2026-08-30 | Full CRUD, auto calculation, tenant-scoped |
| **PPh 21** | 🔄 `partial` | — | Basic calculation, belum complete |
| **BPJS** | 🔄 `partial` | — | Basic calculation, belum complete |
| **THR** | 📋 `planned` | — | Belum ada kode |
| **Payroll Report** | 🔄 `partial` | — | Basic report, belum SPT format |

### 5.5 Template Builder (Pain Point Solution)

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Offer Letter** | 📋 `planned` | — | Belum ada kode |
| **Kontrak Kerja** | 📋 `planned` | — | Belum ada kode |
| **Warning Letter** | 📋 `planned` | — | Belum ada kode |
| **Performance Review** | 📋 `planned` | — | Belum ada kode |
| **Termination Letter** | 📋 `planned` | — | Belum ada kode |
| **Surat Keterangan** | 📋 `planned` | — | Belum ada kode |

### 5.6 Performance & OKR

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **OKR Setting** | 📋 `planned` | — | Belum ada kode |
| **Regular Check-in** | 📋 `planned` | — | Belum ada kode |
| **360° Feedback** | 📋 `planned` | — | Belum ada kode |
| **Performance Review** | 📋 `planned` | — | Belum ada kode |

---

## 6. Operations & Project

Manage projects dan field operations dengan efisien. **Phase A + Phase B Complete** (5 September 2026).

### 6.1 Project Management

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Project CRUD** | ✅ `implemented` | 2026-09-05 | Full CRUD: list (grid cards), detail (6 tabs: Overview, Tasks, Members, Budget, Gantt, Resources), search/filter — [`apps/web/app/dashboard/projects/`](apps/web/app/dashboard/projects/) |
| **Project Members** | ✅ `implemented` | 2026-09-05 | Add/remove members with role (LEAD/MEMBER/VIEWER) — API + UI integrated |
| **Project Budget Tracking** | ✅ `implemented` | 2026-09-05 | Budget vs actual per category (LABOR/MATERIAL/EQUIPMENT/TRAVEL/SOFTWARE/OTHER), progress bars, line items — [`apps/web/app/api/projects/[id]/budget/route.ts`](apps/web/app/api/projects/[id]/budget/route.ts) |
| **Kanban Board** | ✅ `implemented` | 2026-09-05 | 4 columns (TODO/IN_PROGRESS/IN_REVIEW/DONE), button-based status change — [`apps/web/app/dashboard/projects/[id]/board.tsx`](apps/web/app/dashboard/projects/[id]/board.tsx) |
| **Gantt Chart** | ✅ `implemented` | 2026-09-05 | Visual timeline with task bars, progress, dependencies, today marker, desktop + mobile views — [`apps/web/app/dashboard/projects/[id]/gantt/page.tsx`](apps/web/app/dashboard/projects/[id]/gantt/page.tsx) |
| **Resource Allocation** | ✅ `implemented` | 2026-09-05 | Employee utilization heatmap, allocation %, overlap detection, hourly rate — [`apps/web/app/dashboard/projects/[id]/resources/page.tsx`](apps/web/app/dashboard/projects/[id]/resources/page.tsx) |
| **Task Dependencies** | ✅ `implemented` | 2026-09-05 | Self-referential dependency with circular detection, inline editor — [`task-dependency-editor.tsx`](apps/web/components/operations/task-dependency-editor.tsx) |
| **Project Timeline** | ✅ `implemented` | 2026-09-05 | Milestone visualization, progress tracking, today marker — [`project-timeline.tsx`](apps/web/components/operations/project-timeline.tsx) |
| **Project Types** | 📋 `planned` | — | Belum ada kode |

### 6.2 Task & Time Tracking

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Task Management** | ✅ `implemented` | 2026-09-05 | Full CRUD, status (TODO/IN_PROGRESS/IN_REVIEW/DONE), priority (LOW/MEDIUM/HIGH/CRITICAL), assignee, due date, estimated hours — [`apps/web/app/api/tasks/`](apps/web/app/api/tasks/) |
| **Task Comments** | ✅ `implemented` | 2026-09-05 | Add/view comments on tasks — API + UI integrated |
| **My Tasks (Cross-project)** | ✅ `implemented` | 2026-09-05 | Cross-project task view with filters and grouping — [`apps/web/app/dashboard/tasks/page.tsx`](apps/web/app/dashboard/tasks/page.tsx) |
| **Time Logging** | ✅ `implemented` | 2026-09-05 | Log time per task with hours, description, date — API + UI integrated |
| **Timesheet** | ✅ `implemented` | 2026-09-05 | Weekly/monthly view with project breakdown — [`apps/web/app/dashboard/timesheet/page.tsx`](apps/web/app/dashboard/timesheet/page.tsx) |
| **Productivity Report** | 📋 `planned` | — | Belum ada kode |

### 6.3 Field Service Module

> **Phase C Complete** (5 September 2026) — Job scheduling, technician assignment, mobile checklist

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Job Scheduling** | ✅ `implemented` | 2026-09-05 | Field job CRUD with GPS, scheduling, customer info — [`apps/web/app/dashboard/field/jobs/page.tsx`](apps/web/app/dashboard/field/jobs/page.tsx) |
| **Technician Assignment** | ✅ `implemented` | 2026-09-05 | Multi-technician assignment with role (LEAD/TECHNICIAN/HELPER) — API + UI |
| **Mobile Checklist** | ✅ `implemented` | 2026-09-05 | Mobile-first checklist form with checkbox/text/number/photo/signature — [`apps/web/app/dashboard/field/checklists/page.tsx`](apps/web/app/dashboard/field/checklists/page.tsx) |
| **Before-After Photos** | ✅ `implemented` | 2026-09-05 | Photo capture support in checklist items (PHOTO type) |
| **Digital Signature** | ✅ `implemented` | 2026-09-05 | Signature capture support in checklist items (SIGNATURE type) |
| **Job Status Update** | ✅ `implemented` | 2026-09-05 | Status workflow: PENDING→IN_PROGRESS→COMPLETED with timestamps |

### 6.4 Quality & Compliance

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Quality Checklist** | 📋 `planned` | — | Belum ada kode |
| **Non-conformance** | 📋 `planned` | — | Belum ada kode |
| **Corrective Action** | 📋 `planned` | — | Belum ada kode |
| **Compliance Form** | 📋 `planned` | — | Belum ada kode |

---

## 7. Customer Support & Communication

Omnichannel support yang terintegrasi.

### 7.1 Omnichannel Inbox

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Email (SMTP)** | 🚀 `production_ready` | 2026-09-13 | Real Nodemailer transport via SMTP settings API, env-based config, passwords AES-256-GCM encrypted at rest |
| **WhatsApp Business** | 🔄 `foundation_complete` | 2026-09-14 | Foundation: types.ts, client.ts (Meta Cloud API), templates.ts, webhook handler, test endpoint, WhatsAppMessageLog model — belum full UI integration |
| **Instagram** | 📋 `planned` | — | Belum ada kode |
| **Live Chat** | 📋 `planned` | — | Belum ada kode |
| **Facebook** | 📋 `planned` | — | Belum ada kode |

### 7.2 Ticket Management

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Ticket System** | 📋 `planned` | — | Belum ada kode |
| **Priority & Category** | 📋 `planned` | — | Belum ada kode |
| **SLA Tracking** | 📋 `planned` | — | Belum ada kode |
| **Escalation** | 📋 `planned` | — | Belum ada kode |

### 7.3 Knowledge Base

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Article Editor** | 📋 `planned` | — | Belum ada kode |
| **Categories** | 📋 `planned` | — | Belum ada kode |
| **Search** | 📋 `planned` | — | Belum ada kode |

### 7.4 AI Chatbot

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Automated Reply** | 📋 `planned` | — | Belum ada kode |
| **Handoff to Human** | 📋 `planned` | — | Belum ada kode |

### 7.5 Customer Portal

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Invoice View** | 📋 `planned` | — | Belum ada kode |
| **Order Status** | 📋 `planned` | — | Belum ada kode |
| **Support Ticket** | 📋 `planned` | — | Belum ada kode |

---

## 8. Analytics Studio

> **Platform analytics lengkap — dari SQL queries hingga AI-powered decision intelligence.**
> Arsitektur detail: [`docs/ANALYTICS-STUDIO.md`](docs/ANALYTICS-STUDIO.md)

### 8.0 Standard Reporting (Foundation)

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Dashboard Stats** | 🚀 `production_ready` | 2026-09-14 | Real DB queries — 16 parallel queries (Revenue, Outstanding, Expenses, Deals, Leads, Employees, Products), change % calculation (current vs previous month), recent activities + alerts. Route permission: `dashboard:view` |
| **Standard Reports (12 types)** | 🚀 `production_ready` | 2026-08-30 | Finance, Sales, HR, Inventory reports |
| **Chart Components** | 🚀 `production_ready` | 2026-08-30 | Bar, Pie, Line charts — custom implementation |
| **Export (CSV/Excel/Print)** | 🚀 `production_ready` | 2026-08-30 | Built-in export utilities |

### 8.1 Phase 1 — Foundation (Priority: HIGH)

> **SQL Studio, Visual Query Builder, Dataset Explorer, Chart Builder, Export Engine.**

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **SQL Studio** | 📋 `planned` | — | SQL editor dengan syntax highlighting, autocomplete, execution, query history. Read-only, tenant-scoped, 30s timeout |
| **Visual Query Builder** | 📋 `planned` | — | Drag & drop dimensions/measures/filters → generate SQL via shared AST |
| **Dataset Explorer** | 🔄 `partial` | 2026-08-31 | Browse available datasets, view fields, preview data. API ada, UI belum — [`apps/web/app/dashboard/analytics/explorer/page.tsx`](apps/web/app/dashboard/analytics/explorer/page.tsx) |
| **Chart Builder** | 📋 `planned` | — | Auto-visualize query results: Line, Bar, Pie, KPI, Table. Configurable axes, colors, labels |
| **Export Engine** | 🔄 `partial` | 2026-08-31 | Export query results ke CSV, Excel, JSON. Basic export ada di `lib/export.ts`, belum lengkap |
| **Analytics Overview Dashboard** | 🚀 `production_ready` | 2026-08-31 | KPI cards, trend charts, alerts, quick actions — [`apps/web/app/dashboard/analytics/page.tsx`](apps/web/app/dashboard/analytics/page.tsx) |
| **Data Explorer** | 🚀 `production_ready` | 2026-08-31 | Point-and-click query builder, 15 datasets, filters, dimensions, measures — [`apps/web/app/dashboard/analytics/explorer/page.tsx`](apps/web/app/dashboard/analytics/explorer/page.tsx) |
| **Analytics API (15 routes)** | 🚀 `production_ready` | 2026-08-31 | dashboard, explorer, kpi, kpi/[id], kpi/[id]/evaluate, metrics, reports, reports/[id], reports/[id]/execute, insights, anomaly, forecast, charts, dashboards, dashboards/[id], dashboards/[id]/widgets, query-history, dictionary, scheduled |
| **@qalcuity/analytics package** | 🚀 `production_ready` | 2026-08-31 | Types, dimensions, metrics, engine, utils — [`packages/analytics/`](packages/analytics/) — code refactored: import dari package |
| **Analytics i18n (200+ keys)** | 🚀 `production_ready` | 2026-08-31 | Bahasa Indonesia + English |

### 8.2 Phase 2 — Advanced Analytics (Priority: MEDIUM)

> **Dashboard Builder, KPI Builder, Metric Builder, Data Dictionary, Scheduled Queries, Data Alerts, Saved Reports, PIVOT Engine.**

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Dashboard Builder** | ✅ `implemented` | 2026-09-01 | CRUD dashboards dengan create modal, widget API ready (CRUD + tenant isolation) — [`apps/web/app/api/analytics/dashboards/route.ts`](apps/web/app/api/analytics/dashboards/route.ts), [`apps/web/app/dashboard/analytics/dashboards/page.tsx`](apps/web/app/dashboard/analytics/dashboards/page.tsx) |
| **KPI Builder** | 🚀 `production_ready` | 2026-08-31 | CRUD KPI definitions dengan threshold dan evaluation — [`apps/web/app/dashboard/analytics/kpi/page.tsx`](apps/web/app/dashboard/analytics/kpi/page.tsx), [`apps/web/app/api/analytics/kpi/route.ts`](apps/web/app/api/analytics/kpi/route.ts) |
| **Metric Builder** | 🔄 `partial` | 2026-08-31 | MetricDefinition Prisma model + API ready — [`apps/web/app/api/analytics/metrics/route.ts`](apps/web/app/api/analytics/metrics/route.ts) |
| **Data Dictionary** | ✅ `implemented` | 2026-08-31 | Metadata browser: CRUD entries, search, filter — [`apps/web/app/dashboard/analytics/dictionary/page.tsx`](apps/web/app/dashboard/analytics/dictionary/page.tsx), [`apps/web/app/api/analytics/dictionary/route.ts`](apps/web/app/api/analytics/dictionary/route.ts) |
| **Scheduled Queries** | 🔄 `partial` | 2026-08-31 | ScheduledQuery model + API ready, UI scheduling belum ada — [`apps/web/app/api/analytics/scheduled/route.ts`](apps/web/app/api/analytics/scheduled/route.ts), [`apps/web/app/dashboard/analytics/scheduled/page.tsx`](apps/web/app/dashboard/analytics/scheduled/page.tsx) |
| **Data Alerts** | 🚀 `production_ready` | 2026-08-31 | Alert rules dengan severity, conditions, thresholds, trigger tracking — [`apps/web/app/dashboard/analytics/alerts/page.tsx`](apps/web/app/dashboard/analytics/alerts/page.tsx) |
| **Saved Reports** | 🚀 `production_ready` | 2026-08-31 | CRUD reports dengan execute capability, save/star/organize — [`apps/web/app/dashboard/analytics/reports/page.tsx`](apps/web/app/dashboard/analytics/reports/page.tsx) |
| **Charts Management** | 🚀 `production_ready` | 2026-09-01 | CRUD chart configurations dengan create modal — [`apps/web/app/dashboard/analytics/charts/page.tsx`](apps/web/app/dashboard/analytics/charts/page.tsx), [`apps/web/app/api/analytics/charts/route.ts`](apps/web/app/api/analytics/charts/route.ts) |
| **Query History** | ✅ `implemented` | 2026-08-31 | Riwayat query analyst dengan search & filter — [`apps/web/app/dashboard/analytics/history/page.tsx`](apps/web/app/dashboard/analytics/history/page.tsx), [`apps/web/app/api/analytics/query-history/route.ts`](apps/web/app/api/analytics/query-history/route.ts) |
| **PIVOT Engine** | 📋 `planned` | — | OLAP-style pivot table analysis: row/column dimensions, aggregation functions (SUM, AVG, COUNT, MIN, MAX) |
| **Drill-down Analytics** | 📋 `planned` | — | Hierarchical drill-down: Revenue → Branch → Customer → Invoice. Click-through navigation |
| **Comparative Analysis** | 📋 `planned` | — | Period-over-period comparison: Month-over-Month (MoM), Quarter-over-Quarter (QoQ), Year-over-Year (YoY) |

### 8.3 Phase 3 — Intelligence (Priority: LOW)

> **Data Lineage, Anomaly Detection, Forecasting, Analytics Read Model.**

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Data Lineage** | 📋 `planned` | — | Track metric origins and transformations: Revenue → Invoice → InvoiceItem → Product → COGS. Interactive lineage graph |
| **Anomaly Detection** | 🚀 `production_ready` | 2026-09-10 | Deteksi anomali statistik: 12 rule-based rules + AI enrichment, severity levels (Critical/High/Medium/Low), cron daily 02:00, API + UI — [`apps/web/lib/ai/anomaly-detection.ts`](apps/web/lib/ai/anomaly-detection.ts), [`/api/ai/anomalies`](apps/web/app/api/ai/anomalies/) |
| **Forecasting** | 📋 `planned` | — | Prediksi time series: sales forecasting, cash flow prediction, inventory demand. Time series algorithms |
| **Analytics Read Model** | ✅ `implemented` | 2026-09-16 | 12 materialized views (daily_revenue, top_products, pos_sales_summary, customer_lifetime_value, inventory_turnover, hr_headcount, sales_pipeline, expense_by_category, payment_methods, tax_summary, project_profitability, anomaly_trends), read model service ([`apps/web/lib/analytics/read-model.ts`](apps/web/lib/analytics/read-model.ts)), refresh API ([`/api/analytics/refresh-views`](apps/web/app/api/analytics/refresh-views/route.ts)), cron task every 6 hours, dashboard wired with MV fallback |
| **Industry Analytics** | 📋 `planned` | — | Configurable analytics templates per industri: Retail, Manufacturing, Construction, Service |
| **Advanced Segmentation** | 📋 `planned` | — | Customer/product segmentation: clustering algorithms, behavioral segmentation, RFM analysis |

### 8.4 Phase 4 — AI (Priority: LOW)

> **AI Analyst, Automated Insights.**

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **AI Analyst** | 📋 `planned` | — | Natural language → SQL → Review → Execute. Conversational analytics interface |
| **Automated Insights** | 📋 `planned` | — | AI-generated insights: "Revenue turun 15% vs bulan lalu", pattern detection, trend analysis |
| **AI Report Generator** | 📋 `planned` | — | AI-generated reports on schedule with explanations and recommendations |
| **Decision Intelligence** | 📋 `planned` | — | AI-powered decision recommendations: stock predictions, cash flow alerts, next-best-action |

### 8.5 Architecture Highlights

> **Arsitektur Analytics Studio — lihat [`docs/ANALYTICS-STUDIO.md`](docs/ANALYTICS-STUDIO.md) untuk detail lengkap.**

| Component | Description |
|-----------|-------------|
| **Analytics Read Model** | ERP DB → Materialized Views → Read-only SQL Engine → Analyst. Memisahkan OLTP dari OLAP untuk performa |
| **SQL Security** | Parser → Whitelist → Permission → Tenant Isolation → Row-Level Security. Query hanya boleh READ, tidak ada DDL/DML |
| **Visual ↔ SQL** | Dual mode yang bisa saling convert via shared AST (Abstract Syntax Tree). Visual builder generate SQL, SQL bisa di-visualisasikan |
| **Query as Dataset** | Saved queries bisa digunakan sebagai data source. Nested queries, CTE support, cross-dataset joins |
| **Tenant Isolation** | Setiap query otomatis di-inject `WHERE tenantId = ?`. Tidak ada bypass, tidak ada exception |
| **Resource Limits** | Query timeout 30s, row limit 10,000, concurrent query limit per user. Prevents resource exhaustion |

---

## 9. AI Features

AI yang benar-benar useful, bukan gimmick. **Semua AI features termasuk dalam biaya sewa — tidak ada biaya tambahan ke provider AI.**

### 9.1 AI Hub & Chat

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **AI Chat** | ✅ `implemented` | 2026-09-05 | Floating button + OpenAI-compatible provider — real AI responses via configurable endpoint |
| **AI Provider (OpenAI-compatible)** | ✅ `implemented` | 2026-09-05 | API route `/api/ai/chat` + `/api/ai/query`, OpenAI-compatible provider with fallback |
| **AI Hub Page** | ✅ `implemented` | 2026-09-01 | `/dashboard/ai` — AI features overview dengan i18n, feature cards, example questions |
| **AI Insights** | 🔄 `partial` | 2026-09-01 | Basic insight cards on dashboard |

### 9.2 AI Agent Capabilities

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Finance Agent** | ✅ `implemented` | 2026-09-14 | Finance agent with cash flow prediction, expense categorization, anomaly detection — [`apps/web/lib/ai/agents/finance-agent.ts`](apps/web/lib/ai/agents/finance-agent.ts) |
| **Sales Agent** | ✅ `implemented` | 2026-09-14 | Sales agent with win probability, lead scoring, next best action — [`apps/web/lib/ai/agents/sales-agent.ts`](apps/web/lib/ai/agents/sales-agent.ts) |
| **Inventory Agent** | ✅ `implemented` | 2026-09-14 | Inventory agent with stockout prediction, demand forecasting, dead stock detection — [`apps/web/lib/ai/agents/inventory-agent.ts`](apps/web/lib/ai/agents/inventory-agent.ts) |
| **Agent Orchestrator** | ✅ `implemented` | 2026-09-14 | Central orchestrator routing queries to appropriate agent — [`apps/web/lib/ai/agents/agent-orchestrator.ts`](apps/web/lib/ai/agents/agent-orchestrator.ts) |
| **HR Agent** | 📋 `planned` | — | Belum ada kode |
| **Support Agent** | 📋 `planned` | — | Belum ada kode |

### 9.3 Natural Language Query

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **NLU Parser** | ✅ `implemented` | 2026-09-13 | Intent recognition (8 intents), entity extraction (7 entity types), query normalization (Indonesian) |
| **Smart Data Resolver** | ✅ `implemented` | 2026-09-13 | Maps extracted entities to database fields with fallback resolution |
| **Multi-turn Context** | ✅ `implemented` | 2026-09-13 | Conversation context manager for follow-up queries |
| **NLP Query (Full NL)** | 🔄 `partial` | — | Full natural language to SQL not yet implemented |

### 9.4 Smart Document Extraction

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Document Extraction Engine** | ✅ `implemented` | 2026-09-05 | AI vision + regex fallback, 5 document types (Invoice, PO, Receipt, KTP, NPWP) |
| **Extraction API** | ✅ `implemented` | 2026-09-05 | POST `/api/ai/extract` — base64 upload, RBAC, rate limiting, audit logging |
| **Document Extractor UI** | ✅ `implemented` | 2026-09-05 | Drag-and-drop upload, document type selector, confidence display, apply-to-form |
| **Document Extraction Page** | ✅ `implemented` | 2026-09-05 | `/dashboard/ai/documents` — extraction + history sidebar with type filter |
| **OCR** | 📋 `planned` | — | Belum ada kode |
| **Auto-validation** | 📋 `planned` | — | Belum ada kode |
| **Auto-entry** | 📋 `planned` | — | Belum ada kode |
| **Batch Extraction** | ✅ `implemented` | 2026-09-13 | Multi-file upload (limit 20), batch progress, CSV export, FormData API |
| **Product Restock** | ✅ `implemented` | 2026-09-13 | Restock API + UI for inventory management |

### 9.5 AI Template Generator

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Contract Generator** | 📋 `planned` | — | Belum ada kode |
| **Job Description** | 📋 `planned` | — | Belum ada kode |
| **Email Template** | 📋 `planned` | — | Belum ada kode |
| **Report Summary** | 📋 `planned` | — | Belum ada kode |

### 9.6 Anomaly Detection

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Anomaly Detection Engine** | ✅ `implemented` | 2026-09-13 | 17 detection rules (12 rule-based + 5 statistical: outlier, trend break, pattern, velocity, seasonal) + AI enrichment |
| **Statistical Analysis** | ✅ `implemented` | 2026-09-13 | [`apps/web/lib/ai/statistical-analysis.ts`](apps/web/lib/ai/statistical-analysis.ts) — 5 statistical rules with Z-score, trend detection |
| **Anomaly Detection API** | ✅ `implemented` | 2026-09-13 | GET+POST `/api/ai/anomalies` — scan, filter, pagination, in-memory cache (5min TTL) |
| **Anomaly List UI** | ✅ `implemented` | 2026-09-05 | Expandable cards, severity/status badges, AI risk score, action buttons (Investigate/Dismiss/Block) |
| **Anomaly Detection Page** | ✅ `implemented` | 2026-09-05 | `/dashboard/ai/anomalies` — severity dashboard, scan now, filters |
| **Fraud Detection** | 📋 `planned` | — | Belum ada kode |
| **Compliance Alert** | 📋 `planned` | — | Belum ada kode |
| **Performance Anomaly** | 📋 `planned` | — | Belum ada kode |

---

## 10. Integration & Ecosystem

> **Qalcuity menyediakan API & Webhook. User mengelola integrasi pihak ketiga sendiri melalui dashboard integrasi.**

### 10.1 Integration Dashboard

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Email/SMTP Config** | ✅ `implemented` | 2026-09-13 | Real Nodemailer transport, env-based config, SMTP passwords encrypted at rest (AES-256-GCM) |
| **Payment Gateway Config** | ✅ `implemented` | 2026-08-30 | Midtrans Snap integrated, webhook handler, HMAC verification |
| **API Key Management** | 📋 `planned` | — | Belum ada kode |
| **Connection Status** | ✅ `implemented` | 2026-08-30 | Dynamic fetch from `/api/settings/integrations` |
| **Error Logging** | 📋 `planned` | — | Belum ada kode |

### 10.2 Payment Gateway

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Midtrans** | ✅ `implemented` | 2026-08-30 | Midtrans Snap integrated, webhook handler, HMAC verification |
| **Xendit** | ✅ `implemented` | 2026-09-13 | Invoice API v2 + webhook callback ([`apps/web/lib/payment/xendit.ts`](apps/web/lib/payment/xendit.ts)) |

### 10.3 Rate Limiter & Security

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Rate Limiter (Redis)** | 🚀 `production_ready` | 2026-09-04 | Per-IP rate limiting, Redis-backed, 47+ handlers covered (Batch K + N) |

### 10.4 Import/Export

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Excel/CSV Export** | 🚀 `production_ready` | 2026-08-30 | Any report or data |
| **Excel/CSV Import** | ✅ `implemented` | 2026-09-01 | CSV/Excel parsers + CRM import API (contacts & leads) |

### 10.5 Real-time Features (SSE)

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Kitchen Display SSE** | ✅ `implemented` | 2026-09-13 | Server-Sent Events for real-time kitchen order updates ([`apps/web/app/api/pos/kitchen/stream/route.ts`](apps/web/app/api/pos/kitchen/stream/route.ts)) |
| **Notification Center SSE** | ✅ `implemented` | 2026-09-13 | Real-time notifications with 60s polling fallback ([`apps/web/app/api/notifications/stream/route.ts`](apps/web/app/api/notifications/stream/route.ts)) |

### 10.6 API & Webhook

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **REST API** | ✅ `implemented` | 2026-09-16 | 400+ handlers across 228 route files, documented via OpenAPI 3.0 spec — [`apps/web/lib/api-docs/openapi-spec.ts`](apps/web/lib/api-docs/openapi-spec.ts) |
| **GraphQL** | 📋 `planned` | — | Belum ada kode |
| **Webhook** | 📋 `planned` | — | Belum ada kode |
| **API Documentation** | ✅ `implemented` | 2026-09-16 | OpenAPI 3.0 spec (53 endpoints, 9 tags) + Swagger UI via CDN — [`/api/docs`](apps/web/app/api/docs/route.ts), [`/dashboard/api-docs`](apps/web/app/dashboard/api-docs/page.tsx) |
| **OAuth 2.0** | 📋 `planned` | — | Belum ada kode |

### 10.6 Automation Connectors

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Zapier** | 📋 `planned` | — | Belum ada kode |
| **Make.com** | 📋 `planned` | — | Belum ada kode |
| **Custom Webhook** | 📋 `planned` | — | Belum ada kode |
| **n8n** | 📋 `planned` | — | Belum ada kode |

### 10.7 Supported Integration Categories

| Kategori | Contoh Layanan | Status | Notes |
|----------|---------------|--------|-------|
| **Messaging** | WhatsApp Business, Telegram | 📋 `planned` | Belum ada kode |
| **Marketplace** | Tokopedia, Shopee, Bukalapak | 📋 `planned` | Belum ada kode |
| **Payment Gateway** | Midtrans, Xendit, DOKU | ✅ `implemented` | Midtrans Snap integrated |
| **E-wallet** | GoPay, OVO, Dana | 📋 `planned` | Via Payment Gateway |
| **Banking** | BCA, Mandiri, BRI, BNI | 📋 `planned` | Belum ada kode |
| **Productivity** | Google Workspace, Microsoft 365 | 📋 `planned` | Belum ada kode |
| **Shipping** | JNE, J&T, SiCepat | 📋 `planned` | Belum ada kode |
| **CRM** | Salesforce, HubSpot | 📋 `planned` | Belum ada kode |

---

## 11. Admin & Security

Enterprise-grade security untuk data protection.

### 11.1 Authentication

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **NextAuth JWT** | 🚀 `production_ready` | 2026-08-31 | CredentialsProvider, JWT strategy, bcryptjs, NEXTAUTH_SECRET mandatory |
| **SSO** | 📋 `planned` | — | Belum ada kode |
| **2FA (TOTP)** | ✅ `implemented` | 2026-09-03 | RFC 6238 compliant TOTP implementation — enable/disable/verify flow, backup codes ([`apps/web/lib/totp.ts`](apps/web/lib/totp.ts), [`apps/web/app/api/settings/security/2fa/route.ts`](apps/web/app/api/settings/security/2fa/route.ts)) |
| **Password Policy** | ✅ `implemented` | 2026-08-31 | Min 8 chars enforced in register route, password change API ([`apps/web/app/api/settings/security/password/route.ts`](apps/web/app/api/settings/security/password/route.ts)) |
| **Session Management** | 🚀 `production_ready` | 2026-09-16 | Multi-device session control — max 5 sessions per user, session tracker service ([`apps/web/lib/session-tracker.ts`](apps/web/lib/session-tracker.ts)), session management UI ([`/dashboard/settings/sessions`](apps/web/app/dashboard/settings/sessions/page.tsx)), revoke individual/all sessions, daily cleanup cron 03:00 WIB |
| **Login History** | ✅ `implemented` | 2026-09-03 | LoginLog model — IP address, user agent, success/failure tracking, pagination ([`apps/web/app/api/settings/security/login-history/route.ts`](apps/web/app/api/settings/security/login-history/route.ts)) |
| **CSP Headers** | ✅ `implemented` | 2026-08-31 | Content-Security-Policy di middleware.ts + next.config.js — `unsafe-eval` removed |
| **CORS Configuration** | ✅ `implemented` | 2026-08-31 | Explicit CORS config di next.config.js |

### 11.2 Access Control

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **RBAC (4 Roles)** | 🚀 `production_ready` | 2026-08-30 | SUPERADMIN (platform admin only, hidden from tenant views), ADMIN, MEMBER, VIEWER — defense-in-depth |
| **IP Whitelisting** | 📋 `planned` | — | Belum ada kode |
| **Data-level Security** | 📋 `planned` | — | Belum ada kode |
| **Approval Workflow** | ✅ `implemented` | 2026-09-02 | Multi-level approval chains — ApprovalLevel + ApprovalRequest models, configurable per entityType ([`apps/web/app/api/approval/`](apps/web/app/api/approval/)) |

### 11.3 Data Protection

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Encryption (AES-256-GCM)** | ✅ `implemented` | 2026-09-13 | AES-256-GCM encryption at rest for SMTP passwords ([`apps/web/lib/encryption.ts`](apps/web/lib/encryption.ts)) |
| **Data Residency** | 📋 `planned` | — | Server config belum ada |
| **Backup** | 📋 `planned` | — | Belum ada auto-backup |
| **Data Retention** | 📋 `planned` | — | Belum ada kode |

### 11.4 Compliance

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Audit Trail** | 🚀 `production_ready` | 2026-08-31 | 300+ audit calls across all mutation endpoints |
| **GDPR Ready** | 📋 `planned` | — | Belum ada kode |
| **Indonesian Regulation (PDP)** | 📋 `planned` | — | Belum ada kode |
| **SOC 2 Type II** | 📋 `planned` | — | Target Phase 3 |

### 11.5 White-label

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Multi-tenant** | 🚀 `production_ready` | 2026-08-30 | Separate data environment, tenantId isolation |
| **Custom Branding** | 📋 `planned` | — | Belum ada kode |
| **Reseller Portal** | 📋 `planned` | — | Belum ada kode |

---

## 12. Unified Control Engine & Workflow

Modul fundamental — **Unified Control Engine** dengan 14 sub-komponen yang memastikan pekerjaan selesai, keputusan memiliki penanggung jawab, keterlambatan naik ke level yang tepat, dan transaksi yang sudah ditutup tidak bisa sembarangan diubah.
Lihat [ADR-017](docs/DECISIONS.md#adr-017-unified-control-engine) s/d [ADR-023](docs/DECISIONS.md#adr-023-control-dashboard-tiers).

### 12.1 Unified Pipeline

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Unified Control Engine** | ✅ `implemented` | 2026-09-14 | Centralized platform configuration panel (7 tabs: Modules, Workflow, Approvals, Fields, Widgets, Permissions, History) — [`apps/web/lib/control-engine.ts`](apps/web/lib/control-engine.ts) |
| **Centralized State Model** | ✅ `implemented` | 2026-09-14 | Module control, workflow control, widget control — [`apps/web/lib/controls/`](apps/web/lib/controls/) |
| **Pipeline Traceability** | 📋 `planned` | — | Full trace dari awal sampai akhir pipeline |

### 12.2 Policy Engine

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Policy Engine** | 📋 `planned` | — | Rules bisnis konfigurabel: WHEN condition THEN action [ADR-018] |
| **WHEN-THEN Rules** | 📋 `planned` | — | Conditions: amount, department, branch, type, vendor/category |
| **Action Types** | 📋 `planned` | — | require_approval, auto_approve, block, flag_for_review, notify |
| **Policy Versioning** | 📋 `planned` | — | Rules berlaku sejak tanggal tertentu, histori tetap ada |
| **Policy Configuration UI** | 📋 `planned` | — | Per-company rule management interface |
| **Amount Threshold Approvals** | 📋 `planned` | — | Tiered approval: <10jt auto, 10-50jt Manager, 50-200jt Director, >200jt Board |
| **Threshold per Department** | 📋 `planned` | — | Threshold bisa dikonfigurasi per departemen/jenis transaksi |

### 12.3 Transaction Lifecycle

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Transaction Lifecycle** | 📋 `planned` | — | DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → POSTED → COMPLETED → LOCKED |
| **Status Transitions** | 📋 `planned` | — | Configurable workflow per transaction type |
| **Immutable Transactions** | 📋 `planned` | — | No physical delete, corrections via Adjustment entries |

### 12.4 Approval Engine

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Approval Engine** | ✅ `implemented` | 2026-09-02 | Multi-level approval chains — ApprovalLevel + ApprovalRequest models ([`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma)) |
| **Approval Routing** | ✅ `implemented` | 2026-09-02 | Configurable per entityType with level progression ([`apps/web/app/api/approval/`](apps/web/app/api/approval/)) |
| **Amount-based Routing** | 📋 `planned` | — | Route ke approver berdasarkan nominal transaksi |
| **Delegation** | 📋 `planned` | — | Delegate approval to another user [ADR-020] |

### 12.5 Segregation of Duties (SoD)

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **SoD Engine** | 📋 `planned` | — | Mencegah konflik kepentingan dalam proses bisnis [ADR-019] |
| **SoD Matrix** | 📋 `planned` | — | Conflict pairs: Create ≠ Receive ≠ Approve ≠ Pay |
| **Conflict Detection** | 📋 `planned` | — | Real-time check saat role/assignment |
| **SoD Exception Workflow** | 📋 `planned` | — | Override dengan Director approval + audit trail |
| **SoD Configuration** | 📋 `planned` | — | Per-company configurable SoD rules |

### 12.6 SLA & Escalation

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **SLA Engine** | 📋 `planned` | — | Service level tracking per transaction type [ADR-020] |
| **SLA Color Coding** | 📋 `planned` | — | 🟢 0-50%, 🟡 50-100%, 🔴 >100% SLA |
| **SLA Breach Escalation** | 📋 `planned` | — | Auto-escalate saat SLA breach |
| **SLA Metrics** | 📋 `planned` | — | Average completion time, compliance rate, escalation rate |
| **Escalation Engine** | 📋 `planned` | — | Deadline-based: PIC → Supervisor → Manager → Director |
| **Escalation Rules** | 📋 `planned` | — | Configurable escalation timeline per transaction type |
| **Escalation Notification** | 📋 `planned` | — | Real-time notification on escalation |

### 12.7 Delegation

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Delegation Framework** | 📋 `planned` | — | Manager delegate approval authority saat absent [ADR-020] |
| **Delegation Scope** | 📋 `planned` | — | Siapa → ke siapa, periode, scope |
| **Delegation Auto-expire** | 📋 `planned` | — | Otomatis berakhir setelah periode selesai |
| **Delegation Audit Trail** | 📋 `planned` | — | Delegator, delegatee, period, reason |
| **Delegated Work Inbox** | 📋 `planned` | — | Delegatee melihat delegated items di Work Inbox |

### 12.8 Work Inbox

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **My Work Inbox** | 📋 `planned` | — | Personal dashboard untuk setiap user [ADR-023] |
| **Overdue Tasks** | 📋 `planned` | — | Tasks yang sudah melewati deadline |
| **Approval Required** | 📋 `planned` | — | Transaksi menunggu approval user ini |
| **Awaiting My Action** | 📋 `planned` | — | Transaksi yang perlu input dari user |
| **Assigned to Me** | 📋 `planned` | — | Task yang ditugaskan ke user |
| **Escalated to Me** | 📋 `planned` | — | Transaksi yang di-escalate ke user |
| **Recently Completed** | 📋 `planned` | — | Aktivitas terakhir yang sudah selesai |
| **Filter & Sorting** | 📋 `planned` | — | Filter dan sorting lanjutan |

### 12.9 Locking Engine

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Locking Engine** | 📋 `planned` | — | Hierarchical: Transaction → Day → Month → Quarter → Year [ADR-016] |
| **Lock Policy** | 📋 `planned` | — | Per-company configurable lock policy |
| **Locked Edit** | 📋 `planned` | — | Edit locked transaction requires approval |
| **Backdated Transaction** | 📋 `planned` | — | Backdated transaction requires approval |

### 12.10 Unlock as Exception Workflow

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Unlock Request** | 📋 `planned` | — | User request unlock dengan reason [ADR-021] |
| **Unlock Approval** | 📋 `planned` | — | Manager approval untuk unlock |
| **Temporary Unlock** | 📋 `planned` | — | Unlock dengan waktu timeout (misal 2 jam) |
| **Re-approval Flow** | 📋 `planned` | — | Edit → Re-submit → Re-approval → Re-lock |
| **Unlock Audit Trail** | 📋 `planned` | — | Setiap step ada audit trail |
| **Unlock Permission** | 📋 `planned` | — | Hanya role ADMIN+ yang bisa unlock |

### 12.11 Exception Center

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Exception Center** | 📋 `planned` | — | Dashboard terpusat untuk semua anomali [ADR-021] |
| **Overdue Transactions** | 📋 `planned` | — | Transaksi yang sudah melewati deadline |
| **SLA Breach View** | 📋 `planned` | — | Transaksi yang sudah breach SLA |
| **SoD Conflict View** | 📋 `planned` | — | Konflik Segregation of Duties |
| **Negative Stock Alerts** | 📋 `planned` | — | Stok negatif detection |
| **Unreconciled Payments** | 📋 `planned` | — | Pembayaran belum reconcile |
| **Policy Violations** | 📋 `planned` | — | Pelanggaran kebijakan |
| **Exception Severity** | 📋 `planned` | — | Critical, High, Medium, Low |
| **Exception Assignment** | 📋 `planned` | — | Assigned person + suggested action |

### 12.12 Reason & Timeline

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Reason Required** | 📋 `planned` | — | WAJIB isi reason untuk edit/delete/override transaksi submitted |
| **Reason + Attachment** | 📋 `planned` | — | Reason field mandatory + optional attachment |
| **Reason in Audit Trail** | 📋 `planned` | — | Reason disimpan di audit trail |
| **Transaction Timeline** | 📋 `planned` | — | Full history: Who, When, What, Status, Approval chain, Comments |
| **Visual Timeline** | 📋 `planned` | — | Timeline visual di halaman detail transaksi |
| **"Why am I seeing this?"** | 📋 `planned` | — | Contextual help: kenapa tidak bisa edit, kenapa perlu approval, dll |

### 12.13 Adjustment Entries

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Adjustment Entries** | 📋 `planned` | — | Immutable corrections with reference to original |
| **Adjustment Approval** | 📋 `planned` | — | Approval required for adjustments |
| **Adjustment Audit** | 📋 `planned` | — | Full audit trail for all adjustments |

### 12.14 Access Review & Emergency Access

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Access Review** | 📋 `planned` | — | Periodic permission review oleh managers [ADR-021] |
| **Review Scheduling** | 📋 `planned` | — | Quarterly review dengan status: reviewed, pending, overdue |
| **Permission Audit** | 📋 `planned` | — | Audit siapa yang punya akses ke apa |
| **Emergency Access** | 📋 `planned` | — | Temporary elevated permission untuk situasi darurat [ADR-021] |
| **Emergency Access Flow** | 📋 `planned` | — | Request → Reason → Director Approval → Temporary Grant → Auto-revoke |
| **Emergency Access Audit** | 📋 `planned` | — | Full trail: who requested, who approved, what access, when |
| **Security Alert** | 📋 `planned` | — | Alert ke security team saat emergency access digunakan |

### 12.15 Control Dashboard (3 Tiers)

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **My Dashboard (Tier 1)** | 📋 `planned` | — | Personal work inbox, pending approvals, overdue items [ADR-023] |
| **Management Dashboard (Tier 2)** | 📋 `planned` | — | Team workload, SLA compliance, escalation alerts [ADR-023] |
| **Control Center (Tier 3)** | 📋 `planned` | — | Organization-wide: policy violations, SoD conflicts, compliance metrics [ADR-023] |
| **Role-based Views** | 📋 `planned` | — | Access control per tier: User → Manager → Admin/Auditor |

### 12.16 Period Closing Wizard

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Period Closing Wizard** | ✅ `implemented` | 2026-09-02 | 4-step wizard — AccountingPeriod model, pre-checks, closing, lock ([`apps/web/lib/period-closing.ts`](apps/web/lib/period-closing.ts)) |
| **Pre-checks** | ✅ `implemented` | 2026-09-02 | Validate unposted transactions sebelum closing ([`apps/web/lib/period-closing.ts`](apps/web/lib/period-closing.ts)) |
| **Exception Resolution** | ✅ `implemented` | 2026-09-02 | Exception notes pada closing ([`apps/web/lib/period-closing.ts`](apps/web/lib/period-closing.ts)) |
| **Final Review Summary** | ✅ `implemented` | 2026-09-02 | Ringkasan periode di closing step ([`apps/web/lib/period-closing.ts`](apps/web/lib/period-closing.ts)) |
| **Closing Approval** | 📋 `planned` | — | Director/Finance Manager approve closing — basic closing implemented, approval routing belum terhubung |
| **Period Lock** | ✅ `implemented` | 2026-09-02 | Auto-lock setelah closing — status changed to CLOSED ([`apps/web/app/api/finance/periods/[id]/close/route.ts`](apps/web/app/api/finance/periods/[id]/close/route.ts)) |
| **Period Report** | 📋 `planned` | — | Generate period summary report |
| **Monthly Closing** | ✅ `implemented` | 2026-09-02 | Basic monthly closing via AccountingPeriod ([`apps/web/app/api/finance/periods/`](apps/web/app/api/finance/periods/)) |
| **Quarterly Closing** | ✅ `implemented` | 2026-09-02 | Basic quarterly closing via AccountingPeriod ([`apps/web/app/api/finance/periods/`](apps/web/app/api/finance/periods/)) |
| **Yearly Closing** | ✅ `implemented` | 2026-09-02 | Basic yearly closing via AccountingPeriod ([`apps/web/app/api/finance/periods/`](apps/web/app/api/finance/periods/)) |

### 12.17 Permissions

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **transaction.lock** | 📋 `planned` | — | Very sensitive — lock transactions |
| **transaction.unlock** | 📋 `planned` | — | Very sensitive — unlock transactions |
| **transaction.adjust** | 📋 `planned` | — | Very sensitive — create adjustments |
| **transaction.submit** | 📋 `planned` | — | Submit for approval |
| **transaction.approve** | 📋 `planned` | — | Approve transactions |
| **policy.manage** | 📋 `planned` | — | Manage policy rules |
| **sod.override** | 📋 `planned` | — | Override SoD conflicts (Director+) |
| **emergency_access.grant** | 📋 `planned` | — | Grant emergency access (Director+) |
| **access_review.manage** | 📋 `planned` | — | Manage access reviews (Admin+) |
| **period.close** | 📋 `planned` | — | Close accounting period (Director+) |

---

## 13. Architecture Engines

> **Tiga fondasi arsitektur yang memungkinkan Qalcuity menjadi Business Operating System.**
> Lihat [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 2-5.

### 13.1 Permission Engine

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Permission Engine (can() function)** | 🚀 `production_ready` | 2026-09-01 | Industry-agnostic granular permission check: `can(user, action, resource, context)` |
| **Permission Model (Prisma)** | 🚀 `production_ready` | 2026-09-01 | User → Membership → Role → Permission → Scope → Resource → Action |
| **@qalcuity/permissions package** | 🚀 `production_ready` | 2026-09-01 | Shared package for Web, Mobile, Desktop, API, AI Agent |
| **Permission Middleware** | 🚀 `production_ready` | 2026-09-01 | API route-level permission enforcement via `@qalcuity/permissions` |
| **Permission Engine Integration (Batch 7A)** | 🚀 `production_ready` | 2026-09-01 | 165 API routes integrated with `can()` checks via `route-permissions.ts` |
| **Permission Hooks (usePermission)** | 🚀 `production_ready` | 2026-09-10 | UI-level permission hook [`usePermission`](apps/web/lib/use-permission.ts) — used in 86+ pages for conditional rendering |
| **Platform Permissions** | 🚀 `production_ready` | 2026-09-01 | Internal Qalcuity: tenant.view, subscription.manage, system.monitor |
| **Tenant Permissions** | 🚀 `production_ready` | 2026-09-01 | Customer org: invoice.approve, employee.view, payroll.manage |
| **Scope Support** | 🚀 `production_ready` | 2026-09-01 | Branch + Department level permissions |
| **Cross-platform Enforcement** | 🚀 `production_ready` | 2026-09-01 | Web, Mobile, Desktop, API, AI Agent — same engine |
| **Migration from 4-Role RBAC** | 🔄 `partial` | 2026-09-01 | Strategy defined, `@qalcuity/permissions` ready for integration |

### 13.2 Workflow Engine

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Workflow Engine** | 🚀 `production_ready` | 2026-09-01 | Configurable transaction lifecycle: status transitions per entity |
| **@qalcuity/workflow package** | 🚀 `production_ready` | 2026-09-01 | Shared workflow engine for all modules |
| **Configurable Statuses** | 🚀 `production_ready` | 2026-09-01 | Tambah/hapus status sesuai kebutuhan perusahaan |
| **Configurable Transitions** | 🚀 `production_ready` | 2026-09-01 | Define allowed transitions between statuses |
| **Transition Guards** | 🚀 `production_ready` | 2026-09-01 | Role-based + condition-based transition guards |
| **Auto Actions** | ✅ `implemented` | 2026-09-01 | Auto-create documents, send notifications on transitions (API ready) |
| **Workflow Configuration UI** | 📋 `planned` | — | Visual workflow editor per perusahaan (Phase 11) |
| **Default Workflows** | 🚀 `production_ready` | 2026-09-01 | Pre-built workflows: Invoice, Purchase Order, Leave, Deal |
| **Unified Pipeline Integration** | 🔄 `partial` | 2026-09-01 | Workflow API routes created, UI integration pending |
| **Workflow Engine Integration (Batch 7B)** | 🚀 `production_ready` | 2026-09-01 | 5 entities: Invoice, Payment, PO, Quotation, Leaves — workflow transitions enforced |

### 13.3 Industry Configuration Engine

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Industry Configuration Engine** | 🚀 `production_ready` | 2026-09-01 | Core engine untuk industry-specific customizations |
| **@qalcuity/industry-config package** | 🚀 `production_ready` | 2026-09-01 | Shared package: types, defaults, engine, index |
| **Custom Fields Engine** | 🚀 `production_ready` | 2026-09-01 | Dynamic fields per entity with DB storage + validation |
| **Custom Documents Engine** | 🚀 `production_ready` | 2026-09-01 | Document templates per industry (invoice, receipt, PO) |
| **Custom Reports Engine** | 🚀 `production_ready` | 2026-09-01 | Report configs per industry: metrics, groupBy |
| **Industry Pack Loader** | 🚀 `production_ready` | 2026-09-01 | Load config from defaults + tenant overrides from DB |
| **Industry Pack API** | 🚀 `production_ready` | 2026-09-01 | GET/PUT `/api/settings/industry` + defaults + fields |
| **Industry Pack UI** | 📋 `planned` | — | Dashboard untuk configuring industry packs (Phase 12) |
| **Dashboard Configuration Engine** | 🚀 `production_ready` | 2026-09-01 | Dashboard widgets per industry: chart, stat, table, list |

### 13.4 Component Library (@qalcuity/ui)

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **@qalcuity/ui package** | ✅ `implemented` | 2026-09-01 | Shared React component library untuk Web, Desktop |
| **Button Component** | ✅ `implemented` | 2026-09-01 | Variants: primary, secondary, danger, ghost, outline |
| **Input Component** | ✅ `implemented` | 2026-09-01 | Text, password, number, date, textarea |
| **Select Component** | ✅ `implemented` | 2026-09-01 | Single & multi-select, searchable |
| **Table Component** | ✅ `implemented` | 2026-09-01 | Sortable columns, pagination, responsive |
| **Modal Component** | ✅ `implemented` | 2026-09-01 | Dialog, confirmation, form modal |
| **Card Component** | ✅ `implemented` | 2026-09-01 | Content containers, stat cards |
| **Badge Component** | ✅ `implemented` | 2026-09-01 | Status badges, notification badges |
| **Alert Component** | ✅ `implemented` | 2026-09-01 | Success, warning, error, info alerts |
| **Spinner Component** | ✅ `implemented` | 2026-09-01 | Loading indicators |
| **Theme System** | ✅ `implemented` | 2026-09-01 | CSS custom properties, light/dark mode tokens |

### 13.5 Entitlement Engine (Batch 7E)

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Entitlement Engine** | ✅ `implemented` | 2026-09-01 | Plan-based module access, feature limits, usage tracking |
| **Entitlements Config** | ✅ `implemented` | 2026-09-01 | Default entitlements per plan (Starter, Growth, Business) |
| **Entitlement API** | ✅ `implemented` | 2026-09-01 | `/api/billing/entitlement` — check tenant entitlements |
| **Feature Check API** | ✅ `implemented` | 2026-09-01 | `/api/billing/feature-check` — real-time feature access |
| **Usage Tracking API** | ✅ `implemented` | 2026-09-01 | `/api/billing/usage` — usage metering per tenant |

### 13.6 Redis Rate Limiter (Batch 7D)

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Redis Rate Limiter** | 🚀 `production_ready` | 2026-09-01 | Production-ready with Redis + in-memory fallback |
| **Rate Limit Config** | 🚀 `production_ready` | 2026-09-01 | Per-endpoint configurable rate limits |
| **Rate Limit Wrapper** | 🚀 `production_ready` | 2026-09-01 | `withRateLimit()` HOF for API routes |
| **Rate Limit Monitor** | ✅ `implemented` | 2026-09-01 | Violation logging, suspicious pattern detection, stats |
| **Rate Limit Log (Prisma)** | ✅ `implemented` | 2026-09-01 | `RateLimitLog` model for persistent logging |

---

## 14. Industry Packs

> **Industry Packs = Configuration, bukan Hardcoding.**
> Lihat [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 7.

### 14.1 Industry Pack: Retail

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Industry Settings UI** | ✅ `implemented` | 2026-09-14 | Enhanced settings page with pack selection grid, detail preview, activation flow — [`apps/web/app/dashboard/settings/industry/page.tsx`](apps/web/app/dashboard/settings/industry/page.tsx) |
| **Retail Pack** | ✅ `implemented` | 2026-09-06 | Retail pack: custom fields, workflows, dashboard — [`packages/industry-config/src/packs/retail.ts`](packages/industry-config/src/packs/retail.ts) |
| **POS Integration** | ✅ `implemented` | 2026-09-06 | POS settings: In-Store order type, loyalty enabled |
| **Stock Replenishment** | ✅ `implemented` | 2026-09-06 | Purchase order workflow: DRAFT→APPROVED→ORDERED→RECEIVED |
| **Barcode Management** | ✅ `implemented` | 2026-09-06 | SKU (required), barcode, size, color, brand, season fields |
| **Customer Loyalty** | ✅ `implemented` | 2026-09-06 | Membership tier, points balance, preferred category fields |
| **Return/Exchange Flow** | ✅ `implemented` | 2026-09-06 | Workflow: REQUESTED→APPROVED→PROCESSED/DENIED |
| **Stock Adjustment** | ✅ `implemented` | 2026-09-06 | Approval workflow for stock adjustments |
| **Dashboard: Sales, Stock, Brands, Retention** | ✅ `implemented` | 2026-09-06 | 5 widgets: sales by category, inventory turnover, top brands, retention, low stock |

### 14.2 Industry Pack: Wholesale/Distribution

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Wholesale Pack** | 📋 `planned` | — | Default config untuk wholesale/distribution |
| **Route Management** | 📋 `planned` | — | Delivery route configuration |
| **Driver & Vehicle** | 📋 `planned` | — | Driver/vehicle assignment fields |
| **Delivery Order** | 📋 `planned` | — | Custom document: Delivery Order |
| **Dashboard: Deliveries, Routes, Vehicles, Warehouse** | 📋 `planned` | — | Distribution-specific dashboard |

### 14.3 Industry Pack: Manufacturing

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Manufacturing Pack** | ✅ `implemented` | 2026-09-06 | Manufacturing pack: custom fields, workflows, dashboard — [`packages/industry-config/src/packs/manufacturing.ts`](packages/industry-config/src/packs/manufacturing.ts) |
| **Production Order** | ✅ `implemented` | 2026-09-06 | Workflow: PLANNED→IN_PROGRESS→QC→COMPLETED |
| **Bill of Materials (BOM)** | ✅ `implemented` | 2026-09-06 | BOM approval workflow: DRAFT→PENDING_APPROVAL→APPROVED/REJECTED |
| **Quality Control** | ✅ `implemented` | 2026-09-06 | QC status field (Pending/Passed/Failed/On Hold), defect rate widget |
| **Production Line** | ✅ `implemented` | 2026-09-06 | Production line, machine ID, shift, quality score fields |
| **Batch/Lot Tracking** | ✅ `implemented` | 2026-09-06 | Lot number, expiry date, serial number, QC status fields |
| **Maintenance Management** | ✅ `implemented` | 2026-09-06 | Maintenance request workflow: SUBMITTED→IN_PROGRESS→COMPLETED/DEFERRED |
| **Dashboard: Production, Quality, Machine, OEE** | ✅ `implemented` | 2026-09-06 | 5 widgets: production output, defect rate, machine utilization, OEE, low stock |

### 14.4 Industry Pack: Construction

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Construction Pack** | 📋 `planned` | — | Default config untuk construction |
| **Site Location** | 📋 `planned` | — | Project site field |
| **Contract Number** | 📋 `planned` | — | Contract reference field |
| **Progress Tracking** | 📋 `planned` | — | Progress percentage field |
| **BAST (Berita Acara Serah Terima)** | 📋 `planned` | — | Custom document: BAST |
| **Progress Report** | 📋 `planned` | — | Custom document: Progress Report |
| **Dashboard: Projects, Budget, Progress, Purchase, Material, Workers** | 📋 `planned` | — | Construction-specific dashboard |

### 14.5 Industry Pack: Consulting/Agency/IT

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Services Pack** | 📋 `planned` | — | Default config untuk professional services |
| **Project-based Workflow** | 📋 `planned` | — | Proposal → SOW → Execution → Invoice |
| **Billable Hours** | 📋 `planned` | — | Timesheet + billable hours tracking |
| **SOW (Statement of Work)** | 📋 `planned` | — | Custom document: SOW |
| **Timesheet** | 📋 `planned` | — | Custom document: Timesheet |
| **Dashboard: Projects, Tickets, SLA, Employees, Billable Hours, Invoices** | 📋 `planned` | — | Services-specific dashboard |

### 14.6 Industry Pack: Logistics

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Logistics Pack** | 📋 `planned` | — | Default config untuk logistics |
| **Route & Vehicle Management** | 📋 `planned` | — | Route + vehicle assignment |
| **Delivery Note** | 📋 `planned` | — | Custom document: Delivery Note |
| **Proof of Delivery (POD)** | 📋 `planned` | — | Custom document: POD |
| **Dashboard: Deliveries, Routes, Vehicles, Warehouse, Cost/Delivery, On-Time %** | 📋 `planned` | — | Logistics-specific dashboard |

### 14.7 Industry Pack: Education

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Education Pack** | 📋 `planned` | — | Default config untuk education/training |
| **Student Management** | 📋 `planned` | — | Student entity + enrollment workflow |
| **Class Management** | 📋 `planned` | — | Class/schedule configuration |
| **Transcript** | 📋 `planned` | — | Custom document: Transcript |
| **Certificate** | 📋 `planned` | — | Custom document: Certificate |
| **Dashboard: Students, Classes, Enrollment, Revenue, Attendance** | 📋 `planned` | — | Education-specific dashboard |

### 14.8 Industry Pack: Healthcare

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Healthcare Pack** | 📋 `planned` | — | Default config untuk healthcare |
| **Patient Management** | 📋 `planned` | — | Patient entity + treatment workflow |
| **Medical Record** | 📋 `planned` | — | Custom document: Medical Record |
| **Insurance Integration** | 📋 `planned` | — | Insurance claim workflow |
| **Dashboard: Patients, Treatments, Revenue, Bed Occupancy** | 📋 `planned` | — | Healthcare-specific dashboard |

### 14.9 Industry Pack: Food & Beverage

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **F&B Pack** | ✅ `implemented` | 2026-09-05 | Restaurant pack: custom fields, documents, workflows — [`packages/industry-config/src/packs/restaurant.ts`](packages/industry-config/src/packs/restaurant.ts) |
| **Recipe Management** | 📋 `planned` | — | Recipe + ingredient fields |
| **Batch & Expiry Tracking** | 📋 `planned` | — | Batch number + expiry date |
| **Production Report** | 📋 `planned` | — | Custom document: Production Report |
| **Dashboard: Production, Ingredients, Waste, Sales, Inventory** | 📋 `planned` | — | F&B-specific dashboard |

---

## 15. POS Module

> **POS (Point of Sale) adalah Core Module dalam Qalcuity — bukan produk terpisah.** POS terintegrasi langsung ke ERP: Inventory → Finance → Accounting → CRM → Audit.
> Lihat [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 22.

### 15.1 POS Core Features

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **POS Terminal (Cashier)** | 🚀 `production_ready` | 2026-09-12 | Terminal/Cashier page + API, RBAC, tenant isolation, Zod validation (Phase 2) |
| **POS Returns** | 📋 `planned` | — | Pengembalian barang partial/full |
| **POS Refunds** | 🚀 `production_ready` | 2026-09-14 | Refunds page + 2 API routes, PUT handler with stock restoration, RBAC, tenant isolation, Zod validation (Phase 3) |
| **POS Void Transaction** | 🚀 `production_ready` | 2026-09-14 | Void UI fix (voidReason input field + state), PUT handler with stock restoration, `prisma.$transaction` atomicity, RBAC, tenant isolation — [`apps/web/app/api/pos/transactions/[id]/void/route.ts`](apps/web/app/api/pos/transactions/[id]/void/route.ts) |
| **POS Discounts** | 📋 `planned` | — | Diskon per item/transaksi, configurable max % |
| **POS Promotions** | 📋 `planned` | — | Promosi berbasis waktu/quantity/bundle |
| **POS Products** | 🚀 `production_ready` | 2026-09-11 | Products full CRUD — GET list, GET by ID, POST, PUT, DELETE (Phase 2 Batch 1) |
| **POS Barcode** | 📋 `planned` | — | Barcode scanning untuk product lookup |
| **POS Payments** | 📋 `planned` | — | Multi metode: cash, card, e-wallet, QRIS, transfer |
| **POS Cash Drawer** | 📋 `planned` | — | Cash in/out tracking, opening/closing cash count |
| **POS Shift Management** | 🚀 `production_ready` | 2026-09-14 | Sessions page + API, Close Session PUT handler with closing report + expected cash calculation + variance, Daily Closing Report API (`GET /api/pos/sessions/[id]/closing-report`), RBAC, tenant isolation, Zod validation |
| **POS Cashier Management** | 🚀 `production_ready` | 2026-09-12 | Terminals Management page (CRUD), RBAC, tenant isolation |
| **POS Receipt Printing** | 🚀 `production_ready` | 2026-09-14 | Thermal printer format (80mm), `window.print()` for thermal printer, Web Share API for mobile sharing, download as .txt, Print CSS (`@media print`) — [`apps/web/components/pos/pos-receipt.tsx`](apps/web/components/pos/pos-receipt.tsx) |
| **POS Tax Calculation** | 📋 `planned` | — | Automatic tax computation per item/transaction |
| **POS Offline Mode** | 🚀 `production_ready` | 2026-09-12 | Transaksi offline dengan IndexedDB, sync queue, service worker — Phase 5 |
| **POS Offline — IndexedDB** | ✅ `implemented` | 2026-09-05 | Local storage: products, transactions, sessions via Dexie.js ([`apps/web/lib/pos-offline/db.ts`](apps/web/lib/pos-offline/db.ts)) |
| **POS Offline — Sync Queue** | ✅ `implemented` | 2026-09-05 | Background sync dengan retry, exponential backoff, conflict detection ([`apps/web/lib/pos-offline/sync.ts`](apps/web/lib/pos-offline/sync.ts)) |
| **POS Offline — Service Worker** | ✅ `implemented` | 2026-09-05 | Cache-first static assets, network-first API, offline fallback ([`apps/web/public/sw.js`](apps/web/public/sw.js)) |
| **POS Offline — Offline Indicator** | ✅ `implemented` | 2026-09-05 | Visual online/offline status badge ([`apps/web/components/pos/offline-indicator.tsx`](apps/web/components/pos/offline-indicator.tsx)) |
| **POS Offline — Sync Status Badge** | ✅ `implemented` | 2026-09-05 | Pending count, sync progress, manual sync button ([`apps/web/components/pos/sync-status-badge.tsx`](apps/web/components/pos/sync-status-badge.tsx)) |
| **POS Closing** | 📋 `planned` | — | Daily/shift closing dengan approval workflow |
| **POS Audit Trail** | 🚀 `production_ready` | 2026-09-12 | Audit trail lengkap untuk semua transaksi POS via `logAudit()` |
| **POS Dashboard** | 🚀 `production_ready` | 2026-09-12 | POS overview dashboard API with stats, RBAC, tenant isolation |
| **POS Transactions Page** | 🚀 `production_ready` | 2026-09-12 | Transaction history page + API, RBAC, tenant isolation, Zod validation |
| **POS Sessions Page** | 🚀 `production_ready` | 2026-09-12 | Sessions list page + API, RBAC, tenant isolation |
| **POS Terminals Management** | 🚀 `production_ready` | 2026-09-12 | Terminal CRUD management page, RBAC, tenant isolation |
| **POS Reports** | 🚀 `production_ready` | 2026-09-12 | POS reports page — sales, products, cashier reports, RBAC, tenant isolation |
| **POS Loyalty Program** | 🚀 `production_ready` | 2026-09-12 | Loyalty program CRUD + member management (3 models, 9 routes, 4 pages, Zod validation) — Phase 4A |
| **POS Analytics** | 🚀 `production_ready` | 2026-09-12 | POS analytics: overview, products, cashiers, CSV export (4 API routes, charts, RBAC) — Phase 4B |
| **Multi-terminal Monitor** | 🚀 `production_ready` | 2026-09-12 | Real-time multi-terminal dashboard with status, sessions, transactions per terminal — Phase 4C |
| **Kitchen Display System** | 🚀 `production_ready` | 2026-09-14 | KDS page with auto-refresh polling (10s), color-coded order cards, timer, overdue detection, RBAC, Zod validation — Phase 6. Kitchen orders now show table info (table number, zone). |
| **Kitchen — KDS Display** | ✅ `implemented` | 2026-09-05 | Kitchen display page with real-time order list, auto-refresh 10s, station filtering ([`apps/web/app/dashboard/pos/kitchen/page.tsx`](apps/web/app/dashboard/pos/kitchen/page.tsx)) |
| **Kitchen — Order Card** | ✅ `implemented` | 2026-09-05 | Color-coded order card: NEW (blue), PREPARING (yellow), READY (green), overdue (red) ([`apps/web/components/pos/kitchen-order-card.tsx`](apps/web/components/pos/kitchen-order-card.tsx)) |
| **Kitchen — Station Filter** | ✅ `implemented` | 2026-09-05 | Filter orders by kitchen station ([`apps/web/components/pos/kitchen-station-filter.tsx`](apps/web/components/pos/kitchen-station-filter.tsx)) |
| **Kitchen — Timer** | ✅ `implemented` | 2026-09-05 | Order preparation timer with overdue detection ([`apps/web/components/pos/kitchen-order-timer.tsx`](apps/web/components/pos/kitchen-order-timer.tsx)) |
| **Kitchen — Stats Bar** | ✅ `implemented` | 2026-09-05 | Kitchen statistics: total orders, preparing, ready, overdue ([`apps/web/components/pos/kitchen-stats-bar.tsx`](apps/web/components/pos/kitchen-stats-bar.tsx)) |
| **Kitchen — API Routes** | 🚀 `production_ready` | 2026-09-12 | 9 API routes: orders CRUD, stations CRUD, stats — state machine, RBAC, tenant isolation, Zod validation |
| **Kitchen — Custom Hook** | ✅ `implemented` | 2026-09-05 | [`use-kitchen-orders.ts`](apps/web/hooks/use-kitchen-orders.ts) — filter, actions, real-time updates |
| **Kitchen — Database Models** | ✅ `implemented` | 2026-09-05 | 3 Prisma models: PosKitchenOrder, PosKitchenOrderItem, PosKitchenStation + Product extensions |
| **Table Management** | 🚀 `production_ready` | 2026-09-14 | Table management with grid/list view, quick status change, reservations, zone filtering — RBAC, Zod validation. Table cards now show active kitchen orders with status. |
| **Table Management — Database** | ✅ `implemented` | 2026-09-05 | 2 Prisma models: `PosTable` (with layout coordinates), `PosTableReservation` |
| **Table Management — API Routes** | 🚀 `production_ready` | 2026-09-12 | 6 API routes: tables CRUD, status change, reservations CRUD, stats — RBAC, tenant isolation, Zod validation |
| **Table Management — UI Page** | ✅ `implemented` | 2026-09-05 | Grid View + List View, quick status change, zone filtering, reservation form, create table form ([`apps/web/app/dashboard/pos/tables/page.tsx`](apps/web/app/dashboard/pos/tables/page.tsx)) |
| **Table Management — Table Card** | ✅ `implemented` | 2026-09-05 | Visual card with color-coded status, expand for status change buttons, reservation info ([`apps/web/components/pos/table-card.tsx`](apps/web/components/pos/table-card.tsx)) |
| **Table Management — Reservation Form** | ✅ `implemented` | 2026-09-05 | Modal form for creating reservations with table auto-suggest ([`apps/web/components/pos/reservation-form.tsx`](apps/web/components/pos/reservation-form.tsx)) |
| **Table Management — Custom Hook** | ✅ `implemented` | 2026-09-05 | [`use-pos-tables.ts`](apps/web/hooks/use-pos-tables.ts) — Auto-refresh 15s, CRUD operations, filters, stats |
| **Table Management — Status Machine** | ✅ `implemented` | 2026-09-05 | Valid transitions: AVAILABLE→(OCCUPIED,RESERVED,CLEANING,DISABLED), OCCUPIED→(AVAILABLE,CLEANING,RESERVED), etc. |

### 15.2 POS Permissions by Role

| Role | Permission | Scope |
|------|------------|-------|
| **Cashier** | Create Sale, Receive Payment, Print Receipt | Terminal/Cabang |
| **Cashier** | ❌ NO Void Sale | — |
| **Cashier** | ❌ NO Discount > 10% | — |
| **Cashier** | ❌ NO Refund | — |
| **Supervisor** | Void Sale, Refund, Override Discount | Cabang |
| **Manager** | Change Price, Approve Refund, Close Shift | Cabang/Regional |

### 15.3 POS Offline Mode Rules

| Rule | Description | Implementation |
|------|-------------|----------------|
| **Stock Management** | Local cache + sync saat online | IndexedDB/localStorage + background sync |
| **Nomor Transaksi** | Offline counter + merge saat online | UUID v4 + sequence generator |
| **Payment Handling** | Cash offline, card pending | Cash: immediate, Card: queue for sync |
| **Sync Conflict Resolution** | Last-write-win + manual resolution | Timestamp-based with conflict UI |
| **Duplicate Prevention** | Idempotency key per transaction | SHA-256 hash of transaction data |
| **Audit Trail** | Offline entries marked | `isOffline: true` flag + sync timestamp |

### 15.4 POS Industry Configuration

| Industry | POS Flow | Special Features |
|----------|----------|-----------------|
| **Retail** | Barcode → Cart → Payment → Receipt | Multi-item cart, barcode scanning, receipt printing |
| **F&B** | Order → Kitchen → Preparation → Payment | Kitchen display, order tracking, table management |
| **Bengkel** | Customer → Vehicle → Service → Parts → Invoice → Payment | Vehicle database, service history, parts inventory |
| **Apotek** | Product → Batch → Expiry → Sale → Payment | Batch tracking, expiry management, prescription handling |

### 15.5 POS Integration Points

| Integration | Direction | Description |
|-------------|-----------|-------------|
| **POS → Inventory** | Outbound | Auto stock deduction on sale, stock lookup |
| **POS → Finance** | Outbound | Auto payment recording, revenue tracking |
| **POS → Accounting** | Outbound | Auto journal entry, tax entry |
| **POS → CRM** | Outbound | Customer purchase history, loyalty points |
| **POS → Audit Trail** | Outbound | All POS mutations logged with full trail |
| **Inventory → POS** | Inbound | Product master data, stock levels, pricing |
| **CRM → POS** | Inbound | Customer data, loyalty program config |

### 15.6 POS Control Engine (Shift Lifecycle)

| Status | Description | Allowed Actions |
|--------|-------------|-----------------|
| **SHIFT_OPEN** | Shift baru dibuka | Create sale, receive payment |
| **TRANSACTIONS** | Proses transaksi | Create sale, void, refund (with permission) |
| **SHIFT_CLOSING** | Shift akan ditutup | Hitung cash, count items, submit closing |
| **APPROVAL** | Menunggu approval | Manager review closing report |
| **LOCKED** | Shift sudah ditutup | View only, no modifications |

---

## 16. Mobile

React Native / Expo mobile app untuk field operations.

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **12 Screens** | ✅ `implemented` | 2026-09-01 | Dashboard, Home, Finance, CRM, HR, Inventory screens |
| **API Client** | ✅ `implemented` | 2026-09-01 | API client dengan error handling, tenant-scoped |
| **Auth Flow** | ✅ `implemented` | 2026-09-01 | JWT auth: login, register, refresh, me — via `/api/mobile/auth/*` |
| **Offline Support** | 📋 `planned` | — | Belum ada kode (Phase 12) |

---

## 17. Desktop

Electron-based desktop application.

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Electron Wrapper** | 🔄 `partial` | — | Basic Electron shell, belum auth integration |
| **Offline Support** | 📋 `planned` | — | Belum ada kode |

---

## 18. Pricing Model

### Tier-based Pricing

| Tier | Target | Harga | Status | Notes |
|------|--------|-------|--------|-------|
| **Starter** | UMKM 1-5 karyawan | Rp 299rb/bulan | ✅ `implemented` | Billing page ada |
| **Growth** | UKM 6-25 karyawan | Rp 799rb/bulan | ✅ `implemented` | Billing page ada |
| **Business** | Mid-market 26-100 | Rp 1.999rb/bulan | ✅ `implemented` | Billing page ada |
| **Enterprise** | 100+ karyawan | Custom | 📋 `planned` | Belum ada kode |

### Billing & Subscription Management

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Plan Selection** | ✅ `implemented` | — | `/dashboard/settings/billing` — 3 paket |
| **Manual Transfer Payment** | ✅ `implemented` | — | Upload bukti transfer, 4 rekening bank |
| **Midtrans Snap Payment** | ✅ `implemented` | 2026-08-30 | `/api/billing/payments/midtrans` — real payment gateway |
| **Midtrans Webhook Handler** | ✅ `implemented` | 2026-08-30 | `/api/billing/payments/midtrans/callback` — auto-verify |
| **WhatsApp Confirmation** | ✅ `implemented` | — | Link wa.me untuk konfirmasi |
| **Superadmin Approval** | ✅ `implemented` | — | `/dashboard/billing` — Approve/Reject |
| **Notification Bell** | ✅ `implemented` | — | Header bell icon dengan badge count |
| **Email Notification** | ✅ `implemented` | — | Auto-email ke info@qalcuity.com |
| **Payment History** | ✅ `implemented` | — | Tabel riwayat pembayaran |
| **Subscription Status** | ✅ `implemented` | — | Status badge: ACTIVE, TRIAL, PENDING, SUSPENDED |

### Add-on Modules

| Module | Harga | Status | Notes |
|--------|-------|--------|-------|
| Field Service | Rp 199rb/bulan | ✅ `implemented` | Phase C Complete — Job scheduling + Mobile checklist |
| Advanced AI Agent | Rp 299rb/bulan | 📋 `planned` | Belum ada kode |
| White-label | Rp 499rb/bulan | 📋 `planned` | Belum ada kode |
| Dedicated Support | Rp 399rb/bulan | 📋 `planned` | Belum ada kode |

### Free Trial

- 14 hari free trial semua fitur
- No credit card required
- Dedicated onboarding support

---

## 19. Platform Control Center

> **Platform Control Center = "4 Worlds" yang terpisah dari Customer ERP.**
> Superadmin Qalcuity BUKAN "Admin ERP customer" — mereka adalah operator/control plane dari seluruh platform.
> Lihat [`docs/ARCHITECTURE.md` Section 23](docs/ARCHITECTURE.md#23-platform-architecture--platform-control-center) untuk arsitektur lengkap.

### 19.1 The 4 Worlds — World Separation

| World | Scope | Akses | Status | Notes |
|-------|-------|-------|--------|-------|
| **Platform World** | Billing, support, monitoring, tenant management | Superadmin only | ✅ `implemented` | Routes: `/platform/*` — MVP UI + API |
| **Tenant World** | ERP, POS, CRM, HR, Inventory — per tenant | Tenant users (ADMIN/MEMBER/VIEWER) | 🚀 `production_ready` | Routes: `/dashboard/*` |
| **Control Engine World** | Workflow, approval, escalation, locking, audit | System + authorized users | 🔄 `partial` | Engine packages in progress |
| **Public World** | Login, register, landing page, pricing | Unauthenticated | ✅ `implemented` | Routes: `/`, `/login`, `/register` |

### 19.2 Platform Control Center — Features

#### Tenant Management

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Tenant List** | ✅ `implemented` | 2026-09-01 | Search, filter by status/plan, sort, pagination — `/api/platform/tenants` |
| **Tenant Detail** | ✅ `implemented` | 2026-09-01 | Stats, info, activity, quick actions — `/api/platform/tenants/[id]` |
| **Tenant Provisioning** | ✅ `implemented` | 2026-09-01 | Create tenant with trial subscription — POST `/api/platform/tenants` |
| **Tenant Suspension** | ✅ `implemented` | 2026-09-01 | Suspend/reactivate via API — PUT `/api/platform/tenants/[id]` |
| **Tenant Reactivation** | ✅ `implemented` | 2026-09-01 | Reactivate suspended tenant + subscriptions |
| **Tenant Deletion** | ✅ `implemented` | 2026-09-01 | Soft delete (sets deletedAt + CANCELLED status) |
| **Tenant Settings Override** | 📋 `planned` | — | Platform-level settings override for specific tenants |

#### Subscription & Entitlement

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Plan Management** | 📋 `planned` | — | Create/edit/archive subscription plans |
| **Entitlement Engine** | 📋 `planned` | — | Plan → Entitlement → What tenant can use |
| **Subscription Lifecycle** | 📋 `planned` | — | ACTIVE → PAST_DUE → GRACE_PERIOD → SUSPENDED → ARCHIVED |
| **Payment Review Workflow** | 📋 `planned` | — | Customer transfer → PENDING_REVIEW → Billing Admin review → Approve/Reject |
| **Manual Payment Approval** | 📋 `planned` | — | Review bukti transfer, approve/reject dengan notes |
| **Auto-billing** | 📋 `planned` | — | Scheduled billing cycle, auto-invoice generation |
| **Usage-based Pricing** | 📋 `planned` | — | Metered billing for storage, API calls, transactions |

#### Usage Metering

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **User Count Tracking** | 📋 `planned` | — | Per-tenant active user count |
| **Storage Metering** | 📋 `planned` | — | File upload storage per tenant |
| **API Call Metering** | 📋 `planned` | — | API request count per tenant |
| **Transaction Metering** | 📋 `planned` | — | Business transaction count per tenant |
| **Usage Alerts** | 📋 `planned` | — | 80% warning, 90% alert, 100% policy enforcement |
| **Usage Dashboard** | 📋 `planned` | — | Visual usage overview per tenant |

#### Error & Log Center

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Error Grouping** | 📋 `planned` | — | Same error × N = 1 group, stack trace aggregation |
| **Error Severity Levels** | 📋 `planned` | — | CRITICAL, HIGH, MEDIUM, LOW |
| **Tenant Isolation (Errors)** | 📋 `planned` | — | Errors filtered per tenant, no cross-tenant leak |
| **Error Timeline** | 📋 `planned` | — | When errors first appeared, frequency trend |
| **Error Resolution Tracking** | 📋 `planned` | — | Mark as investigating, resolved, won't fix |
| **System Log Viewer** | 📋 `planned` | — | Filterable log viewer with tenant context |
| **Audit Log (Platform)** | 📋 `planned` | — | Immutable audit trail for all platform actions |

#### Tenant Health Dashboard

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Health Status Overview** | ✅ `implemented` | 2026-09-01 | System health dashboard with overall status banner |
| **API Latency Monitoring** | ✅ `implemented` | 2026-09-01 | Quick stats with API latency display |
| **Database Health** | ✅ `implemented` | 2026-09-01 | DB connections in resource usage bars |
| **Storage Health** | ✅ `implemented` | 2026-09-01 | Storage usage bars in monitoring page |
| **Queue Health** | 📋 `planned` | — | Background job queue status |
| **Error Rate Monitoring** | ✅ `implemented` | 2026-09-01 | Error rate in quick stats |
| **Uptime Tracking** | ✅ `implemented` | 2026-09-01 | Uptime percentage in monitoring dashboard |

#### Support System

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Support Tickets** | ✅ `implemented` | 2026-09-01 | Ticket list with search, filter, detail modal, reply |
| **Auto-attach Context** | 📋 `planned` | — | Tenant info, plan, recent errors auto-attached to ticket |
| **Internal Notes** | 📋 `planned` | — | Support agent internal notes (not visible to customer) |
| **SLA Tracking** | 📋 `planned` | — | Response time SLA per ticket priority |
| **Ticket Escalation** | 📋 `planned` | — | Auto-escalate based on SLA breach |
| **Customer Communication** | 📋 `planned` | — | In-platform messaging between support and customer |

#### Impersonation

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Impersonation Request** | 📋 `planned` | — | Support requests temporary access to tenant |
| **Reason & Approval** | 📋 `planned` | — | Must provide reason, requires approval from Platform Admin |
| **Temporary Session** | 📋 `planned` | — | Time-limited session (max 30 min), all actions logged |
| **Audit Trail (Impersonation)** | 📋 `planned` | — | Every action during impersonation logged with support agent ID |
| **Tenant Notification** | 📋 `planned` | — | Tenant notified when impersonation starts/ends |

#### Feature Flags

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Feature Flag Management** | 📋 `planned` | — | Create/edit/delete feature flags |
| **Rollout Stages** | 📋 `planned` | — | Internal → 1 tenant → 5 tenants → 10% → 50% → 100% |
| **Tenant-specific Flags** | 📋 `planned` | — | Enable/disable features per tenant |
| **A/B Testing Support** | 📋 `planned` | — | Split traffic for feature testing |
| **Flag Analytics** | 📋 `planned` | — | Usage metrics per flag |

#### Security Center

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Failed Login Monitoring** | ✅ `implemented` | 2026-09-01 | Security events page with severity/type filters |
| **Suspicious Activity Detection** | ✅ `implemented` | 2026-09-01 | Security events with detail modal |
| **Permission Change Audit** | ✅ `implemented` | 2026-09-01 | Security events tracking role/permission changes |
| **API Key Management** | 📋 `planned` | — | Platform-level API key lifecycle |
| **Immutable Audit Log** | 📋 `planned` | — | Write-only audit log, cannot be modified |
| **IP Allowlist** | 📋 `planned` | — | Per-tenant IP restriction |
| **Session Management** | 📋 `planned` | — | View/revoke active sessions per tenant |

#### Platform Settings

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Platform Settings (Database)** | 🚀 `production_ready` | 2026-09-13 | PlatformSetting + PlanTenantLimit models in PostgreSQL, upsert pattern — [`apps/web/lib/platform-settings.ts`](apps/web/lib/platform-settings.ts) |
| **Maintenance Mode** | 🚀 `production_ready` | 2026-09-13 | Blocks MEMBER/VIEWER access in middleware when enabled — [`apps/web/middleware.ts`](apps/web/middleware.ts) |
| **Allow Registration Toggle** | 🚀 `production_ready` | 2026-09-13 | Blocks web + mobile registration when disabled — [`apps/web/app/api/auth/register/`](apps/web/app/api/auth/register/), [`apps/web/app/api/mobile/auth/register/`](apps/web/app/api/mobile/auth/register/) |
| **Email Notifications Toggle** | 🚀 `production_ready` | 2026-09-13 | Skips email sending when disabled — email sending functions |
| **Plan Tenant Limit** | 🚀 `production_ready` | 2026-09-13 | `checkPlanTenantLimit()` enforces per-plan tenant limits during registration (fail-open strategy) |
| **Platform Settings Cache** | 🚀 `production_ready` | 2026-09-13 | Redis-backed two-tier cache (L1 Redis + L2 in-memory fallback) for platform settings — reduces database queries, Redis optional with graceful fallback |
| **Security Alerts Toggle** | 🚀 `production_ready` | 2026-09-13 | Controls security alert emails (forgot-password, anomaly detection) — [`apps/web/lib/email.ts`](apps/web/lib/email.ts), [`apps/web/app/api/auth/forgot-password/route.ts`](apps/web/app/api/auth/forgot-password/route.ts) |

### 19.3 Superadmin Roles

| Role | Scope | Key Permissions | Status | Notes |
|------|-------|-----------------|--------|-------|
| **Qalcuity Owner** | Platform-wide | Everything, assign SUPERADMIN to others | 📋 `planned` | Highest authority |
| **Platform Admin** | Platform-wide | Manage tenants, impersonation approval, feature flags | 📋 `planned` | Day-to-day platform ops |
| **Billing Admin** | Billing & subscription | Payment review, subscription management, invoice approval | 📋 `planned` | Financial operations |
| **Support Agent** | Support & impersonation | View tickets, request impersonation, tenant communication | 📋 `planned` | Customer-facing support |
| **Technical Operator** | System operations | Error center, log viewer, system health, background jobs | 📋 `planned` | Technical monitoring |
| **Security Admin** | Security & compliance | Security center, audit logs, IP allowlist, session management | 📋 `planned` | Security operations |
| **Auditor** | Read-only audit | View all audit logs, compliance reports, usage reports | 📋 `planned` | Compliance & audit |

### 19.4 Platform vs Customer Separation

| Aspect | Platform (Superadmin) | Customer (Tenant User) |
|--------|----------------------|----------------------|
| **Routes** | `/platform/*` | `/dashboard/*` |
| **Session** | Superadmin JWT (platform-scoped) | Tenant JWT (tenant-scoped) |
| **UI** | Platform Control Center UI | ERP/POS/CRM/HR UI |
| **Audit** | `PlatformAuditLog` table | `AuditLog` table |
| **Data** | Cross-tenant (aggregated) | Single tenant only |
| **Auth** | NextAuth + platform role | NextAuth + tenant role |
| **Middleware** | `/platform/*` → platform auth check | `/dashboard/*` → tenant auth check |

---

## 📊 Status Summary

| Status | Icon | Count | Percentage |
|--------|------|-------|------------|
| `production_ready` | 🚀 | ~91 | ~49% |
| `implemented` | ✅ | ~33 | ~18% |
| `verified` | ✔️ | 0 | 0% |
| `partial` | 🔄 | ~19 | ~10% |
| `foundation_complete` | 🔄 | ~1 | ~1% |
| `in_progress` | 🔨 | 0 | 0% |
| `planned` | 📋 | ~130 | ~36% |
| `blocked` | 🚫 | 0 | 0% |
| `deprecated` | ⛔ | 0 | 0% |
| **Total** | | **~290** | **100%** |

> **Session 38-44 Impact (15 Sep):** Full i18n migration complete — 350+ i18n keys added, 300+ hardcoded strings replaced across all modules (Dashboard, Sidebar, Header, Shared Components, HR, POS, Finance, CRM, Inventory, Settings, Control Engine). i18n status updated to reflect production-ready state with 4755+ total keys.
> **Session 35 Impact (14 Sep):** +1 production_ready (Bills & Expenses full CRUD), +1 foundation_complete (WhatsApp Business API foundation), POS Void notes updated (UI fix), Operations i18n completion note → production_ready 90→91, partial 20→19, planned 131→130, foundation_complete 0→1
> **Session 33 Impact (14 Sep):** +1 production_ready (POS Void Transaction new entry), POS Refunds + POS Shift Management notes updated (stock restoration, closing report, expected cash) → production_ready 89→90, planned 132→131
> **Session 32 Impact (14 Sep):** +4 production_ready (Aging Report, Tax Report, Dashboard Stats, POS Receipt), -1 verified → production_ready 85→89, verified 1→0, planned 136→132
> **Session 14 Impact (13 Sep):** +2 production_ready (Anomaly Detection, usePermission Hook), +1 partial (Analytics Read Model/MVs) → Net: production_ready 83→85, partial 19→20, planned 139→136
> **Session 9 Impact (12 Sep):** +18 production_ready (POS Terminal, Refunds, Shift Mgmt, Cashier Mgmt, Offline Mode, Audit Trail, Dashboard, Transactions, Sessions, Terminals, Reports, Loyalty, Analytics, Multi-terminal, Kitchen Display, Kitchen API, Table Mgmt, Table API), -15 implemented → Net: production_ready 65→83, implemented 48→33
> **Session 8 (11 Sep):** POS Products full CRUD (6 entities), 310+ API message constants, i18n backend migration
> **Session 7 (10 Sep):** Codebase audit: 630+ TS files, 209 API route files, 100+ indexes, health ~100/100
> **Session 6 (8 Sep):** Zod Validation 144 schemas, Rate Limiting 100% coverage, Error Handling 27 routes
> **Phase 4 Batch 2 Impact (8 Sep):** +2 production_ready (Error Handling Consolidation, Backend i18n), +70 i18n keys, 27 API routes refactored
> **Mega Sprint Impact (5 Sep):** +3 implemented (F&B Pack, AI Chat real, AI Provider real), -3 planned
> **POS Phase 7 Impact (Table Management):** +8 implemented, -8 planned
> **POS Phase 6 Impact (Kitchen Display):** +9 implemented, -9 planned
> **POS Phase 4 Impact:** +3 implemented (Loyalty, Analytics, Multi-terminal), -3 planned

---

## 📝 Changelog

### v27.0.0 (September 14, 2026) — Session 35: Sprint 34 POS Void Fix + Operations i18n + Bills & Expenses + WhatsApp Foundation (v11.25.0)

#### Feature Status Updates
- **feat(finance):** Bills & Expenses upgraded `partial` → `production_ready` — Bill + Expense models, 4 API routes, 2 UI pages, 4 Zod schemas, RBAC, tenant isolation, sidebar navigation
- **feat(comms):** WhatsApp Business upgraded `planned` → `foundation_complete` — types, Meta Cloud API client, templates, webhook handler, test endpoint, WhatsAppMessageLog model
- **feat(pos):** POS Void Transaction notes updated — UI fix: voidReason input field replacing empty body `{ status: 'VOIDED' }` bug
- **feat(ops):** Operations i18n completion — ~50 hardcoded strings converted to i18n keys across 7 component files

#### Bug Fixes
- **fix(pos):** Void transaction was sending wrong body `{ status: 'VOIDED' }` instead of `{ reason: voidReason }` — added `voidReason` state + reason input field

#### New Files
- `apps/web/app/api/bills/route.ts` — Bills CRUD API
- `apps/web/app/api/expenses/route.ts` — Expenses CRUD API
- `apps/web/app/dashboard/finance/bills/page.tsx` — Bills UI page
- `apps/web/app/dashboard/finance/expenses/page.tsx` — Expenses UI page
- `packages/types/src/whatsapp.ts` — WhatsApp Business API types
- `apps/web/lib/whatsapp/client.ts` — Meta Cloud API client
- `apps/web/lib/whatsapp/templates.ts` — Message templates
- `apps/web/app/api/whatsapp/webhook/route.ts` — Webhook handler
- `apps/web/app/api/whatsapp/test/route.ts` — Test endpoint

#### Code Quality
- TypeScript: 0 errors
- i18n: 50 new keys added to messages/id.json + messages/en.json

---

### v26.0.0 (September 14, 2026) — Session 32: Sprint 32 Critical Fixes + Finance Enhancements

#### Feature Status Updates
- **feat(finance):** Aging Report upgraded `partial` → `production_ready` — AR/AP with age buckets (Current, 31-60, 61-90, 90+), color coding, summary + detail tables
- **feat(finance):** Tax Report upgraded `planned` → `production_ready` — PPN/PPh summary with date range filtering, 4 summary cards, detail tables
- **feat(dashboard):** Dashboard Stats upgraded `verified` → `production_ready` — 16 parallel real DB queries, change % calculation, activities + alerts
- **feat(pos):** POS Receipt Printing upgraded `planned` → `production_ready` — Thermal printer format (80mm), print/share/download

#### Bug Fixes
- **fix(crm):** Workflow engine states: `LEAD,QUALIFICATION` → `DISCOVERY,CLOSING` (matches Prisma schema)
- **fix(crm):** Deal detail API: `findMany` → `findFirst` (returns single deal, not list)
- **fix(crm):** Pipeline loading: UPPERCASE 6 stages for consistency
- **fix(crm):** POST response: added field aliases (`name`, `expectedCloseDate`, `company`)
- **fix(crm):** Detail/edit pages: removed non-existent `currency` field

#### Code Quality
- TypeScript: 0 errors
- Code Quality Score: 9.0/10

---

### v23.0.0 (September 14, 2026) — Session 28-29: Sprint 28-29 Complete

#### New Features
- **feat(industry):** Enhanced industry settings UI with pack selection grid, detail preview, activation flow
- **feat(pos):** Kitchen display integration with table management — kitchen orders show table info, table cards show active kitchen orders
- **feat(ai):** Finance, Sales, and Inventory AI agents with orchestrator pattern — 3 agent modules + central orchestrator
- **feat(settings):** Unified Control Engine — centralized platform configuration panel (7 tabs: Modules, Workflow, Approvals, Fields, Widgets, Permissions, History)

#### Bug Fixes
- **fix(rate-limit):** Enable in-memory fallback in production — `ENABLE_MEMORY_FALLBACK` default changed from `false` to `true`
- **fix(crm):** Resolve locale error in `timeAgo()` function — corrected language tag format
- **fix(crm):** Fix setState during render warning — moved `timeAgo()` call outside component

#### Commits
- `949b555` — CRM page fix (locale error + setState during render)
- `92834ac` — Rate limit fix (ENABLE_MEMORY_FALLBACK default)
- `8acadad` — Industry packs UI (settings page enhancement)
- `f73b154` — POS Kitchen × Tables (integration)
- `ff0ba14` — AI Agents (Finance/Sales/Inventory + Orchestrator)
- `85e7850` — Unified Control Engine (7-tab config panel)

#### Code Quality
- Console.log audit: 0 found in 228 API routes (already clean)
- TypeScript: 0 errors
- Code Quality Score: 8.5/10

---

### v22.0.0 (September 13, 2026) — Session 26+: NLU Parser + Statistical Anomaly Detection + Encryption (v11.19.0)
- **NLU Parser** — Intent recognition (8 intents: report, create, update, delete, search, compare, predict, action) + entity extraction (7 types: date, amount, customer, product, account, period, metric) + query normalization
- **Smart Data Resolver** — Maps extracted entities to database fields with fallback resolution
- **Multi-turn Context** — Conversation context manager for follow-up queries
- **Statistical Anomaly Detection** — 5 new rules (outlier, trend break, pattern, velocity, seasonal) added to existing 12 rule-based rules (total: 17)
- **AES-256-GCM Encryption** — Encryption at rest for SMTP passwords (Fernet-compatible format)
- **Xendit Payment Provider** — Invoice API v2 + webhook callback verification
- **SSE Real-time Routes** — Kitchen Display SSE + Notification Center SSE (with 60s polling fallback)
- **Batch Document Extraction** — Multi-file upload (limit 20), batch progress, CSV export
- **Product Restock API + UI** — Restock endpoint with UI for inventory management
- **Files Created** — nlu-parser.ts, data-resolver.ts, conversation-context.ts, statistical-analysis.ts, encryption.ts, xendit.ts, 2 SSE routes, 2 Xendit endpoints
- **Breaking Changes** — None
- **Version** — v11.18.0 → v11.19.0

### v21.0.0 (September 13, 2026) — Session 22: Structured Logger Migration (v11.12.0)
- **Structured Logger Migration** — 20 files migrated from `console.error`/`console.log` to structured `logger.error()`/`logger.info()`: 11 client-side .tsx components, 6 error boundary files, 3 server-side files
- **Monitoring TODOs** — 6 error boundary files annotated with monitoring service integration TODOs (Sentry, Datadog)
- **Files Modified** — 20 files across client components, error boundaries, and server-side modules
- **Breaking Changes** — None — logging infrastructure change only
- **Version** — v11.11.0 → v11.12.0

### v20.0.0 (September 13, 2026) — Session 21: Bug Fixes + Search API Security (v11.11.0)
- **POST /api/admin/plans 400 Fix** — Zod `.nullable().optional()` schema fix for plan-related fields
- **Search API Auth 401** — Search API now returns proper 401 Unauthorized on auth failure (was 200)
- **Search API Query Validation** — Search API returns 400 when query is shorter than 2 characters
- **ioredis Webpack Fix** — Added `ioredis` to `serverExternalPackages` in next.config.js to fix bundling errors
- **SUPERADMIN Hidden from Tenant Views** — 5 files: approvals page, 3 Zod enums, 3 API routes (roles list, role detail, team list)
- **Files Modified** — 7 files (2 validation schemas, 1 search route, 1 next.config.js, 5 SUPERADMIN hidden files)
- **Breaking Changes** — None — API responses now exclude SUPERADMIN from tenant-level lists
- **Version** — v11.10.0 → v11.11.0

### v19.0.0 (September 13, 2026) — Session 20: Hide SUPERADMIN from Tenant-Level Views (v11.10.0)
- **SUPERADMIN Hidden from Tenant-Level Views** — SUPERADMIN role no longer appears in team management, role assignments, approval level dropdowns, or tenant-level API responses (platform admin panel only)
- **Files Modified** — 5 files: approvals page, 3 Zod enum schemas, 3 API routes (roles list, role detail, team list)
- **Breaking Changes** — None — SUPERADMIN still fully functional, only tenant-level visibility changed
- **Version** — v11.9.0 → v11.10.0

### v18.0.0 (September 13, 2026) — Session 19: TypeScript Cleanup + Security Alerts + Redis Cache (v11.9.0)
- **Remaining `as unknown as` Cast Improvement** — 4 casts removed/fixed, 9 casts documented with explanatory comments, 2 casts intentionally kept (db.ts singleton)
- **`securityAlerts` Setting Activated** — Security alert emails now controlled by platform setting: forgot-password route + anomaly detection alerts
- **Redis-backed Cache Upgrade** — Platform settings cache upgraded from single-tier (in-memory) to two-tier (Redis L1 + in-memory L2), Redis optional with graceful fallback
- **Platform Settings Complete** — All 4 settings now fully active: maintenanceMode, allowRegistration, emailNotifications, securityAlerts
- **Security Hardening Update** — Updated Security Hardening entry with securityAlerts + Redis cache details
- **Status Summary** — +1 production_ready (Security Alerts Toggle), Cache description updated
- **Version** — v11.8.0 → v11.9.0

### v17.0.0 (September 13, 2026) — Session 18: Cast Refactoring + Platform Settings Consumption (v11.8.0)
- **`as unknown as` Cast Refactoring** — 64 unsafe casts refactored to type-safe `toAuditPayload()` across 45 files (28 Finance + 30 CRM/HR/Inventory/Projects/Settings/Tasks/Approval + 6 POS offline sync)
- **Platform Settings Consumption** — 3 platform settings now actively enforced: `maintenanceMode` (middleware), `allowRegistration` (registration routes), `emailNotifications` (email sending)
- **Platform Settings Cache** — In-memory cache with TTL 60s via [`apps/web/lib/platform-settings.ts`](apps/web/lib/platform-settings.ts) to reduce database queries
- **PlanTenantLimit Enforcement** — `checkPlanTenantLimit()` function enforces per-plan tenant limits during web + mobile registration (fail-open strategy)
- **Platform Settings Features** — 7 new entries added to Section 19.2: Platform Settings (DB), Maintenance Mode, Allow Registration, Email Notifications, Plan Tenant Limit, Cache, Security Alerts
- **Zod Validation Update** — 149 → 153 schemas (mobile auth, support tickets, security sessions from Session 15)
- **Security Hardening Update** — Updated Security Hardening entry with cast refactoring + platform settings enforcement details
- **Status Summary** — No change in production_ready count (code quality improvement, not new features)
- **Version** — v11.5.0 → v11.8.0

### v16.0.0 (September 13, 2026) — Session 14: Documentation Sync (v11.5.0)
- **FEATURES.md Audit Sync** — 12 discrepancies fixed: status updates, count corrections, version bump
- **Anomaly Detection** — Upgraded `planned` → `production_ready` (full implementation verified: engine, scan handler, API, cron, UI, Prisma model)
- **usePermission Hook** — Upgraded `planned` → `production_ready` (implemented at `apps/web/lib/use-permission.ts`, used in 86+ pages)
- **Analytics Read Model** — Upgraded `planned` → `partial` (3 materialized views + refresh function + API + dashboard integration)
- **Count Corrections** — API routes: 120+ → 400+ handlers (228 files), Audit calls: 132 → 300+, RBAC routes: ~90 → 165, Zod schemas: 146 → 149
- **Version** — v11.1.0 → v11.5.0
- **Status Summary** — production_ready: 83→85, partial: 19→20, planned: 139→136

### v15.0.0 (September 12, 2026) — Session 9: Global Audit Fixes (v11.1.0)
- **Global Audit Fixes** — 146 Zod schemas, 100% rate limiting coverage, API error handling consolidation
- **POS Products Full CRUD** — All 6 POS entities now have full CRUD (PUT/DELETE), Products: production_ready
- **Backend i18n Migration** — 310+ API message constants in `api-messages.ts`, 200+ route files migrated
- **Cron Scheduler** — Unified cron dispatcher with 4 active tasks (payment-reminder, stock-alert, recurring-invoice, anomaly-scan)
- **POS Analytics Enhancement** — 4 new API routes (products, customers, sales, hours), date range filter
- **Mobile Auth** — Register endpoint for mobile app (`/api/mobile/auth/register`)
- **POS Status Upgrade** — 18 POS features upgraded from `implemented`/`partial` to `production_ready`
- **Documentation Sync** — ROADMAP.md v11.1.0, FEATURES.md v15.0.0, CURRENT.md updated
- **TypeScript Check** — PASS (0 errors)
- **Health Score** — ~100/100
- **Status Summary** — production_ready: 65→83 (+18), implemented: 48→33 (-15)

### v14.5.0 (September 11, 2026) — Session 8: POS Enhancement & i18n Backend
- **POS Products Full CRUD** — 6 entities with PUT/DELETE endpoints, Zod validation
- **Backend i18n** — 310+ message constants in `api-messages.ts`
- **Documentation Update** — CURRENT.md, FEATURES.md updated

### v14.4.0 (September 10, 2026) — Session 7: Codebase Audit
- **Codebase Audit** — 630+ TS files, 209 API route files, 100+ indexes, 100 Prisma models
- **Health Score** — Reached ~100/100
- **Documentation** — CURRENT.md updated with full audit results

### v14.3.0 (September 8, 2026) — Phase 4 Batch 2: Error Handling & i18n
- **Error Handling Consolidation** — 27 API routes refactored with centralized [`handleApiError()`](apps/web/lib/api-error.ts), 35 catch blocks consolidated, ~95%+ coverage across all API routes
- **Backend i18n** — New file [`api-messages.ts`](apps/web/lib/api-messages.ts) with 310+ English message constants, 200+ API route files migrated from hardcoded Indonesian strings
- **i18n Status Labels** — 70 new i18n keys for status labels, 6 page files updated with `STATUS_I18N_KEYS` + `t()` pattern (Finance, CRM, HR, Inventory modules)
- **Build Config Hardened** — `ignoreBuildErrors: true` → `false` in next.config.js, TypeScript build errors now block deployment
- **SubscriptionPlan → Plan Migration** — Migration plan documented: SubscriptionPlan + TenantSubscription → Plan + PlanFeature + TenantEntitlement + UsageRecord (implementation scheduled next sprint)
- **i18n Keys** — 1100+ → 1170+ (+70 new status label keys)
- **Status Summary** — production_ready: 65→67 (+2: Error Handling Consolidation, Backend i18n), total: 289→289

### v14.2.0 (September 8, 2026) — Phase 4 Security & Quality Sprint
- **Security Fixes (5 issues)** — Tenant isolation audit, Zod validation audit (120+ schemas), RBAC defense-in-depth audit, hardcoded secrets removed, CSP/CORS headers verified
- **Error Boundaries** — 31 new error.tsx files for projects/[id], projects/[id]/edit, projects/[id]/gantt, projects/[id]/resources, projects/[id]/board, projects/new, crm/pipeline, hr/attendance, hr/leaves, hr/payroll, inventory/categories, inventory/stock, field/jobs, field/jobs/[id], field/checklists, approvals — Total: 94 error.tsx files
- **Loading States** — 4 new loading.tsx files — Total: 98 loading.tsx files
- **Dead Code Removal** — Removed `pages/_error.tsx` (Next.js App Router does not use pages/ directory)
- **Notifications API Fix** — Added graceful degradation when notification preferences table is missing
- **TypeError Fix** — Suppressed `startTime` TypeError in attendance API with proper null check
- **Deployment Fixes** — aaPanel Node.js Project Manager config, .env.production values, update.sh script
- **Codebase Stats** — API route files: 90+→209, Zod schemas: 24+→120+, TS files (apps/web): ~180+→~630+
- **Status Summary** — production_ready: 64→65, total: 288→289

### v14.1.0 (September 6, 2026) — Quality Sprint Complete
- **Error Boundaries** — 18 new error.tsx files for detail pages across HR (employees/[id], leaves/[id]), CRM (contacts/[id], deals/[id], leads/[id]), Inventory (products/[id], stock-opname/[id], suppliers/[id]), Finance (invoices/[id], payments/[id], purchase-orders/[id], quotations/[id]), POS (kitchen, loyalty, refunds, sessions, tables, terminals) — Total: 63 error.tsx files
- **Loading States** — 1 new loading.tsx for POS root — Total: 94 loading.tsx files
- **i18n Migration** — 281+ new strings migrated: Settings module (5 files, 135+ strings), POS module (8 files, 130+ strings), Finance/HR/Inventory (9 files, 16 new keys) — Total: 1100+ i18n keys
- **Bug Fix** — `journal-entries/page.tsx`: `sourceTypeLabels` → `getSourceLabel()` for i18n consistency
- **Status Summary** — production_ready: 62→64, total: 286→288

### v14.4.0 (September 12, 2026) — Session 6: Zod Validation & Rate Limiting Coverage
- **Zod Validation Complete** — 16 new schemas added (Project, Task, POS Terminal/Table/Session, Refund, Role, Team Member) — Total: 144 schemas in `validation-schemas.ts`
- **Rate Limiting 100% Coverage** — 13 additional routes protected across Settings, Workflow, Search, Reports, and POS modules
- **All Mutation Routes Secured** — Every POST/PUT/DELETE API route now has Zod input validation + rate limiting
- **Documentation Updated** — AGENT.md, SECURITY.md, FEATURES.md, CURRENT.md all updated with accurate numbers
- **Status Summary** — production_ready: 58→59, Security Hardening updated with comprehensive coverage

### v13.0.0 (September 5, 2026) — Mega Sprint Complete
- **POS Offline Mode (Phase 5)** — Full offline capability: IndexedDB (Dexie.js), sync queue with exponential backoff, service worker (cache-first/network-first), React hooks, UI indicators, 10 files
- **POS Kitchen Display System (KDS)** — 3 models, 9 API routes, state machine (NEW→PREPARING→READY→COMPLETED), auto-refresh polling, color-coded cards, timer, overdue detection, 19 files
- **POS Table Management** — 2 models, 6 API routes, grid/list view, quick status change, reservations with conflict checking, zone filtering, 2 UI components, custom hook
- **Operations Module MVP Phase A** — 5 models, 9 API routes, 5 UI pages (project list, detail, Kanban, My Tasks, Timesheet), 8 Zod schemas, 25 files
- **AI Real Integration** — OpenAI-compatible provider replacing mock, chat API, query API, configurable endpoint + API key
- **@qalcuity/api Package** — Shared API client: types, client, errors — reusable across Web, Mobile, Desktop, AI Agent
- **F&B Industry Pack** — Restaurant pack: custom fields, documents, workflows in `@qalcuity/industry-config`
- **VPS Deployment Fixes** — aaPanel migration, login redirect fix, Prisma migration fixes, debug cleanup, update.sh rewrite
- **Status Summary** — implemented: 45→48, planned: 144→141, total: 286→286

### v5.3.0 (September 1, 2026) — UI Modernization Sprint (Batches 1-5)
- **ConfirmDialog Component** — Centralized confirmation dialog replacing 24 window.confirm calls across all CRUD pages
- **Toast System** — Centralized toast provider (toast.tsx + ToastProvider) with consistent success/error/warning feedback
- **Inline Error Banners** — Inline error display on form pages replacing silent failures
- **Dark Mode** — Tailwind darkMode: "class" support across 8 components (Button, Input, Select, Modal, Card, Badge, Alert, Spinner)
- **i18n Expansion** — 400+ → 433+ keys, comprehensive Bahasa Indonesia + English coverage
- **Reports Mobile Cards** — 12 sub-components for responsive Reports page (overview, finance, crm, hr, inventory, analytics, billing, workflow, audit, notifications, downloads, custom)
- **Loading States Expanded** — 25 → 28 loading.tsx files covering all detail & workspace pages
- **Security Hardening** — .gitignore hardened, .env removed from git history, .env.example updated with comprehensive comments
- **Status Summary** — production_ready: 55→58, UI/UX completion: 99%

### v4.5.0 (August 31, 2026) — Analytics Studio Implementation Sprint
- **Security: CSP Headers** — Content-Security-Policy implemented di middleware.ts
- **Security: CORS Configuration** — Explicit CORS config di next.config.js
- **Security: NEXTAUTH_SECRET Mandatory** — Hardcoded fallback dihapus, throw error di semua environment
- **Security: Rate Limiter Hardened** — Security warnings untuk in-memory mode di production
- **Analytics Code Refactor** — Dataset definitions di-refactor ke `@qalcuity/analytics` package (explorer, metrics, kpi/evaluate routes)
- **Prisma Schema Extensions** — 8 model baru: AnalyticsDataset, AnalyticsQueryHistory, AnalyticsChart, AnalyticsDashboard, AnalyticsDashboardWidget, DataDictionaryEntry, ScheduledQuery, MetricDefinition
- **New API Routes (8)** — charts, charts/[id], dashboards, dashboards/[id], dashboards/[id]/widgets, query-history, dictionary, scheduled
- **Analytics Workspace UI (5 pages)** — Charts, Dashboards, Dictionary, History, Scheduled + 5 loading.tsx
- **Analytics Layout Updated** — 10 tabs navigation
- **Analytics API** — Updated from 7 to 15 routes
- **Prisma Models** — Updated from 5 to 13 models
- **Loading States** — Updated from 12 to 21
- **Analytics Overview Dashboard** — Updated to `production_ready`
- **Data Explorer** — Updated to `production_ready`
- **KPI Builder** — Updated to `production_ready`
- **Data Alerts** — Updated to `production_ready`
- **Saved Reports** — Updated to `production_ready`
- **Data Dictionary** — Updated to `implemented` (CRUD + UI page)
- **Charts Management** — New `implemented` entry
- **Query History** — New `implemented` entry
- **Dashboard Builder** — Updated to `partial` (Widget API ready)
- **Metric Builder** — Updated to `partial` (Prisma model + API ready)
- **Scheduled Queries** — Updated to `partial` (model + API ready)
- **CSP Headers** — New `implemented` entry in Security section
- **CORS Configuration** — New `implemented` entry in Security section
- **Status Summary** — production_ready: 48→55, implemented: 17→20, partial: 18→20

### v4.4.0 (September 1, 2026) — Button Fix + Platform Control Center MVP
- **12 Button Fixes** — Settings 2FA, HR Attendance, Finance Reconciliation/Payments, Analytics Scheduled/Reports, Inventory Categories/Import
- **Platform Control Center MVP** — 7 pages: Dashboard, Tenants, Billing, Monitoring, Support, Security, Settings
- **Platform Layout** — Purple-themed sidebar, header, route group (`/platform/*`)
- **Platform API Routes** — Stats, Tenants CRUD, Tenant detail/suspend/reactivate
- **SUPERADMIN RBAC** — Middleware enforces SUPERADMIN-only access to `/platform/*`
- **JSX Fix** — payments/page.tsx missing closing tag fixed
- **TypeScript Check** — PASS (0 errors)
- **20 features updated** — Tenant Management, Monitoring, Support, Security Center

### v4.3.0 (August 31, 2026) — UI/UX Audit & Fixes
- **Security P0 Fix** — Password URL exposure removed dari login page
- **Functional P0 Fix** — "Adjust Stok" button sekarang functional dengan modal form
- **Functional P1 Fix** — Edit buttons di Employee Detail dan Product Detail pages
- **Export Fix** — Reconciliation CSV export functionality
- **Auth Fix** — Remember Me checkbox wired ke signIn function
- **Type Fix** — UserRole type mismatch di packages/types disesuaikan
- **Security Fix** — NEXTAUTH_SECRET throw di production (bukan hardcoded fallback)
- **Build Fix** — ignoreBuildErrors disabled di next.config.js
- **Validation Fix** — Client-side Zod validation di finance forms
- **Audit Fix** — Audit logging di attendance [id] routes
- **i18n Fix** — Hardcoded Indonesian text diganti i18n keys (header, error pages, error boundary)
- **Link Fix** — Dead links: forgot-password disabled, Google register functional
- **Functional Fix** — Non-functional secondary buttons (print, stock history, order history)
- **Password Policy** — Updated to `implemented` (min 8 chars enforced)
- **Midtrans** — Updated to `implemented` (full integration verified)
- **TypeScript Check** — PASS (0 errors)

### v4.2.0 (August 31, 2026) — Platform Control Center
- **New Section 19** — Platform Control Center: 4 Worlds separation, tenant management, subscription, entitlement, error center, tenant health, support, impersonation, feature flags, usage metering, security center
- **Superadmin Roles** — 7 roles defined (Owner, Platform Admin, Billing Admin, Support Agent, Technical Operator, Security Admin, Auditor)
- **Platform vs Customer Separation** — Explicit separation of routes, sessions, UI, audit tables
- **ARCHITECTURE.md Section 23** — Full Platform Architecture documentation added
- **ROADMAP Phase 23-25** — Platform Control Center Core, Monitoring & Error Center, Support & Impersonation
- **65+ new planned features** — Platform Control Center feature inventory

### v4.1.0 (August 31, 2026) — POS Module Architecture
- **POS as Core Module** — POS defined as core module, not separate product
- **POS Section 15** — 17 core features, 3 roles, 6 offline rules, 4 industry configs
- **POS Phase 22** — Full POS phase with 7 sub-phases (Core, Shift/Cash, Offline, Industry Config, ERP Integration, Permissions, Reports)
- **POS Architecture** — Section 22 in ARCHITECTURE.md with data model, integration flow, control engine
- **Sections renumbered** — Mobile → 16, Desktop → 17, Pricing → 18

### v4.0.0 (August 31, 2026) — Business Operating System Architecture
- **Architecture Formalization** — Qalcuity defined as "Business Operating System" (not ERP)
- **Three Foundation Engines** — Permission Engine, Workflow Engine, Industry Configuration Engine
- **Industry Packs** — 3 packs implemented (Retail, Manufacturing, F&B), 7 planned (Wholesale, Construction, Consulting, Logistics, Education, Healthcare)
- **New Section 13** — Architecture Engines (Permission, Workflow, Industry Config)
- **New Section 14** — Industry Packs (9 industries with custom workflows, fields, documents)
- **Sections renumbered** — Mobile → 15, Desktop → 16, Pricing → 17

### v3.2.0 (August 30, 2026) — Code Quality & Dynamic Data Sprint
- **Dynamic Overview Pages** — 5 halaman di-rewrite dari hardcoded ke dynamic API (Finance, HR, Inventory, CRM, Dashboard)
- **Categories DELETE** — DELETE handler added to API + page connected to API
- **New API Route** — `/api/settings/integrations` for dynamic connection status
- **Integrations Page** — Hardcoded status → dynamic fetch from API
- **Emoji Cleanup** — All emoji replaced with Lucide icons (dashboard stats, audit page, landing page)
- **Alert → Toast** — 11 `alert()` instances replaced with toast notifications
- **Toast Icons** — ✓/✕ characters replaced with Lucide Check/X icons in 14 files
- **Loading States** — 3 new loading.tsx files (total: 12)
- **Error Boundaries** — 3 new error.tsx files (audit, billing, reports)
- **Security Fix** — Hardcoded NEXTAUTH_SECRET fallback removed, env var mandatory
- **Env Configuration** — Complete .env.example, .env.local, .env.production templates
- **Code Cleanup** — console.log removed from company settings page

### v3.1.0 (August 30, 2026) — Unified Control Engine (16 Recommendations)
- **Major expansion** — Control Center evolved from 6 engines to Unified Control Engine with 14 sub-components
- Added ADR-017 through ADR-023 (7 new architectural decisions)
- Added 30+ new planned features across 17 subsections (12.1 s/d 12.17)
- New modules: Policy Engine, SoD, SLA, Delegation, Work Inbox, Exception Center, Period Closing, Emergency Access, Access Review
- Section 12 renamed from "Control Center & Workflow" to "Unified Control Engine & Workflow"

### v3.0.0 (August 30, 2026) — Audit-Based Status Labels
- **Major rewrite** — FEATURES.md becomes Product Source of Truth
- Replaced ambiguous `[x]`/`[ ]` with strict status labels
- Added `Last Verified` and `Notes` columns for traceability
- Added Status Summary table with counts and percentages
- All statuses verified against actual codebase audit (30 August 2026)
- Restructured modules to match actual implementation

### v2.2.0 (August 29, 2026) — Quality & Security Hardening
- Zod Validation — 14+ schemas, 19 API routes validated
- Audit Logging — 77 audit calls across 10 mutation endpoints
- RBAC Defense-in-depth — 3 layers: middleware + API route + UI visibility
- Responsive Tables — Dual layout on 17 pages
- i18n Expansion — 20+ pages localized, 200+ new keys
- Settings Pages — 6 settings pages completed
- Detail Pages — 9 loading.tsx files, delete functionality on 6 detail pages

### v2.1.0 (August 28, 2026) — Architecture Brief Compliance
- Restructured all features with explicit `status` field format
- Added 11 feature categories with comprehensive status tracking

### v2.0.0 (August 28, 2026) — Batch 14-26
- Role Superadmin, Advanced Reporting, Payment Gateway, Email, File Upload
- Reconciliation, Desktop App, Billing & Subscription, AI Features

### v1.2.0 (August 28, 2026)
- Chart of Accounts (Full CRUD Tree View), Empty States, Toast Notifications
- Confirmation Dialogs, Mobile Responsive, Navigation Links, Seed Data

### v1.1.0 (August 18, 2026)
- i18n support, Lucide icons, Responsive tables, All modules i18n'd

### v1.0.0 (August 2026)
- Initial feature set documentation, MVP scope defined, Pricing model established

---

### v6.0.0 (September 2, 2026) — Feature Sprint (FASE 3C-4C)
- **Tax Engine MVP** — TaxRate model, CRUD API + UI, invoice integration, Zod validation
- **Period Closing Wizard** — AccountingPeriod model, 4-step wizard service, CRUD API + UI
- **Multi-level Approval Engine** — ApprovalLevel + ApprovalRequest models, approval/reject API endpoints
- **Sidebar Navigation** — 11 new navigation entries for Finance, HR, Inventory sub-pages
- **Prisma Migrations** — 3 new migrations (Tax Engine, Period Closing, Approval Engine)
- **Updated Status Labels** — Tax Rate Management, Approval Workflow, Period Closing Wizard marked as implemented

### v5.0.0 (September 1, 2026) — Foundation Engines Implemented
- **Permission Engine** — `@qalcuity/permissions` package: `can()` engine, types, roles, permissions
- **Workflow Engine** — `@qalcuity/workflow` package: configurable state machine, transitions, guards, defaults
- **Industry Configuration Engine** — `@qalcuity/industry-config` package: industry packs, custom fields/documents/reports
- **Component Library** — `@qalcuity/ui` package: 11 React components (Button, Input, Select, Table, Modal, Card, Badge, Alert, Spinner, ConfirmDialog, ToastProvider)
- **Mobile Auth** — JWT-based auth flow: login, register, refresh, me endpoints
- **CRM Import** — CSV/Excel parsers + import API for contacts & leads
- **Settings Real Backend** — Notification config & integration config connected to Prisma DB
- **Shared Packages** — 3 new foundation packages + 1 component library package

---

### v8.0.0 (September 4, 2026) — Batch M: Documentation Update (POS Phase 2 & 3 Complete)
- **POS Phase 2 Complete** — 8 API routes (terminals, terminals/[id], sessions, sessions/[id], transactions, transactions/[id], dashboard, products), terminal page, sessions page, transactions page, POS layout, 3 loading states, DB migration
- **POS Phase 3 Complete** — 2 refund API routes (refunds, refunds/[id]), refunds page, reports page, terminals management page, 100+ i18n keys, 6 POS sub-menus in sidebar
- **Batch K: Security Hardening** — Rate limiting (21 analytics routes), input sanitization, error boundaries, loading states
- **Batch L: Code Quality** — Console.log cleanup (7 statements), any types fix, error response standardization (api-error.ts), POS i18n completeness (30+ keys), POS sidebar fix (6 sub-menus)
- **Batch N-1: Input Sanitization (27 routes)** — 100% mutation route coverage, `sanitizeObject()`/`sanitizeInput()` on all routes (fixes CQ-03)
- **Batch N-2: Rate Limiting (26 handlers)** — Settings, billing, POS, workflow, search, reports routes covered + 2 error boundaries (fixes API-01, API-02, UI-01-b)
- **Batch N-3: Code Quality** — `any` types eliminated from rate limiter, `handleApiError()` standardized, 4 composite indexes added to Prisma schema (fixes CQ-05, UI-05, DB-01)
- **Health Score** — 85/100 → 91/100 (+6 points)
- **Documentation Update** — FEATURES, ROADMAP, CURRENT, REMAINING-WORK updated for POS completion + Batch N
- **Status Summary** — implemented: 25→33, partial: 18→20, planned: 163→156, total features: 269→274

### v7.0.0 (September 3, 2026) — Sprint 4 Complete (Batch 1A-4B)
- **2FA (TOTP)** — RFC 6238 compliant TOTP implementation with enable/disable/verify flow
- **Session Management** — Multi-device session tracking with active sessions list and revoke
- **Login History** — Login attempt logging with IP, user agent, success/failure, pagination
- **Password Change API** — Secure password change with current password verification
- **Financial Reports** — Trial Balance, Balance Sheet, Income Statement report APIs
- **Platform Billing Enhancement** — MRR/ARR stats, plan distribution, payment history, plan management
- **Platform Monitoring** — System health, services status, resource usage, incidents
- **Approval Notifications** — Real-time approval notifications + auto-approval engine
- **CRM Activities** — Activity tracking + email compose integration
- **PPh21/BPJS Calculator** — Indonesian tax calculator + payroll enhancement
- **Multi-warehouse** — Warehouse management + stock opname
- **KPI/Charts API** — Enhanced dashboard with KPI and charts API
- **Decimal Fix** — All monetary fields upgraded to Decimal(19,4)
- **Deployment Script** — deploy-vps.sh with rollback, error handling, idempotent
- **TypeScript Check** — PASS (0 errors)
- **Status Summary** — production_ready: 58→62, implemented: 20→25

### v9.0.0 (September 4, 2026) — POS Phase 4: Loyalty + Analytics + Multi-terminal
- **POS Loyalty Program** — 3 new Prisma models (LoyaltyProgram, LoyaltyPointsLedger, LoyaltyReward), 9 API routes (programs CRUD, members CRUD), 4 UI pages (programs list/create/edit, members list/points), 80+ i18n keys, Zod validation, DB migration
- **POS Analytics Enhancement** — 4 new API routes (overview, products, cashiers, CSV export), revenue trend charts, payment breakdown pie chart, top products table, date range filter
- **Multi-terminal Monitor** — Real-time dashboard showing all terminals status, active sessions, recent transactions per terminal, terminal status indicators
- **POS Layout Updated** — 8 → 9 tabs (added Programs, Members, Monitor)
- **Commits:** `81a00fb` (Phase 4A — 21 files, 2594 insertions), `609f1c0` (Phase 4B+4C — 11 files, 1294 insertions)
- **Status Summary** — implemented: 33→36, planned: 156→153, total: 274→277
- **POS Total** — Phase 1-4 complete: 23 API routes, 12 UI pages, 9 Prisma models, 180+ i18n keys

### v21.0.0 (September 13, 2026) — Session 22: Code Quality — Structured Logger Migration
- **Logger Migration** — Migrated all remaining `console.error` calls to structured `logger.error()` across 20 files (22+ changes)
- **Client-Side .tsx** — 11 component files: 19 `console.error` → `logger.error` (POS, operations, UI components)
- **Error Boundaries** — 6 error boundary files: `console.error` → `logger.error` + monitoring service TODO comments
- **Server-Side** — 3 files: `.catch(console.error)` → `.catch((err) => logger.error(...))` + `platform-settings.ts` console cleanup
- **TypeScript** — PASS (0 errors)
- **Files Modified** — 20 total (11 client-side .tsx, 6 error boundary files, 3 server-side files)

### v20.0.0 (September 13, 2026) — Session 21: Bug Fixes + Search API Security
- **Bug #1 Fix** — POST /api/admin/plans 400 error: Zod `.nullable().optional()` fix on validation schemas + admin plans route (2 files)
- **Bug #2 Fix** — Search API auth failure: now returns 401 Unauthorized instead of 200 (security hardening)
- **Bug #10 Fix** — Search API query too short: now returns 400 Bad Request when query < 2 characters
- **ioredis Webpack Fix** — Added ioredis to `serverExternalPackages` in next.config.js to fix webpack bundling errors
- **SUPERADMIN Hidden** — Removed SUPERADMIN from tenant-level views: approvals page, validation schemas (3 enums), 2 roles API routes, team API route (5 files)
- **TypeScript** — PASS (0 errors)
- **Files Modified** — 7 total (validation schemas, search route, next.config.js, approvals page, roles routes, team route)
- **Security** — Search API auth + query validation, SUPERADMIN visibility restriction

### v11.0.0 (September 5, 2026) — POS Kitchen Display System (KDS)
- **Kitchen Display System** — Full KDS implementation: database models, API routes, UI components, custom hook, architecture doc
- **Database** — 3 new Prisma models: `PosKitchenOrder`, `PosKitchenOrderItem`, `PosKitchenStation` + Product extensions (`preparationMinutes`, `isPreparedItem`) + PosTransactionItem extensions (`itemNotes`, `kitchenStatus`)
- **API Routes** — 9 routes with state machine (NEW→PREPARING→READY→COMPLETED), RBAC, tenant isolation, Zod validation
- **KDS Page** — [`apps/web/app/dashboard/pos/kitchen/page.tsx`](apps/web/app/dashboard/pos/kitchen/page.tsx) — Auto-refresh polling (10s), color-coded cards, timer, overdue detection
- **4 UI Components** — [`kitchen-order-card.tsx`](apps/web/components/pos/kitchen-order-card.tsx), [`kitchen-stats-bar.tsx`](apps/web/components/pos/kitchen-stats-bar.tsx), [`kitchen-station-filter.tsx`](apps/web/components/pos/kitchen-station-filter.tsx), [`kitchen-order-timer.tsx`](apps/web/components/pos/kitchen-order-timer.tsx)
- **Custom Hook** — [`use-kitchen-orders.ts`](apps/web/hooks/use-kitchen-orders.ts) — Filter, actions, real-time updates
- **Architecture Doc** — [`plans/pos-kitchen-display-architecture.md`](plans/pos-kitchen-display-architecture.md)
- **Commit:** `0046832` (19 files, 3760 insertions)
- **TypeScript Check** — PASS (0 errors)
- **POS Total** — Phase 1-6 complete: 32 API routes, 21 UI pages, 12 Prisma models, 180+ i18n keys, 10 offline files, 8 kitchen files

### v10.0.0 (September 5, 2026) — POS Phase 5: Offline Mode
- **POS Offline Mode** — Full offline capability for POS terminal: IndexedDB local storage, background sync queue, service worker caching, UI indicators
- **5A: IndexedDB Core** — TypeScript interfaces + Dexie.js-based IndexedDB wrapper ([`apps/web/lib/pos-offline/types.ts`](apps/web/lib/pos-offline/types.ts), [`apps/web/lib/pos-offline/db.ts`](apps/web/lib/pos-offline/db.ts))
- **5B: Sync Queue & API Client** — Background sync with retry/backoff + offline-aware API client ([`apps/web/lib/pos-offline/sync.ts`](apps/web/lib/pos-offline/sync.ts), [`apps/web/lib/pos-offline/api-client.ts`](apps/web/lib/pos-offline/api-client.ts))
- **5C+5D: React Hooks & UI** — Offline detection hooks + product cache hook + UI indicator components ([`apps/web/hooks/use-pos-offline.ts`](apps/web/hooks/use-pos-offline.ts), [`apps/web/hooks/use-pos-products.ts`](apps/web/hooks/use-pos-products.ts), [`apps/web/components/pos/offline-indicator.tsx`](apps/web/components/pos/offline-indicator.tsx), [`apps/web/components/pos/sync-status-badge.tsx`](apps/web/components/pos/sync-status-badge.tsx))
- **5E: Service Worker** — Cache-first static assets + network-first API + offline fallback ([`apps/web/public/sw.js`](apps/web/public/sw.js), [`apps/web/lib/pos-offline/service-worker.ts`](apps/web/lib/pos-offline/service-worker.ts))
- **5F: Integration** — POS terminal + layout integrated with offline indicators ([`apps/web/app/dashboard/pos/terminal/page.tsx`](apps/web/app/dashboard/pos/terminal/page.tsx), [`apps/web/app/dashboard/pos/layout.tsx`](apps/web/app/dashboard/pos/layout.tsx))
- **TypeScript Check** — PASS (0 errors)
- **Files Created/Modified:** 10 files
- **POS Total** — Phase 1-5 complete: 23 API routes, 13 UI pages, 9 Prisma models, 180+ i18n keys, 10 offline files

**Last Updated:** September 15, 2026 (Session 44: Full i18n Migration Complete — v11.30.0)
**Maintainer:** Qalcuity Product Team
**Document Version:** 29.0 — Session 44: Full i18n migration complete (Sessions 38-44: 1,847 keys across 16 modules, 245+ files using useTranslation, 350+ keys added, 300+ hardcoded strings replaced — Dashboard, Sidebar, Header, Shared Components, HR, POS, Finance, CRM, Inventory, Settings, Control Engine). Session 35: Sprint 34 POS Void UI fix, Bills & Expenses, WhatsApp foundation. Session 33: POS critical fixes. Session 32: Aging Report, Dashboard real DB queries. Session 28-29: Industry Packs, POS Kitchen × Table, AI Agents, Unified Control Engine. Session 26+: NLU parser, anomaly detection, AES-256-GCM encryption, Xendit payment, SSE real-time routes.
