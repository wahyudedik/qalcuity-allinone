# 🔍 Google OAuth Deep Debug Report v2 — `OAuthSignin` Error

> **Date:** 2026-09-17 (Deep Analysis Session)
> **Error:** `{error: 'OAuthSignin', description: null}`
> **URL:** `https://qalcuity.com/login?callbackUrl=...&error=OAuthSignin`
> **NextAuth Version:** ^4.24.15
> **Status:** Diagnosis — Belum di-fix

---

## 📋 Ringkasan Error

User mengklik tombol "Login Google" → NextAuth gagal memulai redirect ke Google → User dikembalikan ke `/login?error=OAuthSignin`.

Error `OAuthSignin` terjadi **SEBELUM redirect ke Google** — artinya masalahnya di sisi server saat NextAuth mencoba membangun authorization URL atau saat memulai OAuth flow.

---

## 📁 File yang Dianalisis

| # | File | Lines | Temuan |
|---|------|-------|--------|
| 1 | [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts:1) | 304 | NextAuth config lengkap |
| 2 | [`apps/web/.env.production`](apps/web/.env.production:1) | 122 | Environment variables |
| 3 | [`apps/web/middleware.ts`](apps/web/middleware.ts:1) | 161 | Auth middleware (Edge Runtime) |
| 4 | [`apps/web/next.config.js`](apps/web/next.config.js:1) | 128 | Security headers + CSP |
| 5 | [`apps/web/app/api/auth/providers/route.ts`](apps/web/app/api/auth/providers/route.ts:1) | 103 | Provider availability check |
| 6 | [`apps/web/app/(auth)/login/page.tsx`](apps/web/app/(auth)/login/page.tsx:1) | 397 | Login page UI |
| 7 | [`apps/web/types/next-auth.d.ts`](apps/web/types/next-auth.d.ts:1) | 24 | NextAuth type extensions |
| 8 | [`apps/web/package.json`](apps/web/package.json:29) | 53 | Dependencies (next-auth ^4.24.15) |
| 9 | [`plans/google-oauth-debug.md`](plans/google-oauth-debug.md:1) | 257 | Debug report v1 |

---

## 🔬 Deep Analysis: 7 Kemungkinan Sumber Masalah

### 1. 🔴 `isGoogleOAuthConfigured()` Return False → Provider Tidak Registered

**Kemungkinan:** Jika env vars `GOOGLE_CLIENT_ID` atau `GOOGLE_CLIENT_SECRET` tidak ada/invalid di runtime VPS, fungsi [`isGoogleOAuthConfigured()`](apps/web/lib/auth.ts:27) return `false`. Google provider tidak didaftarkan ke NextAuth. Ketika user klik "Login Google", NextAuth tidak menemukan provider → redirect ke `?error=OAuthSignin`.

**Evidence:**
- [`isGoogleOAuthConfigured()`](apps/web/lib/auth.ts:27) hanya cek env vars (format, length, placeholder)
- Tidak ada log saat function return false (hanya log untuk placeholder)
- Jika provider tidak registered, Google button seharusnya TIDAK muncul

**Kontradiksi:** User bisa klik tombol Google → berarti [`/api/auth/providers`](apps/web/app/api/auth/providers/route.ts:25) return `google: true`. Route ini juga cek env vars secara independen. **Jadi env vars ADA dan VALID di VPS.**

**Verdict:** ⚠️ KEMUNGKINAN RENDAH — kecuali ada timing/caching issue antara providers route dan auth.ts

---

### 2. 🔴 CSP `form-action 'self'` Blokir OAuth Form POST

**Kemungkinan:** NextAuth v4 `signIn('google')` dari client-side menggunakan form POST ke `/api/auth/signin/google`. Server return 302 redirect ke Google. CSP `form-action 'self'` di [`next.config.js:24`](apps/web/next.config.js:24) memblokir form submission ke URL cross-origin (Google).

**Evidence:**
- CSP header di [`next.config.js`](apps/web/next.config.js:14): `"form-action 'self'"`
- NextAuth v4 `signIn()` untuk OAuth providers bisa menggunakan form POST

**Counter-evidence:**
- NextAuth v4.24 `signIn('google')` menggunakan `window.location.href` (GET redirect), BUKAN form POST
- Form POST hanya digunakan untuk credentials provider
- `form-action 'self'` hanya memblokir form submission, bukan server-side 302 redirect

**Verdict:** ⚠️ KEMUNGKINAN SEDANG — perlu verifikasi apakah NextAuth v4.24.15 menggunakan form POST atau GET redirect untuk OAuth signIn

---

### 3. 🔴 Missing `trustHost: true` → Reverse Proxy Host Mismatch

**Kemungkinan:** VPS menggunakan aaPanel dengan Nginx reverse proxy. Tanpa `trustHost: true` di auth options, NextAuth v4.24+ mungkin gagal memvalidasi host saat OAuth flow.

**Evidence:**
- TIDAK ada `trustHost` di [`authOptions`](apps/web/lib/auth.ts:57)
- VPS menggunakan aaPanel reverse proxy (Nginx)
- NextAuth v4.22+ menambahkan `trustHost` option untuk reverse proxy scenarios

**Counter-evidence:**
- Credentials login BEKERJA — yang juga melewati reverse proxy
- `NEXTAUTH_URL="https://qalcuity.com"` sudah diset → NextAuth gunakan ini sebagai base URL

**Verdict:** ⚠️ KEMUNGKINAN SEDANG — credentials login mungkin tidak terpengaruh karena flow berbeda (POST vs redirect)

---

### 4. 🟠 Server-Side Error During `getAuthorizationUrl()` (Silent Failure)

**Kemungkinan:** Fungsi `getAuthorizationUrl()` di NextAuth v4 melempar error saat membangun authorization URL. Error ditangkap di catch block dan return `?error=OAuthSignin`. Tanpa `debug: true` di production, error ini SILENT (tidak ter-log).

**Evidence:**
- [`debug: process.env.NODE_ENV === "development"`](apps/web/lib/auth.ts:303) → `false` di production
- NextAuth v4 catch block: `catch (error) { res.redirect(\`${baseUrl}/auth/error?error=OAuthSignin\`) }`
- Error detail TIDAK ter-log tanpa debug mode

**Root cause spesifik yang mungkin:**
1. `provider.authorization.url` undefined (unlikely — hardcoded di GoogleProvider)
2. `createCallbackUrl()` gagal (unlikely — hanya concat URL)
3. `checks` parameter (PKCE/state) gagal generate (unlikely — crypto.randomBytes)
4. Race condition saat provider initialization

**Verdict:** 🔴 KEMUNGKINAN TINGGI — ini adalah catch-all error. Tanpa debug logging, kita TIDAK BISA tahu error spesifiknya.

---

### 5. 🟠 VPS `.env` File Mismatch dengan Local Template

**Kemungkinan:** File [`apps/web/.env.production`](apps/web/.env.production:1) di repo adalah TEMPLATE. File `.env` di VPS mungkin berbeda (missing vars, wrong values, trailing characters).

**Evidence:**
- Komentar di file: `# ⚠️ PENTING: Edit file ini di SERVER, bukan di local!`
- VPS mungkin punya `.env` yang berbeda dari `.env.production`

**Counter-evidence:**
- Google button visible → env vars ADA di VPS
- User sudah verifikasi Google Cloud Console config benar

**Verdict:** ⚠️ KEMUNGKINAN RENDAH — env vars sudah terbukti ada (button visible)

---

### 6. 🟠 OAuth Consent Screen Dalam Mode "Testing"

**Kemungkinan:** Google OAuth consent screen belum dipublish. Dalam mode "Testing", hanya test users yang bisa authenticate. User biasa akan di-block oleh Google.

**Evidence:**
- Ini adalah masalah umum untuk Google OAuth baru
- Error terjadi di sisi Google, bukan sisi Qalcuity

**Counter-evidence:**
- Error `OAuthSignin` terjadi SEBELUM redirect ke Google
- Jika consent screen bermasalah, error akan terjadi di callback (`OAuthCallback`), bukan di signin
- User mengatakan Google Cloud Console config sudah benar

**Verdict:** 🟡 KEMUNGKINAN RENDAH — error timing tidak cocok

---

### 7. 🟡 Client Secret Expired/Revoked

**Kemungkinan:** Google secara otomatis rotate client secret. Secret di VPS sudah tidak valid.

**Evidence:**
- Google bisa rotate secret secara otomatis
- Jika secret invalid, token exchange gagal

**Counter-evidence:**
- Error `OAuthSignin` terjadi SEBELUM token exchange
- Token exchange terjadi di callback, bukan di signin
- User mengatakan client secret valid

**Verdict:** 🟡 KEMUNGKINAN RENDAH — error timing tidak cocok

---

## 🎯 Top 1-2 Root Cause (Most Likely)

### Root Cause #1: Silent Server-Side Error During OAuth Flow Initiation (No Debug Logging)

**Probability:** 🔴 TINGGI

**Mengapa ini paling mungkin:**
- `OAuthSignin` adalah catch-all error di NextAuth v4 untuk SEMUA kegagalan saat inisiasi OAuth flow
- Tanpa `debug: true` di production, error detail TIDAK ter-log
- Kita TIDAK BISA mengetahui error spesifiknya tanpa debug logging
- Error bisa disebabkan oleh: host validation, CSRF token mismatch, provider config issue, atau runtime error

**Bukti pendukung:**
- [`debug: process.env.NODE_ENV === "development"`](apps/web/lib/auth.ts:303) → `false` di production
- NextAuth v4 catch block hanya return error code, tidak log error detail
- Tidak ada custom error logging di NextAuth routes

**Mengapa credentials login BEKERJA:**
- Credentials login menggunakan flow yang BERBEDA (POST langsung ke callback)
- Tidak melalui `getAuthorizationUrl()` atau OAuth redirect flow
- Error di credentials flow ditangani oleh `authorize()` function, bukan OAuth catch block

---

### Root Cause #2: Missing `trustHost: true` + Reverse Proxy Host Validation Failure

**Probability:** 🟠 SEDANG-TINGGI

**Mengapa ini mungkin:**
- VPS menggunakan aaPanel Nginx reverse proxy
- NextAuth v4.22+ menambahkan host validation
- Tanpa `trustHost: true`, NextAuth mungkin reject OAuth flow karena host mismatch
- OAuth flow lebih sensitif terhadap host validation karena melibatkan external redirect

**Bukti pendukung:**
- TIDAK ada `trustHost` di [`authOptions`](apps/web/lib/auth.ts:57)
- Credentials login mungkin tidak terpengaruh karena POST langsung (bukan redirect flow)
- OAuth flow memerlukan validasi host untuk construct callback URL

**Mengapa credentials login BEKERJA:**
- POST ke `/api/auth/callback/credentials` adalah same-origin request
- Browser mengirim `Host: qalcuity.com` header
- NextAuth tidak perlu validasi host untuk POST request
- OAuth flow memerlukan validasi host untuk construct redirect URI

---

## 🔧 Detailed Code Analysis

### [`auth.ts`](apps/web/lib/auth.ts:57) — NextAuth Config

```typescript
export const authOptions: NextAuthOptions = {
    providers: [
        // Google provider — conditional registration
        ...(isGoogleOAuthConfigured() ? [GoogleProvider({...})] : []),
        CredentialsProvider({...}),
    ],
    callbacks: {
        signIn({ user, account }) { ... },  // ← Hanya proses Google OAuth
        jwt({ token, user }) { ... },
        session({ session, token }) { ... },
        redirect({ url, baseUrl }) { ... },
    },
    pages: {
        signIn: "/login",
        error: "/login",  // ← OAuthSignin redirect ke sini
    },
    session: { strategy: "jwt" },
    secret,  // ← MANDATORY
    debug: process.env.NODE_ENV === "development",  // ← false di production!
    // ❌ TIDAK ADA: trustHost: true
    // ❌ TIDAK ADA: cookies config (sameSite, secure, etc.)
};
```

**Issues yang ditemukan:**
1. ❌ `trustHost: true` tidak diset → bisa menyebabkan host validation failure
2. ❌ `debug: false` di production → error silent
3. ⚠️ `signIn` callback membuat Tenant+User baru untuk OAuth pertama kali → bisa gagal jika DB error
4. ⚠️ Tidak ada explicit `checks` parameter di GoogleProvider

### [`.env.production`](apps/web/.env.production:101) — Environment Variables

```
NEXTAUTH_URL="https://qalcuity.com"           ✅ Correct
NEXTAUTH_SECRET="3522d3..."                    ✅ Present (64 chars hex)
GOOGLE_CLIENT_ID="1095304311939-..."           ✅ Format valid (*.apps.googleusercontent.com)
GOOGLE_CLIENT_SECRET="GOCSPX-9IbarMnbj..."    ✅ Format valid (GOCSPX-*)
NODE_ENV="production"                          ✅ Correct
GOOGLE_OAUTH_SKIP_HEALTH_CHECK="true"          ⚠️ menunjukkan known connectivity issue
```

**Issues yang ditemukan:**
1. ⚠️ `GOOGLE_OAUTH_SKIP_HEALTH_CHECK="true"` — flag ini menunjukkan developer sudah tahu ada masalah connectivity
2. ✅ Semua env vars required sudah ada dengan format benar
3. ⚠️ Flag ini TIDAK digunakan di `auth.ts` — hanya digunakan di `/api/auth/providers` route

### [`middleware.ts`](apps/web/middleware.ts:57) — Auth Middleware

```typescript
const PUBLIC_API_PATHS = [
    "/api/auth",  // ← Skip auth + rate limit untuk semua auth routes
    ...
];

export const config = {
    matcher: ["/dashboard/:path*", "/platform/:path*", "/api/:path*"],
};
```

**Analysis:**
- ✅ `/api/auth` ada di `PUBLIC_API_PATHS` → auth routes skip middleware auth
- ✅ Rate limiting TIDAK diterapkan ke `/api/auth` routes
- ✅ Middleware tidak memblokir OAuth flow
- ✅ `authorized` callback return `true` untuk `/api/auth/*` paths

### [`next.config.js`](apps/web/next.config.js:6) — Security Headers

```javascript
const securityHeaders = [
    {
        key: 'Content-Security-Policy',
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://accounts.google.com ...",
            "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com ...",
            "frame-src 'self' https://accounts.google.com",
            "form-action 'self'",           // ⚠️ Bisa blokir OAuth form POST
            "frame-ancestors 'none'",
        ].join('; '),
    },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];
```

**Analysis:**
- ✅ `connect-src` termasuk `accounts.google.com` dan `oauth2.googleapis.com`
- ✅ `script-src` termasuk `accounts.google.com`
- ⚠️ `form-action 'self'` — bisa memblokir OAuth form POST (perlu verifikasi)
- ✅ Tidak ada `navigate-to` directive yang memblokir redirect
- ✅ Google domains sudah termasuk di CSP

### [`login/page.tsx`](apps/web/app/(auth)/login/page.tsx:370) — Login Page

```typescript
// Google button
{providers.google && (
    <button onClick={() => signIn('google', { callbackUrl: safeCallbackUrl })}>
        Login Google
    </button>
)}
```

**Analysis:**
- ✅ Google button hanya muncul jika `providers.google === true`
- ✅ `signIn('google')` dari `next-auth/react` — standard pattern
- ✅ `callbackUrl` di-sanitize (prevent redirect loop)
- ✅ Error handling ada di `useEffect` (line 151-171)

---

## 🐛 Debug Logging Gap Analysis

### Yang SUDAH di-log:
1. ✅ `signIn` callback: user.email, user.name, provider
2. ✅ Existing user found: userId, tenantId, role
3. ✅ Error in signIn callback: error.message, stack, email, nextauthUrl

### Yang TIDAK di-log (Critical Gap):
1. ❌ OAuth flow initiation (sebelum redirect ke Google)
2. ❌ `getAuthorizationUrl()` error detail
3. ❌ Provider registration status (apakah Google provider registered?)
4. ❌ `isGoogleOAuthConfigured()` return value
5. ❌ Host header value saat OAuth flow
6. ❌ CSRF token generation/verification
7. ❌ NextAuth internal error (hanya visible dengan `debug: true`)

---

## ✅ Checklist Verifikasi (Updated dari v1)

### A. Immediate Actions (Before Next Deploy)

- [ ] **1.** Tambahkan `trustHost: true` ke auth options di [`auth.ts`](apps/web/lib/auth.ts:57)
- [ ] **2.** Tambahkan `debug: true` sementara di production untuk diagnostic logging
- [ ] **3.** Tambahkan explicit `authorization.url` ke GoogleProvider config
- [ ] **4.** Tambahkan logging di `isGoogleOAuthConfigured()` untuk log return value
- [ ] **5.** Tambahkan logging di OAuth flow initiation

### B. VPS Verification

- [ ] **6.** Login ke VPS, cek file `.env` aktual (bukan template)
- [ ] **7.** Verifikasi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` ada di `.env` VPS
- [ ] **8.** Check VPS server logs untuk NextAuth error detail
- [ ] **9.** Test connectivity: `curl -sSf https://accounts.google.com/.well-known/openid-configuration`
- [ ] **10.** Test connectivity: `curl -sS -o /dev/null -w "%{http_code}" https://oauth2.googleapis.com/token`

### C. Google Cloud Console (Re-verify)

- [ ] **11.** Authorized redirect URI: `https://qalcuity.com/api/auth/callback/google` (exact match)
- [ ] **12.** Authorized JavaScript origins: `https://qalcuity.com`
- [ ] **13.** OAuth consent screen: Published (bukan Testing mode)
- [ ] **14.** Google Identity API: Enabled di GCP Console
- [ ] **15.** Client Secret: Masih valid (bukan expired/revoked)

### D. Post-Fix Verification

- [ ] **16.** Test Google login di production
- [ ] **17.** Check browser Network tab untuk redirect flow
- [ ] **18.** Check server logs untuk errors
- [ ] **19.** Matikan `debug: true` setelah fix verified
- [ ] **20.** Test credentials login masih berfungsi (regression)

---

## 🔧 Recommended Fix (Code Changes)

### Fix 1: Tambahkan `trustHost: true` di auth options

**File:** [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts:57)

```typescript
export const authOptions: NextAuthOptions = {
    // ... existing config
    trustHost: true,  // ← TAMBAH: Required for reverse proxy (aaPanel/Nginx)
    debug: process.env.NODE_ENV === "development",  // ← Ubah ke true sementara
    // ...
};
```

**Mengapa:** VPS menggunakan aaPanel Nginx reverse proxy. `trustHost: true` memastikan NextAuth mempercayai `Host` header dari proxy.

### Fix 2: Tambahkan explicit `authorization.url` ke GoogleProvider

**File:** [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts:65)

```typescript
GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    authorization: {
        url: "https://accounts.google.com/o/oauth2/v2/auth",  // ← TAMBAH: Explicit URL
        params: {
            prompt: "consent",
            access_type: "offline",
            response_type: "code",
        },
    },
}),
```

**Mengapa:** Meskipun NextAuth v4 GoogleProvider sudah punya hardcoded URL, explicitly setting URL menghilangkan ambiguity dan defense-in-depth.

### Fix 3: Temporary debug logging

**File:** [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts:27)

```typescript
function isGoogleOAuthConfigured(): boolean {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    // TAMBAH: Debug logging
    logger.info('[Auth] isGoogleOAuthConfigured check', {
        hasClientId: !!clientId,
        clientIdLength: clientId?.length,
        hasClientSecret: !!clientSecret,
        clientSecretLength: clientSecret?.length,
    });

    if (!clientId || !clientSecret) {
        logger.warn('[Auth] Google OAuth: missing env vars');
        return false;
    }
    // ... rest of function
}
```

### Fix 4: Tambahkan error logging di OAuth flow initiation

**File:** [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts:57)

Di `callbacks.signIn`:
```typescript
async signIn({ user, account }) {
    // TAMBAH: Log semua signIn attempts
    logger.info("[Auth] signIn callback triggered", {
        provider: account?.provider,
        hasUser: !!user,
        email: user?.email,
        hasAccount: !!account,
    });

    if (account?.provider !== "google") {
        return true;
    }
    // ... rest of function
}
```

### Fix 5: Tambahkan `checks: "state"` ke GoogleProvider

**File:** [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts:65)

```typescript
GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    checks: ["state"],  // ← TAMBAH: Explicit state check
    authorization: {
        url: "https://accounts.google.com/o/oauth2/v2/auth",
        params: {
            prompt: "consent",
            access_type: "offline",
            response_type: "code",
        },
    },
}),
```

**Mengapa:** Explicit state check memastikan CSRF protection bekerja dengan benar. Tanpa ini, NextAuth mungkin menggunakan PKCE yang memerlukan crypto support.

---

## 📊 Summary

| Aspect | Status | Detail |
|--------|--------|--------|
| **`isGoogleOAuthConfigured()`** | ✅ OK | Env vars present dengan format valid |
| **Google Provider Registration** | ✅ OK | Provider registered (conditional on env vars) |
| **Auth.ts Config** | ⚠️ ISSUE | Missing `trustHost: true`, debug OFF |
| **Middleware** | ✅ OK | `/api/auth` skip auth + rate limit |
| **CSP Headers** | ⚠️ ISSUE | `form-action 'self'` perlu verifikasi |
| **Env Vars (Local)** | ✅ OK | Semua required vars present |
| **Env Vars (VPS)** | ❓ UNKNOWN | Perlu verify di VPS |
| **Login Page** | ✅ OK | signIn('google') called correctly |
| **Debug Logging** | ❌ MISSING | Critical gap — error silent di production |
| **Google Cloud Console** | ✅ CONFIRMED | User verified redirect URI benar |
| **VPS Connectivity** | ⚠️ SUSPECT | `GOOGLE_OAUTH_SKIP_HEALTH_CHECK="true"` |

### Kesimpulan

**Root cause paling mungkin adalah kombinasi dari:**
1. **Missing `trustHost: true`** — NextAuth v4 gagal validasi host saat OAuth flow di behind reverse proxy
2. **Silent error** — Tanpa `debug: true`, error detail tidak ter-log, membuat debugging sangat sulit

**Langkah selanjutnya (dalam urutan prioritas):**
1. Tambahkan `trustHost: true` ke auth options
2. Tambahkan explicit `authorization.url` ke GoogleProvider
3. Enable `debug: true` sementara untuk diagnostic
4. Tambahkan verbose logging ke OAuth flow
5. Deploy ke VPS dan test
6. Check server logs untuk error detail
7. Matikan `debug: true` setelah fix verified

---

**Last Updated:** 2026-09-17
**Analysis Depth:** Deep (all 9 files analyzed, 7 root causes evaluated)
**Confidence Level:** 70% — perlu server-side logs untuk confirm
