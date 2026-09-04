# 🎯 Targeted Audit — Remaining Issues for Next Batch

> **Tanggal:** 4 September 2026  
> **Scope:** Hardcoded strings, missing toast feedback, dashboard KPI  
> **Status:** Post-Batches A-I (174 pages deployed)

---

## Top 10 Actionable Issues

### Issue 1: Dashboard Extended KPI — 15+ Hardcoded Indonesian Strings
**Severity:** 🟠 Medium | **Scope:** High visibility (dashboard is first page users see)

**File:** [`apps/web/app/dashboard/page.tsx`](apps/web/app/dashboard/page.tsx)

| Line | Hardcoded String | Should Be |
|------|-----------------|-----------|
| 243 | `'Profit Bulanan'` | `t('dashboard.profitMonthly')` |
| 249 | `'Pengeluaran'` | `t('dashboard.expenses')` |
| 255 | `'Invoice Overdue'` | `t('dashboard.invoiceOverdue')` |
| 261 | `'Karyawan Aktif'` | `t('dashboard.activeEmployees')` |
| 397 | `'Menunggu Persetujuan'` | `t('dashboard.pendingApprovals')` |
| 406 | `'Lihat Semua →'` | `t('common.viewAll')` |
| 505 | `'Pengeluaran per Kategori'` | `t('dashboard.expenseByCategory')` |
| 528 | `'Produk Terlaris'` | `t('dashboard.topProducts')` |
| 548 | `'Tren Order'` | `t('dashboard.orderTrend')` |
| 424 | `'Diajukan oleh'` | `t('dashboard.submittedBy')` |
| 277-278 | `'↑ X% dari bulan lalu'` | Template with `t()` |
| 280-283 | AI insight descriptions (3 variants) | `t()` keys |
| 289-301 | Cash flow + stock insight text (6 variants) | `t()` keys |

**Fix:** Add ~20 new i18n keys to `messages/id.json` and `messages/en.json`. Replace all hardcoded strings with `t()` calls.

---

### Issue 2: Dashboard Approve/Reject — Silent Error Swallowing
**Severity:** 🔴 High | **Scope:** User action fails silently

**File:** [`apps/web/app/dashboard/page.tsx`](apps/web/app/dashboard/page.tsx)

| Line | Code | Problem |
|------|------|---------|
| 446 | `catch { /* ignore */ }` | Approve API fails → no feedback |
| 467 | `catch { /* ignore */ }` | Reject API fails → no feedback |

**Fix:** Add toast on error:
```typescript
catch {
    showToast(t('dashboard.approvalError'), 'error')
}
```

---

### Issue 3: Finance Accounts — Hardcoded Empty State
**Severity:** 🟡 Low | **Scope:** 1 location

**File:** [`apps/web/app/dashboard/finance/accounts/page.tsx`](apps/web/app/dashboard/finance/accounts/page.tsx:760)

| Line | Hardcoded | Fix |
|------|-----------|-----|
| 760 | `title="Tidak ada akun ditemukan"` | `t('finance.accounts.emptyTitle')` |
| 761 | `description="Coba ubah filter atau kata kunci pencarian"` | `t('finance.accounts.emptyDescription')` |

---

### Issue 4: Finance Payments — Hardcoded Empty State Description
**Severity:** 🟡 Low | **Scope:** 2 locations

**File:** [`apps/web/app/dashboard/finance/payments/page.tsx`](apps/web/app/dashboard/finance/payments/page.tsx:294)

| Line | Hardcoded | Fix |
|------|-----------|-----|
| 294, 370 | `description="Belum ada data pembayaran yang sesuai dengan filter."` | `t('finance.payments.emptyDescription')` |

Note: Title already uses `t()`, only description is hardcoded.

---

### Issue 5: CRM Contacts — Hardcoded Empty State (3 locations)
**Severity:** 🟡 Low | **Scope:** 3 identical blocks

**File:** [`apps/web/app/dashboard/crm/contacts/page.tsx`](apps/web/app/dashboard/crm/contacts/page.tsx:345)

| Line | Hardcoded | Fix |
|------|-----------|-----|
| 345, 394, 450 | `title="Tidak ada kontak ditemukan"` | `t('crm.contacts.emptyTitle')` |
| 346, 395, 451 | `description="Tidak ada kontak yang sesuai dengan filter yang dipilih."` | `t('crm.contacts.emptyDescription')` |

---

### Issue 6: 20+ Pages — Hardcoded Indonesian Error Messages
**Severity:** 🟠 Medium | **Scope:** Systemic across all modules

Estimated **50+ hardcoded error strings** found across these modules:

| Module | Files Affected | Example Strings |
|--------|---------------|-----------------|
| Finance | 8 files | `'Gagal memuat data pajak'`, `'Gagal memuat data quotation'`, `'Terjadi kesalahan saat menyimpan'` |
| HR | 6 files | `'Gagal memuat data payroll'`, `'Gagal memuat data karyawan'`, `'Gagal memuat data absensi'` |
| Inventory | 8 files | `'Gagal memuat data supplier'`, `'Gagal memuat data produk'`, `'Gagal terhubung ke server'` |
| CRM | 5 files | `'Gagal memuat data leads'`, `'Terjadi kesalahan saat memuat data'`, `'Gagal membuat lead'` |
| Settings | 6 files | `'Gagal menyimpan konfigurasi SMTP'`, `'Gagal memuat data integrasi'` |

**Fix:** Bulk replace all hardcoded error messages with `t()` calls. Use existing i18n keys where available, create new ones where needed.

---

### Issue 7: Billing Page — Silent console.error (No User Feedback)
**Severity:** 🟠 Medium | **Scope:** 3 silent failures

**File:** [`apps/web/app/dashboard/billing/page.tsx`](apps/web/app/dashboard/billing/page.tsx:159)

| Line | Code | Problem |
|------|------|---------|
| 159 | `console.error('Error fetching stats')` | User sees nothing |
| 179 | `console.error('Error fetching payments')` | User sees nothing |
| 194 | `console.error('Error fetching subscription')` | User sees nothing |

**Fix:** Replace `console.error` with `setError()` or toast notification.

---

### Issue 8: Analytics Pages — English Error Messages (Not i18n'd)
**Severity:** 🟡 Low | **Scope:** 8 analytics files

**Files:** [`apps/web/app/dashboard/analytics/`](apps/web/app/dashboard/analytics/) — reports, kpi, history, explorer, dashboards, charts, alerts, scheduled

Example hardcoded English strings:
- `'Failed to delete chart'` (charts/page.tsx:190)
- `'Failed to toggle alert rule'` (alerts/page.tsx:211)
- `'Failed to save report'` (explorer/page.tsx:294)
- `'Failed to delete dashboard'` (dashboards/page.tsx:145)

**Fix:** Replace with `t()` calls using consistent i18n keys.

---

### Issue 9: Billing Page — Hardcoded Empty State
**Severity:** 🟡 Low | **Scope:** 1 location

**File:** [`apps/web/app/dashboard/billing/page.tsx`](apps/web/app/dashboard/billing/page.tsx:510)

| Line | Hardcoded | Fix |
|------|-----------|-----|
| 510 | `Belum ada data pembayaran` | `t('billing.noPayments')` |

---

### Issue 10: Settings Pages — Hardcoded Error Messages
**Severity:** 🟡 Low | **Scope:** 5+ settings files

**Files in** [`apps/web/app/dashboard/settings/`](apps/web/app/dashboard/settings/)

| File | Line | Hardcoded |
|------|------|-----------|
| [`roles/page.tsx`](apps/web/app/dashboard/settings/roles/page.tsx:134) | 134 | `'Gagal terhubung ke server'` |
| [`industry/page.tsx`](apps/web/app/dashboard/settings/industry/page.tsx:95) | 95 | `'Gagal terhubung ke server'` |
| [`custom-fields/page.tsx`](apps/web/app/dashboard/settings/custom-fields/page.tsx:91) | 91 | `'Gagal terhubung ke server'` |
| [`page.tsx`](apps/web/app/dashboard/settings/page.tsx:131) | 131 | `'Terjadi kesalahan. Silakan coba lagi.'` |
| [`page.tsx`](apps/web/app/dashboard/settings/page.tsx:179) | 179 | `'Gagal mengunggah foto'` |

Note: Many settings pages already use `t('settings.errorConnectServer')` — these outliers should be aligned.

---

## Summary

| Priority | Count | Category |
|----------|-------|----------|
| 🔴 High | 1 | Silent error swallowing (dashboard approve/reject) |
| 🟠 Medium | 3 | Dashboard i18n, systemic error messages, billing silent failures |
| 🟡 Low | 6 | Empty states, analytics i18n, settings i18n |

**Total estimated effort:** ~50 hardcoded strings to replace + 3 silent catch blocks to fix + 1 billing error handling fix.

**Note:** The P1 issues from the audit report (`any` types in rate-limit.ts, legacy _error.tsx) remain but are lower priority than the i18n and error feedback gaps identified above.
