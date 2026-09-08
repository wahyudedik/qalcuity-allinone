# Qalcuity

> **Qalcuity — Configurable Business Operating System**

Qalcuity adalah platform SaaS ERP multi-tenant yang dirancang untuk membantu berbagai jenis organisasi mengelola operasional bisnis dalam satu ekosistem terintegrasi.

Qalcuity tidak dirancang hanya untuk satu industri. Platform ini menggunakan **configurable core, workflow, permission, policy, dan industry extensions** sehingga dapat disesuaikan dengan kebutuhan berbagai jenis bisnis tanpa membuat codebase yang berbeda untuk setiap industri.

---

## Vision

Membangun platform bisnis yang dapat digunakan oleh berbagai industri dengan sistem yang:

* Terintegrasi
* Modular
* Multi-tenant
* Permission-based
* Configurable
* Workflow-driven
* Auditable
* Secure
* Scalable
* Web dan Mobile ready
* Siap dikembangkan dengan AI

Qalcuity bukan sekadar sistem untuk mencatat transaksi, tetapi sistem yang membantu organisasi **menjalankan, mengontrol, memantau, dan mengaudit proses bisnis**.

---

# Core Principles

### 1. Multi-Tenant by Design

Setiap customer memiliki organization/tenant sendiri dengan isolasi data yang kuat.

```text
Qalcuity
├── Tenant A
├── Tenant B
└── Tenant C
```

Tenant tidak boleh dapat mengakses data tenant lain.

---

### 2. Permission First

Seluruh aktivitas penting dikendalikan oleh permission.

```text
User
 ↓
Membership
 ↓
Role
 ↓
Permission
 ↓
Scope
 ↓
Resource
 ↓
Action
```

Permission berlaku secara konsisten pada:

* Web
* Mobile
* API
* Automation
* AI Agent

UI hanya menyembunyikan action yang tidak tersedia. **Security tetap harus ditegakkan di backend/API.**

---

### 3. Configurable Before Custom

Qalcuity harus mengutamakan konfigurasi daripada hardcoded customization.

Hal yang sebisa mungkin dapat dikonfigurasi:

* Workflow
* Approval
* Permission
* Role
* Field
* Status
* Business Rules
* Policy
* Notification
* SLA
* Locking
* Industry behavior
* Dashboard
* Report

Jika kebutuhan dapat diselesaikan melalui configuration, jangan membuat logic khusus untuk satu customer.

---

### 4. Industry Agnostic

Core Qalcuity tidak boleh bergantung pada satu industri.

Qalcuity dapat dikembangkan untuk:

* Retail
* Wholesale
* Distribution
* Manufacturing
* Construction
* Property
* Logistics
* Transportation
* Food & Beverage
* Hospitality
* Healthcare
* Education
* Automotive
* Professional Services
* Technology
* Agriculture
* dan industri lainnya

Struktur:

```text
Qalcuity Core
      +
Industry Configuration
      +
Industry Extension
```

Industry-specific logic harus ditempatkan pada extension/module yang sesuai dan tidak mengotori core.

---

# Platform Architecture

Qalcuity memiliki dua area utama:

```text
                    QALCUITY
                       │
          ┌────────────┴────────────┐
          │                         │
   PLATFORM CONTROL            CUSTOMER TENANT
        CENTER                       │
          │                          │
   ┌──────┼──────┐             ┌─────┴─────┐
   │      │      │             │           │
Billing Support Monitoring   Users       ERP
   │      │      │             │           │
   └──────┴──────┘           Roles      Modules
                               │
                          Permissions
```

## Qalcuity Platform

Digunakan oleh owner/developer/operator Qalcuity untuk mengelola platform SaaS.

Area utama:

* Platform Dashboard
* Organizations / Tenants
* Subscriptions
* Payments
* Plans
* Entitlements
* Usage
* System Monitoring
* Tenant Health
* Error & Log Center
* Support
* Security
* Audit Logs
* Feature Flags
* Releases
* Integrations
* Internal Users

## Customer Tenant

Digunakan oleh perusahaan/customer.

Area dapat mencakup:

* Dashboard
* Finance
* Accounting
* CRM
* Sales
* Purchasing
* Inventory
* POS
* HR
* Payroll
* Projects
* Support
* Reporting
* Integrations
* Settings

Modul yang tersedia dapat berbeda berdasarkan subscription, entitlement, permission, dan konfigurasi tenant.

---

# Control Engine

Control Engine merupakan salah satu fondasi utama Qalcuity.

```text
                 CONTROL ENGINE
                       │
       ┌───────────────┼────────────────┐
       ↓               ↓                ↓
   Workflow          Policy          Approval
       ↓               ↓                ↓
  Escalation          SLA           Delegation
       ↓               ↓                ↓
 Notification        Locking          Audit
```

Control Engine digunakan oleh berbagai modul untuk mengontrol proses bisnis.

Contoh:

```text
Transaction
 ↓
Submit
 ↓
Approval
 ↓
Posted
 ↓
Completed
 ↓
Locked
```

Jika pekerjaan melewati deadline:

```text
Overdue
 ↓
Notification
 ↓
Escalation
 ↓
Supervisor
 ↓
Manager
 ↓
Director
```

---

# Transaction Locking & Period Closing

Qalcuity mendukung mekanisme penguncian transaksi dan periode.

Lock dapat diterapkan berdasarkan:

* Per transaksi
* Harian
* Bulanan
* Kuartalan
* Tahunan

Contoh:

```text
Invoice
 ↓
Completed
 ↓
Locked
```

Transaksi yang sudah locked tidak boleh diedit atau dihapus secara sembarangan.

Perubahan terhadap transaksi locked menggunakan mekanisme:

```text
Amendment Request
 ↓
Reason
 ↓
Approval
 ↓
Temporary Unlock
 ↓
Change
 ↓
Audit
 ↓
Lock Again
```

Data historis harus tetap dapat ditelusuri.

---

# Workflow & Approval

Workflow Qalcuity harus configurable.

Contoh:

```text
Quotation
 ↓
Approval
 ↓
Sales Order
 ↓
Delivery
 ↓
Invoice
 ↓
Payment
```

Approval dapat berdasarkan:

* Role
* User
* Department
* Branch
* Amount
* Transaction Type
* Project
* Risk
* Business Policy

Contoh:

```text
< Rp5 juta
→ Supervisor

Rp5–50 juta
→ Manager

> Rp50 juta
→ Director
```

---

# Policy Engine

Business rules tidak boleh tersebar sebagai hardcoded condition di berbagai module.

Gunakan policy engine.

Contoh:

```text
WHEN invoice.amount > threshold
THEN require approval
```

Atau:

```text
WHEN period.status = CLOSED
THEN deny edit/delete
```

Policy harus dapat digunakan lintas module.

---

# Permission & Security

Permission harus granular dan dapat diterapkan hingga resource/data scope.

Contoh:

```text
invoice.view
invoice.create
invoice.edit
invoice.delete
invoice.submit
invoice.approve
invoice.lock
invoice.unlock
invoice.adjust
invoice.export
```

Permission dapat dibatasi berdasarkan:

* Organization
* Branch
* Department
* Location
* Resource ownership
* Role
* Scope

Sensitive actions seperti:

* Unlock
* Delete
* Adjustment
* Emergency Access
* Permission changes

harus memiliki kontrol tambahan dan audit trail.

---

# Segregation of Duties

Qalcuity harus mendukung pemisahan kewenangan.

Contoh:

```text
Cashier
✓ Create Sale
✓ Receive Payment
✗ Approve Refund
✗ Change Price

Supervisor
✓ Approve Refund
✓ Override Discount
```

Sistem dapat mendeteksi konflik permission dan memberikan warning kepada administrator.

---

# Audit Trail

Aktivitas penting harus dapat ditelusuri.

Audit mencatat setidaknya:

* Who
* What
* When
* Where/context
* Before value
* After value
* Reason
* Approval
* Request ID

Contoh:

```text
Invoice #INV-001

Created      → Budi
Submitted    → Budi
Approved     → Andi
Posted       → Sinta
Paid         → Finance
Locked       → System
```

Audit log harus menjadi sumber utama untuk investigasi dan compliance.

---

# POS

Qalcuity menyediakan POS sebagai bagian dari ERP ecosystem, bukan aplikasi terpisah.

POS dapat digunakan untuk:

* Retail
* F&B
* Wholesale
* Pharmacy
* Automotive
* dan bisnis dengan transaksi langsung

POS terintegrasi dengan:

```text
POS
 ↓
Inventory
 ↓
Finance
 ↓
Accounting
 ↓
CRM
 ↓
Audit
```

POS harus mendukung konsep seperti:

* Sales
* Returns
* Refunds
* Discount
* Barcode
* Payment
* Cash Drawer
* Cashier
* Shift
* Closing
* Receipt
* Tax
* Audit
* Offline capability

---

# Web & Mobile

Qalcuity menggunakan pendekatan monorepo agar Web dan Mobile tetap berada dalam satu ekosistem pengembangan.

```text
                    Shared Core
                        │
              ┌─────────┴─────────┐
              ↓                   ↓
             Web                Mobile
```

Shared packages dapat digunakan untuk:

* Types
* API contracts
* Validation
* Authentication
* Permission
* UI components
* Configuration
* Utilities
* Localization

Web dan Mobile tidak harus memiliki UI yang identik.

Mobile dapat difokuskan pada aktivitas operasional seperti:

* Approval
* Sales
* Inventory
* Attendance
* Field Service
* Notification
* Barcode / QR
* Camera
* GPS
* Offline workflow

---

# Subscription & Entitlement

Qalcuity adalah SaaS sehingga subscription menjadi bagian dari platform architecture.

Lifecycle dapat berupa:

```text
TRIAL
 ↓
PENDING_PAYMENT
 ↓
ACTIVE
 ↓
PAST_DUE
 ↓
GRACE_PERIOD
 ↓
SUSPENDED
 ↓
CANCELLED / EXPIRED
```

Payment dapat melalui workflow review jika menggunakan pembayaran manual.

```text
Customer
 ↓
Upload Payment Proof
 ↓
Pending Review
 ↓
Billing Admin
 ↓
Approve / Reject
 ↓
Subscription
 ↓
Entitlement
```

Entitlement menentukan fitur dan batas penggunaan customer.

Contoh:

```text
Professional

✓ Finance
✓ CRM
✓ Inventory
✓ POS
✓ 50 Users
✓ 100 GB Storage
✗ Advanced AI
```

---

# Platform Monitoring

Qalcuity Platform harus dapat memonitor tenant tanpa mencampurkan data antar tenant.

Platform Monitoring mencakup:

* System Health
* Tenant Health
* API
* Database
* Queue
* Storage
* Background Jobs
* Error Rate
* Latency
* Integration Health

---

# Error & Log Center

Platform administrator dapat melakukan troubleshooting terhadap error customer melalui centralized monitoring.

Setiap error idealnya memiliki:

```text
tenant_id
organization_id
user_id
request_id
service
module
environment
severity
timestamp
error_code
stack_trace
```

Error sebaiknya dikelompokkan berdasarkan fingerprint/error signature agar satu error yang terjadi ribuan kali tidak menjadi ribuan masalah terpisah.

Contoh:

```text
DatabaseTimeoutException

Occurrences: 1,284
Affected Tenants: 17
First Seen: ...
Last Seen: ...
```

---

# Tenant Health

Setiap tenant dapat memiliki health status:

```text
🟢 Healthy
🟡 Degraded
🔴 Critical
```

Health dapat memperhitungkan:

* API
* Database
* Storage
* Queue
* Error Rate
* Integrations
* Background Jobs

---

# Support & Impersonation

Qalcuity dapat menyediakan support tools untuk membantu customer.

Support dapat melihat konteks:

* Tenant
* User
* Application version
* Recent errors
* Request ID
* Device
* Session information

Impersonation hanya boleh dilakukan melalui mekanisme terkontrol, memiliki alasan, batas waktu, permission khusus, dan audit trail.

---

# Feature Flags

Fitur baru dapat dikontrol menggunakan feature flags.

Contoh:

```text
new_pos
advanced_reporting
ai_finance_agent
```

Feature dapat diaktifkan berdasarkan:

* Platform
* Tenant
* Plan
* User
* Percentage rollout
* Environment

Hal ini memungkinkan staged rollout dan pengujian tanpa langsung mengaktifkan fitur kepada seluruh customer.

---

# Industry Architecture

Industry-specific functionality harus dibangun di atas Qalcuity Core.

```text
                 QALCUITY CORE
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
     Retail       Manufacturing    Services
        │              │              │
       POS         Production       Projects
       Stock          BOM             SLA
       Sales        Work Order       Billing
```

Core capabilities harus dapat digunakan oleh banyak industri.

Industry extensions digunakan jika proses tersebut memang spesifik terhadap industri tertentu.

---

# Monorepo Structure

Struktur repository mengikuti kebutuhan aktual project dan dapat berkembang.

Contoh struktur konseptual:

```text
/
├── apps/
│   ├── web/
│   ├── mobile/
│   └── platform-admin/
│
├── packages/
│   ├── ui/
│   ├── types/
│   ├── api/
│   ├── auth/
│   ├── permissions/
│   ├── validation/
│   ├── config/
│   ├── i18n/
│   └── utils/
│
├── docs/
│
├── FEATURES.md
├── ROADMAP.md
├── AGENT.md
├── CURRENT.md
├── ARCHITECTURE.md
├── DATABASE.md
├── SECURITY.md
└── README.md
```

**Struktur aktual repository selalu menjadi sumber kebenaran teknis.** Struktur di atas adalah arsitektur konseptual dan tidak boleh dianggap sebagai instruksi untuk membuat folder yang belum diperlukan.

---

# Documentation

Dokumentasi utama project:

| File              | Tujuan                               |
| ----------------- | ------------------------------------ |
| `README.md`       | Gambaran umum project                |
| `AGENT.md`        | Aturan dan cara AI/developer bekerja |
| `FEATURES.md`     | Kondisi dan capability fitur         |
| `ROADMAP.md`      | Rencana pengembangan                 |
| `CURRENT.md`      | Kondisi aktual project               |
| `ARCHITECTURE.md` | Arsitektur teknis                    |
| `DATABASE.md`     | Arsitektur dan aturan database       |
| `SECURITY.md`     | Security architecture dan policy     |

Dokumentasi tidak boleh bertentangan dengan kondisi repository.

Jika codebase berbeda dengan dokumentasi, lakukan audit dan perbarui dokumentasi yang relevan.

---

# Development Philosophy

Setiap perubahan harus mengikuti prinsip:

```text
Inspect
 ↓
Understand
 ↓
Plan
 ↓
Implement
 ↓
Validate
 ↓
Test
 ↓
Security Check
 ↓
Regression Check
 ↓
Document
```

### Rules

1. Inspect existing code before creating new code.
2. Reuse existing components and services whenever possible.
3. Avoid unnecessary duplication.
4. Prefer configuration over hardcoded customer-specific logic.
5. Do not bypass permission checks.
6. Do not bypass tenant isolation.
7. Do not directly modify production database structure.
8. Database changes must use proper migrations.
9. Locked transactions must not be modified outside the defined control workflow.
10. Sensitive actions must be auditable.
11. Web, Mobile, API, Automation, and AI must follow the same business rules.
12. Do not implement a feature for only one industry if it can be generalized.
13. Do not add unnecessary dependencies or infrastructure.
14. Preserve backward compatibility whenever reasonably possible.
15. Test existing functionality after significant changes.
16. Update documentation when architecture, features, behavior, or roadmap changes.

---

# AI Development

AI agents working on Qalcuity must read and understand:

```text
AGENT.md
FEATURES.md
ROADMAP.md
CURRENT.md
```

before implementing significant changes.

AI must inspect the existing repository rather than assuming that documentation perfectly represents the current implementation.

When identifying a potential improvement, AI should proactively consider:

* Missing features
* Workflow gaps
* Permission gaps
* Security issues
* UX problems
* Mobile implications
* API inconsistencies
* Navigation gaps
* Data integrity
* Performance
* Accessibility
* Error handling
* Audit requirements
* Industry generalization
* Technical debt

However, suggestions must be evaluated against the actual architecture and product direction before implementation.

---

# Product Direction

Qalcuity aims to evolve toward:

```text
ERP
 +
CRM
 +
POS
 +
HR
 +
Project Management
 +
Workflow
 +
Business Control
 +
Industry Configuration
 +
Analytics
 +
Automation
 +
AI
```

The long-term objective is not simply to maximize the number of modules.

The objective is to create a **coherent business operating platform** where modules share:

* Identity
* Organization
* Permission
* Workflow
* Policy
* Approval
* Notification
* Audit
* Data
* Reporting
* Integration

---

# Status

Qalcuity is an actively developed product.

The implementation status of individual features must be determined from:

* Actual codebase
* `FEATURES.md`
* `CURRENT.md`
* `ROADMAP.md`

Do not assume that a feature described in this README is already implemented.

---

## Source of Truth

For development decisions, use this priority:

```text
Actual Codebase
      ↓
Current Architecture
      ↓
CURRENT.md
      ↓
FEATURES.md
      ↓
ROADMAP.md
      ↓
README.md
```

`README.md` explains the product and architecture at a high level.

Detailed implementation decisions belong in the appropriate technical documentation.
