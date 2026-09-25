# 🔍 Fondasi Audit — Qalcuity Repository

> **Tanggal:** 23 September 2026
> **Auditor:** Senior ERP Product Architect (AI)
> **Metode:** Read-only — membaca semua dokumentasi dan menginspeksi struktur repository
> **Prinsip:** Code is source of truth — jika dokumentasi bilang X tapi code bilang Y, percaya code.

---

## 1. Documentation Status

### 1.1 Dokumentasi yang Dibaca (12 file)

| # | File | Versi | Last Updated | Baris | Status |
|---|------|-------|-------------|-------|--------|
| 1 | [`AGENT.md`](AGENT.md) | 8.0 | Sep 13, 2026 | 1,077 | ✅ Current |
| 2 | [`CURRENT.md`](CURRENT.md) | v11.40.0 | Sep 19, 2026 | 6,544 | ✅ Current |
| 3 | [`FEATURES.md`](FEATURES.md) | 30.0 | Sep 16, 2026 | 1,994 | ✅ Current |
| 4 | [`ROADMAP.md`](ROADMAP.md) | v11.30.0 | Sep 15, 2026 | 861 | ⚠️ Slight stale |
| 5 | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | v5.0.0 | Sep 1, 2026 | 2,470 | ⚠️ Stale |
| 6 | [`docs/DATABASE.md`](docs/DATABASE.md) | v1.0.0-beta.2 | Sep 11, 2026 | 505 | ⚠️ Stale |
| 7 | [`docs/SECURITY.md`](docs/SECURITY.md) | v5.2.0 | Sep 12, 2026 | 579 | ⚠️ Stale |
| 8 | [`docs/UI_UX.md`](docs/UI_UX.md) | v1.0.0-beta.2 | Aug 30, 2026 | 304 | ⚠️ Stale |
| 9 | [`docs/DECISIONS.md`](docs/DECISIONS.md) | v1.0.0-beta.1 | Aug 30, 2026 | 1,386 | ⚠️ Stale |
| 10 | [`docs/CRON-JOBS.md`](docs/CRON-JOBS.md) | — | Sep 11, 2026 | 239 | ⚠️ Partially stale |
| 11 | [`docs/ANALYTICS.md`](docs/ANALYTICS.md) | 1.1 | Aug 31, 2026 | 2,119 | ⚠️ Stale |
| 12 | [`docs/REMAINING-WORK.md`](docs/REMAINING-WORK.md) | 1.4 | Sep 4, 2026 | 2,009 | ⚠️ Stale |

### 1.2 Documentation Versioning Problem

> ⚠️ **CRITICAL: Tidak ada single source of truth untuk versioning.** Setiap dokumen punya versi sendiri-sendiri yang tidak konsisten.

| Dokumen | Versi | Catatan |
|---------|-------|---------|
| `package.json` root | 11.25.0 | Code truth |
| `apps/web/package.json` | 11.24.0 | Code truth — selisih dengan root |
| `CURRENT.md` | v11.40.0 | Klaim lebih tinggi dari code |
| `ROADMAP.md` | v11.30.0 | Klaim lebih tinggi dari code |
| `AGENT.md` | 8.0 | Format versi berbeda (dokumen vs app) |
| `FEATURES.md` | 30.0 | Format versi berbeda |
| `ARCHITECTURE.md` | v5.0.0 | Format versi berbeda |
| `DATABASE.md` | v1.0.0-beta.2 | Format versi berbeda |
| `SECURITY.md` | v5.2.0 | Format versi berbeda |

**Temuan:** Code (`package.json`) di v11.25.0 tapi `CURRENT.md` mengklaim v11.40.0. Ada gap 15 versi antara code dan dokumentasi.

### 1.3 Cross-Documentation Consistency Issues

| Metrik | Dokumen A | Dokumen B | Selisih |
|--------|-----------|-----------|---------|
| DB Indexes | DATABASE.md: 275 (242+33) | AGENT.md: 277 | ±2 |
| Zod Schemas | SECURITY.md: 144 | AGENT.md: 153 | ±9 |
| i18n Keys | UI_UX.md: 200+ | ROADMAP.md: 1,847 | ~1,647 |
| Loading Files | UI_UX.md: 116 | AGENT.md: 117 | ±1 |
| Audit Calls | SECURITY.md: 77+ | — | — |
| API Routes | AGENT.md: 400+ | — | — |
| Rate Limit Configs | AGENT.md: 5 | — | — |

---

## 2. Repository Structure

### 2.1 Root Configuration

```
qalcuity-allinone/
├── package.json          # v11.25.0, pnpm@9.0.0, turbo
├── pnpm-workspace.yaml   # apps/* + packages/*
├── pnpm-lock.yaml
├── AGENT.md              # AI Agent rules (1,077 lines)
├── CURRENT.md            # Current state (6,544 lines)
├── FEATURES.md           # Feature list (1,994 lines)
├── ROADMAP.md            # Development roadmap (861 lines)
├── .gitignore
├── db-manager.sh
├── DEMO-DATA.md
├── DEPLOY-CHECKLIST.md
├── DEPLOY-POSTGRESQL.md
├── apps/                 # 3 apps
├── packages/             # 12 shared packages
├── docs/                 # 10 documentation files
├── plans/                # 17 planning documents
└── scripts/              # Build/utility scripts
```

### 2.2 Build System

| Komponen | Value | Catatan |
|----------|-------|---------|
| **Package Manager** | pnpm 9.0.0 | Via `packageManager` field |
| **Build Orchestrator** | turbo ^2.0.0 | Root devDependencies |
| **Node Engine** | >=18 | Required |
| **pnpm Engine** | >=8 | Required |
| **Workspace Pattern** | `apps/*` + `packages/*` | Standard monorepo |
| **Test Framework** | vitest ^5.0.0 | Root level |
| **TypeScript** | ^5.5.0 | Across all packages |

### 2.3 Root Scripts

| Script | Command | Catatan |
|--------|---------|---------|
| `dev` | `turbo dev` | Development server |
| `build` | `turbo build --filter=!qalcuity-desktop` | Build all kecuali desktop |
| `lint` | `turbo lint` | Linting |
| `clean` | `turbo clean` | Cleanup |
| `test` | `vitest run` | Run tests |
| `db:generate` | Prisma generate | Via workspace filter |
| `db:push` | Prisma db push | Via workspace filter |
| `db:seed` | Prisma seed | Via workspace filter |
| `db:studio` | Prisma studio | Via workspace filter |
| `db:migrate` | Prisma migrate deploy | Via workspace filter |
| `db:migrate:status` | Prisma migrate status | Via workspace filter |
| `db:migrate:reset` | Prisma migrate reset | Via workspace filter |

---

## 3. Package Map

### 3.1 Shared Packages (12 total)

| # | Package | Versi | Dependencies | Internal Deps | Status |
|---|---------|-------|-------------|---------------|--------|
| 1 | [`@qalcuity/db`](packages/db/) | 0.1.0 | @prisma/client 5.15, bcryptjs 3.0 | — | ✅ Active |
| 2 | [`@qalcuity/types`](packages/types/) | 1.0.0 | — | — | ✅ Active |
| 3 | [`@qalcuity/utils`](packages/utils/) | 0.1.0 | — | — | ✅ Active |
| 4 | [`@qalcuity/config`](packages/config/) | 0.1.0 | — | — | ✅ Active |
| 5 | [`@qalcuity/validation`](packages/validation/) | 0.1.0 | — | @qalcuity/types | ✅ Active |
| 6 | [`@qalcuity/ui`](packages/ui/) | 0.1.0 | lucide-react 0.400 | — (peer: react 18.3) | ✅ Active |
| 7 | [`@qalcuity/i18n`](packages/i18n/) | 0.1.0 | — | — | ✅ Active |
| 8 | [`@qalcuity/permissions`](packages/permissions/) | 0.1.0 | — | @qalcuity/types | ✅ Active |
| 9 | [`@qalcuity/workflow`](packages/workflow/) | 0.1.0 | — | — | ✅ Active |
| 10 | [`@qalcuity/industry-config`](packages/industry-config/) | 0.1.0 | — | — | ✅ Active |
| 11 | [`@qalcuity/analytics`](packages/analytics/) | 0.1.0 | — | @qalcuity/config, @qalcuity/types | ✅ Active |
| 12 | [`@qalcuity/api`](packages/api/) | 0.1.0 | — | @qalcuity/types | ✅ Active |

### 3.2 Package Dependency Graph

```
@qalcuity/types ←──────────────────────────────────────┐
    ↑              ↑              ↑           ↑         │
    │              │              │           │         │
@qalcuity/validation  @qalcuity/permissions  @qalcuity/api  @qalcuity/analytics
                                                    ↑
                                            @qalcuity/config
```

### 3.3 Package Responsibility Summary

| Package | Responsibility | Source Lines |
|---------|---------------|-------------|
| [`@qalcuity/db`](packages/db/prisma/schema.prisma) | Prisma schema (100 models), migrations, seed | 2,807 (schema) |
| [`@qalcuity/types`](packages/types/src/index.ts) | Shared TypeScript types (Invoice, Contact, Product, etc.) | 992 |
| [`@qalcuity/utils`](packages/utils/src/index.ts) | Utility functions (cn, formatCurrency, formatDate, slugify, truncate) | 62 |
| [`@qalcuity/config`](packages/config/src/index.ts) | Constants (statuses, labels, limits), env config, feature flags | 86 |
| [`@qalcuity/validation`](packages/validation/src/index.ts) | Validation functions (email, phone, NIK, NPWP, NIB, etc.) | 566 |
| [`@qalcuity/ui`](packages/ui/src/index.ts) | Design tokens + 9 React components (Button, Input, Select, Table, Modal, Card, Badge, Alert, Spinner) | 121 (index) |
| [`@qalcuity/i18n`](packages/i18n/) | i18n utilities + message files (id.json, en.json) | — |
| [`@qalcuity/permissions`](packages/permissions/src/index.ts) | Permission engine (can() function, roles, permissions, scope) | — |
| [`@qalcuity/workflow`](packages/workflow/src/index.ts) | Workflow engine (state machine, transitions, guards, auto-actions) | — |
| [`@qalcuity/industry-config`](packages/industry-config/src/) | Industry configuration engine + 11 industry packs | — |
| [`@qalcuity/analytics`](packages/analytics/src/index.ts) | Analytics engine (dimensions, metrics, query builder, dashboard) | 102 (index) |
| [`@qalcuity/api`](packages/api/src/index.ts) | Shared API client, error classes, types (financeApi, crmApi, etc.) | 54 (index) |

---

## 4. App Map

### 4.1 Apps (3 total)

#### [`apps/web`](apps/web/) — `@qalcuity/web` v11.24.0

| Aspek | Value |
|-------|-------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5.5 |
| **Styling** | Tailwind CSS 3.4 |
| **Auth** | NextAuth.js 4.24 (JWT) |
| **ORM** | Prisma Client 5.15 |
| **Validation** | Zod 4.5 |
| **Icons** | Lucide React 1.31 |
| **Cache** | ioredis 6.0 |
| **AI** | OpenAI 7.8 |
| **Payment** | midtrans-client 1.4, xendit-node 7.0 |
| **Email** | nodemailer 9.0 |
| **Excel** | xlsx 0.18 |
| **Status** | ✅ Production |

**Workspace Dependencies (declared in package.json):**
- ✅ `@qalcuity/analytics: workspace:*`
- ✅ `@qalcuity/api: workspace:*`
- ✅ `@qalcuity/config: workspace:*`
- ✅ `@qalcuity/industry-config: workspace:*`
- ✅ `@qalcuity/permissions: workspace:*`
- ✅ `@qalcuity/workflow: workspace:*`
- ❌ `@qalcuity/ui` — **NOT declared**
- ❌ `@qalcuity/utils` — **NOT declared**
- ❌ `@qalcuity/validation` — **NOT declared**
- ❌ `@qalcuity/i18n` — **NOT declared**
- ❌ `@qalcuity/types` — **NOT declared**
- ❌ `@qalcuity/db` — **NOT declared** (uses `@prisma/client` directly)

#### [`apps/mobile`](apps/mobile/) — `@qalcuity/mobile` v0.1.0

| Aspek | Value |
|-------|-------|
| **Framework** | React Native / Expo 50 |
| **Language** | TypeScript 5.5 |
| **Navigation** | @react-navigation/native 6.1 |
| **Storage** | @react-native-async-storage 3.1 |
| **Status** | ⚠️ Partial (auth + 12 screens) |

**Workspace Dependencies:** ❌ **NONE — Zero workspace packages declared**
- Mobile app completely isolated dari shared packages
- Tidak menggunakan @qalcuity/permissions, @qalcuity/types, atau package lainnya

#### [`apps/desktop`](apps/desktop/) — `qalcuity-desktop` v1.0.0

| Aspek | Value |
|-------|-------|
| **Framework** | Electron 28 |
| **Builder** | electron-builder 24 |
| **Status** | ⚠️ Placeholder (minimal wrapper) |

**Workspace Dependencies:** ❌ **NONE — Zero workspace packages declared**
- Desktop app hanya wrapper Electron
- Files: main.js, preload.js, package.json, README.md

---

## 5. Discrepancies

### 5.1 🔴 CRITICAL Discrepancies

#### D1: apps/web Missing Workspace Dependencies

> **apps/web tidak mendeklarasikan 6 packages yang diklaim "active" di AGENT.md.**

| Package | Klaim AGENT.md | Deklarasi apps/web | Status |
|---------|---------------|-------------------|--------|
| `@qalcuity/ui` | ✅ Active | ❌ Not declared | **GAP** |
| `@qalcuity/utils` | ✅ Active | ❌ Not declared | **GAP** |
| `@qalcuity/validation` | ✅ Active | ❌ Not declared | **GAP** |
| `@qalcuity/i18n` | ✅ Active | ❌ Not declared | **GAP** |
| `@qalcuity/types` | ✅ Active | ❌ Not declared | **GAP** |
| `@qalcuity/db` | ✅ Active | ❌ Not declared | **GAP** |

**Implikasi:** Packages ini mungkin tidak benar-benar digunakan oleh apps/web, atau apps/web memiliki duplikasi code lokal (violation of DRY principle).

#### D2: Version Drift Between Code and Documentation

> **Code (package.json) di v11.25.0 tapi documentation mengklaim versi yang lebih tinggi.**

| Source | Version | Delta from Code |
|--------|---------|----------------|
| `package.json` (root) | 11.25.0 | — (source of truth) |
| `apps/web/package.json` | 11.24.0 | -1 |
| `CURRENT.md` | v11.40.0 | **+15** |
| `ROADMAP.md` | v11.30.0 | **+5** |

**Implikasi:** Documentation tidak di-update setiap kali code berubah, atau versi documentasi di-independen dari versi aplikasi.

### 5.2 🟠 HIGH Discrepancies

#### D3: Mobile/Desktop Zero Integration

> **apps/mobile dan apps/desktop memiliki ZERO workspace dependencies.**

- Mobile: React Native app yang berdiri sendiri, tidak menggunakan shared packages
- Desktop: Electron wrapper yang sangat minimal
- **Implikasi:** Permission engine, types, validation, dll. tidak bisa digunakan di mobile/desktop tanpa redesign

#### D4: Documentation Metric Inconsistencies

| Metrik | docs/DATABASE.md | AGENT.md | Selisih | Impact |
|--------|-----------------|----------|---------|--------|
| DB Indexes | 275 (242+33) | 277 | ±2 | Low — counting method |
| Zod Schemas | 144 | 153 | ±9 | Medium — feature tracking |
| i18n Keys | 200+ (UI_UX.md) | 4,755 (AGENT.md) | ~4,555 | High — UI_UX.md sangat stale |
| Loading Files | 116 | 117 | ±1 | Low |

#### D5: Analytics Package Structure Mismatch

> **docs/ANALYTICS.md mendokumentasikan package structure yang tidak ada di code.**

Dokumentasi merencanakan 15+ source files:
- `metric-registry.ts`, `query-builder.ts`, `semantic-layer.ts`, `cache-manager.ts`, `scheduler.ts`, `alert-engine.ts`, `anomaly-detector.ts`, `forecast-engine.ts`, `export-engine.ts`, `pivot-engine.ts`, `drill-down.ts`, `data-lineage.ts`, `permission-guard.ts`

Actual source files:
- `index.ts`, `types.ts`, `engine.ts`, `dimensions.ts`, `metrics.ts`, `utils.ts`

**Implikasi:** Dokumentasi describe aspirational architecture, bukan actual implementation.

### 5.3 🟡 MEDIUM Discrepancies

#### D6: Turbo Config Missing

> **Root package.json menggunakan turbo untuk scripts tapi tidak ada `turbo.json` di root.**

- Scripts: `turbo dev`, `turbo build`, `turbo lint`, `turbo clean`
- File `turbo.json` tidak ditemukan di root listing
- **Implikasi:** Build system mungkin menggunakan default turbo config atau ada di lokasi lain

#### D7: Schema Documentation Lag

> **Prisma schema (2,807 baris) jauh lebih besar dari yang didokumentasikan di DATABASE.md (505 baris).**

Models yang ada di schema tapi TIDAK didokumentasikan di DATABASE.md:
- POS models (PosTerminal, PosSession, PosTransaction, PosRefund, PosKitchenOrder, PosTable, etc.)
- Activity models
- Workflow models (WorkflowDefinition, WorkflowTransition)
- Analytics models (AnalyticsDataset, AnalyticsDashboard, etc.)
- Entitlement models (TenantEntitlement, UsageRecord)
- Rate Limit models (RateLimitLog)
- Settings models (TenantNotificationSettings, TenantIntegration)
- Accounting models (AccountingPeriod, JournalEntry, JournalEntryItem)
- Approval models (ApprovalLevel, ApprovalRequest)
- CronRunLog model

---

## 6. Critical Findings

### 6.1 🏗️ Architecture Health

| Aspek | Score | Catatan |
|-------|-------|---------|
| **Monorepo Structure** | 9/10 | Clean pnpm workspaces, proper package separation |
| **Package Design** | 7/10 | Good separation, tapi 6 packages tidak terhubung ke apps/web |
| **Documentation Coverage** | 6/10 | Comprehensive tapi stale dan inconsistent |
| **Code-Documentation Sync** | 4/10 | Significant drift between code versions and doc versions |
| **Cross-Platform Integration** | 3/10 | Mobile dan Desktop completely isolated |
| **Build System** | 8/10 | Turbo + pnpm, tapi turbo.json missing |

### 6.2 📊 Key Statistics (Code Truth)

| Metric | Value | Source |
|--------|-------|--------|
| **App Version** | 11.25.0 | `package.json` root |
| **Web App Version** | 11.24.0 | `apps/web/package.json` |
| **Prisma Models** | 100 | `schema.prisma` (2,807 lines) |
| **TypeScript Files** | 727 (web) + 52 (packages) | AGENT.md |
| **API Route Files** | 228 | AGENT.md |
| **API Routes** | 400+ | AGENT.md |
| **RBAC Route Entries** | 165 | AGENT.md |
| **Shared Packages** | 12 | Repository inspection |
| **Apps** | 3 (web, mobile, desktop) | Repository inspection |
| **Industry Packs** | 11 | `packages/industry-config/src/packs/` |
| **Zod Schemas** | 153 | `apps/web/lib/validation-schemas.ts` |
| **i18n Keys** | 4,755 | AGENT.md |
| **UI Components** | 9 | `packages/ui/src/components/` |

### 6.3 🎯 Top 5 Recommendations

1. **Fix Workspace Dependencies** — Tambahkan `workspace:*` declarations untuk semua shared packages yang digunakan oleh apps/web. Ini kritis untuk memastikan packages benar-benar terintegrasi.

2. **Establish Single Versioning Strategy** — Tentukan apakah versi app (11.x) atau versi dokumen (v8.0, v30.0, v5.0.0) yang authoritative. Buat script untuk sync versi otomatis.

3. **Sync Documentation** — Update semua docs/ files untuk mencerminkan actual code state. Prioritas: DATABASE.md (tambah POS/analytics models), SECURITY.md (update schema count), UI_UX.md (update i18n keys).

4. **Mobile Integration Strategy** — Buat rencana untuk mengintegrasikan @qalcuity/types dan @qalcuity/permissions ke apps/mobile. Minimal shared types harus tersedia.

5. **Add turbo.json** — Pastikan turbo.json ada di root untuk konfigurasi build pipeline yang proper.

---

## Appendix A: Documentation File Listing

```
docs/
├── ANALYTICS-STUDIO.md
├── ANALYTICS.md
├── ARCHITECTURE.md
├── CRON-JOBS.md
├── DATABASE.md
├── DECISIONS.md
├── I18N-MIGRATION-REPORT.md
├── REMAINING-WORK.md
├── SECURITY.md
└── UI_UX.md
```

## Appendix B: Plans Directory

```
plans/
├── deploy-vps-fixes.md
├── documentation-update-sprint.md
├── final-implementation-report.md
├── final-review-report.md
├── fix-vps-deployment-issues.md
├── google-oauth-debug-v2.md
├── google-oauth-debug.md
├── migration-subscription-plan.md
├── phase-14-button-fix-and-platform-admin.md
├── platform-admin-audit.md
├── pos-feature-plan.md
├── pos-kitchen-display-architecture.md
├── pos-offline-mode-architecture.md
├── post-deployment-audit-report.md
├── totalusers-typeerror.md
├── ui-completeness-audit.md
├── update-sh-postgresql-debug.md
└── web-app-comprehensive-plan.md
```

## Appendix C: Industry Packs

```
packages/industry-config/src/packs/
├── index.ts
├── agriculture.ts
├── construction.ts
├── education.ts
├── healthcare.ts
├── hospitality.ts
├── logistics.ts
├── manufacturing.ts
├── professional-services.ts
├── restaurant.ts
└── retail.ts
```

---

**Audit Selesai:** 23 September 2026
**Total Files Dibaca:** 12 dokumentasi + 20+ package.json/source files
**Status Fondasi:** ⚠️ Structurally Sound tapi ada significant documentation drift dan workspace integration gaps
