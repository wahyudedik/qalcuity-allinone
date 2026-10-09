# Error Logging & Tracing — Dokumentasi Lengkap

> **Status:** 🚀 `production_ready` — Session 70o (9 Okt 2026)
> **Scope:** Sistem observabilitas error untuk platform superadmin Qalcuity — capture (server + client), storage JSONL file-based, query API, UI `/platform/errors`, dan retention cleanup cron.

---

## Daftar Isi

1. [Arsitektur](#1-arsitektur)
2. [Capture Points](#2-capture-points)
3. [Storage Layout](#3-storage-layout)
4. [API Reference](#4-api-reference)
5. [UI: /platform/errors](#5-ui-platformerrors)
6. [Retention & Cleanup Cron](#6-retention--cleanup-cron)
7. [Environment Variables](#7-environment-variables)
8. [Testing](#8-testing)
9. [Troubleshooting](#9-troubleshooting)
10. [Limitations](#10-limitations)

---

## 1. Arsitektur

```
┌────────────────────────────────────────────────────────────┐
│                      CAPTURE POINTS                        │
│  logError() manual │ logApiError() catch │ logProcessError │
│  POST /api/client-errors (browser: window.onerror/dsbl)    │
└──────────────────────────┬─────────────────────────────────┘
                           │  (never-throw, sanitize + redact)
┌──────────────────────────▼─────────────────────────────────┐
│               WRITER: lib/error-logger.ts                   │
│  sanitizeWalk (depth/cycle limit) → fingerprint (sha-like)  │
│  → append 1 JSON baris per entry                            │
└──────────────────────────┬─────────────────────────────────┘
                           │
        <ERROR_LOG_DIR | <cwd>/.logs/errors>/
        errors-YYYY-MM-DD.jsonl   (timezone Asia/Jakarta +7)
                           │
┌──────────────────────────▼─────────────────────────────────┐
│               READER: lib/error-log-reader.ts               │
│  readErrorLogs (filter+pagination) │ countErrorLogs         │
│  readErrorStats │ findErrorLogById │ cleanupErrorLogs       │
└──────────────────────────┬─────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────┐
│  API: /api/platform/errors (+ /stats, /[id])                │
│  UI:  /platform/errors (superadmin)                         │
│  Cron: error-log-cleanup (daily 03:00 WIB)                  │
└────────────────────────────────────────────────────────────┘
```

**Prinsip desain:**

- **Never-throw** — error logging tidak boleh memperburuk error yang sudah terjadi. Semua operasi write/read dibungkus try/catch; kegagalan ditelan dan di-mirror ke `console` saja.
- **File-based JSONL** — satu JSON object per baris, satu file per hari. Mudah di-`grep`, di-tail, dan di-export tanpa database dependency.
- **Sanitasi di source** — setiap value masuk melewati `sanitizeWalk()` (max depth, cycle detection via WeakSet, truncation string panjang) + redaction untuk field sensitif (password, token, secret, authorization, cookie, npwp, nik, dll).
- **Fingerprint** — hash stabil dari `source + level + route + message` untuk grouping error serupa (dipakai `topFingerprints` di stats).

---

## 2. Capture Points

Semua capture ada di [`apps/web/lib/error-logger.ts`](../apps/web/lib/error-logger.ts):

| Fungsi | Untuk Kapan | Catatan |
|--------|-------------|---------|
| [`logError()`](../apps/web/lib/error-logger.ts) | Pemanggilan manual dari code manapun | Return `ErrorLogEntry` (termasuk saat file write di-skip) |
| [`logApiError()`](../apps/web/lib/error-logger.ts) | Catch block API routes | Wrap `handleApiError()` context: route, method, status, tenantId, userId |
| [`logProcessError()`](../apps/web/lib/error-logger.ts) | `uncaughtException` / `unhandledRejection` | Source `process`; dipanggil dari process handler |
| `POST /api/client-errors` | Error browser (window.onerror, React boundary, reporting manual) | Public endpoint path-netral; rate-limited per-IP; **tidak** didaftarkan di route-permissions (匿名-injest by design — lihat [Limitations](#10-limitations)) |

**Field entry** (`ErrorLogEntry`): `id`, `timestamp` (ISO), `level` (`error`/`warn`/`fatal`), `source` (`api`/`frontend`/`process`/`manual`), `message`, `stack?`, `route?`, `method?`, `status?`, `tenantId?`, `userId?`, `fingerprint`, `context?` (sudah disanitasi).

---

## 3. Storage Layout

```
<ERROR_LOG_DIR || <cwd>/.logs/errors>/
├── errors-2026-10-07.jsonl      ← file harian
├── errors-2026-10-08.jsonl
└── errors-2026-10-09.jsonl      ← hari ini (Asia/Jakarta)
```

- **Nama file:** `errors-YYYY-MM-DD.jsonl` — tanggal dihitung dengan offset **statis +7 (Asia/Jakarta)** di kedua writer `getJakartaDateString()` dan reader `jakartaDateString()`. Tidak ada DST, deterministik.
- **Satu baris = satu entry** JSON. Baris rusak (partial write, korupsi) di-skip oleh reader tanpa menggagalkan seluruh file.
- **Direktori dibuat otomatis** (`mkdirSync recursive`) saat write pertama.
- **`.logs/` wajib ada di `.gitignore`** (sudah di-commit sebagai bagian dari subtask 1).
- Di vitest: write file otomatis di-skip (`VITEST` env terdeteksi) kecuali test men-set `ERROR_LOG_DIR` eksplisit — tidak pollute direktori log dev.

---

## 4. API Reference

Semua endpoint di-bawah **SUPERADMIN only** ([`route-permissions.ts`](../apps/web/lib/route-permissions.ts): `platform:view` fallbackRole `SUPERADMIN`, RBAC_STRICT aktif).

### 4.1 `GET /api/platform/errors` — List + Filter

File: [`apps/web/app/api/platform/errors/route.ts`](../apps/web/app/api/platform/errors/route.ts)

| Query Param | Type | Default | Deskripsi |
|-------------|------|---------|-----------|
| `days` | int | 7 | Window hari kebelakang (clamp 1–90) |
| `level` | csv | — | `error`, `warn`, `fatal` (multi: `error,fatal`) |
| `source` | csv | — | `api`, `frontend`, `process`, `manual` |
| `route` | string | — | Substring match case-insensitive pada route |
| `search` | string | — | Substring match case-insensitive pada message |
| `fingerprint` | string | — | Exact match (grouping) |
| `tenantId` | string | — | Exact match (trace error per tenant) |
| `limit` | int | 100 | Max 1000 |
| `offset` | int | 0 | Pagination AFTER filtering |

**Response:** `{ success: true, data: ErrorLogEntry[], meta: { total, limit, offset, days } }`

### 4.2 `GET /api/platform/errors/stats` — Statistik

File: [`apps/web/app/api/platform/errors/stats/route.ts`](../apps/web/app/api/platform/errors/stats/route.ts)

| Query Param | Type | Default | Deskripsi |
|-------------|------|---------|-----------|
| `days` | int | 7 | Window statistik (clamp 1–90) |

**Response `data`** (`ErrorLogStats`): `totals` (`last24h`, `last7d`, `all`), `byDay[]` (slot harian asc, hari ini slot terakhir), `bySource`, `topFingerprints[]` (count desc, lastSeen tie-break), `recentFiles[]` (name + sizeBytes).

### 4.3 `GET /api/platform/errors/[id]` — Detail 1 Entry

File: [`apps/web/app/api/platform/errors/[id]/route.ts`](../apps/web/app/api/platform/errors/[id]/route.ts)

Cari by `id` di semua file dalam window 90 hari (`findErrorLogById`). **Response 404** `{ success: false, error }` bila tidak ditemukan.

### 4.4 `POST /api/client-errors` — Ingest dari Browser

File: [`apps/web/app/api/client-errors/route.ts`](../apps/web/app/api/client-errors/route.ts)

- **Public** (tanpa session) — path netral agar bisa dipanggil dari halaman mana pun.
- Rate-limited per-IP ([`rate-limit.ts`](../apps/web/lib/rate-limit.ts)).
- Body: `{ message, stack?, route?, context? }` — di-sanitasi lalu ditulis dengan `source: 'frontend'`.
- Response: `{ success: true, data: { id, fingerprint } }`.

---

## 5. UI: /platform/errors

File: [`apps/web/app/platform/errors/page.tsx`](../apps/web/app/platform/errors/page.tsx) (+ [`loading.tsx`](../apps/web/app/platform/errors/loading.tsx), [`error.tsx`](../apps/web/app/platform/errors/error.tsx))

- **Akses:** sidebar Platform → Errors; menu terlihat hanya untuk SUPERADMIN.
- **Quick stats:** total 24 jam / 7 hari, breakdown per source, file log terbaru + ukuran.
- **Filter:** level, source, days, search message, filter per fingerprint.
- **Daftar:** dual layout (tabel desktop + card mobile), klik baris → **detail modal** (full stack trace, context JSON, tenantId/userId).
- **Polling** configurable auto-refresh (mengikuti pola platform monitoring).

---

## 6. Retention & Cleanup Cron

**Handler:** [`runErrorLogCleanup()`](../apps/web/lib/error-log-cleanup-handler.ts) → [`cleanupErrorLogs()`](../apps/web/lib/error-log-reader.ts)

| Aspek | Detail |
|-------|--------|
| **Task ID** | `error-log-cleanup` |
| **Schedule** | Daily 03:00 WIB (config `{ type: 'daily', hour: 3, minute: 0 }`, local APP_TIMEZONE) |
| **Retention** | `ERROR_LOG_RETENTION_DAYS` (default 30, clamp 1–365) |
| **Cutoff** | File `errors-YYYY-MM-DD.jsonl` dengan tanggal < (hari ini − retention) di-`unlinkSync` |
| **Behavior** | Per-file try/catch — 1 file gagal tidak menghentikan file lain; **never-throw**; logger.info hasil; return `{ deletedFiles[], keptFiles, freedBytes }` |
| **Dispatcher** | Terdaftar di [`/api/cron/run`](../apps/web/app/api/cron/run/route.ts) `getTasks()` |
| **Direct endpoint** | `GET /api/cron/error-log-cleanup` ([route](../apps/web/app/api/cron/error-log-cleanup/route.ts) — hanya export GET; handler di `lib/` mengikuti pola payment-reminder) |
| **RBAC** | `system:admin` fallbackRole `SUPERADMIN` di route-permissions |

Detail lengkap lihat [`docs/CRON-JOBS.md`](CRON-JOBS.md) bagian "6. Error Log Cleanup".

---

## 7. Environment Variables

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `ERROR_LOG_DIR` | `<cwd>/.logs/errors` | Override direktori log (test/opsional) |
| `ERROR_LOG_DISABLED` | — | `'true'` → skip tulis file (entry tetap di-return + mirror console) |
| `ERROR_LOG_RETENTION_DAYS` | `30` | Retention file log; di-clamp 1–365 |
| `CRON_SECRET` | — | Wajib untuk semua endpoint cron termasuk error-log-cleanup |

`.env.example` / `.env.production.example` sudah menyertakan ketiga `ERROR_LOG_*` (subtask 1).

---

## 8. Testing

| Suite | File | Cakupan |
|-------|------|---------|
| Writer unit | [`apps/web/__tests__/unit/lib/error-logger.test.ts`](../apps/web/__tests__/unit/lib/error-logger.test.ts) | logError/logApiError/logProcessError, sanitasi (secret redaction, depth, cycle), fingerprint, skip-file behavior |
| Reader unit | [`apps/web/__tests__/unit/lib/error-log-reader.test.ts`](../apps/web/__tests__/unit/lib/error-log-reader.test.ts) | **43 test** — read/count/stats/find + **8 test cleanup** (delete tua, boundary, env override, fallback 30, clamp 1–365, ignore non-matching, dir tidak ada, never-throw) |

**Run:**
```bash
cd apps/web
npx vitest run __tests__/unit/lib/error-logger.test.ts __tests__/unit/lib/error-log-reader.test.ts
```

**E2E capture flow (manual, dev server :3000):** login SUPERADMIN → `POST /api/client-errors` → `GET /api/platform/errors?search=<message>` menemukan entry `source: 'frontend'` dengan fingerprint konsisten.

---

## 9. Troubleshooting

| Issue | Solusi |
|-------|--------|
| `/platform/errors` 403 untuk user biasa | By design — hanya SUPERADMIN (RBAC_STRICT `permission_check_failed`). Login dengan akun platform. |
| Curl ke cron endpoint → 307 | Middleware butuh **session cookie** (route `/api/*` non-public). Kirim Cookie + Bearer sekaligus (lihat [Limitations](#10-limitations)). |
| Cron endpoint → 401 | `Authorization: Bearer $CRON_SECRET` tidak cocok dengan env di server. |
| Log tidak muncul | Cek `ERROR_LOG_DISABLED` ≠ `'true'`; cek direktori `.logs/errors` writable; cek `VITEST` terdeteksi (test env men-skip write). |
| Tanggal file tidak sesuai | Tanggal file = Asia/Jakarta (+7 statis) — bukan UTC server. `errors-2026-10-09.jsonl` = hari WIB. |
| Disk usage naik | Pastikan cron `error-log-cleanup` jalan (aaPanel `*/5` → `/api/cron/run`); cek `GET /api/cron/run?status`. |
| Dispatcher skip task di siang hari | Daily task sudah jalan pagi ini (dedup `shouldRun`) — **by design**. Untuk rerun manual pakai direct endpoint `/api/cron/error-log-cleanup`. |

---

## 10. Limitations

Sistem ini **file-based, single-instance, near-realtime** — bukan observability platform penuh:

1. **Single-instance** — JSONL lokal ke disk pod/server. Di multi-instance/deploy horizontal, log terpecah per instance (tidak ter-agregasi). Saat ini Qalcuity berjalan 1 instance di VPS → tidak ada masalah.
2. **Bukan real-time** — UI membaca file on-demand; tidak ada push/WebSocket. Auto-refresh polling config.
3. **Cron double-auth (pre-existing middleware design)** — semua endpoint `/api/*` non-public di-protect `withAuth` (307 tanpa session) **dan** `verifyCronAuth` (401 tanpa Bearer CRON_SECRET). Caller cron (aaPanel) harus mengirim **Cookie session + Bearer** sekaligus, atau endpoint ditambahkan ke `PUBLIC_API_PATHS` middleware (Do-Not-Touch — butuh approval terpisah). Ini berlaku untuk **semua** cron endpoint, bukan khusus error-log-cleanup.
4. **Ingest client-errors publik** — `POST /api/client-errors` sengaja path-netral tanpa session (browser error bisa terjadi sebelum login/session expired). Dilindungi rate-limit per-IP + sanitasi agresif, tapi tetap attack surface untuk spam file log — monitor ukuran `.logs/errors/` di server.
5. **Tidak ada retention di database** — cleanup hanya menghapus file lama; tidak ada soft-delete/arsip per entry.
6. **Fingerprint grouping sederhana** — hash dari source+level+route+message; perubahan pesan error membentuk grup baru (bukan stack-trace clustering).
7. **Prisma/migrasi tidak terlibat** — sengaja 100% file-based agar zero-migration; konsekuensinya tidak bisa di-query via SQL/join dengan data bisnis (cross-reference manual via `tenantId`/`userId` field).

---

**Last Updated:** 9 Oktober 2026 (Session 70o)
**Maintainer:** Qalcuity AI Team
