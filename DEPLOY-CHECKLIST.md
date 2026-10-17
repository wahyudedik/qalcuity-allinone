# VPS Deployment Checklist — Redeploy Session 72–79 (16 Oktober 2026)

> **Deployment target:** `https://qalcuity.com` — `/www/wwwroot/qalcuity`
> **Method:** `sudo bash update.sh` via SSH + aaPanel auto-restart
> **Risk level:** 🟠 Medium — 5+ migrasi community, 3 session production fixes (console errors, onboarding, cron middleware)
> **Prepared:** Session 80 (16 Okt 2026) — semua fix sudah terverifikasi lokal (smoke 7/7 PASS, `tsc` 0 errors, `vitest` 374/374)

---

## 🎯 Context — Mengapa Redeploy Ini Penting

Production qalcuity.com saat ini **tertinggal 3+ session** (77, 78, 79 — semua code-complete & pushed, tapi `update.sh` belum dijalankan). Dampak yang terkonfirmasi di production:

| # | Masalah Production | Fix di Commit | dampak jika tidak di-deploy |
|---|--------------------|---------------|------------------------------|
| 1 | **Semua cron SILENT FAIL** — `/api/cron` di-redirect 307→/login oleh middleware | Session 79 ([`apps/web/middleware.ts`](apps/web/middleware.ts)) | payment-reminder, recurring-invoice, stock-alert, anomaly-scan **tidak pernah berjalan** (aaPanel cron `curl -s >> /dev/null` menelan error) |
| 2 | **Console errors aktif** — 405 `PATCH /api/ai/anomalies/[id]`, 400 `GET/PUT /api/hr/employees/[id]`, TypeError `total`/`length` ×14, 403 invite team ×8, favicon 404 | Session 77 ([`plans/production-console-errors-2026-10-15.md`](plans/production-console-errors-2026-10-15.md)) | User-facing bugs: detail employee tidak bisa dibuka/disimpan, aksi anomaly gagal, team page error untuk MEMBER |
| 3 | **Onboarding demo opt-in + bootstrap VPS fresh tidak aktif** | Session 78 ([`docs/FRESH-VPS.md`](docs/FRESH-VPS.md), [`update.sh`](update.sh) Step 6b) | Tenant baru kosong tanpa panduan; VPS fresh tidak bisa bootstrap mandiri |
| 4 | **5 migrasi community (#50–54) belum applied** | Sessions 72–76 | Tabel community (keanggotaan, surat/kegiatan, event, aset, pinjaman) tidak ada di production DB |

> ✅ **Status lokal terverifikasi (16 Okt 2026):** smoke S1–S7 PASS semua — cron endpoint merespons `401 JSON` (bukan redirect), favicon `200 image/x-icon`, routes anomalies/employees/demo hidup, `npx tsc --noEmit` 0 errors, `npx vitest run` 374/374. **Redeploy aman dieksekusi.**

---

## 📋 Migration Summary

> ⚠️ **Jalankan `npx prisma migrate status` di VPS SEBELUM deploy** (Pre-Flight #4) untuk mengetahui persis migrasi apa saja yang belum applied. Daftar di bawah adalah migrasi **terbaru** yang wajib masuk; production mungkin tertinggal lebih banyak lagi (deploy terakhir terekam 6 Sep 2026 — lihat versi checklist lama).

5 migrasi community terakhir (terbaru di codebase):

| # | Migration | Description | Risk |
|---|-----------|-------------|------|
| 1 | `20261010172449_community_mvp_phase1` | Community MVP Phase 1 — keanggotaan, iuran, pengumuman | 🟡 Medium (tabel baru) |
| 2 | `20261013060951_community_phase2_surat_kegiatan` | Surat & kegiatan | 🟢 Low (tabel baru) |
| 3 | `20261013223117_community_event_participants` | Peserta event | 🟢 Low (tabel baru) |
| 4 | `20261014163421_community_assets` | Aset komunitas | 🟢 Low (tabel baru) |
| 5 | `20261015102650_community_asset_loans` | Pinjaman/depresiasi aset | 🟢 Low (tabel baru) |

Total folder migrasi di codebase: **54**. Semua migrasi community bersifat CREATE tabel/index baru (tidak ada ALTER tabel existing) → risiko konflik rendah, tapi **backup tetap wajib**.

---

## 🔧 Pre-Deployment Checklist

- [ ] 1. **Backup database** — `update.sh` Step 2 otomatis backup ke `/www/wwwroot/qalcuity/backups/db_backup_*.sql.gz`; verifikasi file backup terbentuk & tidak kosong.
- [ ] 2. **Disk space VPS** — `df -h` → minimal 5 GB tersedia (build Next.js + backup).
- [ ] 3. **Pastikan code sudah pushed** — di local: `git status` bersih + `git log origin/main..main` kosong (HEAD production harus `5ae88ba` atau lebih baru setelah commit Session 80).
- [ ] 4. **Cek drift migrasi di VPS** (SEBELUM `update.sh`):
  ```bash
  cd /www/wwwroot/qalcuity/packages/db
  npx prisma migrate status
  ```
  Catat jumlah "To be applied" — expectasi: semua migrasi dari `20260906...` dst sampai `20261015102650_community_asset_loans`. Jika ada **failed** migration (bukan pending), **STOP** — lihat section Rollback/Troubleshooting.
- [ ] 5. **🔴 ROTASI CRON_SECRET** — token lama (`e2eff893...`) **ter-expose di chat/screenshot** (temuan Session 79). Sebelum atau sesudah deploy:
  1. Generate secret baru: `openssl rand -hex 32`
  2. Update `/www/wwwroot/qalcuity/apps/web/.env` → `CRON_SECRET=<baru>`
  3. Update konfigurasi cron aaPanel (Task Scheduler) → header `Authorization: Bearer <baru>`
  4. Restart app
  5. **Rotate juga** NEXTAUTH_SECRET & DATABASE_URL password jika belum pernah di-rotate ([`docs/REMAINING-WORK.md`](docs/REMAINING-WORK.md) AUDIT-P0-1 — konfirmasi founder).
- [ ] 6. **Pastikan `.env` production lengkap** — terutama: `NEXTAUTH_URL="https://qalcuity.com"`, `NEXTAUTH_SECRET`, `DATABASE_URL`, `CRON_SECRET`, `APP_TIMEZONE`. Values `.env` **menang** atas environment variables lain (dotenv tidak override).
- [ ] 7. **aaPanel Node.js Project Manager** — pastikan project `qalcuity` status Running (port 3000).

---

## 🚀 Deployment Steps

### Step 0: (Dari local) Pastikan pushed

```bash
cd e:/PROJEKU/qalcuity-allinone
git status                      # harus bersih
git log origin/main..main --oneline   # harus kosong
```

### Step 1: SSH ke VPS

```bash
ssh root@IP_VPS
```

### Step 2: Jalankan update script

```bash
cd /www/wwwroot/qalcuity
sudo bash update.sh
```

### Step 3: Monitor output per step

| Step | Name | Expectasi | Jika gagal |
|------|------|-----------|------------|
| 1/8 | Pre-flight checks | ✅ "Pre-flight checks passed", Node + pnpm + Git terdeteksi, PostgreSQL terdeteksi (atau warning non-fatal) | Install missing tool |
| 2/8 | Backup database | ✅ "Database backed up: .../db_backup_*.sql.gz (size)" | Cek `pg_dump` ada; **jangan lanjut** tanpa backup |
| 3/8 | Pull latest code | ✅ "Code updated: <old> → <new>" (expectasi HEAD `5ae88ba` atau lebih baru) | Jika diverged, script auto `reset --hard origin/main` (aman — local changes sudah di-stash) |
| 4/8 | Install dependencies | ✅ "No package changes" ATAU "Dependencies installed" | `pnpm install` manual jika frozen-lockfile gagal dua kali |
| 5/8 | Prisma generate | ✅ "Prisma client generated" | Cek `PRISMA_QUERY_ENGINE_TYPE=library` (sudah di-export script) |
| 6/8 | Prisma migrate deploy | ✅ "Migrations applied successfully" + daftar migrasi community #50–54 | **Script exit 1 otomatis** — perbaiki SQL migrasi, jangan paksa lanjut |
| **6b/8** | **Core seed (fresh DB bootstrap)** | ✅ **"Database sudah ter-seed (N SuperAdmin) — skip core seed"** (normal, production sudah ada data) | Jika "Database fresh terdeteksi" → seed jalan otomatis (hanya terjadi di VPS fresh); ganti password SuperAdmin setelah login |
| 7/8 | Build Next.js | ✅ "Build completed successfully" (build bersih dari `.next` cache) | **Script exit 1 otomatis** — migrations sudah applied, fix build lalu jalankan ulang `update.sh` |
| 8/8 | Restart application | ✅ "Restart signal sent" + "Application is running (HTTP 200/302/307)" | Jika HTTP 000: restart manual dari aaPanel → Website → Node.js Project → Restart |

### Step 4: Verifikasi migrasi

```bash
cd /www/wwwroot/qalcuity/packages/db
npx prisma migrate status
```

Expected: `Database schema is up to date` / `0 pending` — semua migrasi sampai `20261015102650_community_asset_loans` tercatat applied.

---

## 🧭 Phase 0 — Urutan Eksekusi Operator (Rotasi Secret → Redeploy → Reset DB)

> **Untuk operator VPS:** jalankan langkah di bawah **berurutan**. Semua perintah sudah ada di runbook lain — section ini **hanya mengurutkan & menautkan** (tidak menduplikasi runbook). Jika VPS fresh (belum ada data produksi), lewati reset DB (Langkah 5–6) dan ikuti [`docs/FRESH-VPS.md`](docs/FRESH-VPS.md) sebagai gantinya.

| # | Langkah | Perintah / Aksi (reuse dari runbook yang ada) | Runbook detail |
|---|---------|-----------------------------------------------|----------------|
| 1 | **Backup DB manual** — sebelum rotasi apa pun | `bash scripts/reset-db.sh backup` → file `/root/backup_qalcuity_<timestamp>.sql.gz` | [`docs/RESET-PRODUCTION.md`](docs/RESET-PRODUCTION.md) Bagian 4 (mode `backup`) |
| 2 | **Rotasi CRON_SECRET** (token lama ter-expose — temuan Session 79) | `openssl rand -hex 32` → update `/www/wwwroot/qalcuity/apps/web/.env` → `CRON_SECRET=<baru>` | Pre-Deployment Checklist **#5** (di atas) |
| 2a | **⚠️ Update entry cron aaPanel dengan CRON_SECRET baru — JANGAN dilewati.** aaPanel → Cron (Task Scheduler) → edit entry `*/5 * * * * .../api/cron/run` → header `Authorization: Bearer <baru>`. Jika dilewati, dispatcher balas **401** dan semua cron SILENT FAIL. | aaPanel UI (nilai `.env` dan header cron **wajib sama**) | [`docs/CRON-JOBS.md`](docs/CRON-JOBS.md); Pre-Deployment #5 langkah 3 |
| 2b | **Rotasi NEXTAUTH_SECRET + password database** (AUDIT-P0-1 — konfirmasi founder sebelum eksekusi) | Ganti password PG via aaPanel → perbarui `DATABASE_URL` di `.env`; `openssl rand -base64 32` untuk `NEXTAUTH_SECRET` → restart app | [`docs/REMAINING-WORK.md`](docs/REMAINING-WORK.md) AUDIT-P0-1; [`docs/FRESH-VPS.md`](docs/FRESH-VPS.md) §4 (tabel nilai wajib unik) |
| 3 | **Redeploy** (backup otomatis + pull + migrate + core-seed-check + build + restart + health check internal) | `sudo bash update.sh` | [Deployment Steps](#-deployment-steps) (di atas); [`update.sh`](update.sh) |
| 4 | **Verifikasi V1–V11** — centang semua sebelum lanjut ke reset | Jalankan matrix di bawah | [Post-Deployment Verification Matrix](#-post-deployment-verification-matrix-v1v11) |
| 5 | **Reset DB — preview (dry-run, read-only, WAJIB sebelum eksekusi)** | `bash scripts/reset-db.sh preview` → periksa tabel `[KEEP]`/`[WIPE]` di output | [`docs/RESET-PRODUCTION.md`](docs/RESET-PRODUCTION.md) Bagian 4 + Checklist Ringkas |
| 6 | **Reset DB — eksekusi keep-accounts** (hanya setelah preview sesuai ekspektasi **dan** backup Langkah 1 OK) | `bash scripts/reset-db.sh keep` → verifikasi C1/C2 (superadmin ≥ 1; tabel transaksional 0 rows) | [`docs/RESET-PRODUCTION.md`](docs/RESET-PRODUCTION.md) Bagian 4 |
| 7 | **Health check akhir** | `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/health` → expectasi 200/302/307; login ulang browser production | [Rollback Instructions](#️-rollback-instructions) jika gagal |

> **Catatan dependency kritis:** rotasi `CRON_SECRET` (Langkah 2) **wajib diikuti** update entry cron aaPanel (Langkah 2a) **sebelum** verifikasi V1–V2 — nilai di `.env` dan header Task Scheduler **harus identik**, jika tidak dispatcher membalas 401 dan cron tidak pernah jalan (tertelen `curl -s >> /dev/null` aaPanel).

> **Opsi reset lain** (Tier B full + core seed manual, atau Tier C hapus 1 tenant demo via `cleanup`/`cleanup-run`): lihat perbandingan Tier A/B/C di [`docs/RESET-PRODUCTION.md`](docs/RESET-PRODUCTION.md). Mode `full` wajib diikuti core seed: `cd packages/db && SEED_DEMO=false npx prisma db seed` (tercantum di runbook & helper output).

---

## ✅ Post-Deployment Verification Matrix (V1–V11)

> Jalankan berurutan. **V1–V3 bisa tanpa login** (curl). **V4–V9 butuh login** ke browser production. **V10–V11** dari terminal VPS. Centang hanya jika expectasi terpenuhi — jangan klaim fixed sebelum semua PASS.

### Terminal (tanpa login)

- [ ] **V1 — Cron dispatcher hidup** (fix Session 79):
  ```bash
  curl -s -H "Authorization: Bearer $CRON_SECRET" "https://qalcuity.com/api/cron/run?status"
  ```
  Expectasi: **JSON status scheduler** (daftar task + jadwal) — **BUKAN** halaman login/redirect. Jika masih redirect → middleware fix tidak ter-deploy.

- [ ] **V2 — Cron benar-benar jalan**:
  - Tunggu ≤10 menit setelah V1 PASS (dispatcher `*/5 * * * *` di aaPanel).
  - Cek `?status` lagi → `lastRun` task yang due (mis. `payment-reminder` jam 08:00 WIB) **timestamp baru**; ATAU query DB:
    ```sql
    SELECT task, status, startedAt FROM "CronRunLog" ORDER BY "startedAt" DESC LIMIT 10;
    ```
  - Expectasi: ada baris baru dengan `status='SUCCESS'` (atau task tertentu sukses) — bukan kosong selamanya.

- [ ] **V3 — Favicon** (fix Session 77):
  ```bash
  curl -sI https://qalcuity.com/favicon.ico | head -3
  ```
  Expectasi: `HTTP/2 200` (atau 200) + `content-type: image/x-icon`.

### Browser (login sebagai ADMIN)

- [ ] **V4 — Anomalies PATCH** (fix Session 77): buka `/dashboard/ai/anomalies` → lakukan aksi (dismiss/investigate) pada 1 anomaly.
  Expectasi: sukses, status berubah, **tidak ada** error `405` di Console (F12 → tab Network/Console).

- [ ] **V5 — Employees detail** (fix Session 77): buka `/dashboard/hr/employees/[id]` → data 1 employee tampil → edit 1 field → simpan.
  Expectasi: save sukses (request PUT membawa field `version` untuk optimistic locking), **tidak ada** `400` / `TypeError`.

- [ ] **V6 — TypeError hilang** (fix Session 77): buka satu per satu dengan Console terbuka:
  `/dashboard/pos/tables` · `/dashboard/projects/[id]` (1 project) · `/dashboard/inventory/stock-opname/[id]` · `/dashboard/pos/reports` · `/dashboard/community/assets` (jika menu tampil) · `/dashboard/analytics/explorer`
  Expectasi: **tidak ada** `Cannot read properties of undefined (reading 'total')` / `('length')`.

- [ ] **V7 — Team RBAC UI** (fix Session 77): login sebagai **MEMBER** → `/dashboard/settings/team`.
  Expectasi: tombol invite/edit/hapus **tersembunyi** (UI gating), **tidak ada** retry request 403 di Network tab.

- [ ] **V8 — Hydration**: jelajahi beberapa halaman (dashboard, finance, HR, POS).
  Expectasi: Console bersih dari React hydration errors (#418/#423).

- [ ] **V9 — Onboarding demo** (fix Session 78): login sebagai **ADMIN tenant baru/kosong** → dashboard.
  Expectasi: OnboardingModal auto-muncul; `GET /api/demo/status` sukses di Network tab. (Jika tenant lama berisi — tidak muncul = benar; verify via tenant test/baru.)

### Terminal VPS

- [ ] **V10 — Seed core skip** (fix Session 78): cek log `update.sh` Step 6b di atas → "Database sudah ter-seed ... skip core seed" (normal). Hanya warning "SEGERA ganti password" jika DB fresh.

- [ ] **V11 — Migrasi up-to-date**: `npx prisma migrate status` → `0 pending`.

### Ringkasan Keputusan

| V1–V11 | Status |
|--------|--------|
| Semua PASS | ✅ Redeploy sukses — tandai Session 79/80 selesai di CURRENT.md |
| Ada FAIL | ❌ Catat nomor V + evidence (screenshot/log) → jangan tandai production fixed |

---

## ⚠️ Rollback Instructions

### Jika Migrasi Gagal (Step 6 exit 1)

```bash
# 1. Baca error di output update.sh (script sudah menampilkan blok merah)
# 2. Jika butuh restore DB (migration korup):
cd /www/wwwroot/qalcuity/backups
ls -la db_backup_*.sql.gz          # pilih yang terbaru SEBELUM deploy
gunzip -c db_backup_YYYYMMDD_HHMMSS.sql.gz > /tmp/restore.sql
PG_BIN="/www/server/pgsql/bin"
$PG_BIN/psql -U postgres -d qalcuity -f /tmp/restore.sql

# 3. Rollback code ke commit sebelum deploy:
cd /www/wwwroot/qalcuity
git log --oneline -5               # catat commit sebelum deploy
git checkout <COMMIT_LAMA>
# lalu rebuild manual (lihat "Jika Build Gagal" di bawah)
```

### Jika Build Gagal (Step 7 exit 1)

> Migrasi SUDAH applied — aplikasi lama masih bisa di-restart. Fix code lalu jalankan ulang `update.sh`.

```bash
cd /www/wwwroot/qalcuity
git log --oneline -5
git checkout <COMMIT_LAMA>         # atau fix forward: pull fix baru
rm -rf apps/web/.next
pnpm install
cd packages/db && npx prisma generate && cd ../..
pnpm build
# Restart via aaPanel → Website → Node.js Project → Restart
```

### Jika Application Crash / Unreachable

```bash
# 1. Cek process
pgrep -f "next start" || echo "NOT RUNNING"
# 2. Cek health lokal
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/health
# 3. Restart via aaPanel (Node.js Project Manager → Restart)
# 4. Jika tetap mati — rollback code (lihat di atas) + rebuild
# 5. Cek error log aaPanel: /www/wwwroot/qalcuity/apps/web/ atau log project di aaPanel
```

---

## 📝 Notes

- [`update.sh`](update.sh) saat ini = **8 step + Step 6b `seed_core`** (deteksi DB fresh via Prisma Client, idempoten — skip jika SuperAdmin sudah ada).
- Backup otomatis sebelum setiap update, retention 7 hari (`find ... -mtime +7 -delete`).
- `prisma migrate deploy` selalu dijalankan (aman — hanya apply pending).
- aaPanel auto-restart via SIGHUP; health check 1× di Step 8 (200/302/307 = OK).
- Setelah V1–V11 PASS: update entry Session 80 di [`CURRENT.md`](CURRENT.md) — hapus penanda 🔴 REDEPLOY REQUIRED yang sudah tidak berlaku.

---

**Prepared:** 16 Oktober 2026 (Session 80)
**Supersedes:** checklist 6 September 2026 (scope 5 migrasi lama — sudah tidak relevan)
**Referensi:** [`docs/CRON-JOBS.md`](docs/CRON-JOBS.md) · [`docs/FRESH-VPS.md`](docs/FRESH-VPS.md) · [`plans/production-readiness-2026-10-16.md`](plans/production-readiness-2026-10-16.md)
