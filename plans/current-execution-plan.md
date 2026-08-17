# 🏗️ Rencana Eksekusi Qalcuity — Agustus 2026

> **Tanggal:** 17 Agustus 2026
> **Status:** Siap Eksekusi
> **Constraint:** PRODUCTION — Incremental updates, maksimal 10 file per tahap

---

## 📊 Ringkasan Kondisi Proyek

### Tech Stack
| Komponen | Teknologi | Versi |
|----------|-----------|-------|
| **Monorepo** | PNPM Workspaces + Turborepo | pnpm 9, turbo 2 |
| **Web App** | Next.js (App Router) | 14.2 |
| **Mobile App** | Expo (React Native) | 50 |
| **Database** | Prisma + SQLite (dev) / PostgreSQL (prod) | Prisma 5.15 |
| **Auth** | NextAuth.js v4 (JWT strategy) | 4.24 |
| **Styling** | Tailwind CSS | 3.4 |
| **Language** | TypeScript | 5.5 |

### Arsitektur Monorepo
```
qalcuity-allinone/
├── apps/
│   ├── web/          → Next.js 14 (Web App — core utama)
│   └── mobile/       → Expo React Native (Mobile App)
├── packages/
│   ├── db/           → Prisma schema + seed
│   ├── types/        → Shared TypeScript types
│   └── utils/        → Shared utility functions
├── deploy.sh         → Initial deployment script
├── update.sh         → Production update script
└── turbo.json        → Turborepo config
```

### Database Models (21 models)
Tenant, User, Contact, Invoice, InvoiceItem, Payment, PurchaseOrder, PurchaseOrderItem, Quotation, QuotationItem, Lead, Deal, Category, Supplier, Product, StockMovement, Employee, AttendanceRecord, LeaveRequest, PayrollRecord, AuditLog

### Status Fitur MVP
| Modul | Status | Catatan |
|-------|--------|---------|
| Auth & Multi-tenant | ✅ Done | NextAuth + JWT + tenant isolation |
| Dashboard | ✅ Done | Stats connected to real DB |
| Audit Trail | ✅ Done | Connected to AuditLog model |
| Dark Mode | ✅ Done | Tailwind class strategy |
| Global Search | ✅ Done | Ctrl+K, cross-module |
| Finance (Invoice) | ✅ Done | CRUD + form + list |
| Finance (Quotation) | ✅ Done | CRUD + form |
| Finance (Payment) | ✅ Done | CRUD |
| Finance (Purchase Order) | ✅ Done | CRUD + form |
| CRM (Leads) | ✅ Done | CRUD |
| CRM (Contacts) | ✅ Done | CRUD |
| CRM (Deals) | ✅ Done | CRUD |
| CRM (Pipeline) | ✅ Done | Kanban board |
| Settings Profile | ✅ Done | Connected to API |
| HR (Basic UI) | 🔶 Partial | Pages exist, needs polish |
| Inventory (Basic UI) | 🔶 Partial | Pages exist, needs polish |
| Mobile App | 🔶 Partial | Basic screens, needs polish |

---

## 🔴 TEMUAN KRITIS YANG PERLU DIPERBAIKI

### Bug Kritis

#### 1. `Float` untuk Monetery Values (KRUSIAL)
**File:** [`schema.prisma`](packages/db/prisma/schema.prisma)
**Masalah:** Field `subtotal`, `taxAmount`, `total`, `amount`, `unitPrice`, `price`, `cost`, `salary`, `netSalary` menggunakan tipe `Float`. Float menyebabkan precision loss pada perhitungan uang (contoh: 0.1 + 0.2 ≠ 0.3).
**Solusi:** Gunakan `Decimal @default(0)` atau minimal `Int` (dalam sen/Rupiah terkecil). Untuk SQLite, gunakan String dengan konversi.
**Impact:** Bisa menyebabkan selisih pembulatan pada invoice/pembayaran.

#### 2. Contact Model — Field `company` Tidak Ada
**File:** [`schema.prisma`](packages/db/prisma/schema.prisma:74) vs [`search/route.ts`](apps/web/app/api/search/route.ts:65)
**Masalah:** API search query `contact.company` tapi model Contact tidak punya field `company`. Ini akan error di production.
**Solusi:** Buat migration baru untuk menambahkan field `company` ke model Contact.

#### 3. Sidebar Menggunakan Emoji sebagai Icon
**File:** [`sidebar.tsx`](apps/web/components/layout/sidebar.tsx:12)
**Masalah:** Semua menu menggunakan emoji (📊, 💰, 📈, dll) sebagai icon. Ini tidak professional dan tidak konsisten.
**Solusi:** Ganti dengan icon library (Lucide React — sudah di-configure di `next.config.js`).

#### 4. Tidak Ada Sistem i18n/Lokalisasi
**Masalah:** Tidak ada sistem terjemahan. String UI hardcoded dalam campuran Bahasa Indonesia dan English.
**Solusi:** Implementasi i18n system atau minimal konsisten Bahasa Indonesia.

### Bug Sedang

#### 5. `classNames` Utility Duplikat & Tidak Terpakai
**File:** [`utils.ts`](apps/web/lib/utils.ts:67)
**Masalah:** Fungsi `classNames` ada tapi tidak digunakan. `cn` dari clsx+twMerge sudah mencakup.

#### 6. Contact Model Tidak punya Field `company`
**Masalah:** Search route mengakses `contact.company` yang tidak ada di schema.

#### 7. Settings Pages Lainnya (Billing, Company, Team, dll)
**File:** [`settings/billing/page.tsx`](apps/web/app/dashboard/settings/billing/page.tsx), dll
**Masalah:** Halaman-halaman settings lainnya mungkin masih kosong/stub.

---

## 📋 RENCANA EKSEKUSI BERTAHAP

### FASE 0: Schema Safety & Foundation Fixes

#### Tahap 0.1: Safe Migration — Tambah Field yang Dibutuhkan (Maks 5 file)
- [ ] Buat migration file baru: `prisma/migrations/xxx_add_contact_company_and_soft_deletes.sql`
- [ ] Tambah field `company String?` ke model Contact
- [ ] Tambah field `deletedAt DateTime?` ke model Tenant, User, Contact, Product, Employee (soft deletes)
- [ ] Update `packages/db/prisma/schema.prisma` sesuai migration
- [ ] Update `packages/db/prisma/seed.ts` — gunakan `updateOrCreate`/`firstOrCreate` untuk safety

#### Tahap 0.2: Fix Contact Search Bug (Maks 3 file)
- [ ] Update [`search/route.ts`](apps/web/app/api/search/route.ts) — fix `contact.company` reference
- [ ] Update [`search/route.ts`](apps/web/app/api/search/route.ts) — tambah `include: { company: true }` jika perlu
- [ ] Test search endpoint

### FASE 1: Icon System & Clean Code (Maks 10 file per tahap)

#### Tahap 1.1: Ganti Emoji ke Lucide Icons — Sidebar & Header (Maks 5 file)
- [ ] Update [`sidebar.tsx`](apps/web/components/layout/sidebar.tsx) — ganti semua emoji dengan Lucide icons
- [ ] Update [`header.tsx`](apps/web/components/layout/header.tsx) — ganti emoji icons dengan Lucide
- [ ] Update [`dashboard/page.tsx`](apps/web/app/dashboard/page.tsx) — ganti emoji icons
- [ ] Update [`search-modal.tsx`](apps/web/components/ui/search-modal.tsx) — ganti emoji type icons
- [ ] Pastikan `lucide-react` terinstall di `apps/web/package.json`

#### Tahap 1.2: Clean Code — Hapus Duplikasi & Unused (Maks 5 file)
- [ ] Hapus fungsi `classNames` dari [`utils.ts`](apps/web/lib/utils.ts)
- [ ] Pastikan semua import `getInitials` dari `@/lib/utils` (bukan inline)
- [ ] Review dan bersihkan import yang tidak terpakai di semua file
- [ ] Konsistenkan path alias `@/` di semua import
- [ ] Review `packages/utils/src/index.ts` — pastikan konsisten dengan `apps/web/lib/utils.ts`

### FASE 2: Koneksi Data & API Integrity (Maks 10 file per tahap)

#### Tahap 2.1: Fix API Routes & Data Flow (Maks 10 file)
- [ ] Review semua API route — pastikan `requireAuth()` dipanggil di semua endpoint
- [ ] Review [`deals/route.ts`](apps/web/app/api/crm/deals/route.ts) — pastikan field mapping benar
- [ ] Review [`invoices/route.ts`](apps/web/app/api/finance/invoices/route.ts) — pastikan POST menggunakan DB transaction
- [ ] Review [`quotations/route.ts`](apps/web/app/api/finance/quotations/route.ts)
- [ ] Review [`purchase-orders/route.ts`](apps/web/app/api/finance/purchase-orders/route.ts)
- [ ] Review [`payments/route.ts`](apps/web/app/api/finance/payments/route.ts)
- [ ] Review [`contacts/route.ts`](apps/web/app/api/crm/contacts/route.ts)
- [ ] Review [`leads/route.ts`](apps/web/app/api/crm/leads/route.ts)
- [ ] Review [`products/route.ts`](apps/web/app/api/inventory/products/route.ts)
- [ ] Review [`employees/route.ts`](apps/web/app/api/hr/employees/route.ts)

#### Tahap 2.2: Audit Trail Integration (Maks 5 file)
- [ ] Pastikan semua API POST/PUT/DELETE membuat AuditLog entry
- [ ] Buat helper function `createAuditLog()` di `lib/audit.ts`
- [ ] Integrasikan ke semua mutation endpoints
- [ ] Update [`audit/page.tsx`](apps/web/app/dashboard/audit/page.tsx) — pastikan data real
- [ ] Update [`audit/logs/route.ts`](apps/web/app/api/audit/logs/route.ts) — pastikan filtering berfungsi

### FASE 3: i18n & Lokalisasi (Maks 10 file per tahap)

#### Tahap 3.1: Setup i18n Foundation (Maks 5 file)
- [ ] Buat `apps/web/lib/i18n.ts` — simple i18n helper atau gunakan `next-intl`
- [ ] Buat `apps/web/messages/id.json` — terjemahan Bahasa Indonesia
- [ ] Buat `apps/web/messages/en.json` — terjemahan English
- [ ] Update `next.config.js` — konfigurasi i18n jika perlu
- [ ] Update `apps/web/app/layout.tsx` — wrap dengan i18n provider

#### Tahap 3.2: Lokalisasi UI Strings (Maks 10 file)
- [ ] Lokalisasi sidebar menu labels
- [ ] Lokalisasi header strings
- [ ] Lokalisasi dashboard strings
- [ ] Lokalisasi login/register strings
- [ ] Lokalisasi settings strings
- [ ] Lokalisasi finance module strings
- [ ] Lokalisasi CRM module strings
- [ ] Lokalisasi HR module strings
- [ ] Lokalisasi inventory module strings
- [ ] Lokalisasi error messages & empty states

### FASE 4: Module Completion — Ringan (Maks 10 file per tahap)

#### Tahap 4.1: Settings Pages — Company, Team, Notifications (Maks 5 file)
- [ ] Complete [`settings/company/page.tsx`](apps/web/app/dashboard/settings/company/page.tsx) — company profile form
- [ ] Complete [`settings/team/page.tsx`](apps/web/app/dashboard/settings/team/page.tsx) — team member list
- [ ] Complete [`settings/notifications/page.tsx`](apps/web/app/dashboard/settings/notifications/page.tsx) — notification preferences
- [ ] Complete [`settings/security/page.tsx`](apps/web/app/dashboard/settings/security/page.tsx) — password change, 2FA placeholder
- [ ] Complete [`settings/billing/page.tsx`](apps/web/app/dashboard/settings/billing/page.tsx) — subscription info (placeholder)

#### Tahap 4.2: Settings API Routes (Maks 5 file)
- [ ] Update [`settings/profile/route.ts`](apps/web/app/api/settings/profile/route.ts) — pastikan GET/PUT berfungsi
- [ ] Buat [`settings/company/route.ts`](apps/web/app/api/settings/company/route.ts) — GET/PUT company data
- [ ] Buat [`settings/team/route.ts`](apps/web/app/api/settings/team/route.ts) — GET team members
- [ ] Buat [`settings/notifications/route.ts`](apps/web/app/api/settings/notifications/route.ts) — GET/PUT preferences
- [ ] Buat [`settings/security/route.ts`](apps/web/app/api/settings/security/route.ts) — PUT password change

### FASE 5: Module Completion — HR & Inventory (Maks 10 file per tahap)

#### Tahap 5.1: HR Module — Backend & UI Polish (Maks 10 file)
- [ ] Review [`hr/employees/page.tsx`](apps/web/app/dashboard/hr/employees/page.tsx) — pastikan list view berfungsi
- [ ] Review [`hr/employees/[id]/page.tsx`](apps/web/app/api/hr/employees/[id]/route.ts) — detail view
- [ ] Review [`hr/attendance/page.tsx`](apps/web/app/dashboard/hr/attendance/page.tsx)
- [ ] Review [`hr/leaves/page.tsx`](apps/web/app/dashboard/hr/leaves/page.tsx)
- [ ] Review [`hr/payroll/page.tsx`](apps/web/app/dashboard/hr/payroll/page.tsx)
- [ ] Pastikan semua HR API routes berfungsi dengan benar
- [ ] Tambahkan loading states & empty states
- [ ] Fix responsive tables
- [ ] Tambahkan form validation
- [ ] Pastikan error handling yang proper

#### Tahap 5.2: Inventory Module — Backend & UI Polish (Maks 10 file)
- [ ] Review [`inventory/products/page.tsx`](apps/web/app/dashboard/inventory/products/page.tsx)
- [ ] Review [`inventory/products/[id]/page.tsx`](apps/web/app/dashboard/inventory/products/[id]/page.tsx)
- [ ] Review [`inventory/stock/page.tsx`](apps/web/app/dashboard/inventory/stock/page.tsx)
- [ ] Review [`inventory/categories/page.tsx`](apps/web/app/dashboard/inventory/categories/page.tsx)
- [ ] Review [`inventory/suppliers/page.tsx`](apps/web/app/dashboard/inventory/suppliers/page.tsx)
- [ ] Pastikan semua Inventory API routes berfungsi
- [ ] Tambahkan stock movement tracking
- [ ] Tambahkan low stock alerts
- [ ] Fix responsive tables
- [ ] Pastikan error handling yang proper

### FASE 6: Finance Module Enhancement (Maks 10 file per tahap)

#### Tahap 6.1: Finance Forms & Detail Pages (Maks 10 file)
- [ ] Review [`invoice-form.tsx`](apps/web/components/finance/invoice-form.tsx) — pastikan validasi lengkap
- [ ] Review [`quotation-form.tsx`](apps/web/components/finance/quotation-form.tsx) — pastikan validasi
- [ ] Review [`purchase-order-form.tsx`](apps/web/components/finance/purchase-order-form.tsx) — pastikan validasi
- [ ] Review invoice detail page — pastikan data lengkap
- [ ] Review quotation detail page
- [ ] Review payment detail page
- [ ] Review purchase order detail page
- [ ] Tambahkan DB transaction untuk semua mutation
- [ ] Tambahkan audit trail logging
- [ ] Pastikan format currency konsisten (Rp)

### FASE 7: Responsive & Mobile UX (Maks 10 file per tahap)

#### Tahap 7.1: Responsive Tables & Layout (Maks 10 file)
- [ ] Buat komponen reusable `ResponsiveTable` — card view di mobile
- [ ] Fix tabel di semua halaman finance (invoices, quotations, payments, PO)
- [ ] Fix tabel di CRM (contacts, leads, deals)
- [ ] Fix tabel di HR (employees, attendance, leaves, payroll)
- [ ] Fix tabel di Inventory (products, stock, categories, suppliers)
- [ ] Pastikan sidebar collapsible di mobile dengan baik
- [ ] Pastikan touch targets ≥ 44x44px di mobile
- [ ] Fix horizontal overflow di mobile
- [ ] Tambahkan bottom navigation untuk mobile (opsional)
- [ ] Test di breakpoint 375px, 768px, 1024px

### FASE 8: Deployment & Documentation Sync (Maks 5 file per tahap)

#### Tahap 8.1: Deploy Scripts Update (Maks 3 file)
- [ ] Update [`deploy.sh`](deploy.sh) — tambah step untuk i18n setup jika perlu
- [ ] Update [`update.sh`](update.sh) — tambah step untuk i18n build jika perlu
- [ ] Update [`deploy.md`](deploy.md) — dokumentasi lengkap

#### Tahap 8.2: Documentation Update (Maks 3 file)
- [ ] Update [`FEATURES.md`](FEATURES.md) — tandai fitur yang sudah implemented
- [ ] Update [`ROADMAP.md`](ROADMAP.md) — update progress MVP
- [ ] Update [`AGENT.md`](AGENT.md) — update jika ada perubahan arsitektur

### FASE 9: Testing & Build Validation (Maks 5 file per tahap)

#### Tahap 9.1: Build Sanity Check
- [ ] Jalankan `pnpm install` — pastikan dependency resolve
- [ ] Jalankan `pnpm db:generate` — pastikan Prisma client generate
- [ ] Jalankan `pnpm build` — pastikan build tanpa error
- [ ] Jalankan `pnpm lint` — pastikan tidak ada lint error
- [ ] Fix semua TypeScript errors

#### Tahap 9.2: Manual Testing
- [ ] Test login/logout flow
- [ ] Test dashboard stats loading
- [ ] Test semua CRUD operations (Invoice, Deal, Lead, Contact, Product, Employee)
- [ ] Test search functionality
- [ ] Test dark mode toggle
- [ ] Test responsive layout di mobile
- [ ] Test error states (empty data, network error)

---

## ⚠️ CONSTRAINT: Production Safety

- ❌ **TIDAK BOLEH** menghapus/mengubah migration yang sudah jalan di production
- ❌ **TIDAK BOLEH** batch update > 10 file sekaligus
- ❌ **TIDAK BOLEH** hardcode credentials
- ❌ **TIDAK BOLEH** menggunakan `// ... rest of code ...` (truncated code)
- ✅ **WAJIB** buat migration baru untuk perubahan schema
- ✅ **WAJIB** gunakan DB transaction untuk multi-table operations
- ✅ **WAJIB** gunakan `requireAuth()` di semua API route
- ✅ **WAJIB** konsisten Bahasa Indonesia di UI
- ✅ **WAJIB** update deploy.sh & update.sh setiap ada perubahan build process
- ✅ **WAJIB** update dokumentasi setiap ada perubahan fitur
