# Qalcuity — Cron Jobs Documentation

> Dokumentasi lengkap semua cron jobs / scheduled tasks di Qalcuity.
> **Last Updated:** 11 September 2026

---

## Overview

Qalcuity menggunakan **Laravel-style unified scheduler** — satu cron entry di aaPanel yang menjalankan dispatcher, lalu dispatcher mengecek jadwal masing-masing task dan menjalankan yang waktunya sudah tiba.

> **Migrasi dari multi-cron ke unified scheduler:** Sebelumnya ada 4 cron entry terpisah. Sekarang cukup 1 entry saja.

### Authentication
Semua cron endpoints menggunakan **CRON_SECRET** Bearer token:
```
Authorization: Bearer <CRON_SECRET>
```

### Utility Library
[`apps/web/lib/cron.ts`](../apps/web/lib/cron.ts) menyediakan:
- `verifyCronAuth(req)` — verifikasi CRON_SECRET
- `cronSuccess(data)` — standardized success response
- `cronError(message, status)` — standardized error response

### Scheduler Library
[`apps/web/lib/cron-scheduler.ts`](../apps/web/lib/cron-scheduler.ts) menyediakan:
- `shouldRun(task, lastRunAt)` — cek apakah task sudah waktunya dijalankan
- `getSchedulerStatus()` — status semua tasks (last run, next run, enabled/disabled)
- `getLastRunInfo(taskId)` — ambil info last run dari DB/counter
- `updateLastRun(taskId, status, message, duration)` — update last run info
- `CronTaskResult` — tipe return value untuk semua handlers

---

## Unified Scheduler (Recommended)

### Cara Kerja

```
┌─────────────────────────────────────────────────────────┐
│  aaPanel: 1 cron entry (every 5-10 min)                 │
│  GET /api/cron/run                                       │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  Dispatcher (cron/run/route.ts)                          │
│  1. Auth check (CRON_SECRET)                             │
│  2. Loop through registered tasks                        │
│  3. For each task: check shouldRun() → execute if due    │
│  4. Log results to CronRunLog table                      │
│  5. Return summary: { ran, skipped, failed, results }    │
└─────────────────────────────────────────────────────────┘
```

### Task Schedule Config (WIB → UTC)

| Task ID | Name | Schedule (WIB) | Schedule (UTC) | Config |
|---------|------|----------------|----------------|--------|
| `payment-reminder` | Payment Reminder | Daily 08:00 | Daily 01:00 | `{ type: 'daily', hour: 1, minute: 0 }` |
| `stock-alert` | Stock Alert | 4x daily (06, 12, 18, 22) | Every 6 hours | `{ type: 'interval', intervalHours: 6 }` |
| `recurring-invoice` | Recurring Invoice | Daily 07:00 | Daily 00:00 | `{ type: 'daily', hour: 0, minute: 0 }` |
| `anomaly-scan` | Anomaly Detection | Daily 02:00 | Daily 19:00 (prev day) | `{ type: 'daily', hour: 19, minute: 0 }` |

### Setup di aaPanel Task Scheduler

**Hanya 1 entry:**
```
*/5 * * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" "https://qalcuity.com/api/cron/run"
```

Dispatcher akan otomatis menjalankan task yang sudah waktunya. Task yang belum waktunya akan di-skip.

### Run Specific Task
```
GET /api/cron/run?task=payment-reminder
```

### Check Scheduler Status
```
GET /api/cron/run?status
```

### Response Format
```json
{
  "success": true,
  "ran": 2,
  "skipped": 2,
  "failed": 0,
  "total": 4,
  "executedAt": "2026-09-11T01:00:00.000Z",
  "results": [
    { "id": "recurring-invoice", "name": "Recurring Invoice Generation", "status": "success", "message": "Processed 3 recurring invoices, generated 3, failed 0", "duration": 1250 },
    { "id": "payment-reminder", "name": "Payment Reminder", "status": "success", "message": "Processed 5 invoices, sent 5 reminders, skipped 0", "duration": 3200 },
    { "id": "stock-alert", "name": "Stock Alert", "status": "skipped", "message": "Not yet due (last run: 2026-09-11T00:00:00.000Z)" },
    { "id": "anomaly-scan", "name": "Anomaly Detection Scan", "status": "skipped", "message": "Not yet due (last run: 2026-09-10T19:00:00.000Z)" }
  ]
}
```

---

## Legacy Direct Cron Endpoints (Still Available)

> Endpoint individual masih bisa dipanggil langsung untuk backward compatibility.
> Namun **disarankan** menggunakan unified scheduler (`/api/cron/run`).

### 1. Payment Reminder
| Field | Detail |
|-------|--------|
| **URL** | `GET /api/cron/payment-reminder` |
| **File** | [`apps/web/app/api/cron/payment-reminder/route.ts`](../apps/web/app/api/cron/payment-reminder/route.ts) |
| **Auth** | `verifyCronAuth()` — CRON_SECRET Bearer token |
| **Function** | Scan overdue invoices → send email reminder → create in-app notification |
| **Schedule** | Daily 08:00 WIB |
| **Handler** | `runPaymentReminder()` — importable by scheduler |

### 2. Stock Alert
| Field | Detail |
|-------|--------|
| **URL** | `GET /api/cron/stock-alert` |
| **File** | [`apps/web/app/api/cron/stock-alert/route.ts`](../apps/web/app/api/cron/stock-alert/route.ts) |
| **Auth** | `verifyCronAuth()` — CRON_SECRET Bearer token |
| **Function** | Scan products with stock ≤ minStock → send email alert + in-app notification |
| **Schedule** | Every 6 hours (06:00, 12:00, 18:00, 22:00 WIB) |
| **Handler** | `runStockAlert()` — importable by scheduler |

### 3. Recurring Invoice
| Field | Detail |
|-------|--------|
| **URL** | `GET /api/cron/recurring-invoice` |
| **File** | [`apps/web/app/api/cron/recurring-invoice/route.ts`](../apps/web/app/api/cron/recurring-invoice/route.ts) |
| **Auth** | `verifyCronAuth()` — CRON_SECRET Bearer token |
| **Function** | Scan active recurring invoices with nextRunDate ≤ now → generate invoice → update nextRunDate |
| **Schedule** | Daily 07:00 WIB |
| **Handler** | `runRecurringInvoice()` — importable by scheduler |

### 4. Anomaly Detection — Full Scan
| Field | Detail |
|-------|--------|
| **URL** | `GET /api/ai/anomalies/scan` |
| **File** | [`apps/web/app/api/ai/anomalies/scan/route.ts`](../apps/web/app/api/ai/anomalies/scan/route.ts) |
| **Auth** | `verifyCronAuth()` — CRON_SECRET Bearer token |
| **Function** | Scan all tenants → run anomaly detection on financial transactions |
| **Schedule** | Daily 02:00 WIB |
| **Handler** | `runAnomalyScanCron()` — importable by scheduler |

---

## CronRunLog Model

> Setiap execution di-log ke table `CronRunLog` untuk monitoring dan debugging.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `taskId` | String | Task identifier (e.g., `payment-reminder`) |
| `status` | String | `success` or `error` |
| `message` | String? | Result message |
| `duration` | Int? | Execution time in milliseconds |
| `createdAt` | DateTime | When the run happened |

**Indexes:** `taskId`, `createdAt`, composite `(taskId, createdAt DESC)`

---

## Previous Recommended External Cron Schedule

> ⚠️ **DEPRECATED** — Gunakan unified scheduler di atas. Endpoint individual masih tersedia untuk backward compatibility.

| # | Endpoint | Cron Expression | WIB | Notes |
|---|----------|----------------|-----|-------|
| 1 | `/api/cron/recurring-invoice` | `0 7 * * *` | 07:00 daily | Generate invoices first |
| 2 | `/api/cron/payment-reminder` | `0 8 * * *` | 08:00 daily | After invoice generation |
| 3 | `/api/cron/stock-alert` | `0 */6 * * *` | 4x daily | 06, 12, 18, 00 |
| 4 | `/api/ai/anomalies/scan` | `0 2 * * *` | 02:00 daily | Off-peak |

---

## Scheduled Models (No Executor Yet)

### ScheduledReport
- **Model:** `ScheduledReport` di schema.prisma
- **Fields:** `frequency`, `dayOfWeek`, `dayOfMonth`, `time`, `nextExecutionAt`, `isActive`
- **Status:** ⚠️ Model exists but NO cron endpoint to execute
- **Priority:** Medium

### ScheduledQuery
- **Model:** `ScheduledQuery` di schema.prisma
- **Fields:** `cronExpression`, `frequency`, `nextRunAt`, `lastRunAt`, `isActive`
- **Status:** ⚠️ Model exists but NO cron endpoint to execute
- **Priority:** Medium

---

## Client-Side Polling (Frontend)

| # | Component | Interval | Function |
|---|-----------|----------|----------|
| 1 | Kitchen Orders | 10s | Poll kitchen orders |
| 2 | Kitchen Stats | 60s | Poll kitchen stats |
| 3 | Notification Center | 30s | Poll in-app notifications |
| 4 | POS Terminals Monitor | 30s | Auto-refresh terminal status |
| 5 | POS Tables | Configurable | Poll table status |
| 6 | POS Products | Configurable | Auto-refresh product list |
| 7 | Projects | Configurable | Poll project status |
| 8 | Kitchen Order Timer | 1s | Timer countdown |
| 9 | Platform Monitoring | Configurable | Auto-refresh monitoring |

---

## Environment Variables

```bash
# Required for all cron endpoints
CRON_SECRET="your-secure-random-string"

# Email (required for payment reminder & stock alert)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="Qalcuity <noreply@qalcuity.com>"
SMTP_SECURE="false"
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Cron returns 401 | Check CRON_SECRET matches in .env and cron job config |
| Payment reminder not sending | Check SMTP config + `TenantNotificationSettings.emailOverdue` |
| Stock alert not triggering | Check `Product.minStock > 0` (products with minStock=0 are skipped) |
| Recurring invoice not generating | Check `RecurringInvoice.status = 'ACTIVE'` and `nextRunDate <= now()` |
| Duplicate anomaly scan | Deprecate `/api/ai/anomalies/[id]` endpoint |
