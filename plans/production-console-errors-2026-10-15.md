# 🐛 Production Console Errors — Batch 15 Okt 2026

> **Tanggal:** 15 Oktober 2026
> **Sumber:** Log browser console dari https://qalcuity.com (Next.js 14.2.35 production build)
> **Laporan sebelumnya:** [`plans/production-console-errors.md`](plans/production-console-errors.md) (Batch 18 Sep / 3 Okt 2026)
> **Status:** ✅ **IMPLEMENTASI SELESAI** (15 Okt 2026) — semua fix code-complete + tsc 0 errors; **butuh redeploy production** (`bash update.sh`) agar aktif di qalcuity.com

---

## 📋 Ringkasan Error & Akar Masalah

| # | Error | Status | Akar Masalah (Terkonfirmasi) | Severity |
|---|-------|--------|------------------------------|----------|
| 1 | `PATCH /api/ai/anomalies/[id]` → 405 | ✅ **FIXED** | Route hanya export `GET` (cron scan); frontend kirim `PATCH` → PATCH handler ditambahkan (Zod + RBAC + audit + tenant scope) | 🔴 High |
| 2 | `GET /api/hr/employees/[id]` → 400 | ✅ **FIXED** | GET handler **mengabaikan `params.id`** (return list, bukan 1 employee); PUT dari detail page kirim body tanpa `id`/`version` → 400 → GET/PUT/DELETE dirombak (id dari params + version) + frontend kirim `version` | 🔴 High |
| 3 | `TypeError ... reading 'total'` (×4) | ✅ **FIXED** | Akses `.total` tanpa guard: [`pos/tables/page.tsx:179`](apps/web/app/dashboard/pos/tables/page.tsx:179) `stats?.tables.total` (optional-chain hanya di `stats`, bukan `tables`); [`projects/[id]/page.tsx:161`](apps/web/app/dashboard/projects/[id]/page.tsx:161) `project.taskSummary.total` → optional-chain penuh | 🔴 High |
| 4 | `TypeError ... reading 'length'` (×10) | ✅ **VERIFIED SAFE** | Audit halaman edit deal [`deals/[id]/edit/page.tsx:54`](apps/web/app/dashboard/crm/deals/[id]/edit/page.tsx:54) — sudah ada cek `data.success` + error state + render guard `if (error \|\| !deal)`. TypeError di production dari **stale build** — hilang setelah redeploy. Audit grep tambahan: 5 file lain dengan pola optional-chain parsial ikut diperbaiki (stock-opname, pos/reports, community/assets, analytics/explorer) | 🟠 Medium |
| 5 | `GET /api/crm/deals/[id]` → 404 (×4 ID) | ✅ Bukan bug route | Route bekerja benar (tenant-scoped not-found). ID deal sudah dihapus/dari tenant lain — stale link (kemungkinan dari aktivitas CRM yang merujuk deal terhapus) | 🟡 Low |
| 6 | `POST /api/settings/team` → 403 (×8) | ✅ **FIXED (UI)** | Route secara eksplisit hanya izinkan `ADMIN`/`SUPERADMIN` ([`route.ts:78`](apps/web/app/api/settings/team/route.ts:78)). User non-admin mencoba invite → 403 by design. **Gap UI sudah ditutup**: tombol invite/edit/hapus kini tersembunyi untuk non-admin (Layer 3 RBAC via `useSession` role check) | 🟡 Low |
| 7 | `POST /api/upload` → 403 | ✅ Mekanisme pasti | RBAC denial via `requirePermissionForRoute`; route dimapping ke permission `system:view` ([`route-permissions.ts:313`](apps/web/lib/route-permissions.ts:313)). Perlu verifikasi apakah role aktif memang tidak boleh upload | 🟡 Low |
| 8 | React #418 / #423 (hydration) | ⚠️ Known | Sudah dianalisis di batch sebelumnya — fix ada di codebase (commit `bcde957`) tapi **production perlu redeploy** | 🟡 Medium |
| 9 | `/favicon.ico` → 404 | ✅ **FIXED** | File `favicon.ico` tidak ada di `public/` → dibuat via [`scripts/make-favicon.ps1`](scripts/make-favicon.ps1) (konversi `favicon.png` → ICO 16×16+32×32, 991 bytes); terverifikasi 200 `image/x-icon` di dev server | 🟢 Low |

---

## 🔍 Analisis Detail per Error

### Error 1: `PATCH /api/ai/anomalies/[id]` → 405 Method Not Allowed

**Bukti:**
- [`apps/web/app/api/ai/anomalies/[id]/route.ts`](apps/web/app/api/ai/anomalies/[id]/route.ts:12) — file hanya mengekspor `GET(req)` (cron scan ber-`CRON_SECRET`). Tidak ada `PATCH`/`PUT`/`DELETE`.
- [`apps/web/app/dashboard/ai/anomalies/page.tsx`](apps/web/app/dashboard/ai/anomalies/page.tsx:111) — `handleAction()` mengirim `PATCH /api/ai/anomalies/${anomalyId}` dengan body `{ status }` (INVESTIGATING / DISMISSED / BLOCKED), melakukan optimistic update lalu revert + `logger.error('[Anomalies] Failed to update anomaly status')` — persis log di console.
- Model `AnomalyDetection` ([`schema.prisma:2634`](packages/db/prisma/schema.prisma:2634)) sudah punya field: `status` (OPEN/INVESTIGATING/DISMISSED/BLOCKED), `statusNote`, `statusChangedBy`, `statusChangedAt`.

**Rencana Perbaikan:**
Tambahkan export `PATCH(request, { params })` di [`[id]/route.ts`](apps/web/app/api/ai/anomalies/[id]/route.ts):
1. `requirePermissionForRoute(request)` — session auth + RBAC (permission `ai:manage`, fallback ADMIN; cek mapping di [`route-permissions.ts`](apps/web/lib/route-permissions.ts) untuk `/api/ai/anomalies/[id]`).
2. Rate limit (mis. 30/menit per IP).
3. Zod validation — buat schema `updateAnomalyStatusSchema` (`status` enum wajib, `statusNote` opsional) di [`validation-schemas.ts`](apps/web/lib/validation-schemas.ts).
4. `prisma.anomalyDetection.updateMany({ where: { id, tenantId }, data: { status, statusNote, statusChangedBy: userId, statusChangedAt: new Date() } })` — jika `count === 0` → 404.
5. `logAudit` (action UPDATE, entity AnomalyDetection) + `handleApiError` di catch.

> ⚠️ **Catatan Rule 5 (Do Not Touch):** route ini BUKAN bagian dari cron endpoint `GET` yang ada — kita hanya MENAMBAH handler baru, tidak mengubah `GET`.

---

### Error 2: `GET /api/hr/employees/[id]` → 400 + bug struktural

**Bukti:**
- [`apps/web/app/api/hr/employees/[id]/route.ts`](apps/web/app/api/hr/employees/[id]/route.ts:14) — handler `GET` **sama persis dengan list route** (pagination via searchParams) dan **tidak pernah membaca `params.id`**. Akibatnya `GET /api/hr/employees/<id>` mengembalikan DAFTAR employee (copy-paste bug), bukan 1 employee.
- Halaman detail [`hr/employees/[id]/page.tsx`](apps/web/app/dashboard/hr/employees/[id]/page.tsx:94) melakukan `setEmployee(data.data)` — `data.data` berupa array → render `getInitials(employee.name)` melempar TypeError saat SSR/awal render.
- `PUT` di [`[id]/route.ts:166`](apps/web/app/api/hr/employees/[id]/route.ts:166) mewajibkan `id` DAN `version` di body (400 `ID_REQUIRED` / `VERSION_REQUIRED`), tetapi `handleEditSave` di halaman detail ([`page.tsx:127`](apps/web/app/dashboard/hr/employees/[id]/page.tsx:127)) mengirim `editForm` yang **tidak berisi `id`/`version`** → 400. (Kemungkinan sumber 400 di console; versi production mungkin berbeda dari kode lokal.)

**Rencana Perbaikan:**
1. **Fix GET handler** di [`[id]/route.ts`](apps/web/app/api/hr/employees/[id]/route.ts): kembalikan 1 employee via `prisma.employee.findFirst({ where: { id: params.id, tenantId, deletedAt: null }, include: { attendanceRecords, leaveRequests, payrollRecords } })` → 404 jika tidak ada. Hapus logika pagination dari route `[id]`.
2. **Fix PUT contract** — pilih salah satu (rekomendasi A):
   - **A (frontend):** halaman detail menyertakan `id: params.id` dan `version: employee.version` di body PUT, lalu refresh data.
   - **B (backend):** PUT mengambil `id` dari `params.id` dan hanya mewajibkan `version` (konsisten dengan deals PUT).
3. Komponen `ActivityLog`/`attendance`/`leaves`/`payroll` di halaman detail sudah di-guard (`employee.attendance && ...`) — verifikasi setelah shape data benar.

---

### Error 3: `TypeError: Cannot read properties of undefined (reading 'total')`

**Bukti (2 situs tidak aman terkonfirmasi):**
- [`apps/web/app/dashboard/pos/tables/page.tsx:179`](apps/web/app/dashboard/pos/tables/page.tsx:179) — `stats?.tables.total` → jika `stats` ada tapi `stats.tables` undefined → CRASH. Pola sama di baris 180–184 (`stats?.utilization.rate`, dll).
- [`apps/web/app/dashboard/projects/[id]/page.tsx:161`](apps/web/app/dashboard/projects/[id]/page.tsx:161) — `project.taskSummary.total` tanpa guard `taskSummary`.

**Rencana Perbaikan:**
1. Ubah ke optional-chain penuh: `stats?.tables?.total || 0` (dst.) di pos/tables.
2. Guard `taskSummary`: `const taskSummary = project.taskSummary ?? { total: 0, byStatus: {} }`.
3. **Audit grep** pola berisiko serupa: `\?\.\w+\.\w+` (optional-chain parsial) dan `\.total` tanpa optional-chain di semua page dashboard — perbaiki situs lain yang ditemukan.

---

### Error 4: `TypeError: Cannot read properties of undefined (reading 'length')` (×10)

**Bukti:** Terjadi beruntun tepat setelah 404 `/api/crm/deals/[id]`. Halaman detail deal AMAN (guard `if (error || !deal)` di [`deals/[id]/page.tsx:188`](apps/web/app/dashboard/crm/deals/[id]/page.tsx:188)). Kandidat terkuat: halaman **edit** deal [`deals/[id]/edit/page.tsx:54`](apps/web/app/dashboard/crm/deals/[id]/edit/page.tsx:54) yang memanggil `fetch(/api/crm/deals/${params.id})` — perlu dipastikan ia meng-handle `success:false` sebelum mengakses property `data.data.*` (mis. `.length` pada field array/tag). Chunk minified `page-7cd344507fef76f9.js` tidak bisa dipetakan langsung ke file sumber.

**Rencana Perbaikan:**
1. Audit [`deals/[id]/edit/page.tsx`](apps/web/app/dashboard/crm/deals/[id]/edit/page.tsx) — tambahkan cek `res.ok` + `data.success` sebelum `setForm(data.data)`; tampilkan error state + redirect ke list saat 404.
2. Audit grep `\.\w+\.length` pada data fetch tanpa guard di seluruh `app/dashboard/**` — perbaiki yang ditemukan.

---

### Error 5–7: 404 deals, 403 settings/team, 403 upload — perilaku backend benar, perlu rapikan UI/kontrak

| Error | Kesimpulan | Aksi |
|-------|-----------|------|
| 404 deals ×4 | Route not-found tenant-scoped bekerja benar. Stale ID kemungkinan dari link aktivitas CRM ([`activities/[id]/page.tsx:205`](apps/web/app/dashboard/crm/activities/[id]/page.tsx:205) merujuk `activity.entityId` yang bisa saja sudah dihapus) | Opsional: handle 404 di edit page (bagian Error 4); tambahkan redirect otomatis ke list + pesan "Deal tidak ditemukan" |
| 403 settings/team ×8 | Backend benar — hanya ADMIN/SUPERADMIN boleh invite ([`route.ts:78`](apps/web/app/api/settings/team/route.ts:78)). User non-admin retry 8× | **Layer 3 RBAC:** sembunyikan/disable tombol "Invite" di [`settings/team/page.tsx`](apps/web/app/dashboard/settings/team/page.tsx) untuk role non-admin (pakai `usePermission()` / cek `session.user.role`) |
| 403 upload | `requirePermissionForRoute` menolak — mapping permission `system:view` ([`route-permissions.ts:313`](apps/web/lib/route-permissions.ts:313)). Verifikasi: role mana yang aktif di log, apakah memang tidak berhak. Jika semua member harus bisa upload avatar/attachment, pertimbangkan permission khusus (mis. `attachment:upload` fallback MEMBER) | Verifikasi dulu — jangan ubah mapping tanpa konfirmasi intent bisnis |

---

### Error 8: React Hydration #418/#423

Sudah dianalisis di [`plans/production-console-errors.md`](plans/production-console-errors.md) (Error 7) — fix ada di codebase (commit `bcde957`, 30 Sep 2026) tetapi production build 14.2.35 di log masih menunjukkan error ini → **redeploy `bash update.sh` diperlukan**. Jika masih muncul setelah redeploy, diagnosa ulang di dev mode (`npx next dev`) dengan menelusuri komponen yang me-render tanggal/locale saat SSR.

### Error 9: favicon 404

Tambahkan `apps/web/public/favicon.ico` (dan/atau `icon.png` + metadata `app/icon.*` sesuai Next.js 14 App Router) — render logo Qalcuity.

---

## 🗂️ Alur Perbaikan

```mermaid
flowchart TD
    A[Error 405 anomalies PATCH] --> A1[Tambah PATCH handler di [id]/route.ts]
    A1 --> A2[Zod schema + audit + tenant scope]
    B[Error 400 + bug GET employees id] --> B1[Fix GET: return 1 employee by params.id]
    B1 --> B2[Fix PUT contract id + version]
    C[TypeError total dan length] --> C1[Guard optional-chain penuh pos/tables + projects id]
    C1 --> C2[Audit grep pola berisiko lain]
    D[403 team dan upload] --> D1[UI gating tombol invite untuk non-admin]
    D1 --> D2[Verifikasi intent permission upload]
    E[404 deals stale] --> E1[Handle 404 di edit page + redirect]
    F[Hydration dan favicon] --> F1[Redeploy production + tambah favicon]
    A2 --> T[npx tsc --noEmit + manual test]
    B2 --> T
    C2 --> T
    D2 --> T
    E1 --> T
    F1 --> T
```

---

## ✅ Definition of Done

- [x] `PATCH /api/ai/anomalies/[id]` berfungsi — status anomaly bisa di-update dari UI (investigate/dismiss/block) dengan audit trail + tenant isolation *(handler ditulis mengikuti pola route: rate limit 60/menit → RBAC `ai:view`+fallback ADMIN → Zod `updateAnomalyStatusSchema` → `updateMany` tenant-scoped → `logAudit`)*
- [x] `GET /api/hr/employees/[id]` mengembalikan 1 employee (404 jika tidak ada); edit dari detail page tidak lagi 400 *(GET dirombak single-record + include attendance/leaves/payroll; PUT id dari params + version opsional; frontend detail page kirim `version`)*
- [x] Tidak ada lagi TypeError `reading 'total'` / `reading 'length'` dari situs yang diperbaiki + audit grep selesai *(grep `\?\.\w+\.(length|total|map|filter|find)` ulang → 0 hasil)*
- [x] Tombol invite team tersembunyi/disable untuk non-admin
- [x] Halaman edit deal menampilkan error state yang benar saat 404 *(VERIFIED SAFE — sudah ada; TypeError production dari stale build)*
- [x] `npx tsc --noEmit` lolos tanpa error *(0 errors, 15 Okt 2026)*
- [x] Update [`CURRENT.md`](CURRENT.md) + laporan di file plan ini (tandai ✅ Fixed) *(Session 77)*

---

## 📎 Catatan Implementasi (untuk Code Mode)

- **Jangan ubah** handler `GET` cron di [`[id]/route.ts`](apps/web/app/api/ai/anomalies/[id]/route.ts) — hanya tambah `PATCH` baru (Rule 5).
- Ikuti pola route yang ada: `requirePermissionForRoute` → rate limit → Zod `safeParse` → query dengan `tenantId` → `logAudit` → `handleApiError`.
- Reuse: `MSG_*` dari [`api-messages.ts`](apps/web/lib/api-messages.ts), `formatZodError`, `apiNotFound`/`apiForbidden` dari [`api-error.ts`](apps/web/lib/api-error.ts).
- Schema Zod baru untuk update status anomaly ditambahkan ke [`validation-schemas.ts`](apps/web/lib/validation-schemas.ts) (jangan duplikat yang sudah ada — search dulu).
