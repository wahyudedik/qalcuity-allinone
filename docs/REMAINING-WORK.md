# 🗺️ Qalcuity — Remaining Work Documentation

> **Dokumen ini mencatat SEMUA fitur dan pekerjaan yang BELUM diimplementasi.**
> Diperbarui: 31 Agustus 2026
> Version: 1.0

**Tujuan:** Menjadi acuan utama untuk sesi implementasi berikutnya — setiap item bersifat actionable dan bisa langsung dikerjakan.

---

## 📋 Daftar Isi

1. [Status Summary](#-status-summary)
2. [🔴 CRITICAL — Harus Segera Dikerjakan](#-critical--harus-segera-dikerjakan)
3. [🟠 HIGH PRIORITY — Core Business Logic](#-high-priority--core-business-logic)
4. [🟡 MEDIUM PRIORITY — Feature Completeness](#-medium-priority--feature-completeness)
5. [🔵 LOW PRIORITY — Advanced Features](#-low-priority--advanced-features)
6. [📋 Appendix: File-by-File Reference](#-appendix-file-by-file-reference)
7. [📐 Phase Roadmap](#-phase-roadmap)

---

## 📊 Status Summary

| Category | Implemented | Partial | Planned | Total | Progress |
|----------|------------|---------|---------|-------|----------|
| **Core Platform & SaaS** | 20 | 1 | 2 | 23 | 87% |
| **Finance & Accounting** | 5 | 3 | 16 | 24 | 21% |
| **Sales & CRM** | 5 | 4 | 12 | 21 | 24% |
| **Inventory & Supply Chain** | 4 | 0 | 14 | 18 | 22% |
| **HR & People Ops** | 4 | 4 | 16 | 24 | 17% |
| **Operations & Project** | 0 | 0 | 16 | 16 | 0% |
| **Customer Support** | 1 | 0 | 14 | 15 | 7% |
| **Analytics Studio** | 12 | 5 | 15 | 32 | 38% |
| **AI Features** | 2 | 1 | 14 | 17 | 12% |
| **Integration & Ecosystem** | 4 | 2 | 14 | 20 | 20% |
| **Admin & Security** | 7 | 1 | 13 | 21 | 33% |
| **Unified Control Engine** | 0 | 0 | 50+ | 50+ | 0% |
| **Architecture Engines** | 25 | 0 | 5+ | 30+ | 83% |
| **Industry Packs** | 0 | 0 | 50+ | 50+ | 0% |
| **POS Module** | 0 | 0 | 17 | 17 | 0% |
| **Mobile** | 0 | 2 | 2 | 4 | 0% |
| **Desktop** | 0 | 1 | 1 | 2 | 0% |
| **Platform Control Center** | 0 | 1 | 65+ | 65+ | 0% |
| **TOTAL** | **~80** | **~20** | **~145** | **~269** | **~30%** |

---

## 🔴 CRITICAL — Harus Segera Dikerjakan

> **Item-item ini mempengaruhi keamanan, stabilitas, atau fondasi arsitektur.**

### Security & Infrastructure Fixes

- [x] **[SEC-01]** Rate limiter Redis-backed production — ✅ DONE (Batch 7D: Redis-backed with in-memory fallback)
  - **File:** [`apps/web/lib/rate-limit.ts`](apps/web/lib/rate-limit.ts)
  - **Dependency:** Redis server
  - **Complexity:** Medium
  - **Ref:** [`CURRENT.md`](CURRENT.md) Known Issues #1

- [ ] **[SEC-02]** TypeScript Decimal type arithmetic errors — Pre-existing type mismatch di Finance/Reports
  - **File:** [`apps/web/app/api/reports/route.ts`](apps/web/app/api/reports/route.ts), Finance models
  - **Dependency:** None
  - **Complexity:** Low
  - **Ref:** [`CURRENT.md`](CURRENT.md) Known Issues #2

- [ ] **[SEC-03]** `@qalcuity/ui` package — Tokens only, belum ada React components
  - **File:** [`packages/ui/`](packages/ui/)
  - **Dependency:** Design system decisions
  - **Complexity:** High
  - **Ref:** [`CURRENT.md`](CURRENT.md) Known Issues #7

- [ ] **[SEC-04]** `@qalcuity/api` package — Belum dibuat
  - **File:** [`packages/api/`](packages/api/)
  - **Dependency:** API contract definitions
  - **Complexity:** Medium
  - **Ref:** [`CURRENT.md`](CURRENT.md) Known Issues #8

- [ ] **[SEC-05]** Settings pages simulated backend — Notifications, integrations masih ada simulated data
  - **File:** [`apps/web/app/api/settings/notifications/route.ts`](apps/web/app/api/settings/notifications/route.ts), [`apps/web/app/api/settings/integrations/route.ts`](apps/web/app/api/settings/integrations/route.ts)
  - **Dependency:** None
  - **Complexity:** Low
  - **Ref:** [`CURRENT.md`](CURRENT.md) Known Issues #9

- [x] **[SEC-06]** CRM Import feature — ✅ DONE (CSV/Excel parser implemented: [`apps/web/lib/excel-parser.ts`](apps/web/lib/excel-parser.ts))
  - **File:** CRM Leads/Contacts import UI
  - **Dependency:** CSV/Excel parsing library (xlsx, papaparse)
  - **Complexity:** Medium
  - **Ref:** [`CURRENT.md`](CURRENT.md) Known Issues #11

- [ ] **[SEC-07]** Password policy configurable rules — Saat ini hanya min 8 chars
  - **File:** [`apps/web/app/api/auth/register/route.ts`](apps/web/app/api/auth/register/route.ts)
  - **Dependency:** None
  - **Complexity:** Low

---

## 🟠 HIGH PRIORITY — Core Business Logic

### Foundation Engines

> **Tiga engine fondasi yang memungkinkan Qalcuity menjadi Business Operating System.**
> Ref: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 3-5

#### Permission Engine (Phase 9)

- [x] **[FE-PE-01]** Permission Model (Prisma schema) — ✅ DONE (production_ready)
  - **File:** [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma) — tambah models: Permission, Role, Membership, Scope
  - **Dependency:** Schema migration planning
  - **Complexity:** High
  - **Ref:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 3, [`FEATURES.md`](FEATURES.md) Section 13.1

- [x] **[FE-PE-02]** `@qalcuity/permissions` package — ✅ DONE (production_ready)
  - **File:** `packages/permissions/src/index.ts` (new package)
  - **Dependency:** FE-PE-01 (Prisma models)
  - **Complexity:** High
  - **Ref:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 3.2

- [x] **[FE-PE-03]** Permission Middleware — ✅ DONE (production_ready, ~90 API routes integrated)
  - **File:** [`apps/web/middleware.ts`](apps/web/middleware.ts) — extend existing RBAC
  - **Dependency:** FE-PE-02
  - **Complexity:** High

- [x] **[FE-PE-04]** Permission Hooks (usePermission) — ✅ DONE (production_ready)
  - **File:** `apps/web/lib/hooks/use-permission.ts` (new)
  - **Dependency:** FE-PE-02
  - **Complexity:** Medium

- [x] **[FE-PE-05]** Platform Permissions — ✅ DONE (production_ready)
  - **File:** Permission definitions in `@qalcuity/permissions`
  - **Dependency:** FE-PE-02
  - **Complexity:** Medium

- [x] **[FE-PE-06]** Tenant Permissions — ✅ DONE (production_ready)
  - **File:** Permission definitions per module
  - **Dependency:** FE-PE-02
  - **Complexity:** Medium

- [x] **[FE-PE-07]** Scope Support — ✅ DONE (production_ready)
  - **File:** Scope model + evaluation logic
  - **Dependency:** FE-PE-02
  - **Complexity:** High

- [x] **[FE-PE-08]** Cross-platform Enforcement — ✅ DONE (production_ready)
  - **File:** `@qalcuity/permissions` shared package
  - **Dependency:** FE-PE-02
  - **Complexity:** High

- [ ] **[FE-PE-09]** Migration from 4-Role RBAC — Strategy migrasi dari current 4 hardcoded roles
  - **File:** All API routes + middleware + UI
  - **Dependency:** FE-PE-02, FE-PE-03
  - **Complexity:** Very High

#### Workflow Engine (Phase 10)

- [x] **[FE-WE-01]** Workflow Engine core — ✅ DONE (production_ready)
  - **File:** `packages/workflow/src/index.ts` (new package)
  - **Dependency:** None
  - **Complexity:** High
  - **Ref:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 4

- [x] **[FE-WE-02]** `@qalcuity/workflow` package — ✅ DONE (production_ready)
  - **File:** `packages/workflow/` (new package)
  - **Dependency:** FE-WE-01
  - **Complexity:** High

- [x] **[FE-WE-03]** Configurable Statuses — ✅ DONE (production_ready)
  - **File:** Workflow configuration model
  - **Dependency:** FE-WE-01
  - **Complexity:** Medium

- [x] **[FE-WE-04]** Configurable Transitions — ✅ DONE (production_ready)
  - **File:** Transition rules model
  - **Dependency:** FE-WE-01
  - **Complexity:** Medium

- [x] **[FE-WE-05]** Transition Guards — ✅ DONE (production_ready)
  - **File:** Guard evaluation logic
  - **Dependency:** FE-WE-01, FE-PE-02
  - **Complexity:** High

- [x] **[FE-WE-06]** Auto Actions — ✅ DONE (production_ready)
  - **File:** Action executor
  - **Dependency:** FE-WE-01
  - **Complexity:** High

- [x] **[FE-WE-07]** Workflow Configuration UI — ✅ DONE (production_ready)
  - **File:** `apps/web/app/dashboard/settings/workflows/page.tsx` (new)
  - **Dependency:** FE-WE-01
  - **Complexity:** High

- [x] **[FE-WE-08]** Default Workflows — ✅ DONE (production_ready, 5 entities integrated)
  - **File:** Seed data + configuration
  - **Dependency:** FE-WE-01
  - **Complexity:** Medium

#### Industry Configuration Engine (Phase 11)

- [x] **[FE-ICE-01]** Industry Configuration Engine core — ✅ DONE (production_ready)
  - **File:** `packages/industry-config/src/index.ts` (new package)
  - **Dependency:** FE-WE-01
  - **Complexity:** High
  - **Ref:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 5

- [x] **[FE-ICE-02]** `@qalcuity/industry-config` package — ✅ DONE (production_ready)
  - **File:** `packages/industry-config/` (new package)
  - **Dependency:** FE-ICE-01
  - **Complexity:** High

- [x] **[FE-ICE-03]** Custom Fields Engine — ✅ DONE (production_ready)
  - **File:** Custom field renderer + storage
  - **Dependency:** FE-ICE-01
  - **Complexity:** Very High

- [x] **[FE-ICE-04]** Custom Documents Engine — ✅ DONE (production_ready)
  - **File:** Document template engine
  - **Dependency:** FE-ICE-01
  - **Complexity:** High

- [x] **[FE-ICE-05]** Custom Reports Engine — ✅ DONE (production_ready)
  - **File:** Report builder engine
  - **Dependency:** FE-ICE-01, FE-ICE-03
  - **Complexity:** High

- [x] **[FE-ICE-06]** Industry Pack Loader — ✅ DONE (production_ready)
  - **File:** Configuration loader
  - **Dependency:** FE-ICE-01
  - **Complexity:** Medium

- [x] **[FE-ICE-07]** Industry Pack API — ✅ DONE (production_ready)
  - **File:** `apps/web/app/api/admin/industry-packs/route.ts` (new)
  - **Dependency:** FE-ICE-06
  - **Complexity:** Medium

- [x] **[FE-ICE-08]** Industry Pack UI — ✅ DONE (production_ready)
  - **File:** `apps/web/app/dashboard/admin/industry-packs/page.tsx` (new)
  - **Dependency:** FE-ICE-07
  - **Complexity:** Medium

- [x] **[FE-ICE-09]** Dashboard Configuration Engine — ✅ DONE (production_ready)
  - **File:** Widget configuration system
  - **Dependency:** FE-ICE-01
  - **Complexity:** High

### Unified Control Engine (Phase 10)

> **Evolved dari 6 engine terpisah menjadi 1 engine terpadu dengan 14 sub-komponen.**
> Ref: [`docs/DECISIONS.md`](docs/DECISIONS.md) ADR-017 s/d ADR-023, [`FEATURES.md`](FEATURES.md) Section 12

#### Core Pipeline

- [ ] **[UCE-01]** Unified Control Engine core — Pipeline: Transaction → Policy → Workflow → Approval → Escalation → Notification → Locking → Audit
  - **File:** `packages/workflow/src/control-engine.ts`
  - **Dependency:** FE-WE-01, FE-PE-02
  - **Complexity:** Very High
  - **Ref:** ADR-017

- [ ] **[UCE-02]** Centralized State Model — Satu state management untuk semua sub-engine
  - **File:** State machine implementation
  - **Dependency:** UCE-01
  - **Complexity:** High

- [ ] **[UCE-03]** Pipeline Traceability — Full trace dari awal sampai akhir pipeline
  - **File:** Audit log extension
  - **Dependency:** UCE-01
  - **Complexity:** Medium

#### Policy Engine

- [ ] **[UCE-04]** Policy Engine — Rules bisnis konfigurabel: WHEN condition THEN action
  - **File:** `packages/workflow/src/policy-engine.ts`
  - **Dependency:** UCE-01
  - **Complexity:** Very High
  - **Ref:** ADR-018

- [ ] **[UCE-05]** Amount Threshold Approvals — Tiered approval: <10jt auto, 10-50jt Manager, 50-200jt Director, >200jt Board
  - **File:** Policy rule definitions
  - **Dependency:** UCE-04
  - **Complexity:** Medium

- [ ] **[UCE-06]** Policy Configuration UI — Per-company rule management interface
  - **File:** Settings page for policy rules
  - **Dependency:** UCE-04
  - **Complexity:** High

- [ ] **[UCE-07]** Policy Versioning — Rules berlaku sejak tanggal tertentu, histori tetap ada
  - **File:** Versioning model
  - **Dependency:** UCE-04
  - **Complexity:** Medium

#### Transaction Lifecycle

- [ ] **[UCE-08]** Transaction Lifecycle — DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → POSTED → COMPLETED → LOCKED
  - **File:** Status machine per entity
  - **Dependency:** FE-WE-01
  - **Complexity:** High

- [ ] **[UCE-09]** Immutable Transactions — No physical delete, corrections via Adjustment entries
  - **File:** Adjustment entry model + logic
  - **Dependency:** UCE-08
  - **Complexity:** High

#### Approval Engine

- [ ] **[UCE-10]** Multi-level Approval Chains — Configurable approval flow per module
  - **File:** Approval chain model
  - **Dependency:** UCE-01
  - **Complexity:** High
  - **Ref:** ADR-015

- [ ] **[UCE-11]** Amount-based Routing — Route ke approver berdasarkan nominal transaksi
  - **File:** Routing rules
  - **Dependency:** UCE-10
  - **Complexity:** Medium

- [ ] **[UCE-12]** Delegation — Delegate approval to another user
  - **File:** Delegation model + UI
  - **Dependency:** UCE-10
  - **Complexity:** Medium
  - **Ref:** ADR-020

#### Segregation of Duties (SoD)

- [ ] **[UCE-13]** SoD Engine — Mencegah konflik kepentingan dalam proses bisnis
  - **File:** SoD rule engine
  - **Dependency:** FE-PE-02
  - **Complexity:** Very High
  - **Ref:** ADR-019

- [ ] **[UCE-14]** SoD Matrix — Conflict pairs: Create ≠ Receive ≠ Approve ≠ Pay
  - **File:** Conflict pair definitions
  - **Dependency:** UCE-13
  - **Complexity:** Medium

- [ ] **[UCE-15]** SoD Exception Workflow — Override dengan Director approval + audit trail
  - **File:** Exception workflow
  - **Dependency:** UCE-13
  - **Complexity:** Medium

#### SLA & Escalation

- [ ] **[UCE-16]** SLA Engine — Service level tracking per transaction type
  - **File:** SLA tracking model
  - **Dependency:** UCE-01
  - **Complexity:** High
  - **Ref:** ADR-020

- [ ] **[UCE-17]** SLA Color Coding — 🟢 0-50%, 🟡 50-100%, 🔴 >100% SLA
  - **File:** UI component
  - **Dependency:** UCE-16
  - **Complexity:** Low

- [ ] **[UCE-18]** Escalation Engine — Deadline-based: PIC → Supervisor → Manager → Director
  - **File:** Escalation rules engine
  - **Dependency:** UCE-16
  - **Complexity:** High

#### Delegation

- [ ] **[UCE-19]** Delegation Framework — Manager delegate approval authority saat absent
  - **File:** Delegation model
  - **Dependency:** UCE-12
  - **Complexity:** Medium

- [ ] **[UCE-20]** Delegation Auto-expire — Otomatis berakhir setelah periode selesai
  - **File:** Cron job for expiration
  - **Dependency:** UCE-19
  - **Complexity:** Low

- [ ] **[UCE-21]** Delegated Work Inbox — Delegatee melihat delegated items
  - **File:** Work inbox extension
  - **Dependency:** UCE-19
  - **Complexity:** Medium

#### Work Inbox

- [ ] **[UCE-22]** My Work Inbox — Personal dashboard untuk setiap user
  - **File:** `apps/web/app/dashboard/inbox/page.tsx` (new)
  - **Dependency:** UCE-01
  - **Complexity:** High
  - **Ref:** ADR-023

- [ ] **[UCE-23]** Work Inbox Categories — Overdue, Approval Required, Awaiting Action, Assigned, Escalated, Recently Completed
  - **File:** Query builders for each category
  - **Dependency:** UCE-22
  - **Complexity:** Medium

#### Locking Engine

- [ ] **[UCE-24]** Locking Engine — Hierarchical: Transaction → Day → Month → Quarter → Year
  - **File:** Lock model + evaluation
  - **Dependency:** UCE-01
  - **Complexity:** High
  - **Ref:** ADR-016

- [ ] **[UCE-25]** Lock Policy — Per-company configurable lock policy
  - **File:** Lock configuration
  - **Dependency:** UCE-24
  - **Complexity:** Medium

- [ ] **[UCE-26]** Unlock as Exception — User Request → Reason → Manager Approval → Temporary Unlock → Edit → Re-submit
  - **File:** Unlock workflow
  - **Dependency:** UCE-24
  - **Complexity:** High
  - **Ref:** ADR-021

#### Exception Center

- [ ] **[UCE-27]** Exception Center — Dashboard terpusat untuk semua anomali
  - **File:** `apps/web/app/dashboard/control/exceptions/page.tsx` (new)
  - **Dependency:** UCE-01
  - **Complexity:** High
  - **Ref:** ADR-021

- [ ] **[UCE-28]** Exception Categories — Overdue, SLA Breach, SoD Conflict, Negative Stock, Unreconciled, Policy Violation
  - **File:** Exception detection engines
  - **Dependency:** UCE-27
  - **Complexity:** High

#### Reason & Timeline

- [ ] **[UCE-29]** Reason Required — WAJIB isi reason untuk edit/delete/override transaksi submitted
  - **File:** Reason collection modal
  - **Dependency:** UCE-08
  - **Complexity:** Medium

- [ ] **[UCE-30]** Transaction Timeline — Full history: Who, When, What, Status, Approval chain, Comments
  - **File:** Timeline UI component
  - **Dependency:** Audit trail system
  - **Complexity:** High

#### Adjustment Entries

- [ ] **[UCE-31]** Adjustment Entries — Immutable corrections with reference to original
  - **File:** Adjustment model + entry form
  - **Dependency:** UCE-09
  - **Complexity:** High

#### Access Review & Emergency Access

- [ ] **[UCE-32]** Access Review — Periodic permission review oleh managers (quarterly)
  - **File:** Review scheduling + UI
  - **Dependency:** FE-PE-02
  - **Complexity:** Medium
  - **Ref:** ADR-021

- [ ] **[UCE-33]** Emergency Access — Temporary elevated permission dengan Director approval + auto-revoke
  - **File:** Emergency access workflow
  - **Dependency:** FE-PE-02
  - **Complexity:** High

#### Control Dashboard

- [ ] **[UCE-34]** My Dashboard (Tier 1) — Personal work inbox, pending approvals, overdue items
  - **File:** Dashboard widget
  - **Dependency:** UCE-22
  - **Complexity:** Medium
  - **Ref:** ADR-023

- [ ] **[UCE-35]** Management Dashboard (Tier 2) — Team workload, SLA compliance, escalation alerts
  - **File:** Manager dashboard
  - **Dependency:** UCE-16
  - **Complexity:** High

- [ ] **[UCE-36]** Control Center (Tier 3) — Organization-wide: policy violations, SoD conflicts, compliance metrics
  - **File:** Admin dashboard
  - **Dependency:** UCE-27
  - **Complexity:** High

#### Period Closing Wizard

- [ ] **[UCE-37]** Period Closing Wizard — 7-step wizard untuk menutup periode akuntansi
  - **File:** `apps/web/app/dashboard/finance/period-closing/page.tsx` (new)
  - **Dependency:** UCE-24
  - **Complexity:** High
  - **Ref:** ADR-022

- [ ] **[UCE-38]** Pre-checks — Validate unposted, pending, unreconciled transactions
  - **File:** Validation logic
  - **Dependency:** UCE-37
  - **Complexity:** Medium

- [ ] **[UCE-39]** Monthly/Quarterly/Yearly Closing — Progressive closing levels
  - **File:** Closing workflow
  - **Dependency:** UCE-37
  - **Complexity:** High

---

### Analytics Studio — Remaining Work

> **Phase 1 MVP sudah selesai. Berikut work yang masih tersisa.**
> Ref: [`docs/ANALYTICS-STUDIO.md`](docs/ANALYTICS-STUDIO.md), [`FEATURES.md`](FEATURES.md) Section 8

#### Phase 1 — Foundation (Sisa)

- [ ] **[A-FND-01]** Analytics Read Model — 12 Materialized Views
  - **File:** SQL migration scripts di [`packages/db/`](packages/db/)
  - **Views:** `mv_revenue_monthly`, `mv_expense_monthly`, `mv_sales_by_customer`, `mv_sales_by_product`, `mv_sales_by_category`, `mv_inventory_summary`, `mv_hr_summary`, `mv_top_products`, `mv_top_customers`, `mv_cash_flow`, `mv_deal_pipeline`, `mv_lead_funnel`
  - **Dependency:** None
  - **Complexity:** High
  - **Ref:** [`docs/ANALYTICS-STUDIO.md`](docs/ANALYTICS-STUDIO.md) Section 3

- [ ] **[A-FND-02]** Materialized View Refresh Strategy — DB Triggers + Cron Jobs
  - **File:** PostgreSQL functions + cron configuration
  - **Dependency:** A-FND-01
  - **Complexity:** Medium

- [ ] **[A-FND-03]** SQL Parser & Validator — Parse, validate, whitelist check
  - **File:** `packages/analytics/src/sql-parser.ts`
  - **Dependency:** None
  - **Complexity:** Very High
  - **Ref:** [`docs/ANALYTICS-STUDIO.md`](docs/ANALYTICS-STUDIO.md) Section 4.2

- [ ] **[A-FND-04]** SQL Security Pipeline — 5-layer security
  - **File:** `packages/analytics/src/sql-security.ts`
  - **Dependency:** A-FND-03
  - **Complexity:** Very High
  - **Ref:** [`docs/ANALYTICS-STUDIO.md`](docs/ANALYTICS-STUDIO.md) Section 4

- [ ] **[A-FND-05]** Tenant Isolation Injection — Otomatis inject `WHERE tenant_id = $1`
  - **File:** `packages/analytics/src/sql-security.ts`
  - **Dependency:** A-FND-03
  - **Complexity:** Medium

- [ ] **[A-FND-06]** Row-Level Security Engine — Role-based data filtering
  - **File:** `packages/analytics/src/rls-engine.ts`
  - **Dependency:** A-FND-05, FE-PE-02
  - **Complexity:** High
  - **Ref:** [`docs/ANALYTICS-STUDIO.md`](docs/ANALYTICS-STUDIO.md) Section 5

- [ ] **[A-FND-07]** Permission Guard — Dataset/column/row level permissions
  - **File:** `packages/analytics/src/permission-guard.ts`
  - **Dependency:** FE-PE-02
  - **Complexity:** High

#### SQL Studio

- [ ] **[A-SQL-01]** SQL Editor — Monaco editor dengan syntax highlighting
  - **File:** `apps/web/app/dashboard/analytics/sql-studio/page.tsx` (new)
  - **Dependency:** `@monaco-editor/react` package
  - **Complexity:** High
  - **Ref:** [`docs/ANALYTICS-STUDIO.md`](docs/ANALYTICS-STUDIO.md) Section 6

- [ ] **[A-SQL-02]** SQL Autocomplete — Table/column/function names dari Data Dictionary
  - **File:** Custom CompletionItemProvider
  - **Dependency:** A-SQL-01, Data Dictionary
  - **Complexity:** High

- [ ] **[A-SQL-03]** Query Execution — Execute SQL against Read Model, return results
  - **File:** `apps/web/app/api/analytics/sql/route.ts` (new)
  - **Dependency:** A-FND-04
  - **Complexity:** High

- [ ] **[A-SQL-04]** Query Templates — Template query yang sudah disediakan
  - **File:** Template library
  - **Dependency:** A-SQL-01
  - **Complexity:** Low

- [ ] **[A-SQL-05]** Execution Plan — Tampilkan EXPLAIN ANALYZE
  - **File:** API endpoint extension
  - **Dependency:** A-SQL-03
  - **Complexity:** Medium

- [ ] **[A-SQL-06]** Multiple Tabs — Buka beberapa query sekaligus
  - **File:** Tab management component
  - **Dependency:** A-SQL-01
  - **Complexity:** Medium

- [ ] **[A-SQL-07]** Performance Monitoring — Execution time, rows returned, slow query warnings
  - **File:** Performance bar component
  - **Dependency:** A-SQL-03
  - **Complexity:** Medium

#### Visual Query Builder

- [ ] **[A-VQB-01]** Visual Query Builder — Drag & drop dimensions/measures/filters
  - **File:** `apps/web/app/dashboard/analytics/visual-builder/page.tsx` (new)
  - **Dependency:** `react-dnd` or similar library
  - **Complexity:** Very High
  - **Ref:** [`docs/ANALYTICS-STUDIO.md`](docs/ANALYTICS-STUDIO.md) Section 7

- [ ] **[A-VQB-02]** SQL Generator — Visual → SQL conversion
  - **File:** `packages/analytics/src/visual-query-builder.ts`
  - **Dependency:** A-FND-03
  - **Complexity:** High

- [ ] **[A-VQB-03]** SQL ↔ Visual Converter — Convert between SQL and Visual modes
  - **File:** `apps/web/app/api/analytics/convert/route.ts` (new)
  - **Dependency:** A-VQB-02, A-FND-03
  - **Complexity:** Very High
  - **Ref:** [`docs/ANALYTICS-STUDIO.md`](docs/ANALYTICS-STUDIO.md) Section 8

- [ ] **[A-VQB-04]** Dataset Builder — Save query as reusable dataset
  - **File:** Dataset save UI + API
  - **Dependency:** A-VQB-01
  - **Complexity:** Medium

#### Charts & Visualization

- [ ] **[A-CHART-01]** Chart Engine — Multi-type rendering: Bar, Line, Pie, Donut, Area, Scatter, KPI Card
  - **File:** `packages/analytics/src/chart-engine.ts`
  - **Dependency:** Chart library (recharts/chart.js)
  - **Complexity:** High

- [ ] **[A-CHART-02]** Chart Builder — Visual chart configuration UI
  - **File:** `apps/web/app/dashboard/analytics/charts/builder/page.tsx` (new)
  - **Dependency:** A-CHART-01
  - **Complexity:** High

- [ ] **[A-CHART-03]** Auto-Visualization — Otomatis recommend chart type dari query results
  - **File:** `packages/analytics/src/chart-recommender.ts`
  - **Dependency:** A-CHART-01
  - **Complexity:** Medium
  - **Ref:** [`docs/ANALYTICS-STUDIO.md`](docs/ANALYTICS-STUDIO.md) Section 9

- [ ] **[A-CHART-04]** Chart Recommendation API — POST /api/analytics/charts/recommend
  - **File:** `apps/web/app/api/analytics/charts/recommend/route.ts` (new)
  - **Dependency:** A-CHART-03
  - **Complexity:** Medium

#### Dashboard Builder

- [ ] **[A-DASH-01]** Dashboard Builder UI — Drag & drop widget builder
  - **File:** `apps/web/app/dashboard/analytics/dashboards/builder/page.tsx` (new)
  - **Dependency:** Grid layout library (react-grid-layout)
  - **Complexity:** Very High

- [ ] **[A-DASH-02]** 12-Column Grid Layout — Responsive grid untuk dashboard
  - **File:** Grid layout component
  - **Dependency:** A-DASH-01
  - **Complexity:** Medium

- [ ] **[A-DASH-03]** Widget Types — Chart, KPI Card, Table, Text, Filter, Date Range
  - **File:** Widget component registry
  - **Dependency:** A-DASH-01, A-CHART-01
  - **Complexity:** High

- [ ] **[A-DASH-04]** Dashboard Layout API — PUT /api/analytics/dashboards/:id/layout
  - **File:** `apps/web/app/api/analytics/dashboards/[id]/layout/route.ts` (new)
  - **Dependency:** A-DASH-01
  - **Complexity:** Medium

- [ ] **[A-DASH-05]** Widget CRUD API — POST/PUT/DELETE /api/analytics/dashboards/:id/widgets
  - **File:** Widget API extension
  - **Dependency:** A-DASH-01
  - **Complexity:** Medium

- [ ] **[A-DASH-06]** Dashboard Sharing — Share dashboard dengan team members
  - **File:** Sharing model + UI
  - **Dependency:** A-DASH-01, FE-PE-02
  - **Complexity:** Medium

#### Advanced Analytics

- [ ] **[A-ADV-01]** PIVOT Engine — OLAP-style pivot tables
  - **File:** `packages/analytics/src/pivot-engine.ts`
  - **Dependency:** A-FND-01
  - **Complexity:** High

- [ ] **[A-ADV-02]** Drill-down Analytics — Hierarchical: Revenue → Branch → Customer → Invoice
  - **File:** Drill-down component + API
  - **Dependency:** A-FND-01
  - **Complexity:** High

- [ ] **[A-ADV-03]** Comparative Analysis — MoM, QoQ, YoY period-over-period
  - **File:** Comparison engine
  - **Dependency:** A-FND-01
  - **Complexity:** Medium

- [ ] **[A-ADV-04]** Metric Builder — Custom metric creation with formulas
  - **File:** `apps/web/app/dashboard/analytics/metrics/page.tsx` (extend existing)
  - **Dependency:** MetricDefinition model (exists)
  - **Complexity:** High

- [ ] **[A-ADV-05]** Export Engine — CSV, Excel, PDF export dari query results
  - **File:** `packages/analytics/src/export-engine.ts`
  - **Dependency:** Export libraries (xlsx, jspdf)
  - **Complexity:** Medium
  - **Ref:** [`docs/ANALYTICS-STUDIO.md`](docs/ANALYTICS-STUDIO.md) Section 18.12

- [ ] **[A-ADV-06]** Query Performance Dashboard — Monitor query performance across users
  - **File:** Performance monitoring page
  - **Dependency:** Query history data
  - **Complexity:** Medium

#### Data Lineage & Intelligence

- [ ] **[A-INT-01]** Data Lineage — Track metric origins and transformations
  - **File:** `packages/analytics/src/data-lineage.ts`
  - **Dependency:** Data Dictionary
  - **Complexity:** High
  - **Ref:** [`docs/ANALYTICS-STUDIO.md`](docs/ANALYTICS-STUDIO.md) Section 13

- [ ] **[A-INT-02]** Data Lineage API — GET /api/analytics/lineage, /:nodeId, /:nodeId/impact
  - **File:** `apps/web/app/api/analytics/lineage/route.ts` (new)
  - **Dependency:** A-INT-01
  - **Complexity:** Medium

- [ ] **[A-INT-03]** Anomaly Detection — Statistical anomaly detection dengan severity levels
  - **File:** `packages/analytics/src/anomaly-detector.ts`
  - **Dependency:** A-FND-01
  - **Complexity:** High

- [ ] **[A-INT-04]** Forecasting — Time-series: sales, cash flow, inventory demand
  - **File:** `packages/analytics/src/forecast-engine.ts`
  - **Dependency:** A-FND-01, ML library
  - **Complexity:** Very High

- [ ] **[A-INT-05]** Industry Analytics — Configurable analytics templates per industri
  - **File:** Industry-specific template definitions
  - **Dependency:** FE-ICE-01
  - **Complexity:** High

- [ ] **[A-INT-06]** Advanced Segmentation — Customer/product clustering, RFM analysis
  - **File:** Segmentation engine
  - **Dependency:** A-FND-01, ML library
  - **Complexity:** High

#### AI Analytics

- [ ] **[A-AI-01]** AI Analyst — Natural language → SQL → Review → Execute
  - **File:** `apps/web/app/dashboard/analytics/ai-analyst/page.tsx` (new)
  - **Dependency:** AI provider, A-FND-03
  - **Complexity:** Very High
  - **Ref:** [`docs/ANALYTICS-STUDIO.md`](docs/ANALYTICS-STUDIO.md) Section 14

- [ ] **[A-AI-02]** NLQ API — POST /api/analytics/ai/nlq
  - **File:** `apps/web/app/api/analytics/ai/nlq/route.ts` (new)
  - **Dependency:** A-AI-01
  - **Complexity:** Very High

- [ ] **[A-AI-03]** Automated Insights — AI-generated insights dari data patterns
  - **File:** Insight generation engine
  - **Dependency:** A-AI-01
  - **Complexity:** High

- [ ] **[A-AI-04]** AI Report Generator — AI-generated reports on schedule
  - **File:** Report generation engine
  - **Dependency:** A-AI-01, A-ADV-05
  - **Complexity:** High

- [ ] **[A-AI-05]** Decision Intelligence — AI-powered recommendations
  - **File:** Recommendation engine
  - **Dependency:** A-AI-01
  - **Complexity:** Very High

#### Analytics API Routes (Belum Dibuat)

- [ ] **[A-API-01]** `/api/analytics/sql` — SQL execution endpoint
- [ ] **[A-API-02]** `/api/analytics/sql/history` — Query history
- [ ] **[A-API-03]** `/api/analytics/sql/schema` — Schema for autocomplete
- [ ] **[A-API-04]** `/api/analytics/sql/format` — Format SQL query
- [ ] **[A-API-05]** `/api/analytics/sql/explain` — Execution plan
- [ ] **[A-API-06]** `/api/analytics/visual-query` — Visual query execution
- [ ] **[A-API-07]** `/api/analytics/visual-query/datasets` — List available datasets
- [ ] **[A-API-08]** `/api/analytics/visual-query/fields` — Fields for dataset
- [ ] **[A-API-09]** `/api/analytics/convert` — SQL ↔ Visual conversion
- [ ] **[A-API-10]** `/api/analytics/datasets` — Dataset CRUD
- [ ] **[A-API-11]** `/api/analytics/datasets/:id/refresh` — Refresh dataset
- [ ] **[A-API-12]** `/api/analytics/datasets/:id/preview` — Preview dataset data
- [ ] **[A-API-13]** `/api/analytics/charts/recommend` — Chart type recommendation
- [ ] **[A-API-14]** `/api/analytics/charts/:id/data` — Chart data
- [ ] **[A-API-15]** `/api/analytics/dashboards/:id/layout` — Layout update
- [ ] **[A-API-16]** `/api/analytics/dashboards/:id/widgets/:wid` — Widget CRUD
- [ ] **[A-API-17]** `/api/analytics/lineage` — Data lineage
- [ ] **[A-API-18]** `/api/analytics/lineage/:nodeId` — Lineage for node
- [ ] **[A-API-19]** `/api/analytics/lineage/:nodeId/impact` — Impact analysis
- [ ] **[A-API-20]** `/api/analytics/export` — Export endpoint
- [ ] **[A-API-21]** `/api/analytics/ai/nlq` — Natural Language Query
- [ ] **[A-API-22]** `/api/analytics/ai/suggest-metric` — Suggest metric
- [ ] **[A-API-23]** `/api/analytics/ai/explain-query` — Explain query
- [ ] **[A-API-24]** `/api/analytics/ai/optimize-query` — Optimize query
  - **Complexity:** Medium per route
  - **Ref:** [`docs/ANALYTICS-STUDIO.md`](docs/ANALYTICS-STUDIO.md) Section 18

---

## 🟡 MEDIUM PRIORITY — Feature Completeness

### Finance & Accounting

#### Core Accounting

- [ ] **[FIN-GL-01]** General Ledger — Full GL module
  - **File:** New module: `apps/web/app/dashboard/finance/gl/`
  - **Dependency:** Chart of Accounts (exists)
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 2.1

- [ ] **[FIN-GL-02]** Journal Entry — Manual journal entries
  - **File:** `apps/web/app/dashboard/finance/journal/` + API routes
  - **Dependency:** FIN-GL-01
  - **Complexity:** High

- [ ] **[FIN-GL-03]** Trial Balance — Trial balance report
  - **File:** Report component + API
  - **Dependency:** FIN-GL-01, FIN-GL-02
  - **Complexity:** Medium

- [ ] **[FIN-GL-04]** Financial Statements — Balance Sheet, Income Statement, Cash Flow
  - **File:** Report components
  - **Dependency:** FIN-GL-01
  - **Complexity:** Very High

#### Accounts Receivable

- [ ] **[FIN-AR-01]** Aging Report — 30/60/90 day buckets
  - **File:** Aging report component (extend existing)
  - **Dependency:** Invoice data
  - **Complexity:** Medium
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 2.2

- [ ] **[FIN-AR-02]** Credit Limit Management — Per-customer credit limits
  - **File:** Contact model extension + UI
  - **Dependency:** None
  - **Complexity:** Medium

#### Accounts Payable

- [ ] **[FIN-AP-01]** Bills & Expenses — Full expense tracking + AI categorization
  - **File:** New module: `apps/web/app/dashboard/finance/expenses/`
  - **Dependency:** None
  - **Complexity:** Medium
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 2.3

- [ ] **[FIN-AP-02]** Batch Payment Processing — Process multiple payments
  - **File:** Batch payment component
  - **Dependency:** Payment model
  - **Complexity:** Medium

- [ ] **[FIN-AP-03]** Scheduled Payments — Recurring payment scheduling
  - **File:** Scheduler component
  - **Dependency:** Cron job system
  - **Complexity:** Medium

#### Bank & Cash

- [ ] **[FIN-BC-01]** Multi-bank Account — Multiple bank account management
  - **File:** Bank account model + UI
  - **Dependency:** None
  - **Complexity:** Medium
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 2.4

- [ ] **[FIN-BC-02]** Petty Cash — Cash fund management
  - **File:** New module
  - **Dependency:** None
  - **Complexity:** Medium

- [ ] **[FIN-BC-03]** Bank Feed — Auto-import bank transactions
  - **File:** Bank feed integration
  - **Dependency:** Banking API integration
  - **Complexity:** High

#### Tax Engine

- [ ] **[FIN-TAX-01]** Coretax-ready — Integrasi dengan sistem pajak Indonesia
  - **File:** Tax module
  - **Dependency:** Coretax API documentation
  - **Complexity:** Very High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 2.5

- [ ] **[FIN-TAX-02]** e-Faktur — Electronic invoice untuk pajak
  - **File:** e-Faktur integration
  - **Dependency:** FIN-TAX-01
  - **Complexity:** Very High

- [ ] **[FIN-TAX-03]** PPh 21 — Income tax calculation
  - **File:** Tax calculation engine
  - **Dependency:** None
  - **Complexity:** High

- [ ] **[FIN-TAX-04]** PPh 23 — Withholding tax calculation
  - **File:** Tax calculation engine
  - **Dependency:** None
  - **Complexity:** High

- [ ] **[FIN-TAX-05]** PPN — Value added tax
  - **File:** Tax calculation engine
  - **Dependency:** None
  - **Complexity:** High

- [ ] **[FIN-TAX-06]** Tax Report — Tax reporting
  - **File:** Tax report components
  - **Dependency:** FIN-TAX-03, FIN-TAX-04, FIN-TAX-05
  - **Complexity:** High

#### Revenue Recognition

- [ ] **[FIN-REV-01]** ASC 606 / IFRS 15 — Revenue recognition standards
  - **File:** Revenue recognition engine
  - **Dependency:** FIN-GL-01
  - **Complexity:** Very High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 2.6

### Sales & CRM

#### Pipeline Management

- [ ] **[CRM-PL-01]** Multiple Pipelines — Support multiple sales pipelines
  - **File:** Pipeline model extension + UI
  - **Dependency:** None
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 3.2

- [ ] **[CRM-PL-02]** Deal Value Forecasting — AI prediction
  - **File:** Forecasting engine
  - **Dependency:** ML library
  - **Complexity:** High

#### Lead Management

- [ ] **[CRM-LM-01]** Lead Scoring — Auto-score leads
  - **File:** Scoring engine
  - **Dependency:** Lead data history
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 3.3

- [ ] **[CRM-LM-02]** Lead Assignment — Auto-assign leads
  - **File:** Assignment rules engine
  - **Dependency:** None
  - **Complexity:** Medium

- [ ] **[CRM-LM-03]** Lead Source Tracking — Multi-touch attribution
  - **File:** Attribution model
  - **Dependency:** None
  - **Complexity:** Medium

#### Quote to Order

- [ ] **[CRM-QO-01]** Seamless Convert to Order — Full quotation → order flow
  - **File:** Order model + conversion logic
  - **Dependency:** None
  - **Complexity:** Medium

- [ ] **[CRM-QO-02]** Approval Workflow — Quote approval chain
  - **File:** Approval integration
  - **Dependency:** UCE-10
  - **Complexity:** Medium

#### Customer 360°

- [ ] **[CRM-360-01]** Unified Profile — Comprehensive customer view
  - **File:** Customer 360 page
  - **Dependency:** All CRM + Finance data
  - **Complexity:** High

- [ ] **[CRM-360-02]** Interaction Timeline — Full interaction history
  - **File:** Timeline component
  - **Dependency:** Audit trail
  - **Complexity:** Medium

- [ ] **[CRM-360-03]** Customer Segmentation — RFM analysis, behavioral segmentation
  - **File:** Segmentation engine
  - **Dependency:** Transaction data
  - **Complexity:** High

#### Sales Intelligence (AI)

- [ ] **[CRM-AI-01]** Win Probability — Predict deal win chance
  - **File:** ML prediction engine
  - **Dependency:** Historical deal data
  - **Complexity:** High

- [ ] **[CRM-AI-02]** Next Best Action — Suggest next steps
  - **File:** Recommendation engine
  - **Dependency:** CRM-AI-01
  - **Complexity:** High

- [ ] **[CRM-AI-03]** Sales Forecasting — Revenue prediction
  - **File:** Forecasting engine
  - **Dependency:** Historical data
  - **Complexity:** High

- [ ] **[CRM-AI-04]** Competitor Analysis — Win/loss analysis
  - **File:** Analysis component
  - **Dependency:** Deal data
  - **Complexity:** Medium

#### Commission Calculator

- [ ] **[CRM-COM-01]** Flexible Commission Rules — Configurable commission structure
  - **File:** Commission model + calculator
  - **Dependency:** None
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 3.7

- [ ] **[CRM-COM-02]** Real-time Calculation — Live commission calculation
  - **File:** Real-time engine
  - **Dependency:** CRM-COM-01
  - **Complexity:** Medium

### Inventory & Supply Chain

#### Product Management

- [ ] **[INV-PM-01]** Batch/Lot Tracking — Batch number + expiry date
  - **File:** Batch model + tracking UI
  - **Dependency:** None
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 4.1

- [ ] **[INV-PM-02]** Serial Number — Individual item tracking
  - **File:** Serial number model
  - **Dependency:** None
  - **Complexity:** Medium

- [ ] **[INV-PM-03]** Bill of Materials (BOM) — Product composition
  - **File:** BOM model + UI
  - **Dependency:** None
  - **Complexity:** High

#### Stock Management

- [ ] **[INV-SM-01]** Multi-warehouse — Multiple warehouse locations
  - **File:** Warehouse model + location tracking
  - **Dependency:** None
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 4.2

- [ ] **[INV-SM-02]** Stock Opname — Physical stock count
  - **File:** Stock opname module
  - **Dependency:** INV-SM-01
  - **Complexity:** Medium

- [ ] **[INV-SM-03]** Unit of Measure — Multiple UoM per product
  - **File:** UoM model + conversion
  - **Dependency:** None
  - **Complexity:** Medium

#### Procurement

- [ ] **[INV-PR-01]** Auto-generated PO — PO dari reorder point
  - **File:** Auto-PO engine
  - **Dependency:** Stock monitoring
  - **Complexity:** Medium
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 4.3

- [ ] **[INV-PR-02]** Goods Receipt — Penerimaan barang
  - **File:** Goods receipt module
  - **Dependency:** PO model
  - **Complexity:** Medium

- [ ] **[INV-PR-03]** Supplier Price Monitoring — Bandingkan harga supplier
  - **File:** Price comparison component
  - **Dependency:** Supplier data
  - **Complexity:** Medium

#### Warehouse Operations

- [ ] **[INV-WH-01]** Putaway Rules — Lokasi penyimpanan
  - **File:** Rule engine
  - **Dependency:** INV-SM-01
  - **Complexity:** Medium
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 4.4

- [ ] **[INV-WH-02]** Picking Strategy — FIFO, LIFO, FEFO
  - **File:** Strategy engine
  - **Dependency:** INV-SM-01
  - **Complexity:** Medium

- [ ] **[INV-WH-03]** Barcode/QR Scanning — Scan untuk operasi gudang
  - **File:** Scanner component (mobile)
  - **Dependency:** Camera API
  - **Complexity:** Medium

- [ ] **[INV-WH-04]** Shipping Integration — Integrasi JNE, J&T, SiCepat
  - **File:** Shipping API integration
  - **Dependency:** External API
  - **Complexity:** High

#### Inventory Intelligence (AI)

- [ ] **[INV-AI-01]** Low-stock Alert — Real-time stock alert
  - **File:** Alert engine
  - **Dependency:** Stock data
  - **Complexity:** Medium
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 4.5

- [ ] **[INV-AI-02]** Auto-reorder Suggestion — Sarankan reorder
  - **File:** Reorder engine
  - **Dependency:** Historical demand data
  - **Complexity:** High

- [ ] **[INV-AI-03]** Demand Forecasting — Prediksi demand
  - **File:** Forecasting engine
  - **Dependency:** Historical sales data, ML
  - **Complexity:** High

- [ ] **[INV-AI-04]** Dead Stock Detection — Identifikasi produk tidak bergerak
  - **File:** Analysis engine
  - **Dependency:** Sales velocity data
  - **Complexity:** Medium

### HR & People Ops

#### Employee Management

- [ ] **[HR-EM-01]** Digital Onboarding — Automated onboarding workflow
  - **File:** Onboarding module
  - **Dependency:** FE-WE-01
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 5.1

- [ ] **[HR-EM-02]** Org Chart — Organizational hierarchy visualization
  - **File:** Org chart component
  - **Dependency:** Employee data with reporting structure
  - **Complexity:** Medium

- [ ] **[HR-EM-03]** Employee Self-Service — Portal untuk karyawan
  - **File:** Self-service portal
  - **Dependency:** None
  - **Complexity:** High

#### Attendance & Time

- [ ] **[HR-AT-01]** GPS Check-in with Geofencing — Location-based attendance
  - **File:** Geofencing engine
  - **Dependency:** Mobile app GPS
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 5.2

- [ ] **[HR-AT-02]** Face Recognition — Biometric attendance
  - **File:** Face recognition integration
  - **Dependency:** ML library, camera API
  - **Complexity:** Very High

- [ ] **[HR-AT-03]** Flexible Schedule — Configurable work schedules
  - **File:** Schedule model + UI
  - **Dependency:** None
  - **Complexity:** Medium

#### Leave Management

- [ ] **[HR-LV-01]** Leave Balance — Real-time leave balance tracking
  - **File:** Leave balance engine
  - **Dependency:** Leave policy configuration
  - **Complexity:** Medium
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 5.3

- [ ] **[HR-LV-02]** Leave Calendar — Visual calendar view
  - **File:** Calendar component
  - **Dependency:** None
  - **Complexity:** Medium

- [ ] **[HR-LV-03]** Public Holiday — Holiday management
  - **File:** Holiday model + UI
  - **Dependency:** None
  - **Complexity:** Low

#### Payroll

- [ ] **[HR-PY-01]** PPh 21 — Complete income tax calculation
  - **File:** Tax calculation engine
  - **Dependency:** Indonesian tax rules
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 5.4

- [ ] **[HR-PY-02]** BPJS — Social security calculation
  - **File:** BPJS calculation engine
  - **Dependency:** BPJS rates
  - **Complexity:** High

- [ ] **[HR-PY-03]** THR — Holiday allowance calculation
  - **File:** THR calculation
  - **Dependency:** None
  - **Complexity:** Low

- [ ] **[HR-PY-04]** Payroll Report — SPT format payroll reports
  - **File:** Report components
  - **Dependency:** HR-PY-01, HR-PY-02
  - **Complexity:** Medium

#### Template Builder (Pain Point Solution)

- [ ] **[HR-TB-01]** Offer Letter — Generate offer letter dari template
  - **File:** Document template engine
  - **Dependency:** Template system
  - **Complexity:** Medium
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 5.5

- [ ] **[HR-TB-02]** Kontrak Kerja — Generate employment contract
  - **File:** Document template engine
  - **Dependency:** HR-TB-01
  - **Complexity:** Medium

- [ ] **[HR-TB-03]** Warning Letter — Generate warning letter
  - **File:** Document template engine
  - **Dependency:** HR-TB-01
  - **Complexity:** Low

- [ ] **[HR-TB-04]** Performance Review — Performance review document
  - **File:** Document template engine
  - **Dependency:** HR-TB-01
  - **Complexity:** Medium

- [ ] **[HR-TB-05]** Termination Letter — Generate termination letter
  - **File:** Document template engine
  - **Dependency:** HR-TB-01
  - **Complexity:** Low

- [ ] **[HR-TB-06]** Surat Keterangan — Generate various certificates
  - **File:** Document template engine
  - **Dependency:** HR-TB-01
  - **Complexity:** Low

#### Performance & OKR

- [ ] **[HR-PF-01]** OKR Setting — Objectives & Key Results
  - **File:** OKR module
  - **Dependency:** None
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 5.6

- [ ] **[HR-PF-02]** 360° Feedback — Multi-rater feedback
  - **File:** Feedback module
  - **Dependency:** None
  - **Complexity:** High

### Operations & Project

> **Seluruh module ini BELUM ada kode sama sekali (0%).**

- [ ] **[OPS-PM-01]** Project Types — Multiple project types
  - **File:** New module: `apps/web/app/dashboard/projects/`
  - **Dependency:** None
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 6.1

- [ ] **[OPS-PM-02]** Gantt Chart — Project timeline visualization
  - **File:** Gantt chart component
  - **Dependency:** OPS-PM-01
  - **Complexity:** High

- [ ] **[OPS-PM-03]** Kanban Board — Task board
  - **File:** Kanban component
  - **Dependency:** OPS-PM-01
  - **Complexity:** High

- [ ] **[OPS-PM-04]** Resource Allocation — Team resource management
  - **File:** Resource model + UI
  - **Dependency:** HR data
  - **Complexity:** Medium

- [ ] **[OPS-PM-05]** Budget Tracking — Project budget management
  - **File:** Budget model + UI
  - **Dependency:** Finance data
  - **Complexity:** Medium

- [ ] **[OPS-TT-01]** Task Assignment — Assign tasks to team members
  - **File:** Task model + UI
  - **Dependency:** OPS-PM-01
  - **Complexity:** Medium
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 6.2

- [ ] **[OPS-TT-02]** Time Logging — Log time spent on tasks
  - **File:** Time log model
  - **Dependency:** OPS-TT-01
  - **Complexity:** Medium

- [ ] **[OPS-TT-03]** Timesheet — Weekly/monthly timesheet
  - **File:** Timesheet component
  - **Dependency:** OPS-TT-02
  - **Complexity:** Medium

- [ ] **[OPS-FS-01]** Job Scheduling — Field service scheduling
  - **File:** Scheduling module
  - **Dependency:** None
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 6.3

- [ ] **[OPS-FS-02]** Mobile Checklist — Checklist untuk technician
  - **File:** Mobile component
  - **Dependency:** Mobile app
  - **Complexity:** Medium

- [ ] **[OPS-FS-03]** Digital Signature — Tanda tangan digital
  - **File:** Signature component
  - **Dependency:** Canvas API
  - **Complexity:** Medium

- [ ] **[OPS-QC-01]** Quality Checklist — Quality control checklist
  - **File:** Quality module
  - **Dependency:** None
  - **Complexity:** Medium
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 6.4

### Customer Support & Communication

- [ ] **[SUP-OM-01]** WhatsApp Business Integration — Omnichannel messaging
  - **File:** WhatsApp API integration
  - **Dependency:** WhatsApp Business API
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 7.1

- [ ] **[SUP-OM-02]** Instagram Integration — Instagram DM
  - **File:** Instagram API integration
  - **Dependency:** Instagram API
  - **Complexity:** Medium

- [ ] **[SUP-OM-03]** Live Chat — Website live chat
  - **File:** Live chat component
  - **Dependency:** WebSocket
  - **Complexity:** High

- [ ] **[SUP-OM-04]** Facebook Integration — Facebook Messenger
  - **File:** Facebook API integration
  - **Dependency:** Facebook API
  - **Complexity:** Medium

- [ ] **[SUP-TK-01]** Ticket System — Full ticket management
  - **File:** New module: `apps/web/app/dashboard/support/`
  - **Dependency:** None
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 7.2

- [ ] **[SUP-TK-02]** Priority & Category — Ticket classification
  - **File:** Classification engine
  - **Dependency:** SUP-TK-01
  - **Complexity:** Medium

- [ ] **[SUP-TK-03]** SLA Tracking — Support SLA monitoring
  - **File:** SLA tracking component
  - **Dependency:** SUP-TK-01
  - **Complexity:** Medium

- [ ] **[SUP-KB-01]** Knowledge Base — Article editor + categories + search
  - **File:** KB module
  - **Dependency:** None
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 7.3

- [ ] **[SUP-CP-01]** Customer Portal — Customer self-service
  - **File:** Portal module
  - **Dependency:** Auth system
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 7.5

### Admin & Security

#### Authentication

- [ ] **[SEC-AUTH-01]** SSO — Single Sign-On (Google, Microsoft)
  - **File:** [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts) — extend providers
  - **Dependency:** OAuth provider setup
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 11.1

- [ ] **[SEC-AUTH-02]** 2FA — Two-Factor Authentication
  - **File:** TOTP/HOTP implementation
  - **Dependency:** None
  - **Complexity:** High

- [ ] **[SEC-AUTH-03]** Multi-device Session Control — View/revoke sessions
  - **File:** Session management UI
  - **Dependency:** None
  - **Complexity:** Medium

#### Access Control

- [ ] **[SEC-AC-01]** IP Whitelisting — Per-tenant IP restriction
  - **File:** IP whitelist model + middleware
  - **Dependency:** None
  - **Complexity:** Medium
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 11.2

- [ ] **[SEC-AC-02]** Data-level Security — Column/row level security
  - **File:** Security engine
  - **Dependency:** FE-PE-02
  - **Complexity:** High

#### Data Protection

- [ ] **[SEC-DP-01]** Encryption at Rest — AES-256 encryption
  - **File:** Encryption utilities
  - **Dependency:** None
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 11.3

- [ ] **[SEC-DP-02]** Auto-backup — Daily automated backups
  - **File:** Backup scripts + cron
  - **Dependency:** Storage system
  - **Complexity:** Medium

- [ ] **[SEC-DP-03]** Data Retention — Automated data retention policies
  - **File:** Retention engine
  - **Dependency:** None
  - **Complexity:** Medium

#### Compliance

- [ ] **[SEC-CMP-01]** GDPR Ready — Data protection compliance
  - **File:** GDPR utilities
  - **Dependency:** None
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 11.4

- [ ] **[SEC-CMP-02]** Indonesian Regulation (PDP) — UU PDP compliance
  - **File:** PDP compliance utilities
  - **Dependency:** None
  - **Complexity:** High

- [ ] **[SEC-CMP-03]** SOC 2 Type II — Security compliance target
  - **File:** Compliance documentation + controls
  - **Dependency:** All security features
  - **Complexity:** Very High

#### White-label

- [ ] **[SEC-WL-01]** Custom Branding — Logo, colors, themes
  - **File:** Branding configuration
  - **Dependency:** None
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 11.5

- [ ] **[SEC-WL-02]** Reseller Portal — Partner/reseller management
  - **File:** Reseller module
  - **Dependency:** FE-PE-02
  - **Complexity:** High

### Integration & Ecosystem

#### Payment Gateway

- [ ] **[INT-PG-01]** Xendit Integration — Alternative payment gateway
  - **File:** `apps/web/lib/payment/xendit.ts` (new)
  - **Dependency:** Xendit API
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 10.2

#### API & Webhook

- [ ] **[INT-API-01]** Public API Documentation — OpenAPI/Swagger docs
  - **File:** API documentation
  - **Dependency:** None
  - **Complexity:** Medium
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 10.5

- [ ] **[INT-API-02]** GraphQL — GraphQL API layer
  - **File:** GraphQL server
  - **Dependency:** None
  - **Complexity:** High

- [ ] **[INT-API-03]** Webhook — Event-driven webhooks
  - **File:** Webhook model + dispatcher
  - **Dependency:** None
  - **Complexity:** High

- [ ] **[INT-API-04]** OAuth 2.0 — OAuth provider for third-party access
  - **File:** OAuth server
  - **Dependency:** None
  - **Complexity:** High

#### Automation Connectors

- [ ] **[INT-AC-01]** Zapier Integration
  - **File:** Zapier app definition
  - **Dependency:** INT-API-03
  - **Complexity:** Medium
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 10.6

- [ ] **[INT-AC-02]** Make.com Integration
  - **File:** Make.com module definition
  - **Dependency:** INT-API-03
  - **Complexity:** Medium

- [ ] **[INT-AC-03]** n8n Integration
  - **File:** n8n node definition
  - **Dependency:** INT-API-03
  - **Complexity:** Medium

#### Supported Integrations

- [ ] **[INT-SUP-01]** WhatsApp Business — Meta API integration
  - **File:** WhatsApp client
  - **Dependency:** Meta Business API
  - **Complexity:** High

- [ ] **[INT-SUP-02]** Marketplace — Tokopedia, Shopee, Bukalapak
  - **File:** Marketplace connectors
  - **Dependency:** Marketplace APIs
  - **Complexity:** Very High

- [ ] **[INT-SUP-03]** Banking — BCA, Mandiri, BRI, BNI auto-reconciliation
  - **File:** Banking API integration
  - **Dependency:** Banking APIs
  - **Complexity:** Very High

- [ ] **[INT-SUP-04]** Productivity — Google Workspace, Microsoft 365
  - **File:** Integration connectors
  - **Dependency:** Google/Microsoft APIs
  - **Complexity:** High

### Multi-entity & Multi-currency

- [ ] **[CORE-ME-01]** Multi-entity — Multiple legal entities per tenant
  - **File:** Entity model + switching logic
  - **Dependency:** None
  - **Complexity:** Very High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 1

- [ ] **[CORE-MC-01]** Multi-currency — Multiple currency support
  - **File:** Currency model + conversion engine
  - **Dependency:** Exchange rate API
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 1

---

## 🔵 LOW PRIORITY — Advanced Features

### AI Features

#### AI Hub & Chat

- [ ] **[AI-HUB-01]** AI Hub Page — `/dashboard/ai` workspace
  - **File:** `apps/web/app/dashboard/ai/page.tsx` (new)
  - **Dependency:** AI provider
  - **Complexity:** Medium
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 9.1

- [ ] **[AI-HUB-02]** AI Chat — Replace mock responses with real database queries
  - **File:** [`apps/web/components/ai/ai-chat.tsx`](apps/web/components/ai/ai-chat.tsx)
  - **Dependency:** AI provider, DB access
  - **Complexity:** High

- [ ] **[AI-HUB-03]** AI Insights — Business insight cards
  - **File:** Insight generation engine
  - **Dependency:** All modules data
  - **Complexity:** High

#### AI Agent Capabilities

- [ ] **[AI-AG-01]** Finance Agent — Auto-invoice, anomaly detection, cash flow prediction
  - **File:** `apps/web/lib/ai/agents/finance.ts` (new)
  - **Dependency:** Finance data, AI provider
  - **Complexity:** Very High
  - **Ref:** [`AGENT.md`](AGENT.md) Section 12.1

- [ ] **[AI-AG-02]** Sales Agent — Win probability, next best action, lead scoring
  - **File:** `apps/web/lib/ai/agents/sales.ts` (new)
  - **Dependency:** CRM data, AI provider
  - **Complexity:** Very High
  - **Ref:** [`AGENT.md`](AGENT.md) Section 12.2

- [ ] **[AI-AG-03]** Inventory Agent — Stockout prediction, auto-reorder, demand forecasting
  - **File:** `apps/web/lib/ai/agents/inventory.ts` (new)
  - **Dependency:** Inventory data, AI provider
  - **Complexity:** Very High
  - **Ref:** [`AGENT.md`](AGENT.md) Section 12.3

- [ ] **[AI-AG-04]** HR Agent — Contract generation, leave prediction, attrition risk
  - **File:** `apps/web/lib/ai/agents/hr.ts` (new)
  - **Dependency:** HR data, AI provider
  - **Complexity:** Very High
  - **Ref:** [`AGENT.md`](AGENT.md) Section 12.4

- [ ] **[AI-AG-05]** Support Agent — Auto-categorize, suggested reply, sentiment analysis
  - **File:** `apps/web/lib/ai/agents/support.ts` (new)
  - **Dependency:** Support data, AI provider
  - **Complexity:** Very High
  - **Ref:** [`AGENT.md`](AGENT.md) Section 12.5

#### Smart Document Extraction

- [ ] **[AI-DOC-01]** PDF Processing — Extract data from PDF
  - **File:** PDF extraction engine
  - **Dependency:** PDF parsing library
  - **Complexity:** High
  - **Ref:** [`AGENT.md`](AGENT.md) Section 12.6

- [ ] **[AI-DOC-02]** OCR — Scan dokumen fisik
  - **File:** OCR engine
  - **Dependency:** OCR library (tesseract)
  - **Complexity:** High

- [ ] **[AI-DOC-03]** Auto-validation — Validate extracted data completeness
  - **File:** Validation rules engine
  - **Dependency:** AI-DOC-01
  - **Complexity:** Medium

- [ ] **[AI-DOC-04]** Auto-entry — Push extracted data ke system
  - **File:** Data entry automation
  - **Dependency:** AI-DOC-03
  - **Complexity:** Medium

#### AI Template Generator

- [ ] **[AI-TPL-01]** Contract Generator — Generate contracts dari spesifikasi
  - **File:** Template engine
  - **Dependency:** AI provider
  - **Complexity:** High
  - **Ref:** [`AGENT.md`](AGENT.md) Section 12.7

- [ ] **[AI-TPL-02]** Job Description — Generate JD dari requirements
  - **File:** Template engine
  - **Dependency:** AI provider
  - **Complexity:** Medium

- [ ] **[AI-TPL-03]** Email Template — Generate contextual emails
  - **File:** Template engine
  - **Dependency:** AI provider
  - **Complexity:** Medium

- [ ] **[AI-TPL-04]** Report Summary — Ringkas laporan panjang
  - **File:** Summarization engine
  - **Dependency:** AI provider
  - **Complexity:** Medium

#### Anomaly Detection

- [ ] **[AI-ANM-01]** Fraud Detection — Deteksi transaksi mencurigakan
  - **File:** Fraud detection engine
  - **Dependency:** Transaction data, ML
  - **Complexity:** Very High
  - **Ref:** [`AGENT.md`](AGENT.md) Section 13

- [ ] **[AI-ANM-02]** Data Error Detection — Deteksi error data
  - **File:** Data validation engine
  - **Dependency:** All modules
  - **Complexity:** High

- [ ] **[AI-ANM-03]** Performance Anomaly — Deteksi anomali performa
  - **File:** Performance monitoring
  - **Dependency:** System metrics
  - **Complexity:** Medium

### Mobile App

- [ ] **[MOB-01]** Auth Flow — Login/Register flow untuk React Native
  - **File:** [`apps/mobile/`](apps/mobile/) — auth screens + API client
  - **Dependency:** Auth system
  - **Complexity:** High
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 16

- [ ] **[MOB-02]** Offline Support — Local cache + sync
  - **File:** Offline storage + sync engine
  - **Dependency:** Service worker
  - **Complexity:** Very High

### Desktop App

- [ ] **[DES-01]** Auth Integration — Integrate auth ke Electron
  - **File:** [`apps/desktop/main.js`](apps/desktop/main.js)
  - **Dependency:** Auth system
  - **Complexity:** Medium
  - **Ref:** [`FEATURES.md`](FEATURES.md) Section 17

- [ ] **[DES-02]** Offline Support — Local cache untuk Electron
  - **File:** Electron offline storage
  - **Dependency:** IndexedDB
  - **Complexity:** High

### POS Module

> **POS adalah Core Module — terintegrasi langsung ke ERP.**
> Ref: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 22, [`FEATURES.md`](FEATURES.md) Section 15

- [ ] **[POS-01]** POS Core — Transaksi penjualan langsung dengan cart
  - **File:** New module: `apps/web/app/dashboard/pos/`
  - **Dependency:** Inventory, Finance modules
  - **Complexity:** Very High
  - **Ref:** Phase 22

- [ ] **[POS-02]** POS Returns — Pengembalian barang
  - **File:** Returns module
  - **Dependency:** POS-01
  - **Complexity:** Medium

- [ ] **[POS-03]** POS Refunds — Pengembalian dana
  - **File:** Refund workflow
  - **Dependency:** POS-01
  - **Complexity:** Medium

- [ ] **[POS-04]** POS Barcode — Barcode scanning
  - **File:** Scanner component
  - **Dependency:** Camera API
  - **Complexity:** Medium

- [ ] **[POS-05]** POS Payments — Multi metode: cash, card, e-wallet, QRIS
  - **File:** Payment integration
  - **Dependency:** Payment gateway
  - **Complexity:** High

- [ ] **[POS-06]** POS Shift Management — Open/track/close shift
  - **File:** Shift lifecycle engine
  - **Dependency:** UCE-24
  - **Complexity:** High

- [ ] **[POS-07]** POS Receipt — Receipt generation dan printing
  - **File:** Receipt template + printing
  - **Dependency:** Thermal printer API
  - **Complexity:** Medium

- [ ] **[POS-08]** POS Offline Mode — Transaksi tanpa internet
  - **File:** Offline storage + sync
  - **Dependency:** Service worker
  - **Complexity:** Very High

- [ ] **[POS-09]** POS Closing — Daily/shift closing dengan approval
  - **File:** Closing workflow
  - **Dependency:** POS-06
  - **Complexity:** Medium

- [ ] **[POS-10]** POS Industry Config — Retail, F&B, Bengkel, Apotek flows
  - **File:** Industry-specific configuration
  - **Dependency:** FE-ICE-01, POS-01
  - **Complexity:** High

### Industry Packs

> **9 Industry Packs — semua `planned` (0%).**
> Ref: [`FEATURES.md`](FEATURES.md) Section 14, [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 7

- [ ] **[IP-01]** Retail Pack — POS, stock replenishment, barcode, dashboard
- [ ] **[IP-02]** Wholesale/Distribution Pack — Route, driver, vehicle, delivery order
- [ ] **[IP-03]** Manufacturing Pack — Work order, BOM, quality report, production line
- [ ] **[IP-04]** Construction Pack — Site, contract, progress, BAST, progress report
- [ ] **[IP-05]** Consulting/Agency Pack — Project workflow, billable hours, SOW, timesheet
- [ ] **[IP-06]** Logistics Pack — Route & vehicle, delivery note, POD
- [ ] **[IP-07]** Education Pack — Student, class, transcript, certificate
- [ ] **[IP-08]** Healthcare Pack — Patient, medical record, insurance integration
- [ ] **[IP-09]** F&B Pack — Recipe, batch & expiry, production report
  - **Complexity:** Very High (setiap pack)
  - **Dependency:** FE-ICE-01

### Platform Control Center

> **65+ planned features — 4 Worlds Separation.**
> Ref: [`FEATURES.md`](FEATURES.md) Section 19, [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 23

#### Tenant Management

- [ ] **[PLT-TM-01]** Tenant List — View all tenants
- [ ] **[PLT-TM-02]** Tenant Detail — Single tenant overview
- [ ] **[PLT-TM-03]** Tenant Provisioning — Auto-create on registration
- [ ] **[PLT-TM-04]** Tenant Suspension — Suspend for non-payment
- [ ] **[PLT-TM-05]** Tenant Reactivation — Reactivate suspended
- [ ] **[PLT-TM-06]** Tenant Deletion — Archive with 30-day grace
- [ ] **[PLT-TM-07]** Tenant Settings Override — Platform-level override

#### Subscription & Entitlement

- [ ] **[PLT-SE-01]** Plan Management — Create/edit/archive plans
- [x] **[PLT-SE-02]** Entitlement Engine — ✅ DONE (~75% implemented, Batch 7E: plan-based access control)
- [ ] **[PLT-SE-03]** Subscription Lifecycle — ACTIVE → PAST_DUE → GRACE → SUSPENDED → ARCHIVED
- [ ] **[PLT-SE-04]** Payment Review Workflow — Transfer → Review → Approve/Reject
- [ ] **[PLT-SE-05]** Auto-billing — Scheduled billing cycle
- [ ] **[PLT-SE-06]** Usage-based Pricing — Metered billing

#### Usage Metering

- [ ] **[PLT-UM-01]** User Count Tracking
- [ ] **[PLT-UM-02]** Storage Metering
- [ ] **[PLT-UM-03]** API Call Metering
- [ ] **[PLT-UM-04]** Transaction Metering
- [ ] **[PLT-UM-05]** Usage Alerts — 80%/90%/100% thresholds
- [ ] **[PLT-UM-06]** Usage Dashboard

#### Error & Log Center

- [ ] **[PLT-EL-01]** Error Grouping — Stack trace aggregation
- [ ] **[PLT-EL-02]** Error Severity Levels — CRITICAL/HIGH/MEDIUM/LOW
- [ ] **[PLT-EL-03]** Tenant Isolation (Errors)
- [ ] **[PLT-EL-04]** Error Timeline — Frequency trend
- [ ] **[PLT-EL-05]** Error Resolution Tracking
- [ ] **[PLT-EL-06]** System Log Viewer
- [ ] **[PLT-EL-07]** Audit Log (Platform) — Immutable audit trail

#### Tenant Health Dashboard

- [ ] **[PLT-HD-01]** Health Status Overview — Healthy 🟢 / Degraded 🟡 / Critical 🔴
- [ ] **[PLT-HD-02]** API Latency Monitoring
- [ ] **[PLT-HD-03]** Database Health
- [ ] **[PLT-HD-04]** Storage Health
- [ ] **[PLT-HD-05]** Queue Health
- [ ] **[PLT-HD-06]** Error Rate Monitoring
- [ ] **[PLT-HD-07]** Uptime Tracking

#### Support System

- [ ] **[PLT-SUP-01]** Support Tickets — Full ticket management
- [ ] **[PLT-SUP-02]** Auto-attach Context — Tenant info auto-attached
- [ ] **[PLT-SUP-03]** Internal Notes — Agent internal notes
- [ ] **[PLT-SUP-04]** SLA Tracking — Response time SLA
- [ ] **[PLT-SUP-05]** Ticket Escalation — Auto-escalate on SLA breach
- [ ] **[PLT-SUP-06]** Customer Communication — In-platform messaging

#### Impersonation

- [ ] **[PLT-IMP-01]** Impersonation Request — Request temporary access
- [ ] **[PLT-IMP-02]** Reason & Approval — Must provide reason + approval
- [ ] **[PLT-IMP-03]** Temporary Session — Time-limited (max 30 min)
- [ ] **[PLT-IMP-04]** Audit Trail (Impersonation) — All actions logged
- [ ] **[PLT-IMP-05]** Tenant Notification — Notify on start/end

#### Feature Flags

- [ ] **[PLT-FF-01]** Feature Flag Management — CRUD flags
- [ ] **[PLT-FF-02]** Rollout Stages — Internal → Tenant → Percentage → 100%
- [ ] **[PLT-FF-03]** Tenant-specific Flags
- [ ] **[PLT-FF-04]** A/B Testing Support
- [ ] **[PLT-FF-05]** Flag Analytics

#### Security Center

- [ ] **[PLT-SC-01]** Failed Login Monitoring
- [ ] **[PLT-SC-02]** Suspicious Activity Detection
- [ ] **[PLT-SC-03]** Permission Change Audit
- [ ] **[PLT-SC-04]** API Key Management
- [ ] **[PLT-SC-05]** Immutable Audit Log
- [ ] **[PLT-SC-06]** IP Allowlist
- [ ] **[PLT-SC-07]** Session Management

#### Platform Apps

- [ ] **[PLT-APP-01]** `apps/platform-admin` — New Next.js app untuk superadmin
- [ ] **[PLT-APP-02]** Platform routes — `/platform/*` routes
- [ ] **[PLT-APP-03]** Platform auth — Superadmin JWT (platform-scoped)
- [ ] **[PLT-APP-04]** Platform middleware — `/platform/*` auth check
- [ ] **[PLT-APP-05]** Platform UI — Dashboard, tenant list, support, monitoring
  - **Complexity:** Very High (entire platform app)
  - **Dependency:** FE-PE-02, FE-WE-01
  - **Ref:** Phase 23-25

---

## 📋 Appendix: File-by-File Reference

### New Packages to Create

| Package | Path | Description | Complexity | Phase |
|---------|------|-------------|------------|-------|
| `@qalcuity/permissions` | `packages/permissions/` | Permission engine (`can()` function) | Very High | 9 |
| `@qalcuity/workflow` | `packages/workflow/` | Workflow engine + Unified Control Engine | Very High | 10 |
| `@qalcuity/industry-config` | `packages/industry-config/` | Industry configuration engine | Very High | 11 |
| `@qalcuity/auth` | `packages/auth/` | Auth logic (extract from web) | High | 9 |

### New Apps to Create

| App | Path | Description | Complexity | Phase |
|-----|------|-------------|------------|-------|
| Platform Admin | `apps/platform-admin/` | Superadmin dashboard | Very High | 23 |

### Prisma Schema Extensions Needed

| Model | Purpose | Phase |
|-------|---------|-------|
| Permission, Role, Membership, Scope | Permission Engine | 9 |
| Workflow, WorkflowStep, Transition | Workflow Engine | 10 |
| Policy, PolicyRule, PolicyVersion | Policy Engine | 10 |
| ApprovalChain, ApprovalStep, ApprovalLog | Approval Engine | 10 |
| SLA, SLABreach, Escalation | SLA & Escalation | 10 |
| Delegation, DelegationLog | Delegation | 10 |
| WorkInboxItem | Work Inbox | 10 |
| Lock, LockPolicy | Locking Engine | 10 |
| Exception, ExceptionLog | Exception Center | 10 |
| AdjustmentEntry | Adjustment Entries | 10 |
| AccessReview, EmergencyAccess | Access Review | 10 |
| PeriodClosing, PeriodClosingStep | Period Closing | 10 |
| IndustryPack, CustomField, CustomDocument | Industry Config | 11 |
| Warehouse, WarehouseLocation, Batch | Inventory Extensions | 12 |
| JournalEntry, GLAccount, TrialBalance | Accounting | 12 |
| TaxRule, TaxCalculation, TaxReport | Tax Engine | 12 |
| Project, Task, TimeLog, Timesheet | Project Management | 13 |
| Ticket, TicketCategory, KnowledgeBase | Support | 13 |
| POSSale, POSSaleItem, POSShift, POSPayment | POS Module | 22 |
| PlatformTenant, PlatformSubscription, PlatformAuditLog | Platform | 23 |

---

## 📐 Phase Roadmap

| Phase | Name | Focus | Dependencies | Estimated Effort |
|-------|------|-------|-------------|-----------------|
| **9** | Permission Engine Foundation | `@qalcuity/permissions`, `can()` engine, migration from 4-role RBAC | None | 6-8 weeks |
| **10** | Unified Control Engine | Policy + Workflow + Approval + SLA + Delegation + SoD + Locking + Exception | Phase 9 | 10-12 weeks |
| **11** | Industry Configuration | Custom fields + documents + reports + industry packs | Phase 10 | 8-10 weeks |
| **12** | Accounting & Tax | GL, Journal Entry, Trial Balance, Financial Statements, Tax (PPh21/23, PPN, Coretax) | Phase 10 | 8-10 weeks |
| **13** | Operations & Support | Project Management, Task/Time Tracking, Field Service, Ticket System, Knowledge Base | Phase 9 | 6-8 weeks |
| **14** | Production Infrastructure | Redis caching, Docker, multi-instance rate limiter, CI/CD | None | 4-6 weeks |
| **15** | Mobile & Desktop | Auth flow, offline support, full mobile/desktop apps | Phase 9 | 6-8 weeks |
| **16** | Advanced CRM | Multiple pipelines, lead scoring, Customer 360°, commission | Phase 10 | 6-8 weeks |
| **17** | Integration Ecosystem | Xendit, WhatsApp, Marketplace, Banking, OAuth 2.0, Webhooks | None | 8-10 weeks |
| **18** | Advanced Analytics | PIVOT, Drill-down, Comparative Analysis, Export Engine, Data Lineage | Phase 9 (Permission) | 6-8 weeks |
| **19** | AI Features | AI Agents, NLQ, Document Extraction, Template Generator, Anomaly Detection | Phase 9, AI provider | 8-10 weeks |
| **20** | Advanced Inventory | Multi-warehouse, Batch/Lot, BOM, Barcode, Shipping Integration | Phase 11 | 6-8 weeks |
| **21** | Advanced HR | Digital Onboarding, Org Chart, Self-Service, Face Recognition, OKR, Template Builder | Phase 9 | 6-8 weeks |
| **22** | POS Module | Core POS, Shift Management, Offline Mode, Industry Config, ERP Integration | Phase 10, 11 | 8-10 weeks |
| **23** | Platform Control Center Core | Tenant Management, Subscription, Entitlement, Platform Admin App | Phase 9 | 8-10 weeks |
| **24** | Platform Monitoring | Error Center, Health Dashboard, Log Viewer, Background Jobs | Phase 23 | 6-8 weeks |
| **25** | Platform Support | Support System, Impersonation, Feature Flags, Security Center | Phase 23 | 6-8 weeks |

### Recommended Implementation Order (Priority)

```
Immediate (Next 2 weeks):
  → SEC-02, SEC-03, SEC-04, SEC-05, SEC-07 (remaining security fixes)
  → ~~SEC-01 (Rate Limiter)~~ ✅ DONE
  → ~~SEC-06 (CRM Import)~~ ✅ DONE

Phase 9 — Permission Engine ✅ DONE:
  → ~~FE-PE-01 to FE-PE-08~~ ✅ DONE (production_ready)
  → FE-PE-09 (Migration from 4-role RBAC) — remaining

Phase 10 — Unified Control Engine (Weeks 11-22):
  → ~~FE-WE-01 to FE-WE-08~~ ✅ DONE (production_ready)
  → UCE-01 to UCE-39

Phase 11 — Industry Configuration (Weeks 23-32):
  → ~~FE-ICE-01 to FE-ICE-09~~ ✅ DONE (production_ready)

Phase 12 — Accounting & Tax (Weeks 33-42):
  → FIN-GL-01 to FIN-TAX-06

Phase 13 — Operations & Support (Weeks 43-50):
  → OPS-PM-01 to OPS-QC-01
  → SUP-OM-01 to SUP-CP-01

Parallel tracks (can run alongside):
  → Analytics Studio (A-FND-*, A-SQL-*, A-VQB-*, A-CHART-*, A-DASH-*)
  → Production Infrastructure (SEC-01 Redis, Docker)
  → Mobile/Desktop Auth
  → Integration Ecosystem
```

---

> **Document maintained by:** Qalcuity AI Team
> **Version:** 1.1 — Remaining Work Documentation (Updated: 2 September 2026)
> **Next Review:** Setelah Phase 10 (Unified Control Engine) selesai
> **Related Documents:**
> - [`docs/ANALYTICS-STUDIO.md`](docs/ANALYTICS-STUDIO.md) — Analytics architecture
> - [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Core architecture
> - [`CURRENT.md`](CURRENT.md) — Current status
> - [`FEATURES.md`](FEATURES.md) — Feature source of truth
> - [`docs/DECISIONS.md`](docs/DECISIONS.md) — Architectural decisions (ADR-017 to ADR-023)
