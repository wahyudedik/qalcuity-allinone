# Session 83 — Audit & Perbaikan i18n Keys (Orphan Root-Level + Missing Keys)

**Tanggal:** 16 Oktober 2026
**Status:** Siap implementasi
**Trigger:** User melaporkan `hr.overview.birthdayNotAvailable` / `hr.overview.birthdayFieldMissing` tampil sebagai key mentah di layar HR Overview produksi.

---

## 1. Root Cause

Sistem i18n custom di [`apps/web/lib/i18n.tsx`](../apps/web/lib/i18n.tsx) menggunakan `getNestedValue()` yang **diam-dembal mengembalikan string key mentah** saat lookup gagal (baris 33–36). Tidak ada warning di console — kegagalan i18n hanya terlihat sebagai teks key yang bocor ke UI.

4 key HR Overview ditempatkan di **root level** JSON, bukan di dalam objek `hr.overview`:

- [`apps/web/messages/id.json`](../apps/web/messages/id.json) baris 7183–7186
- [`apps/web/messages/en.json`](../apps/web/messages/en.json) baris 7183–7186

Frontend [`apps/web/app/dashboard/hr/page.tsx`](../apps/web/app/dashboard/hr/page.tsx) memanggil `t('hr.overview.birthdayNotAvailable')` dsb. (baris 77, 102, 247, 279, 280) → lookup gagal → key mentah tampil di layar.

## 2. Temuan Audit (Lebih Luas dari 4 Key)

Blok orphan di root level kedua file mencakup baris **7112–7186** (75 baris), bukan hanya 4 key:

| Baris | Isi | Analisis |
|-------|-----|----------|
| 7112–7121 | `toast` campuran (invoice + leave) | 0 referensi frontend root-level |
| 7122–7124 | `emptyDescription`, `confirmDeleteTitle`, `confirmDeleteMessage` (invoice) | 0 referensi |
| 7125–7146 | `type`, `status`, `error`, `confirm` versi leave (dengan interpolasi `{{name}}`) | Duplikat `hr.leave.*`; 0 referensi |
| 7147–7182 | `processing`, `detailTitle`, `approve`, `reject`, `backToList`, `fields`, `timeline`, `employeeInfo`, `summary`, `actions` | Duplikat `hr.leave.*`; 0 referensi |
| 7183–7186 | `noLeaveRequests`, `birthdayNotAvailable`, `birthdayFieldMissing`, `loadError` | **Dipakai frontend** via `hr.overview.*` — salah tempat |

Catatan penting:

- `inbox` (baris 7187) dan `apiDocs` (baris 7278) di root level adalah **legit** — jangan dihapus.
- Versi root-level `confirm`/`timeline` memakai `{{name}}`, versi `hr.leave` (baris 3614–3619, 3633–3638) tidak. Frontend [`hr/leaves/[id]/page.tsx`](../apps/web/app/dashboard/hr/leaves/[id]/page.tsx) melakukan konkatenasi manual: `` `${t('hr.leave.confirm.approveMessage')} ${leave?.employeeName}` `` — jadi versi `{{name}}` memang tidak terpakai.
- **Missing keys tambahan**: halaman leave memakai `hr.leave.confirm.deleteTitle`, `hr.leave.confirm.deleteMessage`, `hr.leave.toast.deleteSuccess`, `hr.leave.toast.deleteFailed` (baris 188, 189, 198, 201, 204) yang belum ada di objek `hr.leave` — selama ini ditutupi fallback `||` di kode.

## 3. Rencana Perbaikan

```mermaid
flowchart TD
    A[Jalankan audit script Node<br/>scan semua t() key vs JSON] -> B[Generate laporan<br/>missing keys per file]
    B -> C[Pindahkan 4 key HR overview<br/>ke objek hr.overview]
    C -> D[Tambah key delete di<br/>hr.leave confirm dan toast]
    D -> E[Hapus blok orphan root level<br/>baris 7112 sampai 7186]
    E -> F[Perbaiki missing keys<br/>hasil audit tambahan]
    F -> G[Validasi JSON.parse kedua file<br/>dan npx tsc --noEmit]
    G -> H[Update CURRENT.md<br/>commit dan push]
```

### Step 1 — Audit komprehensif (Code mode, butuh execute_command)

Script Node satu-arah:

1. Scan semua `.tsx`/`.ts` di `apps/web` untuk pola `t('dotted.key')` / `t("dotted.key")` / `` t(`dotted.key`) ``.
2. Resolve tiap dotted path terhadap `id.json` dan `en.json`.
3. Laporan: (a) key dipakai tapi MISSING di salah satu locale, (b) key root-level yang tidak direferensikan (kandidat orphan).
4. Kecualikan: dynamic keys (template literal dengan `${...}`), key non-dotted (validasi manual), `inbox.*`, `apiDocs.*`.

### Step 2 — Pindahkan 4 key HR overview

Di **kedua** file:

- Tambahkan ke objek `hr.overview` (id.json baris 3542 / en.json baris 3542, setelah `"rejected"`):
  - `noLeaveRequests`, `birthdayNotAvailable`, `birthdayFieldMissing`, `loadError`
- Hapus 4 baris orphan di root (7183–7186).

### Step 3 — Tambah missing key delete di `hr.leave`

Di **kedua** file:

- `hr.leave.confirm`: tambah `deleteTitle`, `deleteMessage`
- `hr.leave.toast`: tambah `deleteSuccess`, `deleteFailed`

Nilai mengikuti teks fallback yang sudah ada di kode leave page (id: "Hapus Cuti" / "Apakah Anda yakin ingin menghapus data cuti ini?" dsb.; en: versi setara).

### Step 4 — Hapus blok orphan root level 7112–7182

Hapus seluruh objek/key root-level yang tidak direferensikan (toast campuran, invoice empty/confirmDelete, dan semua duplikat leave versi `{{name}}`). Pertahankan `inbox` dan `apiDocs`.

### Step 5 — Perbaiki hasil audit tambahan

Jika audit menemukan missing key lain (di luar temuan di atas), tambahkan ke namespace yang benar di kedua locale.

### Step 6 — Validasi

- `node -e "JSON.parse(require('fs').readFileSync('apps/web/messages/id.json','utf8'))"` (dan en.json) — pastikan valid.
- Jalankan ulang audit script — 0 missing.
- `npx tsc --noEmit` di `apps/web` — 0 error.

### Step 7 — Dokumentasi & commit

- Update [`CURRENT.md`](../CURRENT.md): sesi baru (v11.70.4), catatan audit i18n.
- Commit + push ke `origin/main`.
- Deploy = aksi operator (`sudo bash update.sh` di VPS) mengikuti pola sesi 82.

## 4. Keputusan Desain

| Keputusan | Pilihan | Alasan |
|-----------|---------|--------|
| Interpolasi `{{name}}` di `hr.leave.confirm`/`timeline` | **TIDAK diadopsi** | Frontend sudah konkatenasi manual; mengubah ke `{{name}}` butuh engine interpolation + ubah banyak call site — blast radius besar, nilai kecil. Blok `{{name}}` dihapus sebagai orphan. |
| Hapus blok orphan 7112–7182 | **YA** | 0 referensi (sudah dibuktikan via search di `.tsx`); menjaga JSON bersih mencegah salah-pakai di masa depan. |
| Fallback `\|\|` di leave page | **Dipertahankan** | Proteksi defensif; key baru ditambahkan agar fallback tidak lagi aktif. |

## 5. Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| Ada kode dinamis yang membangun key dari variabel (lolos regex audit) | Audit kedua arah: key orphan vs pemakaian; review manual untuk blok yang dihapus — semua blok di 7112–7182 sudah diverifikasi 0 referensi literal |
| Locale selain id/en | Hanya ada 2 file locale (`id.json`, `en.json`) — dikonfirmasi dari struktur `messages/` |
| BOM `\uFEFF` di awal file JSON | Edit dilakukan di tengah file; validasi `JSON.parse` dengan `utf8` (BOM ditoleransi `JSON.parse`? — gunakan `utf8` + strip BOM di script validasi bila perlu) |

## 6. File yang Diubah

| File | Perubahan |
|------|-----------|
| `apps/web/messages/id.json` | +4 key ke `hr.overview`, +4 key ke `hr.leave`, −71 baris orphan root |
| `apps/web/messages/en.json` | sama |
| `CURRENT.md` | Entri Session 83 + versi bump |
