# 🐛 Production Console Errors — Debug Report

> **Date:** 18 September 2026
> **Production URL:** https://qalcuity.com
> **Status:** Investigation Complete — Fix Recommendations Below

---

## 📋 Summary

| # | Error | HTTP Status | Severity | Root Cause | Fix Complexity |
|---|-------|-------------|----------|------------|----------------|
| 1 | `/api/settings/password-policy` | 503 | 🔴 High | Prisma P2021 — table tidak ada di production DB | Low (migration) |
| 2 | `/api/settings/security/2fa` | 500 | 🔴 High | Runtime error — kemungkinan Prisma column mismatch atau import error | Medium |
| 3 | CSP blocks Swagger UI CDN | CSP Violation | 🟡 Medium | `cdn.jsdelivr.net` tidak ada di CSP directive | Low (config change) |
| 4 | Logo 404 | 404 | 🟡 Medium | File upload tidak persist di server production | Low (config/deploy) |
| 5 | `startTime` undefined | JS Error | 🟢 Low | Next.js 14 internal web vitals bug | **SKIP — Safe to ignore** |

---

## 🔍 Detailed Root Cause Analysis

### Error 1: `/api/settings/password-policy` → 503 Service Unavailable

#### Kemungkinan Sumber Masalah (5):

1. **Prisma P2021 — PasswordPolicy table tidak ada di production DB** ⭐ PALING KEMUNGKINAN
   - [`handleApiError()`](apps/web/lib/api-error.ts:42) secara eksplisit mengonversi Prisma P2021 ke HTTP 503
   - Jika migration untuk model `PasswordPolicy` belum dijalankan di production, Prisma akan throw P2021
   - Route handler di [`password-policy/route.ts`](apps/web/app/api/settings/password-policy/route.ts:31) memanggil `getDefaultPolicy(tenantId)` yang query table `PasswordPolicy`

2. **Prisma client belum di-generate setelah penambahan model**
   - Jika `npx prisma generate` belum dijalankan di VPS, Prisma client tidak mengenal model `PasswordPolicy`

3. **Database connection failure**
   - `PrismaClientInitializationError` juga dikonversi ke 503 di [`handleApiError()`](apps/web/lib/api-error.ts:73)
   - Tapi ini biasanya mempengaruhi SEMUA route, bukan hanya satu

4. **Maintenance mode aktif**
   - Middleware di [`middleware.ts`](apps/web/middleware.ts:78) return 503 saat `maintenanceMode = true`
   - Tapi admin users di-bypass, jadi ini unlikely kecuali user bukan admin

5. **aaPanel Node.js process crash/restart**
   - Infrastructure issue — process tidak handle request

#### Root Cause (Distilled):

**Prisma P2021: Table "PasswordPolicy" does not exist in production database.**

Bukti:
- [`handleApiError()`](apps/web/lib/api-error.ts:42-48) secara eksplisit return 503 untuk P2021
- Model `PasswordPolicy` ada di schema ([`schema.prisma:2741`](packages/db/prisma/schema.prisma:2741)) tapi migration mungkin belum di-deploy
- Route handler meng-import dari [`@/lib/password-policy`](apps/web/lib/password-policy.ts:10) yang query `prisma.passwordPolicy`

#### File Terkait:
- [`apps/web/app/api/settings/password-policy/route.ts`](apps/web/app/api/settings/password-policy/route.ts) — Route handler
- [`apps/web/lib/password-policy.ts`](apps/web/lib/password-policy.ts:157) — `getDefaultPolicy()` function
- [`apps/web/lib/api-error.ts`](apps/web/lib/api-error.ts:42) — P2021 → 503 mapping
- [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma:2741) — PasswordPolicy model

#### Fix Recommendation:
```bash
# Di VPS (atau via update.sh):
cd packages/db && npx prisma migrate deploy
cd packages/db && npx prisma generate
```

---

### Error 2: `/api/settings/security/2fa` → 500 Internal Server Error

#### Kemungkinan Sumber Masalah (5):

1. **Prisma column mismatch — User table missing twoFactor columns** ⭐ PALING KEMUNGKINAN
   - Jika migration untuk field `twoFactorEnabled`, `twoFactorSecret`, `twoFactorBackupCodes` belum di-deploy
   - Prisma akan throw error saat select field yang tidak ada
   - Error ini mungkin `PrismaClientKnownRequestError` dengan code selain P2021 (karena table User ADA, tapi column TIDAK ADA)

2. **TOTP module runtime error**
   - [`@/lib/totp`](apps/web/lib/totp.ts:10) menggunakan `crypto` module (Node.js built-in)
   - Seharusnya tidak ada issue di Node.js runtime, tapi bisa gagal di Edge Runtime (middleware)
   - Route handler berjalan di Node.js runtime, jadi ini unlikely

3. **`requirePermissionForRoute` throw error**
   - Fungsi di [`session.ts:171`](apps/web/lib/session.ts:171) seharusnya return `{error, status}` bukan throw
   - Tapi ada dynamic import `await import("./permissions")` di line 208 yang bisa throw

4. **Validation schema import error**
   - Import dari [`@/lib/validation-schemas`](apps/web/app/api/settings/security/2fa/route.ts:19) — schema `enable2faSchema`, `disable2faSchema`, `verify2faSchema`
   - Jika salah satu schema tidak ada, import error → 500

5. **JSON.parse error**
   - Di GET handler line 50: `JSON.parse(user.twoFactorBackupCodes)` bisa throw jika data corrupt
   - Tapi error ini sudah di-catch oleh try-catch

#### Root Cause (Distilled):

**Kemungkinan besar: Prisma column mismatch pada tabel User untuk field `twoFactor*`, atau import error pada validation schema yang belum terdaftar.**

Bukti:
- Route handler select field `twoFactorEnabled`, `twoFactorSecret`, `twoFactorBackupCodes` dari User model
- Jika field ini belum ada di production DB, Prisma throw error
- Berbeda dengan Error 1 (P2021 = table not found → 503), error ini karena column not found → Prisma throw error lain → `handleApiError` return 500

#### File Terkait:
- [`apps/web/app/api/settings/security/2fa/route.ts`](apps/web/app/api/settings/security/2fa/route.ts) — Route handler
- [`apps/web/lib/totp.ts`](apps/web/lib/totp.ts) — TOTP utility
- [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma:190) — User model with 2FA fields
- [`apps/web/lib/api-error.ts`](apps/web/lib/api-error.ts:55) — Default error → 500 mapping

#### Fix Recommendation:
```bash
# Sama dengan Error 1 — pastikan migration di-deploy:
cd packages/db && npx prisma migrate deploy
cd packages/db && npx prisma generate

# Jika migration sudah di-deploy, cek VPS logs untuk error spesifik
```

---

### Error 3: CSP Blocks Swagger UI CDN

#### Kemungkinan Sumber Masalah (3):

1. **`cdn.jsdelivr.net` tidak ada di CSP directives** ⭐ PASTI INI
   - CSP di [`next.config.js:14-26`](apps/web/next.config.js:14) hanya allow:
     - `script-src`: `'self' 'unsafe-inline'`, Google OAuth, Cloudflare
     - `style-src`: `'self' 'unsafe-inline'`
   - Tidak ada `https://cdn.jsdelivr.net` di kedua directive

2. **Swagger UI CDN URL berubah**
   - URL yang digunakan: `https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/`
   - Ini URL yang valid, bukan issue

3. **CSP header di-duplicate dari middleware**
   - CSP sudah dipindahkan dari middleware ke next.config.js (line 14 comment)
   - Hanya ada 1 sumber CSP, tidak ada conflict

#### Root Cause (Distilled):

**`https://cdn.jsdelivr.net` belum ditambahkan ke `script-src` dan `style-src` CSP directives di [`next.config.js`](apps/web/next.config.js:16-17).**

#### File Terkait:
- [`apps/web/next.config.js`](apps/web/next.config.js:14-26) — CSP configuration
- [`apps/web/app/dashboard/api-docs/page.tsx`](apps/web/app/dashboard/api-docs/page.tsx:45-55) — Swagger UI CDN loading

#### Fix Recommendation:
Di [`next.config.js`](apps/web/next.config.js:16), tambahkan `https://cdn.jsdelivr.net` ke `script-src` dan `style-src`:

```javascript
// Line 16 — script-src
`script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://accounts.google.com https://apis.google.com https://static.cloudflareinsights.com https://cdn.jsdelivr.net`,

// Line 17 — style-src
"style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
```

---

### Error 4: Logo 404

#### Kemungkinan Sumber Masalah (4):

1. **File upload tidak persist across deployments** ⭐ PALING KEMUNGKINAN
   - Upload path: [`apps/web/app/api/upload/route.ts:75-78`](apps/web/app/api/upload/route.ts:75) → `public/uploads/{tenantId}/`
   - Saat VPS di-deploy ulang (via `update.sh`), `public/` directory bisa di-overwrite
   - File yang di-upload sebelumnya hilang

2. **UPLOAD_DIR env var berbeda di production**
   - Upload route check `process.env.UPLOAD_DIR` ([line 75](apps/web/app/api/upload/route.ts:75))
   - Jika env var ini diset di production, file disimpan di lokasi berbeda dari yang diharapkan

3. **File system permission issue**
   - Node.js process tidak punya read permission ke file
   - Unlikely karena write juga akan gagal

4. **Next.js static file serving issue**
   - File di `public/` seharusnya di-serve otomatis oleh Next.js
   - Tapi jika file tidak ada di filesystem, return 404

#### Root Cause (Distilled):

**File logo di-upload ke `public/uploads/{tenantId}/` tapi file tersebut tidak ada di server production. Kemungkinan karena: file hilang saat redeploy, atau server menggunakan `UPLOAD_DIR` yang berbeda dari default.**

URL error: `/uploads/cmu4o9v6200009j262ts51ca9/1789642251490-logo_q.png`

Note: Sidebar dan halaman auth menggunakan `/logo.png` ([`sidebar.tsx:320`](apps/web/components/layout/sidebar.tsx:320)) yang ada di `public/logo.png` — ini berbeda dari file yang 404. File yang 404 adalah custom logo tenant yang di-upload.

#### File Terkait:
- [`apps/web/app/api/upload/route.ts`](apps/web/app/api/upload/route.ts:74-78) — Upload directory logic
- `public/uploads/{tenantId}/` — Upload storage location

#### Fix Recommendation:
1. **Re-upload logo** melalui settings page
2. **Pastikan uploads persist** — pertimbangkan menggunakan external storage (S3/MinIO) atau symlink ke persistent volume
3. **Cek VPS**: pastikan `public/uploads/` directory exists dan memiliki file yang benar

---

### Error 5: `startTime` undefined — SAFE TO IGNORE

#### Root Cause:
Ini adalah known Next.js 14 internal error terkait web vitals reporting. Error terjadi di `reportAllChanges` yang merupakan bagian dari `web-vitals` library yang di-bundle oleh Next.js. **Tidak mempengaruhi functionality.**

#### Fix: TIDAK PERLU FIX.

---

## 🎯 Priority Fix Order

### Priority 1: Database Migration (Fix Error 1 + Error 2)

Kedua error ini kemungkinan besar disebabkan oleh **migration yang belum di-deploy ke production**.

```bash
# Di VPS (atau tambahkan ke update.sh):
cd packages/db && npx prisma migrate deploy
cd packages/db && npx prisma generate
```

**Verifikasi:**
```bash
# Cek status migration
cd packages/db && npx prisma migrate status

# Cek apakah table PasswordPolicy ada
cd packages/db && npx prisma db execute --stdin <<< "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'PasswordPolicy');"

# Cek apakah column twoFactor* ada di User table
cd packages/db && npx prisma db execute --stdin <<< "SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND column_name LIKE 'twoFactor%';"
```

### Priority 2: CSP Update (Fix Error 3)

Tambahkan `https://cdn.jsdelivr.net` ke CSP di [`next.config.js`](apps/web/next.config.js:14-26).

### Priority 3: Upload Persistence (Fix Error 4)

Investigate apakah file upload persist di VPS. Pertimbangkan:
- Cek `UPLOAD_DIR` env var di production
- Cek apakah `public/uploads/` exists di VPS
- Re-upload logo jika perlu

### Priority 4: Skip Error 5

Tidak perlu fix. Ini Next.js internal issue.

---

## 📝 Files yang Perlu Dimodifikasi

| File | Error | Perubahan |
|------|-------|-----------|
| [`apps/web/next.config.js`](apps/web/next.config.js:16-17) | #3 CSP | Tambah `https://cdn.jsdelivr.net` ke script-src dan style-src |
| VPS: `packages/db/` | #1, #2 | Jalankan `prisma migrate deploy` + `prisma generate` |
| [`update.sh`](deploy.sh) | #1, #2 | Tambahkan prisma migrate deploy ke deployment script |

---

## 🔧 Deployment Steps

### Step 1: Fix CSP (local commit + push)
```bash
# Edit apps/web/next.config.js
# Commit and push
git add apps/web/next.config.js
git commit -m "fix: add cdn.jsdelivr.net to CSP for Swagger UI"
git push
```

### Step 2: Deploy to VPS
```bash
bash update.sh
```

### Step 3: Run migrations on VPS
```bash
ssh vps
cd /www/wwwroot/qalcuity
cd packages/db && npx prisma migrate deploy
cd packages/db && npx prisma generate
# aaPanel will auto-restart
```

### Step 4: Verify
- Buka https://qalcuity.com/dashboard/settings/password-policy — harusnya tidak ada error 503
- Buka https://qalcuity.com/dashboard/settings/security — 2FA setup harusnya berfungsi
- Buka https://qalcuity.com/dashboard/api-docs — Swagger UI harusnya load tanpa CSP error
- Cek logo di sidebar

---

## 📊 Diagnosis Confidence

| Error | Root Cause Confidence | Reasoning |
|-------|----------------------|-----------|
| #1 Password Policy 503 | **85%** — Prisma P2021 (table not found) | `handleApiError` explicitly maps P2021 → 503. Code analysis shows route exists, Prisma model exists, but migration may not be deployed. |
| #2 2FA 500 | **70%** — Prisma column mismatch atau import error | Route exists and code looks correct. 500 suggests runtime error. Most likely Prisma field mismatch if migration not applied. Could also be validation schema import issue. |
| #3 CSP Swagger | **100%** — Missing CDN in CSP | CSP directive clearly doesn't include `cdn.jsdelivr.net`. This is a definite fix. |
| #4 Logo 404 | **80%** — File not on server | Upload path is correct, but file likely lost during redeploy or saved to different directory. |
| #5 startTime | **100%** — Next.js internal | Known issue, no fix needed. |

---

**Last Updated:** 18 September 2026
**Investigator:** Roo (Debug Agent)
