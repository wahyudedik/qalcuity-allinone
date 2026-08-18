# 🤖 Qalcuity AI Agent — Documentation

> **AI yang benar-benar kerja, bukan gimmick.**
> Setiap modul memiliki AI Agent yang membantu user bekerja lebih cerdas dan efisien.

### 📌 Business Model

> **Qalcuity = Aplikasi + Server + AI built-in.** AI Agent merupakan bagian dari aplikasi, bukan layanan terpisah. User menggunakan AI langsung di platform Qalcuity (Web, Desktop, Mobile). Developer hanya menyediakan aplikasi dan server — **tidak ada biaya integrasi pihak ketiga dari sisi Qalcuity.** User mengelola sendiri integrasi ke WhatsApp, Marketplace, Payment Gateway, dll melalui dashboard integrasi dengan API key mereka sendiri.

### 💰 AI Features — Termasuk dalam Sewa

| Komponen AI | Status |
|-------------|--------|
| **AI Agent** (Finance, Sales, Inventory, HR, Support) | ✅ Built-in |
| **Natural Language Query** | ✅ Built-in |
| **Smart Document Extraction** | ✅ Built-in |
| **AI Template Generator** | ✅ Built-in |
| **Anomaly Detection** | ✅ Built-in |
| **Cash Flow Prediction** | ✅ Built-in |

> Semua AI features di atas sudah termasuk dalam biaya sewa aplikasi. User tidak perlu bayar额外 ke provider AI manapun.

---

## 📋 Daftar Isi

1. [Architecture Overview](#1-architecture-overview)
2. [AI Agent Types](#2-ai-agent-types)
3. [Natural Language Query](#3-natural-language-query)
4. [Smart Document Extraction](#4-smart-document-extraction)
5. [AI Template Generator](#5-ai-template-generator)
6. [Anomaly Detection](#6-anomaly-detection)
7. [AI Integration Points](#7-ai-integration-points)
8. [Data Privacy & Security](#8-data-privacy--security)
9. [Performance & Latency](#9-performance--latency)
10. [Roadmap](#10-roadmap)

---

## 1. Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Web App  │  │ Desktop  │  │ Mobile   │  │ Customer Portal  │   │
│  │  (Core)  │  │ (Electron)│ │(iOS/Andr)│  │                  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
└───────┼──────────────┼──────────────┼─────────────────┼─────────────┘
        │              │              │                 │
        ▼              ▼              ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY                                  │
│                    (Rate Limiting, Auth)                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AI AGENT LAYER                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐      │
│  │  Finance   │ │   Sales    │ │ Inventory  │ │    HR      │      │
│  │   Agent    │ │   Agent    │ │   Agent    │ │   Agent    │      │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                     │
│  │  Support   │ │ Document   │ │  Template  │                     │
│  │   Agent    │ │  Agent     │ │   Agent    │                     │
│  └────────────┘ └────────────┘ └────────────┘                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AI CORE SERVICES                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │   LLM        │ │   ML Engine  │ │   NLP        │               │
│  │  (GPT/Claude)│ │  (Prediction)│ │  (Intent)    │               │
│  └──────────────┘ └──────────────┘ └──────────────┘               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │   OCR        │ │  Embedding   │ │  Vector DB   │               │
│  │  (Document)  │ │  (Semantic)  │ │  (RAG)       │               │
│  └──────────────┘ └──────────────┘ └──────────────┘               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              INTEGRATION DASHBOARD (User-Managed)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │WhatsApp  │ │Marketplace│ │ Payment  │ │ Google   │             │
│  │(user key)│ │(user key) │ │(user key)│ │(user OAuth)│            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │
│    ↕ User plug API key sendiri, bayar ke provider masing-masing ↕  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │  PostgreSQL  │ │    Redis     │ │  S3/MinIO    │               │
│  │  (Primary)   │ │   (Cache)    │ │  (Documents) │               │
│  └──────────────┘ └──────────────┘ └──────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

### Core Components

| Component | Teknologi | Fungsi |
|-----------|-----------|--------|
| **LLM** | GPT-4o / Claude 3.5 | Natural language understanding & generation |
| **ML Engine** | Python (scikit-learn, XGBoost) | Predictions, forecasting, anomaly detection |
| **NLP** | spaCy, custom models | Intent recognition, entity extraction |
| **OCR** | Tesseract, Google Vision | Document scanning & extraction |
| **Embedding** | OpenAI Ada-002 | Semantic search, RAG |
| **Vector DB** | Pinecone / pgvector | Knowledge base, document retrieval |

### Platform Access

| Platform | AI Features | Description |
|----------|-------------|-------------|
| **Web App** | Full | Core utama, semua AI features tersedia |
| **Desktop App** | Full | Offline-capable, full AI features |
| **Mobile App** | Optimized | AI features yang dioptimasi untuk mobile |
| **API** | Programmatic | AI features via REST API |

### Cost Summary

| Component | Provider | Cost |
|-----------|----------|------|
| **Aplikasi (Web/Desktop/Mobile)** | Qalcuity | Sewa bulanan |
| **Server (hosting, DB, backup)** | Qalcuity | Termasuk sewa |
| **AI Features** | Qalcuity | Termasuk sewa |
| **Integrasi pihak ketiga** | User sendiri | User bayar langsung ke provider |

---

## 2. AI Agent Types

### 2.1 Finance Agent 🏦

**Tujuan:** Membantu user dengan tugas-tugas keuangan secara otomatis.

#### Fitur Utama

| Fitur | Deskripsi | Trigger |
|-------|-----------|---------|
| **Auto-Generate Invoice** | Buat invoice dari data transaksi | "Buat invoice untuk PT ABC" |
| **Anomaly Detection** | Deteksi transaksi mencurigakan | Real-time monitoring |
| **Cash Flow Prediction** | Prediksi arus kas 30/60/90 hari | "Prediksi cash flow bulan depan" |
| **Payment Reminder** | Kirim reminder otomatis untuk overdue | Scheduled task |
| **Expense Categorization** | Auto-kategorikan expense dari receipt | Upload receipt |

#### Contoh Interaksi

```
User: "Tampilkan semua invoice overdue lebih dari 30 hari"

Agent: 
📊 Invoice Overdue > 30 hari (12 invoice):

1. PT Maju Jaya - Rp 15.500.000 (45 hari overdue)
2. CV Berkah - Rp 8.250.000 (32 hari overdue)
3. PT Sejahtera - Rp 23.000.000 (67 hari overdue)
...

Total outstanding: Rp 156.750.000

Rekomendasi:
- Kirim reminder email ke 12 customer
- Escalate 3 invoice yang sudah > 60 hari
- Update risk status di CRM

[Kirim Reminder] [Lihat Detail] [Export Report]
```

#### Machine Learning Models

| Model | Fungsi | Training Data |
|-------|--------|---------------|
| **Payment Prediction** | Prediksi kapan customer akan bayar | Historical payment data |
| **Expense Anomaly** | Deteksi pengeluaran tidak normal | Historical expense patterns |
| **Revenue Forecasting** | Prediksi revenue bulanan | Revenue time series |

---

### 2.2 Sales Agent 📈

**Tujuan:** Meningkatkan konversi dan efisiensi sales team.

#### Fitur Utama

| Fitur | Deskripsi | Trigger |
|-------|-----------|---------|
| **Win Probability** | Prediksi peluang menang deal | Setiap perubahan deal stage |
| **Next Best Action** | Sarankan langkah selanjutnya | Opening deal page |
| **Lead Scoring** | Auto-score leads berdasarkan engagement | New lead masuk |
| **Sales Forecasting** | Prediksi revenue dari pipeline | "Forecast penjualan Q3" |
| **Competitor Analysis** | Analisis win/loss vs kompetitor | "Analisis kompetitor" |

#### Contoh Interaksi

```
User: "Siapa yang perlu di-follow up hari ini?"

Agent:
📋 Rekomendasi Follow-up Hari Ini (15 Agustus 2026):

🔴 Urgent (3):
1. PT ABC - Deal Rp 50jt (Stage: Negotiation, 3 hari tanpa kontak)
   → Win probability: 65% | Last activity: 3 hari lalu
   → Action: Telepon decision maker (Pak Budi)

2. CV XYZ - Deal Rp 25jt (Stage: Proposal, 5 hari tanpa kontak)
   → Win probability: 40% | Last activity: 5 hari lalu
   → Action: Kirim follow-up email dengan discount

3. PT DEF - Deal Rp 100jt (Stage: Discovery, 2 hari tanpa kontak)
   → Win probability: 30% | Last activity: 2 hari lalu
   → Action: Jadwalkan demo product

🟡 Medium (5): ...
🟢 Low Priority (7): ...

Total pipeline hari ini: Rp 850.000.000
Target Q3: Rp 2.500.000.000 (Progress: 45%)

[Mulai Follow-up] [Lihat Pipeline] [Update Status]
```

#### Machine Learning Models

| Model | Fungsi | Training Data |
|-------|--------|---------------|
| **Deal Win Predictor** | Prediksi closing probability | Historical deal outcomes |
| **Lead Score** | Prioritaskan leads | Lead attributes + engagement |
| **Churn Predictor** | Deteksi customer yang akan churn | Usage patterns + support tickets |

---

### 2.3 Inventory Agent 📦

**Tujuan:** Optimasi stok dan supply chain.

#### Fitur Utama

| Fitur | Deskripsi | Trigger |
|-------|-----------|---------|
| **Stockout Prediction** | Prediksi kapan stok habis | Real-time monitoring |
| **Auto-reorder Suggestion** | Sarankan reorder berdasarkan demand | Stok menipis |
| **Demand Forecasting** | Prediksi demand mingguan/bulanan | "Forecast demand produk X" |
| **Dead Stock Detection** | Identifikasi produk tidak bergerak | Weekly scan |
| **Price Monitoring** | Bandingkan harga supplier | "Bandingkan harga supplier A vs B" |

#### Contoh Interaksi

```
User: "Bagaimana status stok untuk minggu depan?"

Agent:
📦 Prediksi Stok Minggu Depan (18-24 Agustus 2026):

🔴 Kritis (Perlu reorder SEKARANG):
- SKU-001 (Widget A): Stok 15 unit, prediksi demand 45 unit
  → Akan habis hari ke-3
  → Supplier terbaik: PT ABC (Rp 50.000/unit, lead time 2 hari)
  → [Reorder Sekarang]

- SKU-023 (Part B): Stok 8 unit, prediksi demand 30 unit
  → Akan habis hari ke-2
  → Supplier terbaik: CV XYZ (Rp 125.000/unit, lead time 3 hari)
  → [Reorder Sekarang]

🟡 Perlu Perhatian (5 produk):
- SKU-005 (Component C): Stok 50 unit, prediksi demand 55 unit
  → Akan habis hari ke-6

🟢 Aman (23 produk)

Total reorder needed: Rp 2.750.000
Estimasi waktu sampai: 2-3 hari

[Reorder Semua] [Lihat Detail] [Export PO]
```

#### Machine Learning Models

| Model | Fungsi | Training Data |
|-------|--------|---------------|
| **Demand Predictor** | Prediksi demand harian | Historical sales + seasonality |
| **Lead Time Predictor** | Prediksi waktu pengiriman | Supplier delivery history |
| **Optimal Stock Level** | Hitung reorder point | Demand variability + service level |

---

### 2.4 HR Agent 👥

**Tujuan:** Automasi HR tasks dan document generation.

#### Fitur Utama

| Fitur | Deskripsi | Trigger |
|-------|-----------|---------|
| **Contract Generator** | Generate kontrak kerja dari template | "Buat kontrak untuk karyawan baru" |
| **Leave Prediction** | Prediksi pattern cuti | "Prediksi cuti bulan depan" |
| **Attrition Risk** | Identifikasi karyawan berisiko resign | Monthly analysis |
| **Performance Insight** | Analisis performa tim | "Analisis performa Q2" |
| **Compliance Check** | Cek kelengkapan dokumen | "Cek dokumen karyawan tidak lengkap" |

#### Contoh Interaksi

```
User: "Buatkan offer letter untuk kandidat baru, posisi Software Engineer, gaji 15 juta"

Agent:
📝 Draft Offer Letter:

Kepada: [Nama Kandidat]
Posisi: Software Engineer
Departemen: Engineering
Level: Mid-level

Kompensasi:
- Base Salary: Rp 15.000.000/bulan
- THR: Sesuai peraturan (1 gaji)
- BPJS: Full coverage
- Tunjangan: Transport Rp 500.000, Makan Rp 800.000

Benefit:
- Asuransi kesehatan (keluarga)
- Laptop & equipment
- Training budget Rp 5.000.000/tahun
- 12 hari cuti + cuti nasional

Mulai kerja: [Tanggal]
Lokasi: [Office/Hybrid/Remote]

[Edit] [Approve] [Kirim ke Kandidat]
```

#### Machine Learning Models

| Model | Fungsi | Training Data |
|-------|--------|---------------|
| **Attrition Predictor** | Prediksi karyawan resign | Employee attributes + satisfaction |
| **Performance Predictor** | Prediksi rating performa | Historical performance data |
| **Leave Pattern** | Prediksi pattern cuti | Historical leave data |

---

### 2.5 Support Agent 🎧

**Tujuan:** Meningkatkan efisiensi customer support.

#### Fitur Utama

| Fitur | Deskripsi | Trigger |
|-------|-----------|---------|
| **Auto-Categorize** | Kategorikan tiket otomatis | New ticket masuk |
| **Suggested Reply** | Sarankan balasan berdasarkan konten tiket | Opening tiket |
| **Sentiment Analysis** | Analisis sentimen customer | Real-time |
| **Knowledge Suggestion** | Sarankan artikel dari knowledge base | Agent menulis reply |
| **Escalation Predictor** | Prediksi tiket yang perlu escalation | Pattern detection |

#### Contoh Interaksi

```
User: (Agent melihat tiket baru)
Ticket #1234: "Invoice saya salah, tagihan 2x untuk order yang sama"

Agent:
🤖 Saran Balasan:

Halo [Customer Name],

Terima kasih telah menghubungi kami. Kami mohon maaf atas ketidaknyamanan ini.

Setelah kami cek, memang terdapat duplikasi tagihan untuk order #ORD-2026-1234. 
Kami akan melakukan:
1. Membatalkan tagihan duplikat
2. Memproses refund dalam 3-5 hari kerja
3. Mengirimkan invoice koreksi

Apakah ada yang bisa kami bantu lagi?

Salam,
[Agent Name]

📌 Confidence: 92%
📚 Referensi: KB Article #45 (Duplikasi Tagihan)

[Gunakan Balasan Ini] [Edit] [Balas Manual]
```

#### Machine Learning Models

| Model | Fungsi | Training Data |
|-------|--------|---------------|
| **Ticket Classifier** | Kategorikan tiket | Historical ticket categories |
| **Sentiment Analyzer** | Analisis sentimen | Customer messages |
| **Priority Predictor** | Tentukan prioritas | Ticket attributes + history |

---

### 2.6 Document Agent 📄

**Tujuan:** Ekstraksi dan pemrosesan dokumen.

#### Fitur Utama

| Fitur | Deskripsi | Trigger |
|-------|-----------|---------|
| **PDF Extraction** | Ekstrak data dari PDF | Upload PDF |
| **OCR Processing** | Scan dokumen fisik | Upload foto |
| **Auto-validation** | Validasi kelengkapan data | Setelah extraction |
| **Auto-entry** | Push data ke system | Validation passed |
| **Batch Processing** | Proses multiple dokumen | Upload batch |

#### Contoh Interaksi

```
User: (Upload PO dari customer)

Agent:
📄 Dokumen Terdeteksi: Purchase Order

Ekstraksi Data:
┌─────────────────────────────────────────────┐
│ Customer    : PT Maju Bersama               │
│ PO Number   : PO-2026-0892                  │
│ Date        : 15 Agustus 2026               │
│ Items       :                               │
│   1. Widget A (x50)    @ Rp 100.000        │
│   2. Component B (x20) @ Rp 250.000        │
│   3. Service C (x1)    @ Rp 5.000.000      │
│ Total       : Rp 10.500.000                │
│ Delivery    : 20 Agustus 2026              │
│ Terms       : Net 30                        │
└─────────────────────────────────────────────┘

✅ Validasi:
- Customer exists: PT Maju Bersama ✓
- Price within range: ✓
- Stock available: ✓

[Create Invoice] [Create Sales Order] [Edit] [Reject]
```

#### Machine Learning Models

| Model | Fungsi | Training Data |
|-------|--------|---------------|
| **Document Classifier** | Identifikasi jenis dokumen | Labeled documents |
| **Entity Extractor** | Ekstrak entity dari dokumen | Annotated documents |
| **OCR Accuracy** | Improve OCR accuracy | Training images |

---

### 2.7 Template Agent 📝

**Tujuan:** Generate dokumen HR dan bisnis dari template.

#### Fitur Utama

| Fitur | Deskripsi | Trigger |
|-------|-----------|---------|
| **Contract Generation** | Generate kontrak dari spesifikasi | "Buat kontrak kerja" |
| **JD Generator** | Generate job description | "Buat JD untuk Marketing Manager" |
| **Email Template** | Generate email contextual | "Draft email penawaran" |
| **Report Summary** | Ringkas laporan panjang | "Ringkas laporan Q2" |
| **Custom Template** | Buat template baru | "Buat template surat peringatan" |

#### Contoh Interaksi

```
User: "Buatkan job description untuk posisi Marketing Manager"

Agent:
📝 Job Description - Marketing Manager

PT [Company Name] sedang mencari Marketing Manager yang passionate 
untuk memimpin tim marketing dan mengakselerasi pertumbuhan bisnis.

📋 Tanggung Jawab:
1. Mengembangkan dan menjalankan strategi marketing komprehensif
2. Memimpin tim marketing (5-10 orang)
3. Mengelola budget marketing dan mengoptimalkan ROI
4. Mengembangkan campaign digital marketing
5. Analisis performa dan reporting ke management
6. Kolaborasi dengan sales team untuk lead generation

🎯 Kualifikasi:
- S1 Marketing/Business/Management
- 5+ tahun pengalaman marketing, 2+ tahun di posisi leadership
- Mahir digital marketing (SEO, SEM, Social Media, Email)
- Pengalaman mengelola budget > Rp 500 juta/bulan
- Leadership dan analytical skills yang kuat

💰 Kompensasi:
- Salary range: Rp 20-30 juta/bulan (sesuai pengalaman)
- THR, BPJS, Asuransi
- Performance bonus

📍 Lokasi: [Office/Hybrid]
📅 Mulai: [Tanggal]

[Edit] [Save as Template] [Post to Job Portal]
```

---

## 3. Natural Language Query

### Supported Query Types

| Kategori | Contoh Query |
|----------|--------------|
| **Reporting** | "Tampilkan penjualan bulan ini" |
| **Comparison** | "Bandingkan revenue Q2 vs Q3" |
| **Filtering** | "Invoice overdue lebih dari 30 hari" |
| **Aggregation** | "Total penjualan per produk" |
| **Prediction** | "Prediksi cash flow bulan depan" |
| **Action** | "Buat invoice untuk PT ABC" |
| **Analysis** | "Analisis performa sales team" |

### Query Processing Flow

```
User Query → Intent Recognition → Entity Extraction → Query Building → Execution → Response
     │              │                    │                  │              │            │
     │              ▼                    ▼                  ▼              ▼            ▼
     │         [Intent:          [Entities:          [SQL/API        [Run         [Format
     │          report]           date, filter]       Query]         Query]       Response]
     │
     └──→ Error Handling → "Maaf, saya tidak mengerti. Bisa jelaskan lagi?"
```

### Query Examples

#### Simple Query
```
User: "Berapa total penjualan bulan ini?"

Agent: 
💰 Total Penjualan Agustus 2026: Rp 45.750.000

Breakdown:
- Product Sales: Rp 35.000.000 (76%)
- Service Revenue: Rp 10.750.000 (24%)

Compared to bulan lalu: ↑ 12.5%

[Detail] [Export] [Bandingkan dengan bulan lain]
```

#### Complex Query
```
User: "Tampilkan top 5 produk terlaris di region Jawa Timur, bandingkan dengan bulan lalu"

Agent:
📊 Top 5 Produk - Jawa Timur (Agustus 2026)

| Rank | Produk    | Bulan Ini    | Bulan Lalu  | Change  |
|------|-----------|--------------|-------------|---------|
| 1    | Widget A  | Rp 15.000.000| Rp 12.000.000| ↑ 25%  |
| 2    | Part B    | Rp 12.500.000| Rp 14.000.000| ↓ 10.7%|
| 3    | Service C | Rp 10.000.000| Rp 8.500.000 | ↑ 17.6%|
| 4    | Kit D     | Rp 8.000.000 | Rp 9.200.000 | ↓ 13%  |
| 5    | Module E  | Rp 6.500.000 | Rp 5.000.000 | ↑ 30%  |

Total Top 5: Rp 52.000.000 (↑ 11.3%)

Insight:
- Widget A menunjukkan pertumbuhan signifikan
- Part B perlu investigasi penurunan
- Module E momentum positif, pertimbangkan increased marketing

[Download Chart] [Analisis Lebih Lanjut] [Export Excel]
```

---

## 4. Smart Document Extraction

### Supported Document Types

| Document | Fields Extracted |
|----------|------------------|
| **Purchase Order** | Customer, items, quantities, prices, delivery date |
| **Invoice** | Invoice number, items, amounts, due date |
| **Receipt** | Vendor, items, total, date, payment method |
| **Contract** | Parties, terms, duration, value |
| **KTP** | NIK, nama, tanggal lahir, alamat |
| **NPWP** | Nomor NPWP, nama, alamat |

### Processing Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Upload    │ →  │     OCR     │ →  │   Extract   │ →  │  Validate   │
│   Document  │    │   Process   │    │   Fields    │    │   & Check   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
       │                  ▼                  ▼                  ▼
       │           [Raw Text]        [Structured Data]    [Validation Results]
       │
       └──→ Error: "Format dokumen tidak didukung"
```

### Accuracy Metrics

| Document Type | Accuracy | Notes |
|---------------|----------|-------|
| Purchase Order | 95% | Depends on document quality |
| Invoice | 97% | High accuracy for standard formats |
| Receipt | 92% | Variable due to receipt quality |
| KTP | 98% | Standard format |
| NPWP | 99% | Simple format |

---

## 5. AI Template Generator

### Template Categories

| Category | Templates |
|----------|-----------|
| **HR** | Offer letter, Kontrak, Warning letter, Review, Termination |
| **Finance** | Invoice, Quotation, Purchase Order, Memo |
| **Sales** | Proposal, Follow-up, Thank you, Cold email |
| **Legal** | NDA, Service Agreement, SLA |
| **Marketing** | Newsletter, Campaign, Social media post |

### Generation Process

```
User Request → Parse Requirements → Select Template → Fill Variables → Generate → Review
      │              │                    │                │              │          │
      │              ▼                    ▼                ▼              ▼          ▼
      │         [Extract:          [Match with        [AI fill      [Generate   [User
      │          role, level,       template           missing       document]   approve]
      │          salary, etc]       library]           fields]
```

### Variable System

```javascript
// Template variables
{
  // Employee Data
  "{{employee_name}}": "John Doe",
  "{{employee_position}}": "Software Engineer",
  "{{start_date}}": "2026-09-01",
  
  // Company Data
  "{{company_name}}": "PT Qalcuity",
  "{{company_address}}": "Jakarta, Indonesia",
  
  // Compensation
  "{{base_salary}}": "Rp 15.000.000",
  "{{benefits}}": "BPJS, THR, Asuransi",
  
  // Conditional
  "{{#if is_manager}}": "Section untuk manager",
  "{{#if is_permanent}}": "PKWTT contract"
}
```

---

## 6. Anomaly Detection

### Detection Types

| Type | Description | Example |
|------|-------------|---------|
| **Fraud** | Transaksi mencurigakan | Payment ke rekening baru |
| **Data Error** | Data tidak konsisten | Jumlah tidak match |
| **Compliance** | Pelanggaran regulasi | Invoice tanpa NPWP |
| **Performance** | Deviasi dari normal | Revenue drop 50% |
| **Security** | Aktivitas mencurigakan | Login dari lokasi aneh |

### Alert Levels

| Level | Description | Action |
|-------|-------------|--------|
| 🔴 **Critical** | Immediate action required | Real-time notification + auto-block |
| 🟠 **High** | Needs attention soon | Email + dashboard alert |
| 🟡 **Medium** | Monitor closely | Dashboard alert |
| 🟢 **Low** | Informational | Log only |

### Example Alerts

```
🔴 CRITICAL: Fraud Detection

Transaction #TX-2026-89234 flagged:
- Amount: Rp 50.000.000
- Vendor: PT ABC (New vendor, first transaction)
- Pattern: 3 large payments in 1 hour to different new vendors
- Risk Score: 87/100

Suggested Actions:
1. Block transaction
2. Contact payment approver
3. Review related transactions

[Block] [Approve with Note] [View Details]
```

---

## 7. AI Integration Points

### 7.1 Where AI Appears in the UI

| Location | AI Feature |
|----------|------------|
| **Dashboard** | Insights cards, anomaly alerts |
| **List Views** | Smart filtering, bulk suggestions |
| **Detail Views** | Related data suggestions, predictions |
| **Forms** | Auto-fill, validation |
| **Reports** | Natural language insights |
| **Notifications** | Smart timing, priority |
| **Search** | Natural language search |
| **Chat** | AI assistant sidebar |

### 7.2 AI Actions

| Action | Trigger |
|--------|---------|
| **Auto-complete** | User typing in form |
| **Suggestion** | User pauses > 2 seconds |
| **Alert** | Anomaly detected |
| **Report** | Scheduled or on-demand |
| **Bulk Action** | User selects multiple items |

---

## 8. Data Privacy & Security

### Principles

1. **Data Residency** — All data stored in Indonesia servers
2. **Encryption** — AES-256 at rest, TLS 1.3 in transit
3. **Access Control** — Role-based, principle of least privilege
4. **Audit Trail** — All AI actions logged
5. **No Training on Customer Data** — Customer data never used for model training

### AI-Specific Security

| Measure | Description |
|---------|-------------|
| **API Key Rotation** | Automatic rotation every 90 days |
| **Rate Limiting** | Prevent abuse |
| **Prompt Injection Protection** | Sanitize user inputs |
| **Output Validation** | Check AI responses before display |
| **Human-in-the-Loop** | Critical actions require approval |

### Compliance

| Regulation | Status |
|------------|--------|
| **UU PDP** | ✅ Compliant |
| **GDPR** | ✅ Ready |
| **SOC 2 Type II** | 🎯 Target Q4 2026 |
| **ISO 27001** | 🎯 Target 2027 |

---

## 9. Performance & Latency

### Response Time Targets

| Feature | Target Latency |
|---------|----------------|
| **Simple Query** | < 1 second |
| **Complex Query** | < 3 seconds |
| **Document Extraction** | < 5 seconds |
| **Report Generation** | < 10 seconds |
| **Batch Processing** | < 30 seconds per 100 items |

### Optimization Strategies

1. **Caching** — Cache frequent queries
2. **Pre-computation** — Pre-calculate common metrics
3. **Async Processing** — Background jobs for heavy tasks
4. **Model Optimization** — Fine-tuned smaller models for simple tasks
5. **CDN** — Static assets and templates

### Monitoring

| Metric | Alert Threshold |
|--------|-----------------|
| **Response Time** | > 5 seconds |
| **Error Rate** | > 1% |
| **API Quota** | > 80% usage |
| **Model Drift** | > 5% accuracy drop |

---

## 10. Roadmap

### Phase 1: Foundation (Month 1-3)
- [x] Basic NLP query
- [x] Simple document extraction
- [x] Basic anomaly detection

### Phase 2: Core Agents (Month 4-6)
- [ ] Finance Agent (full)
- [ ] Sales Agent (full)
- [ ] Inventory Agent (full)

### Phase 3: Advanced Features (Month 7-9)
- [ ] HR Agent
- [ ] Support Agent
- [ ] Advanced ML models

### Phase 4: Intelligence (Month 10-12)
- [ ] Full AI Agent suite
- [ ] Predictive analytics
- [ ] Self-learning capabilities

---

## 📊 AI Metrics Dashboard

### Key Metrics to Track

| Metric | Description | Target |
|--------|-------------|--------|
| **Query Success Rate** | % of queries answered correctly | > 90% |
| **User Satisfaction** | Rating of AI responses | > 4.5/5 |
| **Time Saved** | Hours saved per user per week | > 5 hours |
| **Accuracy** | Correct predictions/extractions | > 95% |
| **Adoption Rate** | % of users using AI features | > 60% |

---

## 🤝 Contributing

### Adding New AI Agent

1. Create agent module in `src/ai/agents/`
2. Define agent interface
3. Implement ML models
4. Add API endpoints
5. Integrate with UI
6. Write tests
7. Update documentation

### Model Training Pipeline

```
Data Collection → Preprocessing → Training → Validation → Deployment → Monitoring
       │               │              │           │             │            │
       ▼               ▼              ▼           ▼             ▼            ▼
   [Raw Data]    [Clean Data]    [Model]    [Metrics]    [Production]  [Drift Detection]
```

---

**Last Updated:** August 18, 2026
**Maintainer:** Qalcuity AI Team

### Changelog

| Date | Change | Impact |
|------|--------|--------|
| 2026-08-18 | i18n support (Bahasa Indonesia + English) | AI agent responses can be localized per user preference |
| 2026-08-18 | Lucide icons across all modules | Consistent visual language for AI agent UI components |
| 2026-08-18 | Responsive tables (CRM + Finance) | AI agent dashboards adapt to mobile/tablet/desktop |
| 2026-08-18 | All modules i18n'd (Finance, CRM, HR, Inventory) | AI agents have full localized context for all business data |
| 2026-08-18 | Deploy scripts updated (health check, configurable port) | AI agent uptime monitoring via /api/health endpoint |
| 2026-08-06 | Dashboard stats API connected to real DB queries | AI agents can now access real-time business data |
| 2026-08-06 | Audit trail connected to real AuditLog model | Anomaly detection has real audit data |
| 2026-08-06 | Global search (Ctrl+K) across all modules | AI agents can leverage search context |
| 2026-08-06 | Dark mode support added | Better UX for extended AI agent usage |
| 2026-08-06 | Pipeline stages aligned with DB enum | Sales AI agent can accurately track deal stages |
