# Community Phase 4A — Implementation Plan (Aset Komunitas)

> **Modul:** Community Governance (RT/RW) — `apps/web/app/dashboard/community`
> **Predecessor:** [`plans/community-phase3-implementation.md`](community-phase3-implementation.md) (Fase 3, commit `c6c36d3`)
> **Mode:** Architect spec — dokumen ini adalah kontrak untuk subtask Code berikutnya.
> **Session:** 75

---

## 1. Tujuan & Scope

### 1.1 Tujuan

Membangun **pengelolaan aset komunitas (inventaris RT/RW)** end-to-end dengan model dedicated `CommunityAsset`: CRUD aset oleh pengurus, daftar & filter, detail aset, **portal warga read-only** (transparansi), laporan ringkas nilai aset, dan export CSV — plus dokumentasi keputusan tenancy (ADR draft) untuk OPEN QUESTION founder Fase 3.

Fase 4A adalah **penghuni pertama** dari "Faset 4A/4B aset": Fase 4A mendaftarkan aset (register), Fase 4B menambahkan **lifecycle pinjaman/pengembalian** (peminjaman aset ke kegiatan/warga) yang membutuhkan model & state machine terpisah. Keputusan defer peminjaman dijelaskan di §2.2.

### 1.2 Scope IN

| # | Item | Ringkas |
|---|------|---------|
| T1 | Model `CommunityAsset` + migration ADDITIVE | Dedicated model (bukan reuse `Product`) — lihat §3 |
| T2 | CRUD aset internal (pengurus) | `GET/POST /api/community/assets`, `GET/PUT/DELETE /api/community/assets/[id]` — numbering `AST/<YYYY>-<seq3>`, soft-delete |
| T3 | Daftar + filter + search + pagination | `community:view` — filter kategori, kondisi, status; search nama |
| T4 | Ringkasan nilai aset | `GET /api/community/assets/summary` — agregat per kategori + per kondisi + total nilai perolehan |
| T5 | Portal warga read-only | `GET /api/community/portal/assets` — projection publik kolom terbatas (lihat §2.3) |
| T6 | Export CSV daftar aset | Reuse `exportToCSV` pola Fase 2 |
| T7 | UI internal (tab "Aset") | Halaman `assets/page.tsx` + loading/error + stat cards + dual layout + form modal + delete confirm |
| T8 | UI portal | Halaman `portal/assets/page.tsx` read-only + quick link dari portal overview |
| T9 | i18n id/en | `community.assets.*` + `community.portal.assets.*` — paritas |
| T10 | Seed + verify + cleanup | 10–15 aset deterministik (TANPA RNG), section verify `(l)`, cleanup artefak aset |
| T11 | Smoke S37–S44 | Assertions lanjutan dari [36] (Fase 3) |
| T12 | ADR draft tenancy | Keputusan 1 tenant = 1 komunitas operasional (RT), evolusi Multi-RT/RW via `CommunityUnit` — dokumentasikan di §9, final = founder |

### 1.3 Scope OUT / DEFER (ke Fase 4B+)

- **Peminjaman/pengembalian aset** (`CommunityAssetLoan` — borrower member + event + tanggal pinjam/kembali) → **Fase 4B** (lihat §2.2)
- Log perawatan/perbaikan (riwayat service) → Fase 4B+
- Penyusutan akuntansi (depreciation) → DEFER (RT tidak butuh akuntansi penyusutan)
- Akuntansi aset ke GL / jurnal → tidak perlu untuk RT
- Multi-RT/RW (model `CommunityUnit` hierarchy) → **lihat §9** (ADR draft, bukan scope 4A)
- Foto aset / lampiran (attachment) → DEFER (kebutuhan rendah, pola upload sudah ada bila perlu)
- Barcode/QR label cetak aset → DEFER (menarik tapi bukan kebutuhan inti)

---

## 2. Keputusan Produk

### 2.1 Model dedicated `CommunityAsset` (bukan reuse inventory)

Keputusan ini sudah diputuskan di Fase 3 §2.2 dan ditegaskan ulang di sini:

- **Opsi A ditolak** — reuse `Product` + `StockMovement` tidak punya field lifecycle aset (tanggal perolehan, nomor aset, kondisi, custodian, handover). Custom-field engine `@qalcuity/industry-config` juga tidak cukup karena field-nya FLAT tanpa relasi.
- **Opsi B diterima** — model dedicated `CommunityAsset`. Domain aset itu **relational** (asset → member custodian, asset → lokasi/kondisi) + punya state lifecycle. Konsisten dengan Rule 7 AGENT.md (*Configuration Before Customization*) dan kesimpulan hybrid product-analysis (dedicated model untuk domain relational).

### 2.2 DEFER peminjaman/pengembalian ke Fase 4B (PUTUSAN & JUSTIFIKASI)

**Pertanyaan produk:** field "dipinjam untuk kegiatan X" (relasi opsional `CommunityAsset.usedInEventId`?) bernilai tinggi untuk RT kecil — tapi half-way = buruk. **Putusan: DEFER total ke Fase 4B, bersama model pinjaman yang benar.**

**Alasan (product call):**

1. **Pinjaman adalah LIFECYCLE, bukan satu kolom.** "Aset dipakai di kegiatan X" yang benar butuh: siapa meminjam (borrower member), kapan pinjam, kapan jatuh tempo, kembali atau belum, kondisi saat kembali, apakah kegiatan sudah selesai. Satu kolom `usedInEventId` hanya menangkap 1 dimensi dan menciptakan **state yang tidak lengkap** (siapa peminjamnya? sudah kembali?).
2. **Half-way data = data yang salah.** Jika Fase 4A hanya menambah `usedInEventId`, pengurus akan mengisi "kegiatan X" tanpa mencatat siapa yang memegang — saat aset hilang/rusak, jejak pertanggungjawaban putus. Lebih baik TIDAK mencatat sama sekali daripada mencatat setengah benar (prinsip data integrity).
3. **Fase 4A sudah memberi nilai nyata tanpa pinjaman:** daftar aset (warga tahu punyaan RT), kondisi terpantau, custodian tercatat (penanggung jawab tetap), laporan nilai. Untuk RT kecil, **mencatat aset = 80% manfaat**; pinjaman adalah polish yang menyusul.
4. **Ukuran RT (10–30 aset)** — belum ada tekanan pengguna nyata yang mendesak pinjaman sekarang (prinsip YAGNI, konsisten Fase 2/3). Bangun sekali dengan benar di 4B (`CommunityAssetLoan` + status AKTIF/DIPINJAM/KEMBALI + guard konflik) lebih baik daripada refactor kolom setengah jadi.
5. **Konsistensi dengan keputusan Fase 2/3** — "jangan half-build" (Fase 3 §2.2). Fase 4A = register aset yang bersih; Fase 4B = lifecycle pinjaman yang utuh.

**Konsekuensi:** field `usedInEventId` TIDAK ditambahkan di 4A. Kolom "status" aset (§3) memakai `AKTIF|PERAWATAN|TIDAK_AKTIF` murni — tanpa nilai `LOANED` yang menuntut relasi pinjaman.

### 2.3 Kolom portal publik: apa yang ditampilkan (PUTUSAN & JUSTIFIKASI)

**Pertanyaan produk:** transparansi total vs privasi. **Putusan: tampilkan ringkasan operasional, TIDAK tampilkan biaya perolehan individual.**

| Kolom | Portal publik? | Justifikasi |
|-------|----------------|-------------|
| `name` (nama aset) | ✅ Ya | Inti transparansi — warga perlu tahu RT punya apa |
| `category` (kategori) | ✅ Ya | Konteks pengelompokan, tidak sensitif |
| `condition` (kondisi) | ✅ Ya | Transparansi kondisi aset bersama (apakah masih layak) — nilainya justru diakui warga |
| `assetCode` (nomor aset) | ✅ Ya | Nomor inventaris bukan data sensitif; memudahkan warga merujuk aset ("AST/2026-001 kursi tamu") |
| `location` (lokasi) | ✅ Ya (ringkas) | Di mana aset disimpan (balai RT, gudang) — operational, bukan privasi |
| `notes` | ❌ Tidak | Bisa memuat catatan internal (mis. "menunggu pengadaan", "rusak karena X") |
| `acquisitionCost` (biaya perolehan per item) | ❌ **Tidak** | **Privasi & politik** — harga beli per item memicu perdebatan warga ("kok mahal?", "kenapa beli ini?"); yang wajar adalah **agregat total** di laporan |
| `acquisitionDate` (tanggal perolehan per item) | ❌ Tidak | Detail internal; tidak perlu untuk transparansi umum |
| `custodian` (nama penanggung jawab) | ❌ Tidak | Menampilkan nama warga sebagai custodian di portal publik = tanpa izin eksplisit; cukup internal |
| **Total nilai perolehan (agregat)** | ⚠️ **Internal saja** (bukan portal) | Nilai agregat adalah **angka akuntansi** — layak untuk laporan internal pengurus; di portal cukup jumlah aset + kondisi. Menampilkan total nilai ke publik = keputusan transparansi finansial yang lebih baik diserahkan ke pengurus (bukan default sistem). |

**Rationale produk:** transparansi RT yang sehat = warga tahu **apa yang dimiliki** dan **dalam kondisi apa** — bukan berapa harganya per item. Biaya perolehan adalah domain **laporan kas** (sudah ada di `community/reports`) — aset tidak perlu mengulang paparan finansial di portal. Jika kelak RT ingin paparan nilai aset ke warga, cukup tambah satu toggle/section di laporan — tanpa mengubah projection portal.

**Ringkas projection portal:** `{ assetCode, name, category, condition, location }` (5 field, semua non-sensitif).

### 2.4 Lokasi laporan nilai aset: SECTION di halaman aset (bukan endpoint `/reports` terpisah)

**Pertanyaan produk:** ringkasan nilai aset ditaruh di `GET /api/community/reports/monthly` (existing) atau section di halaman aset? **Putusan: section di halaman aset + endpoint ringkas `GET /api/community/assets/summary`.**

**Alasan (termurah yang tetap berguna):**

1. **Domain cohesiveness** — ringkasan aset = turunan dari data aset; menempel di halaman aset mengurangi navigasi dan menjaga `/reports/monthly` tetap fokus pada **laporan keuangan bulanan** (iuran + kas) sejak Fase 1 (kontrak response tidak berubah → nol risiko regresi).
2. **Termurah** — tidak perlu memodifikasi handler `/reports/monthly` yang sudah stabil; cukup 1 endpoint baru ringkas yang di-consume stat cards + section ringkasan di halaman yang sama. Satu tempat untuk semua yang berbau aset.
3. **Cukup berguna** — stat cards (jumlah aktif, total nilai, perlu perbaikan) + ringkasan per kategori + per kondisi sudah menjawab kebutuhan laporan aset RT. Laporan silang (kas + aset gabungan) bukan kebutuhan — aset tidak bergerak di kas kecuali via pembelian yang sudah tercatat di `CommunityCashTransaction`.

### 2.5 `custodianMemberId` onDelete: **SetNull** (bukan Restrict)

Aset adalah **objek fisik jangka panjang** yang melebihi masa keanggotaan seorang warga. Jika warga pindah/keluar (member di-soft-delete), asetnya **tidak boleh ikut terhapus atau memblokir penghapusan member** — cukup lepas penanggung jawabnya (`custodianMemberId` → `null`), lalu pengurus menetapkan custodian baru. Konsisten dengan pola `onDelete: SetNull` pada relasi opsional community lain (`CommunityEvent.announcementId`).

### 2.6 Nomor aset `AST/<YYYY>-<seq3>` di-assign saat CREATE (bukan draft)

Konsisten dengan `CommunityEvent.eventNumber` (`KGT/<YYYY>-<seq3>`, di-assign saat CREATE). Berbeda dengan `CommunityLetter.letterNumber` yang NULL saat DRAFT karena surat butuh masa draft; **aset tidak punya masa draft** — begitu dibuat sudah resmi menjadi bagian inventaris. `assetCode` `String?` nullable tetap dipertahankan **hanya** untuk kompatibilitas pola & race-retry P2002, tapi pada praktiknya selalu terisi.

---

## 3. Prisma Schema

### 3.1 Model baru: `CommunityAsset`

```prisma
// ─── Community Module (Fase 4A: Aset Komunitas) ───────────────────────────────
// Referensi: plans/community-phase4-aset-implementation.md §3
// Inventaris aset RT/RW — model DEDICATED (bukan reuse Product/StockMovement).
// Peminjaman/pengembalian = Fase 4B (CommunityAssetLoan) — TIDAK di scope 4A.

model CommunityAsset {
  id          String   @id @default(cuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])

  // Identifikasi
  assetCode   String?  // Auto: "AST/<YYYY>-<seq3>" — di-assign saat CREATE (bukan draft). Unik per tenant.
  name        String   // Nama aset, e.g. "Kursi Lipat", "Sound System RT"
  category    String   @default("LAINNYA") // ELEKTRONIK, PERABOT, KENDARAAN, ALAT, BANGUNAN, LAINNYA

  // Perolehan
  acquisitionDate DateTime?  // Tanggal perolehan (opsional)
  acquisitionCost Decimal?   @db.Decimal(19, 4) // Biaya perolehan per item (opsional, internal-only)

  // Kondisi & status
  condition   String   @default("BAIK") // BAIK, PERLU_PERBAIKAN, RUSAK_RINGAN, RUSAK_BERAT
  status      String   @default("AKTIF") // AKTIF, PERAWATAN, TIDAK_AKTIF

  // Penempatan & penanggung jawab
  location    String?  // Lokasi penyimpanan, e.g. "Balai RT", "Gudang belakang"
  custodianMemberId String?              // Relasi opsional ke CommunityMember — SetNull saat member dihapus
  custodian   CommunityMember? @relation(fields: [custodianMemberId], references: [id])

  notes       String?

  // Meta
  createdBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?                    // Soft-delete (konsisten model community lain)
  deletedBy   String?

  // Unik: 1 kode aset per tenant. assetCode NULL (kompatibilitas) diizinkan ganda oleh Postgres.
  @@unique([tenantId, assetCode])
  @@index([tenantId, deletedAt])
  @@index([tenantId, category])
  @@index([tenantId, condition])
  @@index([tenantId, status])
  @@index([tenantId])
}
```

**Catatan desain (konvensi block Community — konsisten dengan Fase 1/2/3):**

- Tanpa `@@map` — konsisten dengan model Community lain.
- `tenantId String` tanpa `@db.Uuid` — konsisten (lihat `CommunityEvent`).
- Soft-delete `deletedAt`/`deletedBy` — konsisten dengan `CommunityDuesBill`, `CommunityCashTransaction`, `CommunityLetter`, `CommunityEvent`. DELETE API = set `deletedAt` (bukan hard delete) agar riwayat & audit utuh.
- Relasi many-to-one **dengan FK** ke `CommunityMember` (custodian) — validasi milik-tenant dilakukan di route sebelum create/update (pola peserta Fase 3).
- `Decimal(19, 4)` untuk `acquisitionCost` — konsisten dengan field nominal lain (`amount`, `budgetAmount`).
- `category` & `condition` & `status` sebagai **String dengan default** (bukan Prisma `enum`) — konsisten dengan model community lain (`status`, `type`, `method` semuanya String). Ini juga memudahkan penambahan nilai kelak tanpa migrasi enum.

### 3.2 Relasi ditambah ke model existing

```prisma
// CommunityMember — tambah 1 baris di daftar relasi:
  custodiedAssets CommunityAsset[] // Fase 4A: aset yang menjadi penanggung jawab member ini
```

> **Satu-satunya** perubahan pada model yang sudah ada — reverse-relation opsional (seperti `participants`/`eventParticipations` di Fase 3). **TIDAK ada** perubahan field/kontrak di `CommunityMember` yang sudah ada. `CommunityEvent` **tidak** disentuh (peminjaman = 4B).

### 3.3 Migration

ADDITIVE BARU — membuat tabel `CommunityAsset` + menambah FK reverse-relation di `CommunityMember`. **TIDAK** mengubah/menghapus kolom yang ada.

```bash
cd packages/db && npx prisma migrate dev --name community_assets
cd packages/db && npx prisma generate
```

Migrasi diharapkan **murni additive** (CREATE TABLE + CREATE INDEX + ALTER TABLE ADD CONSTRAINT untuk reverse relation). Jalankan `bash scripts/check-drift.sh` sebelum commit (pola Session 70k) untuk memastikan schema & migration sinkron.

---

## 4. API Contract

Semua response mengikuti bentuk standar: `{ success: boolean, data?: T, total?: number, page?, limit?, totalPages?, error?: { code, message } }`.

### 4.1 `GET /api/community/assets` (BARU) — daftar + filter + search + pagination (`community:view`)

Query params:

| Param | Tipe | Default | Behavior |
|-------|------|---------|----------|
| `search` | string | — | ILIKE `%…%` pada `name` (case-insensitive) |
| `category` | enum string | — | Filter persis `category` |
| `condition` | enum string | — | Filter persis `condition` |
| `status` | enum string | — | Filter persis `status` |
| `page` | number | 1 | Nomor halaman |
| `limit` | number | 20 | Per halaman (maks 100) |

Response `200`:

```json
{
  "success": true,
  "data": [
    {
      "id": "…", "assetCode": "AST/2026-001", "name": "Kursi Lipat",
      "category": "PERABOT", "condition": "BAIK", "status": "AKTIF",
      "location": "Balai RT", "acquisitionDate": "…", "acquisitionCost": "150000.0000",
      "custodian": { "id": "…", "code": "W-003", "fullName": "Agus Wijaya" },
      "createdAt": "…", "updatedAt": "…"
    }
  ],
  "total": 12, "page": 1, "limit": 20, "totalPages": 1
}
```

`where` selalu `deletedAt: null` + `tenantId`. `orderBy` default `createdAt: 'desc'`. Include `custodian` (select ringkas). **Catatan:** `acquisitionCost`/`acquisitionDate` ikut di list **internal** (halaman internal boleh lihat); projection publik pakai endpoint portal (§4.5).

Errors: `400` param tidak valid (limit > 100, page < 1, category/condition/status di luar enum) · `403` tanpa `community:view`.

### 4.2 `POST /api/community/assets` (BARU) — create (`community:manage`)

Body (Zod `createCommunityAssetSchema`):

```json
{
  "name": "Kursi Lipat",
  "category": "PERABOT",            // opsional, default LAINNYA
  "condition": "BAIK",              // opsional, default BAIK
  "status": "AKTIF",                // opsional, default AKTIF
  "acquisitionDate": "2026-01-15",  // opsional (ISO date)
  "acquisitionCost": 150000,        // opsional, number ≥ 0
  "location": "Balai RT",           // opsional
  "custodianMemberId": "…",         // opsional UUID — divalidasi milik tenant
  "notes": "…"                      // opsional
}
```

Server **meng-assign** `assetCode` = `AST/<YYYY>-<seq3>` (year dari `now()`, seq3 = max+1 collision-safe dalam transaksi, pola `nextEventNumber`). `assetCode` **TIDAK** pernah dari body (anti mass-assignment).

Success `201 { success, data: row }` + `logAudit` CREATE.

Errors: `400` Zod · `404 MEMBER_NOT_FOUND` (custodianMemberId bukan member tenant / soft-deleted) · `409 DUPLICATE_ASSET_CODE` (race P2002 pada `[tenantId, assetCode]` — route **retry ×1** dengan seq baru, gagal lagi → 409) · `403` tanpa `community:manage`.

### 4.3 `GET /api/community/assets/[id]` (BARU) — detail (`community:view`)

Success `200 { success, data: row }` — include `custodian` select lengkap. `where { id, tenantId, deletedAt: null }`.

Errors: `404 ASSET_NOT_FOUND` (tidak ada / tenant lain / soft-deleted) · `403`.

### 4.4 `PUT /api/community/assets/[id]` (BARU) — update (`community:manage`)

Body (Zod `updateCommunityAssetSchema` = base `.partial()`) — semua field opsional kecuali minimal satu terisi. `assetCode` **tidak** bisa diubah via body (nomor bersifat stabil setelah create). `custodianMemberId` divalidasi milik tenant → `404 MEMBER_NOT_FOUND`.

Success `200 { success, data: row }` + `logAudit` UPDATE.

Errors: `400` Zod · `404 ASSET_NOT_FOUND` · `404 MEMBER_NOT_FOUND` · `403`.

### 4.5 `DELETE /api/community/assets/[id]` (BARU) — soft-delete (`community:manage`)

Set `deletedAt = now()`, `deletedBy = userId` (bukan hard delete). **Guard Fase 4A:** cukup **konfirmasi di UI** (`ConfirmDialog`) — TIDAK ada guard pinjaman aktif karena pinjaman = 4B (belum ada). Catatan di §2.2: guard "hanya aset tanpa pinjaman aktif" baru relevan di 4B.

Success `200 { success, data: { id, deletedAt } }` + `logAudit` DELETE.

Errors: `404 ASSET_NOT_FOUND` · `403`.

### 4.6 `GET /api/community/assets/summary` (BARU) — ringkasan (`community:view`)

Response `200`:

```json
{
  "success": true,
  "data": {
    "totalAssets": 12,
    "byCategory": [
      { "category": "PERABOT", "count": 5, "totalCost": "750000.0000" },
      { "category": "ELEKTRONIK", "count": 3, "totalCost": "2500000.0000" }
    ],
    "byCondition": [
      { "condition": "BAIK", "count": 9 },
      { "condition": "PERLU_PERBAIKAN", "count": 2 },
      { "condition": "RUSAK_BERAT", "count": 1 }
    ],
    "byStatus": [
      { "status": "AKTIF", "count": 10 },
      { "status": "PERAWATAN", "count": 1 },
      { "status": "TIDAK_AKTIF", "count": 1 }
    ],
    "totalAcquisitionCost": "3250000.0000"
  }
}
```

Agregat memakai Prisma `groupBy` (`_count`, `_sum.acquisitionCost`) dengan `where { tenantId, deletedAt: null }`. `totalAcquisitionCost` = Σ `acquisitionCost` (aset dengan cost `null` di-skip dari sum, tapi tetap dihitung di `totalAssets`/`byCategory.count`). **Endpoint ringkas terpisah** (bukan modifikasi `/reports/monthly`) — lihat §2.4.

Errors: `403`.

### 4.7 `GET /api/community/portal/assets` (BARU) — projection publik (`community:portal`)

Response `200`:

```json
{
  "success": true,
  "data": [
    { "assetCode": "AST/2026-001", "name": "Kursi Lipat", "category": "PERABOT", "condition": "BAIK", "location": "Balai RT" }
  ],
  "total": 12
}
```

**Hanya 5 kolom non-sensitif** (§2.3): `assetCode, name, category, condition, location`. `where { tenantId, deletedAt: null }`. **TIDAK** menyertakan `acquisitionCost`, `acquisitionDate`, `custodian`, `notes`. Tanpa filter/search (portal read-only sederhana), urut `createdAt: 'desc'`. Tidak ada pagination (aset RT kecil < 100; bisa ditambah bila perlu).

Errors: `403` (tanpa `community:portal`).

### 4.8 Zod schemas (safe pattern konvensi)

Ikuti pola Fase 3 §9 — **base object TANPA `.refine()`** → `create = base.refine()` → `update = base.partial().refine()` ( `.partial()` setelah `.refine()` melempar di module evaluation Zod v4 → cascade 500).

```ts
// apps/web/lib/validation-schemas.ts
const ASSET_CATEGORIES = ['ELEKTRONIK', 'PERABOT', 'KENDARAAN', 'ALAT', 'BANGUNAN', 'LAINNYA'] as const;
const ASSET_CONDITIONS = ['BAIK', 'PERLU_PERBAIKAN', 'RUSAK_RINGAN', 'RUSAK_BERAT'] as const;
const ASSET_STATUSES = ['AKTIF', 'PERAWATAN', 'TIDAK_AKTIF'] as const;

const communityAssetBase = z.object({
  name: z.string().trim().min(1, 'name wajib diisi').max(200),
  category: z.enum(ASSET_CATEGORIES).optional(),
  condition: z.enum(ASSET_CONDITIONS).optional(),
  status: z.enum(ASSET_STATUSES).optional(),
  acquisitionDate: z.coerce.date().optional(),
  acquisitionCost: z.number().min(0).optional(),
  location: z.string().trim().max(200).optional(),
  custodianMemberId: z.string().uuid('custodianMemberId harus UUID').optional(),
  notes: z.string().trim().max(500).optional(),
});

export const createCommunityAssetSchema = communityAssetBase
  .refine((d) => d.name.length > 0, { message: 'name wajib diisi' });

export const updateCommunityAssetSchema = communityAssetBase
  .partial()
  .refine(() => true, { message: 'minimal satu field diisi' });
```

Path param `[id]`: `z.string().uuid()` — invalid → `400`.

### 4.9 API messages

Tambah blok baru di [`api-messages.ts`](../apps/web/lib/api-messages.ts) (English, pola Fase 3 §10.1). Cek dulu `MEMBER_NOT_FOUND`/`PERMISSION_DENIED` yang sudah ada di `MSG_COMMUNITY`/`MSG_COMMUNITY_PARTICIPANTS` — **jangan duplikat string**, sisanya di blok `MSG_COMMUNITY_ASSETS`:

```ts
export const MSG_COMMUNITY_ASSETS = {
    ASSET_CREATED: 'Asset created',
    ASSET_UPDATED: 'Asset updated',
    ASSET_DELETED: 'Asset deleted',
    ASSET_NOT_FOUND: 'Asset not found',
    DUPLICATE_ASSET_CODE: 'Asset code already exists',
    // MEMBER_NOT_FOUND & PERMISSION_DENIED → reuse dari MSG_COMMUNITY / MSG_COMMUNITY_PARTICIPANTS
} as const;
```

---

## 5. RBAC Matrix

**ZERO permission baru** — reuse `community:view`, `community:manage`, `community:portal` (konsisten Fase 2/3).

| Route | Method | Permission | Fallback | Catatan |
|-------|--------|------------|----------|---------|
| `/api/community/assets` | GET | `community:view` | MEMBER | BENDAHARA boleh lihat daftar |
| `/api/community/assets` | POST | `community:manage` | ADMIN | KETUA / SEKRETARIS |
| `/api/community/assets/[id]` | GET | `community:view` | MEMBER | detail |
| `/api/community/assets/[id]` | PUT | `community:manage` | ADMIN | update |
| `/api/community/assets/[id]` | DELETE | `community:manage` | ADMIN | soft-delete |
| `/api/community/assets/summary` | GET | `community:view` | MEMBER | ringkasan |
| `/api/community/portal/assets` | GET | `community:portal` | VIEWER | projection publik |

Entri baru di [`route-permissions.ts`](../apps/web/lib/route-permissions.ts) (pola method-qualified, mengikuti baris 417–423). **PENTING (RBAC_STRICT):** route `summary` adalah **child prefix** dari `assets` — tanpa entri eksplisit, longest-prefix match akan menjatuhkan `GET /assets/summary` ke entri `[id]`-style atau base `assets`. Karena `requirePermissionForRoute` melakukan **exact-then-prefix**, entri `GET /api/community/assets/summary` harus didaftarkan agar terbidik `community:view` (bukan jatuh ke entri manage). Pendekatan identik dengan pola Fase 3 di mana portal events punya entri eksplisit dokumentatif:

```ts
// ─── Community Module (Fase 4A: Aset Komunitas) ───────────────────────────
// Aset: GET = community:view (BENDAHARA boleh lihat), mutasi = community:manage.
'/api/community/assets': { permission: 'community:manage', fallbackRole: 'ADMIN' },
'GET /api/community/assets': { permission: 'community:view', method: 'GET', fallbackRole: 'MEMBER' },
'/api/community/assets/[id]': { permission: 'community:manage', fallbackRole: 'ADMIN' },
'GET /api/community/assets/[id]': { permission: 'community:view', method: 'GET', fallbackRole: 'MEMBER' },
// Ringkasan — child path; entri eksplisit agar terbidik community:view (bukan jatuh ke [id]/manage)
'GET /api/community/assets/summary': { permission: 'community:view', method: 'GET', fallbackRole: 'MEMBER' },
// Portal warga — aset read-only
'/api/community/portal/assets': { permission: 'community:portal', fallbackRole: 'VIEWER' },
```

3 lapisan: middleware (prefix `/dashboard/community` sudah gated) → route (`requirePermissionForRoute` + `hasPermission` / `resolvePortalMember`) → UI (`canManage` / status portal). Route handler tetap melakukan `hasPermission` in-route (defense-in-depth, pola peserta Fase 3).

---

## 6. UI per Halaman + i18n

### 6.1 [`(internal)/assets/page.tsx`](../apps/web/app/dashboard/community/(internal)/assets/page.tsx) (BARU)

Halaman internal aset — polakan [`(internal)/events/page.tsx`](../apps/web/app/dashboard/community/(internal)/events/page.tsx) (stat cards + filter + dual layout + export) & pola form modal cash/dues-types.

- **Stat cards** (dari `GET /assets/summary`): **Jumlah Aset Aktif** (status AKTIF), **Total Nilai Perolehan** (format `formatCurrencyIDR`), **Perlu Perbaikan** (condition `PERLU_PERBAIKAN` + `RUSAK_RINGAN`), **Dalam Perawatan** (status `PERAWATAN`).
- **Filter + search bar:** search `name` (debounced), select filter `category`, `condition`, `status` + tombol **Reset**. Filter men-trigger refetch server-side (`?search=&category=&condition=&status=&page=`).
- **Dual layout konvensi:** mobile cards (≤768px) + desktop table (>768px). Kolom desktop: kode aset, nama, kategori, kondisi (badge), status (badge), lokasi, custodian, aksi. Badge warna kondisi: BAIK hijau / PERLU_PERBAIKAN amber / RUSAK_RINGAN & RUSAK_BERAT merah. Badge status: AKTIF hijau / PERAWATAN amber / TIDAK_AKTIF abu.
- **Pagination** bawah (page/limit/totalPages dari response).
- **Section ringkasan** (opsional collapsible di bawah stat cards): 2 mini-table — **Per Kategori** (kategori, jumlah, total nilai) + **Per Kondisi** (kondisi, jumlah) — dari `summary.byCategory`/`byCondition`.
- **Form modal Create/Edit** (gate `canManage`): field name (required), category (select), condition (select), status (select), acquisitionDate (date), acquisitionCost (number), location, custodian (select member ACTIVE — dropdown dari `GET /api/community/members`), notes (textarea). Edit pre-fill. Toast sukses/gagal.
- **Delete** (gate `canManage`): `ConfirmDialog` → `DELETE` → toast + refresh. Soft-delete di server.
- **Export CSV** (tombol, reuse `exportToCSV` + `formatCurrencyIDR`): fetch semua row (limit tinggi) → kolom `assetCode, name, category, condition, status, location, acquisitionDate, acquisitionCost, custodian`. File `aset-komunitas-<period>.csv`.
- **Empty state** (`EmptyState`), skeleton loading, `error.tsx` — ikuti pola halaman events.

### 6.2 `loading.tsx` / `error.tsx` untuk aset

Buat skeleton + error boundary (pola halaman detail events). `loading.tsx` di path yang sama dengan `page.tsx`.

### 6.3 Tab "Aset" di [`layout.tsx`](../apps/web/app/dashboard/community/layout.tsx)

Tambah 1 entri ke `internalTabs` (setelah `events`, sebelum `announcements`/`reports` — urutan: …, events, **assets**, announcements, reports):

```ts
{ href: `${BASE}/assets`, labelKey: 'community.layout.tabs.assets', icon: Package },
```

`Package` (atau `Boxes`) dari lucide-react. **TIDAK** menambah tab portal di array `portalTabs` utama — portal aset diakses via quick-link section (§6.4) + halaman `portal/assets` (dapat juga ditambahkan sebagai tab `portal/assets` bila konsistensi portal other diinginkan; rekomendasi: **tambah juga tab portal** `{ href: `${BASE}/portal/assets`, labelKey: 'community.layout.tabs.assets', icon: Package }` agar akses warga setara portal letters/events).

### 6.4 Portal: [`portal/assets/page.tsx`](../apps/web/app/dashboard/community/portal/assets/page.tsx) (BARU) + quick-link

- Halaman **read-only** (polakan [`portal/announcements`](../apps/web/app/dashboard/community/portal/announcements/page.tsx)): fetch `GET /api/community/portal/assets`, tampilkan **daftar kartu/tabel ringkas** dengan hanya 5 kolom publik (kode, nama, kategori, kondisi badge, lokasi). Tanpa aksi edit/delete. Empty state + loading skeleton.
- **Quick link** dari [`portal/page.tsx`](../apps/web/app/dashboard/community/portal/page.tsx) (portal overview): section/nav link ke `portal/assets` (ikon `Package`, label "Aset Komunitas") — setara link portal letters/events bila ada.

### 6.5 i18n outline (id + en paritas)

Backend messages: `MSG_COMMUNITY_ASSETS.*` (lihat §4.9, English). Frontend keys — struktur leaf, **paritas id/en identik jumlah & nama key**:

```
community.layout.tabs.assets

community.assets.title / subtitle
community.assets.stat.active          "Aset Aktif"
community.assets.stat.totalCost       "Total Nilai"
community.assets.stat.needRepair      "Perlu Perbaikan"
community.assets.stat.maintenance     "Dalam Perawatan"
community.assets.search.placeholder
community.assets.filter.category / condition / status / reset
community.assets.table.assetCode / name / category / condition / status / location / custodian / actions
community.assets.category.elektronik / perabot / kendaraan / alat / bangunan / lainnya
community.assets.condition.baik / perluPerbaikan / rusakRingan / rusakBerat
community.assets.status.aktif / perawatan / tidakAktif
community.assets.add / editTitle / edit
community.assets.field.name / category / condition / status / acquisitionDate / acquisitionCost / location / custodian / notes
community.assets.custodian.none         "(Tanpa penanggung jawab)"
community.assets.delete / deleteConfirm
community.assets.empty
community.assets.summary.byCategory / byCondition / totalCost
community.assets.exportCsv
community.assets.date / cost / createdAt

community.portal.assets.title / subtitle
community.portal.assets.assetCode / name / category / condition / location
community.portal.assets.empty
```

**Keputusan i18n:** nilai enum (`category`/`condition`/`status`) di-map ke label terjemahan via key (pola `categoryLabel` di portal announcements — fallback ke nilai mentah bila key tidak ada). `package.json`/dokumen **tidak** berubah.

---

## 7. Seed + Verify Contract

### 7.1 Seed — [`apps/web/lib/seed-data/community.ts`](../apps/web/lib/seed-data/community.ts)

Dataset baru (deterministik, **TANPA RNG** — keputusan sadar, konsisten Fase 3):

```ts
export interface CommunityAssetSpec {
    assetCode: string;            // business key, e.g. "AST/2026-001" (unik per tenant)
    name: string;
    category: 'ELEKTRONIK' | 'PERABOT' | 'KENDARAAN' | 'ALAT' | 'BANGUNAN' | 'LAINNYA';
    condition: 'BAIK' | 'PERLU_PERBAIKAN' | 'RUSAK_RINGAN' | 'RUSAK_BERAT';
    status: 'AKTIF' | 'PERAWATAN' | 'TIDAK_AKTIF';
    acquisitionDate?: Date;       // deterministik (Date.UTC fixed)
    acquisitionCost?: number;
    location?: string;
    custodianMemberCode?: string; // business key ke member seed (W-xxx) — null = tanpa custodian
    notes?: string;
}

export const COMMUNITY_ASSETS: CommunityAssetSpec[] = [
    // Mix kategori + kondisi + status; 1–2 tanpa custodian; 1 PERAWATAN; 1+ perlu perbaikan/rusak
    { assetCode: 'AST/2026-001', name: 'Kursi Lipat 50 pcs',      category: 'PERABOT',    condition: 'BAIK',             status: 'AKTIF',      acquisitionDate: new Date(Date.UTC(2024, 2, 10)), acquisitionCost: 1250000, location: 'Balai RT',      custodianMemberCode: 'W-005', notes: 'Set 50 kursi lipat untuk acara' },
    { assetCode: 'AST/2026-002', name: 'Sound System RT',         category: 'ELEKTRONIK', condition: 'BAIK',             status: 'AKTIF',      acquisitionDate: new Date(Date.UTC(2023, 7, 22)), acquisitionCost: 3500000, location: 'Balai RT',      custodianMemberCode: 'W-007' },
    { assetCode: 'AST/2026-003', name: 'Mikrofon Wireless',       category: 'ELEKTRONIK', condition: 'PERLU_PERBAIKAN',  status: 'PERAWATAN',  acquisitionDate: new Date(Date.UTC(2023, 7, 22)), acquisitionCost: 450000,  location: 'Balai RT',      custodianMemberCode: 'W-007', notes: 'Mic 2 bermasalah' },
    { assetCode: 'AST/2026-004', name: 'Tenda 6x8m',              category: 'ALAT',       condition: 'BAIK',             status: 'AKTIF',      acquisitionDate: new Date(Date.UTC(2022, 10, 5)), acquisitionCost: 2200000, location: 'Gudang',        custodianMemberCode: 'W-013' },
    { assetCode: 'AST/2026-005', name: 'Gerobak Sampah',          category: 'ALAT',       condition: 'RUSAK_RINGAN',    status: 'AKTIF',      acquisitionDate: new Date(Date.UTC(2021, 4, 18)), acquisitionCost: 800000,  location: 'Pos Keamanan',  custodianMemberCode: 'W-009' },
    { assetCode: 'AST/2026-006', name: 'Sepeda Motor Operasional', category: 'KENDARAAN',  condition: 'BAIK',             status: 'AKTIF',      acquisitionDate: new Date(Date.UTC(2020, 1, 14)), acquisitionCost: 14500000, location: 'Garase RT',     custodianMemberCode: 'W-001', notes: 'Honda Beat, plat B' },
    { assetCode: 'AST/2026-007', name: 'Meja Kayu Panjang',       category: 'PERABOT',    condition: 'BAIK',             status: 'AKTIF',      acquisitionDate: new Date(Date.UTC(2022, 3, 9)),  acquisitionCost: 900000,  location: 'Balai RT',      custodianMemberCode: null },   // tanpa custodian
    { assetCode: 'AST/2026-008', name: 'Lampu Penerangan Jalan',  category: 'ELEKTRONIK', condition: 'RUSAK_BERAT',      status: 'TIDAK_AKTIF', acquisitionDate: new Date(Date.UTC(2019, 8, 30)), acquisitionCost: 600000, location: 'Pos Keamanan',  custodianMemberCode: null },   // tanpa custodian
    { assetCode: 'AST/2026-009', name: 'Kotak Amal',              category: 'LAINNYA',    condition: 'BAIK',             status: 'AKTIF',      acquisitionDate: new Date(Date.UTC(2023, 0, 12)), acquisitionCost: 150000, location: 'Balai RT',      custodianMemberCode: 'W-002' },
    { assetCode: 'AST/2026-010', name: 'Papan Pengumuman',        category: 'BANGUNAN',   condition: 'BAIK',             status: 'AKTIF',      acquisitionDate: new Date(Date.UTC(2021, 10, 3)), acquisitionCost: 400000, location: 'Depan Balai RT', custodianMemberCode: 'W-003' },
    { assetCode: 'AST/2026-011', name: 'Kipas Angin',             category: 'ELEKTRONIK', condition: 'PERLU_PERBAIKAN',  status: 'AKTIF',      acquisitionDate: new Date(Date.UTC(2022, 6, 20)), acquisitionCost: 350000,  location: 'Balai RT',      custodianMemberCode: 'W-008' },
    { assetCode: 'AST/2026-012', name: 'Karpet Merah 10m',        category: 'PERABOT',    condition: 'BAIK',             status: 'AKTIF',      acquisitionDate: new Date(Date.UTC(2023, 11, 1)), acquisitionCost: 700000,  location: 'Gudang',        custodianMemberCode: 'W-016' },
];
```

**Total 12 aset** (deterministik, TANPA RNG). Campuran: 6 kategori berbeda; kondisi campur (BAIK mayoritas, 2 PERLU_PERBAIKAN, 1 RUSAK_RINGAN, 1 RUSAK_BERAT); status campur (10 AKTIF, 1 PERAWATAN, 1 TIDAK_AKTIF); **2 tanpa custodian** (`W-005`, `W-007`, `W-013`, `W-009`, `W-001`, `W-002`, `W-003`, `W-008`, `W-016` semua ACTIVE di seed members).

**Idempotency & unique code:** lookup via `findUnique` on `[tenantId, assetCode]` → skip bila ada (pola bills). `assetCode` adalah **business key deterministik dari spec** (bukan hasil `nextAssetNumber` runtime) — collision-safe karena kode fixed di array; **tidak mengkonsumsi RNG sama sekali** (pola Fase 3 — kelas bug rng-desync mustahil terjadi). Custodian di-resolve via map `custodianMemberCode → memberId` yang sudah ada dari seeding members sebelumnya.

**`SeedCommunityResult`** — tambah kunci `assets` di **kedua** `counts` dan `created`:

```ts
counts:  { ..., assets: number }  // total dalam tenant — db.communityAsset.count({ where: { tenantId } })
created: { ..., assets: number }  // baris baru run ini
```

### 7.2 Print contract di [`packages/db/prisma/seed.ts`](../packages/db/prisma/seed.ts)

Tambah `assets: community.created.assets` ke objek `console.log("✅ Community …")` (baris ~1282–1294) + baris ringkas di blok `console.log("\n📋 Community …")` (baris ~1354): `✅ Community Assets: 12`.

### 7.3 [`verify-community-seed.ts`](../packages/db/scripts/verify-community-seed.ts) — section (l) BARU

Contract (a)–(k) Fase 1–3 **tidak berubah**. Section baru:

```
(l) Aset Komunitas (Fase 4A):
  - Total aset rt02-melati = 12
  - assetCode unique (AST/2026-001..012) — tidak ada duplikat (group by having count > 1)
  - Semua aset punya assetCode terisi (tidak ada null)
  - Kategori tersebar: ELEKTRONIK 4, PERABOT 3, ALAT 2, KENDARAAN 1, BANGUNAN 1, LAINNYA 1
  - Kondisi: BAIK 7, PERLU_PERBAIKAN 2, RUSAK_RINGAN 1, RUSAK_BERAT 1
  - Status: AKTIF 10, PERAWATAN 1, TIDAK_AKTIF 1
  - Custodian valid: semua custodianMemberId menunjuk CommunityMember aktif tenant rt02-melati; 2 aset tanpa custodian (AST/2026-007, AST/2026-008)
  - acquisitionCost >= 0 untuk semua yang terisi; total nilai = 25,800,000 (Σ dari 12 aset)
  - Isolasi: tenant qalcuity-demo memiliki 0 aset
```

**Catatan angka:** `totalAcquisitionCost` seed = 1.250.000 + 3.500.000 + 450.000 + 2.200.000 + 800.000 + 14.500.000 + 900.000 + 600.000 + 150.000 + 400.000 + 350.000 + 700.000 = **25.800.000**. Subtask Code wajib **menghitung ulang dari array seed aktual** dan menyesuaikan ekspektasi bila ada selisih (jangan percaya angka statis tanpa verifikasi).

### 7.4 [`cleanup-community-artifacts.ts`](../packages/db/scripts/cleanup-community-artifacts.ts) — aset cleanup BARU

Tambah target cleanup (idempoten, targeted **bukan** reset): **aset artefak smoke** — `CommunityAsset` dengan `name` prefix `'Smoke test aset'` (pola prefix matcher letters/events) → hard-delete baris smoke (aset smoke sengaja dibuat unik dengan prefix agar teridentifikasi). Baseline seed 12 aset **tidak disentuh**. Kembalikan print ringkasan jumlah dihapus.

---

## 8. Smoke Matrix (S-Series Extension — lanjutan dari [36])

Server aux `:3001` (pola Fase 2/3). Aktor: **ketua** (internal `community:manage`), **warga** (portal `community:portal`, W-001), **bendahara** (hanya `community:view`/`community:finance`, **tanpa** `community:manage`), **admin tenant lain** (cross-tenant).

| # | Skenario | Expect |
|---|----------|--------|
| S37 | Ketua `GET /api/community/assets` | 200, 12 baris seed, `total=12`, semua ada `assetCode` |
| S38 | Ketua `POST /api/community/assets` (name valid, category ELEKTRONIK) | 201, `assetCode` auto `AST/<YYYY>-0NN` (seq next), `condition=BAIK` default |
| S39 | Ketua `POST` dengan `custodianMemberId` tenant lain | 404 `MEMBER_NOT_FOUND` |
| S40 | Ketua `PUT /api/community/assets/[id]` (ubah condition → RUSAK_RINGAN) | 200, condition berubah, `logAudit` UPDATE |
| S41 | Warga portal `GET /api/community/portal/assets` | 200, projection **hanya 5 field** (`assetCode,name,category,condition,location`) — **TIDAK ada** `acquisitionCost`/`custodian` |
| S42 | Bendahara (role MEMBER, **tanpa** `community:manage`) `POST /api/community/assets` | 403 (hanya `community:view`) |
| S43 | Admin tenant lain `GET /api/community/assets/[id]` (id aset rt02-melati) | 404 `ASSET_NOT_FOUND` (isolasi tenant) |
| S44 | Ketua `DELETE /api/community/assets/[id]` → `GET` list lagi | 200 soft-delete; `GET` tidak mengembalikan aset itu (`deletedAt` ter-set); `GET /assets/summary` `totalAssets` turun 1 |

**Lanjutan numbering dari [36]** (Fase 3 berhenti di S36). S38 memakai nama aset unik-per-run (timestamp suffix) agar idempotent-smoke tidak menabrak unique `[tenantId, assetCode]`. **Artefak smoke aset** dibersihkan oleh `cleanup-community-artifacts.ts` (§7.4) sebelum verify count-eksak (pelajaran §14.3 COMMUNITY-MODULE).

---

## 9. Keputusan Tenancy (ADR Draft — dokumentasikan, JANGAN implement di 4A)

> **Status: DRAFT — final approval = founder.** Bagian ini menjawab OPEN QUESTION Fase 3 §2.2. **TIDAK ada implementasi** di Fase 4A; hanya dokumentasi keputusan + evolusi path.

### Pertanyaan

> **1 tenant = 1 desa/kelurahan, atau 1 RT?**

### Rekomendasi Arsitektur (untuk founder)

**Rekomendasi: 1 tenant = 1 komunitas operasional (RT) — seperti model SEKARANG.** Alasan:

1. **Konsisten dengan implementasi nyata** — seed `rt02-melati`, `CommunityMember.rtRw` informatif ("1 tenant = 1 RT", komentar schema baris 3019), `CommunityLetter`/`CommunityEvent` beroperasi pada skala 1 RT. Tidak ada code yang rusak.
2. **YAGNI** — mayoritas pengguna Qalcuity community adalah **RT standalone** (850 ribu RT di Indonesia). Membangun hierarki desa → RT sekarang = over-engineering untuk persona yang belum terbukti butuh agregasi.
3. **RW aggregator = peluang paket langganan berbeda** — konsolidasi N RT dalam 1 RW adalah **nilai tambah premium** (lihat product analysis §4: "RW Multi-RT — laporan gabungan, pengawasan kas lintas RT"). Menumpuknya dalam model yang sama sekarang mengaburkan boundary & pricing.

### Jalur evolusi Multi-RT/RW (BILA founder putuskan perlu — MIGRASI BERTAHAP, bukan sekarang)

Model `CommunityUnit` (hierarchy) **kelak**:

```prisma
model CommunityUnit {
  id         String  @id @default(cuid())
  tenantId   String
  tenant     Tenant  @relation(fields: [tenantId], references: [id])
  type       String  // DESA, RW, RT
  name       String  // "Kelurahan Sukamaju", "RW 05", "RT 02"
  parentId   String? // unit induk (RT → RW → DESA)
  parent     CommunityUnit? @relation("UnitTree", fields: [parentId], references: [id])
  children   CommunityUnit[] @relation("UnitTree")
  // + link aset/warga/kegiatan ke unitId bila multi-unit diaktifkan
}
```

**Migrasi bertahap (bukan big-bang):**
1. **Fase N:** tambah `CommunityUnit` optional + `unitId` opsional di model terkait (member, aset, event). Tenant lama = 1 unit default (RT) yang di-seed otomatis → **kompatibel mundur**.
2. **Fase N+1:** UI pengelolaan unit (RW aggregator) hanya bila ada pilot RW yang bayar.
3. **Batas:** satu tenant = satu kelurahan/RT-cluster. **Cross-tenant tetap dilarang** (multi-tenant isolation = hard rule). Jika 1 desa = banyak RT → semua RT dalam 1 tenant via `CommunityUnit`, **bukan** banyak tenant.

### Konsekuensi untuk Fase 4A

- `CommunityAsset` **tidak** punya `unitId` di 4A — aset melekat pada 1 tenant (= 1 RT). Penambahan `unitId` opsional (bila multi-unit diaktifkan) adalah **migrasi additive** kelak, bukan perubahan kontrak.
- ADR ini masuk [`docs/DECISIONS.md`](../docs/DECISIONS.md) sebagai **ADR draft** (nomor ADR berikutnya, mis. ADR-025) dengan **Status: Draft — awaiting founder**. Format mengikuti ADR-024 (Decision / Context / Rationale table / Alternatives / Consequences). **Final = founder.**

---

## 10. Risiko & Mitigasi

| # | Risiko | Sev | Mitigasi |
|---|--------|-----|----------|
| R1 | Route `GET /assets/summary` terbidik permission salah (longest-prefix jatuh ke `[id]`/manage) | Medium | Entri eksplisit `GET /api/community/assets/summary` di `route-permissions.ts` (§5) + smoke S42 memverifikasi `community:view` untuk read |
| R2 | Race `assetCode` duplikat (dua create bersamaan, seq sama) | Low | Numbering dalam transaksi (pola `nextEventNumber`) + tangkap P2002 → retry ×1 seq baru → 409 bila masih bentrok; smoke S38 |
| R3 | Bocor `acquisitionCost`/`custodian` ke portal publik | Medium | Projection portal pakai `select` 5 field eksplisit (§4.7) + smoke S41 assert field terlarang tidak ada |
| R4 | `custodianMemberId` tenant-bocor / cross-tenant | Medium | Validasi `findFirst({ id, tenantId })` → 404 `MEMBER_NOT_FOUND` sebelum create/update; smoke S39 |
| R5 | DELETE menghapus data riwayat (bukan soft-delete) | Low | `deletedAt`/`deletedBy` set (bukan hard delete), konsisten model community; smoke S44 |
| R6 | Seed aset menggeser count verify lama (a)–(k) | Low | Seed aset = **tambahan section (l)**; contract (a)–(k) tidak berubah; aset seed idempotent `[tenantId, assetCode]` |
| R7 | Artefak smoke aset merusak verify count-eksak | Low | Prefix `'Smoke test aset'` + cleanup script §7.4 (pelajaran §14.3) |
| R8 | Reverse relation `CommunityMember.custodiedAssets` rusak model existing | Low | Murni tambah 1 baris relasi opsional (pola `eventParticipations`); tidak ubah field/kontrak `CommunityMember` |
| R9 | `groupBy` summary berat pada aset banyak | Low | Skala RT 10–30 aset; `groupBy` + index `[tenantId, deletedAt]` cukup |

---

## 11. Definition of Done

- [ ] Model `CommunityAsset` + reverse relation `CommunityMember.custodiedAssets` sesuai §3
- [ ] Migration `community_assets` ADDITIVE applied + `prisma generate`; `check-drift.sh` lolos
- [ ] 5 endpoint internal (`GET/POST /assets`, `GET/PUT/DELETE /assets/[id]`) + `GET /assets/summary` + `GET /portal/assets` berfungsi, RBAC 3 lapisan
- [ ] `assetCode` auto `AST/<YYYY>-<seq3>` saat create, unik per tenant, retry P2002 → 409
- [ ] Custodian divalidasi milik tenant (404 `MEMBER_NOT_FOUND`); `onDelete: SetNull`
- [ ] Soft-delete (`deletedAt`) untuk DELETE; 404 `ASSET_NOT_FOUND` untuk id tenant lain
- [ ] Portal projection **hanya 5 field** non-sensitif (tanpa `acquisitionCost`/`custodian`/`notes`)
- [ ] Zod safe pattern (base tanpa refine → `.partial()` setelah base aman)
- [ ] Entri `route-permissions.ts` added (7 entries, method-qualified + summary eksplisit)
- [ ] Tenant isolation: semua query filter `tenantId`; portal terbatas projection
- [ ] UI internal: stat cards + filter/search + dual layout + form modal + delete confirm + export CSV + section ringkasan (empty/loading/error)
- [ ] Tab "Aset" internal + portal tab/quick-link
- [ ] UI portal: daftar read-only 5 kolom
- [ ] Seed 12 aset deterministik TANPA RNG; run ke-2 `created.assets = 0` (idempoten); print contract `assets` di seed.ts
- [ ] `verify-community-seed.ts` section (l) PASS; contract (a)–(k) tetap PASS
- [ ] `cleanup-community-artifacts.ts` aset cleanup idempoten
- [ ] i18n id + en lengkap (§6.5) — tidak ada hardcoded string, paritas key
- [ ] Smoke S37–S44 PASS di aux server `:3001`
- [ ] ADR draft tenancy (§9) didokumentasikan — masuk `docs/DECISIONS.md` (Status: Draft, final founder) **atau** siap sebagai lampiran; **tanpa** implement `CommunityUnit`
- [ ] Docs: `COMMUNITY-MODULE.md` roadmap §17 update (Fase 4A DONE); `CURRENT.md` bump versi; `FEATURES.md` status Fase 4A

---

## 12. Daftar File Dibuat / Diubah (untuk subtask Code)

### File BARU

| File | Isi |
|------|-----|
| `apps/web/app/api/community/assets/route.ts` | GET (list+filter+summary inline? **tidak** — summary terpisah) + POST create |
| `apps/web/app/api/community/assets/[id]/route.ts` | GET + PUT + DELETE (soft-delete) |
| `apps/web/app/api/community/assets/summary/route.ts` | GET agregat kategori/kondisi/status/total |
| `apps/web/app/api/community/portal/assets/route.ts` | GET projection publik 5 kolom |
| `apps/web/app/dashboard/community/(internal)/assets/page.tsx` | Halaman internal aset |
| `apps/web/app/dashboard/community/(internal)/assets/loading.tsx` | Skeleton |
| `apps/web/app/dashboard/community/(internal)/assets/error.tsx` | Error boundary |
| `apps/web/app/dashboard/community/portal/assets/page.tsx` | Halaman portal read-only |
| `packages/db/prisma/migrations/<ts>_community_assets/migration.sql` | Generated (ADDITIVE) |

### File DIUBAH

| File | Perubahan |
|------|-----------|
| `packages/db/prisma/schema.prisma` | Tambah `model CommunityAsset` + reverse relation `CommunityMember.custodiedAssets` |
| `apps/web/lib/validation-schemas.ts` | Tambah `createCommunityAssetSchema` + `updateCommunityAssetSchema` (safe pattern) |
| `apps/web/lib/api-messages.ts` | Tambah `MSG_COMMUNITY_ASSETS.*` |
| `apps/web/lib/route-permissions.ts` | Tambah 7 entri aset (method-qualified + summary + portal) |
| `apps/web/lib/community.ts` (atau `community-letter.ts`) | Helper `nextAssetNumber(tx, year)` — `AST/<YYYY>-<seq3>` (pola `nextEventNumber`) |
| `apps/web/app/dashboard/community/layout.tsx` | Tab internal "Aset" + tab portal "Aset" |
| `apps/web/app/dashboard/community/portal/page.tsx` | Quick-link ke `portal/assets` |
| `apps/web/lib/seed-data/community.ts` | `COMMUNITY_ASSETS` (12 spec) + loop seeding idempotent + `SeedCommunityResult.assets` |
| `packages/db/prisma/seed.ts` | Print contract `assets` (log object + blok ringkasan) |
| `packages/db/scripts/verify-community-seed.ts` | Section (l) Aset (contract baru) |
| `packages/db/scripts/cleanup-community-artifacts.ts` | Aset cleanup (prefix `'Smoke test aset'`) |
| `scripts/smoke-community-login.ps1` | Assertions S37–S44 (lanjut [36]) |
| `apps/web/messages/id.json` + `apps/web/messages/en.json` | Key `community.assets.*` + `community.portal.assets.*` + `community.layout.tabs.assets` |
| `docs/COMMUNITY-MODULE.md` | Roadmap §17 update (Fase 4A DONE) |
| `docs/DECISIONS.md` | ADR draft tenancy (Status: Draft — awaiting founder) — **opsional di subtask Code, boleh terpisah review founder** |
| `CURRENT.md` | Bump versi + entri Session 75 |
| `FEATURES.md` | Status Fase 4A |

### File yang TIDAK BOLEH disentuh (Do-Not-Touch, AGENT.md Rule 5)

`apps/web/lib/auth.ts`, `apps/web/app/api/auth/**`, `apps/web/lib/session.ts`, `apps/web/middleware.ts`, `apps/web/lib/audit.ts`, `packages/db/prisma/schema.prisma` **model community yang sudah ada** (kecuali reverse-relation opsional `CommunityMember`), `packages/permissions/**`, `packages/workflow/**`, `packages/db/prisma/migrations/**` yang sudah ter-apply.

---

## Lampiran A — Urutan Subtask (untuk Orkestrator)

| Subtask | Isi | Output utama |
|---------|-----|--------------|
| **U** | Schema + migration + helper `nextAssetNumber` + Zod + api-messages + route-permissions + 7 route (internal + summary + portal) | API aset live, isolasi tenant & RBAC teruji |
| **V** | UI internal (tab, stat cards, filter, dual layout, form modal, delete, export, section ringkasan) + UI portal (read-only + quick-link) + loading/error | UI aset live |
| **W** | Seed 12 aset deterministik + print contract + verify section (l) + cleanup aset + smoke S37–S44 + i18n id/en | Kontrak seed & QA |
| **X** | Docs: COMMUNITY-MODULE roadmap + FEATURES + CURRENT + ADR draft tenancy (review founder) | Dokumentasi & keputusan tenancy |

Dependency: U → V → W berantai; X independen setelah U (docs menyusul implementasi). Tidak ada subtask yang menyentuh file Do-Not-Touch.

---

**Last Updated:** Session 75 — 14 Oktober 2026
**Maintainer:** Qalcuity AI Team — Architect mode
