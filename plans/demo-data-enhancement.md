# Rencana Enhance Data Demo Qalcuity ERP

> **Status:** Subtask A — Audit & Rencana (SELESAI, menunggu implementasi Subtask B/C/D)
> **Tanggal:** 9 Oktober 2026
> **Konteks keluhan:** "Fitur data demo belum lengkap dan kurang pas untuk sistem ERP yang digunakan oleh pemula pengguna Qalcuity Operating System ERP."
> **Batasan audit:** `schema.prisma` & `migrations/**` TIDAK boleh disentuh (read-only). Tidak ada perubahan kode saat audit. DB lokal diperiksa read-only.

---

## 1. Executive Summary

### Temuan Utama

1. **DUA mekanisme demo data yang PARALEL dan DATASET-NYA BERBEDA:**
   - [`packages/db/prisma/seed.ts`](packages/db/prisma/seed.ts) (1818 baris) → tenant `qalcuity-demo` via `npx prisma db seed` (flag `SEED_DEMO=true`).
   - [`apps/web/lib/seed-data/demo.ts`](apps/web/lib/seed-data/demo.ts) (692 baris) → dipanggil runtime `POST /api/demo/load` untuk tenant baru (tombol "Muat Data Demo" di Settings & alur onboarding). Dataset **berbeda total**: kategori berbahasa Indonesia (Elektronik, Mekanikal, …), 15 produk berbeda (ELC/MEK/OFI/…), 10 lead nama personal, 12 karyawan berbeda.
   - Akibatnya: pemula yang register → dapat dataset B; developer yang seed → dapat dataset A. Tidak konsisten, sulit dipelihara, dan keduanya sama-sama punya gap.

2. **Gap terbesar untuk pemula ERP: modul Finance TIDAK utuh.** Tidak ada `JournalEntry`/`JournalEntryItem` (jurnal umum = jantung accounting), tidak ada `Bill` (hutang ke supplier), tidak ada `Expense`, tidak ada `AccountingPeriod`, `TaxRate` tidak dibuat oleh loader runtime, CoA tidak dipakai oleh invoice/payment yang di-seed (tanpa jurnal, Laporan Laba Rugi/Neraca kosong/walau transaksi banyak). Pemula membuka laporan akuntansi → melihat angka 0 → kesan "fitur rusak".

3. **Modul lain juga setengah jalan:** HR tanpa `Department` (karyawan pakai string bebas), Inventory tanpa `Warehouse`/`StockOpname` dan loader runtime tidak membuat `StockMovement`, CRM tanpa `Activity` (pipeline lead/deal tanpa jejak aktivitas), POS/Projects/Analytics/Approval sama sekali kosong.

4. **[`DEMO-DATA.md`](DEMO-DATA.md) BASI** (Last Updated 28 Agustus 2026) — mencatat 6 invoice/5 pembayaran/3 penawaran/2 PO/8 lead/6 deal/5 karyawan, padahal seed aktual 20/18/10/9/16/14/15. Dokumentasi harus disinkronkan setelah enhance.

5. **DB lokal STALE** (lihat §5): seed terakhir memakai versi seed.ts LAMA (mis. `taxRate=0` global — kode upsert 3 TaxRate ditambahkan setelah seed terakhir; `plan=3` vs 5 di kode; attendance 100 vs ~750). Subtask D wajib re-seed dari nol di DB bersih.

### Rekomendasi Singkat

Satu persona bisnis Indonesia yang realistis — **PT Maju Jaya Abadi** (distributor & ritel multi-kategori: Elektronik, Furniture, Suku Cadang Otomotif, ATK, Software, Bahan Bangunan) — dijalankan **end-to-end 6 bulan historis** di semua modul inti, dengan **satu dataset sumber tunggal** yang dipakai baik oleh `seed.ts` maupun `loadDemoData()`, dan seluruh dokumen Finance saling terhubung: COA → TaxRate (PPN 11%) → Quotation → Invoice → Payment → **JournalEntry** → AccountingPeriod, plus Bill/Expense/Stock. Prioritas P0 menyentuh 14 model yang paling terasa oleh pemula.

---

## 2. Mekanisme Demo Data (Temuan)

### 2.1 Prisma Seed — [`packages/db/prisma/seed.ts`](packages/db/prisma/seed.ts)

- Dijalankan: `cd packages/db && npx prisma db seed` (script `tsx prisma/seed.ts`), atau root `pnpm db:seed` (pnpm tidak tersedia di PATH mesin ini — gunakan npx dari `packages/db`).
- Flag `SEED_DEMO=true` (env) → bagian demo dieksekusi; tanpa flag hanya bagian core (Tenant, SuperAdmin, Plans, Entitlement, TaxRate, PlatformSetting, PlanTenantLimit).
- Selalu menargetkan **1 tenant**: upsert `slug = "qalcuity-demo"` ("PT Qalcuity Demo").
- Pola idempotensi bercampur: `upsert` by slug/email, `findFirst` + `create`, `createMany` di-guard `count === 0` / `count < 50`, dan attendance pakai `try/catch` unique-constraint.
- **Isi bagian demo (aktual per kode saat ini):** 6 user, 9 kategori, 23–25 kontak, 9 supplier, 23 produk, ~33 stock movement, 20 invoice + item, 18 payment, 10 quotation + item, 9 PO + item, 16 lead, 14 deal, 15 employee, ~750 attendance (90 hari), 13 leave, ~34 payroll (3 periode), langganan legacy, 6 billing payment, 14 audit log, 44 CoA account, 8 bank transaction.
- Kelemahan: semua relasi "dangkal" — invoice tidak memicu jurnal, payment tidak menutup invoice di GL, payroll tidak punya jurnal, PO tidak menghasilkan stok masuk/Bill.

### 2.2 Runtime Loader — [`apps/web/lib/seed-data/demo.ts`](apps/web/lib/seed-data/demo.ts) + [`apps/web/app/api/demo/load/route.ts`](apps/web/app/api/demo/load/route.ts)

- `POST /api/demo/load` — `requirePermissionForRoute` (ADMIN/SUPERADMIN), rate-limit 5×/5 menit per tenant+IP, cek `tenantHasData()` (contact/product/invoice > 0 → 409 kecuali `force: true`), lalu `loadDemoData(tenantId)`.
- Dipakai UI: [`apps/web/app/dashboard/settings/page.tsx`](apps/web/app/dashboard/settings/page.tsx) bagian "Data Demo" (tombol "Muat Data Demo" + konfirmasi; auto-terbuka via `?demo=true` dari onboarding).
- **Dataset berbeda dari seed.ts** (kategori, produk, kontak, lead, karyawan semua lain). Juga lebih tipis: attendance hanya 5 hari × 5 karyawan, payroll 3 karyawan × 2 periode, tanpa CoA, tanpa stock movement, tanpa TaxRate (pajak dihitung hardcoded `DEMO_PPN_RATE = 11` via `calculateTax`).
- ⚠️ **Bug potensial:** [`demo.ts:465`](apps/web/lib/seed-data/demo.ts:465) memakai `status: "CONFIRMED"` untuk PO — verifikasi terhadap enum `PurchaseOrderStatus` saat implementasi (jika enum schema hanya `DRAFT/SENT/RECEIVED/CANCELLED`, PO ke-5 runtime loader akan gagal Prisma validation).

### 2.3 Flow Register/Onboarding — [`apps/web/app/api/auth/register/route.ts`](apps/web/app/api/auth/register/route.ts)

- Register hanya membuat **Tenant + 1 user ADMIN** (transaction) + welcome email. **Tidak ada starter data sama sekali** — tenant baru kosong melompong sampai user menekan tombol demo di Settings (ada onboarding modal yang mengarahkan ke `?demo=true`).
- Default plan registrasi: `starter` (dicek `checkPlanTenantLimit`).
- ⇒ UX pemula: register → dashboard kosong → butuh 2 klik untuk dapat data. Pertimbangkan (P1) opsi auto-load starter data saat onboarding selesai, atau minimal empty-state yang lebih mengajak.

### 2.4 Tabel Ringkasan Mekanisme

| Aspek | seed.ts (Prisma) | demo.ts (runtime) |
|---|---|---|
| Pemicu | `npx prisma db seed` | `POST /api/demo/load` (Settings/onboarding) |
| Target | Tenant `qalcuity-demo` saja | Tenant mana pun yang kosong |
| Konsistensi dataset | ❌ berbeda dari demo.ts | ❌ berbeda dari seed.ts |
| Finance lengkap (COA+pajak) | ⚠️ COA 44 akun, tanpa jurnal | ❌ tanpa COA, pajak hardcoded |
| Idempotensi | campuran upsert/guard | findFirst + create per nomor dokumen |
| Historis | ~0–60 hari | ~0–60 hari |

---

## 3. Gap Matrix Lengkap (per Modul)

Keterangan: ✅ = ter-seed; ⚠️ = sebagian / inkonsisten; ❌ = tidak ada. "Jumlah" = aktual seed.ts / loader runtime / DB lokal kuartal-tenant demo.

### 3.1 Finance & Accounting

| Model | Ter-seed? | Jumlah | Catatan | Prioritas |
|---|---|---|---|---|
| Invoice | ✅ | 20 / 10 | Status lengkap; tanpa `taxCode` snapshot konsisten di runtime loader | — |
| InvoiceItem | ✅ | nested | `productId` tidak diisi (deskripsi teks bebas) — link ke Product bagus untuk inventory report | P1 |
| Payment | ✅ | 18 / 8 | Runtime loader 6 payment; tidak semua invoice PAID punya payment | P0 (lengkapi) |
| Quotation + Item | ✅ | 10 / 6 | OK; P1: hubungkan ACCEPTED → jadi Invoice | P1 |
| PurchaseOrder + Item | ✅ | 9 / 5 | ⚠️ status `CONFIRMED` di loader (cek enum); P1: RECEIVED → StockMovement + Bill | P0 |
| **Bill** | ❌ | 0 / 0 | Hutang supplier — tidak ada sama sekali. Untuk distributor: wajib ada | **P0** |
| **Expense** | ❌ | 0 / 0 | Pengeluaran operasional (listrik, internet, ATK) — wajib untuk demo "pengeluaran" | **P0** |
| TaxRate | ⚠️ | 3 (core) / **0** | Loader runtime TIDAK membuat TaxRate (hardcode 11%); DB lokal `taxRate=0` | **P0** |
| **JournalEntry** | ❌ | 0 / 0 | Jurnal umum tidak pernah dibuat → Laporan Keuangan kosong | **P0** |
| **JournalEntryItem** | ❌ | 0 / 0 | Item debit/kredit ke CoAAccount — jantung GL | **P0** |
| **AccountingPeriod** | ❌ | 0 / 0 | Periode pembukuan (OPEN/CLOSED) untuk demo tutup buku | **P1** |
| CoAAccount | ✅ ⚠️ | 44 / **0** | 44 akun (neraca + laba rugi, saling induk) hanya di seed.ts; loader runtime nihil | **P0** (paritas) |
| BankTransaction | ✅ ⚠️ | 8 / 0 | Hanya seed.ts, 8 baris; perlu 20–30 untuk fitur rekonsiliasi | P1 |
| RecurringInvoice | ❌ | 0 | Fitur tagihan berulang — P2 | P2 |
| SavedReport / SavedReportExecution | ❌ | 0 | P2 | P2 |
| ScheduledReport(+Execution) | ❌ | 0 | P2 | P2 |
| AnomalyDetection | ❌ | 0 | P2 (butuh data historis dulu) | P2 |
| PaymentReminderLog | ❌ | 0 | P2 | P2 |
| KPI / KPIEvaluation / AlertRule / AlertTrigger | ❌ | 0 | P2 | P2 |

### 3.2 CRM & Sales

| Model | Ter-seed? | Jumlah | Catatan | Prioritas |
|---|---|---|---|---|
| Contact | ✅ | 23–25 / 20 | Bagus; P1: hubungkan deal→contact lebih bermakna (bukan round-robin) | — |
| Lead | ✅ | 16 / 10 | Status lengkap NEW→WON/LOST | — |
| Deal | ✅ | 14 / 8 | Stage lengkap; value realistis | — |
| Category | ✅ | 9 / 9 | ⚠️ Dua gaya (EN vs ID) antar loader — unifikasi | P0 (unify) |
| **Activity** | ❌ | 0 | Jejak CALL/EMAIL/MEETING/NOTE per lead/deal/kontak — hilang total | **P1** |
| InAppNotification | ❌ | 0 | P2 | P2 |

### 3.3 HR & Payroll

| Model | Ter-seed? | Jumlah | Catatan | Prioritas |
|---|---|---|---|---|
| Employee | ✅ | 15 / 12 | Nama Indonesia realistis; field `department` string bebas | — |
| **Department** | ❌ | 0 | Tabel `Department` kosong; Employee.departmentId tidak dipakai → halaman divisi/struktur kosong | **P1** |
| AttendanceRecord | ✅ ⚠️ | ~750 (kode) / **5 hari×5** | Runtime loader terlalu tipis; DB lokal 100 (stale) | P1 (paritas loader) |
| LeaveRequest | ✅ | 13 / 4 | OK; P2: tambah CUTI tanpa upah, MATERNITY | P2 |
| PayrollRecord | ✅ | ~34 (3 periode) / 6 | Perlu 6 periode × semua karyawan untuk tren | **P0** (historis) |
| BPJS config (lib) | ⚠️ | — | `apps/web/lib/bpjs.ts` ada tapi seed tidak menyiapkan data BPJS | P2 |

### 3.4 Inventory & Warehouse

| Model | Ter-seed? | Jumlah | Catatan | Prioritas |
|---|---|---|---|---|
| Product | ✅ | 23 / 15 | SKU unik per tenant; 1 produk demo low-stock (WDG-002) | — |
| Supplier | ✅ | 9 / 9 | OK | — |
| StockMovement | ✅ ⚠️ | ~33 (kode) / **0** | Loader runtime TIDAK membuat stok masuk/keluar → fitur mutasi stok kosong untuk tenant baru | **P0** |
| **Warehouse** | ❌ | 0 | Tidak ada gudang; Product.warehouseId selalu null | **P1** |
| **StockOpname (+Item)** | ❌ | 0 | Demo opname stok (COMPLETED + DRAFT) belum ada | **P1** |

### 3.5 POS & Loyalty (semua ❌ — DB lokal 0)

`PosTerminal`, `PosSession`, `PosTransaction(+Item)`, `PosPayment`, `PosRefund`, `PosTable(+Reservation)`, `PosKitchenStation/Order/OrderItem`, `LoyaltyMember/Transaction/Reward` — **P1 kecil** (1 terminal, 1 sesi, 15–20 transaksi, 4–6 meja) agar modul POS tidak terlihat rusak; sisanya P2.

### 3.6 Projects / Field / Analytics / Workflow / Control (semua ❌ atau trivial)

| Kelompok | Model | DB | Prioritas |
|---|---|---|---|
| Projects | Project / Task / ProjectMember / TaskComment / TimeLog / ProjectBudget / ResourceAllocation | 1 / 3 / 0… | P2 (1 proyek + 8 task + time log) |
| Field Service | FieldJob / Assignment / Checklist(+Result) | 0 | P2 |
| Analytics | AnalyticsDashboard(+Widget) / Chart / Dataset / MetricDefinition / QueryHistory / DataDictionary / ScheduledQuery / UserDashboard | 0 | P2 (1 dashboard + 4 widget) |
| Approval | **ApprovalLevel / ApprovalRequest** | 0 | **P1** (level approval Bill & Expense agar alur APPROVED→PAID bermakna) |
| Workflow | WorkflowDefinition / WorkflowHistory | 0 | P2 |
| Control/SoD | ControlPolicy / SoDRule / SoDException / SLATracker / LockRecord / TransactionState / PasswordPolicy / PasswordHistory | 0 | P2 (demo aturan SoD menarik untuk showcase) |
| Platform | SubscriptionPlan / TenantSubscription / BillingPayment | 3/1/6 | ⚠️ legacy (TODO #37) — biarkan; jangan tambah |
| Plan/Entitlement | Plan / PlanFeature / TenantEntitlement / PlanTenantLimit | 3/2 (DB stale; kode 5) | ⚠️ DB lokal basi — re-seed |
| Log | AuditLog / CronRunLog / RateLimitLog / UserSession / LoginLog / WhatsAppMessageLog / ExtractionHistory | 63 / … | Audit ✅ (14/tenant demo); sisanya P2 |

---

## 4. Kondisi DB Lokal (Audit Read-Only, 9 Okt 2026)

Dihitung via script tsx read-only (Prisma client, hanya `count`/`findMany select`). **31 tenant** terdaftar (mayoritas registrasi test). 6 tenant punya data demo (5 hasil uji `POST /api/demo/load` + `qalcuity-demo`).

**Tenant `qalcuity-demo` (seed.ts versi lama):** user=6, contact=25, category=9, supplier=9, product=23, stockMovement=5, invoice=21 (+21 item), payment=15, quotation=10 (+55 item), purchaseOrder=9 (+37 item), coAAccount=44, bankTransaction=8, lead=15, deal=14, employee=15, attendance=100, leave=4, payroll=18, auditLog=14.

**Global — model penting yang NOL:** `taxRate=0` ⚠️, `bill=0`, `expense=0`, `journalEntry=0`, `journalEntryItem=0`, `accountingPeriod=0`, `warehouse=0`, `stockOpname=0`, `department=0`, `approvalLevel=0`, `approvalRequest=0`, `activity=3` (hanya tenant test), seluruh POS/loyalty=0, `recurringInvoice=0`, `platformSetting=0`, `plan=3` (kode punya 5), `tenantEntitlement=2`.

**Interpretasi:** DB lokal memakai seed versi LAMA — perubahan seed.ts terbaru (TaxRate upsert, 5 plan, attendance 90 hari, 20 invoice) belum pernah dieksekusi ulang. **⇒ Subtask D harus re-seed di DB bersih (drop+create DB lokal / schema migrate fresh), bukan increment.**

---

## 5. Skenario Demo yang Direkomendasikan

### 5.1 Persona — Satu Cerita Bisnis Utuh

**PT Maju Jaya Abadi** — distributor & retail supply kantor/elektronik/furniture dengan penjualan langsung (B2B) dan kasir retail (POS). Alasannya membuat SEMUA modul relevan:

- **Beli dari supplier** (PO → terima barang → StockMovement IN → Bill) ⇒ Inventory + Finance (hutang).
- **Jual ke pelanggan** (Lead → Deal → Quotation → Invoice → Payment) ⇒ CRM + Sales + Finance (piutang).
- **Operasional** (Expense listrik/internet/ATK, payroll 15 karyawan, attendance 90 hari, cuti) ⇒ HR + Expense.
- **Retail counter** (POS transaksi harian, meja, struk) ⇒ POS modul tidak kosong.
- **Pembukuan utuh** (COA 44 akun, PPN 11%, jurnal dari setiap transaksi, periode bulanan) ⇒ Laporan Laba Rugi / Neraca / Buku Besar langsung hidup — inilah yang paling terasa oleh pemula ERP.

Kategori (ikuti gaya `demo.ts` yang sudah berbahasa Indonesia): Elektronik, Mekanikal, Perlengkapan Kantor, Furniture, Suku Cadang Otomotif, Makanan & Minuman, Software & Digital, Bahan Bangunan, Jasa.

### 5.2 Alur End-to-End yang Harus "Jalan" di Data Demo

| # | Alur | Model yang terhubung | Bukti bagi pemula |
|---|---|---|---|
| 1 | COA → PPN 11% → Invoice → Payment → **Jurnal** | CoAAccount, TaxRate, Invoice(+Item), Payment, **JournalEntry(+Item)** | Buku besar & Laba Rugi menampilkan transaksi; PPN terutang terbentuk |
| 2 | Quotation ACCEPTED → Invoice | Quotation(+Item) → Invoice | Sales pipeline konsisten |
| 3 | Lead → Contact → Deal (multi-stage) → Activity | Lead, Contact, Deal, **Activity** | CRM timeline bercerita (call, email, meeting) |
| 4 | Employee → Attendance → Leave → Payroll → **Jurnal payroll** | Employee(+Department), AttendanceRecord, LeaveRequest, PayrollRecord, JournalEntry | Rekap gaji 6 periode + biaya gaji masuk GL |
| 5 | Product → PO → Terima → **Stock IN** → Bill | PurchaseOrder(+Item), **StockMovement**, **Bill** | Stok bertambah saat PO diterima; hutang muncul |
| 6 | Invoice OUT → **Stock OUT** | Invoice(+Item), StockMovement | Stok berkurang konsisten dengan penjualan |
| 7 | **Opname stok** | StockOpname(+Item) vs Product.stock | Selisih opname tampil |
| 8 | Expense operasional → jurnal | Expense, JournalEntry | Kas keluar tercatat |
| 9 | Rekonsiliasi bank | BankTransaction (matched ke CoA 1102) | Fitur rekonsiliasi berisi |
| 10 | POS retail (P1) | PosTerminal/Session/Transaction(+Item)/Payment, PosTable | Kasir bisa demo tanpa setup |

### 5.3 Sebaran Historis 6 Bulan (untuk tren dashboard)

- **Invoice:** 45 dokumen (≈7–8/bulan, Apr–Sep relatif terhadap tanggal seed), status terdistribusi: DRAFT 5, SENT 10, PAID 22, OVERDUE 5, CANCELLED 3.
- **Payment:** 30–35 (hampir semua invoice PAID punya payment; 3–4 pembayaran sebagian).
- **Quotation:** 12 (DRAFT/SENT/ACCEPTED/REJECTED/EXPIRED). **PO:** 12. **Bill:** 7. **Expense:** 12.
- **JournalEntry:** ± 150–180 entry (invoice, payment, bill, expense, payroll bulanan, jurnal penyesuaian ringan) ± 450–550 item — DEBIT = KREDIT per entry.
- **Payroll:** 6 periode × 15 karyawan = 90 record (5 periode PAID + 1 PENDING).
- **Attendance:** 90 hari kerja × 15 karyawan ≈ 950 record (deterministik, bukan `Math.random()` murni).
- **Leads/Deals/Activities:** 16 lead & 14 deal (seperti sekarang) + 25 activity tersebar.
- **BankTransaction:** 25 baris (matched/matched-tengah/unmatched).

---

## 6. Rencana Implementasi P0/P1/P2

### 6.0 Arsitektur Perbaikan Fondasi (syarat semua subtask)

1. **Single source of dataset.** Pindahkan definisi data demo (kategori, produk, kontak, dsb.) ke satu modul dataset netral, mis. `packages/db/prisma/seed-dataset.ts` (atau `apps/web/lib/seed-data/dataset.ts` bila tetap di web) → di-import OLEH `seed.ts` maupun `loadDemoData()`. **Seed dan runtime loader harus menghasilkan data identik.** Ini menutup temuan #1.
2. **Idempotency berbasis `@@unique` (wajib, agar re-seed aman):**

| Model | Kunci unik (dari schema) | Strategi |
|---|---|---|
| Tenant | `slug` | `upsert` |
| User | `email` (global) | `upsert` |
| Category | `[name, tenantId]` | `upsert` |
| Product | `[sku, tenantId]` | `upsert` |
| TaxRate | `[code, tenantId]` | `upsert` |
| Invoice | `[invoiceNumber, tenantId]` | `upsert` + `items: { deleteMany: {}, create: [...] }` saat update |
| Payment | `[paymentNumber, tenantId]` | `upsert` |
| Quotation / PO | `[number, tenantId]` | `upsert` + deleteMany/create nested items |
| Bill / Expense | `[number, tenantId]` | `upsert` |
| CoAAccount | `[code, tenantId]` | `upsert` |
| **JournalEntry** | `entryNumber` **GLOBAL** | `upsert` by entryNumber; nomor deterministik per tenant (mis. `JE-{YYYYMM}-{seq:04d}`) agar tidak bentrok antar tenant bila beberapa tenant di-seed |
| AccountingPeriod | `[tenantId, startDate]` | `upsert` |
| Employee | `[employeeId, tenantId]` | `upsert` |
| AttendanceRecord | `[employeeId, date, tenantId]` | `upsert` (ganti pola try/catch) |
| PayrollRecord | `[employeeId, period, tenantId]` | `upsert` |
| Warehouse | `[code, tenantId]` | `upsert` |
| StockOpname | `[opnameNumber, tenantId]` | `upsert` |
| Department | `[tenantId, name]` | `upsert` |
| JournalEntryItem / StockMovement / Activity / LeaveRequest / BankTransaction | tanpa unique bisnis | `deleteMany({ journalEntryId })` lalu `create` nested, ATAU guard `findFirst` by pasangan field (mis. `journalEntryId + lineNo`) |

3. **Determinisme.** Ganti `Math.random()` (attendance status, payroll bonus, tanggal random) dengan PRNG ber-seed (mis. LCG sederhana `seed = hash(tenantId+index)`) supaya hasil seed stabil dan assertion di Subtask D bisa eksak.
4. **Pajak dari TaxRate, bukan konstanta.** `loadDemoData()` harus `getTaxRate(code 'PPN')` dan mengisi `Invoice.taxCode`/`Quotation.taxCode`/`Bill` dengan kode yang ada — bukan `DEMO_PPN_RATE` hardcoded.
5. **Sinkron saldo CoA.** Setelah jurnal dibuat, jalankan/melewati logika [`apps/web/lib/balance-sync.ts`](apps/web/lib/balance-sync.ts) atau set `CoAAccount.balance` = jumlah `JournalEntryItem` yang posted. Konsistensi saldo ↔ jurnal wajib diverifikasi di Subtask D.
6. **`tenant.update` seed:** `currentPlanSlug: 'pro'` tidak ada di daftar plan (free/starter/growth/business/enterprise) — koreksi ke `'business'` (P0 kecil, di area yang bukan Do-Touch).

### 6.1 Subtask B — Finance Lengkap (P0)

Target: setiap tenant demo (qalcuity-demo + runtime loader) memiliki GL yang hidup.

| Step | Model | Aksi | Jumlah |
|---|---|---|---|
| B1 | TaxRate | Pindahkan 3 upsert (PPN 11% VAT default, PPH23 2%, PPH21) ke helper core yang dipanggil seed.ts DAN loadDemoData() | 3 |
| B2 | CoAAccount | 44 akun dipindah ke dataset bersama; loader runtime ikut membuat (guard `count===0` per tenant) | 44 |
| B3 | **JournalEntry + Item** | Generator: untuk tiap Invoice PAID → jurnal (D/K Piutang ↔ Kas/Bank; K Pendapatan + PPN terutang); Invoice SENT → Piutang/Pendapatan; Payment → rubuh Piutang→Kas; Bill → Beban/Inventory ↔ Utang Usaha; Expense → Beban ↔ Kas; Payroll periodik → Beban Gaji ↔ Kas. `status: POSTED` historis, `DRAFT` untuk 3 dokumen terbaru (ajari user match/reconcile). Validasi `totalDebit === totalCredit` | ±150 entry / ±500 item |
| B4 | Bill | 7 bill terhubung supplier + PO (APPROVED 4, PAID 3), pajak PPN | 7 (+item) |
| B5 | Expense | 12 expense (UTILITIES 3, OFFICE 2, TRAVEL 2, MARKETING 2, MAINTENANCE 2, OTHER 1), semua APPROVED; 2 PENDING_APPROVAL untuk demo approval | 12 |
| B6 | Payment pelengkap | Pastikan SEMUA invoice PAID punya payment; 3 partial payment | +10 |
| B7 | AccountingPeriod | 6 bulan (Mei–Okt) : 4 CLOSED (dengan `closeSummary` sederhana), 2 OPEN | 6 |
| B8 | BankTransaction | 25 baris berbagai status matched/unmatched/discrepancy, linked CoA 1102/1103 | 25 |

**Enum yang benar (dari schema — WAJIB dipakai):**
- `Invoice.status`: `DRAFT|SENT|PAID|OVERDUE|CANCELLED`
- `Payment`: `method BANK_TRANSFER|CASH|CREDIT_CARD|E_WALLET`, `status COMPLETED|PENDING|FAILED`, `type INCOME|EXPENSE`
- `Bill.status`: `DRAFT|PENDING_APPROVAL|APPROVED|PAID|CANCELLED`
- `Expense.category`: `OFFICE|TRAVEL|UTILITIES|MARKETING|SALARIES|MAINTENANCE|OTHER`; `status DRAFT|PENDING_APPROVAL|APPROVED|REJECTED`; `paymentMethod CASH|BANK_TRANSFER|QRIS|CREDIT_CARD`
- `TaxRate.type`: `VAT|INCOME_TAX|OTHER`
- `JournalEntry`: `sourceType manual|invoice|payment|purchase_order|payroll` (lowercase!), `status DRAFT|POSTED|VOID`; field wajib `createdBy` (isi dengan id user admin seed), `entryNumber` unik global
- `AccountingPeriod.status`: `OPEN|CLOSING|CLOSED`; `@@unique([tenantId, startDate])`
- Semua nominal `Decimal(19,4)` → kirim string/number; JANGAN float untuk akumulasi besar.

### 6.2 Subtask C — CRM + HR + Inventory Lengkap (P0)

| Step | Model | Aksi | Jumlah |
|---|---|---|---|
| C1 | Unifikasi dataset | Jadikan `demo.ts` memakai dataset bersama (langkah 6.0 #1) — menghapus duplikasi kategori/produk/kontak/lead/karyawan | — |
| C2 | **Activity** | 25 aktivitas (CALL 6, EMAIL 6, MEETING 5, NOTE 5, TASK 3) terhubung lead/deal/contact, `createdBy` = admin, tanggal menyebar 60 hari | 25 |
| C3 | **Department** | 7 divisi (Direksi, Keuangan, Penjualan, SDM, Gudang, IT, Operasional) + isi `Employee.departmentId` (fallback string lama tetap ada) | 7 |
| C4 | **Warehouse** | 2 gudang (`GUDANG-PUSAT` isDefault=true, `GUDANG-CABANG`); setengah produk terhubung warehouseId | 2 |
| C5 | **StockMovement** | 60–80 gerakan deterministik: OPENING (IN besar), PO diterima (IN, reference `PO-…`), penjualan (OUT, reference `INV-…`), ADJUSTMENT 2. **Aturan kekonsistenan: stok awal + ΣIN − ΣOUT = `Product.stock`** | 60–80 |
| C6 | **StockOpname** | 2 opname (1 COMPLETED dengan 1 item selisih, 1 DRAFT) | 2 (+item) |
| C7 | Payroll historis | 6 periode × semua karyawan aktif (90 record); periode lama PAID + paidAt, terbaru PENDING | 90 |
| C8 | Attendance parity loader | `loadDemoData()` ikut 90 hari (bukan 5 hari) | — |
| C9 | Leave tambahan | 3 leave lagi (SICK/APPROVED, ANNUAL/PENDING, UNPAID/REJECTED) | +3 |

**Enum:** `StockMovement.type IN|OUT|ADJUSTMENT`; `StockOpname.status DRAFT|IN_PROGRESS|COMPLETED|CANCELLED`; `Employee.status` (cek di schema saat implementasi); `LeaveRequest.type ANNUAL|SICK|PERSONAL|MATERNITY|UNPAID`, `status PENDING|APPROVED|REJECTED`; `PayrollRecord.status PENDING|PROCESSED|PAID`, `period` format `"YYYY-MM"`; `AttendanceRecord.status PRESENT|LATE|ABSENT|LEAVE|WFH`, unique `[employeeId, date, tenantId]`; `Activity.entityType CONTACT|LEAD|DEAL`, `type CALL|EMAIL|MEETING|NOTE|TASK`, field wajib `createdBy`.

### 6.3 P1 (setelah P0 stabil)

- **ApprovalLevel** (2 level untuk `bill` & `expense`) + 3–4 **ApprovalRequest** (dari Bill/Expense PENDING_APPROVAL) agar modul approval terlihat nyata.
- **POS-lite:** 1 PosTerminal + 1 PosSession CLOSED + 15 PosTransaction(+Item,+Payment) + 6 PosTable + 1 PosTableReservation. Perbaiki dulu bug enum `CONFIRMED` di loader PO.
- **InvoiceItem.productId** diisi dari Product (deskripsi sinkron) → inventory analytics menyala.
- Quotation ACCEPTED → otomatis isi kolom referensi ke Invoice (bila schema mendukung; jika tidak, cukup nomor invoice yang match di notes).
- **InAppNotification** 8 notifikasi (payment overdue, approval pending, low stock).
- **RecurringInvoice** 2 contoh (langganan software bulanan).
- **Analytics seed:** 1 dashboard + 4 widget (Revenue bulanan, Piutang usia, Top produk, Stock alert) memakai tabel read-model yang sudah ada.
- **BankAccount** tidak ada di schema (hanya BankTransaction) — jangan mengarang; gunakan CoA 1102/1103 sebagai akun bank.

### 6.4 P2 (nice-to-have / showcase)

Projects (1 proyek + 8 task + time log), Field Job (2 job + checklist), Loyalty (50 member), Kitchen display (3 order), WorkflowDefinition (1 alur invoice), ControlPolicy/SoD demo rules, AnomalyDetection (5 temuan), SavedReport (3), UsageRecord (bulanan), WhatsApp/ExtractionHistory (mock ringan). **Jangan sentuh** legacy `SubscriptionPlan/TenantSubscription/BillingPayment` (TODO #37) selain mempertahankan kompatibilitas.

### 6.5 Pemetaan ke Subtask

| Subtask | Cakupan |
|---|---|
| **B (Finance)** | B1–B8 (P0), plus ApprovalLevel/ApprovalRequest (P1) |
| **C (CRM/HR/Inv)** | C1–C9 (P0), plus POS-lite, notifications (P1) |
| **D (Verifikasi+Docs)** | Re-seed DB lokal bersih; assert: balanced jurnal, stok konsisten, semua nomor dokumen unik, `npx tsc --noEmit` lolos; update [`DEMO-DATA.md`](DEMO-DATA.md) (tabel jumlah + kredensial + cara muat), [`CURRENT.md`](CURRENT.md), [`FEATURES.md`](FEATURES.md); commit & push |

---

## 7. Gotchas & Risiko Implementasi

1. **`JournalEntry.entryNumber` unik GLOBAL** — beberapa tenant demo (6+ tenant runtime) memakai nomor sama → bentrok. Gunakan prefix deterministik per tenant atau `upsert` yang menimpa aman.
2. **`Invoice.taxCode` harus menunjuk `TaxRate.code` yang benar-benar ada** — jika tidak, halaman pajak/laporan PPN menampilkan kode yatim.
3. **Loader runtime tanpa TaxRate & CoA** (saat ini) → tenant baru tidak bisa demo fitur pajak/COA sama sekali. Prioritas B1/B2.
4. **Konsistensi stok:** `Product.stock` harus = Σ gerakan; saat seed ulang dengan `upsert`, jangan lakukan `createMany` movement ganda (pakai kunci `reference+type+tanggal` atau deleteMany per tenant lalu create).
5. **`Math.random()`** membuat seed tidak deterministik → sulit verifikasi & re-seed menambah duplikat. Gunakan PRNG ber-seed.
6. **Enum PO `CONFIRMED`** di [`demo.ts:465`](apps/web/lib/seed-data/demo.ts:465) — verifikasi terhadap enum schema; bila invalid, perbaiki menjadi `RECEIVED`/`SENT`.
7. **Decimal:** `parseFloat(emp.salary.toString())` di payroll loader berpotensi drift kecil — pertahankan string decimal untuk `netSalary`.
8. **DB lokal stale** — jangan menguji dengan `db push` incremental; drop & migrate fresh + `SEED_DEMO=true npx prisma db seed` (Subtask D).
9. **Area Do-Touch:** `schema.prisma`, `migrations/**`, `lib/auth.ts`, `lib/session.ts`, `middleware.ts`, `lib/audit.ts`, register flow, Permission & Workflow engine — **jangan dimodifikasi**; enhance seed cukup MENGGUNAKAN schema yang ada.
10. **Rate limit demo load** 5×/5 menit per tenant — saat QA manual, gunakan tenant berbeda atau tunggu; jangan spam endpoint.
11. **Ukuran seed:** ±150 jurnal + ±950 absensi + 90 payroll membuat seed ~ beberapa ribu insert — gunakan `createMany` batch (items jurnal per entry tetap nested create) agar seed < 60 detik.
12. **DEMO-DATA.md drift** sudah terbukti terjadi sekali — setiap enhance seed WAJIB update doc di subtask yang sama (aturan Rule 4).

---

## 8. Checklist Definition of Done (Enhance Data Demo)

- [ ] Satu dataset sumber dipakai `seed.ts` dan `loadDemoData()` (tidak ada duplikasi definisi).
- [ ] Re-seed 2× berturut-turut tidak menggandakan data (idempotent via `@@unique`).
- [ ] Semua invoice PAID punya Payment dan minimal 1 JournalEntry ter-post; `SUM(debit) === SUM(credit)` per entry.
- [ ] Laporan Laba Rugi, Neraca, dan Buku Besar tenant demo menampilkan data (bukan 0).
- [ ] `Product.stock` = Σ StockMovement (IN−OUT+ADJUSTMENT).
- [ ] Tenant baru via Register → "Muat Data Demo" menghasilkan data IDENTIK dengan `qalcuity-demo`.
- [ ] Historis ≥ 6 bulan untuk invoice/payment/payroll; attendance 90 hari kerja.
- [ ] `npx tsc --noEmit` lolos; seed selesai < 60 detik.
- [ ] `DEMO-DATA.md`, `CURRENT.md`, `FEATURES.md` diperbarui.

---

*Dihasilkan dari audit Subtask A: pembacaan penuh seed.ts (1818 baris), DEMO-DATA.md (455 baris), demo.ts (692 baris), register route, settings UI, schema.prisma (113 model, read-only), dan hitung read-only DB lokal.*
