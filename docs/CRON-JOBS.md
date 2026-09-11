# Qalcuity — Cron Jobs Documentation

> Dokumentasi lengkap semua cron jobs / scheduled tasks di Qalcuity.
> **Last Updated:** 10 September 2026

---

## Overview

Qalcuity menggunakan **external cron service** (cron-job.org, Vercel Cron, atau aaPanel Task Scheduler) untuk trigger API endpoints. Tidak ada internal scheduler (node-cron) — semua execution di-handle oleh external service.

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

---

## Active Cron Endpoints

### 1. Payment Reminder
| Field | Detail |
|-------|--------|
| **URL** | `GET /api/cron/payment-reminder` |
| **File** | [`apps/web/app/api/cron/payment-reminder/route.ts`](../apps/web/app/api/cron/payment-reminder/route.ts) |
| **Auth** | `verifyCronAuth()` — CRON_SECRET Bearer token |
| **Function** | Scan overdue invoices → send email reminder → create in-app notification |
| **Schedule** | Daily 08:00 WIB |
| **Dedup** | 24-hour (checks `PaymentReminderLog`) |
| **Dependencies** | `sendPaymentReminderEmail()`, `PaymentReminderLog`, `InAppNotification` |

**Cron Expression:** `0 8 * * *`

---

### 2. Stock Alert
| Field | Detail |
|-------|--------|
| **URL** | `GET /api/cron/stock-alert` |
| **File** | [`apps/web/app/api/cron/stock-alert/route.ts`](../apps/web/app/api/cron/stock-alert/route.ts) |
| **Auth** | `verifyCronAuth()` — CRON_SECRET Bearer token |
| **Function** | Scan products with stock ≤ minStock → send email alert + in-app notification |
| **Schedule** | Every 6 hours (06:00, 12:00, 18:00, 00:00 WIB) |
| **Dedup** | 24-hour (checks recent InAppNotification) |
| **Dependencies** | `checkAllLowStockProducts()`, `sendStockAlertEmail()`, `InAppNotification` |

**Cron Expression:** `0 */6 * * *`

---

### 3. Recurring Invoice
| Field | Detail |
|-------|--------|
| **URL** | `GET /api/cron/recurring-invoice` |
| **File** | [`apps/web/app/api/cron/recurring-invoice/route.ts`](../apps/web/app/api/cron/recurring-invoice/route.ts) |
| **Auth** | `verifyCronAuth()` — CRON_SECRET Bearer token |
| **Function** | Scan active recurring invoices with nextRunDate ≤ now → generate invoice → update nextRunDate |
| **Schedule** | Daily 07:00 WIB (before payment reminder) |
| **Dedup** | Per-invoice via nextRunDate calculation |
| **Dependencies** | `generateInvoiceFromRecurring()`, `calculateNextRunDate()`, `RecurringInvoice` |

**Cron Expression:** `0 7 * * *`

---

### 4. Anomaly Detection — Full Scan
| Field | Detail |
|-------|--------|
| **URL** | `GET /api/ai/anomalies/scan` |
| **File** | [`apps/web/app/api/ai/anomalies/scan/route.ts`](../apps/web/app/api/ai/anomalies/scan/route.ts) |
| **Auth** | `verifyCronAuth()` — CRON_SECRET Bearer token |
| **Function** | Scan all tenants → run anomaly detection on financial transactions |
| **Schedule** | Daily 02:00 WIB (off-peak hours) |
| **Dependencies** | `runAnomalyScan()`, `AnomalyDetection` model |

**Cron Expression:** `0 2 * * *`

---

### 5. Anomaly Detection — Single Tenant (⚠️ Potentially Duplicate)
| Field | Detail |
|-------|--------|
| **URL** | `GET /api/ai/anomalies/[id]` |
| **File** | [`apps/web/app/api/ai/anomalies/[id]/route.ts`](../apps/web/app/api/ai/anomalies/[id]/route.ts) |
| **Auth** | `verifyCronAuth()` — CRON_SECRET Bearer token |
| **Function** | Identical to `/scan` — scans all tenants (potential duplicate) |
| **Schedule** | N/A — consider deprecating |
| **Status** | ⚠️ Duplicate of `/scan` endpoint |

---

## Recommended External Cron Schedule

| # | Endpoint | Cron Expression | WIB | Notes |
|---|----------|----------------|-----|-------|
| 1 | `/api/cron/recurring-invoice` | `0 7 * * *` | 07:00 daily | Generate invoices first |
| 2 | `/api/cron/payment-reminder` | `0 8 * * *` | 08:00 daily | After invoice generation |
| 3 | `/api/cron/stock-alert` | `0 */6 * * *` | 4x daily | 06, 12, 18, 00 |
| 4 | `/api/ai/anomalies/scan` | `0 2 * * *` | 02:00 daily | Off-peak |

### Setup di aaPanel Task Scheduler
```
# Payment Reminder
0 8 * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://qalcuity.com/api/cron/payment-reminder

# Stock Alert
0 */6 * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://qalcuity.com/api/cron/stock-alert

# Recurring Invoice
0 7 * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://qalcuity.com/api/cron/recurring-invoice

# Anomaly Scan
0 2 * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://qalcuity.com/api/ai/anomalies/scan
```

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
