# Fresh VPS Bootstrap — Qalcuity

> **Runbook ini untuk VPS baru (belum ada pelanggan).**
> Filosofi: **DB fresh = kosong total** — hanya Tenant demo + SuperAdmin (platform admin) yang dibuat otomatis. Registrasi user baru selalu membuat tenant kosong; data demo hanya di-load kalau user memilihnya secara eksplisit.

> ⚠️ **VPS sudah jalan tapi DB-nya kotor (data test/demo/bisnis lama)?**
> Jangan ikuti runbook ini (butuh DB kosong dari nol). Gunakan **reset bertahap** di [`docs/RESET-PRODUCTION.md`](./RESET-PRODUCTION.md):
> - **Tier A — keep-accounts** (disarankan): hapus semua data transaksi, **pertahankan** akun user, tenant, role, langganan, konfigurasi. [`scripts/reset-production-data.sql`](../scripts/reset-production-data.sql)
> - **Tier B — full reset**: kosongkan semuanya kecuali tabel platform master, lalu core seed ulang (`SEED_DEMO=false`).
> - **Tier C — per-tenant**: hapus data demo 1 tenant saja via [`scripts/cleanup-demo-tenant.sql`](../scripts/cleanup-demo-tenant.sql).
>
> Data demo **tidak pernah dibuat otomatis** — user memuatnya sendiri via OnboardingModal / Settings (lihat [Step 6](#7-step-6-registrasi-tenant--data-demo-opt-in)).

**Last Updated:** 16 Oktober 2026 (Session 84) — tambah cross-link reset existing DB

---

## Daftar Isi

1. [Prasyarat](#1-prasyarat)
2. [Step 1: Deploy via aaPanel](#2-step-1-deploy-via-aapanel)
3. [Step 2: Database PostgreSQL](#3-step-2-database-postgresql)
4. [Step 3: Konfigurasi .env (WAJIB)](#4-step-3-konfigurasi-env-wajib)
5. [Step 4: Jalankan update.sh (auto core seed)](#5-step-4-jalankan-updatesh-auto-core-seed)
6. [Step 5: Login Pertama — GANTI PASSWORD](#6-step-5-login-pertama--ganti-password)
7. [Step 6: Registrasi Tenant & Data Demo (opt-in)](#7-step-6-registrasi-tenant--data-demo-opt-in)
8. [Step 7: Cron Scheduler](#8-step-7-cron-scheduler)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prasyarat

| Komponen | Versi / Nilai | Keterangan |
|----------|---------------|------------|
| OS | Ubuntu 22.04 / Debian 12 | VPS minimal 2 GB RAM |
| Panel | aaPanel + Node.js Project Manager | Bukan PM2 (lihat [AGENT.md §14](../AGENT.md)) |
| Node.js | v24.x | Dipasang via aaPanel |
| PostgreSQL | 15+ | Dipasang via aaPanel |
| Domain | A + AAAA record sudah menunjuk ke IP VPS | SSL via aaPanel Let's Encrypt |

---

## 2. Step 1: Deploy via aaPanel

1. **Install aaPanel** + extension **Node.js Project Manager**.
2. **Project → Add Node Project**:
   - **Project Dir**: `/www/wwwroot/qalcuity`
   - **Node Version**: v24
   - **Start Options**: `pnpm install && pnpm build` (atau biarkan kosong — jalankan manual via SSH)
   - **Port**: `3000`
3. **Clone repo** ke project dir (atau upload tarball):
   ```bash
   cd /www/wwwroot/qalcuity
   git clone <repo-url> .   # atau tarball extract
   pnpm install
   ```
4. **SSL**: aaPanel → Website → domain → SSL → Let's Encrypt.

---

## 3. Step 2: Database PostgreSQL

1. aaPanel → **PostgreSQL** → **Add Database** (catat DB name, user, password).
2. Pastikan database **masih kosong** (belum ada tabel) — ini DB fresh.
3. Format URL yang akan dipakai (tanpa `sslmode` dulu; tambahkan `?sslmode=require` jika PG remote):
   ```
   postgresql://<user>:<password>@localhost:5432/<dbname>?schema=public
   ```

---

## 4. Step 3: Konfigurasi .env (WAJIB)

Copy template lalu **isi nilai unik**:

```bash
cd /www/wwwroot/qalcuity
cp apps/web/.env.production.example apps/web/.env
```

### Nilai yang HARUS diganti (jangan pakai default template!)

| Variable | Nilai | Catatan |
|----------|-------|---------|
| `DATABASE_URL` | dari Step 2 | Wajib cocok dengan DB aaPanel |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | **Wajib unik** — jangan pakai contoh |
| `SMTP_ENCRYPTION_KEY` | `openssl rand -hex 32` | **Wajib unik** — encrypt SMTP password |
| `NEXTAUTH_URL` | `https://domain-anda.com` | Harus HTTPS, bukan localhost |
| `APP_TIMEZONE` | `Asia/Jakarta` | Untuk schedule cron |

### Nilai yang TIDAK boleh diubah (security posture)

| Variable | Nilai | Alasan |
|----------|-------|--------|
| `RBAC_STRICT` | `true` | Route tanpa RBAC entry = 403 (defense-in-depth). Jangan pernah `false` di production. |

> ⚠️ **Lihat juga:** [`apps/web/.env.example`](../apps/web/.env.example) — baris `RBAC_STRICT` sudah `true` sebagai default.

---

## 5. Step 4: Jalankan update.sh (auto core seed)

```bash
cd /www/wwwroot/qalcuity
sudo bash update.sh
```

[`update.sh`](../update.sh) akan otomatis:

1. Preflight checks → backup → `git pull` → `pnpm install`
2. `prisma generate` → `prisma migrate deploy` (buat semua tabel)
3. **Step 6b — Core seed otomatis** (baru, Session 78):
   - Query jumlah user `SUPERADMIN` via Prisma Client.
   - Jika **0** (DB fresh) → jalankan `SEED_DEMO=false npx prisma db seed`:
     - Tenant demo `qalcuity-demo` (PT Qalcuity Demo)
     - **SuperAdmin** `info@qalcuity.com`
     - 5 Plans (Free → Enterprise, grandfather pricing)
     - Platform Settings + Plan Tenant Limits + Tax Rates (PPN 11%, PPh 23/21)
     - Tenant Entitlement: Free plan (trial)
   - Jika **≥ 1** → skip (idempoten; password SuperAdmin TIDAK di-reset).
4. Build Next.js → restart → health check `localhost:3000/api/health`.

> **Reset manual** (jika butuh kembali ke state fresh seed):
> ```bash
> cd /www/wwwroot/qalcuity/packages/db
> FORCE_CORE_SEED=true SEED_DEMO=false npx prisma db seed
> ```

---

## 6. Step 5: Login Pertama — GANTI PASSWORD

1. Buka `https://domain-anda.com/login`.
2. Login: **`info@qalcuity.com` / `Wahyu123456789@`** (password default seed).
3. ⛔ **SEGERA ganti password** via Settings → Profile (password default tercatat di [`packages/db/prisma/seed.ts`](../packages/db/prisma/seed.ts) — publik di repo).
4. Verifikasi `RBAC_STRICT`: buka `/platform` sebagai user non-SUPERADMIN → harus 403.

---

## 7. Step 6: Registrasi Tenant & Data Demo (opt-in)

### Registrasi = tenant KOSONG (by design)

Flow registrasi (`/register`) hanya membuat **Tenant + User ADMIN** — tanpa data apapun. Ini by design untuk VPS multi-tenant fresh.

### Data demo = opt-in (2 jalur)

Setelah login sebagai ADMIN tenant baru:

**Jalur A — OnboardingModal (otomatis)**
- Muncul otomatis di dashboard saat tenant masih **kosong** (dicek via `GET /api/demo/status`).
- Hanya untuk role ADMIN/SUPERADMIN; hanya sekali per browser (localStorage dismiss).
- Pilihan: **🧪 Muat Data Demo** / **✨ Mulai dari Nol** / **Lewati untuk sekarang**.
- Juga muncul eksplisit via `?onboard=true` (redirect pasca-register).

**Jalur B — Settings manual**
- Settings → Profile → tombol **Muat Data Demo** (atau `?demo=true`).

Data demo (mulberry32 deterministik, anchor 2026-10-10): 23 kontak, 23 produk, 20 invoice, CRM pipeline, HR 15 karyawan, komunitas RT, dst. Rate limit: 5x / 5 menit / tenant.

---

## 8. Step 7: Cron Scheduler

Cukup **1 entry** di aaPanel → Cron (every 5 minutes):

```bash
*/5 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://domain-anda.com/api/cron/run
```

- `CRON_SECRET` = nilai yang sama di `.env`.
- Dispatcher otomatis mengecek jadwal tiap task (payment-reminder 08:00, stock-alert 6 jam, recurring-invoice 07:00, anomaly-scan 02:00, sod-exception-expiry 01:00).
- Detail: [`docs/CRON-JOBS.md`](./CRON-JOBS.md).

---

## 9. Troubleshooting

| Gejala | Penyebab | Solusi |
|--------|----------|--------|
| `403` di semua API meski login | `RBAC_STRICT=true` tapi route belum terdaftar di `route-permissions.ts` | Tambah entry RBAC, atau cek `RBAC_STRICT` tidak ter-set salah |
| SuperAdmin tidak bisa login | Core seed belum jalan (query DB gagal di Step 6b) | `cd packages/db && SEED_DEMO=false npx prisma db seed` |
| Password SuperAdmin tiba-tiba reset ke default | Ada yang menjalankan seed dengan `FORCE_CORE_SEED=true` | Cek log; reset password user |
| OnboardingModal tidak muncul | Tenant sudah punya data, atau sudah di-dismiss (localStorage) | Cek `GET /api/demo/status`; clear localStorage `qalcuity_onboarding_dismissed` |
| `prisma migrate deploy` gagal | DATABASE_URL salah / PG tidak jalan | Cocokkan `.env` dengan kredensial aaPanel PG |
| Build gagal `Cannot find module '@prisma/client'` | `prisma generate` belum jalan | `cd packages/db && npx prisma generate` |
| DB produksi penuh data test/demo & mau dibersihkan | Butuh reset existing DB (bukan VPS baru) | [`docs/RESET-PRODUCTION.md`](./RESET-PRODUCTION.md) — Tier A keep-accounts / Tier B full / Tier C per-tenant; **selalu preview dulu** (`-v execute=false`) |

---

## Checklist Ringkas (copy-paste untuk VPS baru)

```
[ ] aaPanel + Node.js PM + PostgreSQL terpasang
[ ] Repo ter-clone di /www/wwwroot/qalcuity, pnpm install
[ ] DB dibuat via aaPanel (kosong)
[ ] .env dari .env.production.example; NEXTAUTH_SECRET + SMTP_ENCRYPTION_KEY unik
[ ] RBAC_STRICT=true (jangan diubah)
[ ] sudo bash update.sh  → log harus menunjukkan "Database fresh terdeteksi — core seed"
[ ] Login info@qalcuity.com → GANTI PASSWORD
[ ] Registrasi tenant uji → modal opt-in demo muncul / tenant tetap kosong
[ ] Cron */5 menit → /api/cron/run dengan CRON_SECRET
[ ] SSL aktif, NEXTAUTH_URL = https://domain
```
