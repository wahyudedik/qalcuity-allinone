# 📊 Demo Data Guide — Qalcuity All-in-One

> **Penting:** Setiap kali ada fitur baru yang ditambahkan, pastikan juga menambah/update data demo di `packages/db/prisma/seed.ts`.
> File ini berfungsi sebagai checklist untuk memastikan semua fitur punya data demo yang cukup.

---

## 🔄 Mock Data Migration (Batch 29–31)

> Semua halaman UI sekarang menggunakan **live data** dari API routes (Prisma queries atau seed data).
> Tidak ada lagi hardcoded mock data di dalam komponen React.

### Batch 29: Settings & Inventory Categories

| Halaman | Sumber Data Lama | Sumber Data Baru | Model/Seed |
|---------|-----------------|------------------|------------|
| `settings/team/page.tsx` | Hardcoded array | `GET /api/settings/team` | Prisma `User` |
| `settings/company/page.tsx` | Hardcoded object | `GET /api/settings/company` | Prisma `Tenant` |
| `settings/notifications/page.tsx` | Hardcoded object | `GET /api/settings/notifications` | Seed (JSON) |
| `settings/security/page.tsx` | Hardcoded object | `GET /api/settings/security` | Seed (JSON) |
| `inventory/categories/page.tsx` | Hardcoded array | `GET /api/inventory/categories` | Prisma `Category` |

**API routes baru/diupdate:**
- `POST /api/inventory/categories` — Create category (Prisma)
- `GET /api/settings/security` — Tambah GET endpoint (sebelumnya hanya POST)

### Batch 30: Finance — Chart of Accounts & Reconciliation

| Halaman | Sumber Data Lama | Sumber Data Baru | Model/Seed |
|---------|-----------------|------------------|------------|
| `finance/accounts/page.tsx` | Hardcoded array | `GET /api/finance/accounts` | Seed: [`coa.ts`](apps/web/lib/seed-data/coa.ts) |
| `finance/reconciliation/page.tsx` | Hardcoded array | `GET /api/finance/reconciliation` | Seed: [`reconciliation.ts`](apps/web/lib/seed-data/reconciliation.ts) |

**Seed data baru:**

| File | Isi | Record Count |
|------|-----|:------------:|
| `apps/web/lib/seed-data/coa.ts` | Chart of Accounts — struktur CoA Indonesia standar (Aktiva, Passiva, Modal, Pendapatan, Beban) | 44 akun |
| `apps/web/lib/seed-data/reconciliation.ts` | Bank accounts, bank transactions, book transactions, reconciliation summary | 3 bank accounts, ~6 transactions |

> ⚠️ Kedua seed data ini menggunakan **in-memory CRUD** — data berubah saat server restart. Tidak ada Prisma model karena ini adalah data konfigurasi/standar yang tidak perlu persistensi lintas deployment.

**API routes baru/diupdate:**
- `GET/POST/PUT/DELETE /api/finance/accounts` — Full CRUD untuk CoA
- `GET/POST /api/finance/reconciliation` — Full rewrite, baca dari seed data

### Batch 31: Reports — Aggregate dari 9 Model

| Halaman | Sumber Data Lama | Sumber Data Baru | Model/Seed |
|---------|-----------------|------------------|------------|
| `reports/page.tsx` | Hardcoded arrays | `GET /api/reports` | Aggregate dari 9 Prisma models |

**Prisma models yang di-aggregate:**
1. `Invoice` — Revenue by month, sales by customer
2. `Payment` — Cash flow, payment status
3. `Product` — Top products, stock analysis
4. `Contact` — Customer/supplier count
5. `Employee` — HR stats
6. `AttendanceRecord` — Attendance summary
7. `PayrollRecord` — Payroll summary
8. `Supplier` — Supplier count
9. `PurchaseOrder` — Purchase summary

**12 report components** tetap berfungsi dengan data dari API:
1. Revenue Report
2. Expense Report
3. Profit & Loss
4. Sales by Customer
5. Sales by Product
6. Tax Report
7. Cash Flow
8. Inventory Summary
9. Stock Movement
10. Employee Report
11. Attendance Report
12. Payroll Summary

---

## 🔑 Default Credentials

| Role | Email | Password | Akses |
|------|-------|----------|-------|
| **SUPERADMIN** | info@qalcuity.com | Wahyu123456789@ | Full platform, approve payment |
| **ADMIN** | admin@qalcuity.com | admin123 | Full tenant, manage team |
| **MEMBER** | member@qalcuity.com | member123 | Create/read, no settings |
| **VIEWER** | viewer@qalcuity.com | viewer123 | Read only |
| **USER** | user@qalcuity.com | user123 | Legacy role |

---

## 📋 Data Demo Summary

| # | Model | Records | Fitur Terkait | Status |
|---|-------|:-------:|---------------|:------:|
| 1 | Tenant | 1 | Multi-tenant | ✅ |
| 2 | User | 5 | Auth, RBAC | ✅ |
| 3 | Category | 4 | Inventory - Categories | ✅ |
| 4 | Contact | 7 | CRM - Contacts | ✅ |
| 5 | Supplier | 3 | Inventory - Suppliers | ✅ |
| 6 | Product | 5 | Inventory - Products | ✅ |
| 7 | StockMovement | 5 | Inventory - Stock | ✅ |
| 8 | Invoice | 6 | Finance - Invoices | ✅ |
| 9 | InvoiceItem | 6 | Finance - Invoice Items | ✅ |
| 10 | Payment | 5 | Finance - Payments | ✅ |
| 11 | Quotation | 3 | Sales - Quotations | ✅ |
| 12 | QuotationItem | 3 | Sales - Quotation Items | ✅ |
| 13 | PurchaseOrder | 2 | Finance - PO | ✅ |
| 14 | PurchaseOrderItem | 2 | Finance - PO Items | ✅ |
| 15 | Lead | 8 | CRM - Leads | ✅ |
| 16 | Deal | 6 | CRM - Deals, Pipeline | ✅ |
| 17 | Employee | 5 | HR - Employees | ✅ |
| 18 | AttendanceRecord | ~105 | HR - Attendance | ✅ |
| 19 | LeaveRequest | 4 | HR - Leaves | ✅ |
| 20 | PayrollRecord | 6 | HR - Payroll | ✅ |
| 21 | AuditLog | 14 | Audit Trail | ✅ |
| 22 | SubscriptionPlan | 3 | Billing - Plans | ✅ |
| 23 | TenantSubscription | 1 | Billing - Subscription | ✅ |
| 24 | BillingPayment | 4 | Billing - Payments | ✅ |

---

## 🏢 Tenant

| Field | Value |
|-------|-------|
| Name | PT Qalcuity Demo |
| Slug | qalcuity-demo |
| Email | demo@qalcuity.com |
| Phone | 021-1234567 |
| Address | Jl. Sudirman No. 123, Jakarta Selatan |
| Subscription Status | ACTIVE |
| Current Plan | Growth (Rp 799.000/bulan) |

---

## 👥 Users

| Role | Email | Password | Name | Catatan |
|------|-------|----------|------|---------|
| SUPERADMIN | info@qalcuity.com | Wahyu123456789@ | Super Admin | Platform admin, bisa approve payment |
| ADMIN | admin@qalcuity.com | admin123 | Admin User | Tenant admin, full CRUD |
| MEMBER | member@qalcuity.com | member123 | Member User | Limited access, no settings |
| VIEWER | viewer@qalcuity.com | viewer123 | Viewer User | Read only |
| USER | user@qalcuity.com | user123 | User Demo | Legacy role |

---

## 💰 Finance

### Invoices (6 records)

| # | Invoice # | Customer | Subtotal | Tax (11%) | Total | Status | Due Date | Catatan |
|---|-----------|----------|----------|-----------|-------|--------|----------|---------|
| 1 | INV-2026-001 | PT Maju Jaya | Rp 7.500.000 | Rp 825.000 | Rp 8.325.000 | SENT | 2026-08-30 | Pembayaran via transfer bank |
| 2 | INV-2026-002 | CV Berkah Mandiri | Rp 3.750.000 | Rp 412.500 | Rp 4.162.500 | PAID | 2026-07-31 | Sudah dibayar lunas |
| 3 | INV-2026-003 | PT Sejahtera Abadi | Rp 23.000.000 | Rp 2.530.000 | Rp 25.530.000 | OVERDUE | 2026-07-30 | Pembayaran terlambat |
| 4 | INV-2026-004 | PT Nusantara Jaya | Rp 7.500.000 | Rp 825.000 | Rp 8.325.000 | DRAFT | 2026-09-15 | Draft invoice |
| 5 | INV-2026-005 | PT Maju Jaya | Rp 5.000.000 | Rp 0 | Rp 5.000.000 | CANCELLED | 2026-07-15 | Dibatalkan atas permintaan customer |
| 6 | INV-2026-006 | PT Sejahtera Abadi | Rp 30.000.000 | Rp 0 | Rp 30.000.000 | OVERDUE | 2026-06-30 | Invoice overdue lama — perlu follow-up |

**Invoice Items:**

| Invoice # | Description | Qty | Unit Price | Total |
|-----------|-------------|:---:|------------|-------|
| INV-2026-001 | Widget A x50 | 50 | Rp 150.000 | Rp 7.500.000 |
| INV-2026-002 | Part B x15 | 15 | Rp 250.000 | Rp 3.750.000 |
| INV-2026-003 | Widget Pro x92 | 92 | Rp 250.000 | Rp 23.000.000 |
| INV-2026-004 | Service C x15 jam | 15 | Rp 500.000 | Rp 7.500.000 |
| INV-2026-005 | Service Konsultasi | 1 | Rp 5.000.000 | Rp 5.000.000 |
| INV-2026-006 | Widget Pro Pack | 10 | Rp 3.000.000 | Rp 30.000.000 |

### Payments (5 records)

| # | Payment # | Type | Amount | Method | Status | Date | Notes |
|---|-----------|------|--------|--------|--------|------|-------|
| 1 | PAY-2026-001 | INCOME | Rp 4.162.500 | BANK_TRANSFER | COMPLETED | 2026-07-28 | Pembayaran lunas INV-2026-002 |
| 2 | PAY-2026-002 | EXPENSE | Rp 25.000.000 | BANK_TRANSFER | COMPLETED | 2026-08-01 | Pembayaran ke PT Sejahtera Supplier |
| 3 | PAY-2026-003 | INCOME | Rp 5.000.000 | E_WALLET | PENDING | 2026-08-15 | DP pembayaran INV-2026-001 — menunggu konfirmasi |
| 4 | PAY-2026-004 | INCOME | Rp 25.000.000 | BANK_TRANSFER | COMPLETED | 2026-08-10 | Pembayaran Invoice INV-2026-001 |
| 5 | PAY-2026-005 | EXPENSE | Rp 5.000.000 | CASH | COMPLETED | 2026-08-12 | Pembelian ATK |

### Quotations (3 records)

| # | Quotation # | Customer | Subtotal | Tax | Discount | Total | Status | Valid Until |
|---|-------------|----------|----------|-----|----------|-------|--------|-------------|
| 1 | QUO-2026-001 | PT Maju Jaya | Rp 15.000.000 | Rp 1.650.000 | - | Rp 16.650.000 | SENT | 2026-09-15 |
| 2 | QUO-2026-002 | PT Sejahtera Abadi | Rp 5.000.000 | Rp 550.000 | - | Rp 5.550.000 | DRAFT | 2026-09-30 |
| 3 | QUO-2026-003 | PT Nusantara Jaya | Rp 7.500.000 | Rp 825.000 | Rp 500.000 | Rp 7.825.000 | ACCEPTED | 2026-08-31 |

**Quotation Items:**

| Quotation # | Description | Qty | Unit Price | Total |
|-------------|-------------|:---:|------------|-------|
| QUO-2026-001 | Widget A x100 | 100 | Rp 150.000 | Rp 15.000.000 |
| QUO-2026-002 | Part B x20 | 20 | Rp 250.000 | Rp 5.000.000 |
| QUO-2026-003 | Service C x15 jam | 15 | Rp 500.000 | Rp 7.500.000 |

### Purchase Orders (2 records)

| # | PO Number | Supplier | Subtotal | Tax | Total | Status | Order Date | Delivery Date |
|---|-----------|----------|----------|-----|-------|--------|------------|---------------|
| 1 | PO-2026-001 | PT Sejahtera Supplier | Rp 10.000.000 | Rp 1.100.000 | Rp 11.100.000 | RECEIVED | 2026-07-15 | 2026-07-20 |
| 2 | PO-2026-002 | CV Berkah Components | Rp 36.000.000 | Rp 3.960.000 | Rp 39.960.000 | SENT | 2026-08-01 | 2026-08-10 |

**Purchase Order Items:**

| PO Number | Description | Qty | Unit Price | Total |
|-----------|-------------|:---:|------------|-------|
| PO-2026-001 | Widget A x100 | 100 | Rp 100.000 | Rp 10.000.000 |
| PO-2026-002 | Part B x200 | 200 | Rp 180.000 | Rp 36.000.000 |

---

## 📈 CRM

### Contacts (7 records)

| # | Name | Company | Type | Email | Phone | City |
|---|------|---------|------|-------|-------|------|
| 1 | PT Maju Jaya | PT Maju Jaya | CUSTOMER | info@majujaya.co.id | 021-2345678 | Jakarta |
| 2 | CV Berkah Mandiri | CV Berkah Mandiri | CUSTOMER | info@berkahmandiri.co.id | 021-3456789 | Jakarta |
| 3 | PT Sejahtera Abadi | PT Sejahtera Abadi | CUSTOMER | sales@sejahtera.co.id | 021-4567890 | Jakarta |
| 4 | PT Nusantara Jaya | PT Nusantara Jaya | CUSTOMER | info@nusantara.co.id | 021-5678901 | Jakarta |
| 5 | CV Sukses Mandiri | CV Sukses Mandiri | CUSTOMER | info@suksesmandiri.co.id | 021-6789012 | Jakarta |
| 6 | PT Sumber Makmur | PT Sumber Makmur | SUPPLIER | info@sumbermakmur.co.id | 021-5553691 | - |
| 7 | CV Global Tech | CV Global Tech | BOTH | hello@globaltech.co.id | 021-5557412 | - |

### Leads (8 records)

| # | Name | Company | Source | Status | Value | Notes |
|---|------|---------|--------|--------|-------|-------|
| 1 | PT Nusantara Jaya | PT Nusantara Jaya | WEBSITE | NEW | Rp 25.000.000 | Tertarik dengan paket enterprise |
| 2 | CV Sukses Mandiri | CV Sukses Mandiri | REFERRAL | CONTACTED | Rp 15.000.000 | Direkomendasikan oleh PT Maju Jaya |
| 3 | PT ABC Technology | PT ABC Technology | SOCIAL_MEDIA | QUALIFIED | Rp 50.000.000 | Lead dari LinkedIn, sangat potensial |
| 4 | CV Berkah Jaya | CV Berkah Jaya | COLD_CALL | PROPOSAL | Rp 45.000.000 | Proposal sudah dikirim |
| 5 | PT Maju Bersama | PT Maju Bersama | REFERRAL | WON | Rp 50.000.000 | - |
| 6 | CV Berkah Jaya | CV Berkah Jaya | WEBSITE | LOST | Rp 25.000.000 | Pilih kompetitor |
| 7 | PT Sejahtera Abadi | PT Sejahtera Abadi | COLD_CALL | WON | Rp 75.000.000 | - |
| 8 | UD Makmur Sentosa | UD Makmur Sentosa | SOCIAL_MEDIA | LOST | Rp 15.000.000 | Budget tidak cukup |

### Deals (6 records)

| # | Title | Value | Stage | Probability | Close Date | Contact |
|---|-------|-------|-------|:-----------:|------------|---------|
| 1 | PT ABC Corp - Paket Enterprise | Rp 150.000.000 | NEGOTIATION | 75% | 2026-08-30 | PT Maju Jaya |
| 2 | CV Maju Bersama - Annual Contract | Rp 85.000.000 | PROPOSAL | 55% | 2026-09-15 | CV Berkah Mandiri |
| 3 | PT Sejahtera - Bulk Order | Rp 200.000.000 | DISCOVERY | 30% | 2026-10-01 | PT Sejahtera Abadi |
| 4 | CV Berkah Jaya - Maintenance Contract | Rp 45.000.000 | CLOSING | 90% | 2026-08-15 | CV Berkah Mandiri |
| 5 | Paket Website Company Profile | Rp 25.000.000 | CLOSED_WON | 100% | 2026-08-10 | PT Maju Jaya |
| 6 | Maintenance Server Tahunan | Rp 15.000.000 | CLOSED_LOST | 0% | 2026-08-15 | CV Berkah Mandiri |

---

## 📦 Inventory

### Categories (4 records)

| # | Name | Description |
|---|------|-------------|
| 1 | Electronics | Produk elektronik |
| 2 | Mechanical | Komponen mekanik |
| 3 | Services | Layanan jasa |
| 4 | Office Supplies | Perlengkapan kantor |

### Suppliers (3 records)

| # | Name | Contact Person | Email | Phone | City | Rating |
|---|------|----------------|-------|-------|------|:------:|
| 1 | PT Sejahtera Supplier | Budi Hartono | budi@sejahtera-supplier.co.id | 021-7890123 | Jakarta | 4.5 |
| 2 | CV Berkah Components | Siti Rahayu | siti@berkahcomp.co.id | 021-8901234 | Bekasi | 4.0 |
| 3 | PT Teknologi Nusantara | Rahmat Widodo | rahmat@teknusa.co.id | 021-9012345 | Tangerang | 4.2 |

### Products (5 records)

| # | SKU | Name | Description | Unit | Price | Cost | Stock | Min Stock | Category |
|---|-----|------|-------------|------|-------|------|:-----:|:---------:|----------|
| 1 | WDG-001 | Widget A | Widget standar untuk kebutuhan umum | pcs | Rp 150.000 | Rp 100.000 | 150 | 20 | Electronics |
| 2 | PRT-001 | Part B | Komponen mesin tipe B | pcs | Rp 250.000 | Rp 180.000 | 75 | 10 | Mechanical |
| 3 | SVC-001 | Service C | Layanan konsultasi teknis | hour | Rp 500.000 | Rp 300.000 | 999 | 0 | Services |
| 4 | OFF-001 | Printer Paper A4 | Kertas printer ukuran A4 | rim | Rp 45.000 | Rp 35.000 | 200 | 50 | Office Supplies |
| 5 | WDG-002 | Widget Pro | Widget versi pro dengan fitur lengkap | pcs | Rp 250.000 | Rp 180.000 | 8 | 15 | Electronics |

> ⚠️ **Widget Pro (WDG-002)** stock di bawah minimum (8 < 15) — ini adalah contoh data untuk testing alert stok rendah.

### Stock Movements (5 records)

| # | Product | Type | Quantity | Reference | Notes |
|---|---------|------|:--------:|-----------|-------|
| 1 | Widget A | IN | 100 | PO-2026-001 | Restock Widget A |
| 2 | Widget A | OUT | 50 | INV-2026-001 | Penjualan ke PT Maju Jaya |
| 3 | Part B | IN | 200 | PO-2026-002 | Restock Part B |
| 4 | Part B | OUT | 30 | INV-2026-003 | Penjualan ke CV Berkah |
| 5 | Widget Pro | ADJUSTMENT | -5 | ADJ-001 | Koreksi stok Widget Pro |

---

## 👥 HR

### Employees (5 records)

| # | Employee ID | Name | Email | Phone | Position | Department | Join Date | Salary |
|---|-------------|------|-------|-------|----------|------------|-----------|--------|
| 1 | EMP-001 | Budi Santoso | budi@qalcuity.com | 0812-3456-7890 | Software Engineer | Engineering | 2024-01-15 | Rp 15.000.000 |
| 2 | EMP-002 | Sari Dewi | sari@qalcuity.com | 0812-4567-8901 | Marketing Manager | Marketing | 2023-06-01 | Rp 18.000.000 |
| 3 | EMP-003 | Andi Pratama | andi@qalcuity.com | 0812-5678-9012 | Accountant | Finance | 2025-03-10 | Rp 12.000.000 |
| 4 | EMP-004 | Dewi Lestari | dewi@qalcuity.com | 0812-6789-0123 | HR Specialist | HR | 2024-09-01 | Rp 12.000.000 |
| 5 | EMP-005 | Eko Prasetyo | eko@qalcuity.com | 0812-7890-1234 | Sales Executive | Sales | 2025-03-01 | Rp 14.000.000 |

### Attendance Records (~105 records)

- **30 hari historis** untuk 5 employees
- **Status:** PRESENT, LATE, WFH, ABSENT
- **Hanya hari kerja** (Senin-Jumat)
- Clock in: 08:00 (PRESENT), 08:30 (LATE)
- Clock out: 17:00
- Work hours: 8 jam (PRESENT/LATE), 0 (WFH/ABSENT)

### Leave Requests (4 records)

| # | Employee | Type | Start Date | End Date | Days | Reason | Status | Applied Date | Approved By |
|---|----------|------|------------|----------|:----:|--------|--------|--------------|-------------|
| 1 | Budi Santoso | ANNUAL | 2026-08-04 | 2026-08-05 | 2 | Istirahat | APPROVED | 2026-08-01 | Admin Qalcuity |
| 2 | Sari Dewi | SICK | 2026-08-03 | 2026-08-03 | 1 | Sakit demam | APPROVED | 2026-08-03 | Admin Qalcuity |
| 3 | Andi Pratama | ANNUAL | 2026-08-06 | 2026-08-08 | 3 | Keluarga | PENDING | 2026-08-02 | - |
| 4 | Dewi Lestari | PERSONAL | 2026-08-20 | 2026-08-20 | 1 | Urusan pribadi | REJECTED | 2026-08-10 | Admin Qalcuity |

> **Catatan Reject:** Ditolak karena kuota cuti tahunan habis

### Payroll Records (6 records)

| # | Employee | Period | Base Salary | Allowances | Deductions | Bonus | Net Salary | Status | Paid At |
|---|----------|--------|-------------|------------|------------|-------|------------|--------|---------|
| 1 | Budi Santoso | 2026-07 | Rp 15.000.000 | Rp 1.500.000 | Rp 500.000 | Rp 0 | Rp 16.000.000 | PAID | 2026-07-28 |
| 2 | Sari Dewi | 2026-07 | Rp 18.000.000 | Rp 2.000.000 | Rp 600.000 | Rp 1.000.000 | Rp 20.400.000 | PAID | 2026-07-28 |
| 3 | Budi Santoso | 2026-08 | Rp 15.000.000 | Rp 1.500.000 | Rp 500.000 | Rp 0 | Rp 16.000.000 | PENDING | - |
| 4 | Sari Dewi | 2026-08 | Rp 18.000.000 | Rp 2.000.000 | Rp 600.000 | Rp 0 | Rp 19.400.000 | PENDING | - |
| 5 | Budi Santoso | 2026-06 | Rp 12.000.000 | Rp 2.000.000 | Rp 500.000 | Rp 0 | Rp 13.500.000 | PAID | 2026-06-30 |
| 6 | Sari Dewi | 2026-06 | Rp 8.000.000 | Rp 1.500.000 | Rp 400.000 | Rp 0 | Rp 9.100.000 | PAID | 2026-06-30 |

---

## 💳 Billing & Subscription

### Subscription Plans (3 records)

| # | Name | Slug | Price | Billing | Max Users | Max Products | Max Storage |
|---|------|------|-------|---------|:---------:|:------------:|:-----------:|
| 1 | Starter | starter | Rp 299.000/bulan | Monthly | 3 | 50 | 1GB |
| 2 | Growth | growth | Rp 799.000/bulan | Monthly | 10 | 500 | 5GB |
| 3 | Business | business | Rp 1.999.000/bulan | Monthly | 50 | Unlimited | 50GB |

**Plan Features:**

| Plan | Features |
|------|----------|
| Starter | Invoice & Quotation, Basic CRM, Inventory (50 produk), 3 user, Email support |
| Growth | Semua fitur Starter + HR & Payroll, Advanced CRM & Pipeline, 500 produk, 10 user, Priority support, AI Features |
| Business | Semua fitur Growth + Multi-branch, Unlimited produk, 50 user, Dedicated support, API access, Custom reports, Bank reconciliation |

### Tenant Subscription

| Field | Value |
|-------|-------|
| Plan | Growth |
| Status | ACTIVE |
| Start Date | 2026-01-01 |
| End Date | 2026-12-31 |
| Next Billing | 2026-09-01 |
| Payment Method | Manual Transfer |

### Billing Payments (4 records)

| # | Amount | Bank | Account # | Account Name | Status | WA Confirmed | Verified By | Reject Reason |
|---|--------|------|-----------|--------------|--------|:------------:|-------------|---------------|
| 1 | Rp 799.000 | BRI | 1234567890 | Ahmad Suharto | VERIFIED | ✅ | SuperAdmin | - |
| 2 | Rp 799.000 | BCA | 9876543210 | Siti Rahayu | PENDING | ✅ | - | - |
| 3 | Rp 299.000 | Mandiri | 5555666677 | Budi Santoso | REJECTED | - | SuperAdmin | Bukti transfer tidak sesuai |
| 4 | Rp 1.999.000 | BSI | 1112223334 | Dewi Lestari | PENDING | ❌ | - | - |

---

## 🔍 Audit Log (14 records)

| # | User | Action | Entity | Details |
|---|------|--------|--------|---------|
| 1 | SuperAdmin | CREATE | Invoice | Created invoice INV-2026-001 (Rp 8.325.000) |
| 2 | SuperAdmin | UPDATE | Deal | Updated deal stage: PROPOSAL → NEGOTIATION |
| 3 | User Demo | CREATE | Product | Created product Widget A (WDG-001) |
| 4 | SuperAdmin | PAYMENT | Payment | Payment Rp 4.162.500 via BANK_TRANSFER |
| 5 | SuperAdmin | LOGIN | User | Superadmin login |
| 6 | Admin User | CREATE | Invoice | Created invoice INV-2026-001 (Rp 8.325.000) |
| 7 | Admin User | UPDATE | Invoice | Updated invoice status: DRAFT → SENT |
| 8 | Admin User | CREATE | Lead | Created lead PT ABC Technology |
| 9 | Admin User | UPDATE | Deal | Updated deal stage: PROPOSAL → NEGOTIATION |
| 10 | Admin User | CREATE | Product | Created product Widget A (WDG-001) |
| 11 | Admin User | DELETE | StockMovement | Deleted stock adjustment |
| 12 | Member User | CREATE | Contact | Created contact PT Maju Jaya |
| 13 | Member User | UPDATE | Employee | Updated employee position: Junior Engineer → Software Engineer |
| 14 | SuperAdmin | UPDATE | TenantSubscription | Updated status: TRIAL → ACTIVE |

---

## ✅ Checklist: Update Data Demo Saat Ada Fitur Baru

Ketika menambah fitur baru, pastikan:

- [ ] Tambah seed data untuk model baru (jika ada)
- [ ] Tambah/variasi status data untuk testing semua flow
- [ ] Update tabel di DEMO-DATA.md ini
- [ ] Update `DEMO-DATA.md` — tambah section jika ada model baru
- [ ] Test manual: login sebagai SUPERADMIN/ADMIN/MEMBER/VIEWER, cek semua halaman
- [ ] Pastikan dashboard stats menampilkan data yang realistis
- [ ] Pastikan reports bisa generate dengan data yang cukup

### ✅ Mock Data Migration Checklist

- [x] Batch 29 — Settings pages (team, company, notifications, security) migrated to API routes
- [x] Batch 29 — Inventory categories migrated to Prisma queries
- [x] Batch 29 — Added GET endpoint to `/api/settings/security`
- [x] Batch 30 — Finance accounts (CoA) migrated to seed data + API route
- [x] Batch 30 — Finance reconciliation migrated to seed data + API route
- [x] Batch 30 — Created `apps/web/lib/seed-data/coa.ts` (44 accounts)
- [x] Batch 30 — Created `apps/web/lib/seed-data/reconciliation.ts` (bank accounts & transactions)
- [x] Batch 31 — Reports page migrated to aggregate API (9 Prisma models)
- [x] Batch 31 — Created `GET /api/reports` route with 12 report types
- [x] All UI pages now use live data — no hardcoded mock data remaining in components

### 📝 API Routes Summary

| Route | Method | Source | Batch |
|-------|--------|--------|:-----:|
| `/api/settings/team` | GET | Prisma `User` | 29 |
| `/api/settings/company` | GET | Prisma `Tenant` | 29 |
| `/api/settings/notifications` | GET | Seed (JSON) | 29 |
| `/api/settings/security` | GET/POST | Seed (JSON) | 29 |
| `/api/inventory/categories` | GET/POST | Prisma `Category` | 29 |
| `/api/finance/accounts` | GET/POST/PUT/DELETE | Seed [`coa.ts`](apps/web/lib/seed-data/coa.ts) | 30 |
| `/api/finance/reconciliation` | GET/POST | Seed [`reconciliation.ts`](apps/web/lib/seed-data/reconciliation.ts) | 30 |
| `/api/reports` | GET | Prisma aggregate (9 models) | 31 |

### Contoh Update

Jika menambah fitur **Multi-Warehouse**:
1. Tambah model `Warehouse` di schema.prisma
2. Tambah seed data warehouses di seed.ts
3. Update StockMovement untuk referensi warehouse
4. Tambah section "Warehouses" di DEMO-DATA.md
5. Update tabel summary di atas

---

**Last Updated:** August 28, 2026 (Batch 29–31: Mock Data Migration)
**Maintainer:** Qalcuity Team
