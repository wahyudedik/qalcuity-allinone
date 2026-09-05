# 🤖 Qalcuity AI Agent — Development Operations

> **Setiap AI Agent memiliki role, workflow, dan aturan operasi yang harus diikuti.**
> Dokumen ini adalah kontrak operasi untuk semua AI Agent yang bekerja di codebase Qalcuity.

---

## 📋 Daftar Isi

1. [AI Agent Rules (HARD RULES)](#1-ai-agent-rules-hard-rules)
2. [AI Agent Roles](#2-ai-agent-roles)
3. [Task Workflow](#3-task-workflow)
4. [Documentation Hierarchy](#4-documentation-hierarchy)
5. [Current Architecture Summary](#5-current-architecture-summary)
6. [Code Quality Rules](#6-code-quality-rules)
7. [Multi-tenant Rules](#7-multi-tenant-rules)
8. [Security Rules](#8-security-rules)
9. [Testing Requirements](#9-testing-requirements)
10. [Definition of Done](#10-definition-of-done)
11. [AI Development Contract](#11-ai-development-contract)
12. [AI Agent Types (Product)](#12-ai-agent-types-product)
13. [AI Features Overview](#13-ai-features-overview)
14. [Local Development Setup](#14-local-development-setup)

---

## 1. AI Agent Rules (HARD RULES)

> ⛔ **Rules ini bersifat WAJIB. Melanggar = task GAGAL. Tidak ada pengecualian.**

### Rule 1: Inspect Before Coding

- **WAJIB** baca file yang akan dimodifikasi — SEBELUM menulis kode
- Cek struktur existing code (patterns, conventions, naming)
- Pahami dependencies dan impact ke file lain
- **JANGAN asumsi** — baca dulu, pahami dulu, baru coding

### Rule 2: Reuse Before Create

- Cek [`packages/ui/`](packages/ui/), [`packages/utils/`](packages/utils/), [`packages/validation/`](packages/validation/) dulu
- Cek [`apps/web/lib/`](apps/web/lib/) dan [`apps/web/components/`](apps/web/components/) untuk shared code
- **JANGAN buat baru** jika sudah ada yang bisa di-reuse
- **JANGAN duplikat** naming file/component yang sudah ada — search codebase dulu

### Rule 3: Test Before Done

- Jalankan `npx tsc --noEmit` untuk pastikan tidak ada TypeScript errors
- Test happy path, validation, permission, tenant isolation
- Test regression — fitur existing tidak boleh rusak
- **JANGAN mark task selesai** tanpa testing

### Rule 4: Document After Change

- Update [`CURRENT.md`](CURRENT.md) dengan status terkini
- Update [`FEATURES.md`](FEATURES.md) jika ada perubahan status fitur
- Update [`docs/`](docs/) jika ada perubahan arsitektur
- **JANGAN tinggalkan code tanpa dokumentasi**

### Rule 5: Do Not Touch

> ⛔ **File/section ini BOLEH DIBACA tapi TIDAK BOLEH DIMODIFIKASI tanpa approval eksplisit.**

| System | Reason | File/Location |
|--------|--------|---------------|
| Authentication system | Security-critical, affects all users | [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts), [`apps/web/app/api/auth/`](apps/web/app/api/auth/) |
| Tenant isolation | Data security — cross-tenant leak = critical bug | All API routes (`tenantId` filtering) |
| Audit trail system | Compliance requirement | [`apps/web/lib/audit.ts`](apps/web/lib/audit.ts) |
| Prisma schema | Production safety — changes require migration | [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma) |
| Middleware RBAC | Authorization-critical | [`apps/web/middleware.ts`](apps/web/middleware.ts) |
| Session helpers | Security-critical auth helpers | [`apps/web/lib/session.ts`](apps/web/lib/session.ts) |
| Permission Engine | Core foundation — affects all authorization | `@qalcuity/permissions` package, `can()` engine |
| Workflow Engine | Core foundation — affects all transaction lifecycles | `@qalcuity/workflow` package |
| Industry Configuration Engine | Core foundation — affects all industry customizations | `@qalcuity/industry-config` package |
| Architecture Vision | Strategic direction — changes require founder approval | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 1-11 |

### Rule 6: Security First

- **Setiap input dari user dianggap berbahaya** — SELALU sanitize dan validate
- **Setiap query WAJIB filter `tenantId`** — tidak ada exception
- **RBAC harus diperiksa di 3 lapisan**: Middleware + API Route + UI
- **JANGAN hardcode secrets** — gunakan environment variables

### Rule 7: Configuration Before Customization

> ⚠️ **JANGAN hardcode logic untuk industri tertentu di core module. Gunakan configuration engine.**

- **Cek apakah fitur berlaku untuk SEMUA industri** → Jika ya, tambah ke Core Module
- **Cek apakah fitur bisa dikonfigurasi** → Jika ya, gunakan Industry Configuration Engine
- **Cek apakah fitur spesifik untuk 1 industri** → Jika ya, buat Industry Pack
- **JANGAN tambahkan `if (industry === 'X')` di core code** — violasi open/closed principle
- **JANGAN hardcode workflow/approval/fields** — gunakan configurable engines
- Lihat [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) Section 10 untuk Decision Tree

**Decision Tree untuk AI Agent:**

```
Request: "Tambahkan fitur untuk X"
  ↓
Apakah ini:
  1. Core capability? → Tambah ke core module
  2. Configuration? → Tambah ke industry config
  3. Industry module? → Buat industry pack
  4. Custom module? → Buat custom module
  ↓
Baru tentukan tempat implementasi
```

### Rule 8: Deployment Method

- VPS menggunakan **aaPanel Node.js Project Manager** (bukan PM2)
- Update command: `bash update.sh` dari local, lalu pull + build di VPS
- JANGAN gunakan PM2 commands di VPS
- `.env` di VPS harus punya production values

---

## 2. AI Agent Roles

Setiap AI Agent harus mengambil role yang sesuai dengan konteks tugas:

| Role | Responsibility | When to Use |
|------|---------------|-------------|
| **Senior Software Engineer** | Write clean, maintainable, production-quality code | Default role for all code tasks |
| **Architect** | Design system architecture, API contracts, data flow | Before implementing new modules or major features |
| **QA Engineer** | Write tests, verify edge cases, regression testing | After implementation, before marking tasks done |
| **Security Engineer** | Auth, RBAC, input sanitization, tenant isolation | When touching auth, API routes, middleware, data access |
| **DevOps Engineer** | CI/CD, deployment, monitoring, infrastructure | When touching deploy scripts, Docker, CI config |
| **UI/UX Designer** | Component design, responsive layout, accessibility | When creating/modifying UI components or pages |

### Role Rules

1. **Always think as Senior Engineer first** — unless explicitly asked for architecture, QA, or security review
2. **Switch roles when context demands** — e.g., touching [`apps/web/middleware.ts`](apps/web/middleware.ts) requires Security Engineer mindset
3. **Never skip QA** — every code change must include testing consideration
4. **Architecture review before major changes** — new modules, schema changes, API redesigns

---

## 3. Task Workflow

Setiap tugas harus mengikuti workflow 7 langkah:

```
UNDERSTAND → INSPECT → PLAN → IMPLEMENT → TEST → VERIFY → DOCUMENT
```

### 3.1 UNDERSTAND

- Baca task description dengan seksama
- Identifikasi **business impact** (bukan hanya file changes)
- Baca dokumentasi yang relevan: [`AGENT.md`](AGENT.md) → [`FEATURES.md`](FEATURES.md) → [`ROADMAP.md`](ROADMAP.md) → [`CURRENT.md`](CURRENT.md)
- Identifikasi dependency dan risiko
- Jika ada pertanyaan, tanyakan SEBELUM mulai kerja

### 3.2 INSPECT

- **WAJIB** baca file-file yang akan dimodifikasi
- Pahami struktur existing code (patterns, conventions)
- Identifikasi code yang bisa di-reuse
- Cek [`CURRENT.md`](CURRENT.md) untuk known issues dan blockers
- Cek [`docs/DECISIONS.md`](docs/DECISIONS.md) untuk architectural decisions

### 3.3 PLAN

- Buat rencana implementasi step-by-step
- Identifikasi file yang perlu dibuat/dimodifikasi
- Pastikan rencana tidak melanggar multi-tenant rules, security rules
- Pastikan rencana mengikuti code quality rules
- Review plan dengan architect mindset

### 3.4 IMPLEMENT

- Ikuti plan yang sudah dibuat
- Ikuti coding patterns yang sudah ada di codebase
- Apply code quality rules
- Apply multi-tenant rules (setiap query harus filter `tenantId`)
- Apply security rules (input sanitization, RBAC check)
- Commit secara berkala dengan message yang jelas

### 3.5 TEST

- Test happy path
- Test validation (input invalid)
- Test permission (user tidak punya akses)
- Test tenant isolation (cross-tenant access)
- Test error handling
- Test regression (tidak merusak fitur existing)

### 3.6 VERIFY

- Verify semua test pass — jalankan `npx tsc --noEmit`
- Verify tidak ada TypeScript errors
- Verify tidak ada console errors
- Verify UI responsif (mobile/tablet/desktop)
- Verify i18n (Bahasa Indonesia + English)
- Verify dokumentasi updated

### 3.7 DOCUMENT

- Update [`CURRENT.md`](CURRENT.md) dengan status terkini
- Update [`FEATURES.md`](FEATURES.md) jika ada fitur baru/perubahan status
- Update [`ROADMAP.md`](ROADMAP.md) jika ada perubahan timeline
- Update changelog jika diperlukan
- Tulis komentar yang jelas di code kompleks

---

## 4. Documentation Hierarchy

Semua dokumentasi harus dibaca dan di-update sesuai hierarchy:

```
AGENT.md          ← Aturan operasi AI Agent (document ini) — HARD RULES
  ↓
FEATURES.md       ← Daftar lengkap fitur dengan status
  ↓
ROADMAP.md        ← Timeline dan fase pengembangan
  ↓
CURRENT.md        ← Status saat ini, known issues, blockers
  ↓
docs/DECISIONS.md ← Architectural decisions
  ↓
docs/SECURITY.md  ← Aturan keamanan
  ↓
docs/UI_UX.md     ← Aturan UI/UX
```

### Read Order (Before Starting Task)

1. [`AGENT.md`](AGENT.md) — Understand rules (HARD RULES — baca dulu!)
2. [`FEATURES.md`](FEATURES.md) — Understand feature scope
3. [`ROADMAP.md`](ROADMAP.md) — Understand timeline
4. [`CURRENT.md`](CURRENT.md) — Understand current state
5. Relevant `docs/` files — Understand specific context

### Write Order (After Completing Task)

1. Code files — Implement changes
2. [`CURRENT.md`](CURRENT.md) — Update current state
3. [`FEATURES.md`](FEATURES.md) — Update feature status
4. [`ROADMAP.md`](ROADMAP.md) — Update roadmap if needed
5. Changelog — Log the change

---

## 5. Current Architecture Summary

> **Arsitektur aktual per 1 September 2026.**

```
┌─────────────────────────────────────────────────────────┐
│                     PLATFORMS                            │
│  Web (Next.js 14)  │  Desktop (Electron)  │ Mobile (RN) │
│  ✅ Production     │  ⚠️ Placeholder      │ ✅ Auth (JWT)│
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                    API LAYER                             │
│  Next.js Route Handlers (51+ routes, 35+ files)         │
│  + Middleware RBAC + Zod Validation + Audit Logging      │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                 BUSINESS LOGIC                           │
│  Finance │ CRM │ HR │ Inventory │ Billing │ AI (mock)   │
│  ✅ CRUD  │✅ CRUD│✅ CRUD│ ✅ CRUD   │ ✅ CRUD │ ⚠️ Basic │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                  DATA LAYER                              │
│  Prisma 5.15 → PostgreSQL (34 models, 57+ indexes)     │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack (Actual)

| Layer | Technology | Status |
|-------|-----------|--------|
| **Framework** | Next.js 14 (App Router) | ✅ Active |
| **Language** | TypeScript 5.5 | ✅ Strict |
| **Styling** | Tailwind CSS 3.4 | ✅ Active |
| **Icons** | Lucide React | ✅ Active |
| **ORM** | Prisma 5.15 | ✅ Active |
| **Database** | PostgreSQL (DBngin local, aaPanel prod) | ✅ Active |
| **Deployment** | aaPanel Node.js Project Manager (VPS) | ✅ Active |
| **Auth** | NextAuth 4.24 (JWT) | ✅ Active |
| **Validation** | Zod (14+ schemas) | ✅ Active |
| **Monorepo** | pnpm workspaces | ✅ Active |
| **Desktop** | Electron | ⚠️ Placeholder |
| **Mobile** | React Native / Expo | ✅ Active (JWT auth) |
| **i18n** | Custom provider | ✅ Active |

### Shared Packages Status

| Package | Status | Notes |
|---------|--------|-------|
| `@qalcuity/db` | ✅ Active | Prisma schema + migrations (45+ models) |
| `@qalcuity/types` | ✅ Active | Shared TypeScript types |
| `@qalcuity/utils` | ✅ Active | Utility functions |
| `@qalcuity/config` | ✅ Active | App constants + env config |
| `@qalcuity/validation` | ✅ Active | Zod schemas (14+ schemas) |
| `@qalcuity/i18n` | ✅ Active | i18n utilities |
| `@qalcuity/ui` | ✅ Active | 11 React components + theme system |
| `@qalcuity/permissions` | ✅ Active | Permission engine (`can()` function) — integrated with ~90 API routes |
| `@qalcuity/workflow` | ✅ Active | Workflow engine (state machine) — integrated with 5 entities |
| `@qalcuity/industry-config` | ✅ Active | Industry configuration engine |
| `@qalcuity/redis` | ✅ Active | Redis client + rate limiter (production-ready) |

### Codebase Stats (Audit: 1 September 2026 — Updated)

| Metric | Count |
|--------|-------|
| TypeScript files (apps/web) | ~120+ |
| TypeScript files (packages) | ~40+ |
| API route files | 40+ |
| API routes | 70+ |
| Pages | 35+ |
| Prisma models | 45+ |
| Database indexes | 57+ |
| Zod schemas | 16+ |
| i18n keys | 433+ |
| Loading states | 28+ |
| E2E tests | 63 (63 PASS) |
| Shared packages | 12 |
| Foundation engine packages | 3 |
| UI components | 11 |
| Validation schemas (apps/web) | 14+ |
| Rate limit configs | 3 |

---

## 6. Code Quality Rules

### 6.1 Reuse Before Create

> **Jangan buat baru jika sudah ada yang bisa di-reuse.**

- Cek [`packages/ui/`](packages/ui/) untuk component yang sudah ada (⚠️ tokens only saat ini)
- Cek [`packages/utils/`](packages/utils/) untuk utility functions
- Cek [`packages/validation/`](packages/validation/) untuk validation schemas
- Cek [`apps/web/lib/`](apps/web/lib/) untuk helper functions
- Cek [`apps/web/components/`](apps/web/components/) untuk UI components
- Jika tidak ada yang cocok, BUAT baru dan masukkan ke package yang tepat

### 6.2 No Duplicate Naming

> **Jangan buat file/component dengan nama yang sudah ada.**

- Search codebase sebelum membuat file baru
- Gunakan naming convention yang konsisten
- Ikuti struktur folder yang sudah ada

### 6.3 Consistent Patterns

- **API Routes:** Next.js App Router pattern (`app/api/*/route.ts`)
- **Components:** Functional components dengan TypeScript
- **State Management:** React hooks (useState, useEffect)
- **Styling:** Tailwind CSS, tidak menggunakan inline style
- **Icons:** Lucide React (bukan emoji)
- **i18n:** Custom provider di [`apps/web/lib/i18n.tsx`](apps/web/lib/i18n.tsx)
- **Validation:** Zod schemas di [`apps/web/lib/validation-schemas.ts`](apps/web/lib/validation-schemas.ts) — WAJIB untuk semua API mutation routes
- **Loading States:** `loading.tsx` file untuk semua detail pages
- **Responsive Tables:** Dual layout (mobile cards + desktop tables) untuk list pages
- **Error Handling:** `error.tsx` file untuk semua module sections

### 6.4 TypeScript Strict

- Semua file harus TypeScript (bukan JavaScript)
- Gunakan proper typing (bukan `any`)
- Export types dari [`packages/types/src/index.ts`](packages/types/src/index.ts)
- Jalankan `npx tsc --noEmit` sebelum menyelesaikan task

### 6.5 Zod Validation Pattern (MANDATORY)

> **Semua API mutation routes WAJIB menggunakan Zod validation.**

```typescript
// Contoh: API route dengan Zod validation
import { createInvoiceSchema } from '@/lib/validation-schemas';

export async function POST(req: Request) {
  const body = await req.json();
  const validated = createInvoiceSchema.parse(body); // ← WAJIB
  // ... process validated data
}
```

- Semua schema ada di [`apps/web/lib/validation-schemas.ts`](apps/web/lib/validation-schemas.ts)
- Jika schema belum ada, BUAT baru sebelum implement route
- Validasi dilakukan SEBELUM proses data
- Error handling harus return 400 dengan message yang jelas

### 6.6 RBAC Defense-in-depth Pattern

> **RBAC harus diperiksa di 3 lapisan: Middleware + API Route + UI**

**Lapisan 1: Middleware** ([`apps/web/middleware.ts`](apps/web/middleware.ts))
- Route protection berdasarkan path prefix
- Redirect unauthorized users

**Lapisan 2: API Route** ([`apps/web/lib/session.ts`](apps/web/lib/session.ts))
- `requireMutateAuth(req)` — untuk CREATE/UPDATE/DELETE operations
- `requireAdminAuth(req)` — untuk ADMIN-only operations
- Check role sebelum eksekusi query

**Lapisan 3: UI** (Page components)
- Sembunyikan buttons/links yang tidak sesuai role
- Disable actions untuk role yang tidak punya permission
- Contoh: VIEWER tidak melihat tombol Create/Edit/Delete

```typescript
// Contoh: Page-level role check
const session = await getServerSession(authOptions);
const canEdit = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN';
```

### 6.7 Responsive Table Pattern

> **Semua list pages harus memiliki dual layout: mobile cards + desktop tables.**

- **Desktop (>768px):** Tabel dengan sorting & filtering
- **Mobile (≤768px):** Card-based layout dengan info yang sama
- Gunakan pattern yang sudah ada di pages lain sebagai referensi
- Pastikan semua kolom tabel terwakili di card view

### 6.8 Loading State Pattern

> **Semua detail pages WAJIB memiliki `loading.tsx` file.**

- Letakkan di path yang sama dengan page.tsx (e.g., `app/dashboard/hr/employees/[id]/loading.tsx`)
- Gunakan skeleton/placeholder yang sesuai dengan konten
- Konsisten dengan loading patterns di halaman lain

### 6.9 API Route Pattern

Setiap API route harus mengikuti pola ini:

```typescript
// Standard API route structure
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  // 1. Auth check
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. RBAC check (for mutations)
  // const auth = requireMutateAuth(req); // for POST/PUT/DELETE

  // 3. Tenant isolation
  const tenantId = session.user.tenantId;

  // 4. Query with tenantId filter
  const data = await prisma.model.findMany({
    where: { tenantId }
  });

  return NextResponse.json(data);
}
```

---

## 7. Multi-tenant Rules

> **Tenant isolation adalah KRITIS. Cross-tenant data leak = critical bug.**

### 7.1 Tenant Isolation

- **Setiap query database** harus filter berdasarkan `tenantId`
- **Setiap API route** harus mengambil `tenantId` dari session/JWT
- **Tidak ada cross-tenant queries** — bahkan untuk admin sekalipun (kecuali SUPERADMIN dengan explicit bypass)
- **Setiap form submission** harus menyertakan `tenantId`

### 7.2 Implementation Pattern

```typescript
// Contoh: API route dengan tenant isolation
const session = await getServerSession(authOptions);
const tenantId = session?.user?.tenantId;

const data = await prisma.invoice.findMany({
  where: { tenantId }  // ← WAJIB ada tenantId filter
});
```

### 7.3 Do Not Touch (Multi-tenant)

| System | Reason | File/Location |
|--------|--------|---------------|
| Tenant isolation | Data security — cross-tenant leak = critical bug | All API routes (`tenantId` filtering) |
| Registration flow | Must create tenant correctly | [`apps/web/app/api/auth/register/`](apps/web/app/api/auth/register/) |

---

## 8. Security Rules

### 8.1 Authentication

- NextAuth JWT with CredentialsProvider ([`apps/web/lib/auth.ts`](apps/web/lib/auth.ts))
- Password hashing dengan bcryptjs
- Session management via JWT strategy
- Role + tenantId stored in token

### 8.2 RBAC (Role-based Access Control)

4 roles dengan permissions:

| Role | Scope | Permissions |
|------|-------|-------------|
| **SUPERADMIN** | Platform-wide | Full access, manage all tenants, assign SUPERADMIN to others |
| **ADMIN** | Tenant-wide | Full CRUD, manage team, company settings |
| **MEMBER** | Department-level | Create/read, limited edit, no settings/audit access |
| **VIEWER** | Read-only | Read only, no create/edit/delete, no settings/audit access |

### 8.3 Input Sanitization

- [`apps/web/lib/sanitize.ts`](apps/web/lib/sanitize.ts) — Sanitize semua user input
- Rate limiting per IP ([`apps/web/lib/rate-limit.ts`](apps/web/lib/rate-limit.ts))
- CSRF protection
- XSS prevention (React auto-escapes, tapi tetap sanitize)

### 8.4 API Security Checklist

Setiap API route harus:

- [ ] Cek session/auth
- [ ] Cek RBAC permission
- [ ] Filter by tenantId
- [ ] Validate input (zod schema)
- [ ] Sanitize output
- [ ] Log audit trail

### 8.5 Data Protection

- AES-256 at rest, TLS 1.3 in transit
- Data residency: Server Indonesia
- Daily auto-backup, 30-day retention
- UU PDP & GDPR ready

### 8.6 Known Security Gaps (dari Audit)

> ⚠️ **Gaps berikut diketahui dan perlu di-address di phase berikutnya.**

| Gap | Severity | Status |
|-----|----------|--------|
| Hardcoded NEXTAUTH_SECRET fallback | 🔴 High | ✅ Fixed — env var mandatory, throw error di production |
| No CSP (Content-Security-Policy) headers | 🟠 Medium | ✅ Fixed — CSP di middleware.ts + next.config.js, `unsafe-eval` removed |
| No explicit CORS config | 🟠 Medium | ✅ Fixed — explicit CORS di middleware.ts + next.config.js |
| Prisma logging uncontrolled | 🟡 Low | ✅ Fixed — toggle via `ENABLE_PRISMA_LOGGING` env var |
| Rate limiter in-memory only | 🟡 Low | ✅ Fixed — Redis-backed with in-memory fallback (Batch 7D) |
| .env in git history | 🟡 Low | ✅ Fixed — .env removed from git history, .gitignore hardened |

---

## 9. Testing Requirements

Setiap perubahan kode harus di-test dengan 6 kategori:

### 9.1 Happy Path

- User dengan permission yang benar melakukan aksi yang benar
- Input valid, expected output

### 9.2 Validation

- Input invalid (field kosong, format salah, value out of range)
- Missing required fields
- Duplicate data (unique constraint)

### 9.3 Permission

- User tanpa permission mencoba aksi
- MEMBER mencoba delete
- VIEWER mencoba create
- Cross-tenant access attempt

### 9.4 Tenant Isolation

- Query tanpa tenantId filter
- Data dari tenant lain tidak muncul
- Update/Delete data tenant lain gagal

### 9.5 Error Handling

- Database error
- Network timeout
- External service unavailable
- Graceful degradation

### 9.6 Regression

- Fitur existing tidak rusak
- Navigation masih berfungsi
- CRUD operations masih berfungsi
- i18n masih berfungsi

### 9.7 Running Tests

```bash
# TypeScript check
npx tsc --noEmit

# E2E tests
cd apps/web && npx tsx __tests__/e2e-test.ts

# Prisma migration check
cd packages/db && npx prisma migrate status
```

---

## 10. Definition of Done

Sebuah task dianggap **DONE** jika semua checklist ini terpenuhi:

- [ ] 1. Code bersih, no `any` types, no unused imports
- [ ] 2. TypeScript compilation tanpa errors (`npx tsc --noEmit`)
- [ ] 3. Semua CRUD operations berfungsi (Create, Read, Update, Delete)
- [ ] 4. Tenant isolation terjaga (setiap query filter `tenantId`)
- [ ] 5. RBAC check ada di setiap API route
- [ ] 6. Input validation dengan zod schema
- [ ] 7. Input sanitization untuk user-generated content
- [ ] 8. Audit trail logging untuk semua mutations
- [ ] 9. Empty state UI untuk list pages
- [ ] 10. Toast notification untuk success/error feedback
- [ ] 11. Confirmation dialog untuk delete operations
- [ ] 12. Responsive design (mobile, tablet, desktop)
- [ ] 13. i18n support (Bahasa Indonesia + English)
- [ ] 14. Lucide React icons (bukan emoji)
- [ ] 15. Documentation updated ([`CURRENT.md`](CURRENT.md), [`FEATURES.md`](FEATURES.md) if needed)
- [ ] 16. No console errors di browser
- [ ] 17. Loading states untuk semua async operations

---

## 11. AI Development Contract

> **AI Agent harus memahami business impact, bukan hanya file changes.**

### 11.1 Sebelum Menulis Kode

1. **Pahami WHY** — Mengapa fitur ini dibutuhkan? Business problem apa yang diselesaikan?
2. **Pahami WHO** — Siapa yang akan menggunakan fitur ini? Role apa?
3. **Pahami WHAT** — Apa output yang diharapkan? Apa success criteria?
4. **Pahami RISK** — Apa yang bisa salah? Apa impact-nya?

### 11.2 Saat Menulis Kode

1. **Write for humans** — Code harus dibaca dan dipahami oleh developer lain
2. **Write for production** — Bukan prototype, bukan hackathon code
3. **Write for scale** — Pertimbangkan performance di scale besar
4. **Write for security** — Setiap input dari user dianggap berbahaya

### 11.3 Setelah Menulis Kode

1. **Test thoroughly** — Jangan asumsi, test semua path
2. **Document clearly** — Update documentation sesuai hierarchy
3. **Communicate changes** — Jelaskan apa yang berubah dan mengapa
4. **Monitor impact** — Perhatikan apakah ada side effects

### 11.4 Business Impact Checklist

Sebelum menandai task selesai, tanyakan:

- [ ] Apakah ini membantu user bekerja lebih cepat/efisien?
- [ ] Apakah ini mengurangi error/human mistake?
- [ ] Apakah ini memudahkan reporting/compliance?
- [ ] Apakah ini meningkatkan security/data protection?
- [ ] Apakah ini memberikan value yang measurable?

---

## 12. AI Agent Types (Product)

> **Bagian ini mendeskripsikan AI Agent yang dihadirkan kepada END USER (bukan developer).**

### 📌 Business Model

> **Qalcuity = Aplikasi + Server + AI built-in.** AI Agent merupakan bagian dari aplikasi, bukan layanan terpisah. User menggunakan AI langsung di platform Qalcuity (Web, Desktop, Mobile). Developer hanya menyediakan aplikasi dan server — **tidak ada biaya integrasi pihak ketiga dari sisi Qalcuity.** User mengelola sendiri integrasi ke WhatsApp, Marketplace, Payment Gateway, dll melalui dashboard integrasi dengan API key mereka sendiri.

### 💰 AI Features — Termasuk dalam Sewa

| Komponen AI | Status |
|-------------|--------|
| **AI Agent** (Finance, Sales, Inventory, HR, Support) | ✅ Built-in |
| **Natural Language Query** | ✅ Built-in |
| **Smart Document Extraction** | ✅ Built-in |
| **AI Template Generator** | ✅ Built-in |
| **Anomaly Detection** | ✅ Built-in |
| **Cash Flow Prediction** | ✅ Built-in |

### 12.1 Finance Agent 🏦

**Tujuan:** Membantu user dengan tugas-tugas keuangan secara otomatis.

| Fitur | Deskripsi | Trigger |
|-------|-----------|---------|
| **Auto-Generate Invoice** | Buat invoice dari data transaksi | "Buat invoice untuk PT ABC" |
| **Anomaly Detection** | Deteksi transaksi mencurigakan | Real-time monitoring |
| **Cash Flow Prediction** | Prediksi arus kas 30/60/90 hari | "Prediksi cash flow bulan depan" |
| **Payment Reminder** | Kirim reminder otomatis untuk overdue | Scheduled task |
| **Expense Categorization** | Auto-kategorikan expense dari receipt | Upload receipt |

### 12.2 Sales Agent 📈

**Tujuan:** Meningkatkan konversi dan efisiensi sales team.

| Fitur | Deskripsi | Trigger |
|-------|-----------|---------|
| **Win Probability** | Prediksi peluang menang deal | Setiap perubahan deal stage |
| **Next Best Action** | Sarankan langkah selanjutnya | Opening deal page |
| **Lead Scoring** | Auto-score leads berdasarkan engagement | New lead masuk |
| **Sales Forecasting** | Prediksi revenue dari pipeline | "Forecast penjualan Q3" |
| **Competitor Analysis** | Analisis win/loss vs kompetitor | "Analisis kompetitor" |

### 12.3 Inventory Agent 📦

**Tujuan:** Optimasi stok dan supply chain.

| Fitur | Deskripsi | Trigger |
|-------|-----------|---------|
| **Stockout Prediction** | Prediksi kapan stok habis | Real-time monitoring |
| **Auto-reorder Suggestion** | Sarankan reorder berdasarkan demand | Stok menipis |
| **Demand Forecasting** | Prediksi demand mingguan/bulanan | "Forecast demand produk X" |
| **Dead Stock Detection** | Identifikasi produk tidak bergerak | Weekly scan |
| **Price Monitoring** | Bandingkan harga supplier | "Bandingkan harga supplier A vs B" |

### 12.4 HR Agent 👥

**Tujuan:** Automasi HR tasks dan document generation.

| Fitur | Deskripsi | Trigger |
|-------|-----------|---------|
| **Contract Generator** | Generate kontrak kerja dari template | "Buat kontrak untuk karyawan baru" |
| **Leave Prediction** | Prediksi pattern cuti | "Prediksi cuti bulan depan" |
| **Attrition Risk** | Identifikasi karyawan berisiko resign | Monthly analysis |
| **Performance Insight** | Analisis performa tim | "Analisis performa Q2" |
| **Compliance Check** | Cek kelengkapan dokumen | "Cek dokumen karyawan tidak lengkap" |

### 12.5 Support Agent 🎧

**Tujuan:** Meningkatkan efisiensi customer support.

| Fitur | Deskripsi | Trigger |
|-------|-----------|---------|
| **Auto-Categorize** | Kategorikan tiket otomatis | New ticket masuk |
| **Suggested Reply** | Sarankan balasan berdasarkan konten tiket | Opening tiket |
| **Sentiment Analysis** | Analisis sentimen customer | Real-time |
| **Knowledge Suggestion** | Sarankan artikel dari knowledge base | Agent menulis reply |
| **Escalation Predictor** | Prediksi tiket yang perlu escalation | Pattern detection |

### 12.6 Document Agent 📄

**Tujuan:** Ekstraksi dan pemrosesan dokumen.

| Fitur | Deskripsi | Trigger |
|-------|-----------|---------|
| **PDF Extraction** | Ekstraksi data dari PDF | Upload PDF |
| **OCR Processing** | Scan dokumen fisik | Upload foto |
| **Auto-validation** | Validasi kelengkapan data | Setelah extraction |
| **Auto-entry** | Push data ke system | Validation passed |
| **Batch Processing** | Proses multiple dokumen | Upload batch |

### 12.7 Template Agent 📝

**Tujuan:** Generate dokumen HR dan bisnis dari template.

| Fitur | Deskripsi | Trigger |
|-------|-----------|---------|
| **Contract Generation** | Generate kontrak dari spesifikasi | "Buat kontrak kerja" |
| **JD Generator** | Generate job description | "Buat JD untuk Marketing Manager" |
| **Email Template** | Generate email contextual | "Draft email penawaran" |
| **Report Summary** | Ringkas laporan panjang | "Ringkas laporan Q2" |
| **Custom Template** | Buat template baru | "Buat template surat peringatan" |

---

## 13. AI Features Overview

### Natural Language Query

| Kategori | Contoh Query |
|----------|--------------|
| **Reporting** | "Tampilkan penjualan bulan ini" |
| **Comparison** | "Bandingkan revenue Q2 vs Q3" |
| **Filtering** | "Invoice overdue lebih dari 30 hari" |
| **Aggregation** | "Total penjualan per produk" |
| **Prediction** | "Prediksi cash flow bulan depan" |
| **Action** | "Buat invoice untuk PT ABC" |
| **Analysis** | "Analisis performa sales team" |

### Smart Document Extraction

| Document | Accuracy |
|----------|----------|
| Purchase Order | 95% |
| Invoice | 97% |
| Receipt | 92% |
| KTP | 98% |
| NPWP | 99% |

### Anomaly Detection

| Level | Description | Action |
|-------|-------------|--------|
| 🔴 **Critical** | Immediate action required | Real-time notification + auto-block |
| 🟠 **High** | Needs attention soon | Email + dashboard alert |
| 🟡 **Medium** | Monitor closely | Dashboard alert |
| 🟢 **Low** | Informational | Log only |

### Response Time Targets

| Feature | Target Latency |
|---------|----------------|
| **Simple Query** | < 1 second |
| **Complex Query** | < 3 seconds |
| **Document Extraction** | < 5 seconds |
| **Report Generation** | < 10 seconds |
| **Batch Processing** | < 30 seconds per 100 items |

---

## 📊 AI Metrics Dashboard

| Metric | Description | Target |
|--------|-------------|--------|
| **Query Success Rate** | % of queries answered correctly | > 90% |
| **User Satisfaction** | Rating of AI responses | > 4.5/5 |
| **Time Saved** | Hours saved per user per week | > 5 hours |
| **Accuracy** | Correct predictions/extractions | > 95% |
| **Adoption Rate** | % of users using AI features | > 60% |

---

## 14. Local Development Setup

### Database (PostgreSQL via DBngin)

> **Local development menggunakan DBngin** untuk menjalankan PostgreSQL, MySQL, dan Redis.

| Komponen | Versi | Port | Keterangan |
|----------|-------|------|------------|
| **PostgreSQL** | 18.4 | 5432 | Primary database |
| **MySQL** | 8.4.2 | 3306 | Tidak digunakan saat ini |
| **Redis** | 7.4.0 | 6379 | Cache & session |

#### DATABASE_URL Format (Tanpa Password)

```
postgresql://postgres@localhost:5432/qalcuity?schema=public
```

> **Catatan:** DBngin PostgreSQL menggunakan **trust authentication** — tidak perlu password untuk local development.

#### File `.env` Locations

| File | Path |
|------|------|
| **packages/db/.env** | [`packages/db/.env`](packages/db/.env) — Prisma schema config |
| **apps/web/.env** | [`apps/web/.env`](apps/web/.env) — Next.js app config |

#### Common Commands

```bash
# Migrate database
cd packages/db && npx prisma migrate dev

# Generate Prisma Client
cd packages/db && npx prisma generate

# Seed database
cd packages/db && npx prisma db seed

# Open Prisma Studio (visual DB browser)
cd packages/db && npx prisma studio

# TypeScript check
npx tsc --noEmit

# E2E tests
cd apps/web && npx tsx __tests__/e2e-test.ts
```

### VPS Production Deployment (aaPanel)

| Komponen | Detail |
|----------|--------|
| **Process Manager** | aaPanel Node.js Project Manager |
| **Deployment Path** | /www/wwwroot/qalcuity |
| **App Port** | 3000 |
| **App URL** | https://qalcuity.com |
| **Node Version** | v24.15.0 |
| **Database** | PostgreSQL (aaPanel) |
| **Prisma Engine** | library (PRISMA_QUERY_ENGINE_TYPE=library) |
| **Update Command** | `bash update.sh` |

#### Deployment Notes

- aaPanel auto-restart setelah build
- `.env` file values menang atas env vars lain (dotenv tidak override)
- NEXTAUTH_URL harus `"https://qalcuity.com"` (bukan localhost)
- NEXTAUTH_SECRET harus production value
- Prisma migrations: `cd packages/db && npx prisma migrate deploy`

---

## 15. Architecture Philosophy

> **"Qalcuity — Business Operating System yang dapat dikonfigurasi untuk berbagai jenis industri."**

### 15.1 Core Philosophy

Qalcuity dibangun dengan filosofi **"Core + Configuration"**:
- **Core** menyediakan kemampuan bisnis universal (Finance, CRM, HR, Inventory, dll.)
- **Configuration** memungkinkan setiap industri menyesuaikan workflow, approval, fields, dan dashboard sesuai kebutuhan mereka

### 15.2 Three Foundation Engines

| Engine | Responsibility | Package |
|--------|---------------|---------|
| **Permission Engine** | Industry-agnostic granular permissions | `@qalcuity/permissions` |
| **Workflow Engine** | Configurable transaction lifecycle | `@qalcuity/workflow` |
| **Industry Configuration Engine** | Industry packs + custom fields/documents/reports | `@qalcuity/industry-config` |

### 15.3 Key Principle

> **"Never design a feature for only one industry unless the feature is inherently industry-specific. Prefer reusable core capabilities, configurable workflows, configurable fields, configurable permissions, configurable approval rules, and industry-specific extensions over hardcoded industry logic."**

### 15.4 Anti-patterns (HARD RULES)

| ❌ Anti-pattern | ✅ Correct Approach |
|----------------|-------------------|
| `if (industry === 'manufacturing')` di core code | Gunakan Industry Configuration Engine |
| Hardcoded workflow status di code | Gunakan Workflow Engine |
| Hardcoded approval levels (3 level fixed) | Gunakan configurable approval rules |
| Schema Prisma dengan field tambahan tanpa engine | Gunakan custom fields engine |
| Dashboard widgets yang fixed per module | Gunakan dashboard configuration |

### 15.5 Reference

Lihat [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) untuk dokumentasi lengkap arsitektur Business Operating System.

---

**Last Updated:** September 1, 2026 (Improvement Sprint Complete)
**Maintainer:** Qalcuity AI Team
**Document Version:** 6.0 — Improvement Sprint Complete (Batches 7A-7E)
