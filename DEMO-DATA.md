# 📊 Demo Data Guide — Qalcuity All-in-One

> **Status:** ✅ Final (Session 71 — Demo Data Enhancement, 10 Okt 2026)
> **Plan:** [`plans/demo-data-enhancement.md`](plans/demo-data-enhancement.md)
> **Aturan operasi:** setiap fitur baru yang punya data demo WAJIB menambah/modul di
> [`apps/web/lib/seed-data/`](apps/web/lib/seed-data/) (bukan duplikasi di dua loader), menambah unit test, dan (bila perlu) extend verify script.

---

## 1. Dua Jalur Demo Data (dataset IDENTIK)

Qalcuity punya **dua jalur** memuat data demo. Keduanya kini memanggil **modul seed shared yang sama** sehingga menghasilkan dataset **identik**:

| Jalur | Entry point | Trigger | Loader |
|-------|-------------|---------|--------|
| **CLI Seed** | [`packages/db/prisma/seed.ts`](packages/db/prisma/seed.ts) | `npx prisma db seed` (flag `SEED_DEMO=true` untuk data demo) | `seed.ts` → import modul shared |
| **In-App Demo Load** | [`apps/web/lib/seed-data/demo.ts`](apps/web/lib/seed-data/demo.ts) | `POST /api/demo/load` — tombol **"Muat Data Demo"** di halaman Settings, dan onboarding `?demo=true` | [`demo.ts`](apps/web/lib/seed-data/demo.ts) → import modul shared yang sama |

**Modul seed shared** (`apps/web/lib/seed-data/`):

| Modul | Domain | Isi Utama |
|-------|--------|-----------|
| [`finance.ts`](apps/web/lib/seed-data/finance.ts) | Keuangan (P0) | 5 TaxRate, 47 CoA, 28 invoice historis + payment, 7 Bill, 12 Expense, 132 JournalEntry (353 items, semua seimbang), 6 AccountingPeriod |
| [`crm.ts`](apps/web/lib/seed-data/crm.ts) | CRM | 9 Category, 9 Supplier, 23 Contact, 14 Lead, 14 Deal, 25 Activity |
| [`hr.ts`](apps/web/lib/seed-data/hr.ts) | HR | 7 Department, 15 Employee, 90 PayrollRecord, 1.350 Attendance, 16 LeaveRequest |
| [`inventory.ts`](apps/web/lib/seed-data/inventory.ts) | Inventory | 2 Warehouse, 23 Product, 60 StockMovement (invarian stok), 2 StockOpname |

> **Urutan loader KRITIS:** CRM → Inventory → HR → dokumen legacy → **Finance TERAKHIR**
> (`seedFinanceData()` membaca `PayrollRecord` dari DB untuk jurnal payroll).

**Perbedaan kedua jalur:**

| Aspek | CLI Seed | In-App Demo Load |
|-------|----------|------------------|
| Tenant | Membuat tenant `qalcuity-demo` (PT Qalcuity Demo) + SuperAdmin + Plans + Platform Settings | Mengisi data demo ke **tenant aktif** user yang sedang login |
| User demo | Membuat 5 akun demo (Admin/Demo/Member/Viewer/User) | Tidak membuat akun (user sudah ada) |
| Anchor tanggal | Anchor tetap `2026-10-10` | Anchor = tanggal saat tombol ditekan |

---

## 2. Jumlah Record per Model (hasil seed aktual — diverifikasi 10 Okt 2026)

### Core (selalu dibuat, tanpa `SEED_DEMO`)

| Model | Records | Catatan |
|-------|:-------:|---------|
| Tenant | 1 | PT Qalcuity Demo (`qalcuity-demo`) |
| User (SUPERADMIN) | 1 | Platform owner |
| Plan | 5 | Free, Starter, Growth, Business, Enterprise |
| Tenant Entitlement | 1 | Free plan (trial) |
| TaxRate (core) | 3 | PPN 11%, PPh 23 2%, PPh 21 (Bervariasi) |
| Platform Settings | 1 | Default values |

### Demo (butuh `SEED_DEMO=true` / tombol Muat Data Demo)

| Model | Records | Catatan |
|-------|:-------:|---------|
| User (demo) | 5 | Admin, Demo, Member, Viewer, User |
| Category | 9 | Kategori produk & transaksi |
| Contact | 23 | CUSTOMER / SUPPLIER / BOTH |
| Supplier | 9 | Pemasok barang |
| Lead | 14 | Prospek penjualan |
| Deal | 14 | Pipeline CRM |
| Activity | 25 | CALL 6, EMAIL 6, MEETING 5, NOTE 5, TASK 3 — terhubung CONTACT/LEAD/DEAL |
| Department | 7 | Direksi, Keuangan, Penjualan, SDM, Gudang, IT, Operasional |
| Employee | 15 | Semua ter-`departmentId` (Direksi kosong by design) |
| PayrollRecord | 90 | 6 periode (2026-05..10) × 15 karyawan; 60 PAID + 30 PENDING |
| AttendanceRecord | 1.350 | 90 hari kerja weekdays-only × 15 karyawan |
| LeaveRequest | 16 | Mix APPROVED/PENDING/REJECTED, 5 tipe; cuti APPROVED → attendance LEAVE |
| Warehouse | 2 | GUDANG-PUSAT (default) + GUDANG-CABANG |
| Product | 23 | SKU unik per-tenant, 1 produk layanan (SVC-001) |
| StockMovement | 60 | **INVARIAN:** opening + ΣIN + ΣADJ − ΣOUT = `Product.stock` (22 SKU) |
| StockOpname | 2 | 1 COMPLETED (totalDifference −2) + 1 DRAFT, 5 items |
| Invoice | 48 | 20 demo + 28 historis (INV-2026-021..048) |
| Payment | 41 | Pelunasan + partial + overdue |
| JournalEntry | 132 | **Semua seimbang** (353 items); 119 POSTED / 13 DRAFT; riwayat 2026-05..2026-11 |
| Bill | 7 | 3 PAID + 4 APPROVED |
| Expense | 12 | 10 APPROVED + 2 PENDING_APPROVAL |
| TaxRate (finance) | +5 | PPN-KELUARAN 11%, PPN-MASUKAN 11%, PPH23 2%, PPH21, PPH42 3% |
| CoAAccount | 47 | Struktur CoA Indonesia standar (Aktiva, Passiva, Modal, Pendapatan, Beban) |
| AccountingPeriod | 6 | Mei–Agustus 2026 CLOSED (+ closeSummary), September–Oktober 2026 OPEN |
| Quotation | 10 | + items |
| PurchaseOrder | 9 | + items |
| TenantSubscription (legacy) | 1 | Growth plan |
| BillingPayment | 6 | Riwayat pembayaran langganan |
| AuditLog | 14 | Aktivitas user demo |
| BankTransaction | 8 | Mutasi bank demo |

---

## 3. Skenario Bisnis Demo

Data demo menggambarkan **perusahaan distribusi/retail Indonesia** (PT Qalcuity Demo) dengan riwayat operasional **6–7 bulan** (Mei–Oktober 2026, anchor 2026-10-10):

- **Penjualan:** 48 invoice (termasuk 28 historis) dengan 41 payment — mix lunas, partial, dan overdue; revenue bulanan realistis untuk distribusi FMCG/sembako.
- **Pembelian:** 9 purchase order + 7 bill (APPROVED/PAID) + 9 supplier — siklus procure-to-pay lengkap.
- **Keuangan:** 132 jurnal entri (manual, invoice, payment, payroll) dengan riwayat 6 bulan untuk demo laporan keuangan & tren; **4 periode CLOSED** dengan closeSummary (termasuk 1 bulan rugi — Juli 2026 net −32,8 juta, wajar untuk distribusi musiman) + 2 periode OPEN untuk siklus penutupan berjalan.
- **CRM:** 23 kontak, 14 lead, 14 deal di berbagai stage, 25 aktivitas (call/email/meeting/note/task) terhubung entitas — demo pipeline & forecasting.
- **HR:** 15 karyawan di 7 departemen (termasuk Direksi yang diwakili user admin), absensi 3 bulan weekdays-only dengan mix PRESENT/LATE/WFh/ABSENT/LEAVE, payroll 6 periode (periode lama PAID, baru PENDING), 16 cuti dengan 3 status.
- **Inventory:** 23 produk FMCG dengan stok 2 gudang, 60 gerakan stok (opening + IN/OUT/ADJ) yang **konsisten dengan `Product.stock`**, 2 stock opname (1 selesai dengan selisih −2, 1 draft).
- **Perpajakan:** 5 tarif pajak Indonesia (PPN keluaran/masukan, PPh 21/23/42) siap dipakai invoice/bill.

Semua tanggal historis di-**backdate** (`createdAt` diset ke masa lalu) sehingga laporan tren bulanan akurat **kapan pun** seed dijalankan.

---

## 4. Cara Menjalankan + Gotcha cmd.exe

### CLI Seed (full control)

```bash
# 1. (Opsional, DB kotor) Reset database — LIHAT BAGIAN 5
cd packages/db && npx prisma migrate reset --force

# 2. Seed dengan data demo
cd packages/db
set "SEED_DEMO=true" && npx prisma db seed
```

> ⚠️ **GOTCHA cmd.exe (KRITIS):** env var wajib **dikutip** —
> `set "SEED_DEMO=true" && npx prisma db seed`.
> Tanpa kutip, cmd.exe membake nilai `'true '` (ada trailing space) → loader membaca
> falsy → seed berjalan **CORE ONLY** (tanpa data demo) tanpa error apa pun.
> Di bash/zsh cukup `SEED_DEMO=true npx prisma db seed`.

### In-App Demo Load

1. Login ke aplikasi → **Settings** → bagian **Demo Data** → tombol **"Muat Data Demo"**.
2. Atau onboarding flow dengan parameter `?demo=true`.
3. Route: [`POST /api/demo/load`](apps/web/app/api/demo/load/route.ts) — data terisi ke tenant aktif (idempotent, aman ditekan berulang).

---

## 5. Kebutuhan `migrate reset` untuk DB Kotor

Modul seed bersifat **add-only** (idempotent via `findFirst`/`upsert`, tapi **TIDAK menghapus** baris lama). Konsekuensinya:

- DB dev yang sudah pernah di-seed versi lama → counts meleset / verify script gagal (stale data, **bukan bug modul**).
- **Solusi:** `cd packages/db && npx prisma migrate reset --force` sebelum seed agar angka bersih dan reproducible.
- Jalur In-App (`/api/demo/load`) di tenant produksi yang sudah berisi data asli **tidak** memerlukan reset — modul menambahkan data yang belum ada tanpa menyentuh data existing.

---

## 6. Verify Script (read-only, exit non-zero saat gagal)

| Script | Cakupan | Check Utama |
|--------|---------|-------------|
| [`packages/db/scripts/verify-finance-seed.ts`](packages/db/scripts/verify-finance-seed.ts) | Finance P0 | 100–200 JournalEntry; **nol entry tak seimbang** (header + cross-check items); riwayat ≥ 6 bulan; `entryNumber` unik + format `JE-{prefix}-{YYYYMM}-{seq}`; Bill=7; Expense=12; 5 TaxRate finance; 6 AccountingPeriod (CLOSED punya closeSummary) |
| [`packages/db/scripts/verify-ops-seed.ts`](packages/db/scripts/verify-ops-seed.ts) | CRM + HR + Inventory | Count per model; distribusi Activity; linkage `departmentId`/`entityId`; mix status payroll + formula netSalary; attendance weekdays-only; leave override LEAVE; **invarian stok Σ(IN+ADJ−OUT) === `Product.stock`**; konsistensi item opname |

Cara menjalankan:

```bash
cd packages/db
npx tsx scripts/verify-finance-seed.ts
npx tsx scripts/verify-ops-seed.ts
```

> **Status terakhir (10 Okt 2026):** SEMUA check LOLOS pada kedua script (finance: 15 check + info; ops: 37 check).

### Unit test terkait

```bash
cd apps/web
npx vitest run __tests__/unit/lib/{finance,crm,hr,inventory}-seed.test.ts
```

Total **98 test** finance/crm/hr/inventory (32 + 16 + 27 + 23) — deterministik, tanpa DB.

---

## 7. Kredensial User Demo

Dibuat oleh CLI seed (tenant `qalcuity-demo`):

| Role | Email | Password | Kegunaan |
|------|-------|----------|----------|
| **SUPERADMIN** | info@qalcuity.com | `Wahyu123456789@` | Platform owner — kelola tenant, approve payment. **Hanya jalur CLI seed** (jalur In-App tidak membuat akun ini) |
| **ADMIN** | admin@qalcuity.com | `admin123` | Full CRUD tenant — akun utama smoke test & demo |
| **ADMIN (demo)** | demo@qalcuity.com | `demo123` | Fitur "Try Demo" |
| **MEMBER** | member@qalcuity.com | `member123` | Create/read terbatas |
| **VIEWER** | viewer@qalcuity.com | `viewer123` | Read-only |
| **USER (legacy)** | user@qalcuity.com | `user123` | Role legacy |

> **Catatan SUPERADMIN:** akun platform owner **tidak dibuat** oleh jalur In-App
> (`/api/demo/load`) — jalur itu hanya mengisi data ke tenant yang sudah login.
> Untuk mendapatkan akun SUPERADMIN di instalasi baru, jalankan CLI seed
> (bagian 4) atau daftarkan via flow registrasi platform owner sesuai kebijakan deployment.

---

## 8. PRNG Deterministik & Idempotency

- **PRNG deterministik:** semua modul seed memakai [`mulberry32`](apps/web/lib/seed-data/finance.ts) (seed tetap per-modul) — **tanpa `Math.random()`** di seluruh jalur seed. Dataset identik setiap kali dijalankan (tanggal, nomor, jumlah, urutan).
- **Idempotency key per-tenant:** setiap unique entity ber-key `@@unique([..., tenantId])` — TaxRate per `code`, CoA per `code`, Bill/Expense per `number`, Invoice/Payment per `number`, JournalEntry double-dedup (`(tenantId, sourceType, sourceId, date)` + `entryNumber` global unik berprefiks tenant).
- **Bukti idempotency (aktual):** seed run ke-2 menghasilkan `Finance P0: { …created semuanya 0, journalEntriesSkipped: 132 }` — counts identik, verify script tetap lolos, nol duplikat.
- **Anchor tanggal:** seed CLI memakai anchor tetap `2026-10-10` (attendance, historis invoice/jurnal); seed In-App memakai tanggal runtime. `createdAt` historis di-backdate agar tren bulanan stabil.

---

## Checklist untuk Fitur Baru

Saat menambah fitur yang butuh data demo:

- [ ] Tambah/extend modul di [`apps/web/lib/seed-data/`](apps/web/lib/seed-data/) (jangan hardcode duplikasi di `seed.ts`/`demo.ts`).
- [ ] Wire ke **kedua** loader ([`seed.ts`](packages/db/prisma/seed.ts) + [`demo.ts`](apps/web/lib/seed-data/demo.ts)).
- [ ] Gunakan PRNG `mulberry32`, idempotency key per-`tenantId`, teks ASCII-safe (DB lokal WIN1252 menolak karakter non-ASCII).
- [ ] Tambah unit test di [`apps/web/__tests__/unit/lib/`](apps/web/__tests__/unit/lib/).
- [ ] Extend verify script ([`verify-finance-seed.ts`](packages/db/scripts/verify-finance-seed.ts) / [`verify-ops-seed.ts`](packages/db/scripts/verify-ops-seed.ts)) bila ada invariant baru.
- [ ] Update tabel record count di dokumen ini.
