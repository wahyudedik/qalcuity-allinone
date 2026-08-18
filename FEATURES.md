# 🚀 Qalcuity All-in-One — Feature Set Lengkap

> **"All-in-One B2B Operating System untuk UKM & Mid-Market Indonesia"**
> Ganti 5–7 tools jadi 1, mobile-first, Coretax-ready, dan AI yang benar-benar kerja.

### 📌 Business Model

> **Qalcuity = Aplikasi + Server + AI built-in.** Developer hanya menyediakan aplikasi SaaS dan server. User menyewa aplikasi, dapat update fitur berkala, dan mengelola integrasi pihak ketiga sendiri (API key mereka sendiri). **Tidak ada biaya integrasi dari sisi Qalcuity** — user yang bayar API WhatsApp, Shopee, Payment Gateway, dll langsung ke provider masing-masing.

### 🖥️ Platform Availability

| Platform | Description | Status |
|----------|-------------|--------|
| **Web App** | Core utama, full feature, admin panel | MVP |
| **Desktop App** | Electron-based, offline capable | Phase 2 |
| **Mobile App** | iOS & Android, field-ready | MVP |

### 💰 Yang Qalcuity Sediakan

| Komponen | Deskripsi | Biaya |
|----------|-----------|-------|
| **Aplikasi** | Web, Desktop, Mobile | Sewa bulanan/tahunan |
| **Server** | Hosting, database, backup | Termasuk dalam sewa |
| **AI Built-in** | AI Agent, NLP, prediction | Termasuk dalam sewa |
| **Update** | Fitur baru, bug fix, security | Termasuk dalam sewa |
| **Integration Dashboard** | Tempat user plug API key sendiri | Termasuk dalam sewa |

### ❌ Yang BUKAN Tanggung Jawab Qalcuity

| Komponen | Siapa yang Bayar |
|----------|-----------------|
| **API WhatsApp Business** | User ke Meta |
| **API Marketplace** (Shopee, Tokopedia) | User ke marketplace |
| **Payment Gateway** (Xendit, Midtrans) | User ke provider |
| **Email Service** (SendGrid, Mailgun) | User ke provider |
| **SMS Gateway** | User ke provider |
| **Google/Microsoft API** | User ke Google/Microsoft |

---

## 📋 Daftar Isi

1. [Core Platform](#1-core-platform-wajib-ada)
2. [Finance & Accounting](#2-finance--accounting)
3. [Sales & CRM](#3-sales--crm)
4. [Inventory & Supply Chain](#4-inventory--supply-chain)
5. [HR & People Ops](#5-hr--people-ops)
6. [Operations & Project](#6-operations--project)
7. [Customer Support & Communication](#7-customer-support--communication)
8. [AI Features](#8-ai-features)
9. [Integration & Ecosystem](#9-integration--ecosystem)
10. [Admin & Security](#10-admin--security)
11. [Pricing Model](#11-pricing-model)

---

## 1. Core Platform (Wajib Ada)

Foundation yang menjadi tulang punggung seluruh modul.

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Unified Dashboard** | Satu tampilan real-time untuk Finance, Sales, Operations, HR, Inventory | ✅ MVP Done |
| **Multi-platform** | Web (core utama), Desktop, Mobile (iOS + Android) | MVP |
| **Multi-entity & Multi-currency** | Support cabang, anak perusahaan, multi-negara dengan base currency | Phase 3 |
| **Role-based Access + Approval Workflow** | Custom approval chain multi-level, delegation, conditional routing | ✅ MVP Done |
| **Audit Trail Lengkap** | Semua aksi tercatat dengan timestamp, user, IP, dan perubahan data | ✅ MVP Done |
| **Dark Mode** | Tema gelap untuk kenyamanan penggunaan malam hari | ✅ MVP Done |
| **Global Search** | Pencarian lintas modul dengan Ctrl+K shortcut | ✅ MVP Done |

### Key Highlights:
- **3 Platform** — Web (core utama), Desktop (Electron), Mobile (iOS & Android)
- **Real-time sync** antara web, desktop, dan mobile
- **Offline-first architecture** — data lokal di-cache, sync saat online
- **Customizable dashboard** — drag & drop widget sesuai kebutuhan user
- **Multi-language support** — Indonesia, English (expandable)

---

## 2. Finance & Accounting

Modul keuangan yang comprehensive dan comply dengan regulasi Indonesia.

### 2.1 Core Accounting
| Fitur | Deskripsi |
|-------|-----------|
| **Chart of Account** | Template CoA industri + custom, multi-level grouping |
| **General Ledger** | Otomatis dari semua transaksi, real-time posting |
| **Journal Entry** | Manual & auto-generated, supporting multi-currency |
| **Trial Balance** | Real-time, drill-down ke detail transaksi |
| **Financial Statements** | Balance Sheet, Income Statement, Cash Flow, Equity Statement |

### 2.2 Accounts Receivable
| Fitur | Deskripsi |
|-------|-----------|
| **Invoice** | Custom template, recurring invoice, batch generation |
| **Quotation** | Convert to invoice, version tracking |
| **Payment Tracking** | Multi-payment method, partial payment, auto-reconciliation |
| **Aging Report** | 30/60/90 day buckets, automated reminder |
| **Credit Limit Management** | Auto-block order jika melebihi limit |

### 2.3 Accounts Payable
| Fitur | Deskripsi |
|-------|-----------|
| **Purchase Order** | Approval workflow, 3-way matching |
| **Bills & Expenses** | Upload receipt, auto-categorize dengan AI |
| **Payment Processing** | Batch payment, scheduled payment |
| **Supplier Management** | Rating, performance tracking, payment terms |

### 2.4 Bank & Cash
| Fitur | Deskripsi |
|-------|-----------|
| **Bank Reconciliation** | Otomatis dengan integrasi bank Indonesia (BCA, BRI, Mandiri, BNI) |
| **Multi-bank Account** | Support unlimited rekening |
| **Petty Cash** | Approval workflow, auto-replenishment |
| **Bank Feed** | Auto-import transaksi dari bank |

### 2.5 Tax Engine
| Fitur | Deskripsi |
|-------|-----------|
| **Coretax-ready** | Siap integrasi dengan sistem pajak terbaru |
| **e-Faktur** | Generate & report Faktur Pajak elektronik |
| **PPh 21** | Kalkulasi otomatis gaji karyawan |
| **PPh 23** | withholding tax untuk service |
| **PPN** |自动 perhitungan PPN masukan & keluaran |
| **Tax Report** | SPT Masa, recap pajak bulanan/tahunan |

### 2.6 Revenue Recognition
| Fitur | Deskripsi |
|-------|-----------|
| **ASC 606 / IFRS 15** | Compliance standar internasional |
| **Subscription Revenue** | Recognition berdasarkan periode |
| **Milestone-based** | Recognition berdasarkan pencapaian project |
| **Multi-element** | Bundle product/service dengan different recognition |

### 2.7 Reporting
| Fitur | Deskripsi |
|-------|-----------|
| **Standard Reports** | 50+ laporan bawaan |
| **Custom Report Builder** | Drag & drop, pivot table, chart |
| **Scheduled Reports** | Auto-send via email |
| **Export** | PDF, Excel, CSV |

### 2.8 Cash Flow Forecasting (AI)
| Fitur | Deskripsi |
|-------|-----------|
| **Prediction** | 30/60/90 hari ke depan |
| **Scenario Analysis** | Best/worst case modeling |
| **Alert** | Prediksi cash shortfall |

---

## 3. Sales & CRM

Pipeline yang powerful dengan AI untuk meningkatkan konversi.

### 3.1 Pipeline Management
| Fitur | Deskripsi |
|-------|-----------|
| **Kanban View** | Drag & drop cards antar stage |
| **List View** | Table dengan sorting & filtering |
| **Multiple Pipelines** | Berbagai jenis penjualan (direct, reseller, enterprise) |
| **Custom Stages** | Flexible sesuai bisnis process |
| **Deal Value Forecasting** | Weighted pipeline berdasarkan probability |

### 3.2 Lead Management
| Fitur | Deskripsi |
|-------|-----------|
| **Lead Capture** | Website form, WhatsApp, marketplace, manual |
| **Lead Scoring** | AI-based scoring berdasarkan engagement |
| **Lead Assignment** | Round-robin, territory-based, manual |
| **Lead Source Tracking** | Attribution multi-touch |

### 3.3 Quote to Order
| Fitur | Deskripsi |
|-------|-----------|
| **Quote Builder** | Custom template, terms & conditions |
| **Approval Workflow** | Discount approval, credit check |
| **Convert to Order** | Seamless, auto-populate data |
| **Convert to Invoice** | Trigger fulfillment process |

### 3.4 Customer 360°
| Fitur | Deskripsi |
|-------|-----------|
| **Unified Profile** | Semua data customer di satu tempat |
| **Transaction History** | Invoice, payment, order history |
| **Interaction Timeline** | Email, chat, call, meeting notes |
| **Segmentation** | RFM analysis, custom segment |

### 3.5 Sales Intelligence (AI)
| Fitur | Deskripsi |
|-------|-----------|
| **Win Probability** | Predict likelihood menang deal |
| **Next Best Action** | Suggest follow-up yang tepat |
| **Sales Forecasting** | Pipeline-based & historical prediction |
| **Competitor Analysis** | Win/loss tracking vs competitor |

### 3.6 Commission Calculator
| Fitur | Deskripsi |
|-------|-----------|
| **Flexible Rules** | Tiered, flat, hybrid |
| **Real-time Calculation** | Live commission preview |
| **Disbursement** | Auto-create payable saat closing |

---

## 4. Inventory & Supply Chain

Real-time visibility dan kontrol penuh atas inventaris.

### 4.1 Stock Management
| Fitur | Deskripsi |
|-------|-----------|
| **Multi-warehouse** | Unlimited lokasi, inter-warehouse transfer |
| **Real-time Stock** | Live update setiap transaksi |
| **Stock Opname** | Physical count dengan variance report |
| **Unit of Measure** | Multi-UoM, conversion rate |

### 4.2 Product Management
| Fitur | Deskripsi |
|-------|-----------|
| **Product Catalog** | Variants, attributes, images |
| **Batch/Lot Tracking** | Expiry date, manufacturing date |
| **Serial Number** | Individual item tracking |
| **Bill of Materials** | Untuk manufacturing/assembly |

### 4.3 Procurement
| Fitur | Deskripsi |
|-------|-----------|
| **Purchase Order** | Auto-generated dari reorder point |
| **Supplier Management** | Performance score, lead time tracking |
| **Goods Receipt** | QC check,GRN process |
| **Supplier Price Monitoring** | Bandingkan harga real-time |

### 4.4 Warehouse Operations
| Fitur | Deskripsi |
|-------|-----------|
| **Putaway Rules** | Auto-assign lokasi penyimpanan |
| **Picking Strategy** | FIFO, FEFO, LIFO |
| **Barcode/QR Scanning** | Mobile scanning untuk receiving, picking, packing |
| **Shipping Integration** | JNE, J&T, SiCepat, Grab Express |

### 4.5 Inventory Intelligence (AI)
| Fitur | Deskripsi |
|-------|-----------|
| **Low-stock Alert** | Predictive notification |
| **Auto-reorder Suggestion** | Based on demand pattern |
| **Demand Forecasting** | Seasonal & trend analysis |
| **Dead Stock Detection** | Identify slow-moving inventory |

---

## 5. HR & People Ops

HR yang efisien dengan automation untuk fokus pada people.

### 5.1 Employee Management
| Fitur | Deskripsi |
|-------|-----------|
| **Employee Database** | Comprehensive profile, documents, history |
| **Digital Onboarding** | Checklist-based, document upload |
| **Org Chart** | Visual hierarchy, reporting line |
| **Employee Self-Service** | Profile update, document request |

### 5.2 Template Builder (Pain Point Solution)

> 🎯 **Fitur unggulan** — Template Builder cerdas untuk HR documents

| Template | Deskripsi |
|----------|-----------|
| **Offer Letter** | Auto-fill dari data kandidat |
| **Kontrak Kerja** | PKWT, PKWTT, dengan auto-renewal reminder |
| **Warning Letter** | Level 1, 2, 3 dengan progressive tracking |
| **Performance Review** | Custom form, rating scale |
| **Termination Letter** | Dengan reason tracking & checklist |
| **Surat Keterangan** | Keterangan kerja, domisili, dll |

**Fitur Template Builder:**
- Visual drag & drop editor
- Variable system ({{employee_name}}, {{start_date}}, dll)
- Conditional content (if level = manager, add section X)
- Version control & audit
- Digital signature integration
- Bulk generate untuk multiple employees

### 5.3 Attendance & Time
| Fitur | Deskripsi |
|-------|-----------|
| **GPS Check-in** | Geofencing untuk area kantor |
| **Face Recognition** | Anti-fake attendance |
| **WhatsApp Check-in** | Via chat command |
| **Flexible Schedule** | Shift, flex time, compressed week |
| **Overtime Management** | Auto-calculate sesuai regulasi |

### 5.4 Leave Management
| Fitur | Deskripsi |
|-------|-----------|
| **Leave Types** | Annual, sick, maternity, unpaid, custom |
| **Approval Workflow** | Multi-level, delegation |
| **Leave Balance** | Real-time tracking |
| **Leave Calendar** | Team availability view |
| **Public Holiday** | Indonesian & custom holidays |

### 5.5 Payroll
| Fitur | Deskripsi |
|-------|-----------|
| **Auto Calculation** | Gaji, tunjangan, potongan |
| **PPh 21** | Perhitungan pajak otomatis |
| **BPJS** | Kesehatan & Ketenagakerjaan |
| **THR** | Tunjangan hari raya calculation |
| **Payroll Report** | Slip gaji, recap, SPT |

### 5.6 Performance & OKR
| Fitur | Deskripsi |
|-------|-----------|
| **OKR Setting** | Company → Team → Individual |
| **Regular Check-in** | 1-on-1 meeting notes |
| **360° Feedback** | Multi-rater assessment |
| **Performance Review** | Periodic, project-based |

---

## 6. Operations & Project

Manage projects dan field operations dengan efisien.

### 6.1 Project Management
| Fitur | Deskripsi |
|-------|-----------|
| **Project Types** | Fixed price, time & material, retainer |
| **Gantt Chart** | Visual timeline, dependencies |
| **Kanban Board** | Task management |
| **Resource Allocation** | Capacity planning |
| **Budget Tracking** | Cost vs revenue monitoring |

### 6.2 Task & Time Tracking
| Fitur | Deskripsi |
|-------|-----------|
| **Task Assignment** | Assignee, deadline, priority |
| **Time Logging** | Manual & timer-based |
| **Timesheet** | Weekly/monthly approval |
| **Productivity Report** | Per person, per project |

### 6.3 Field Service Module

> 🎯 **Fitur khusus** untuk industri lapangan (konstruksi, serviced, maintenance)

| Fitur | Deskripsi |
|-------|-----------|
| **Job Scheduling** | Drag & drop calendar |
| **Technician Assignment** | Based on skill, location, availability |
| **Mobile Checklist** | Custom form, photo upload |
| **Before-After Photos** | Geo-tagged, timestamped |
| **Digital Signature** | Customer sign-off di mobile |
| **Job Status Update** | Real-time ke customer |

### 6.4 Quality & Compliance
| Fitur | Deskripsi |
|-------|-----------|
| **Quality Checklist** | Custom templates per job type |
| **Non-conformance** | Log & track issues |
| **Corrective Action** | CAPA workflow |
| **Compliance Form** | Regulatory checklist |

---

## 7. Customer Support & Communication

Omnichannel support yang terintegrasi.

### 7.1 Omnichannel Inbox
| Channel | Integrasi |
|---------|-----------|
| **Email** | IMAP/SMTP, Gmail, Outlook |
| **WhatsApp Business** | Official API |
| **Instagram** | DM & comment |
| **Live Chat** | Website widget |
| **Facebook** | Messenger |

### 7.2 Ticket Management
| Fitur | Deskripsi |
|-------|-----------|
| **Ticket System** | Auto-create dari channel manapun |
| **Priority & Category** | Custom fields, auto-routing |
| **SLA Tracking** | Response time, resolution time |
| **Escalation** | Auto-escalate jika SLA terancam |
| **Internal Note** | Private note antar agent |

### 7.3 Knowledge Base
| Fitur | Deskripsi |
|-------|-----------|
| **Article Editor** | Rich text, video embed |
| **Categories** | Hierarchical organization |
| **Search** | Full-text search |
| **AI Suggestion** | Auto-suggest article saat agent reply |

### 7.4 AI Chatbot
| Fitur | Deskripsi |
|-------|-----------|
| **Automated Reply** | Jawaban pertanyaan umum |
| **Handoff to Human** | Seamless escalation |
| **Learning** | Improve dari interaction history |
| **Multi-language** | ID & EN |

### 7.5 Customer Portal
| Fitur | Deskripsi |
|-------|-----------|
| **Invoice View** | Download, pay online |
| **Order Status** | Real-time tracking |
| **Support Ticket** | Submit & track |
| **Knowledge Base** | Self-service |

---

## 8. AI Features

AI yang benar-benar useful, bukan gimmick.

### 8.1 AI Agent Capabilities

| Agent | Fungsi |
|-------|--------|
| **Finance Agent** | Auto-generate invoice, detect anomalies, suggest payment |
| **Sales Agent** | Win probability, next best action, follow-up reminder |
| **Inventory Agent** | Stockout prediction, reorder suggestion, dead stock alert |
| **HR Agent** | Contract generation, leave prediction, attrition risk |
| **Support Agent** | Auto-categorize ticket, suggest reply, sentiment analysis |

### 8.2 Natural Language Query

```
Contoh queries:
- "Tampilkan penjualan produk X bulan ini vs bulan lalu"
- "Siapa sales terbaik Q2 2026?"
- "Berapa total outstanding invoice?"
- "Prediksi cash flow 30 hari ke depan"
- "Generate laporan PPh 21 bulan Juni"
```

### 8.3 Smart Document Extraction
| Fitur | Deskripsi |
|-------|-----------|
| **PDF Processing** | Upload PO/Invoice → auto-extract data |
| **OCR** | Scan KTP, NPWP, dokumen lain |
| **Auto-validation** | Check completeness & accuracy |
| **Auto-entry** | Push ke system tanpa manual input |

### 8.4 AI Template Generator
| Fitur | Deskripsi |
|-------|-----------|
| **Contract Generator** | Input requirements → draft kontrak |
| **Job Description** | Generate JD dari role title |
| **Email Template** | Context-aware email draft |
| **Report Summary** | Auto-summarize long reports |

### 8.5 Anomaly Detection
| Fitur | Deskripsi |
|-------|-----------|
| **Fraud Detection** | Unusual transaction pattern |
| **Data Error** | Duplicate, mismatch, outlier |
| **Compliance Alert** | Regulatory deadline reminder |
| **Performance Anomaly** | Revenue drop, cost spike |

---

## 9. Integration Hub (User-Managed)

> **Qalcuity menyediakan API & Webhook. User mengelola integrasi pihak ketiga sendiri melalui dashboard integrasi.**

### 9.1 Integration Dashboard

| Fitur | Deskripsi |
|-------|-----------|
| **Integration Hub** | Dashboard khusus untuk mengelola semua koneksi pihak ketiga |
| **API Key Management** | Generate, rotate, revoke API keys |
| **Connection Status** | Monitor status setiap integrasi |
| **Error Logging** | Log error dan retry mechanism |
| **Sandbox Mode** | Test integrasi sebelum production |

### 9.2 Supported Integration Categories

User dapat mengintegrasikan layanan berikut melalui dashboard:

| Kategori | Contoh Layanan | Integration Method |
|----------|---------------|-------------------|
| **Messaging** | WhatsApp Business, Telegram | API Key + Webhook |
| **Marketplace** | Tokopedia, Shopee, Bukalapak, Lazada | API Key |
| **Payment Gateway** | Xendit, Midtrans, DOKU | API Key |
| **E-wallet** | GoPay, OVO, Dana, ShopeePay | Via Payment Gateway |
| **Banking** | BCA, Mandiri, BRI, BNI | API Key / CSV Import |
| **Productivity** | Google Workspace, Microsoft 365 | OAuth 2.0 |
| **Shipping** | JNE, J&T, SiCepat, Anteraja | API Key |
| **CRM** | Salesforce, HubSpot | API Key |
| **Accounting** | Jurnal.id, Mekari | API Key (migration) |

### 9.3 API & Webhook
| Fitur | Deskripsi |
|-------|-----------|
| **REST API** | Full CRUD operations untuk semua data |
| **GraphQL** | Flexible query (Phase 3) |
| **Webhook** | Event-based notification ke URL user |
| **API Documentation** | Interactive docs dengan sandbox |
| **Rate Limiting** | Configurable per tenant |
| **OAuth 2.0** | Standard authorization flow |

### 9.4 Automation Connectors
| Fitur | Deskripsi |
|-------|-----------|
| **Zapier** | 5000+ app connections via Zapier |
| **Make.com** | Advanced workflow automation |
| **Custom Webhook** | Build own integration |
| **n8n** | Self-hosted automation (open source) |

### 9.5 Import/Export
| Fitur | Deskripsi |
|-------|-----------|
| **Excel/CSV Import** | Bulk data upload dengan validasi |
| **Excel/CSV Export** | Any report or data |
| **Scheduled Export** | Auto-generate & send via email |
| **Data Mapping** | Custom field mapping |
| **Batch Processing** | Import/export ribuan data sekaligus |

### 9.6 Integration Pricing

| Plan | API Calls | Webhooks | Connections |
|------|-----------|----------|-------------|
| **Starter** | 10,000/bulan | 5 | 3 integrations |
| **Growth** | 50,000/bulan | 20 | 10 integrations |
| **Business** | 200,000/bulan | Unlimited | Unlimited |
| **Enterprise** | Unlimited | Unlimited | Unlimited + custom |

---

## 10. Admin & Security

Enterprise-grade security untuk data protection.

### 10.1 Authentication
| Fitur | Deskripsi |
|-------|-----------|
| **SSO** | SAML 2.0, OAuth 2.0 |
| **2FA** | TOTP, SMS, Email |
| **Password Policy** | Configurable rules |
| **Session Management** | Multi-device control |

### 10.2 Access Control
| Fitur | Deskripsi |
|-------|-----------|
| **RBAC** | Role-based, granular permission |
| **IP Whitelisting** | Restrict access by IP |
| **Data-level Security** | Field-level, record-level |
| **Approval Workflow** | Multi-level, conditional |

### 10.3 Data Protection
| Fitur | Deskripsi |
|-------|-----------|
| **Encryption** | AES-256 at rest, TLS 1.3 in transit |
| **Data Residency** | Server Indonesia |
| **Backup** | Daily auto-backup, 30-day retention |
| **Restore Point** | Manual & scheduled |
| **Data Retention** | Configurable policy |

### 10.4 Compliance
| Fitur | Deskripsi |
|-------|-----------|
| **Audit Trail** | Complete activity log |
| **GDPR Ready** | Data export, deletion |
| **Indonesian Regulation** | PDP Law compliance |
| **SOC 2 Type II** | Target Phase 3 |

### 10.5 White-label
| Fitur | Deskripsi |
|-------|-----------|
| **Custom Branding** | Logo, colors, domain |
| **Multi-tenant** | Separate data environment |
| **Reseller Portal** | Manage client accounts |
| **Revenue Share** | Configurable pricing |

---

## 11. Pricing Model

### Tier-based Pricing

| Tier | Target | Harga | Modules |
|------|--------|-------|---------|
| **Starter** | UMKM 1-5 karyawan | Rp 299rb/bulan | Core + Finance + Sales dasar |
| **Growth** | UKM 6-25 karyawan | Rp 799rb/bulan | + Inventory + HR dasar + AI basic |
| **Business** | Mid-market 26-100 | Rp 1.999rb/bulan | + Full modules + Advanced AI |
| **Enterprise** | 100+ karyawan | Custom | + Multi-entity + White-label + Dedicated support |

### Add-on Modules
| Module | Harga |
|--------|-------|
| Field Service | Rp 199rb/bulan |
| Advanced AI Agent | Rp 299rb/bulan |
| White-label | Rp 499rb/bulan |
| Dedicated Support | Rp 399rb/bulan |

### Free Trial
- 14 hari free trial semua fitur
- No credit card required
- Dedicated onboarding support

---

## 📊 Feature Priority Matrix

### MVP (Phase 1 - 2-3 bulan)
- [x] Core Platform (Dashboard, Auth, Audit Trail, Dark Mode, Global Search)
- [x] Finance & Accounting (Invoices, Quotations, Payments, Purchase Orders, Chart of Accounts)
- [x] Sales & CRM (Leads, Contacts, Deals, Pipeline Board/List)
- [x] Inventory (Products, Suppliers, Categories, Stock)
- [x] HR (Employees, Attendance, Leaves, Payroll)
- [x] Settings (Profile, Company, Team, Notifications, Security, Billing)
- [x] i18n Support (Bahasa Indonesia + English)
- [x] Lucide Icons (consistent icon system across all modules)
- [x] Responsive Tables (mobile-friendly column hiding)
- [x] Audit Trail (all mutations logged)
- [x] Deploy Scripts (PM2, health check, configurable port)
- [x] Mobile App (Basic screens)
- [ ] Coretax Integration

### Phase 2 (4-6 bulan)
- [ ] Field Service Module
- [ ] Advanced Reporting (Custom report builder, pivot table)
- [ ] AI Basic Features (NLP query, document extraction)
- [ ] Omnichannel Support
- [ ] Bank Reconciliation (auto)

### Phase 3 (7-12 bulan)
- [ ] Full AI Agent Suite
- [ ] Multi-entity Advanced
- [ ] Marketplace Integration
- [ ] White-label
- [ ] Enterprise Features

---

## 🎯 Pain Points yang Dijawab

| Pain Point | Solution |
|------------|----------|
| **Integrasi buruk** | Open API, native integrations, Zapier/Make |
| **Reporting lemah** | Custom report builder, AI insights |
| **Mobile jelek** | Native mobile-first, offline mode |
| **Data silo** | Unified platform, single source of truth |
| **Compliance** | Audit trail, tax engine, data residency |
| **Support menyebalkan** | Omnichannel, SLA tracking, knowledge base |

---

## 📝 Changelog

### v1.1.0 (August 18, 2026)
- ✅ i18n support: Bahasa Indonesia + English (custom lightweight i18n with React Context)
- ✅ Lucide React icons: consistent icon system across all 40+ UI files
- ✅ Responsive tables: mobile-friendly column hiding (CRM + Finance modules)
- ✅ HR module: full i18n + Lucide (employees, attendance, leaves, payroll)
- ✅ Inventory module: full i18n + Lucide (products, suppliers, categories, stock)
- ✅ Finance module: full i18n + Lucide (invoices, payments, quotations, purchase orders)
- ✅ CRM module: full i18n + Lucide (leads, contacts, deals, pipeline, overview)
- ✅ Settings pages: profile, company, team, notifications, security, billing
- ✅ API routes: DB transactions, validation, audit trail on all mutations
- ✅ Deploy scripts: PM2 health check, configurable port, robust db:push

### v1.0.0 (August 2026)
- Initial feature set documentation
- MVP scope defined
- Pricing model established

---

**Last Updated:** August 18, 2026
**Maintainer:** Qalcuity Product Team
