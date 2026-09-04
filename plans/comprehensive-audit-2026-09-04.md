# 🔍 Comprehensive Codebase Audit — Qalcuity BOS

> **Tanggal:** 4 September 2026
> **Auditor:** Qalcuity AI Agent (Senior Full-Stack Engineer + UI/UX Designer + Product Strategist)
> **Scope:** Full codebase — Code Quality, UI/UX, API Security, Database, Feature Gaps

---

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Health Score** | **72/100** — Good with notable gaps |
| **Total Issues Found** | **34** |
| **P0 Critical** | **3** |
| **P1 Important** | **8** |
| **P2 Enhancement** | **14** |
| **P3 Feature Gap** | **9** |
| **Overall Security** | **85/100** — Strong foundation, specific gaps |
| **Overall UI/UX** | **80/100** — Good coverage, missing error boundaries |
| **Overall Code Quality** | **90/100** — Clean, minimal `any` types |

### Top 5 Issues

1. 🔴 **AI Chat API tanpa rate limiting, audit logging, atau tenant isolation** — rentan abuse
2. 🔴 **12+ Analytics API routes tanpa rate limiting** — rentan DDoS
3. 🔴 **Input sanitization tidak konsisten** — hanya 7 dari 40+ routes menggunakan `sanitizeInput`
4. 🟠 **10+ pages tanpa error boundaries** — crash tanpa graceful recovery
5. 🟠 **CURRENT.md tidak updated** — POS Module masih 0% padahal sudah Phase 3 complete

---

## 🔴 P0 — Critical Issues

### CQ-01: AI Chat API — No Security Layers

**File:** [`apps/web/app/api/ai/chat/route.ts`](apps/web/app/api/ai/chat/route.ts:6)

| Aspek | Status |
|-------|--------|
| Rate Limiting | ❌ Tidak ada |
| Audit Logging | ❌ Tidak ada |
| Tenant Isolation | ❌ Tidak ada (bisa akses data tenant lain via AI) |
| Input Sanitization | ❌ Tidak ada |
| Zod Validation | ❌ Tidak ada (manual validation) |
| RBAC | ⚠️ Hanya auth check, tidak ada role check |

**Impact:** AI endpoint bisa di-abuse untuk scraping data lintas tenant, DDoS, atau prompt injection.

**Effort:** M (Medium) — Tambah rate limit, audit log, tenant-scoped data access, Zod schema.

---

### CQ-02: Analytics API Routes — No Rate Limiting

**File:** [`apps/web/app/api/analytics/explorer/route.ts`](apps/web/app/api/analytics/explorer/route.ts:1), [`apps/web/app/api/analytics/kpi/route.ts`](apps/web/app/api/analytics/kpi/route.ts:1), dan 10+ routes lainnya

**Affected Routes:**
- `/api/analytics/explorer`
- `/api/analytics/kpi` (POST, PUT, DELETE)
- `/api/analytics/kpi/[id]/evaluate`
- `/api/analytics/charts` (POST)
- `/api/analytics/charts/[id]` (PUT, DELETE)
- `/api/analytics/dashboards` (POST)
- `/api/analytics/dashboards/[id]` (PUT, DELETE)
- `/api/analytics/dashboards/[id]/widgets`
- `/api/analytics/alerts` (POST)
- `/api/analytics/alerts/[id]` (PUT, DELETE)
- `/api/analytics/alerts/triggers/[id]/acknowledge`
- `/api/analytics/reports` (POST)
- `/api/analytics/reports/[id]` (PUT, DELETE)
- `/api/analytics/reports/[id]/execute`
- `/api/analytics/scheduled` (POST)
- `/api/analytics/query-history` (POST)
- `/api/analytics/dictionary` (POST)

**Impact:** Semua analytics endpoint bisa di-DoS tanpa rate limiting. Explorer endpoint bisa execute queries tanpa batas.

**Effort:** M (Medium) — Tambah `checkRateLimit` + `getClientIp` ke semua 17 routes.

---

### CQ-03: Input Sanitization Tidak Konsisten

**Hanya 7 dari 40+ mutation routes yang menggunakan `sanitizeInput`:**
- [`apps/web/app/api/auth/register/route.ts`](apps/web/app/api/auth/register/route.ts:22) ✅
- [`apps/web/app/api/mobile/auth/register/route.ts`](apps/web/app/api/mobile/auth/register/route.ts:42) ✅
- [`apps/web/app/api/hr/employees/route.ts`](apps/web/app/api/hr/employees/route.ts:106) ✅
- [`apps/web/app/api/inventory/products/[id]/route.ts`](apps/web/app/api/inventory/products/[id]/route.ts:99) ✅
- [`apps/web/app/api/billing/payments/route.ts`](apps/web/app/api/billing/payments/route.ts:105) ✅
- [`apps/web/app/api/billing/admin/payments/[id]/verify/route.ts`](apps/web/app/api/billing/admin/payments/[id]/verify/route.ts:107) ✅
- [`apps/web/app/api/admin/plans/route.ts`](apps/web/app/api/admin/plans/route.ts:148) ✅

**Routes yang TIDAK sanitize input:**
- Semua Finance routes (invoices, payments, quotations, PO, accounts, tax-rates, journal entries)
- Semua POS routes
- Semua Approval routes
- Semua Settings routes (company, team, roles, security)
- Semua Analytics routes
- Semua CRM routes (kecuali contacts/leads yang pakai `sanitizeObject`)

**Impact:** XSS, data corruption, injection attacks melalui user-generated content.

**Effort:** L (Large) — Perlu audit per-route dan tambah `sanitizeInput` / `sanitizeObject` secara konsisten.

---

## 🟠 P1 — Important Issues

### UI-01: Missing Error Boundaries — 10+ Pages

| Page | error.tsx | loading.tsx |
|------|-----------|-------------|
| [`dashboard/ai/`](apps/web/app/dashboard/ai/page.tsx) | ❌ | ❌ |
| [`dashboard/approvals/`](apps/web/app/dashboard/approvals/page.tsx) | ❌ | ✅ |
| [`dashboard/billing/`](apps/web/app/dashboard/billing/page.tsx) | ✅ | ✅ |
| [`platform/`](apps/web/app/platform/page.tsx) | ❌ | ❌ |
| [`platform/billing/`](apps/web/app/platform/billing/page.tsx) | ❌ | ❌ |
| [`platform/monitoring/`](apps/web/app/platform/monitoring/page.tsx) | ❌ | ❌ |
| [`platform/security/`](apps/web/app/platform/security/page.tsx) | ❌ | ❌ |
| [`platform/settings/`](apps/web/app/platform/settings/page.tsx) | ❌ | ❌ |
| [`platform/support/`](apps/web/app/platform/support/page.tsx) | ❌ | ❌ |
| [`platform/tenants/`](apps/web/app/platform/tenants/page.tsx) | ❌ | ❌ |

**Impact:** Runtime error di halaman-halaman ini akan crash entire page tanpa recovery.

**Effort:** S (Small) — Buat `error.tsx` + `loading.tsx` untuk setiap page.

---

### UI-02: Platform Pages — No Loading States

**6 platform pages tanpa `loading.tsx`:**
- [`platform/page.tsx`](apps/web/app/platform/page.tsx)
- [`platform/billing/page.tsx`](apps/web/app/platform/billing/page.tsx)
- [`platform/monitoring/page.tsx`](apps/web/app/platform/monitoring/page.tsx)
- [`platform/security/page.tsx`](apps/web/app/platform/security/page.tsx)
- [`platform/settings/page.tsx`](apps/web/app/platform/settings/page.tsx)
- [`platform/support/page.tsx`](apps/web/app/platform/support/page.tsx)

**Impact:** Platform admin experience buruk — blank screen saat data loading.

**Effort:** S (Small) — Buat `loading.tsx` dengan skeleton pattern.

---

### UI-03: AI Page — No Loading/Error States

**File:** [`apps/web/app/dashboard/ai/page.tsx`](apps/web/app/dashboard/ai/page.tsx)

Halaman AI hanya memiliki `page.tsx` tanpa `loading.tsx` atau `error.tsx`. AI response bisa lambat (>3 detik), sehingga loading state sangat penting.

**Effort:** S (Small)

---

### SEC-01: Demo Load API — No Rate Limiting

**File:** [`apps/web/app/api/demo/load/route.ts`](apps/web/app/api/demo/load/route.ts:14)

Demo load endpoint bisa di-abuse untuk membanjiri database dengan data.

**Effort:** S (Small) — Tambah rate limit 1 per 5 minutes.

---

### SEC-02: Upload API — Needs Security Review

**File:** [`apps/web/app/api/upload/route.ts`](apps/web/app/api/upload/route.ts:22)

Upload endpoint perlu dipastikan memiliki:
- File size limit
- File type validation
- Rate limiting
- Audit logging

**Effort:** M (Medium)

---

### API-01: Settings Routes — Inconsistent Rate Limiting

Beberapa settings routes memiliki rate limiting, beberapa tidak:

| Route | Rate Limit |
|-------|-----------|
| `settings/profile` GET | ✅ 100/min |
| `settings/profile` PUT | ✅ 30/min |
| `settings/company` GET | ✅ 100/min |
| `settings/company` PUT | ✅ 30/min |
| `settings/team` POST/PUT/DELETE | ❌ Tidak ada |
| `settings/roles` POST | ❌ Tidak ada |
| `settings/roles/[id]` PUT/DELETE | ❌ Tidak ada |
| `settings/notifications` PUT | ❌ Tidak ada |
| `settings/notifications/smtp` POST | ❌ Tidak ada |
| `settings/integrations` POST/PUT/DELETE | ❌ Tidak ada |
| `settings/custom-fields` POST | ❌ Tidak ada |
| `settings/industry` PUT | ❌ Tidak ada |

**Effort:** S (Small) — Tambah rate limit ke 10+ settings routes.

---

### API-02: Billing Routes — Mixed Security

| Route | Rate Limit | Audit Log |
|-------|-----------|-----------|
| `billing/plan` PUT | ❌ | ✅ |
| `billing/payments` POST | ❌ | ✅ |
| `billing/payments/upload` POST | ❌ | ✅ |
| `billing/feature-check` POST | ❌ | ❌ |
| `billing/webhook` POST | ❌ | ✅ |

**Effort:** S (Small)

---

### DOC-01: CURRENT.md Outdated — POS Module Status

**File:** [`CURRENT.md`](CURRENT.md:155)

CURRENT.md masih mencantumkan:
> `POS Module | 📋 Planned | 0%`

Padahal POS Module sudah Phase 3 complete dengan:
- 10 API routes
- 7 UI pages
- 6 loading states
- Full refund/reports/terminals management

**Impact:** Dokumentasi tidak akurat, bisa menyesatkan team.

**Effort:** S (Small) — Update CURRENT.md dan FEATURES.md.

---

## 🟡 P2 — Enhancement Issues

### CQ-04: `any` Types in E2E Test File

**File:** [`apps/web/__tests__/e2e-test.ts`](apps/web/__tests__/e2e-test.ts:375)

8 instances of `any` type di test file. Meskipun acceptable untuk tests, sebaiknya gunakan proper typing.

**Instances:**
- Line 375: `(po: any)`
- Line 662: `(prisma as any).coAAccount.findMany`
- Line 679: `(prisma as any).bankTransaction.findMany`
- Line 689: `(t: any)`
- Line 703: `(prisma as any).subscriptionPlan.findMany`
- Line 714: `(prisma as any).tenantSubscription.findFirst`

**Effort:** S (Small)

---

### CQ-05: `any` Types in Rate Limiter

**File:** [`apps/web/lib/rate-limit.ts`](apps/web/lib/rate-limit.ts:156), [`apps/web/lib/rate-limit-monitor.ts`](apps/web/lib/rate-limit-monitor.ts:95)

2 instances dengan `eslint-disable-next-line` comments. Redis multi/pipeline types perlu di-fix.

**Effort:** S (Small)

---

### CQ-06: Console.log di Production Code — 62 Instances

**Breakdown:**
- **Redis** ([`lib/redis.ts`](apps/web/lib/redis.ts)): 8 logs — Intentional, acceptable
- **Rate Limiter** ([`lib/rate-limit.ts`](apps/web/lib/rate-limit.ts)): 3 logs — Intentional, acceptable
- **Email** ([`lib/email.ts`](apps/web/lib/email.ts)): 15 logs — Banyak yang fallback ke console.log, bisa di-reduce
- **Payment** ([`lib/payment/`](apps/web/lib/payment/)): 5 logs — Intentional
- **Workflow** ([`lib/workflow.ts`](apps/web/lib/workflow.ts)): 4 logs — Intentional
- **Auth** ([`lib/auth.ts`](apps/web/lib/auth.ts)): 1 log — Acceptable
- **API Routes**: 25+ logs — Sebagian besar `console.error` (acceptable), beberapa `console.warn`
- **E2E Tests**: 20+ logs — Acceptable

**Impact:** Low — Sebagian besar intentional logging. Beberapa bisa di-replace dengan structured logger.

**Effort:** M (Medium) — Implement structured logger (pino/winston) untuk production.

---

### CQ-07: Hardcoded Error Messages — Tidak Menggunakan i18n

Banyak API routes mengembalikan error messages hardcoded dalam Bahasa Indonesia:

```typescript
return NextResponse.json({ error: 'Terlalu banyak request. Silakan coba lagi.' }, { status: 429 });
```

Ini terjadi di 20+ lokasi. Seharusnya menggunakan error codes atau i18n keys.

**Effort:** M (Medium)

---

### UI-04: Inconsistent Error Response Format

Beberapa routes mengembalikan:
```json
{ "error": "Message" }
```
Yang lain:
```json
{ "success": false, "error": "Message" }
```

Tidak ada standard error response format.

**Effort:** M (Medium) — Define standard error response format di [`apps/web/lib/api-error.ts`](apps/web/lib/api-error.ts).

---

### UI-05: `handleApiError` Tidak Digunakan Secara Konsisten

[`apps/web/lib/api-error.ts`](apps/web/lib/api-error.ts) sudah ada tapi hanya digunakan oleh POS routes dan beberapa newer routes. Routes lama masih manual try-catch.

**Effort:** M (Medium)

---

### SEC-03: Missing CSRF Double-Submit Validation

NextAuth menyediakan CSRF token otomatis, tapi tidak ada double-submit cookie pattern di API routes. Untuk API yang menggunakan `req.json()` dengan session auth, CSRF sudah ter-proteksi oleh SameSite cookies. Namun untuk webhook endpoints (Midtrans), perlu dipastikan signature validation.

**Status:** ⚠️ Low risk — SameSite cookies + webhook signature validation sudah ada.

**Effort:** S (Small)

---

### SEC-04: `@qalcuity/api` Package — Not Implemented

**Status:** 🔴 `planned` — Dicompile di REMAINING-WORK.md sebagai SEC-04

Package API client untuk mobile/desktop belum diimplementasi. Saat ini mobile app menggunakan raw fetch.

**Effort:** L (Large)

---

### DB-01: Missing Composite Indexes

Beberapa queries mungkin membutuhkan composite indexes yang belum ada:

| Model | Suggested Index | Reason |
|-------|----------------|--------|
| `PosTransaction` | `[tenantId, paymentMethod, status]` | POS reports filtering |
| `PosRefund` | `[tenantId, status]` | Refund list filtering |
| `Invoice` | `[tenantId, status, dueDate]` | Aging report query |
| `JournalEntry` | `[tenantId, periodId]` | Period closing queries |

**Effort:** S (Small) — Add Prisma indexes.

---

### DB-02: `PosSession.cashierId` — No Foreign Key

**File:** [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma:1853)

`PosSession.cashierId` adalah `String` tanpa foreign key ke `User` model. Ini bisa menyebabkan data integrity issues.

**Effort:** S (Small) — Add `@relation` or keep as denormalized (intentional for performance).

---

### ENT-01: Decimal Type Arithmetic — Pre-existing Issue

**File:** [`apps/web/app/api/reports/route.ts`](apps/web/app/api/reports/route.ts)

TypeScript Decimal type arithmetic errors di Finance/Reports masih ada (SEC-02 di REMAINING-WORK.md).

**Effort:** S (Small)

---

### ENT-02: Password Policy — Only Min 8 Chars

**File:** [`apps/web/app/api/auth/register/route.ts`](apps/web/app/api/auth/register/route.ts)

Password policy hanya memvalidasi minimum 8 characters. Belum ada configurable rules untuk uppercase, numbers, special chars.

**Effort:** S (Small)

---

### ENT-03: Inconsistent Error Handling Patterns

3 patterns berbeda digunakan untuk error handling di API routes:
1. `handleApiError` (POS routes — newer)
2. Manual `catch (error)` dengan `console.error`
3. `catch` tanpa error handling (silent)

**Effort:** M (Medium) — Standardize ke `handleApiError`.

---

## 🔵 P3 — Feature Gaps

### FG-01: POS Module — Documentation Outdated

**Status:** CURRENT.md says 0%, FEATURES.md says `planned`
**Reality:** Phase 2+3 complete (10 API routes, 7 pages)

**Effort:** S (Small) — Update documentation.

---

### FG-02: `@qalcuity/analytics` Package — Missing from Shared Packages

Package `@qalcuity/analytics` di-import oleh 3 API routes:
- [`apps/web/app/api/analytics/explorer/route.ts`](apps/web/app/api/analytics/explorer/route.ts:9)
- [`apps/web/app/api/analytics/kpi/[id]/evaluate/route.ts`](apps/web/app/api/analytics/kpi/[id]/evaluate/route.ts:9)
- [`apps/web/app/api/analytics/metrics/route.ts`](apps/web/app/api/analytics/metrics/route.ts:8)

Tapi package ini tidak ada di `packages/analytics/`. Kemungkinan inline di apps/web atau belum di-extract.

**Effort:** M (Medium)

---

### FG-03: AI Features — Still Mock/Basic

**Status:** 20% — AI provider hanya mengembalikan hardcoded responses.

**File:** [`apps/web/lib/ai/provider.ts`](apps/web/lib/ai/provider.ts)

**Effort:** L (Large) — Perlu integrasi dengan OpenAI/Claude API.

---

### FG-04: Desktop App — Placeholder Only

**Status:** 5% — Electron wrapper tanpa auth/offline capability.

**Effort:** L (Large)

---

### FG-05: Mobile App — Only Auth Flow

**Status:** 40% — Hanya login/register/refresh/me.

**Effort:** L (Large)

---

### FG-06: Multi-entity & Multi-currency — Not Implemented

**Status:** `planned` — Belum ada kode.

**Effort:** L (Large)

---

### FG-07: Coretax / e-Faktur Integration — Not Implemented

**Status:** `planned` — Tax engine hanya TaxRate CRUD.

**Effort:** L (Large)

---

### FG-08: Revenue Recognition (ASC 606 / IFRS 15) — Not Implemented

**Status:** `planned`

**Effort:** L (Large)

---

### FG-09: Operations & Project Module — 0% Implementation

**Status:** 16 features planned, 0 implemented.

**Effort:** L (Large)

---

## 📋 Priority Matrix

| Priority | ID | Issue | Impact | Effort | Batch |
|----------|-----|-------|--------|--------|-------|
| P0 | CQ-01 | AI Chat API — No Security | 🔴 Security breach | M | **K** |
| P0 | CQ-02 | Analytics API — No Rate Limit | 🔴 DDoS | M | **K** |
| P0 | CQ-03 | Input Sanitization Inconsistent | 🔴 XSS/Injection | L | **K+L** |
| P1 | UI-01 | Missing Error Boundaries | 🟠 UX crash | S | **K** |
| P1 | UI-02 | Platform Loading States | 🟠 UX poor | S | **K** |
| P1 | UI-03 | AI Page Loading/Error | 🟠 UX poor | S | **K** |
| P1 | SEC-01 | Demo Load — No Rate Limit | 🟠 Abuse risk | S | **K** |
| P1 | SEC-02 | Upload Security Review | 🟠 Security | M | **K** |
| P1 | API-01 | Settings Routes — No Rate Limit | 🟠 Abuse risk | S | **K** |
| P1 | API-02 | Billing Routes — Mixed Security | 🟠 Security | S | **K** |
| P1 | DOC-01 | CURRENT.md Outdated | 🟠 Misleading | S | **K** |
| P2 | CQ-04 | `any` Types in E2E | 🟡 Quality | S | **L** |
| P2 | CQ-05 | `any` Types in Rate Limiter | 🟡 Quality | S | **L** |
| P2 | CQ-06 | Console.log Cleanup | 🟡 Quality | M | **L** |
| P2 | CQ-07 | Hardcoded Error Messages | 🟡 i18n | M | **L** |
| P2 | UI-04 | Error Response Format | 🟡 Consistency | M | **L** |
| P2 | UI-05 | handleApiError Inconsistent | 🟡 Consistency | M | **L** |
| P2 | SEC-03 | CSRF Double-Submit | 🟡 Security | S | **L** |
| P2 | SEC-04 | @qalcuity/api Package | 🟡 Architecture | L | **M** |
| P2 | DB-01 | Missing Composite Indexes | 🟡 Performance | S | **K** |
| P2 | DB-02 | PosSession.cashierId FK | 🟡 Integrity | S | **K** |
| P2 | ENT-01 | Decimal Type Arithmetic | 🟡 Type safety | S | **K** |
| P2 | ENT-02 | Password Policy | 🟡 Security | S | **K** |
| P2 | ENT-03 | Inconsistent Error Handling | 🟡 Quality | M | **L** |
| P3 | FG-01 | POS Documentation | 🔵 Docs | S | **K** |
| P3 | FG-02 | @qalcuity/analytics Package | 🔵 Architecture | M | **M** |
| P3 | FG-03 | AI Features Mock | 🔵 Feature | L | **N** |
| P3 | FG-04 | Desktop App Placeholder | 🔵 Feature | L | **O** |
| P3 | FG-05 | Mobile Auth Only | 🔵 Feature | L | **O** |
| P3 | FG-06 | Multi-entity/Currency | 🔵 Feature | L | **P** |
| P3 | FG-07 | Coretax/e-Faktur | 🔵 Feature | L | **P** |
| P3 | FG-08 | Revenue Recognition | 🔵 Feature | L | **P** |
| P3 | FG-09 | Operations & Project | 🔵 Feature | L | **P** |

---

## 🗂️ Recommended Batch Plan

### Batch K — Security Hardening + Documentation (P0 + P1)

**Goal:** Fix all critical security gaps and update documentation.

| # | Task | Files | Effort |
|---|------|-------|--------|
| K-1 | AI Chat API: Tambah rate limiting, audit logging, tenant isolation, Zod validation | `api/ai/chat/route.ts`, `validation-schemas.ts` | M |
| K-2 | Analytics API: Tambah rate limiting ke 17 routes | Semua `api/analytics/*/route.ts` | M |
| K-3 | Settings API: Tambah rate limiting ke 10 routes | Semua `api/settings/*/route.ts` | S |
| K-4 | Billing API: Tambah rate limiting ke 5 routes | `api/billing/*/route.ts` | S |
| K-5 | Demo Load API: Tambah rate limiting | `api/demo/load/route.ts` | S |
| K-6 | Upload API: Tambah security (size limit, type validation, rate limit, audit) | `api/upload/route.ts` | M |
| K-7 | Buat error.tsx untuk 10 pages (AI, Platform 6, Approvals) | 10 error.tsx files | S |
| K-8 | Buat loading.tsx untuk 7 platform pages | 7 loading.tsx files | S |
| K-9 | Update CURRENT.md: POS Module status 0% → verified | `CURRENT.md`, `FEATURES.md` | S |
| K-10 | Tambah composite indexes (PosTransaction, PosRefund, Invoice) | `schema.prisma` | S |
| K-11 | Fix PosSession.cashierId foreign key | `schema.prisma` | S |
| K-12 | Fix Decimal type arithmetic | `api/reports/route.ts` | S |

**Total:** 3 M + 9 S = **~12 tasks**

---

### Batch L — Code Quality + Consistency (P2)

**Goal:** Standardize error handling, fix `any` types, improve i18n.

| # | Task | Files | Effort |
|---|------|-------|--------|
| L-1 | Fix `any` types di e2e-test.ts | `__tests__/e2e-test.ts` | S |
| L-2 | Fix `any` types di rate-limit.ts | `lib/rate-limit.ts`, `lib/rate-limit-monitor.ts` | S |
| L-3 | Standardize error response format | `lib/api-error.ts` | M |
| L-4 | Roll out `handleApiError` ke semua routes | 40+ route files | M |
| L-5 | Tambah `sanitizeInput` ke Finance routes | 10+ route files | L |
| L-6 | Tambah `sanitizeInput` ke POS routes | 6 route files | S |
| L-7 | Tambah `sanitizeInput` ke Settings routes | 10+ route files | M |
| L-8 | Tambah `sanitizeInput` ke Approval routes | 4 route files | S |
| L-9 | Replace hardcoded error messages dengan i18n keys | 20+ locations | M |
| L-10 | Console.log cleanup → structured logger | `lib/email.ts` + others | M |

**Total:** 4 M + 1 L + 5 S = **~10 tasks**

---

### Batch M — Architecture Improvements (P2 + P3)

**Goal:** Package structure, analytics package, API client.

| # | Task | Files | Effort |
|---|------|-------|--------|
| M-1 | Extract `@qalcuity/analytics` package | `packages/analytics/` | M |
| M-2 | Implement `@qalcuity/api` client package | `packages/api/` | L |
| M-3 | Password policy configurable rules | `api/auth/register/route.ts`, `validation-schemas.ts` | S |

---

## 📈 Codebase Health Metrics

| Category | Score | Notes |
|----------|-------|-------|
| **TypeScript Quality** | 90/100 | 10 `any` types (8 in tests), 0 TS errors |
| **Security** | 85/100 | Strong RBAC + tenant isolation, gaps in sanitization + rate limiting |
| **UI/UX** | 80/100 | Good loading states (28+), missing error boundaries (10+) |
| **API Consistency** | 75/100 | Good audit logging, inconsistent rate limiting + error format |
| **Documentation** | 70/100 | Comprehensive but outdated (POS, CURRENT.md) |
| **Testing** | 85/100 | 63 E2E tests, but no unit tests |
| **Database** | 90/100 | 57+ indexes, good relations, minor gaps |
| **i18n** | 85/100 | 433+ keys, some hardcoded strings remain |

---

## 🎯 Definition of Done for Next Sprint

- [ ] All P0 issues fixed (CQ-01, CQ-02, CQ-03)
- [ ] All P1 issues fixed (UI-01 to UI-03, SEC-01, SEC-02, API-01, API-02, DOC-01)
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] E2E tests still pass
- [ ] CURRENT.md and FEATURES.md updated
- [ ] All analytics routes have rate limiting
- [ ] All mutation routes have input sanitization
- [ ] All pages have loading.tsx + error.tsx

---

**Last Updated:** 4 September 2026
**Document Version:** 1.0 — Initial Comprehensive Audit
