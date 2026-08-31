# 🚀 Qalcuity All-in-One — Product Source of Truth

> **"All-in-One B2B Operating System untuk UKM & Mid-Market Indonesia"**
> Ganti 5–7 tools jadi 1, mobile-first, Coretax-ready, dan AI yang benar-benar kerja.

**Last Updated:** August 30, 2026
**Maintainer:** Qalcuity Product Team
**Document Version:** 3.0 — Audit-Based Status Labels

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
| **Web App** | Core utama, full feature, admin panel | 🚀 `production_ready` | 2026-08-30 | Next.js 14 App Router, 35 API routes |
| **Desktop App** | Electron-based, offline capable | 🔄 `partial` | — | Electron wrapper only, belum ada auth/offline |
| **Mobile App** | iOS & Android, field-ready | 🔄 `partial` | — | 12 screens, API client partial, no auth flow |

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
8. [Reports & Analytics](#8-reports--analytics)
9. [AI Features](#9-ai-features)
10. [Integration & Ecosystem](#10-integration--ecosystem)
11. [Admin & Security](#11-admin--security)
12. [Control Center & Workflow](#12-control-center--workflow)
13. [Architecture Engines](#13-architecture-engines)
14. [Industry Packs](#14-industry-packs)
15. [Mobile](#15-mobile)
16. [Desktop](#16-desktop)
17. [Pricing Model](#17-pricing-model)

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
| **i18n (ID/EN)** | 🚀 `production_ready` | 2026-08-30 | Custom provider, 200+ keys, 20+ pages localized |
| **Responsive Design** | 🚀 `production_ready` | 2026-08-30 | Mobile-first, 44x44px touch targets |
| **Responsive Tables** | 🚀 `production_ready` | 2026-08-30 | Dual layout: mobile cards + desktop tables |
| **Zod Validation** | 🚀 `production_ready` | 2026-08-30 | 14+ schemas, all mutation routes validated |
| **RBAC Defense-in-depth** | 🚀 `production_ready` | 2026-08-30 | Middleware + API route + UI visibility |
| **Lucide Icons** | 🚀 `production_ready` | 2026-08-30 | Consistent icon system across all modules |
| **Empty States** | 🚀 `production_ready` | 2026-08-30 | All CRUD pages have empty state components |
| **Toast Notifications** | 🚀 `production_ready` | 2026-08-30 | CRUD operation success/error feedback — Lucide Check/X icons |
| **Confirmation Dialogs** | 🚀 `production_ready` | 2026-08-30 | Delete confirmation on 14+ CRUD pages |
| **Navigation Links** | 🚀 `production_ready` | 2026-08-30 | Cross-entity navigation (e.g., Invoice → Contact) |
| **Loading States** | 🚀 `production_ready` | 2026-08-30 | 12 loading.tsx files for detail pages |
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
| **Chart of Account** | 🚀 `production_ready` | 2026-08-30 | Template CoA + custom, multi-level grouping, Prisma DB |
| **General Ledger** | 📋 `planned` | — | Belum ada kode |
| **Journal Entry** | 📋 `planned` | — | Belum ada kode |
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
| **Email (SMTP)** | ✅ `implemented` | — | Real SMTP via Nodemailer, env-based config, console fallback |
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

## 8. Reports & Analytics

Reporting yang comprehensive untuk semua modul.

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Dashboard Stats** | ✔️ `verified` | 2026-08-30 | Real-time stats from dynamic API |
| **Standard Reports (12 types)** | 🚀 `production_ready` | 2026-08-30 | Finance, Sales, HR, Inventory reports |
| **Chart Components** | 🚀 `production_ready` | 2026-08-30 | Bar, Pie, Line charts — custom implementation |
| **Export (CSV/Excel/Print)** | 🚀 `production_ready` | 2026-08-30 | Built-in export utilities |
| **Custom Report Builder** | 📋 `planned` | — | Belum ada kode |
| **Scheduled Reports** | 📋 `planned` | — | Belum ada kode |

---

## 9. AI Features

AI yang benar-benar useful, bukan gimmick. **Semua AI features termasuk dalam biaya sewa — tidak ada biaya tambahan ke provider AI.**

### 9.1 AI Hub & Chat

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **AI Chat** | 🔄 `partial` | — | Floating button + OpenAI provider + Mock fallback — mock responses, belum real AI |
| **AI Provider (OpenAI/Mock)** | ✅ `implemented` | — | API route `/api/ai/chat`, OpenAI + mock fallback |
| **AI Hub Page** | 📋 `planned` | — | `/dashboard/ai` belum ada |
| **AI Insights** | 📋 `planned` | — | Belum ada kode |

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
| **Midtrans** | 🔄 `partial` | — | Settings config ada, belum integrated end-to-end |
| **Xendit** | 📋 `planned` | — | Belum ada kode |

### 10.3 Rate Limiter & Security

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Rate Limiter (Redis)** | 🚀 `production_ready` | 2026-08-30 | Per-IP rate limiting, Redis-backed |

### 10.4 Import/Export

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Excel/CSV Export** | 🚀 `production_ready` | 2026-08-30 | Any report or data |
| **Excel/CSV Import** | 🔄 `partial` | — | Basic import, belum bulk validation |

### 10.5 API & Webhook

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **REST API** | 🔄 `partial` | — | 35 routes, belum public API documentation |
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
| **NextAuth JWT** | 🚀 `production_ready` | 2026-08-30 | CredentialsProvider, JWT strategy, bcryptjs |
| **SSO** | 📋 `planned` | — | Belum ada kode |
| **2FA** | 📋 `planned` | — | Belum ada kode |
| **Password Policy** | 🔄 `partial` | — | Basic validation, belum configurable rules |
| **Session Management** | 🔄 `partial` | — | JWT-based, belum multi-device control |

### 11.2 Access Control

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **RBAC (4 Roles)** | 🚀 `production_ready` | 2026-08-30 | SUPERADMIN, ADMIN, MEMBER, VIEWER — defense-in-depth |
| **IP Whitelisting** | 📋 `planned` | — | Belum ada kode |
| **Data-level Security** | 📋 `planned` | — | Belum ada kode |
| **Approval Workflow** | 🔄 `partial` | — | Basic approval, belum multi-level conditional |

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
| **Audit Trail** | 🚀 `production_ready` | 2026-08-30 | 77 audit calls across 10 mutation endpoints |
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
| **Approval Engine** | 📋 `planned` | — | Multi-level approval chains [ADR-015] |
| **Approval Routing** | 📋 `planned` | — | Configurable approval flow per module |
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
| **Period Closing Wizard** | 📋 `planned` | — | Step-by-step wizard untuk menutup periode akuntansi [ADR-022] |
| **Pre-checks** | 📋 `planned` | — | Validate unposted, pending, unreconciled transactions |
| **Exception Resolution** | 📋 `planned` | — | Resolve atau exception approval sebelum closing |
| **Final Review Summary** | 📋 `planned` | — | Ringkasan lengkap periode ini |
| **Closing Approval** | 📋 `planned` | — | Director/Finance Manager approve closing |
| **Period Lock** | 📋 `planned` | — | Auto-lock setelah closing approval |
| **Period Report** | 📋 `planned` | — | Generate period summary report |
| **Monthly Closing** | 📋 `planned` | — | Penutupan bulanan dengan approval Finance Manager |
| **Quarterly Closing** | 📋 `planned` | — | Penutupan kuartalan dengan approval Director |
| **Yearly Closing** | 📋 `planned` | — | Penutupan tahunan dengan approval Board/Director |

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
| **Permission Engine (can() function)** | 📋 `planned` | — | Industry-agnostic granular permission check: `can(user, action, resource, context)` |
| **Permission Model (Prisma)** | 📋 `planned` | — | User → Membership → Role → Permission → Scope → Resource → Action |
| **@qalcuity/permissions package** | 📋 `planned` | — | Shared package for Web, Mobile, Desktop, API, AI Agent |
| **Permission Middleware** | 📋 `planned` | — | API route-level permission enforcement |
| **Permission Hooks (usePermission)** | 📋 `planned` | — | UI-level permission-based conditional rendering |
| **Platform Permissions** | 📋 `planned` | — | Internal Qalcuity: tenant.view, subscription.manage, system.monitor |
| **Tenant Permissions** | 📋 `planned` | — | Customer org: invoice.approve, employee.view, payroll.manage |
| **Scope Support** | 📋 `planned` | — | Branch + Department level permissions |
| **Cross-platform Enforcement** | 📋 `planned` | — | Web, Mobile, Desktop, API, AI Agent — same engine |
| **Migration from 4-Role RBAC** | 📋 `planned` | — | Strategy to migrate from current 4 hardcoded roles |

### 13.2 Workflow Engine

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Workflow Engine** | 📋 `planned` | — | Configurable transaction lifecycle: status transitions per entity |
| **@qalcuity/workflow package** | 📋 `planned` | — | Shared workflow engine for all modules |
| **Configurable Statuses** | 📋 `planned` | — | Tambah/hapus status sesuai kebutuhan perusahaan |
| **Configurable Transitions** | 📋 `planned` | — | Define allowed transitions between statuses |
| **Transition Guards** | 📋 `planned` | — | Role-based + condition-based transition guards |
| **Auto Actions** | 📋 `planned` | — | Auto-create documents, send notifications on transitions |
| **Workflow Configuration UI** | 📋 `planned` | — | Visual workflow editor per perusahaan |
| **Default Workflows** | 📋 `planned` | — | Pre-built workflows untuk common business processes |
| **Unified Pipeline Integration** | 📋 `planned` | — | Integrasi dengan Unified Control Engine (Phase 10) |

### 13.3 Industry Configuration Engine

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Industry Configuration Engine** | 📋 `planned` | — | Core engine untuk industry-specific customizations |
| **@qalcuity/industry-config package** | 📋 `planned` | — | Shared package untuk managing industry configurations |
| **Custom Fields Engine** | 📋 `planned` | — | Dynamic fields per entity: NPWP, NIB, PIC, Branch, Project, Site |
| **Custom Documents Engine** | 📋 `planned` | — | Document types + custom statuses + custom workflows |
| **Custom Reports Engine** | 📋 `planned` | — | Reports berdasarkan module + custom fields |
| **Industry Pack Loader** | 📋 `planned` | — | Load configuration per tenant/industry |
| **Industry Pack API** | 📋 `planned` | — | CRUD untuk managing industry packs |
| **Industry Pack UI** | 📋 `planned` | — | Dashboard untuk configuring industry packs |
| **Dashboard Configuration Engine** | 📋 `planned` | — | Industry-specific dashboard widgets |

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

## 15. Mobile

React Native / Expo mobile app untuk field operations.

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **12 Screens** | 🔄 `partial` | — | Dashboard, Home, Finance, CRM, HR, Inventory screens |
| **API Client** | 🔄 `partial` | — | Basic API client, belum error handling lengkap |
| **Auth Flow** | 📋 `planned` | — | Belum ada login/register flow |
| **Offline Support** | 📋 `planned` | — | Belum ada kode |

---

## 16. Desktop

Electron-based desktop application.

| Feature | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| **Electron Wrapper** | 🔄 `partial` | — | Basic Electron shell, belum auth integration |
| **Offline Support** | 📋 `planned` | — | Belum ada kode |

---

## 17. Pricing Model

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

## 📊 Status Summary

| Status | Icon | Count | Percentage |
|--------|------|-------|------------|
| `production_ready` | 🚀 | ~48 | ~32% |
| `implemented` | ✅ | ~17 | ~11% |
| `verified` | ✔️ | 1 | ~1% |
| `partial` | 🔄 | ~18 | ~12% |
| `in_progress` | 🔨 | 0 | 0% |
| `planned` | 📋 | ~92 | ~51% |
| `blocked` | 🚫 | 0 | 0% |
| `deprecated` | ⛔ | 0 | 0% |
| **Total** | | **~176** | **100%** |

---

## 📝 Changelog

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

**Last Updated:** August 31, 2026
**Maintainer:** Qalcuity Product Team
**Document Version:** 4.0 — Business Operating System Architecture
