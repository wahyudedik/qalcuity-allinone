# 🏗️ Qalcuity Production Improvement Plan

> **Tanggal:** 6 Agustus 2026
> **Status:** Draft — Menunggu Review & Persetujuan
> **Constraint:** PRODUCTION — Tidak ada perubahan database schema (Prisma migration)

---

## 📋 Ringkasan Analisis

Setelah melakukan review menyeluruh terhadap seluruh kode sumber proyek, ditemukan **29 item** yang perlu diperbaiki/dikembangkan, dikategorikan menjadi 6 fase berdasarkan prioritas.

### Temuan Utama

| Kategori | Jumlah Temuan | Prioritas |
|----------|---------------|-----------|
| Bug Kritis | 3 | 🔴 Tinggi |
| Clean Code | 4 | 🟠 Sedang |
| Data Connection | 4 | 🟠 Sedang |
| Fitur Baru | 8 | 🟡 Normal |
| Responsive/Mobile | 4 | 🟡 Normal |
| Dokumentasi | 3 | 🟢 Rendah |

---

## 🔴 FASE 1: Bug Fix Kritis — Pipeline Page

### Bug 1.1: Stage Name Mismatch

**File:** [`pipeline/page.tsx`](apps/web/app/dashboard/crm/pipeline/page.tsx:26) vs [`deals/route.ts`](apps/web/app/api/crm/deals/route.ts:46)

**Masalah:**
- Pipeline page menggunakan stage config: `Discovery`, `Proposal`, `Negosiasi`, `Closing`
- Database menyimpan: `DISCOVERY`, `PROPOSAL`, `NEGOTIATION`, `CLOSING`, `CLOSED_WON`, `CLOSED_LOST`
- API mengkonversi: `NEGOTIATION` → `Negotiation` (bukan `Negosiasi`)
- Filter `d.stage === config.id` tidak akan match → pipeline board kosong

**Solusi:**
- Uniformkan stage ID di pipeline config menjadi: `DISCOVERY`, `PROPOSAL`, `NEGOTIATION`, `CLOSING`
- Atau buat mapping layer di pipeline page
- Tambahkan stage `CLOSED_WON` dan `CLOSED_LOST` sebagai kolom tambahan atau sebagai filter

### Bug 1.2: Field Name Mismatch

**File:** [`pipeline/page.tsx`](apps/web/app/dashboard/crm/pipeline/page.tsx:6) vs API response

**Masalah:**
- Pipeline type expects `name` → API returns `title`
- Pipeline type expects `expectedCloseDate` → API returns `closeDate`
- Pipeline type expects `company` → API returns `leadCompany`/`contactName`
- Pipeline type expects `assignedTo` → API tidak mengembalikan ini

**Solusi:**
- Update type `Deal` di pipeline page agar sesuai dengan API response
- Mapping field di `fetchDeals` handler

### Bug 1.3: Tidak Ada Stage CLOSED_WON/CLOSED_LOST

**File:** [`pipeline/page.tsx`](apps/web/app/dashboard/crm/pipeline/page.tsx:26)

**Masalah:**
- Database mendukung 6 stage tapi pipeline hanya menampilkan 4
- Deal yang sudah CLOSED_WON atau CLOSED_LOST tidak terlihat

**Solusi:**
- Tambahkan kolom "Won" dan "Lost" di pipeline board
- Atau tampilkan sebagai badge/counter di bagian atas

---

## 🟠 FASE 2: Clean Code & Best Practices

### Item 2.1: `<a>` → Next.js `Link`

**File:** [`page.tsx`](apps/web/app/dashboard/page.tsx:290)

**Masalah:** Komponen `QuickAction` menggunakan tag `<a>` HTML biasa, menyebabkan full page reload.

**Solusi:** Ganti dengan `import Link from 'next/link'` dan gunakan `<Link href={href}>`.

### Item 2.2: Hapus `classNames` Utility

**File:** [`utils.ts`](apps/web/lib/utils.ts:66)

**Masalah:** Fungsi `classNames` sudah ada tapi tidak digunakan di manapun. Fungsi `cn` sudah mencakup functionality yang sama dengan lebih baik (clsx + twMerge).

**Solusi:** Hapus fungsi `classNames` dari `utils.ts`.

### Item 2.3: Hapus Duplikasi `getInitials`

**File:** [`header.tsx`](apps/web/components/layout/header.tsx:17), [`sidebar.tsx`](apps/web/components/layout/sidebar.tsx:91), [`utils.ts`](apps/web/lib/utils.ts:57)

**Masalah:** `getInitials` didefinisikan 3 kali — di utils, header, dan sidebar.

**Solusi:**
- Hapus definisi di `header.tsx` dan `sidebar.tsx`
- Import dari `@/lib/utils` di kedua komponen

### Item 2.4: Konsistensi Import Pattern

**Masalah:** Beberapa file menggunakan path alias `@/` secara tidak konsisten.

**Solusi:** Pastikan semua import menggunakan `@/` prefix secara konsisten.

---

## 🟠 FASE 3: Koneksi Data Nyata

### Item 3.1: Dashboard Stats → Database

**File:** [`stats/route.ts`](apps/web/app/api/dashboard/stats/route.ts:3)

**Masalah:** Seluruh data dashboard adalah mock/hardcoded.

**Solusi:**
- Query `Invoice` untuk total revenue (sum status PAID)
- Query `Deal` untuk total deals dan pipeline value
- Query `Contact` untuk total customers
- Query `Product` untuk total products
- Query `AuditLog` untuk recent activities (5 terbaru)
- Generate alerts dari data real (stock low, invoice overdue, dll)

**Note:** Tetap pertahankan fallback ke mock data jika DB kosong (untuk demo/dev).

### Item 3.2: Audit Page → AuditLog Model

**File:** [`audit/page.tsx`](apps/web/app/dashboard/audit/page.tsx:5)

**Masalah:** Audit logs adalah hardcoded array statis.

**Solusi:**
- Buat API endpoint `/api/audit/logs` yang query `AuditLog` model
- Hubungkan audit page ke API ini
- Implementasi filter (module, action, date range, search) di server-side

### Item 3.3: Settings Profile → User Session

**File:** [`settings/page.tsx`](apps/web/app/dashboard/settings/page.tsx:7)

**Masalah:** Profile menampilkan data hardcoded "Budi Santoso".

**Solusi:**
- Load data dari session (`useSession()`)
- Buat API `/api/settings/profile` untuk GET/PUT user data
- Implementasi save functionality yang nyata

### Item 3.4: Buat API Settings Profile

**File baru:** `apps/web/app/api/settings/profile/route.ts`

**Solusi:**
- GET: Return user data dari session + DB
- PUT: Update user profile (name, email, phone)
- Validasi input

---

## 🟡 FASE 4: Fitur Baru & UI/UX

### Item 4.1: Global Search

**File:** [`header.tsx`](apps/web/components/layout/header.tsx)

**Solusi:**
- Buat search modal/overlay yang muncul saat klik search icon atau tekan `Ctrl+K`
- Search across: Invoices, Deals, Leads, Contacts, Products, Employees
- Tampilkan hasil grouped by module

### Item 4.2: Dark Mode Toggle

**File:** [`globals.css`](apps/web/app/globals.css) sudah support CSS variables

**Solusi:**
- Implementasi `next-themes` atau manual toggle
- Tambahkan toggle button di header atau settings
- Simpan preferensi di localStorage

### Item 4.3: Real Notifications

**File:** [`header.tsx`](apps/web/components/layout/header.tsx)

**Solusi:**
- Buat API `/api/notifications` yang mengembalikan alert real
- Connect notification bell ke API
- Tampilkan badge count untuk unread notifications

### Item 4.4: Contact List Page

**File:** Sidebar sudah punya link ke contacts tapi perlu dicek

**Solusi:**
- Pastikan halaman contacts list ada dan berfungsi
- Buat jika belum ada

### Item 4.5: Deal List Page

**Solusi:**
- Buat halaman `/dashboard/crm/deals` sebagai list view semua deals
- Berbeda dari pipeline (Kanban) — ini tabel dengan sorting/filter

### Item 4.6: Quotation List View

**Solusi:**
- Buat halaman `/dashboard/finance/quotations` sebagai list view
- Sudah ada file `quotations/page.tsx` — perlu dicek isinya

### Item 4.7: Purchase Order List View

**Solusi:**
- Sudah ada file `purchase-orders/page.tsx` — perlu dicek isinya

### Item 4.8: Payment List View

**Solusi:**
- Sudah ada file `payments/page.tsx` — perlu dicek isinya

---

## 🟡 FASE 5: Responsive & Mobile

### Item 5.1: Review Responsive Design

**Solusi:**
- Review semua halaman di breakpoint mobile (375px, 768px, 1024px)
- Perbaiki overflow tabel di mobile
- Pastikan sidebar collapsible dengan baik

### Item 5.2: Mobile Navigation

**Solusi:**
- Tambahkan bottom navigation bar untuk mobile
- Atau improve hamburger menu sidebar

### Item 5.3: Table Responsive

**Solusi:**
- Buat reusable responsive table component
- Di mobile: tampilkan sebagai card list, bukan tabel

### Item 5.4: Mobile App Optimization

**Solusi:**
- Review React Native screens
- Tambahkan missing screens (settings, notifications)

---

## 🟢 FASE 6: Dokumentasi

### Item 6.1: Update FEATURES.md
- Tandai fitur yang sudah implemented
- Update status checkboxes

### Item 6.2: Update ROADMAP.md
- Update milestone progress
- Tandai phase yang sudah selesai

### Item 6.3: Update AGENT.md
- Update jika ada perubahan arsitektur

---

## 📊 Prioritas Eksekusi

```
FASE 1 (Bug Fix) ──→ Harus selesai dulu, blocking fitur
    │
    ▼
FASE 2 (Clean Code) ──→ Quick wins, bisa paralel
    │
    ▼
FASE 3 (Data Connection) ──→ Meningkatkan usability signifikan
    │
    ▼
FASE 4 (Fitur Baru) ──→ Feature additions berdasarkan roadmap
    │
    ▼
FASE 5 (Responsive) ──→ Polish dan mobile optimization
    │
    ▼
FASE 6 (Dokumentasi) ──→ Final step, update semua doc
```

---

## ⚠️ Constraint: Production Safety

- ❌ **TIDAK BOLEH** mengubah `schema.prisma` atau menjalankan `prisma migrate`
- ❌ **TIDAK BOLEH** mengubah struktur tabel yang sudah ada
- ✅ **BOLEH** menambah API endpoint baru
- ✅ **BOLEH** memperbaiki logic di existing API
- ✅ **BOLEH** memperbaiki UI/UX
- ✅ **BOLEH** menambah komponen baru
- ✅ **BOLEH** menggunakan field yang sudah ada di schema tapi belum dipakai
