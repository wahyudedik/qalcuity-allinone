# 🚀 Qalcuity All-in-One — Feature Set Lengkap

> **"All-in-One B2B Operating System untuk UKM & Mid-Market Indonesia"**
> Ganti 5–7 tools jadi 1, mobile-first, Coretax-ready, dan AI yang benar-benar kerja.

### 📌 Business Model

> **Qalcuity = Aplikasi + Server + AI built-in.** Developer hanya menyediakan aplikasi SaaS dan server. User menyewa aplikasi, dapat update fitur berkala, dan mengelola integrasi pihak ketiga sendiri (API key mereka sendiri). **Tidak ada biaya integrasi dari sisi Qalcuity** — user yang bayar API WhatsApp, Shopee, Payment Gateway, dll langsung ke provider masing-masing.

### 🖥️ Platform Availability

| Platform | Description | Status |
|----------|-------------|--------|
| **Web App** | Core utama, full feature, admin panel | `production_ready` |
| **Desktop App** | Electron-based, offline capable | `partial` |
| **Mobile App** | iOS & Android, field-ready | `partial` |

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

1. [Core Platform](#1-core-platform)
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

## 1. Core Platform

Foundation yang menjadi tulang punggung seluruh modul.

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Unified Dashboard** | Satu tampilan real-time untuk Finance, Sales, Operations, HR, Inventory | `production_ready` |
| **Multi-platform** | Web (core utama), Desktop, Mobile (iOS + Android) | `partial` |
| **Multi-entity & Multi-currency** | Support cabang, anak perusahaan, multi-negara dengan base currency | `planned` |
| **Role-based Access + Approval Workflow** | Custom approval chain multi-level, delegation, conditional routing | `production_ready` |
| **Audit Trail Lengkap** | Semua aksi tercatat dengan timestamp, user, IP, dan perubahan data | `production_ready` |
| **Dark Mode** | Tema gelap untuk kenyamanan penggunaan malam hari | `production_ready` |
| **Global Search** | Pencarian lintas modul dengan Ctrl+K shortcut | `production_ready` |
| **i18n Support** | Bahasa Indonesia + English, custom lightweight i18n provider, 20+ pages localized | `production_ready` |
| **Responsive Design** | Mobile-first, 44x44px touch targets, responsive tables | `production_ready` |
| **Responsive Tables** | Dual layout (mobile cards + desktop tables) di 17 halaman | `production_ready` |
| **Zod Validation** | 14+ schemas di `validation-schemas.ts`, 19 API routes | `production_ready` |
| **RBAC Defense-in-depth** | 3 lapisan: middleware + API route + UI visibility, 35 API routes + 22 pages | `production_ready` |
| **Lucide Icons** | Consistent icon system across all modules | `production_ready` |
| **Empty States** | All CRUD pages have empty state components | `production_ready` |
| **Toast Notifications** | CRUD operation success/error feedback | `production_ready` |
| **Confirmation Dialogs** | Delete confirmation on 14+ CRUD pages | `production_ready` |
| **Navigation Links** | Cross-entity navigation (e.g., Invoice → Contact) | `production_ready` |
| **Loading States** | 9 loading.tsx files untuk detail pages | `production_ready` |
| **Seed Data** | Comprehensive demo data for all modules | `production_ready` |
| **Deploy Scripts** | PM2 health check, configurable port, robust db:push | `production_ready` |

---

## 2. Finance & Accounting

Modul keuangan yang comprehensive dan comply dengan regulasi Indonesia.

### 2.1 Core Accounting

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Chart of Account** | Template CoA industri + custom, multi-level grouping, full CRUD tree view — **Migrated to Prisma DB** | `production_ready` |
| **General Ledger** | Otomatis dari semua transaksi, real-time posting | `partial` |
| **Journal Entry** | Manual & auto-generated, supporting multi-currency | `partial` |
| **Trial Balance** | Real-time, drill-down ke detail transaksi | `planned` |
| **Financial Statements** | Balance Sheet, Income Statement, Cash Flow, Equity Statement | `planned` |

### 2.2 Accounts Receivable

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Invoice** | Custom template, recurring invoice, batch generation | `production_ready` |
| **Quotation** | Convert to invoice, version tracking | `production_ready` |
| **Payment Tracking** | Multi-payment method, partial payment, auto-reconciliation | `production_ready` |
| **Aging Report** | 30/60/90 day buckets, automated reminder | `partial` |
| **Credit Limit Management** | Auto-block order jika melebihi limit | `planned` |

### 2.3 Accounts Payable

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Purchase Order** | Approval workflow, 3-way matching | `production_ready` |
| **Bills & Expenses** | Upload receipt, auto-categorize dengan AI | `partial` |
| **Payment Processing** | Batch payment, scheduled payment | `partial` |
| **Supplier Management** | Rating, performance tracking, payment terms | `production_ready` |

### 2.4 Bank & Cash

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Bank Reconciliation** | Manual reconciliation page dengan API route — **Migrated to Prisma DB** (CoAAccount + BankTransaction models) | `production_ready` |
| **Multi-bank Account** | Support unlimited rekening | `planned` |
| **Petty Cash** | Approval workflow, auto-replenishment | `planned` |
| **Bank Feed** | Auto-import transaksi dari bank | `planned` |

### 2.5 Tax Engine

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Coretax-ready** | Siap integrasi dengan sistem pajak terbaru | `planned` |
| **e-Faktur** | Generate & report Faktur Pajak elektronik | `planned` |
| **PPh 21** | Kalkulasi otomatis gaji karyawan | `planned` |
| **PPh 23** | Withholding tax untuk service | `planned` |
| **PPN** | Auto perhitungan PPN masukan & keluaran | `planned` |
| **Tax Report** | SPT Masa, recap pajak bulanan/tahunan | `planned` |

### 2.6 Revenue Recognition

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **ASC 606 / IFRS 15** | Compliance standar internasional | `planned` |
| **Subscription Revenue** | Recognition berdasarkan periode | `planned` |
| **Milestone-based** | Recognition berdasarkan pencapaian project | `planned` |
| **Multi-element** | Bundle product/service dengan different recognition | `planned` |

### 2.7 Reporting

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Standard Reports** | 12 report types (Finance, Sales, HR, Inventory) | `production_ready` |
| **Custom Report Builder** | Drag & drop, pivot table, chart | `planned` |
| **Scheduled Reports** | Auto-send via email | `planned` |
| **Export** | CSV, Excel, Print — built-in export utilities | `production_ready` |
| **Chart Components** | Bar, Pie, Line charts — custom implementation | `production_ready` |

### 2.8 Cash Flow Forecasting (AI)

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Prediction** | 30/60/90 hari ke depan | `planned` |
| **Scenario Analysis** | Best/worst case modeling | `planned` |
| **Alert** | Prediksi cash shortfall | `planned` |

---

## 3. Sales & CRM

Pipeline yang powerful dengan AI untuk meningkatkan konversi.

### 3.1 Pipeline Management

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Kanban View** | Drag & drop cards antar stage (6 stages: DISCOVERY → CLOSED_LOST) | `production_ready` |
| **List View** | Table dengan sorting & filtering | `production_ready` |
| **Multiple Pipelines** | Berbagai jenis penjualan (direct, reseller, enterprise) | `planned` |
| **Custom Stages** | 6 stages: DISCOVERY, QUALIFICATION, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST | `production_ready` |
| **Deal Value Forecasting** | Weighted pipeline berdasarkan probability | `partial` |

### 3.2 Lead Management

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Lead Capture** | Website form, WhatsApp, marketplace, manual | `production_ready` |
| **Lead Scoring** | AI-based scoring berdasarkan engagement | `planned` |
| **Lead Assignment** | Round-robin, territory-based, manual | `planned` |
| **Lead Source Tracking** | Attribution multi-touch | `partial` |

### 3.3 Quote to Order

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Quote Builder** | Custom template, terms & conditions | `production_ready` |
| **Approval Workflow** | Discount approval, credit check | `planned` |
| **Convert to Order** | Seamless, auto-populate data | `partial` |
| **Convert to Invoice** | Trigger fulfillment process | `partial` |

### 3.4 Customer 360°

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Unified Profile** | Semua data customer di satu tempat | `production_ready` |
| **Transaction History** | Invoice, payment, order history | `partial` |
| **Interaction Timeline** | Email, chat, call, meeting notes | `planned` |
| **Segmentation** | RFM analysis, custom segment | `planned` |

### 3.5 Sales Intelligence (AI)

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Win Probability** | Predict likelihood menang deal | `planned` |
| **Next Best Action** | Suggest follow-up yang tepat | `planned` |
| **Sales Forecasting** | Pipeline-based & historical prediction | `planned` |
| **Competitor Analysis** | Win/loss tracking vs competitor | `planned` |

### 3.6 Commission Calculator

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Flexible Rules** | Tiered, flat, hybrid | `planned` |
| **Real-time Calculation** | Live commission preview | `planned` |
| **Disbursement** | Auto-create payable saat closing | `planned` |

---

## 4. Inventory & Supply Chain

Real-time visibility dan kontrol penuh atas inventaris.

### 4.1 Stock Management

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Multi-warehouse** | Unlimited lokasi, inter-warehouse transfer | `planned` |
| **Real-time Stock** | Live update setiap transaksi | `production_ready` |
| **Stock Opname** | Physical count dengan variance report | `planned` |
| **Unit of Measure** | Multi-UoM, conversion rate | `planned` |

### 4.2 Product Management

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Product Catalog** | Variants, attributes, images | `production_ready` |
| **Batch/Lot Tracking** | Expiry date, manufacturing date | `planned` |
| **Serial Number** | Individual item tracking | `planned` |
| **Bill of Materials** | Untuk manufacturing/assembly | `planned` |

### 4.3 Procurement

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Purchase Order** | Auto-generated dari reorder point | `production_ready` |
| **Supplier Management** | Performance score, lead time tracking | `production_ready` |
| **Goods Receipt** | QC check, GRN process | `planned` |
| **Supplier Price Monitoring** | Bandingkan harga real-time | `planned` |

### 4.4 Warehouse Operations

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Putaway Rules** | Auto-assign lokasi penyimpanan | `planned` |
| **Picking Strategy** | FIFO, FEFO, LIFO | `planned` |
| **Barcode/QR Scanning** | Mobile scanning untuk receiving, picking, packing | `planned` |
| **Shipping Integration** | JNE, J&T, SiCepat, Grab Express | `planned` |

### 4.5 Inventory Intelligence (AI)

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Low-stock Alert** | Predictive notification | `planned` |
| **Auto-reorder Suggestion** | Based on demand pattern | `planned` |
| **Demand Forecasting** | Seasonal & trend analysis | `planned` |
| **Dead Stock Detection** | Identify slow-moving inventory | `planned` |

---

## 5. HR & People Ops

HR yang efisien dengan automation untuk fokus pada people.

### 5.1 Employee Management

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Employee Database** | Comprehensive profile, documents, history | `production_ready` |
| **Digital Onboarding** | Checklist-based, document upload | `planned` |
| **Org Chart** | Visual hierarchy, reporting line | `planned` |
| **Employee Self-Service** | Profile update, document request | `planned` |

### 5.2 Template Builder (Pain Point Solution)

> 🎯 **Fitur unggulan** — Template Builder cerdas untuk HR documents

| Template | Deskripsi | Status |
|----------|-----------|--------|
| **Offer Letter** | Auto-fill dari data kandidat | `planned` |
| **Kontrak Kerja** | PKWT, PKWTT, dengan auto-renewal reminder | `planned` |
| **Warning Letter** | Level 1, 2, 3 dengan progressive tracking | `planned` |
| **Performance Review** | Custom form, rating scale | `planned` |
| **Termination Letter** | Dengan reason tracking & checklist | `planned` |
| **Surat Keterangan** | Keterangan kerja, domisili, dll | `planned` |

### 5.3 Attendance & Time

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **GPS Check-in** | Geofencing untuk area kantor | `partial` |
| **Face Recognition** | Anti-fake attendance | `planned` |
| **WhatsApp Check-in** | Via chat command | `planned` |
| **Flexible Schedule** | Shift, flex time, compressed week | `planned` |
| **Overtime Management** | Auto-calculate sesuai regulasi | `planned` |

### 5.4 Leave Management

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Leave Types** | Annual, sick, maternity, unpaid, custom | `production_ready` |
| **Approval Workflow** | Multi-level, delegation | `production_ready` |
| **Leave Balance** | Real-time tracking | `partial` |
| **Leave Calendar** | Team availability view | `planned` |
| **Public Holiday** | Indonesian & custom holidays | `planned` |

### 5.5 Payroll

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Auto Calculation** | Gaji, tunjangan, potongan | `production_ready` |
| **PPh 21** | Perhitungan pajak otomatis | `partial` |
| **BPJS** | Kesehatan & Ketenagakerjaan | `partial` |
| **THR** | Tunjangan hari raya calculation | `planned` |
| **Payroll Report** | Slip gaji, recap, SPT | `partial` |

### 5.6 Performance & OKR

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **OKR Setting** | Company → Team → Individual | `planned` |
| **Regular Check-in** | 1-on-1 meeting notes | `planned` |
| **360° Feedback** | Multi-rater assessment | `planned` |
| **Performance Review** | Periodic, project-based | `planned` |

---

## 6. Operations & Project

Manage projects dan field operations dengan efisien.

### 6.1 Project Management

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Project Types** | Fixed price, time & material, retainer | `planned` |
| **Gantt Chart** | Visual timeline, dependencies | `planned` |
| **Kanban Board** | Task management | `planned` |
| **Resource Allocation** | Capacity planning | `planned` |
| **Budget Tracking** | Cost vs revenue monitoring | `planned` |

### 6.2 Task & Time Tracking

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Task Assignment** | Assignee, deadline, priority | `planned` |
| **Time Logging** | Manual & timer-based | `planned` |
| **Timesheet** | Weekly/monthly approval | `planned` |
| **Productivity Report** | Per person, per project | `planned` |

### 6.3 Field Service Module

> 🎯 **Fitur khusus** untuk industri lapangan (konstruksi, serviced, maintenance)

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Job Scheduling** | Drag & drop calendar | `planned` |
| **Technician Assignment** | Based on skill, location, availability | `planned` |
| **Mobile Checklist** | Custom form, photo upload | `planned` |
| **Before-After Photos** | Geo-tagged, timestamped | `planned` |
| **Digital Signature** | Customer sign-off di mobile | `planned` |
| **Job Status Update** | Real-time ke customer | `planned` |

### 6.4 Quality & Compliance

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Quality Checklist** | Custom templates per job type | `planned` |
| **Non-conformance** | Log & track issues | `planned` |
| **Corrective Action** | CAPA workflow | `planned` |
| **Compliance Form** | Regulatory checklist | `planned` |

---

## 7. Customer Support & Communication

Omnichannel support yang terintegrasi.

### 7.1 Omnichannel Inbox

| Channel | Integrasi | Status |
|---------|-----------|--------|
| **Email** | IMAP/SMTP — Real SMTP transport via nodemailer, console fallback | `production_ready` |
| **WhatsApp Business** | Official API | `planned` |
| **Instagram** | DM & comment | `planned` |
| **Live Chat** | Website widget | `planned` |
| **Facebook** | Messenger | `planned` |

### 7.2 Ticket Management

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Ticket System** | Auto-create dari channel manapun | `planned` |
| **Priority & Category** | Custom fields, auto-routing | `planned` |
| **SLA Tracking** | Response time, resolution time | `planned` |
| **Escalation** | Auto-escalate jika SLA terancam | `planned` |
| **Internal Note** | Private note antar agent | `planned` |

### 7.3 Knowledge Base

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Article Editor** | Rich text, video embed | `planned` |
| **Categories** | Hierarchical organization | `planned` |
| **Search** | Full-text search | `planned` |
| **AI Suggestion** | Auto-suggest article saat agent reply | `planned` |

### 7.4 AI Chatbot

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Automated Reply** | Jawaban pertanyaan umum | `planned` |
| **Handoff to Human** | Seamless escalation | `planned` |
| **Learning** | Improve dari interaction history | `planned` |
| **Multi-language** | ID & EN | `planned` |

### 7.5 Customer Portal

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Invoice View** | Download, pay online | `planned` |
| **Order Status** | Real-time tracking | `planned` |
| **Support Ticket** | Submit & track | `planned` |
| **Knowledge Base** | Self-service | `planned` |

---

## 8. AI Features

AI yang benar-benar useful, bukan gimmick. **Semua AI features termasuk dalam biaya sewa — tidak ada biaya tambahan ke provider AI.**

### 8.1 AI Hub & Chat

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **AI Chat** | Floating button chat assistant — OpenAI provider + Mock fallback, API route at `/api/ai/chat` | `production_ready` |
| **AI Hub** | Centralized page `/dashboard/ai` untuk semua AI features | `partial` |
| **AI Insights** | Dashboard cards dengan AI-generated business insights | `partial` |
| **AI Menu** | Sidebar menu AI Features untuk akses cepat | `production_ready` |

### 8.2 AI Agent Capabilities

| Agent | Fungsi | Status |
|-------|--------|--------|
| **Finance Agent** | Auto-generate invoice, detect anomalies, suggest payment | `planned` |
| **Sales Agent** | Win probability, next best action, follow-up reminder | `planned` |
| **Inventory Agent** | Stockout prediction, reorder suggestion, dead stock alert | `planned` |
| **HR Agent** | Contract generation, leave prediction, attrition risk | `planned` |
| **Support Agent** | Auto-categorize ticket, suggest reply, sentiment analysis | `planned` |

### 8.3 Natural Language Query

| Contoh Query | Response | Status |
|--------------|----------|--------|
| "Tampilkan penjualan produk X bulan ini vs bulan lalu" | Tabel perbandingan + chart | `planned` |
| "Siapa sales terbaik Q2 2026?" | Ranked list + metrics | `planned` |
| "Berapa total outstanding invoice?" | Jumlah + aging breakdown | `planned` |
| "Prediksi cash flow 30 hari ke depan" | Line chart + scenario analysis | `planned` |
| "Generate laporan PPh 21 bulan Juni" | Formatted report | `planned` |

### 8.4 Smart Document Extraction

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **PDF Processing** | Upload PO/Invoice → auto-extract data | `planned` |
| **OCR** | Scan KTP, NPWP, dokumen lain | `planned` |
| **Auto-validation** | Check completeness & accuracy | `planned` |
| **Auto-entry** | Push ke system tanpa manual input | `planned` |

### 8.5 AI Template Generator

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Contract Generator** | Input requirements → draft kontrak | `planned` |
| **Job Description** | Generate JD dari role title | `planned` |
| **Email Template** | Context-aware email draft | `planned` |
| **Report Summary** | Auto-summarize long reports | `planned` |

### 8.6 Anomaly Detection

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Fraud Detection** | Unusual transaction pattern | `planned` |
| **Data Error** | Duplicate, mismatch, outlier | `planned` |
| **Compliance Alert** | Regulatory deadline reminder | `planned` |
| **Performance Anomaly** | Revenue drop, cost spike | `planned` |

---

## 9. Integration Hub (User-Managed)

> **Qalcuity menyediakan API & Webhook. User mengelola integrasi pihak ketiga sendiri melalui dashboard integrasi.**

### 9.1 Integration Dashboard

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Integration Hub** | Dashboard khusus untuk mengelola semua koneksi pihak ketiga | `production_ready` |
| **Payment Gateway Config** | Midtrans & Xendit configuration di `/settings/integrations` | `production_ready` |
| **Email/SMTP Config** | SMTP configuration — Real nodemailer transport, env-based config (SMTP_HOST, SMTP_PORT, etc.) | `production_ready` |
| **API Key Management** | Generate, rotate, revoke API keys | `planned` |
| **Connection Status** | Monitor status setiap integrasi | `planned` |
| **Error Logging** | Log error dan retry mechanism | `planned` |
| **Sandbox Mode** | Test integrasi sebelum production | `planned` |

### 9.2 Supported Integration Categories

| Kategori | Contoh Layanan | Integration Method | Status |
|----------|---------------|-------------------|--------|
| **Messaging** | WhatsApp Business, Telegram | API Key + Webhook | `planned` |
| **Marketplace** | Tokopedia, Shopee, Bukalapak, Lazada | API Key | `planned` |
| **Payment Gateway** | Xendit, Midtrans, DOKU | API Key | `partial` |
| **E-wallet** | GoPay, OVO, Dana, ShopeePay | Via Payment Gateway | `planned` |
| **Banking** | BCA, Mandiri, BRI, BNI | API Key / CSV Import | `planned` |
| **Productivity** | Google Workspace, Microsoft 365 | OAuth 2.0 | `planned` |
| **Shipping** | JNE, J&T, SiCepat, Anteraja | API Key | `planned` |
| **CRM** | Salesforce, HubSpot | API Key | `planned` |
| **Accounting** | Jurnal.id, Mekari | API Key (migration) | `planned` |

### 9.3 API & Webhook

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **REST API** | Full CRUD operations untuk semua data | `partial` |
| **GraphQL** | Flexible query | `planned` |
| **Webhook** | Event-based notification ke URL user | `planned` |
| **API Documentation** | Interactive docs dengan sandbox | `planned` |
| **Rate Limiting** | Configurable per tenant | `partial` |
| **OAuth 2.0** | Standard authorization flow | `planned` |

### 9.4 Automation Connectors

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Zapier** | 5000+ app connections via Zapier | `planned` |
| **Make.com** | Advanced workflow automation | `planned` |
| **Custom Webhook** | Build own integration | `planned` |
| **n8n** | Self-hosted automation (open source) | `planned` |

### 9.5 Import/Export

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Excel/CSV Import** | Bulk data upload dengan validasi | `partial` |
| **Excel/CSV Export** | Any report or data | `production_ready` |
| **Scheduled Export** | Auto-generate & send via email | `planned` |
| **Data Mapping** | Custom field mapping | `planned` |
| **Batch Processing** | Import/export ribuan data sekaligus | `planned` |

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

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **NextAuth JWT** | CredentialsProvider with JWT strategy | `production_ready` |
| **SSO** | SAML 2.0, OAuth 2.0 | `planned` |
| **2FA** | TOTP, SMS, Email | `planned` |
| **Password Policy** | Configurable rules | `partial` |
| **Session Management** | Multi-device control | `partial` |

### 10.2 Access Control

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **RBAC** | 4 roles: SUPERADMIN, ADMIN, MEMBER, VIEWER + defense-in-depth (middleware + API + UI) | `production_ready` |
| **IP Whitelisting** | Restrict access by IP | `planned` |
| **Data-level Security** | Field-level, record-level | `planned` |
| **Approval Workflow** | Multi-level, conditional | `partial` |

### 10.3 Data Protection

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Encryption** | AES-256 at rest, TLS 1.3 in transit | `planned` |
| **Data Residency** | Server Indonesia | `planned` |
| **Backup** | Daily auto-backup, 30-day retention | `planned` |
| **Restore Point** | Manual & scheduled | `planned` |
| **Data Retention** | Configurable policy | `planned` |

### 10.4 Compliance

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Audit Trail** | Complete activity log, 77 audit calls across 10 mutation endpoints | `production_ready` |
| **GDPR Ready** | Data export, deletion | `planned` |
| **Indonesian Regulation** | PDP Law compliance | `planned` |
| **SOC 2 Type II** | Target Phase 3 | `planned` |

### 10.5 White-label

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Custom Branding** | Logo, colors, domain | `planned` |
| **Multi-tenant** | Separate data environment | `production_ready` |
| **Reseller Portal** | Manage client accounts | `planned` |
| **Revenue Share** | Configurable pricing | `planned` |

---

## 11. Pricing Model

### Tier-based Pricing

| Tier | Target | Harga | Status |
|------|--------|-------|--------|
| **Starter** | UMKM 1-5 karyawan | Rp 299rb/bulan | `production_ready` |
| **Growth** | UKM 6-25 karyawan | Rp 799rb/bulan | `production_ready` |
| **Business** | Mid-market 26-100 | Rp 1.999rb/bulan | `production_ready` |
| **Enterprise** | 100+ karyawan | Custom | `planned` |

### Add-on Modules

| Module | Harga | Status |
|--------|-------|--------|
| Field Service | Rp 199rb/bulan | `planned` |
| Advanced AI Agent | Rp 299rb/bulan | `planned` |
| White-label | Rp 499rb/bulan | `planned` |
| Dedicated Support | Rp 399rb/bulan | `planned` |

### Billing & Subscription Management

| Feature | Status | Location |
|---------|--------|----------|
| **Plan Selection** | `production_ready` | `/dashboard/settings/billing` — 3 paket |
| **Manual Transfer Payment** | `production_ready` | Upload bukti transfer, 4 rekening bank |
| **WhatsApp Confirmation** | `production_ready` | Link wa.me untuk konfirmasi |
| **Superadmin Approval** | `production_ready` | `/dashboard/billing` — Approve/Reject |
| **Notification Bell** | `production_ready` | Header bell icon dengan badge count |
| **Email Notification** | `production_ready` | Auto-email ke info@qalcuity.com |
| **Payment History** | `production_ready` | Tabel riwayat pembayaran |
| **Subscription Status** | `production_ready` | Status badge: ACTIVE, TRIAL, PENDING, SUSPENDED |

### Free Trial

- 14 hari free trial semua fitur
- No credit card required
- Dedicated onboarding support

---

## 📊 Feature Status Legend

| Status | Description |
|--------|-------------|
| `planned` | Fitur belum dikerjakan, baru direncanakan |
| `in_progress` | Sedang dalam pengembangan aktif |
| `partial` | Sebagian fitur sudah diimplementasi |
| `implemented` | Sudah diimplementasi, belum diuji menyeluruh |
| `verified` | Sudah diuji dan berfungsi sesuai期望 |
| `production_ready` | Siap production, sudah diuji dan stabil |
| `blocked` | Terhambat oleh dependency atau issue |
| `deprecated` | Tidak lagi digunakan, akan dihapus |

---

## 📝 Changelog

### v2.2.0 (August 29, 2026) — Quality & Security Hardening
- **Zod Validation** — 14+ schemas, 19 API routes validated
- **Audit Logging** — 77 audit calls across 10 mutation endpoints
- **RBAC Defense-in-depth** — 3 layers: middleware + API route + UI visibility (35 routes + 22 pages)
- **Responsive Tables** — Dual layout (mobile cards + desktop tables) on 17 pages
- **i18n Expansion** — 20+ pages localized, 200+ new keys for reports
- **Settings Pages** — 6 settings pages completed with full i18n
- **Detail Pages** — 9 loading.tsx files, delete functionality on 6 detail pages
- **Pipeline Fix** — Stage name mismatch fixed, CLOSED_WON/LOST stages added
- **Sidebar Fix** — Navigation reorder, billing path fix

### v2.1.0 (August 28, 2026) — Architecture Brief Compliance
- Restructured all features with explicit `status` field format
- Added 11 feature categories with comprehensive status tracking
- Updated status values based on current implementation reality

### v2.0.0 (August 28, 2026) — Batch 14-26
- Role Superadmin, Advanced Reporting, Payment Gateway, Email, File Upload
- Reconciliation, Desktop App, Billing & Subscription, AI Features

### v1.2.0 (August 28, 2026)
- Chart of Accounts (Full CRUD Tree View), Empty States, Toast Notifications
- Confirmation Dialogs, Mobile Responsive, Navigation Links, Seed Data

### v1.1.0 (August 18, 2026)
- i18n support, Lucide icons, Responsive tables, All modules i18n'd

### v1.0.0 (August 2026)
- Initial feature set documentation, MVP scope defined, Pricing model established

---

**Last Updated:** August 29, 2026
**Maintainer:** Qalcuity Product Team
