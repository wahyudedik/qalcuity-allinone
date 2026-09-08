# Rencana Migrasi: SubscriptionPlan → Plan Model

> **ID Task:** H8  
> **Tanggal:** 8 September 2026  
> **Status:** Rencana (belum diimplementasi)  
> **Author:** Qalcuity AI Agent

---

## Daftar Isi

1. [Ringkasan Temuan](#1-ringkasan-temuan)
2. [Analisis Perbandingan Model](#2-analisis-perbandingan-model)
3. [Peta Dependensi Code](#3-peta-dependensi-code)
4. [Rencana Migrasi](#4-rencana-migrasi)
5. [Risiko dan Mitigasi](#5-risiko-dan-mitigasi)
6. [Rollback Plan](#6-rollback-plan)
7. [Checklist Eksekusi](#7-checklist-eksekusi)

---

## 1. Ringkasan Temuan

### Model Lama (akan dihapus)

| Model | Deskripsi | Relasi |
|-------|-----------|--------|
| [`SubscriptionPlan`](packages/db/prisma/schema.prisma:811) | Definisi paket langganan (lama) | → TenantSubscription[] |
| [`TenantSubscription`](packages/db/prisma/schema.prisma:830) | Status langganan per tenant (lama) | → Tenant, → SubscriptionPlan, → BillingPayment[] |
| [`BillingPayment`](packages/db/prisma/schema.prisma:851) | Record pembayaran billing | → TenantSubscription, → Tenant |

### Model Baru (akan dipertahankan)

| Model | Deskripsi | Relasi |
|-------|-----------|--------|
| [`Plan`](packages/db/prisma/schema.prisma:1651) | Definisi paket (baru) | → PlanFeature[], → TenantEntitlement[] |
| [`PlanFeature`](packages/db/prisma/schema.prisma:1669) | Fitur per paket | → Plan |
| [`TenantEntitlement`](packages/db/prisma/schema.prisma:1682) | Entitlement per tenant (baru) | → Tenant, → Plan |
| [`UsageRecord`](packages/db/prisma/schema.prisma:1703) | Tracking usage per fitur | → Tenant |

### Model Pendukung yang Juga Perlu Ditangani

| Model/Field | Lokasi | Status |
|-------------|--------|--------|
| `Tenant.subscriptionStatus` | [`schema.prisma:32`](packages/db/prisma/schema.prisma:32) | Redundan dengan TenantEntitlement.status |
| `Tenant.trialEndsAt` | [`schema.prisma:33`](packages/db/prisma/schema.prisma:33) | Redundan dengan TenantEntitlement.trialEndsAt |
| `Tenant.currentPlanSlug` | [`schema.prisma:34`](packages/db/prisma/schema.prisma:34) | Redundan dengan TenantEntitlement.plan.slug |

### Temuan Kunci

1. **Sistem sudah dalam kondisi hybrid** — code baru sudah menggunakan `Plan` + `TenantEntitlement`, tapi code lama masih mengakses `SubscriptionPlan` + `TenantSubscription`
2. **`BillingPayment` tidak memiliki padanan langsung di model baru** — ini satu-satunya model lama yang masih aktif digunakan secara luas
3. **Webhook handler** ([`webhook/route.ts`](apps/web/app/api/billing/webhook/route.ts:153)) sudah memiliki "bridge code" yang menyalin data dari `SubscriptionPlan` ke `Plan` saat pembayaran dikonfirmasi
4. **Seed data** ([`seed.ts`](packages/db/prisma/seed.ts:1145)) masih membuat data di model lama

---

## 2. Analisis Perbandingan Model

### 2.1 SubscriptionPlan vs Plan

| Aspek | SubscriptionPlan (Lama) | Plan (Baru) | Catatan |
|-------|------------------------|-------------|---------|
| `name` | ✅ String | ✅ String @unique | Plan lebih ketat (unique) |
| `slug` | ✅ String @unique | ✅ String @unique | Sama |
| `description` | ✅ String? | ✅ String? | Sama |
| `price` | ✅ Decimal | ❌ Tidak ada | Diganti priceMonthly |
| `priceMonthly` | ❌ Tidak ada | ✅ Decimal | Pengganti `price` |
| `priceYearly` | ❌ Tidak ada | ✅ Decimal? | Baru — diskon yearly |
| `billingPeriod` | ✅ String "monthly"/"yearly" | ❌ Tidak ada | Dipindah ke TenantEntitlement.billingCycle |
| `maxUsers` | ✅ Int default(5) | ✅ Int (-1=unlimited) | Perubahan: -1 = unlimited |
| `maxProducts` | ✅ Int default(100) | ❌ Tidak ada | Dihapus — gunakan PlanFeature |
| `maxStorage` | ✅ String? "5GB" | ✅ Int? (MB) | Tipe berubah: String → Int MB |
| `features` | ✅ String? (JSON) | ❌ Tidak ada | Dipindah ke PlanFeature model |
| `isActive` | ✅ Boolean | ✅ Boolean | Sama |
| `sortOrder` | ✅ Int | ✅ Int | Sama |

### 2.2 TenantSubscription vs TenantEntitlement

| Aspek | TenantSubscription (Lama) | TenantEntitlement (Baru) | Catatan |
|-------|--------------------------|-------------------------|---------|
| `tenantId` | ✅ String | ✅ String @unique | Entitlement: 1 tenant = 1 entri |
| `planId` | ✅ → SubscriptionPlan | ✅ → Plan | Referensi berubah |
| `status` | ✅ "TRIAL","ACTIVE",... | ✅ "active","trial",... | Case berubah (UPPER → lower) |
| `startDate` | ✅ DateTime | ❌ Tidak ada | Diganti currentPeriodStart |
| `endDate` | ✅ DateTime? | ❌ Tidak ada | Diganti currentPeriodEnd |
| `nextBillingDate` | ✅ DateTime? | ❌ Tidak ada | Dihapus |
| `paymentMethod` | ✅ String? | ❌ Tidak ada | Dihapus dari entitlement |
| `billingCycle` | ❌ Tidak ada | ✅ String "monthly"/"yearly" | Baru |
| `trialEndsAt` | ❌ Tidak ada | ✅ DateTime? | Baru |
| `currentPeriodStart` | ❌ Tidak ada | ✅ DateTime | Baru |
| `currentPeriodEnd` | ❌ Tidak ada | ✅ DateTime | Baru |
| `cancelledAt` | ❌ Tidak ada | ✅ DateTime? | Baru |
| Relasi payments | ✅ → BillingPayment[] | ❌ Tidak ada | BillingPayment dipisah |

### 2.3 BillingPayment — Tidak Ada Padanan Langsung

[`BillingPayment`](packages/db/prisma/schema.prisma:851) adalah model transaksi pembayaran yang **tidak memiliki equivalent** di model baru. Opsi:

- **Opsi A:** Pertahankan `BillingPayment` tapi ubah relasi dari `TenantSubscription` ke `TenantEntitlement` (atau buat field `tenantEntitlementId`)
- **Opsi B:** Buat model baru `Payment` yang terpisah dari subscription
- **Opsi C:** Pertahankan `BillingPayment` sebagai-is, hanya hapus dependensi ke `TenantSubscription`

> **Rekomendasi: Opsi A** — Pertahankan `BillingPayment` tapi migrasi relasinya. Model ini sudah terintegrasi dengan Midtrans dan manual transfer.

### 2.4 Tenant Model Fields — Redundan

Field di [`Tenant`](packages/db/prisma/schema.prisma:17) yang redundan:

| Field | Lokasi | Redundan dengan |
|-------|--------|-----------------|
| `subscriptionStatus` | Line 32 | `TenantEntitlement.status` |
| `trialEndsAt` | Line 33 | `TenantEntitlement.trialEndsAt` |
| `currentPlanSlug` | Line 34 | `TenantEntitlement.plan.slug` |

> **Catatan:** Field-field ini sudah ada sebelum Entitlement Engine dibuat. Mereka masih digunakan di beberapa tempat. Penghapusan harus dilakukan bertahap.

---

## 3. Peta Dependensi Code

### 3.1 File yang Menggunakan Model Lama

#### SubscriptionPlan

| File | Baris | Penggunaan |
|------|-------|------------|
| [`packages/types/src/index.ts`](packages/types/src/index.ts:730) | 730-743 | Interface TypeScript |
| [`packages/db/prisma/seed.ts`](packages/db/prisma/seed.ts:1145) | 1145 | Seed legacy subscription |
| [`apps/web/__tests__/e2e-test.ts`](apps/web/__tests__/e2e-test.ts:703) | 703 | E2E test billing |
| [`apps/web/app/api/platform/tenants/route.ts`](apps/web/app/api/platform/tenants/route.ts:138) | 138 | Buat tenant baru + subscription |
| [`apps/web/app/api/billing/webhook/route.ts`](apps/web/app/api/billing/webhook/route.ts:162) | 162 | Bridge: copy SubscriptionPlan → Plan |

#### TenantSubscription

| File | Baris | Penggunaan |
|------|-------|------------|
| [`packages/types/src/index.ts`](packages/types/src/index.ts:745) | 745-755 | Interface TypeScript |
| [`packages/db/prisma/seed.ts`](packages/db/prisma/seed.ts:1148) | 1148 | Seed legacy subscription |
| [`apps/web/app/api/billing/payments/route.ts`](apps/web/app/api/billing/payments/route.ts:83) | 83, 115 | Validasi subscription + update status |
| [`apps/web/app/api/billing/payments/midtrans/route.ts`](apps/web/app/api/billing/payments/midtrans/route.ts:42) | 42, 108 | Cek subscription + update status |
| [`apps/web/app/api/billing/payments/midtrans/callback/route.ts`](apps/web/app/api/billing/payments/midtrans/callback/route.ts:114) | 114 | Update subscription status |
| [`apps/web/app/api/billing/admin/payments/[id]/verify/route.ts`](apps/web/app/api/billing/admin/payments/[id]/verify/route.ts:74) | 74 | Update subscription status |
| [`apps/web/app/api/billing/webhook/route.ts`](apps/web/app/api/billing/webhook/route.ts:155) | 155 | Dapatkan plan dari subscription |
| [`apps/web/app/api/platform/billing/route.ts`](apps/web/app/api/platform/billing/route.ts:30) | 30, 98 | MRR calculation + plan distribution |
| [`apps/web/app/api/platform/tenants/route.ts`](apps/web/app/api/platform/tenants/route.ts:145) | 145 | Buat subscription saat create tenant |
| [`apps/web/app/dashboard/settings/billing/page.tsx`](apps/web/app/dashboard/settings/billing/page.tsx:78) | 78 | Interface TenantSubscription |
| [`apps/web/app/platform/tenants/[id]/page.tsx`](apps/web/app/platform/tenants/[id]/page.tsx:39) | 39 | Interface TenantSubscription |

#### BillingPayment

| File | Baris | Penggunaan |
|------|-------|------------|
| [`packages/types/src/index.ts`](packages/types/src/index.ts:757) | 757-774 | Interface TypeScript |
| [`apps/web/lib/validation-schemas.ts`](apps/web/lib/validation-schemas.ts:614) | 614, 626 | Zod schemas |
| [`apps/web/app/api/billing/payments/route.ts`](apps/web/app/api/billing/payments/route.ts:22) | 22, 33, 97 | CRUD payments |
| [`apps/web/app/api/billing/payments/midtrans/route.ts`](apps/web/app/api/billing/payments/midtrans/route.ts:95) | 95, 139, 151 | Midtrans payment |
| [`apps/web/app/api/billing/payments/midtrans/callback/route.ts`](apps/web/app/api/billing/payments/midtrans/callback/route.ts:67) | 67, 99 | Midtrans callback |
| [`apps/web/app/api/billing/admin/payments/[id]/verify/route.ts`](apps/web/app/api/billing/admin/payments/[id]/verify/route.ts:34) | 34, 64, 105 | Verify payment |
| [`apps/web/app/api/billing/webhook/route.ts`](apps/web/app/api/billing/webhook/route.ts:111) | 111, 140 | Webhook handler |
| [`apps/web/app/dashboard/settings/billing/page.tsx`](apps/web/app/dashboard/settings/billing/page.tsx:61) | 61 | Interface BillingPayment |

### 3.2 File yang Sudah Menggunakan Model Baru

| File | Model yang Digunakan |
|------|---------------------|
| [`apps/web/lib/entitlement.ts`](apps/web/lib/entitlement.ts:1) | TenantEntitlement, Plan, PlanFeature, UsageRecord |
| [`apps/web/lib/entitlements-config.ts`](apps/web/lib/entitlements-config.ts:1) | Config untuk Plan |
| [`apps/web/app/api/billing/plans/route.ts`](apps/web/app/api/billing/plans/route.ts:21) | Plan, PlanFeature |
| [`apps/web/app/api/billing/plan/route.ts`](apps/web/app/api/billing/plan/route.ts:1) | TenantEntitlement, Plan |
| [`apps/web/app/api/admin/plans/route.ts`](apps/web/app/api/admin/plans/route.ts:58) | Plan, PlanFeature, TenantEntitlement |
| [`apps/web/app/api/admin/plans/[id]/route.ts`](apps/web/app/api/admin/plans/[id]/route.ts:40) | Plan, PlanFeature, TenantEntitlement |
| [`packages/db/prisma/seed.ts`](packages/db/prisma/seed.ts:1490) | Plan, PlanFeature, TenantEntitlement |

---

## 4. Rencana Migrasi

### Phase 0: Persiapan (Sebelum Migrasi)

> **Tujuan:** Pastikan semua orang memahami kondisi saat ini dan agree dengan rencana.

- [ ] **0.1** Backup database production: `pg_dump` sebelum apapun
- [ ] **0.2** Verifikasi tidak ada data production di `SubscriptionPlan` dan `TenantSubscription` (kemungkinan masih kosong karena fitur billing belum production-ready)
- [ ] **0.3** Tim approval — pastikan rencana ini di-review

### Phase 1: Migrasi Data (Jika Ada Data)

> **Tujuan:** Pindahkan data dari model lama ke model baru.

- [ ] **1.1** Buat script migrasi SQL/Prisma yang:
  - Untuk setiap `TenantSubscription` yang aktif:
    - Cari atau buat `Plan` yang sesuai berdasarkan `SubscriptionPlan.slug`
    - Buat `TenantEntitlement` dengan data yang sesuai:
      ```
      tenantId = TenantSubscription.tenantId
      planId = Plan.id (dari mapping slug)
      billingCycle = TenantSubscription.plan.billingPeriod
      status = lowercase(TenantSubscription.status)
      trialEndsAt = TenantSubscription.plan dari Tenant model
      currentPeriodStart = TenantSubscription.startDate
      currentPeriodEnd = TenantSubscription.endDate
      ```
  - Untuk setiap `BillingPayment`:
    - Tambah field `tenantEntitlementId` (nullable) atau gunakan `tenantId` sebagai referensi
    - Relasi ke `TenantSubscription` dianggap legacy — jangan dihapus dulu

- [ ] **1.2** Sync field redundant di `Tenant`:
  - Pastikan `Tenant.subscriptionStatus` = `TenantEntitlement.status` (mapped)
  - Pastikan `Tenant.currentPlanSlug` = `TenantEntitlement.plan.slug`

- [ ] **1.3** Jalankan script di staging terlebih dahulu
- [ ] **1.4** Jalankan script di production

### Phase 2: Update Code References

> **Tujuan:** Ganti semua pengaksesan model lama ke model baru.

#### 2.1 — API Routes yang Harus Diupdate

| # | File | Perubahan |
|---|------|-----------|
| 2.1.1 | [`apps/web/app/api/billing/payments/route.ts`](apps/web/app/api/billing/payments/route.ts:83) | Ganti `prisma.tenantSubscription.findFirst` → `prisma.tenantEntitlement.findUnique` |
| 2.1.2 | [`apps/web/app/api/billing/payments/route.ts`](apps/web/app/api/billing/payments/route.ts:115) | Ganti `prisma.tenantSubscription.update` → `prisma.tenantEntitlement.update` |
| 2.1.3 | [`apps/web/app/api/billing/payments/midtrans/route.ts`](apps/web/app/api/billing/payments/midtrans/route.ts:42) | Ganti `prisma.tenantSubscription.findFirst` → `prisma.tenantEntitlement.findUnique` |
| 2.1.4 | [`apps/web/app/api/billing/payments/midtrans/route.ts`](apps/web/app/api/billing/payments/midtrans/route.ts:108) | Ganti `prisma.tenantSubscription.update` → `prisma.tenantEntitlement.update` |
| 2.1.5 | [`apps/web/app/api/billing/payments/midtrans/callback/route.ts`](apps/web/app/api/billing/payments/midtrans/callback/route.ts:114) | Ganti `prisma.tenantSubscription.update` → `prisma.tenantEntitlement.update` + `prisma.tenantEntitlement.upsert` |
| 2.1.6 | [`apps/web/app/api/billing/admin/payments/[id]/verify/route.ts`](apps/web/app/api/billing/admin/payments/[id]/verify/route.ts:74) | Ganti `prisma.tenantSubscription.update` → `prisma.tenantEntitlement.update` + sync Tenant fields |
| 2.1.7 | [`apps/web/app/api/billing/webhook/route.ts`](apps/web/app/api/billing/webhook/route.ts:153) | **HAPUS bridge code** — tidak perlu lagi copy SubscriptionPlan → Plan |
| 2.1.8 | [`apps/web/app/api/platform/billing/route.ts`](apps/web/app/api/platform/billing/route.ts:30) | Ganti MRR calculation: `TenantEntitlement` + `Plan.priceMonthly` |
| 2.1.9 | [`apps/web/app/api/platform/billing/route.ts`](apps/web/app/api/platform/billing/route.ts:98) | Ganti plan distribution: `TenantEntitlement.groupBy` |
| 2.1.10 | [`apps/web/app/api/platform/tenants/route.ts`](apps/web/app/api/platform/tenants/route.ts:137) | Ganti: buat `TenantEntitlement` langsung (bukan `TenantSubscription`) |

#### 2.2 — Frontend yang Harus Diupdate

| # | File | Perubahan |
|---|------|-----------|
| 2.2.1 | [`apps/web/app/dashboard/settings/billing/page.tsx`](apps/web/app/dashboard/settings/billing/page.tsx:78) | Update interface `TenantSubscription` → `TenantEntitlement` |
| 2.2.2 | [`apps/web/app/platform/tenants/[id]/page.tsx`](apps/web/app/platform/tenants/[id]/page.tsx:39) | Update interface `TenantSubscription` → `TenantEntitlement` |

#### 2.3 — Validation Schemas

| # | File | Perubahan |
|---|------|-----------|
| 2.3.1 | [`apps/web/lib/validation-schemas.ts`](apps/web/lib/validation-schemas.ts:614) | Update `createBillingPaymentSchema` — ganti `subscriptionId` ke `tenantEntitlementId` atau buat field baru |

#### 2.4 — Types Package

| # | File | Perubahan |
|---|------|-----------|
| 2.4.1 | [`packages/types/src/index.ts`](packages/types/src/index.ts:730) | **Hapus** interface `SubscriptionPlan` dan `TenantSubscription` |
| 2.4.2 | [`packages/types/src/index.ts`](packages/types/src/index.ts:757) | **Update** interface `BillingPayment` — ganti `subscriptionId` |

#### 2.5 — Seed Data

| # | File | Perubahan |
|---|------|-----------|
| 2.5.1 | [`packages/db/prisma/seed.ts`](packages/db/prisma/seed.ts:1144) | **Hapus** section legacy subscription seeding |
| 2.5.2 | [`packages/db/prisma/seed.ts`](packages/db/prisma/seed.ts:1165) | **Hapus** section billing payments seeding (atau buat baru dengan model yang benar) |

#### 2.6 — E2E Tests

| # | File | Perubahan |
|---|------|-----------|
| 2.6.1 | [`apps/web/__tests__/e2e-test.ts`](apps/web/__tests__/e2e-test.ts:703) | Ganti `subscriptionPlan.findMany` → `plan.findMany` |
| 2.6.2 | [`apps/web/__tests__/e2e-test.ts`](apps/web/__tests__/e2e-test.ts:714) | Ganti `tenantSubscription.findFirst` → `tenantEntitlement.findUnique` |

### Phase 3: Migrasi BillingPayment

> **Tujuan:** Putuskan nasib BillingPayment.

#### Opsi yang Direkomendasikan: Pertahankan BillingPayment

[`BillingPayment`](packages/db/prisma/schema.prisma:851) sudah terintegrasi dengan:
- Midtrans payment flow
- Manual transfer verification
- Admin payment verification

**Perubahan yang diperlukan:**

1. Buat Prisma migration untuk:
   - Rename `subscriptionId` → nullable (backward compat)
   - Tambah field `tenantEntitlementId` String? (nullable)
   - Tambah relasi baru ke `TenantEntitlement`
   - Pertahankan relasi lama ke `TenantSubscription` sementara (nullable, untuk data lama)

2. Update semua code yang akses `payment.subscription` → `payment.entitlement`

### Phase 4: Bersihkan Model Lama dari Schema

> **Tujuan:** Hapus model yang tidak diperlukan.

- [ ] **4.1** Hapus model `SubscriptionPlan` dari [`schema.prisma`](packages/db/prisma/schema.prisma:811)
- [ ] **4.2** Hapus model `TenantSubscription` dari [`schema.prisma`](packages/db/prisma/schema.prisma:830)
- [ ] **4.3** Buat Prisma migration: `npx prisma migrate dev --name remove-legacy-billing-models`
- [ ] **4.4** Regenerate Prisma client: `npx prisma generate`

### Phase 5: Evaluasi Tenant Fields

> **Tujuan:** Putuskan nasib field redundant di Tenant model.

**Opsi yang Direkomendasikan: PERTAHANKAN sementara**

Field [`Tenant.subscriptionStatus`](packages/db/prisma/schema.prisma:32), [`Tenant.trialEndsAt`](packages/db/prisma/schema.prisma:33), dan [`Tenant.currentPlanSlug`](packages/db/prisma/schema.prisma:34) masih berguna karena:
- Middleware bisa langsung cek `tenant.subscriptionStatus` tanpa query entitlement
- Beberapa halaman UI menampilkan status langsung dari Tenant model
- Performance:避免 setiap request harus join ke TenantEntitlement

**Rencana jangka panjang:**
- Setelah semua code sudah menggunakan `TenantEntitlement`, baru pertimbangkan untuk menghapus field redundant ini
- Tambahkan computed field atau view jika diperlukan

### Phase 6: Testing dan Verifikasi

- [ ] **6.1** Jalankan `npx tsc --noEmit` — pastikan tidak ada TypeScript errors
- [ ] **6.2** Jalankan E2E tests: `cd apps/web && npx tsx __tests__/e2e-test.ts`
- [ ] **6.3** Test flow billing manual transfer (create → verify → activate)
- [ ] **6.4** Test flow Midtrans (create → callback → activate)
- [ ] **6.5** Test webhook flow (simulate payment confirmation)
- [ ] **6.6** Test platform billing dashboard (MRR, ARR, plan distribution)
- [ ] **6.7** Test billing settings page (plan listing, current plan, upgrade/downgrade)
- [ ] **6.8** Test tenant creation flow (dengan dan tanpa plan)
- [ ] **6.9** Test entitlement engine (hasFeature, checkLimit, trackUsage)
- [ ] **6.10** Regression test semua module lain

### Phase 7: Deployment

- [ ] **7.1** Push code ke branch `feature/migrate-billing-models`
- [ ] **7.2** Deploy ke staging environment
- [ ] **7.3** Verifikasi semua test pass di staging
- [ ] **7.4** Jalankan Prisma migration di production: `cd packages/db && npx prisma migrate deploy`
- [ ] **7.5** Deploy code ke production
- [ ] **7.6** Monitor error logs selama 24 jam
- [ ] **7.7** Update documentation ([`CURRENT.md`](CURRENT.md), [`FEATURES.md`](FEATURES.md))

---

## 5. Risiko dan Mitigasi

### Risiko Tinggi

| # | Risiko | Impact | Mitigasi |
|---|--------|--------|----------|
| R1 | Data production hilang saat migrasi | 🔴 Critical | Backup database SEBELUM migrasi. Jalankan migration script di staging dulu. Gunakan transaction wrap untuk SQL migration. |
| R2 | Billing flow terhenti setelah deploy | 🔴 High | Deploy saat low-traffic. Pastikan semua flow billing (manual + Midtrans) ter-test. Siapkan tim on-call. |
| R3 | Relasi BillingPayment → TenantSubscription broken | 🔴 High | Pertahankan relasi lama sebagai nullable. Migrasi data BillingPayment secara bertahap. |

### Risiko Sedang

| # | Risiko | Impact | Mitigasi |
|---|--------|--------|----------|
| R4 | Status format berubah (UPPER → lower) | 🟠 Medium | Mapping yang jelas: TRIAL→trial, ACTIVE→active, dll. Test semua status transitions. |
| R5 | Field maxProducts dihapus tanpa replacement | 🟠 Medium | Fitur limit produk sudah dihandle oleh PlanFeature (inventory.products feature key). |
| R6 | Tenant subscriptionStatus sync error | 🟠 Medium | Setelah setiap perubahan TenantEntitlement, sync ke Tenant.subscriptionStatus. |

### Risiko Rendah

| # | Risiko | Impact | Mitigasi |
|---|--------|--------|----------|
| R7 | Cache entitlement stale | 🟡 Low | invalidateEntitlementCache() sudah dipanggil di semua tempat yang tepat. |
| R8 | Seed data tidak konsisten | 🟡 Low | Update seed script di Phase 2.5. |

---

## 6. Rollback Plan

### Jika Migrasi Gagal (Sebelum Deploy Code)

1. **Matikan semua pending changes**
2. **Restore database dari backup** jika sudah jalankan SQL migration
3. **Kembalikan code ke branch sebelumnya**

### Jika Migrasi Gagal (Setelah Deploy Code)

#### Rollback Cepat (Tanpa Database Rollback)

Jika model lama masih ada di schema (deploy code baru TANPA hapus model lama):

1. **Revert code deployment** ke versi sebelumnya
2. Model lama masih ada di database → tidak ada data loss
3. Semua flow billing kembali normal

#### Rollback Lengkap (Dengan Database Rollback)

1. Revert code deployment
2. Restore database dari backup
3. Verifikasi data integrity

### Kapan Rollback Diperlukan

- Error rate billing meningkat > 5%
- Pembayaran tidak terproses
- Subscription tidak ter-activate setelah pembayaran
- Tenant entitlement tidak sync dengan Tenant status

---

## 7. Checklist Eksekusi

### Pre-Migration

- [ ] Database backup completed
- [ ] Tim approval received
- [ ] Staging environment ready
- [ ] Migration script reviewed

### During Migration

- [ ] Phase 0: Persiapan ✅
- [ ] Phase 1: Data migration ✅
- [ ] Phase 2: Code updates ✅
- [ ] Phase 3: BillingPayment migration ✅
- [ ] Phase 4: Schema cleanup ✅
- [ ] Phase 5: Tenant fields evaluation ✅
- [ ] Phase 6: Testing ✅
- [ ] Phase 7: Deployment ✅

### Post-Migration

- [ ] All tests passing
- [ ] Billing flow verified (manual + Midtrans)
- [ ] Platform dashboard working
- [ ] No TypeScript errors
- [ ] Documentation updated
- [ ] Monitoring active for 24 hours

---

## Catatan Tambahan

### Kapan Migrasi Ini Harus Dilakukan?

Migrasi ini **harus dilakukan** karena:
1. Dual model billing menciptakan confusion dan potensi inkonsistensi
2. Bridge code di webhook handler menunjukkan technical debt
3. Semua code baru sudah menggunakan model baru — model lama hanya tinggal sisa

### Estimasi Kompleksitas

- **Phase 0-1:** Low — backup + script migrasi data
- **Phase 2:** Medium — update ~15 file code references
- **Phase 3:** Medium — migrasi BillingPayment relasi
- **Phase 4:** Low — hapus model dari schema
- **Phase 5:** Low — tunda penghapusan Tenant fields
- **Phase 6:** Medium — comprehensive testing
- **Phase 7:** Low — deployment

### Dependency

- Tidak ada dependency ke task lain
- Bisa dilakukan setelah Phase 4 audit selesai
- Sebaiknya dilakukan SEBELUH fitur billing baru ditambahkan

---

**Document Version:** 1.0  
**Last Updated:** 8 September 2026  
**Next Review:** Setelah approval dari tim
