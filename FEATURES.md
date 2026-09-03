# 🚀 Qalcuity All-in-One — Product Source of Truth

> **"All-in-One B2B Operating System untuk UKM & Mid-Market Indonesia"**
> Ganti 5–7 tools jadi 1, mobile-first, Coretax-ready, dan AI yang benar-benar kerja.

**Last Updated:** September 3, 2026 (Sprint 4 Complete — Batch 1A-4B)
**Maintainer:** Qalcuity Product Team
**Document Version:** 7.0 — Sprint 4 Complete

> **📄 Dokumentasi lengkap semua remaining work ada di [`docs/REMAINING-WORK.md`](docs/REMAINING-WORK.md).**
> File tersebut berisi daftar detail semua fitur yang belum diimplementasi, organized by priority (CRITICAL → HIGH → MEDIUM → LOW), dengan item ID, complexity estimate, dependency, dan file references. Gunakan sebagai **single source of truth** untuk sprint planning dan task breakdown.

---

## 🏷️ Status Legend

> **Setiap fitur diberi label status berdasarkan bukti kode dan pengujian aktual.**
> Label ini adalah **single source of truth** — tidak ada `[x]`/`[ ]` yang ambigu.

| Status | Icon | Arti |
|--------|------|------|
| `planned` | 📋 | Belum ada kode sama sekali — baru direncanakan |
| `in_progress` | 🔨 | Mulai ditulis tapi belum fungsional |
| `partial` | 🔄 | Ada kode tapi tidak lengkap (placeholder/mock/incomplete) |
| `implemented` | ✅ | Kode lengkap dan kompilasi, tapi belum verified secara menyeluruh |
| `verified` | ✔️ | Sudah di-test dan berfungsi sesuai harapan |
| `production_ready` | 🚀 | Sudah verified + security + audit + tenant isolation — siap deploy |
| `blocked` | 🚫 | Ada dependency yang belum selesai / blocker |
| `deprecated` | ⛔ | Sudah tidak digunakan, akan dihapus |

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
| **RBAC (4 Roles)** | 🚀 `production_ready` | 2026-08-30 | SUPERADMIN, ADMIN, MEMBER, VIEWER — 3 layers |
| **Audit Trail** | 🚀 `production_ready` | 2026-08-30 | 77 audit calls across 10 mutation endpoints |
| **Settings (6 Pages)** | 🚀 `production_ready` | 2026-08-30 | Company, Profile, Security, Team, Notifications, Billing |
| **Demo Data** | 🚀 `production_ready` | 2026-08-30 | Comprehensive seed data for all modules |
| **Dark Mode** | 🚀 `production_ready` | 2026-08-30 | Tailwind dark theme support |
| **Global Search** | 🚀 `production_ready` | 2026-08-30 | Ctrl+K shortcut, cross-module search |
| **i18n (ID/EN)** | 🚀 `production_ready` | 2026-09-01 | Custom provider, 433+ keys, 22+ pages localized |
| **Responsive Design** | 🚀 `production_ready` | 2026-09-01 | Mobile-first, 44x44px touch targets, Reports page 12 sub-components |
| **Responsive Tables** | 🚀 `production_ready` | 2026-09-01 | Dual layout: mobile cards + desktop tables (19 pages) |
| **Zod Validation** | 🚀 `production_ready` | 2026-08-30 | 14+ schemas, all mutation routes validated |
| **RBAC Defense-in-depth** | 🚀 `production_ready` | 2026-08-30 | Middleware + API route + UI visibility |
| **Lucide Icons** | 🚀 `production_ready` | 2026-08-30 | Consistent icon system across all modules |
| **Empty States** | 🚀 `production_ready` | 2026-08-30 | All CRUD pages have empty state components |
| **Toast Notifications** | 🚀 `production_ready` | 2026-09-01 | Centralized toast provider — toast.tsx + ToastProvider in layout |
| **Confirmation Dialogs** | 🚀 `production_ready` | 2026-09-01 | ConfirmDialog component — 24 window.confirm calls replaced |
| **Navigation Links** | 🚀 `production_ready` | 2026-08-30 | Cross-entity navigation (e.g., Invoice → Contact) |
| **Loading States** | 🚀 `production_ready` | 2026-09-01 | 28 loading.tsx files for detail & workspace pages |
| **Inline Error Banners** | 🚀 `production_ready` | 2026-09-01 | Inline error display on form pages — replaces silent failures |
| **Security Hardening** | 🚀 `production_ready` | 2026-09-01 | .gitignore hardened, .env removed from git history |
| **.env.example Updated** | 🚀 `production_ready` | 2026-09-01 | Comprehensive env template with comments for all config vars |
| **Deploy Scripts** | 🚀 `production_ready` | 2026-08-30 | PM2 health check, configurable port, robust db:push |
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
| **Trial Balance** | 📋 `planned` | — | Belum ada kode |
| **Financial Statements** | 📋 `planned` | — | Belum ada kode (Balance Sheet, Income Statement, Cash Flow) |

### 2.2 Accounts Receivable

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Invoices** | 🚀 `production_ready` | 2026-08-30 | Full CRUD, custom template, Zod validation, audit trail |
| **Quotations** | 🚀 `production_ready` | 2026-08-30 | Convert to invoice, version tracking, Prisma DB |
| **Payments** | 🚀 `production_ready` | 2026-08-30 | Multi-payment method, partial payment, process endpoint |
| **Aging Report** | 🔄 `partial` | — | Basic report ada, belum 30/60/90 day buckets lengkap |
| **Credit Limit Management** | 📋 `planned` | — | Belum ada kode |

### 2.3 Accounts Payable

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Purchase Orders** | 🚀 `production_ready` | 2026-08-30 | Full CRUD, approval workflow, Zod validation |
| **Bills & Expenses** | 🔄 `partial` | — | Basic expense tracking, belum AI categorization |
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
| **Tax Report** | 📋 `planned` | — | Belum ada kode |

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

Manage projects dan field operations dengan efisien.

### 6.1 Project Management

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Project Types** | 📋 `planned` | — | Belum ada kode |
| **Gantt Chart** | 📋 `planned` | — | Belum ada kode |
| **Kanban Board** | 📋 `planned` | — | Belum ada kode |
| **Resource Allocation** | 📋 `planned` | — | Belum ada kode |
| **Budget Tracking** | 📋 `planned` | — | Belum ada kode |

### 6.2 Task & Time Tracking

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Task Assignment** | 📋 `planned` | — | Belum ada kode |
| **Time Logging** | 📋 `planned` | — | Belum ada kode |
| **Timesheet** | 📋 `planned` | — | Belum ada kode |
| **Productivity Report** | 📋 `planned` | — | Belum ada kode |

### 6.3 Field Service Module

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Job Scheduling** | 📋 `planned` | — | Belum ada kode |
| **Technician Assignment** | 📋 `planned` | — | Belum ada kode |
| **Mobile Checklist** | 📋 `planned` | — | Belum ada kode |
| **Before-After Photos** | 📋 `planned` | — | Belum ada kode |
| **Digital Signature** | 📋 `planned` | — | Belum ada kode |
| **Job Status Update** | 📋 `planned` | — | Belum ada kode |

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
| **Email (SMTP)** | 🚀 `production_ready` | 2026-09-01 | Real Nodemailer transport via SMTP settings API, env-based config |
| **WhatsApp Business** | 📋 `planned` | — | Belum ada kode |
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
| **Dashboard Stats** | ✔️ `verified` | 2026-08-30 | Real-time stats from dynamic API |
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
| **Anomaly Detection** | 📋 `planned` | — | Deteksi anomali statistik: current vs normal range, severity levels (Critical/High/Medium/Low), auto-alerts |
| **Forecasting** | 📋 `planned` | — | Prediksi time series: sales forecasting, cash flow prediction, inventory demand. Time series algorithms |
| **Analytics Read Model** | 📋 `planned` | — | Materialized views untuk performa: ERP DB → Materialized Views → Read-only SQL Engine → Analyst. Auto-refresh |
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
| **AI Chat** | 🔄 `partial` | — | Floating button + OpenAI provider + Mock fallback — mock responses, belum real AI |
| **AI Provider (OpenAI/Mock)** | ✅ `implemented` | — | API route `/api/ai/chat`, OpenAI + mock fallback |
| **AI Hub Page** | ✅ `implemented` | 2026-09-01 | `/dashboard/ai` — AI features overview dengan i18n, feature cards, example questions |
| **AI Insights** | 🔄 `partial` | 2026-09-01 | Basic insight cards on dashboard |

### 9.2 AI Agent Capabilities

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Finance Agent** | 📋 `planned` | — | Belum ada kode |
| **Sales Agent** | 📋 `planned` | — | Belum ada kode |
| **Inventory Agent** | 📋 `planned` | — | Belum ada kode |
| **HR Agent** | 📋 `planned` | — | Belum ada kode |
| **Support Agent** | 📋 `planned` | — | Belum ada kode |

### 9.3 Natural Language Query

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **NLP Query** | 📋 `planned` | — | Belum ada kode |

### 9.4 Smart Document Extraction

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **PDF Processing** | 📋 `planned` | — | Belum ada kode |
| **OCR** | 📋 `planned` | — | Belum ada kode |
| **Auto-validation** | 📋 `planned` | — | Belum ada kode |
| **Auto-entry** | 📋 `planned` | — | Belum ada kode |

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
| **Fraud Detection** | 📋 `planned` | — | Belum ada kode |
| **Data Error** | 📋 `planned` | — | Belum ada kode |
| **Compliance Alert** | 📋 `planned` | — | Belum ada kode |
| **Performance Anomaly** | 📋 `planned` | — | Belum ada kode |

---

## 10. Integration & Ecosystem

> **Qalcuity menyediakan API & Webhook. User mengelola integrasi pihak ketiga sendiri melalui dashboard integrasi.**

### 10.1 Integration Dashboard

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Email/SMTP Config** | ✅ `implemented` | — | Real Nodemailer transport, env-based config |
| **Payment Gateway Config** | ✅ `implemented` | 2026-08-30 | Midtrans Snap integrated, webhook handler, HMAC verification |
| **API Key Management** | 📋 `planned` | — | Belum ada kode |
| **Connection Status** | ✅ `implemented` | 2026-08-30 | Dynamic fetch from `/api/settings/integrations` |
| **Error Logging** | 📋 `planned` | — | Belum ada kode |

### 10.2 Payment Gateway

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Midtrans** | ✅ `implemented` | 2026-08-30 | Midtrans Snap integrated, webhook handler, HMAC verification |
| **Xendit** | 📋 `planned` | — | Belum ada kode |

### 10.3 Rate Limiter & Security

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Rate Limiter (Redis)** | 🚀 `production_ready` | 2026-08-30 | Per-IP rate limiting, Redis-backed |

### 10.4 Import/Export

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Excel/CSV Export** | 🚀 `production_ready` | 2026-08-30 | Any report or data |
| **Excel/CSV Import** | ✅ `implemented` | 2026-09-01 | CSV/Excel parsers + CRM import API (contacts & leads) |

### 10.5 API & Webhook

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **REST API** | 🔄 `partial` | — | 51+ routes, belum public API documentation |
| **GraphQL** | 📋 `planned` | — | Belum ada kode |
| **Webhook** | 📋 `planned` | — | Belum ada kode |
| **API Documentation** | 📋 `planned` | — | Belum ada kode |
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
| **Session Management** | ✅ `implemented` | 2026-09-03 | Multi-device session tracking — UserSession model, active sessions list, revoke session ([`apps/web/app/api/settings/security/sessions/route.ts`](apps/web/app/api/settings/security/sessions/route.ts)) |
| **Login History** | ✅ `implemented` | 2026-09-03 | LoginLog model — IP address, user agent, success/failure tracking, pagination ([`apps/web/app/api/settings/security/login-history/route.ts`](apps/web/app/api/settings/security/login-history/route.ts)) |
| **CSP Headers** | ✅ `implemented` | 2026-08-31 | Content-Security-Policy di middleware.ts + next.config.js — `unsafe-eval` removed |
| **CORS Configuration** | ✅ `implemented` | 2026-08-31 | Explicit CORS config di next.config.js |

### 11.2 Access Control

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **RBAC (4 Roles)** | 🚀 `production_ready` | 2026-08-30 | SUPERADMIN, ADMIN, MEMBER, VIEWER — defense-in-depth |
| **IP Whitelisting** | 📋 `planned` | — | Belum ada kode |
| **Data-level Security** | 📋 `planned` | — | Belum ada kode |
| **Approval Workflow** | ✅ `implemented` | 2026-09-02 | Multi-level approval chains — ApprovalLevel + ApprovalRequest models, configurable per entityType ([`apps/web/app/api/approval/`](apps/web/app/api/approval/)) |

### 11.3 Data Protection

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Encryption** | 📋 `planned` | — | Belum ada explicit AES-256/TLS config |
| **Data Residency** | 📋 `planned` | — | Server config belum ada |
| **Backup** | 📋 `planned` | — | Belum ada auto-backup |
| **Data Retention** | 📋 `planned` | — | Belum ada kode |

### 11.4 Compliance

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Audit Trail** | 🚀 `production_ready` | 2026-08-31 | 132 audit calls across all mutation endpoints |
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
| **Unified Control Engine** | 📋 `planned` | — | Satu engine terpadu: Transaction → Policy → Workflow → Approval → Escalation → Notification → Locking → Audit |
| **Centralized State Model** | 📋 `planned` | — | Satu state management untuk semua sub-engine |
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
| **Permission Engine Integration (Batch 7A)** | 🚀 `production_ready` | 2026-09-01 | ~90 API routes integrated with `can()` checks via `route-permissions.ts` |
| **Permission Hooks (usePermission)** | 📋 `planned` | — | UI-level permission-based conditional rendering (Phase 11) |
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
| **Retail Pack** | 📋 `planned` | — | Default config untuk retail industry |
| **POS Integration** | 📋 `planned` | — | Point of Sale workflow configuration |
| **Stock Replenishment** | 📋 `planned` | — | Auto-reorder workflow |
| **Barcode Management** | 📋 `planned` | — | Barcode field + scanning workflow |
| **Dashboard: Sales, Stock, Top Products, Cash, Customer** | 📋 `planned` | — | Retail-specific dashboard widgets |

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
| **Manufacturing Pack** | 📋 `planned` | — | Default config untuk manufacturing |
| **Work Order** | 📋 `planned` | — | Custom document: Work Order workflow |
| **Bill of Materials (BOM)** | 📋 `planned` | — | BOM configuration |
| **Quality Report** | 📋 `planned` | — | Custom document: Quality Control Report |
| **Production Line** | 📋 `planned` | — | Production line field + assignment |
| **Batch/Lot Tracking** | 📋 `planned` | — | Batch number + expiry date fields |
| **Dashboard: Production, Material, Machine, Quality, WIP, Inventory** | 📋 `planned` | — | Manufacturing-specific dashboard |

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
| **F&B Pack** | 📋 `planned` | — | Default config untuk food & beverage |
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
| **POS Sale** | 📋 `planned` | — | Transaksi penjualan langsung dengan cart, discount, tax |
| **POS Returns** | 📋 `planned` | — | Pengembalian barang partial/full |
| **POS Refunds** | 📋 `planned` | — | Pengembalian dana dengan approval workflow |
| **POS Discounts** | 📋 `planned` | — | Diskon per item/transaksi, configurable max % |
| **POS Promotions** | 📋 `planned` | — | Promosi berbasis waktu/quantity/bundle |
| **POS Customers** | 📋 `planned` | — | Data pelanggan untuk loyalty dan receipt |
| **POS Products** | 📋 `planned` | — | Master produk untuk POS (dari Inventory module) |
| **POS Barcode** | 📋 `planned` | — | Barcode scanning untuk product lookup |
| **POS Payments** | 📋 `planned` | — | Multi metode: cash, card, e-wallet, QRIS, transfer |
| **POS Cash Drawer** | 📋 `planned` | — | Cash in/out tracking, opening/closing cash count |
| **POS Shift Management** | 📋 `planned` | — | Open shift, track transactions, close shift |
| **POS Cashier Management** | 📋 `planned` | — | Cashier assignment, shift scheduling, performance |
| **POS Receipt Printing** | 📋 `planned` | — | Receipt generation dan printing (thermal/regular) |
| **POS Tax Calculation** | 📋 `planned` | — | Automatic tax computation per item/transaction |
| **POS Offline Mode** | 📋 `planned` | — | Transaksi tanpa koneksi internet dengan sync rules |
| **POS Closing** | 📋 `planned` | — | Daily/shift closing dengan approval workflow |
| **POS Audit Trail** | 📋 `planned` | — | Jejak audit lengkap untuk semua transaksi POS |

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
| Field Service | Rp 199rb/bulan | 📋 `planned` | Belum ada kode |
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
| `production_ready` | 🚀 | ~62 | ~36% |
| `implemented` | ✅ | ~25 | ~15% |
| `verified` | ✔️ | 1 | ~1% |
| `partial` | 🔄 | ~18 | ~11% |
| `in_progress` | 🔨 | 0 | 0% |
| `planned` | 📋 | ~163 | ~47% |
| `blocked` | 🚫 | 0 | 0% |
| `deprecated` | ⛔ | 0 | 0% |
| **Total** | | **~269** | **100%** |

> **Sprint 4 Impact:** +4 production_ready, +5 implemented, -5 planned → Net improvement: ~3.5% production_ready increase

---

## 📝 Changelog

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
- **Industry Packs** — 9 industry packs planned (Retail, Wholesale, Manufacturing, F&B, Construction, Property, Logistics, Services, Education, Healthcare)
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

**Last Updated:** September 3, 2026 (Sprint 4 Complete — Batch 1A-4B)
**Maintainer:** Qalcuity Product Team
**Document Version:** 7.0 — Sprint 4 Complete
