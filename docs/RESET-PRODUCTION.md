# Reset Production Data — Qalcuity

> **Runbook untuk VPS yang SUDAH berjalan** (berbeda dengan [`FRESH-VPS.md`](./FRESH-VPS.md) yang untuk VPS baru).
> Tujuan: mengembalikan database ke state "fresh" — **sisain yang penting saja** (akun, tenant, role, konfigurasi platform), hapus semua data bisnis/transaksional. **Data demo tidak pernah dibuat otomatis** — hanya di-load kalau user memilihnya secara eksplisit (opt-in).

**Last Updated:** 17 Oktober 2026 (Session 84 + hotfix: deteksi `$PGBIN` via `find` — path binari aaPanel PostgreSQL 18 bervariasi per instalasi, glob `*/bin` bisa kosong)

---

## Daftar Isi

1. [Kapan Pakai Runbook Ini](#1-kapan-pakai-runbook-ini)
2. [Tiga Tier Reset](#2-tiga-tier-reset)
3. [Apa yang Dipertahankan vs Dihapus](#3-apa-yang-dipertahankan-vs-dihapus)
4. [Prasyarat & Backup](#4-prasyarat--backup)
5. [Step 1: Preview Dry-Run (WAJIB)](#5-step-1-preview-dry-run-wajib)
6. [Step 2: Pilih Mode & Eksekusi](#6-step-2-pilih-mode--eksekusi)
7. [Step 3: Core Seed (khusus mode full)](#7-step-3-core-seed-khusus-mode-full)
8. [Step 4: Verifikasi & Restart](#8-step-4-verifikasi--restart)
9. [Hapus Tenant Demo Tertentu](#9-hapus-tenant-demo-tertentu)
10. [Data Demo Tetap Opt-In](#10-data-demo-tetap-opt-in)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Kapan Pakai Runbook Ini

- Production sudah terisi **data test/demo/kotoran testing** dan ingin bersihkan tanpa kehilangan akun asli.
- Ingin **start-over total** (semua tenant daftar ulang) setelah rebranding / migrasi / insiden data.
- Database dipakai uji coba dan sebelum "go-live resmi" perlu dibersihkan sekali.

> ⛔ **Bukan untuk:** menghapus 1 tenant demo tertentu (pakai [`scripts/cleanup-demo-tenant.sql`](../scripts/cleanup-demo-tenant.sql)) atau bootstrap VPS baru (pakai [`FRESH-VPS.md`](./FRESH-VPS.md)).

---

## 2. Tiga Tier Reset

| Tier | Skrip | Simpan | Untuk Kasus |
|------|-------|--------|-------------|
| **A. Reset keep-accounts** | `scripts/reset-production-data.sql` (default) | Semua Tenant + User + Role + konfigurasi tenant (integrasi, workflow def, custom field, SoD, subscription, billing, tax) + platform master | Akun asli masih dipakai, hanya data bisnis yang kotor |
| **B. Reset full + core seed** | `scripts/reset-production-data.sql` mode `full` + `prisma db seed` | Hanya platform master (Plan grandfather, SubscriptionPlan, PlatformSetting, PlanTenantLimit) | Start-over total; semua tenant & user daftar ulang |
| **C. Hapus 1 tenant demo** | `scripts/cleanup-demo-tenant.sql` | Semua (hapus 1 tenant beserta seluruh data turunannya) | Buang tenant demo/test spesifik |

> **Data demo tidak pernah dibuat oleh skrip reset.** Setelah reset, tenant baru = kosong; user yang ingin demo memuatnya sendiri via OnboardingModal / Settings (lihat [Bagian 10](#10-data-demo-tetap-opt-in)).

---

## 3. Apa yang Dipertahankan vs Dihapus

### Tier A (keep-accounts) — DIPERTAHANKAN (18 tabel)

| Kategori | Tabel |
|----------|-------|
| Akun & akses | `Tenant`, `User`, `Role`, `PasswordPolicy`, `PasswordHistory` |
| Konfigurasi tenant | `TenantIntegration`, `WorkflowDefinition`, `IndustryConfiguration`, `TenantCustomField`, `SoDRule`, `ControlPolicy`, `TaxRate` |
| Langganan & billing | `TenantSubscription`, `BillingPayment` |
| Platform master | `Plan`, `SubscriptionPlan`, `PlatformSetting`, `PlanTenantLimit` |

### Tier A — DIHAPUS (semua tabel dengan `tenantId`/`userId` di luar keep-list)

Contoh: `Contact`, `Invoice`, `Payment`, `JournalEntry`, `Product`, `Stock`, `Employee`, `Payroll`, `Attendance`, `Deal`, `Lead`, `PosTransaction`, seluruh Community (`CommunityMember`, `Bill`, dll), `AuditLog`, `WorkflowHistory`, `UserSession`, `LoginLog`, `CronRunLog`, seluruh model analytics (`AnalyticsDashboardWidget`, `MetricDefinition`, dst), `SLATracker`, `AIExtractionHistory`, `Notification`, dst.

> Daftar sweep **dinamis** (via `information_schema`) — tabel Prisma baru yang punya kolom `tenantId`/`userId` otomatis ikut ter-sweep tanpa perlu update skrip.

### Tier B (full) — DIPERTAHANKAN HANYA (4 tabel)

`Plan`, `SubscriptionPlan`, `PlatformSetting`, `PlanTenantLimit` — plus **seluruh `Tenant` dan `User` ikut dihapus**. Setelah eksekusi **wajib core seed** (Bagian 7) supaya SuperAdmin + Plans kembali ada.

---

## 4. Prasyarat & Backup

```bash
ssh root@<ip-vps>
cd /www/wwwroot/qalcuity
```

> ⚠️ **VPS aaPanel: JANGAN pakai `psql`/`pg_dump` polos.** PostgreSQL dikelola aaPanel di luar apt, jadi wrapper Debian error:
> `No existing cluster is suitable as a default target` + `You must install at least one postgresql-client-<version> package`.
> **Lokasi binari aaPanel BERVARIASI per instalasi** (versi subdir ada yang tidak ada — glob `postgresql/*/bin` bisa kosong). Deteksi via `find`. Set variabel `PGBIN` sekali per sesi shell, lalu semua perintah memakai `"$PGBIN/psql"`.

1. **Siapkan `DATABASE_URL` + `PGBIN` + tes koneksi** — jalankan **SATU BARIS per perintah** (jangan paste blok utuh — lihat Troubleshooting `: command not found`):

   ```bash
   cd /www/wwwroot/qalcuity
   ```

   ```bash
   set -a; source apps/web/.env; set +a
   ```

   ```bash
   echo "$DATABASE_URL"
   ```

   Deteksi `PGBIN` (otomatis coba beberapa path umum aaPanel, fallback ke `find`):

   ```bash
   PGBIN=$(find /www/server -type f -name psql 2>/dev/null | head -1 | xargs -r dirname); echo "PGBIN=$PGBIN"
   ```

   Verifikasi binari hidup:

   ```bash
   "$PGBIN/psql" --version
   ```

   Tes koneksi ke database:

   ```bash
   "$PGBIN/psql" "$DATABASE_URL" -c "SELECT count(*) FROM \"Tenant\";"
   ```

   > - Jika langkah deteksi masih kosong: `ls /www/server/` untuk melihat struktur direktori, lalu `find / -name psql -type f 2>/dev/null` (lebih luas).
   > - **Jangan** fallback ke `apt install postgresql-client-16` untuk backup: psql 16 *bisa* konek ke server PG 18, tapi **pg_dump 16 TIDAK BISA dump server yang lebih baru** (pg_dump harus ≥ versi server). Backup selalu pakai `pg_dump` milik aaPanel (PG 18).
   > - aaPanel **Adminer** (Databases → PgSQL → Adminer) hanya untuk **verifikasi SELECT** — TIDAK bisa menjalankan skrip reset (meta-command psql `\set`/`\if`/`\echo` tidak didukung).

2. **Backup dulu — skrip TIDAK auto-backup** (`update.sh` Step 2 juga membuat backup sendiri ke `/www/wwwroot/qalcuity/backups/`):

   ```bash
   "$PGBIN/pg_dump" "$DATABASE_URL" | gzip > /root/backup_qalcuity_$(date +%F_%H%M).sql.gz
   ```

   ```bash
   ls -lh /root/backup_qalcuity_*.sql.gz
   ```

   > - Pastikan `pg_dump` ditemukan: `find /www/server -type f -name pg_dump 2>/dev/null` (biasanya sefolder dengan `psql`).
   > - Alternatif: `sudo bash update.sh` (sekalian deploy + backup otomatis).

---

## 5. Step 1: Preview Dry-Run (WAJIB)

Skrip default **read-only** — hanya menampilkan rencana, tidak menghapus apa pun. Aman dijalankan kapan saja.

```bash
cd /www/wwwroot/qalcuity
"$PGBIN/psql" "$DATABASE_URL" -v execute=false -f scripts/reset-production-data.sql
```

Output yang diharapkan:

| Bagian | Isi |
|--------|-----|
| **A1** | Daftar tenant + jumlah user + jumlah SUPERADMIN |
| **A2** | `[KEEP]` / `[WIPE]` per tabel + estimasi baris dipertahankan / dihapus |
| **A3** | Kandidat tenant demo/test (INFO saja — tidak dihapus otomatis) |
| **C1–C2** | Ringkasan pasca (pada dry-run = kondisi saat ini) |

> ⚠️ **Periksa A2:** pastikan tabel yang terdaftar `[KEEP]` memang yang ingin dipertahankan. Jika ada tabel penting yang terdaftar `[WIPE]`, **hentikan** — jangan lanjut eksekusi.

---

## 6. Step 2: Pilih Mode & Eksekusi

### Opsi A — Reset keep-accounts (default)

```bash
cd /www/wwwroot/qalcuity
"$PGBIN/psql" "$DATABASE_URL" -v execute=true -f scripts/reset-production-data.sql
```

Guard aktif: eksekusi berhenti otomatis (ROLLBACK) jika tidak ada user SUPERADMIN.

### Opsi B — Reset full (butuh konfirmasi eksplisit)

```bash
cd /www/wwwroot/qalcuity
"$PGBIN/psql" "$DATABASE_URL" -v execute=true -v reset_mode=full \
     -v confirm_full=HAPUS-SEMUA -f scripts/reset-production-data.sql
```

> Tanpa `-v confirm_full=HAPUS-SEMUA` skrip **membatalkan diri** (double guard).

Semua operasi berjalan dalam **SATU transaksi** — jika verifikasi dalam transaksi gagal, seluruh reset **di-ROLLBACK** otomatis (`ON_ERROR_STOP on`).

---

## 7. Step 3: Core Seed (khusus mode full)

Setelah mode `full` berhasil, database **tidak punya SuperAdmin/Plans**. Segera jalankan core seed:

```bash
cd /www/wwwroot/qalcuity/packages/db
SEED_DEMO=false npx prisma db seed
```

Yang dibuat (idempoten, **tanpa data demo**):

- Tenant demo `qalcuity-demo` + **SuperAdmin** `info@qalcuity.com` (password default seed — **SEGERA ganti**)
- 5 Plans (grandfather pricing), Platform Settings, Plan Tenant Limits, Tax Rates (PPN 11%, PPh 23/21), Tenant Entitlement Free trial

> `SEED_DEMO=false` = **jangan sampai lupa** — inilah yang menjamin data demo TIDAK ikut ter-seed. `update.sh` Step 6b juga otomatis menjalankan core seed ini hanya jika SUPERADMIN = 0 (idempoten).

---

## 8. Step 4: Verifikasi & Restart

1. **C1/C2 otomatis jalan** setelah eksekusi — pastikan:
   - Mode keep-accounts: `superadmin_left ≥ 1`, semua tabel transaksional `0 rows` (`Semua tabel transaksional kosong ✓`).
   - Mode full: `tenant_left = 0`, `user_left = 0` (sebelum seed) / `superadmin_left = 1` (sesudah seed).
2. **Restart aplikasi** (aaPanel → Node.js Project Manager → project Qalcuity → Restart), lalu health check:
   ```bash
   curl -s https://domain-anda.com/api/health
   ```
3. **Login smoke test** → `https://domain-anda.com/login` → pastikan bisa login, dashboard kosong sesuai ekspektasi.
4. Jika mode keep-accounts: pastikan tenant asli masih bisa login (user mereka tidak ikut terhapus).

---

## 9. Hapus Tenant Demo Tertentu

Untuk membuang **1 tenant demo/test spesifik** tanpa menyentuh tenant lain (skrip sudah punya guard: hanya menghapus jika ada tepat 1 tenant kandidat dan tanpa SUPERADMIN):

```bash
cd /www/wwwroot/qalcuity
"$PGBIN/psql" "$DATABASE_URL" -v execute=false -f scripts/cleanup-demo-tenant.sql
"$PGBIN/psql" "$DATABASE_URL" -v execute=true  -f scripts/cleanup-demo-tenant.sql
```

> Baris pertama = preview, baris kedua = eksekusi. Paste **satu baris per perintah** (lihat baris `: command not found` di Troubleshooting).

Tenant kandidat juga ditampilkan di **A3** [`reset-production-data.sql`](../scripts/reset-production-data.sql) (info saja).

---

## 10. Data Demo Tetap Opt-In

Setelah reset, **semua tenant = kosong (by design)**. Data demo hanya ada kalau user memilihnya:

| Jalur | Cara | Mekanisme |
|-------|------|-----------|
| **A — OnboardingModal** | Muncul otomatis di dashboard tenant kosong | Cek `GET /api/demo/status`; tombol **Muat Data Demo** / **Mulai dari Nol**; sekali per browser (localStorage `qalcuity_onboarding_dismissed`) |
| **B — Settings manual** | Settings → Profile → **Muat Data Demo** (atau `?demo=true`) | Rate limit 5x / 5 menit / tenant |

> Jangan pernah menambahkan auto-seed demo di production — registrasi tenant baru harus selalu kosong ([`FRESH-VPS.md`](./FRESH-VPS.md) Bagian 7).

---

## 11. Troubleshooting

| Gejala | Penyebab | Solusi |
|--------|----------|--------|
| `ABORT: reset_mode=full butuh -v confirm_full=HAPUS-SEMUA` | Lupa konfirmasi eksplisit | Tambah `-v confirm_full=HAPUS-SEMUA` |
| `ABORT: tidak ada user SUPERADMIN` | keep-accounts tidak aman tanpa platform admin | Cek A1; jika memang nol, jalankan core seed dulu (Bagian 7) atau pakai mode full |
| `unrecognized configuration parameter "app.confirm_full"` | Versi skrip lama (guard sebelum set_config) | `git pull` — skrip terbaru sudah `set_config` sebelum guard |
| Syntax error di baris awal (`# ...`) | Versi skrip lama (komentar `#` bukan sintaks psql) | `git pull` — komentar header sudah `--` semua |
| `MASIH ADA DATA: <tabel> = N rows` di C2 | Tabel tsb tidak punya kolom `tenantId`/`userId` | Inspect manual: `"$PGBIN/psql" "$DATABASE_URL" -c 'SELECT count(*) FROM "<Tabel>";'` lalu `DELETE`/`TRUNCATE` terarah |
| `Error: You must install at least one postgresql-client-<version> package` + `No existing cluster is suitable as a default target` | Wrapper Debian `psql`/`pg_dump`; PostgreSQL dikelola aaPanel, bukan apt cluster | Pakai binari aaPanel: `PGBIN=$(find /www/server -type f -name psql 2>/dev/null | head -1 | xargs -r dirname)` lalu `"$PGBIN/psql" ...` (Bagian 4) |
| `bash: /psql: No such file or directory` (prefix `/psql` tanpa direktori) | `PGBIN` kosong — path glob tidak cocok (mis. `postgresql/*/bin` tidak ada di instalasi ini) | Jalankan perintah deteksi `find` di Bagian 4; jika kosong, `ls /www/server/` lalu cari manual |
| Banyak `: command not found` saat paste | Blok markdown (komentar/kode) di-paste utuh ke shell — baris terpotong/kacau (Windows CRLF/markdown render) | Paste **satu baris per perintah**; lebih aman **ketik manual** per baris |
| Reset sukses tapi app error 500 | Mode full tanpa core seed (SuperAdmin/Plans hilang) | Jalankan Bagian 7 lalu restart |
| Mau batalkan setelah eksekusi dimulai | — | Transaksi belum COMMIT = otomatis rollback; setelah COMMIT gunakan backup restore |

---

## Checklist Ringkas (copy-paste untuk VPS)

```
[ ] set -a; source apps/web/.env; set +a
[ ] PGBIN=$(find /www/server -type f -name psql 2>/dev/null | head -1 | xargs -r dirname) — pastikan terisi, lalu "$PGBIN/psql" --version
[ ] Backup: "$PGBIN/pg_dump" "$DATABASE_URL" | gzip > /root/backup_qalcuity_$(date +%F_%H%M).sql.gz (atau sudo bash update.sh Step 2)
[ ] Dry-run: "$PGBIN/psql" "$DATABASE_URL" -v execute=false -f scripts/reset-production-data.sql
[ ] Periksa output A2 [KEEP]/[WIPE] — pastikan sesuai ekspektasi
[ ] Eksekusi keep-accounts ATAU full (full: + reset_mode=full confirm_full=HAPUS-SEMUA)
[ ] Mode full saja: cd packages/db && SEED_DEMO=false npx prisma db seed
[ ] Cek C1/C2 (superadmin_left ≥ 1; transaksional 0 rows)
[ ] Restart aaPanel Node project + curl /api/health
[ ] Login smoke test — tenant kosong; demo hanya via opt-in OnboardingModal/Settings
