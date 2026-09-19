# Deployment Guide: Commit 55a32bb — VPS Fixes

> **Commit:** `55a32bb`  
> **Date:** 2026-09-17  
> **Author:** Qalcuity AI Team  
> **Target:** VPS Production (`/www/wwwroot/qalcuity`)

---

## Ringkasan Perubahan

Commit ini berisi 3 fixes untuk masalah VPS:

| # | File | Perubahan |
|---|------|-----------|
| 1 | [`apps/web/start.sh`](apps/web/start.sh:1) | Simplified dari 296→62 lines — **v5.0**, menghapus port detection/kill/retry yang konflik dengan aaPanel |
| 2 | [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts:27) | Explicit OAuth params + `isGoogleOAuthConfigured()` graceful degradation + enhanced error logging |
| 3 | [`apps/web/app/(auth)/login/page.tsx`](apps/web/app/(auth)/login/page.tsx:160) | OAuth error code → user-friendly Indonesian messages (OAuthSignin, OAuthCallback, dll.) |

### Root Cause yang Difix

**Ghost listener port 3000:** `start.sh` v3.0-v4.0 menjalankan `fuser -k -9` dan `pkill -9` yang membunuh internal monitoring/proxy process milik aaPanel di port 3000. Ketika aaPanel "stop" app, hanya shell script yang di-kill, tapi orphaned internal process aaPanel tetap memegang port 3000.

**Solusi:** `start.sh` v5.0 hanya menjalankan `npx next start -p 3000` — tanpa port detection, kill, atau retry logic. aaPanel menangani semua process lifecycle management.

---

## Prerequisites

- [x] Akses SSH ke VPS (atau terminal di VPS)
- [x] Commit `55a32bb` sudah di-push ke GitHub
- [x] aaPanel Node.js Project Manager terinstall

---

## Step-by-Step Deployment

### Step 1: Stop aaPanel Process Manager

**Tujuan:** Melepaskan ghost listener di port 3000.

**Option A — Via aaPanel Web UI (Recommended):**
1. Login ke aaPanel (biasanya `http://VPS_IP:8888`)
2. Buka **Node.js Project Manager**
3. Klik **Stop** pada project Qalcuity
4. Tunggu sampai status berubah ke "Stopped"

**Option B — Command Line:**
```bash
# Stop aaPanel-managed process
cd /www/server/panel/plugin/nodejs
python /www/server/panel/plugin/nodejs/nodejs_main.py stop qalcuity 2>/dev/null || true
```

### Step 2: Kill Semua Node Processes yang Tersisa

```bash
# Kill semua next start processes
pkill -f "next start" || true

# Kill node processes di port 3000
pkill -f "node.*3000" || true

# Tunggu 2 detik untuk cleanup
sleep 2
```

### Step 3: Verifikasi Port 3000 Bebas

```bash
ss -tlnp | grep :3000
```

**Expected output:** Kosong (tidak ada output). Jika masih ada process, ulangi Step 2.

**Jika masih occupied:**
```bash
# Cari PID yang memegang port 3000
ss -tlnp | grep :3000

# Kill paksa PID tersebut (ganti <PID> dengan angka yang muncul)
kill -9 <PID>

# Verifikasi lagi
ss -tlnp | grep :3000
```

### Step 4: Pull Latest Code

```bash
cd /www/wwwroot/qalcuity
git pull origin main
```

**Verify commit:**
```bash
git log --oneline -1
# Harus menampilkan: 55a32bb ...
```

**Verify start.sh version:**
```bash
head -10 apps/web/start.sh
# Harus menampilkan v5.0 comment block
```

### Step 5: Build

```bash
cd /www/wwwroot/qalcuity/apps/web
npx next build
```

**Expected:** Build selesai tanpa errors. Jika ada errors, cek log dan pastikan `.env` sudah benar.

**⚠️ Catatan penting:**
- Build bisa memakan waktu 3-5 menit tergantung specs VPS
- Pastikan `PRISMA_QUERY_ENGINE_TYPE=library` sudah di-set di `.env`

### Step 6: Start via aaPanel

**⚠️ JANGAN jalankan `start.sh` langsung dari terminal!**

**Option A — Via aaPanel Web UI (Recommended):**
1. Buka **Node.js Project Manager** di aaPanel
2. Klik **Start** pada project Qalcuity
3. aaPanel akan menjalankan [`apps/web/start.sh`](apps/web/start.sh:1) secara otomatis
4. Status harus berubah ke "Running"

**Option B — Jika perlu restart via aaPanel CLI:**
```bash
cd /www/server/panel/plugin/nodejs
python /www/server/panel/plugin/nodejs/nodejs_main.py restart qalcuity
```

### Step 7: Verifikasi App Running

```bash
# Cek apakah app listening di port 3000
ss -tlnp | grep :3000

# Test HTTP response
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Expected: 200

# Cek logs
tail -20 /www/wwwroot/qalcuity/apps/web/logs/*.log 2>/dev/null || echo "No log files found"
```

---

## Post-Deployment Verification

### A. Login Test
1. Buka `https://qalcuity.com/login`
2. Login dengan email/password
3. Verifikasi redirect ke `/dashboard`

### B. OAuth Status Check
```bash
# Cek Google OAuth provider availability
curl -s https://qalcuity.com/api/auth/providers | python3 -m json.tool
```

**Expected:** 
- `credentials` provider: `id: "credentials"`
- `google` provider: Hanya muncul jika `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` valid di `.env`

### C. Error Message Test (OAuth)
Jika Google OAuth gagal, user akan melihat pesan error dalam Bahasa Indonesia:
- `OAuthSignin` → "Gagal memulai login Google. Pastikan login Google telah aktif di pengaturan."
- `OAuthCallback` → "Gagal memproses callback dari Google. Silakan coba lagi."
- `OAuthAccountNotLinked` → "Email ini sudah terdaftar dengan akun lain. Silakan gunakan login email/password."

### D. start.sh Behavior Verification
```bash
# Cek start.sh sudah versi v5.0
grep "v5.0" /www/wwwroot/qalcuity/apps/web/start.sh
# Expected: v5.0 (2026-09-17): SIMPLE — aaPanel manages process lifecycle.

# Verifikasi TIDAK ada exec, fuser, atau pkill di start.sh
grep -E "(exec|fuser|pkill)" /www/wwwroot/qalcuity/apps/web/start.sh || echo "PASS: No dangerous commands found"
# Expected: PASS: No dangerous commands found
```

---

## Google OAuth Env Vars Checklist

Pastikan variabel berikut sudah benar di `/www/wwwroot/qalcuity/apps/web/.env`:

| Variable | Status | Notes |
|----------|--------|-------|
| `GOOGLE_CLIENT_ID` | ✅ Configured | Format: `xxxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | ✅ Configured | Format: `GOCSPX-xxxxx` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | ✅ Configured | Sama dengan `GOOGLE_CLIENT_ID` |
| `GOOGLE_OAUTH_SKIP_HEALTH_CHECK` | ✅ Set `"true"` | Diperlukan karena VPS tidak bisa reach `accounts.google.com` |
| `NEXTAUTH_URL` | ✅ `"https://qalcuity.com"` | WAJIB https, bukan http |
| `NEXTAUTH_SECRET` | ✅ Configured | Hex string, minimal 32 chars |

---

## Rollback Plan

Jika deployment gagal, rollback ke versi sebelumnya:

```bash
cd /www/wwwroot/qalcuity

# Cari commit sebelum 55a32bb
git log --oneline -5

# Rollback
git checkout <previous-commit-hash>

# Build ulang
cd apps/web && npx next build

# Restart via aaPanel
```

---

## Troubleshooting

### Masalah: Port 3000 masih occupied setelah kill
```bash
# Force kill semua node processes
killall -9 node || true
sleep 3
ss -tlnp | grep :3000
```

### Masalah: Build gagal
```bash
# Cek Prisma engine
cd /www/wwwroot/qalcuity/packages/db
npx prisma generate

# Cek node_modules
cd /www/wwwroot/qalcuity
pnpm install

# Retry build
cd apps/web && npx next build
```

### Masalah: aaPanel tidak bisa start app
```bash
# Cek apakah start.sh punya execute permission
chmod +x /www/wwwroot/qalcuity/apps/web/start.sh

# Cek .env file exists
ls -la /www/wwwroot/qalcuity/apps/web/.env

# Cek Prisma query engine type
grep PRISMA_QUERY_ENGINE_TYPE /www/wwwroot/qalcuity/apps/web/.env
# Expected: PRISMA_QUERY_ENGINE_TYPE=library
```

### Masalah: Google OAuth redirect URI mismatch
1. Cek Google Cloud Console → OAuth 2.0 Client IDs
2. Pastikan **Authorized redirect URIs** termasuk:
   ```
   https://qalcuity.com/api/auth/callback/google
   ```
3. Jangan lupa save di Google Cloud Console

---

## File References

| File | Purpose |
|------|---------|
| [`apps/web/start.sh`](apps/web/start.sh:1) | v5.0 — Simplified start script (62 lines) |
| [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts:27) | `isGoogleOAuthConfigured()` + explicit OAuth params |
| [`apps/web/app/(auth)/login/page.tsx`](apps/web/app/(auth)/login/page.tsx:160) | OAuth error code → Indonesian messages |
| [`apps/web/.env.production`](apps/web/.env.production:1) | Production env vars template |
| [`apps/web/.env`](apps/web/.env:1) | Actual production env vars (on VPS) |

---

**Last Updated:** 2026-09-17  
**Document Version:** 1.0
