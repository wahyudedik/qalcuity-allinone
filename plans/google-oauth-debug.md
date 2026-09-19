# 🔍 Google OAuth Debug Report — `OAuthSignin` Error

> **Date:** 2026-09-17
> **Error:** `{error: 'OAuthSignin', description: null}`
> **URL:** `https://qalcuity.com/login?callbackUrl=...&error=OAuthSignin`
> **Status:** Diagnosis — Belum di-fix

---

## 📋 Ringkasan Error

User mengklik tombol "Login Google" di `https://qalcuity.com/login` → NextAuth gagal memulai redirect ke Google → User dikembalikan ke `/login?error=OAuthSignin`.

Error `OAuthSignin` terjadi **sebelum redirect ke Google** — artinya masalahnya di sisi server saat NextAuth mencoba membangun authorization URL atau saat VPS mencoba menghubungi Google OAuth endpoints.

---

## 🔬 Analisis Code

### 1. Google OAuth Provider Config ([`apps/web/lib/auth.ts`](apps/web/lib/auth.ts:57))

```typescript
// Line 63-80: GoogleProvider hanya didaftarkan jika env vars valid
...(isGoogleOAuthConfigured()
    ? [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                },
            },
        }),
    ]
    : []),
```

**Observasi:**
- ✅ Tidak ada explicit `redirectUri` → NextAuth otomatis derive dari `NEXTAUTH_URL`
- ✅ Expected callback URL: `https://qalcuity.com/api/auth/callback/google`
- ⚠️ `response_type: "code"` + `access_type: "offline"` — ini standard, tapi perlu OAuth consent screen support

### 2. Environment Variables ([`apps/web/.env.production`](apps/web/.env.production:101))

```
NEXTAUTH_URL="https://qalcuity.com"
GOOGLE_CLIENT_ID="1095304311939-n3de5uh10pvt3sn1jpffs72ngdb0sd18.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"
GOOGLE_OAUTH_SKIP_HEALTH_CHECK="true"  ← ⚠️ BUKTI connectivity issue sudah diketahui
```

**Observasi:**
- ✅ `NEXTAUTH_URL` = `https://qalcuity.com` (format benar, tanpa trailing slash)
- ✅ Client ID format valid (pattern `*.apps.googleusercontent.com`)
- ✅ Client Secret format valid (pattern `GOCSPX-*`)
- ⚠️ `GOOGLE_OAUTH_SKIP_HEALTH_CHECK="true"` — flag ini menunjukkan developer sudah tahu ada masalah connectivity dari VPS ke Google
- ❌ Flag ini **tidak digunakan** di code `auth.ts` — kemungkinan belum terimplementasi

### 3. Login Page ([`apps/web/app/(auth)/login/page.tsx`](apps/web/app/(auth)/login/page.tsx:370))

```typescript
// Line 374: signIn dipanggil dengan next-auth/react
signIn('google', { callbackUrl: safeCallbackUrl })
```

**Observasi:**
- ✅ Menggunakan `signIn('google')` dari `next-auth/react` — standard NextAuth pattern
- ✅ `callbackUrl` sudah di-sanitize (prevent redirect loop ke `/login`)
- ✅ Google button hanya muncul jika `providers.google === true` (dynamic check via `/api/auth/providers`)
- ❌ Tidak ada error handling khusus untuk Google signIn — error dari NextAuth redirect langsung ditangkap di `useEffect` (line 151-171)

---

## 🎯 Root Cause Analysis

### Kemungkinan Sumber Masalah (5-7 kemungkinan):

| # | Kemungkinan | Probability | Evidence |
|---|-----------|-------------|----------|
| 1 | **Redirect URI mismatch** di Google Cloud Console | 🔴 HIGH | #1 penyebab OAuthSignin di NextAuth |
| 2 | **VPS tidak bisa connect ke Google OAuth endpoints** | 🔴 HIGH | `GOOGLE_OAUTH_SKIP_HEALTH_CHECK="true"` menunjukkan masalah connectivity sudah diketahui |
| 3 | **Client Secret expired/revoked** | 🟠 MEDIUM | Google bisa rotate secret secara otomatis |
| 4 | **OAuth consent screen belum dipublish** | 🟠 MEDIUM | Consent screen dalam mode "Testing" hanya allow test users |
| 5 | **Google Identity API belum di-enable** | 🟡 LOW | Perlu enable di GCP Console |
| 6 | **GCP project billing/quota issue** | 🟡 LOW | Free tier seharusnya cukup untuk OAuth |
| 7 | **Client ID restrictions** (domain/user restrictions) | 🟡 LOW | Jika app di-restrict ke domain tertentu |

### 🎯 Top 1-2 Root Cause (Most Likely):

#### Root Cause #1: Redirect URI Mismatch di Google Cloud Console

**Mengapa ini paling mungkin:**
- `OAuthSignin` error di NextAuth terjadi saat authorization URL gagal dibangun atau saat Google menolak redirect
- NextAuth derive callback URL dari `NEXTAUTH_URL`: `https://qalcuity.com/api/auth/callback/google`
- Jika Google Cloud Console punya URI berbedu (trailing slash, wrong path), Google langsung return error
- Ini adalah **penyebab #1** dari `OAuthSignin` error di NextAuth (berdasarkan dokumentasi dan issue tracker)

**Yang perlu dicek di Google Cloud Console:**
1. Buka https://console.cloud.google.com/apis/credentials
2. Cari OAuth 2.0 Client ID dengan Client ID: `1095304311939-n3de5uh10pvt3sn1jpffs72ngdb0sd18`
3. Cek bagian **"Authorized redirect URIs"**
4. **HARUS** ada tepat: `https://qalcuity.com/api/auth/callback/google`
5. **TIDAK BOLEH** ada trailing slash (`/` di akhir)
6. **TIDAK BOLEH** ada `http://` (harus `https://`)

#### Root Cause #2: VPS Tidak Bisa Connect ke Google OAuth Endpoints

**Mengapa ini juga mungkin:**
- Flag `GOOGLE_OAUTH_SKIP_HEALTH_CHECK="true"` di `.env.production` adalah **bukti kuat** bahwa developer sudah tahu VPS punya masalah connectivity ke Google
- VPS mungkin punya firewall rules yang block outbound ke `accounts.google.com` atau `oauth2.googleapis.com`
- DNS resolution mungkin gagal dari VPS ke Google domains
- Flag ini **tidak di-implement** di code `auth.ts` — jadi health check skip tidak berpengaruh

**Yang perlu dicek di VPS:**
```bash
# Test DNS resolution
nslookup accounts.google.com
nslookup oauth2.googleapis.com

# Test connectivity
curl -v https://accounts.google.com/.well-known/openid-configuration
curl -v https://oauth2.googleapis.com/token

# Test port connectivity
telnet accounts.google.com 443
```

---

## ✅ Checklist Verifikasi untuk User

### A. Google Cloud Console (https://console.cloud.google.com/apis/credentials)

- [ ] **1.** Buka OAuth 2.0 Client ID: `1095304311939-n3de5uh10pvt3sn1jpffs72ngdb0sd18`
- [ ] **2.** Cek **"Authorized redirect URIs"** harus ada: `https://qalcuity.com/api/auth/callback/google`
- [ ] **3.** Tidak ada trailing slash di redirect URI
- [ ] **4.** Menggunakan `https://` (bukan `http://`)
- [ ] **5.** Cek **"Authorized JavaScript origins"** harus ada: `https://qalcuity.com`
- [ ] **6.** Client Secret masih valid (bukan expired/revoked) — jika ragu, buat baru
- [ ] **7.** OAuth consent screen sudah dipublish (bukan mode "Testing" yang restrict ke test users saja)
- [ ] **8.** **Google Identity API** atau **People API** sudah di-enable di bagian "APIs & Services" > "Enabled APIs"

### B. VPS Connectivity

- [ ] **9.** Login ke VPS dan jalankan test connectivity (lihat commands di bawah)
- [ ] **10.** Pastikan DNS resolution berhasil untuk `accounts.google.com` dan `oauth2.googleapis.com`
- [ ] **11.** Pastikan port 443 (HTTPS) bisa diakses ke Google domains
- [ ] **12.** Cek firewall rules (ufw/iptables/aaPanel firewall) tidak block outbound ke Google

### C. Environment Variables

- [ ] **13.** Pastikan `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` di `.env` VPS cocok dengan Google Cloud Console
- [ ] **14.** Jika rotate Client Secret di Google Cloud Console, **WAJIB update** `.env` di VPS
- [ ] **15.** Jalankan `bash update.sh` setelah update `.env` untuk restart app

---

## 🔧 Commands untuk Test Connectivity dari VPS

```bash
# SSH ke VPS
ssh root@<VPS_IP>

# === Test 1: DNS Resolution ===
nslookup accounts.google.com
nslookup oauth2.googleapis.com

# === Test 2: HTTPS Connectivity ===
curl -sSf https://accounts.google.com/.well-known/openid-configuration | head -20

# === Test 3: OAuth Token Endpoint ===
curl -sS -o /dev/null -w "%{http_code}" https://oauth2.googleapis.com/token

# === Test 4: Full Authorization URL Test ===
# Ganti CLIENT_ID dan REDIRECT_URI sesuai config
CLIENT_ID="1095304311939-n3de5uh10pvt3sn1jpffs72ngdb0sd18.apps.googleusercontent.com"
REDIRECT_URI="https://qalcuity.com/api/auth/callback/google"
echo "Authorization URL test:"
echo "https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=email+profile&prompt=consent"
# Buka URL ini di browser — jika Google return error page, berarti ada masalah config

# === Test 5: Check OpenID Discovery ===
curl -sS https://accounts.google.com/.well-known/openid-configuration | python3 -m json.tool

# === Test 6: Check VPS Firewall ===
ufw status
iptables -L -n | grep -i drop
```

---

## 🐛 Debug Logging (Sementara)

Jika perlu debug lebih lanjut, tambahkan logging di [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts:57) untuk menangkap detail error:

```typescript
// Tambahkan di dalam GoogleProvider config:
GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    authorization: {
        params: {
            prompt: "consent",
            access_type: "offline",
            response_type: "code",
        },
    },
    // Tambahkan debug logging:
    checks: "state",  // Ensure state parameter is used
}),
```

Dan tambahkan di `callbacks.signIn` error handler (line 242):
```typescript
// Tambahkan diagnostic info
logger.error("[Auth] Google OAuth signIn callback — DIAGNOSTIC", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    email: user.email,
    name: user.name,
    nextauthUrl: process.env.NEXTAUTH_URL,
    googleClientId: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + "...",
    // Tambahan diagnostic:
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    // Cek apakah VPS bisa reach Google:
    canReachGoogle: await fetch('https://accounts.google.com/.well-known/openid-configuration')
        .then(r => r.ok)
        .catch(() => false),
});
```

---

## 📊 Summary

| Aspect | Status | Detail |
|--------|--------|--------|
| **Auth Code** | ✅ OK | Google OAuth provider correctly configured in auth.ts |
| **Env Vars** | ✅ OK | GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET are set with valid format |
| **Login Page** | ✅ OK | signIn('google') called correctly with safe callbackUrl |
| **Google Cloud Console** | ❓ UNKNOWN | Perlu verifikasi redirect URI & API enablement |
| **VPS Connectivity** | ❌ SUSPECT | `GOOGLE_OAUTH_SKIP_HEALTH_CHECK="true"` menunjukkan known issue |
| **Client Secret** | ❓ UNKNOWN | Perlu verify belum expired/revoked |

### Kesimpulan

Code Qalcuity untuk Google OAuth **sudah benar**. Tidak ada bug di code. Masalah kemungkinan besar berada di **konfigurasi Google Cloud Console** atau **connectivity VPS ke Google**.

**Langkah selanjutnya:**
1. User verifikasi redirect URI di Google Cloud Console (lihat checklist di atas)
2. User test connectivity dari VPS ke Google (lihat commands di atas)
3. Jika connectivity bermasalah, pertimbangkan gunakan proxy/relay untuk OAuth flow
