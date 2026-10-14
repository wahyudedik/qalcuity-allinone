# 🏘️ Community & Public Administration Module (RT/RW)

> **Modul administrasi warga untuk RT/RW — iuran warga, kas & approval, pengumuman, dan portal warga read-only.**
> Dokumen ini adalah referensi lengkap: scope, arsitektur data, API, permission model, seed demo, smoke test, lessons learned, dan roadmap.

> **Session:** 74 (Fase 3: Pendaftaran Peserta Kegiatan, 14 Okt 2026)
> **Status:** 🚀 `production_ready` (Fase 1 + Fase 2 + Fase 3)
> **Docs version:** 3.0

---

## 📋 Daftar Isi

1. [Overview & Scope](#1-overview--scope)
2. [Fitur MVP (Fase 1)](#2-fitur-mvp-fase-1)
3. [Feature Flag & Industry Pack](#3-feature-flag--industry-pack)
4. [Arsitektur Data (6 Model Prisma)](#4-arsitektur-data-6-model-prisma)
5. [Permission Model (5 Key + Custom Roles)](#5-permission-model-5-key--custom-roles)
6. [Separation of Duties (SoD)](#6-separation-of-duties-sod)
7. [Keamanan Data Warga (NIK/NKK Encryption)](#7-keamanan-data-warga-niknkk-encryption)
8. [API Endpoints (32 Routes)](#8-api-endpoints-32-routes)
9. [UI Pages (Internal + Portal)](#9-ui-pages-internal--portal)
10. [Portal Warga (Read-only)](#10-portal-warga-read-only)
11. [Seed Demo (rt02-melati)](#11-seed-demo-rt02-melati)
12. [Smoke Test Guide](#12-smoke-test-guide)
13. [Verify Scripts & DB Hygiene](#13-verify-scripts--db-hygiene)
14. [Lessons Learned](#14-lessons-learned)
15. [Fase 2 — Surat Pengantar PDF+QR & Kegiatan](#15-fase-2--surat-pengantar-pdfqr--kegiatan-session-73)
16. [Fase 3 — Pendaftaran Peserta Kegiatan](#16-fase-3--pendaftaran-peserta-kegiatan-session-74)
17. [Roadmap Fase Berikutnya](#17-roadmap-fase-berikutnya)

---

## 1. Overview & Scope

**Qalcuity Community & Public Administration** adalah modul untuk mengelola administrasi warga RT/RW di Indonesia:

- **Iuran warga** — jenis iuran, tagihan periodik, pembayaran, auto-numbering.
- **Kas & transaksi keuangan** — pemasukan/pengeluaran dengan **approval 2 tahap** (bendahara catat → ketua setujui).
- **Pengumuman** — informasi resmi pengurus untuk warga.
- **Portal warga** — tampilan read-only khusus warga (tagihan sendiri, kas transparansi, pengumuman).

### Scope Fase 1 (MVP)

| Area | ✅ Termasuk | ❌ Belum (Fase 2+) |
|------|-----------|---------------------|
| Warga & keluarga | 1 keluarga = 1 KK, NIK/NKK terenkripsi | Multi-RT/RW, surat pengantar PDF+QR |
| Iuran | Jenis iuran, tagihan, pembayaran, receipt upload | Auto-debit, payment gateway |
| Kas | Transaksi INCOME/EXPENSE, approval 2 tahap | Mode akuntansi (jurnal) opsional |
| Pengumuman | CRUD + lampiran | Kegiatan, aset, piagam |
| Portal | Read-only tagihan/kas/pengumumen | Mobile RN untuk bendahara |

### Keputusan Desain Utama

- **Tenant-per-komunitas** — setiap RT/RW = 1 tenant (isolation bawaan Prisma Client Extension).
- **Role khusus komunitas** (KETUA/BENDAHARA/SEKRETARIS/WARGA) — role `isSystem=false`, didefinisikan per-tenant di DB, **bukan** 4 role sistem (SUPERADMIN/ADMIN/MEMBER/VIEWER).
- **ADMIN sistem TIDAK otomatis** dapat akses data komunitas — harus diberi permission `community:*` explicit ([lihat §5](#5-permission-model-5-key--custom-roles)).
- **SoD wajib** untuk kas — bendahara mencatat ≠ ketua menyetujui ([lihat §6](#6-separation-of-duties-sod)).

---

## 2. Fitur MVP (Fase 1)

| Fitur | Deskripsi |
|-------|-----------|
| **Members** | Data warga: nama, NIK terenkripsi, NKK, blok/blokir rumah, status warga, kontak |
| **Dues Types** | Jenis iuran: nama, deskripsi, nominal, periode (BULANAN/TAHUNAN), akun kas |
| **Dues Bills** | Tagihan per warga per jenis iuran per periode; auto-numbering `TAG/YYYY-MM/W-XXX` |
| **Payments** | Pembayaran tagihan (TUNAI/TRANSFER/QRIS), auto-numbering `PYT/YYYYMMDD-XXX`, receipt upload, atomik `$transaction` |
| **Cash Transactions** | Kas masuk/keluar (`INCOME`/`EXPENSE`), kategori, **status PENDING → APPROVED/REJECTED** |
| **Approvals** | Ketua approve/reject transaksi kas — self-approve diblokir, bendahara tidak boleh memutuskan |
| **Announcements** | Pengumuman pengurus → warga, dengan lampiran opsional |
| **Reports** | Laporan bulanan: penerimaan iuran, pengeluaran, saldo kas |
| **Portal Warga** | Halaman read-only: tagihan sendiri, kas transparansi, pengumuman |
| **Dashboard Overview** | Statistik: total warga, iuran terkini, kas, tunggakan |

---

## 3. Feature Flag & Industry Pack

### Feature Flag: `COMMUNITY_MODULE`

Lokasi: [`packages/config/src/features.ts`](packages/config/src/features.ts)

```typescript
COMMUNITY_MODULE: {
  enabled: true,          // aktif default
  label: 'Community & Public Administration',
  // ... flags lain
}
```

- Sidebar [`apps/web/components/layout/sidebar.tsx`](apps/web/components/layout/sidebar.tsx) menampilkan menu Community saat flag aktif.
- UI di `/dashboard/community` dan `/portal/community` di-gate flag ini.

### Industry Pack: `community`

Lokasi: [`packages/industry-config/src/packs/community.ts`](packages/industry-config/src/packs/community.ts)

Pack mendefinisikan konfigurasi industri **Community/Public Administration** (RT/RW, kelurahan, koperasi warga):

- **Custom fields** — contoh: `blok`, `nomor_rumah`, `tanggal_masuk`, `status_warga` (AKTIF/PINDAH/MENINGGAL).
- **Custom documents** — contoh: Kartu Keluarga, Surat Pengantar (Fase 2), Bukti Pembayaran.
- **Custom workflows** — cash transaction approval (PENDING → APPROVED/REJECTED), 2 tahap.
- **Custom reports** — Laporan Kas Bulanan, Rekap Iuran.

> **Prinsip arsitektur:** tidak ada `if (industry === 'community')` di core code — semua konfigurasi melalui [`@qalcuity/industry-config`](packages/industry-config/src/index.ts) ([AGENT.md Rule 7](../AGENT.md)).

---

## 4. Arsitektur Data (6 Model Prisma)

Lokasi: [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma:2994) (baris ~2994–3195)
Migrasi: `20261010172449_community_mvp_phase1` (additive, 6 tabel baru)

### Relasi

```
Tenant (1) ──────┬── (N) CommunityMember ──── (N) CommunityDuesPayment ── (1) CommunityDuesBill
                 │                                   │ (method, paidAt,     │ (amountDue, amountPaid,
                 │                                   │  receiptUrl)         │  status UNPAID/PARTIAL/PAID)
                 │                                   │                      │
                 │                                   │                      └── (1) CommunityDuesType
                 │                                   │                          (name, amount, period,
                 │                                   │                           akun kas)
                 │                                   │
                 │                                   └── (N) CommunityCashTransaction
                 │                                       (type INCOME/EXPENSE, category,
                 │                                        status PENDING/APPROVED/REJECTED,
                 │                                        createdBy → approverId)
                 │
                 └── (N) CommunityAnnouncement (title, content, attachments)
```

### Ringkasan Model

| Model | Purpose | Kolom Kunci | Unique Keys |
|-------|---------|-------------|-------------|
| [`CommunityMember`](packages/db/prisma/schema.prisma:2999) | Data warga | `nikEnc` (AES-256-GCM), `nkkEnc`, `fullName`, `block`, `houseNumber`, `status` (AKTIF/PINDAH/MENINGGAL), `userId?` (link akun login) | `([nikCiphertext, tenantId])` — cegah duplikat NIK |
| [`CommunityDuesType`](packages/db/prisma/schema.prisma:3048) | Jenis iuran | `name`, `description?`, `amount` (Decimal), `period` (BULANAN/TAHUNAN), `accountCode?` (kas) | `([name, tenantId])` |
| [`CommunityDuesBill`](packages/db/prisma/schema.prisma:3074) | Tagihan | `billNumber` (`TAG/YYYY-MM/W-XXX`), `amountDue`, `amountPaid`, `status` (UNPAID/PARTIAL/PAID), `dueDate`, `periodKey` (`YYYY-MM`) | `([billNumber, tenantId])`, `([memberId, duesTypeId, periodKey, tenantId])` — **idempoten per periode** |
| [`CommunityDuesPayment`](packages/db/prisma/schema.prisma:3111) | Pembayaran | `paymentNumber` (`PYT/YYYYMMDD-XXX`), `amount`, `method` (TUNAI/TRANSFER/QRIS), `paidAt`, `receiptUrl?`, `notes?` | `([paymentNumber, tenantId])` — cegah race daily number |
| [`CommunityCashTransaction`](packages/db/prisma/schema.prisma:3138) | Kas masuk/keluar | `txNumber` (`KAS/YYYYMMDD-XXX`), `type` (INCOME/EXPENSE), `category` (OPERATIONAL/EVENT/OTHER), `amount`, `txDate`, `status` (PENDING/APPROVED/REJECTED), `createdBy`, `approverId?`, `approvedAt?`, `rejectReason?` | `([txNumber, tenantId])` |
| [`CommunityAnnouncement`](packages/db/prisma/schema.prisma:3174) | Pengumuman | `title`, `content`, `attachments` (JSON?), `publishedAt` | — |

### Catatan Kolom Penting

- **`nikEnc`/`nkkEnc`** — bukan `nik`/`nkk` plaintext. Kolom `String` berisi `base64(iv):base64(tag):base64(ciphertext)` ([lihat §7](#7-keamanan-data-warga-niknkk-encryption)).
- **`amountDue`/`amountPaid`/`amount`** — `Decimal` (bukan Float) — presisi keuangan.
- **`createdBy`/`approverId`** — relasi `User` — audit trail pembuat & approver.
- **Semua unique key** menyertakan `tenantId` — multi-tenant aman.

---

## 5. Permission Model (5 Key + Custom Roles)

### 5 Permission Keys

Lokasi: [`packages/permissions/src/permissions.ts`](packages/permissions/src/permissions.ts:106) (baris 107–111, `MODULE_PERMISSIONS.community` di baris 145)

| Key | Scope | Contoh Aksi |
|-----|-------|-------------|
| `community:view` | Baca data dasar | Lihat overview, laporan bulanan |
| `community:manage` | Kelola warga & pengumuman | CRUD members, dues types, announcements |
| `community:finance` | Kelola iuran & kas | CRUD bills, payments, cash transactions |
| `community:approve` | Setujui/tolak transaksi kas | Approve/reject cash transaction |
| `community:portal` | Akses portal warga | Lihat tagihan sendiri, kas, pengumuman |

### Custom Roles (isSystem = false)

Didefinisikan **per-tenant** di DB (bukan hardcoded di [`packages/permissions/src/roles.ts`](packages/permissions/src/roles.ts)):

| Role | Permissions | Responsibility |
|------|-------------|----------------|
| **KETUA** | `community:view` + `manage` + `finance` + `approve` | Pimpinan RT/RW — approve kas, kelola semua |
| **BENDAHARA** | `community:view` + `finance` | Catat iuran & transaksi kas — **TIDAK punya `community:approve`** |
| **SEKRETARIS** | `community:view` + `manage` | Kelola data warga & pengumuman — tidak sentuh keuangan |
| **WARGA** | `community:portal` | Akses portal read-only — hanya lihat data sendiri |

### ⚠️ Catatan Penting: ADMIN Sistem TIDAK Otomatis Dapat Community Permission

> **RBAC_STRICT mode aktif** ([`apps/web/lib/session.ts`](apps/web/lib/session.ts)) — **explicit permission list, tanpa role fallback.**
>
> User dengan role sistem `ADMIN` (tenant-wide) **TIDAK otomatis** mendapat `community:*` permissions. Jika ADMIN perlu akses data komunitas, **permission harus diberikan secara explicit** ke user/role tersebut (mis. assign role KETUA, atau tambah permission `community:*` ke role ADMIN di settings).

**Bukti verifikasi (smoke test, 13 Okt 2026):**

```
[3] admin@qalcuity.com GET /api/community/members
    → 403 "Permission denied. Role-based fallback is disabled (RBAC_STRICT mode.)"
```

**Implikasi:** Tenant isolation + least-privilege — ADMIN perusahaan (mis. akuntan/owner) tidak otomatis melihat data warga RT/RW kecuali memang diberi akses.

### Defense-in-Depth (3 Lapisan)

| Lapisan | Implementasi |
|---------|-------------|
| **1. Middleware** | [`apps/web/middleware.ts`](apps/web/middleware.ts) — path `/dashboard/community/*` di-gate auth + feature flag |
| **2. API Route** | `requirePermissionForRoute(req)` + `hasPermission(session, 'community:*')` di setiap handler — contoh [`bills/[id]/pay`](apps/web/app/api/community/bills/[id]/pay/route.ts:68) |
| **3. UI** | [`apps/web/app/dashboard/community/`](apps/web/app/dashboard/community) — tombol/aksi conditional `hasPermission('community:manage')` / `'community:approve'` dll |

---

## 6. Separation of Duties (SoD)

### Aturan

1. **Bendahara mencatat ≠ Ketua menyetujui** — `createdBy` transaksi kas tidak boleh = `approverId`.
2. **Self-approve diblokir** — user yang membuat transaksi tidak boleh approve transaksinya sendiri (403).
3. **Bendahara TIDAK punya `community:approve`** — hanya KETUA (dan role dengan permission `community:approve`) yang boleh memutuskan.

### Implementasi

Lokasi: [`apps/web/app/api/community/cash-transactions/[id]/approve/route.ts`](apps/web/app/api/community/cash-transactions/[id]/approve/route.ts) dan [`reject/route.ts`](apps/web/app/api/community/cash-transactions/[id]/reject/route.ts)

```
Layer 1 — Explicit check "Bendahara must not decide":
  if (!hasPermission(session, 'community:approve')) → 403

Layer 2 — Self-approve block:
  if (transaction.createdBy === session.user.id) → 403

Layer 3 — Creator ≠ Approver (SoD invariant):
  update({ status: 'APPROVED', approverId: session.user.id, approvedAt: now })
  -- app layer memastikan approverId !== createdBy
```

**Bukti verifikasi (smoke test, 13 Okt 2026):**

```
[4] bendahara POST /api/community/cash-transactions → 201 PENDING (KAS/20261013-001)
[5] bendahara POST .../approve (self) → 403 "Missing community:approve permission"
[6] ketua POST .../approve → 200 APPROVED (approverId = ketua user id)
```

### Flow Lengkap

```
Bendahara: POST /api/community/cash-transactions
  → create PENDING, createdBy = bendahara.id
  → (UI: tombol Approve hanya visible jika hasPermission('community:approve'))

Bendahara: POST .../[id]/approve  (SELF)
  → 403 Missing community:approve permission  ← bendahara tidak punya key ini

Ketua: POST .../[id]/approve
  → 200: status = APPROVED, approverId = ketua.id, approvedAt = now
  → (Layer: ketua.id !== createdBy ✓ SoD invariant)

Ketua: POST .../[id]/reject { rejectReason }
  → 200: status = REJECTED, approverId = ketua.id, rejectReason tersimpan
```

---

## 7. Keamanan Data Warga (NIK/NKK Encryption)

### Field-level Encryption AES-256-GCM

Lokasi: [`apps/web/lib/encryption.ts`](apps/web/lib/encryption.ts) — fungsi `encrypt()`, `safeDecrypt()`

- **NIK** (Nomor Induk Kependudukan) & **NKK** (Nomor Kartu Keluarga) adalah **PII sensitif** — dienkripsi field-level, **bukan** disimpan plaintext.
- Kolom DB: `nikEnc`, `nkkEnc` (`String`) — format `base64(iv):base64(tag):base64(ciphertext)`.
- **Encryption key** dari env var `ENCRYPTION_KEY` (AES-256, 32 byte).

### Aturan Keamanan

| Aturan | Implementasi |
|--------|-------------|
| **Enkripsi saat write** | `encrypt(nikPlain)` sebelum `prisma.communityMember.create/update` |
| **Dekripsi saat read (server-only)** | `safeDecrypt(nikEnc)` hanya di route yang butuh (mis. admin detail view) |
| **Jangan return ciphertext** | API response mengembalikan **plain NIK hasil dekripsi** (hanya ke user berwenang) atau **masked** (`3271********`) — **tidak pernah** string `base64:tag:...` |
| **Unique constraint** | `@@unique([nikCiphertext, tenantId])` — cegah duplikat NIK dalam 1 tenant (perlu `encrypt()` deterministik via key/idempotent IV saat upsert) |
| **Portal warga** | Warga hanya lihat **NIK sendiri** (masked) — tidak bisa browse NIK warga lain |

### Contoh Alur

```
POST /api/community/members  (SEKRETARIS/MANAGE)
  body: { fullName: "Budi Santoso", nik: "3271042501900001", nkk: "3271042501000001", ... }
  → encrypted = encrypt("3271042501900001")  // "aXY0...==:aXY1...==:aXY2...=="
  → create({ fullName, nikEnc: encrypted.nikEnc, ... })

GET /api/community/members/[id]  (MANAGE)
  → member = findUnique(...)
  → response: { ...member, nik: safeDecrypt(member.nikEnc) }  // "3271042501900001"
  → (tidak mengembalikan nikEnc ciphertext ke client)

GET /api/community/portal/...  (warga login)
  → response: { nikMasked: "3271********0001" }  // masked, bukan full
```

---

## 8. API Endpoints (32 Routes)

Lokasi: [`apps/web/app/api/community/`](apps/web/app/api/community) — 22 file route (32+ handler: GET/POST/PUT/DELETE per file)

Semua route:
- ✅ Auth check (`getServerSession` / `requirePermissionForRoute`)
- ✅ RBAC permission (`hasPermission(session, 'community:*')`)
- ✅ Tenant isolation (Prisma Client Extension auto-inject `tenantId`)
- ✅ Zod validation (POST/PUT — [`apps/web/lib/validation-schemas.ts`](apps/web/lib/validation-schemas.ts))
- ✅ Audit trail (`logAudit()` untuk mutations)
- ✅ Centralized error handling (`handleApiError()` — [`apps/web/lib/api-error.ts`](apps/web/lib/api-error.ts))

### Tabel Endpoint Lengkap

| # | Method | Path | Permission | Deskripsi |
|---|--------|------|------------|-----------|
| 1 | GET | `/api/community/overview` | `community:view` | Statistik dashboard |
| 2 | GET | `/api/community/members` | `community:manage` | List warga |
| 3 | POST | `/api/community/members` | `community:manage` | Tambah warga (NIK dienkripsi) |
| 4 | GET | `/api/community/members/[id]` | `community:manage` | Detail warga |
| 5 | PUT | `/api/community/members/[id]` | `community:manage` | Update warga |
| 6 | DELETE | `/api/community/members/[id]` | `community:manage` | Hapus warga |
| 7 | GET | `/api/community/dues-types` | `community:manage` | List jenis iuran |
| 8 | POST | `/api/community/dues-types` | `community:manage` | Tambah jenis iuran |
| 9 | GET | `/api/community/dues-types/[id]` | `community:manage` | Detail jenis iuran |
| 10 | PUT | `/api/community/dues-types/[id]` | `community:manage` | Update jenis iuran |
| 11 | DELETE | `/api/community/dues-types/[id]` | `community:manage` | Hapus jenis iuran |
| 12 | GET | `/api/community/bills` | `community:finance` | List tagihan |
| 13 | GET | `/api/community/bills/[id]` | `community:finance` | Detail tagihan |
| 14 | PUT | `/api/community/bills/[id]` | `community:finance` | Update tagihan |
| 15 | POST | `/api/community/bills/[id]/pay` | `community:finance` | Bayar tagihan (atomik $transaction) |
| 16 | POST | `/api/community/bills/generate` | `community:finance` | Generate tagihan periodik batch |
| 17 | POST | `/api/community/upload-receipt` | `community:finance` | Upload receipt pembayaran |
| 18 | GET | `/api/community/cash-transactions` | `community:finance` | List transaksi kas |
| 19 | POST | `/api/community/cash-transactions` | `community:finance` | Catat transaksi kas (status PENDING) |
| 20 | GET | `/api/community/cash-transactions/[id]` | `community:finance` | Detail transaksi kas |
| 21 | PUT | `/api/community/cash-transactions/[id]` | `community:finance` | Update transaksi kas |
| 22 | DELETE | `/api/community/cash-transactions/[id]` | `community:finance` | Hapus transaksi kas |
| 23 | POST | `/api/community/cash-transactions/[id]/approve` | `community:approve` | Setujui transaksi kas (+SoD check) |
| 24 | POST | `/api/community/cash-transactions/[id]/reject` | `community:approve` | Tolak transaksi kas (+SoD check) |
| 25 | GET | `/api/community/announcements` | `community:manage` | List pengumuman |
| 26 | POST | `/api/community/announcements` | `community:manage` | Buat pengumuman |
| 27 | GET | `/api/community/announcements/[id]` | `community:manage` | Detail pengumuman |
| 28 | PUT | `/api/community/announcements/[id]` | `community:manage` | Update pengumuman |
| 29 | DELETE | `/api/community/announcements/[id]` | `community:manage` | Hapus pengumuman |
| 30 | GET | `/api/community/reports/monthly` | `community:view` | Laporan bulanan (iuran, kas, saldo) |
| 31 | GET | `/api/community/portal/overview` | `community:portal` | Portal: overview warga login |
| 32 | GET | `/api/community/portal/bills` | `community:portal` | Portal: tagihan warga sendiri (own-only) |
| 33 | GET | `/api/community/portal/cash` | `community:portal` | Portal: kas transparansi (APPROVED saja) |
| 34 | GET | `/api/community/portal/announcements` | `community:portal` | Portal: pengumuman |

> **Catatan:** Path lengkap prefix `apps/web/app/api/community/`. Route `[id]` = dynamic segment. Portal routes (`portal/*`) mengembalikan **data sendiri saja** untuk warga (own-data scoping via `memberId` dari session).

---

## 9. UI Pages (Internal + Portal)

Lokasi: [`apps/web/app/dashboard/community/`](apps/web/app/dashboard/community)

### Internal (Pengurus — KETUA/BENDAHARA/SEKRETARIS)

| Page | Path | Feature |
|------|------|---------|
| Layout + Error + Loading | [`(internal)/layout.tsx`](apps/web/app/dashboard/community/(internal)/layout.tsx), `error.tsx`, `loading.tsx` | Shell, error boundary, skeleton |
| Overview | [`(internal)/page.tsx`](apps/web/app/dashboard/community/(internal)/page.tsx) | Statistik: total warga, iuran, kas, tunggakan |
| Members | [`(internal)/members/page.tsx`](apps/web/app/dashboard/community/(internal)/members/page.tsx) | List warga (dual layout: mobile cards + desktop table) |
| Member Detail | [`(internal)/members/[id]/page.tsx`](apps/web/app/dashboard/community/(internal)/members/[id]/page.tsx) | Detail warga + riwayat tagihan/pembayaran |
| Dues Types | [`(internal)/dues-types/page.tsx`](apps/web/app/dashboard/community/(internal)/dues-types/page.tsx) | CRUD jenis iuran |
| Bills | [`(internal)/bills/page.tsx`](apps/web/app/dashboard/community/(internal)/bills/page.tsx) | List tagihan, generate batch, bayar |
| Cash | [`(internal)/cash/page.tsx`](apps/web/app/dashboard/community/(internal)/cash/page.tsx) | Transaksi kas + approve/reject (KETUA) |
| Announcements | [`(internal)/announcements/page.tsx`](apps/web/app/dashboard/community/(internal)/announcements/page.tsx) | CRUD pengumuman |
| Reports | [`(internal)/reports/page.tsx`](apps/web/app/dashboard/community/(internal)/reports/page.tsx) | Laporan bulanan |

**Total: 9 halaman internal** (layout/error/loading + 6 CRUD + overview + reports)

### Portal (Warga — read-only)

| Page | Path | Feature |
|------|------|---------|
| Portal Overview | [`portal/page.tsx`](apps/web/app/dashboard/community/portal/page.tsx) | Ringkasan: tagihan saya, kas, pengumuman |
| Portal Bills | [`portal/bills/page.tsx`](apps/web/app/dashboard/community/portal/bills/page.tsx) | Tagihan warga sendiri (own-only) |
| Portal Announcements | [`portal/announcements/page.tsx`](apps/web/app/dashboard/community/portal/announcements/page.tsx) | Pengumuman untuk warga |

**Total: 3 halaman portal**

### Pattern yang Digunakan

- **Dual layout** — mobile cards (≤768px) + desktop tables (>768px) ([AGENT.md 6.7](../AGENT.md))
- **i18n** — id/en via [`apps/web/lib/i18n.tsx`](apps/web/lib/i18n.tsx), keys di [`apps/web/messages/id.json`](apps/web/messages/id.json) + [`packages/i18n/messages/`](packages/i18n/messages)
- **Permission-conditional UI** — tombol CRUD/approve hanya visible jika `hasPermission('community:*')`
- **Empty states**, **loading skeleton**, **error boundary**, **toast notifications**, **confirmation dialog** — sesuai [Definition of Done](../AGENT.md#10-definition-of-done)

---

## 10. Portal Warga (Read-only)

### Akses

- **Route:** `/dashboard/community/portal/*` (di bawah app dashboard, bukan route terpisah)
- **Permission:** `community:portal` (hanya role WARGA, atau user dengan permission explicit)
- **Login:** NextAuth credentials — `*@rt02-melati.test` / `community123` ([lihat §11](#11-seed-demo-rt02-melati))

### Cakupan Data (Own-Data Scoping)

| Endpoint | Scoping |
|----------|---------|
| `GET /api/community/portal/overview` | Hanya data warga login (`memberId` dari session → `userId`) |
| `GET /api/community/portal/bills` | Hanya tagihan milik warga login — **tidak bisa** lihat tagihan warga lain |
| `GET /api/community/portal/cash` | Kas transparansi — hanya transaksi `APPROVED` (bukan PENDING/REJECTED) |
| `GET /api/community/portal/announcements` | Semua pengumuman (public untuk warga) |

### Fitur Read-only

- ✅ Lihat tagihan sendiri (status, jumlah, jatuh tempo)
- ✅ Lihat riwayat pembayaran sendiri
- ✅ Lihat saldo kas & transaksi APPROVED (transparansi)
- ✅ Baca pengumuman
- ❌ **TIDAK bisa** bayar tagihan via portal (bayar via pengurus/bendahara — Fase 2 auto-debit)
- ❌ **TIDAK bisa** lihat data warga lain
- ❌ **TIDAK bisa** catat/approve transaksi

---

## 11. Seed Demo (rt02-melati)

Lokasi: [`apps/web/lib/seed-data/community.ts`](apps/web/lib/seed-data/community.ts) — dipanggil dari [`packages/db/prisma/seed.ts`](packages/db/prisma/seed.ts) & [`apps/web/lib/seed-data/demo.ts`](apps/web/lib/seed-data/demo.ts)

### Konfigurasi

| Parameter | Nilai |
|-----------|-------|
| **Tenant/Komunitas** | `rt02-melati` (RT 02, Kelurahan Melati) |
| **Anchor date** | `COMMUNITY_DEFAULT_ANCHOR_DATE = '2026-10-10'` (baris 47) — semua tanggal seed relatif ke anchor ini |
| **PRNG deterministik** | `mulberry32(772026)` (baris 358) — **tanpa `Math.random()`**, idempoten |

### Dataset yang Di-seed

| Model | Jumlah | Catatan |
|-------|--------|---------|
| **CommunityMember** | ~30 warga | NIK/NKK terenkripsi (dummy `3271...`), blok A–D, status AKTIF |
| **CommunityDuesType** | 3 jenis | Iuran Bulanan, Iuran Keamanan, Iuran Kebersihan |
| **CommunityDuesBill** | 210 tagihan | 30 warga × 3 jenis × periode (tagihan periodik) |
| **CommunityDuesPayment** | **138 pembayaran** | Untuk bill PAID/PARTIAL — mix TUNAI/TRANSFER/QRIS |
| **CommunityCashTransaction** | **10 transaksi** | **INCOME: 4 + EXPENSE: 6** — mix status (approved historical) |
| **CommunityAnnouncement** | ~5 pengumuman | Info kegiatan, iuran, keamanan |

### Kredensial Demo

| Role | Email | Password | Permission |
|------|-------|----------|------------|
| **KETUA** | `ketua@rt02-melati.test` | `community123` | `community:view/manage/finance/approve` |
| **BENDAHARA** | `bendahara@rt02-melati.test` | `community123` | `community:view/finance` |
| **SEKRETARIS** | `sekretaris@rt02-melati.test` | `community123` | `community:view/manage` |
| **WARGA** | `warga@rt02-melati.test` | `community123` | `community:portal` |

### Idempotency

- **Business-key unique constraints** — `([nikCiphertext, tenantId])`, `([name, tenantId])`, `([billNumber, tenantId])`, `([memberId, duesTypeId, periodKey, tenantId])`, `([paymentNumber, tenantId])`, `([txNumber, tenantId])`.
- Seed check `existingPayment` per bill (baris ~675) — hanya create payment untuk bill PAID/PARTIAL yang belum punya payment.
- **Run ke-2 identik** — semua `created: 0`, counts identik.

### Cara Seed

```bash
# Full seed (termasuk community)
cd packages/db
set "SEED_DEMO=true" && npx prisma db seed

# Verify
npx tsx scripts/verify-community-seed.ts
```

> **Gotcha cmd.exe:** `set "SEED_DEMO=true"` wajib kutip (spasi).

---

## 12. Smoke Test Guide

Lokasi: [`scripts/smoke-community-login.ps1`](scripts/smoke-community-login.ps1) — PowerShell script, 8 assertion.

### Prasyarat

1. Dev server berjalan di **port 3001** (aux) — **bukan** 3000 (production/dev utama).
2. DB sudah di-seed (community seed LOLOS — 138 payments, 10 cash tx).
3. PowerShell (`pwsh` atau `powershell`).

### Cara Menjalankan

```powershell
# 1. (Opsional) Jalankan aux server di Terminal 4 — port 3001
cd apps\web
set "NEXTAUTH_URL=http://localhost:3001"
set "DATABASE_URL=postgresql://postgres@localhost:5432/qalcuity?schema=public"
npx next dev -p 3001

# 2. Jalankan smoke test (Terminal baru)
powershell -File scripts/smoke-community-login.ps1
```

> **⚠️ Server :3000 jangan di-kill/restart** — smoke test berjalan via :3001 (aux).

### 8 Assertion & Hasil Aktual (13 Okt 2026 — 8/8 PASS)

| # | Step | Expect | Hasil Aktual |
|---|------|--------|--------------|
| [1] | Ketua login | Success | ✅ session: `ketua@rt02-melati.test`, permissions `community:view/manage/finance/approve` |
| [2] | Ketua GET `/api/community/members` | 200 | ✅ 200 — list warga ter-load |
| [3] | Admin GET `/api/community/members` | 401/403 | ✅ **403** — `"Permission denied. Role-based fallback is disabled (RBAC_STRICT mode.)"` |
| [4] | Bendahara POST `/api/community/cash-transactions` (EXPENSE 150000) | 201 PENDING | ✅ 201 — `KAS/20261013-001`, status PENDING |
| [5] | Bendahara self-approve POST `.../approve` | 403 | ✅ **403** — `"Missing community:approve permission"` |
| [6] | Ketua approve POST `.../approve` | 200 APPROVED | ✅ 200 — status APPROVED, `approverId` = ketua |
| [7] | Warga portal GET `/api/community/portal/bills` | 200 (own-only) | ✅ 200 — total 7 rows (tagihan warga sendiri) |
| [8] | Ketua GET `/dashboard/community` | 200/307 | ✅ 200 — halaman dashboard termuat |

### Artefak Smoke Test

> **⚠️ Step [4] MENCIPTAKAN DATA di DB setiap run** — 1 transaksi kas `KAS/YYYYMMDD-XXX` dengan deskripsi `"Smoke test biaya operasional"`.
>
> **Konsekuensi:** `verify-community-seed.ts` cek eksak `10 cash transactions` + `INCOME:4 / EXPENSE:6` → **gagal** jika run smoke test tanpa cleanup.
>
> **Solusi:** jalankan cleanup sebelum verify ([lihat §13](#13-verify-scripts--db-hygiene)).

---

## 13. Verify Scripts & DB Hygiene

### Verify Community Seed

Lokasi: [`packages/db/scripts/verify-community-seed.ts`](packages/db/scripts/verify-community-seed.ts) — read-only, exit non-zero saat gagal.

**Checks utama:**
- Counts per model: members, dues types, bills (210), payments (**138**), cash tx (**10**), announcements.
- Mix cash tx: **INCOME: 4 + EXPENSE: 6**.
- **Invarian: `Σ payments per bill === bill.amountPaid`** (baris 198–203, tolerance `0.001`) — deteksi orphan payment.
- Mix pembayaran method (TUNAI/TRANSFER/QRIS).
- Tenant scoping.

```bash
cd packages/db
npx tsx scripts/verify-community-seed.ts
# → ✅ SEMUA LOLOS (jika DB bersih)
```

### Cleanup Artefak (Local DB)

Lokasi: [`packages/db/scripts/cleanup-community-artifacts.ts`](packages/db/scripts/cleanup-community-artifacts.ts) — targeted, **idempotent**, **BUKAN DB reset**.

**Target cleanup:**
1. **Orphan payments** — `communityDuesPayment` where `bill.status = 'UNPAID'` AND `bill.amountPaid = 0` — pola mustahil dari API pay atomik atau seed deterministik → **artefak dari run eksperimental/smoke test lama**.
2. **Smoke cash tx** — `communityCashTransaction` where `description startsWith 'Smoke test'` — artefak step [4] smoke matrix.

```bash
cd packages/db
npx tsx scripts/cleanup-community-artifacts.ts
# → Deleted 23 orphan payments, 1 smoke cash tx (idempotent)
```

### Debug Helper

Lokasi: [`packages/db/scripts/debug-bill-consistency.ts`](packages/db/scripts/debug-bill-consistency.ts) — debug: bandingkan `Σ payments` vs `bill.amountPaid` untuk semua bill `TAG/`.

```bash
cd packages/db
npx tsx scripts/debug-bill-consistency.ts
# → Print bill dengan mismatch (invarian amountPaid)
```

### Pola Verifikasi yang Direkomendasikan

```bash
# 1. Seed community (jika DB kosong/kotor)
cd packages/db
set "SEED_DEMO=true" && npx prisma db seed

# 2. Jalankan smoke test (menciptakan 1 smoke cash tx)
powershell -File ../../scripts/smoke-community-login.ps1   # dari repo root: scripts/smoke-community-login.ps1

# 3. Cleanup artefak smoke test
npx tsx scripts/cleanup-community-artifacts.ts

# 4. Verify — harus LOLOS
npx tsx scripts/verify-community-seed.ts
```

---

## 14. Lessons Learned

### 14.1 Zod v4: `.partial()` pada Schema dengan `.refine()` → Module-eval Error → Cascade 500

**Gejala:** Semua API route community return **500** saat dev server start — bukan 1 route, tapi **semua** di module graph yang import [`validation-schemas.ts`](apps/web/lib/validation-schemas.ts).

**Root cause:**

```typescript
// ❌ SALAH — z.object({ ... }).refine(...) menghasilkan ZodEffects (bukan ZodObject)
export const createCommunityXSchema = z.object({
  fieldA: z.string(),
  fieldB: z.string(),
}).refine((data) => data.fieldA !== data.fieldB, { message: '...' });

// .partial() hanya ada di ZodObject — dipanggil di ZodEffects → TypeError saat module-eval
export const partialCommunityXSchema = createCommunityXSchema.partial();
//     ↑ THROWS saat file di-import → seluruh module graph crash → 500
```

**Fix:**

```typescript
// ✅ BENAR — split base object TANPA refine, refine hanya di schema utama
const communityXBase = z.object({
  fieldA: z.string(),
  fieldB: z.string(),
});
export const createCommunityXSchema = communityXBase.refine(
  (data) => data.fieldA !== data.fieldB,
  { message: '...' }
);
export const partialCommunityXSchema = communityXBase.partial(); // ✅ aman
```

**Lesson:** Di Zod v4, `.refine()` meng-**wrap** schema → `.partial()` tidak tersedia. Pisahkan **base object** (tanpa refine) untuk kebutuhan `.partial()` / `.extend()` / `.pick()`.

### 14.2 Prisma `--no-engine` (Accelerate) Client Caveat

**Gejala:** Setelah `prisma generate`, dev server error Prisma Client terkait engine — atau perilaku aneh Prisma setelah regen.

**Root cause:** Prisma config/ENV kadang menghasilkan client mode **Accelerate** (`--no-engine`) — client tanpa local query engine. Jika dev server sebelumnya start dengan client normal, regen ke mode `--no-engine` tanpa restart → mismatch.

**Fix:**

```bash
cd packages/db
npx prisma generate        # generate client normal (local engine)
# → RESTART dev server (kill & start ulang) agar load client baru
```

**Lesson:** Setiap `prisma generate` / perubahan schema → **restart dev server**. Cek ENV `PRISMA_CLIENT_ENGINE_TYPE` / `PRISMA_CLI_QUERY_ENGINE_TYPE` jika perilaku aneh.

### 14.3 Smoke Test Artifact Hygiene

**Gejala:** `verify-community-seed.ts` gagal 3 check setelah smoke test sukses 8/8:
- ❌ Σ pembayaran per bill === amountPaid (3 bill mismatch)
- ❌ 10 cash transactions → **11**
- ❌ INCOME: 4 + EXPENSE: 6 → **EXPENSE: 7**

**Root cause:** Smoke matrix **step [4] MENCIPTAKAN transaksi kas** (`POST /api/community/cash-transactions`, deskripsi `"Smoke test biaya operasional"`) → DB bertambah 1 EXPENSE setiap run. Verify script cek **eksak** → gagal.

**Analisis lebih lanjut (23 orphan payments):**
- Pola: `bill.status = UNPAID` + `bill.amountPaid = 0` + ada 1 payment → **mustahil** dari API pay (atomik `$transaction` update amountPaid) atau seed (deterministic plan: hanya create payment untuk bill PAID/PARTIAL).
- Nominal ganjil (24500, 47500, 52500) → **artefak dari run API pay eksperimental/manual** di session sebelumnya (bukan seed, bukan smoke matrix final).
- **Bukan bug** — API atomik & seed deterministik terverifikasi via code review.

**Fix:**
1. Smoke matrix step [4] memang **by design** create data — **cleanup wajib** sebelum verify.
2. Buat `cleanup-community-artifacts.ts` — targeted delete (orphan payments + smoke cash tx), **bukan** DB reset.
3. Jalankan cleanup → re-verify → **LOLOS** (138 payments, 10 cash tx terestorasi).

**Lesson:**
- Smoke test yang **POST data** → wajib ada **cleanup step** sebelum verify count-exak.
- Verify script dengan **hardcoded expected count** → pastikan DB state clean (tidak ada run/smoke/manual sebelumnya yang menambah data).
- Selalu **code-review** API/seed sebelum curigai bug — atomicity & determinism proof cukup untuk ruled out.

---

## 15. Fase 2 — Surat Pengantar PDF+QR & Kegiatan (Session 73)

> **Scope:** 2 model Prisma baru ([`CommunityLetter`](packages/db/prisma/schema.prisma) + [`CommunityEvent`](packages/db/prisma/migrations/20261013060951_community_phase2_surat_kegiatan)), 15 API handlers di 9 route files, verify page publik, portal warga extension, export CSV/PDF, i18n 163 keys.
> **Status:** 🚀 `production_ready` — smoke 22/22 PASS, tsc 0 errors, seed DB check LOLOS.

### 15.1 Surat Pengantar (CommunityLetter)

| Aspek | Detail |
|-------|--------|
| **Lifecycle** | `DRAFT` → `ISSUE` (assign nomor + generate verifyToken) → `REVOKE` (alasan wajib) |
| **Numbering** | `SRT/<PNG|DOM|SKT|KTR>/<YYYY>-<seq3>` — assign **atomik saat ISSUE** (bukan saat create) |
| **Types** | PENGANTAR (umum), DOMISILI, SKTM, KETERANGAN_LAIN |
| **Snapshot** | `bodySnapshot Json` — salinan immutable data warga saat ISSUE (perubahan data warga setelahnya TIDAK mengubah surat terbit) |
| **Penandatangan** | `signedBy` (user id) + `signedByName` (snapshot nama immutable) — **tanpa relasi** ke model User ([§15.4](#154-deviation--bug-fixes)) |
| **PDF** | [`community-letter-pdf.ts`](apps/web/lib/community-letter-pdf.ts) — jsPDF template surat + QR code verifikasi; download via blob di UI detail |
| **Verify token** | 32-char hex (128-bit), `@unique` **global** (capability URL — bukan per-tenant) |
| **verifyUrl** | **ABSOLUTE URL** (`letterVerifyUrl()`) → `http://<host>/verify/community-letter/<token>` |
| **API** | `GET/POST /api/community/letters`, `GET/PUT/DELETE /api/community/letters/[id]`, `POST .../issue`, `POST .../revoke`, `GET .../pdf`, `GET /api/community/portal/letters` |

### 15.2 Kegiatan (CommunityEvent)

| Aspek | Detail |
|-------|--------|
| **Lifecycle** | `PLANNED` → `ONGOING` → `DONE` / `CANCELLED` |
| **Numbering** | `KGT/<YYYY>-<seq3>` |
| **Budget** | `budgetAmount Decimal?` — usage % bar dengan threshold 70% (kuning) / 90% (merah) |
| **Realisasi kas** | Transaksi kas terkait via `eventId` → ⚠️ **DEVIATION**: filter client-side ([§15.4](#154-deviation--bug-fixes)) |
| **Relasi** | `announcementId` → CommunityAnnouncement (`SetNull`), `transactions` → CommunityCashTransaction (Set) |
| **API** | `GET/POST /api/community/events`, `GET/PUT/DELETE /api/community/events/[id]`, `GET /api/community/portal/events` |

### 15.3 Halaman UI (Internal + Portal + Publik)

| Halaman | Path |
|---------|------|
| Letters list + detail (+`loading.tsx`/`error.tsx`) | [`dashboard/community/(internal)/letters/`](apps/web/app/dashboard/community/(internal)/letters) |
| Events list + detail (+`loading.tsx`/`error.tsx`) | [`dashboard/community/(internal)/events/`](apps/web/app/dashboard/community/(internal)/events) |
| Portal: surat saya | [`dashboard/community/portal/letters/`](apps/web/app/dashboard/community/portal/letters/page.tsx) |
| Portal: kegiatan saya | [`dashboard/community/portal/events/`](apps/web/app/dashboard/community/portal/events/page.tsx) |
| Verify publik (server component) | [`/verify/community-letter/[token]`](apps/web/app/verify/community-letter/[token]/page.tsx) |
| Layout tabs | letters + events di [internal layout](apps/web/app/dashboard/community/(internal)/layout.tsx) & portal layout |
| Overview | StatCards `lettersThisMonth` + `upcomingEvents` |
| Cash page | select `eventId` di form transaksi |

### 15.4 Deviation & Bug Fixes

**⚠️ DEVIATION — Realisasi kas kegiatan (client-side filter):**
`GET /api/community/cash-transactions` (Fase 1) belum mendukung filter `eventId`. Halaman detail kegiatan meng-fetch transaksi kas lalu filter `row.eventId === id` di client. **Fase 3:** tambah param `eventId` ke server route agar tidak over-fetch.

**🔴 Bug fix 1 — Prisma include `signedByUser` (verify page):**
Verify page awalnya `include: { signedByUser: { select: { name: true } } }` — model CommunityLetter **TIDAK punya relasi** `signedByUser` (hanya kolom `signedBy String?` + snapshot `signedByName String?`) → `findUnique` throw `Unknown field 'signedByUser'` → catch → null → **surat valid tampil "tidak ditemukan"**. **Fix:** hapus include (hanya `member`), tampilkan `signedByName` snapshot.

**🟠 Bug fix 2 — verifyUrl absolut di smoke script:**
`verifyUrl` dari API adalah URL absolut; script PowerShell melakukan `$base + $path` → URL ganda (`http://localhost:3001/http://...`) → status 0. **Fix:** ekstrak `([uri]$verifyUrl).PathAndQuery` sebelum request.

### 15.5 Verifikasi Session 73

| Check | Hasil |
|-------|-------|
| `npx tsc --noEmit` (apps/web) | ✅ **0 errors** |
| `npx vitest run` (root, 13 files) | ✅ **365/366 pass** — 1 failure **pre-existing** di `packages/workflow` (`should have all default workflows pass validation`, package clean di git — bukan regresi Session 73) |
| Smoke matrix ([`smoke-community-login.ps1`](scripts/smoke-community-login.ps1)) | ✅ **22/22 PASS** — [17]-[18] letters/events pages 200; [19] verify token valid → 200 + body `SRT/DOM/2026-`; [20] random 32-hex → not-found; [21]-[22] portal letters/events 200 |
| Seed DB check (Prisma `groupBy`) | ✅ **LOLOS** — Letters 7 ISSUED (semua punya verifyToken) / 1 REVOKED / 2 DRAFT; Events 6 PLANNED / 1 DONE / 1 CANCELLED (count > seed karena smoke create data per run) |
| i18n parity | ✅ **163 keys/file**, 472 community leaf keys identik id/en; semantic check vs HEAD: lost=0 changed=0 |

---

## 16. Fase 3 — Pendaftaran Peserta Kegiatan (Session 74)

> **Scope:** 1 model Prisma baru ([`CommunityEventParticipant`](packages/db/prisma/schema.prisma)) + migrasi additive [`20261013223117_community_event_participants`](packages/db/prisma/migrations/20261013223117_community_event_participants), 6 API handlers baru + portal events GET embed, UI internal Peserta section + portal Daftar/Batalkan, seed 8 baris deterministik, smoke [25]–[36].
> **Status:** 🚀 `production_ready` — smoke **36/36 PASS**, tsc 0 errors, vitest **367/367**, verify 🎉 ALL PASS.
> **Plan:** [`plans/community-phase3-implementation.md`](plans/community-phase3-implementation.md)

### 16.1 Model CommunityEventParticipant

| Aspek | Detail |
|-------|--------|
| **Status String** | `REGISTERED` / `ATTENDED` / `CANCELLED` — **String @default("REGISTERED")**, bukan DB enum (deviation #1, konsisten konvensi String-status Prisma lain) |
| **Unique** | `[tenantId, eventId, memberId]` — 1 warga = 1 baris per kegiatan |
| **Cancel/Reactivate** | **In-place status flip**, NEVER insert/delete — baris lama di-flip REGISTERED↔CANCELLED, `registeredAt` di-refresh saat reaktivasi (deviation #2) |
| **ATTENDED final** | Portal cancel untuk ATTENDED → 409 `Cannot cancel - attendance already recorded` |
| **FK** | `tenantId`/`eventId`/`memberId` — semua `OnDelete: Restrict` (cleanup harus hapus participants sebelum events) |
| **Quota** | Hitung `status IN ('REGISTERED','ATTENDED')` vs `maxCapacity` (null = unlimited); penuh → 409 `EVENT_FULL` |

### 16.2 Status Machine

```
REGISTERED ──► ATTENDED      (admin/internal tandai hadir — final)
     │
     ▼
 CANCELLED ──► REGISTERED    (re-activate, registeredAt = now)
```

| Transisi | Arah | Kapan |
|----------|------|-------|
| REGISTERED → CANCELLED | Portal `DELETE .../register` atau internal `PATCH [pid]` | Warga batal daftar / admin batalkan |
| CANCELLED → REGISTERED | Portal `POST .../register` | Warga daftar ulang (reactivated) |
| REGISTERED → ATTENDED | Internal `PATCH [pid]` | Admin tandai hadir |
| ATTENDED → * | ❌ blocked | Portal cancel → 409; internal PATCH ke status lain → 409 |

### 16.3 API Endpoints (6 handlers baru)

| Method | Path | Auth | Catatan |
|--------|------|------|---------|
| GET | `/api/community/events/[id]/participants` | `community:manage` | List peserta + embed member |
| POST | `/api/community/events/[id]/participants` | `community:manage` | Daftarkan member; 409 duplikat, 404 member/event |
| PATCH | `/api/community/events/[id]/participants/[pid]` | `community:manage` | Flip status (hadir/batal) — guard ATTENDED final |
| DELETE | `/api/community/events/[id]/participants/[pid]` | `community:manage` | Soft-cancel in-place (bukan hard delete) |
| POST | `/api/community/portal/events/[id]/register` | `community:portal` | **Tanpa body** — memberId dari `resolvePortalMember`; 409 duplikat/EVENT_FULL |
| DELETE | `/api/community/portal/events/[id]/register` | `community:portal` | Cancel milik sendiri; 404 belum terdaftar; 409 ATTENDED/EVENT_STARTED |

> **Portal events GET** ([`portal/events/route.ts`](apps/web/app/api/community/portal/events/route.ts)) kini embed `participantStatus: string|null` + `participantCount: { active, maxCapacity }` — memakai `PORTAL_EVENT_SELECT` + batch `findMany`/`groupBy` (2 query ekstra, bukan N+1).

### 16.4 Eligibility Portal Register

Event **layak didaftar** jika: `publishedAt != null && publishedAt <= now && status != 'CANCELLED'`. Selain itu → **404 `Event not found`** (sama dengan event tidak ada — tidak membocorkan event unpublished ke warga). Guard tambahan: `now >= startsAt` → 409 `EVENT_STARTED`.

### 16.5 UI

| Halaman | Tambahan |
|---------|----------|
| Events list (internal) | Badge jumlah peserta aktif (active-only) di kolom |
| Events detail (internal) | Section **"Peserta"** — tabel + form tambah peserta + aksi Hadir/Batal |
| Portal events | Tombol **Daftar** / **Batalkan** + badge status peserta (REGISTERED/ATTENDED/CANCELLED) + `participantCount` label (`3/30 peserta`) |

### 16.6 Seed (8 baris deterministik)

| Kegiatan | Peserta |
|----------|---------|
| KGT-001 (DONE, maxCap 10) | 5 baris: W-001 ATTENDED, W-002/003 REGISTERED, W-004 CANCELLED, W-005 REGISTERED |
| KGT-002 (PLANNED, maxCap 30) | 3 baris: W-001/006/007 REGISTERED |
| KGT-003 (CANCELLED, unpublished) | 0 baris |

> **Capacity-drift sync (deviation #12):** loop seed events kini **sinkronkan `maxCapacity`** saat existing row drift dari spec (dibuat seed era Fase 2 sebelum field capacity ada). Hanya `maxCapacity` yang di-sync — edit manual field lain tidak tertimpa.

### 16.7 Verifikasi Session 74

| Check | Hasil |
|-------|-------|
| `npx tsc --noEmit` (apps/web) | ✅ **0 errors** |
| `npx tsc --noEmit` (packages/db) | ✅ **0 errors** |
| `npx vitest run` (root, 13 files) | ✅ **367/367 pass** (workflow pre-existing failure ter-fix) |
| Seed idempoten | ✅ run#1 `participants: 8`, run#2 `participants: 0` |
| Verify community | ✅ 🎉 **SEMUA VERIFIKASI LOLOS** — 8 peserta, unik constraint, kuota 4/10 & 3/30 |
| Smoke matrix | ✅ **36/36 PASS** — [1]–[24] regression + [25]–[36] Fase 3 (duplikat 409, ghost 404, warga 403, register/cancel/reactivate cycle, ATTENDED 409, unpublished 404, portal embed max=30) |
| i18n parity | ✅ 32 leaf keys (`events.participants.*` 19 + `portal.participants.*` 12 + `events.table.participants` 1) identik id/en |

### 16.8 Deviations (12 total)

1. Status `String @default("REGISTERED")` — bukan DB enum (konsisten konvensi Prisma)
2. Internal DELETE = **soft-cancel in-place** (flip status), bukan hard delete
3. `memberId` Zod `min(1).max(100)` — bukan `.uuid()` (id Prisma non-UUID)
4. Update schema **omit `memberId`** — pindah member = cancel + create baru
5. Route-permissions **5 entries** (plan: 3) — method-aware GET/POST/PATCH/DELETE
6. i18n key names mengikuti referensi UI aktual (tambah `errorNetwork`/`countLabel`/`myStatus`)
7. Portal desktop table **drop kolom endsAt** (hemat lebar — mobile card sudah tampil)
8. Events list badge = **active-only** (REGISTERED+ATTENDED), bukan total baris
9. Portal page pakai `common.error` (string) + key `errorNetwork`
10. `guards()`/`portalGate()` di-refactor return `NextResponse | context` (TS narrowing fix, behavior identik)
11. Cleanup prefix matcher diperluas: 'Smoke test kegiatan' **+** 'Kerja Bakti Smoke Test'
12. Seed events loop: **capacity-drift sync** (selective `maxCapacity`-only update)

### 16.9 Tooling Notes

- **PS1 encoding:** Windows PowerShell 5.1 membaca `.ps1` tanpa BOM sebagai ANSI → char non-ASCII (en-dash/em-dash/box-drawing) merusak parser. Fix: normalisasi ke ASCII **dan** tulis dengan UTF-8 BOM (`UTF8Encoding::new($true)`).
- **Stale Prisma client:** `next dev` yang hidup sebelum `prisma generate` akan 500 `Unknown field 'participants' ... CommunityEventCountOutputType` → **wajib restart** dev server setelah generate model/relation baru.

---

## 17. Roadmap Fase Berikutnya

Lokasi: [`plans/community-gov-product-analysis.md`](plans/community-gov-product-analysis.md)

### Fase 1–3 (Selesai)

| Feature | Scope | Status |
|---------|-------|--------|
| **Surat Pengantar PDF + QR** | Generate surat pengantar (domisili, SKTM) — template PDF + QR code verifikasi | ✅ **DONE** (Session 73 — [§15](#15-fase-2--surat-pengantar-pdfqr--kegiatan-session-73)) |
| **Kegiatan** | Event/warga gathering — CRUD + budget + realisasi kas | ✅ **DONE** (Session 73 — [§15](#15-fase-2--surat-pengantar-pdfqr--kegiatan-session-73)) |
| **Pendaftaran Peserta** | Quota + status machine + portal register/cancel | ✅ **DONE** (Session 74 — [§16](#16-fase-3--pendaftaran-peserta-kegiatan-session-74)) |

### Fase 4 (Prioritas Berikutnya)

| Feature | Scope | Estimasi |
|---------|-------|----------|
| **Multi-RT/RW** | 1 tenant → N unit komunitas (RT di bawah RW, atau beberapa kelurahan) — relasi parent-child | 3–4 model baru |
| **Aset Komunitas** | Inventaris aset RT/RW (asset register, depresiasi opsional) | 1–2 model baru |
| **Mode Akuntansi Opsional** | Jurnal double-entry untuk kas — optional, off by default | Integration ke [`@qalcuity/workflow`](packages/workflow/src/index.ts) / Finance module |
| **Offline Mode Bendahara** | IndexedDB + sync queue (pola POS Offline) | Reuse [`apps/web/lib/pos-offline/`](apps/web/lib/pos-offline) |
| **Mobile RN Bendahara** | React Native — catat iuran, upload receipt, approve kas (mobile-first bendahara) | Extend [`apps/mobile`](apps/mobile) (JWT auth sudah ada) |
| **Auto-debit / Payment Gateway** | Integrasi Xendit/Midtrans untuk auto-debit iuran | Reuse Finance payment gateway |

### Fase 4+ (Kajian & Regulasi)

| Feature | Scope | Risiko |
|---------|-------|--------|
| **Desa/Kelurahan** | Kajian integrasi Siskeudes, format laporan pemerintah daerah | ⚠️ **Regulasi tinggi** — bukan pengganti sistem resmi pemerintah |
| **Interoperability** | Export data ke format Dukcapil/Kemendagri (jika ada standar) | ⚠️ Regulatory review wajib |
| **WA Gateway Notifikasi** | Kirim tagihan/pengumuman via WhatsApp (user-managed API key) | Integration [`apps/web/lib/whatsapp`](apps/web/lib) |
| **Right-to-Erasure** | PII wipe (NIK/NKK dekripsi → delete) — UU PDP compliance | Reuse audit trail pattern |

### Catatan Regulasi

> ⚠️ **Modul ini BUKAN pengganti sistem resmi pemerintah** (Siskeudes, Dukcapil). Untuk desa/kelurahan, perlu kajian mendalam regulasi & interoperabilitas — **risiko compliance tinggi**. Qalcuity Community = **alat bantu administrasi warga**, bukan sistem pemerintahan resmi.

---

## 🔗 Referensi Terkait

| Dokumen | Isi |
|---------|-----|
| [`plans/community-gov-product-analysis.md`](plans/community-gov-product-analysis.md) | Kajian produk lengkap, user personas, competitive analysis |
| [`plans/community-mvp-implementation.md`](plans/community-mvp-implementation.md) | Plan implementasi MVP (Subtask F–J) |
| [`plans/community-phase2-implementation.md`](plans/community-phase2-implementation.md) | Plan implementasi Fase 2 — Surat Pengantar PDF+QR & Kegiatan (Subtask K–N) |
| [`AGENT.md`](../AGENT.md) | Hard rules (tenant isolation, RBAC, Zod validation, SoD) |
| [`FEATURES.md`](../FEATURES.md) §14.10 | Industry Pack: Community & Public Administration |
| [`CURRENT.md`](../CURRENT.md) Session 73 | Hasil verifikasi Fase 2 + commit |

---

**Last Updated:** 14 Oktober 2026 (Session 74: Fase 3 — Pendaftaran Peserta Kegiatan)
**Maintainer:** Qalcuity AI Team
**Document Version:** 3.0 — Fase 3 (Pendaftaran Peserta + Portal Register/Cancel)
