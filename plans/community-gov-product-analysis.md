# 🏘️ Analisis Produk, Validasi Pasar & Rekomendasi Arsitektur
## Lini Baru "Community & Public Administration" — RT/RW, Desa, Kelurahan untuk Qalcuity

> **Tanggal:** 10 Oktober 2026
> **Status:** DRAFT untuk review founder — analisis & rencana, BUKAN implementasi
> **Scope:** Audit kecocokan dokumen analisis awal terhadap arsitektur aktual + rekomendasi arsitektur + rencana validasi pasar
> **Hard Rule:** Dokumen ini TIDAK mengubah kode, schema, atau `docs/ARCHITECTURE.md`. Semua rekomendasi schema adalah RENCANA untuk fase implementasi berikutnya.

---

## 📋 Daftar Isi

1. [Audit Kecocokan vs Arsitektur Aktual](#1-audit-kecocokan-vs-arsitektur-aktual)
2. [Ringkasan Eksekutif](#2-ringkasan-eksekutif)
3. [Analisis Produk](#3-analisis-produk)
4. [Validasi Pasar](#4-validasi-pasar)
5. [Rekomendasi Arsitektur](#5-rekomendasi-arsitektur)
6. [Kesimpulan & Keputusan yang Disarankan](#6-kesimpulan--keputusan-yang-disarankan)

---

## 1. Audit Kecocokan vs Arsitektur Aktual

> **Temuan utama:** Dokumen analisis awal (dari AI lain) memakai struktur monorepo USULAN (`packages/auth`, `packages/organizations`, `packages/finance-core`, `packages/community-domain`) yang **TIDAK ADA** di codebase Qalcuity. Rekomendasi arsitektur di dokumen tersebut harus DITOLAK apa adanya dan dipetakan ulang ke mekanisme nyata Qalcuity.

### 1.1 Peta Struktur Monorepo: Usulan Dokumen User vs Aktual Qalcuity

| Usulan di Dokumen User | Ada di Qalcuity? | Pemetaan ke Realitas Aktual |
|---|---|---|
| `packages/auth` | ❌ Tidak ada | Auth di [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts) (NextAuth JWT) + [`apps/web/lib/session.ts`](apps/web/lib/session.ts) + [`apps/web/lib/mobile-auth.ts`](apps/web/lib/mobile-auth.ts) (JWT mobile) — **Do-Not-Touch** |
| `packages/organizations` | ❌ Tidak ada | Multi-org = model `Tenant` + `User.tenantId` di [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma) + isolasi via middleware/API |
| `packages/finance-core` | ❌ Tidak ada | Finance = domain di `apps/web/app/api/finance/` + `apps/web/lib/` (period-closing, lock-policy, auto-journal, dst.) + model Prisma (`Invoice`, `JournalEntry`, `CoAAccount`, dll.) |
| `packages/community-domain` | ❌ Tidak ada | Akan jadi domain module baru di `apps/web/` (routes + lib) + model Prisma baru — **bukan package workspace terpisah** |
| `packages/industry-config` | ✅ Ada | [`packages/industry-config/`](packages/industry-config/src/index.ts) — engine + 11 industry packs |
| `packages/permissions` | ✅ Ada | [`packages/permissions/`](packages/permissions/src/roles.ts) — `can()` engine, 4 system role + model DB `Role` custom |
| `packages/workflow` | ✅ Ada | [`packages/workflow/`](packages/workflow/src/definitions.ts) — state machine + `WorkflowDefinition` model |
| `packages/db` | ✅ Ada | [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma) — 113 model, semua ber-`tenantId` (**READ-ONLY**, Do-Not-Touch) |

> **Koreksi arsitektur:** Qalcuity adalah pnpm workspaces dengan pola **"app-centric domain"** — domain bisnis (finance, CRM, HR, POS) hidup di `apps/web/` (route handlers + lib), BUKAN sebagai package workspace terpisah. Hanya engine fondasi (permissions, workflow, industry-config) dan data layer (db) yang jadi package. Modul community harus mengikuti pola ini.

### 1.2 Tabel Kecocokan 7 Prinsip Teknis (Dokumen User vs Mekanisme Qalcuity Aktual)

| # | Prinsip Teknis (Dokumen User) | Mekanisme Qalcuity yang Sudah Ada (Bukti Nyata) | Status | Gap / Extension yang Diperlukan |
|---|---|---|---|---|
| 1 | **Tenant isolation** — setiap RT/desa = entitas terisolasi | Model `Tenant` + `tenantId` di SEMUA 113 model; middleware RBAC ([`apps/web/middleware.ts`](apps/web/middleware.ts)); 278 entry `route-permissions.ts`; pola `where: { tenantId }` wajib di semua API route | ✅ **SUDAH** | Tidak ada. Reusable langsung untuk isolasi antar-RT/desa (satu RT = satu tenant) |
| 2 | **Role & scope** — ketua/bendahara/sekretaris/warga + hierarki RT-in-RW | 4 system role (SUPERADMIN/ADMIN/MEMBER/VIEWER) via [`packages/permissions/src/roles.ts`](packages/permissions/src/roles.ts); model DB `Role` dengan `permissions Json` + `isSystem=false` → **custom role didukung**; `PermissionEngine.hasPermission()` wildcard | ⚠️ **GAP** | Perlu: (a) preset role community (Ketua/Bendahara/Sekretaris/Warga) sebagai record `Role` seed per tenant; (b) permission baru `community:*`; (c) mekanisme **explicit grant lintas tenant** (pengurus RW akses beberapa tenant RT) |
| 3 | **Financial integrity** — kas iuran warga tidak boleh salah catat | `CoAAccount`, `JournalEntry`+`JournalEntryItem` (double-entry, balanced enforced), [`apps/web/lib/auto-journal.ts`](apps/web/lib/auto-journal.ts), [`apps/web/lib/balance-sync.ts`](apps/web/lib/balance-sync.ts), `ApprovalRequest` + SoD enforcement ([`apps/web/lib/sod-exception.ts`](apps/web/lib/sod-exception.ts)) | ✅ **SUDAH** | Tidak ada untuk lapisan integritas. Pilihan cashbook-vs-COA dibahas di §5.4 |
| 4 | **Period closing** — tutup buku iuran bulanan | `AccountingPeriod` model; [`apps/web/lib/period-closing.ts`](apps/web/lib/period-closing.ts) — pre-close checks (unbalanced journal = BLOCK); [`apps/web/lib/lock-policy.ts`](apps/web/lib/lock-policy.ts) — lock DAY/MONTH/QUARTER/YEAR per-tenant, unlock via approval (UCE-25/26); `LockRecord` model | ✅ **SUDAH** | Tidak ada. Bendahara RT otomatis dapat disiplin tutup buku yang sama dengan ERP |
| 5 | **Privacy by design (UU PDP)** — data NIK/alamat warga sensitif | [`apps/web/lib/encryption.ts`](apps/web/lib/encryption.ts) — AES-256-GCM (saat ini untuk SMTP password, pola reusable); `AuditLog` model (semua mutasi); password policy engine | ⚠️ **PARTIAL** | Perlu: (a) field-level encryption untuk NIK/KTP/telepon warga (generalize `encryption.ts`); (b) kebijakan retensi/hapus data warga (UU PDP); (c) portal warga read-only dengan minimisasi data |
| 6 | **Mobile-first** — bendahara/warga pakai HP | [`apps/mobile/`](apps/mobile/App.tsx) React Native/Expo **BERJALAN**: JWT auth ([`apps/web/lib/mobile-auth.ts`](apps/web/lib/mobile-auth.ts) access 24h + refresh 7d), screens Login/Dashboard/Finance/CRM/HR/Inventory; web responsive dual-layout (mobile cards + desktop tables) | ⚠️ **PARTIAL** | Perlu: screen community (iuran, warga, surat) + portal warga mobile. Fondasi auth & navigasi sudah jalan |
| 7 | **Offline & backup** — laporan iuran saat sinyal buruk | [`apps/web/lib/pos-offline/`](apps/web/lib/pos-offline/index.ts) — **preseden kuat**: IndexedDB + service worker + sync queue (retry exponential backoff, conflict resolution, mutex) di `sync.ts`/`db.ts`/`service-worker.ts`; hook [`use-pos-offline.ts`](apps/web/hooks/use-pos-offline.ts) | ✅ **SUDAH (preseden)** | Pola pos-offline direplikasi untuk mode offline bendahara (catat iuran/pengeluaran → queue → sync). Backup export manual perlu dibuat |

**Skor kesiapan:** 4 prinsip SUDAH (tenant, financial integrity, period closing, offline-preseden), 2 PARTIAL (privacy, mobile), 1 GAP (role community). **Fondasi kuat; gap ada di domain & role, bukan di pondasi finansial.**

### 1.3 Kapasitas Industry Config Engine Saat Ini

Dibaca dari [`types.ts`](packages/industry-config/src/types.ts), [`defaults.ts`](packages/industry-config/src/defaults.ts), dan [`packs/retail.ts`](packages/industry-config/src/packs/retail.ts):

| Kapasitas Engine | Detail | Cukup untuk Community? |
|---|---|---|
| Module toggles | `Record<string, PackModule>` — bebas tambah key (mis. `pos`, `loyalty`) | ✅ Cukup — bisa tambah `iuran`, `surat`, `aset`, `kegiatan` |
| Custom fields per entity | `CustomField` (text/number/date/select/boolean) + model DB `TenantCustomField` | ⚠️ Terbatas — field FLAT, tanpa relasi. Tidak cukup untuk Warga→Keluarga→Rumah→Iuran (butuh relasi relational) |
| Dashboard widgets | `PackDashboardWidget` (id/title/module/size) | ✅ Cukup untuk widget ringkas |
| Workflows | `PackWorkflow` (states/initialState/transitions+roles) + model `WorkflowDefinition` | ✅ Cukup — workflow Surat Pengantar / Pengajuan Bantuan bisa didefinisikan config |
| Approval rules | `ApprovalRule` (entity/action/levels+role) + engine `ApprovalRequest`/`ApprovalLevel` | ✅ Cukup untuk approval pengeluaran kas |
| Document templates | `DocumentTemplate` (name/fields/layout sederhana) | ⚠️ Terbatas — surat pengantar desa butuh layout kop/QR, perlu extension `pdf-generator.ts` |

**Kesimpulan:** Industry pack **cukup untuk konfigurasi** (visibility, field tambahan, workflow, dashboard), tapi **TIDAK cukup untuk domain entity relational** (warga, iuran, surat, aset punya relasi + lifecycle + jejak finansial). Karena itu rekomendasi = **hybrid** (lihat §5.1).

---

## 2. Ringkasan Eksekutif

### Posisi Strategis Qalcuity vs 3 Segmen

| Segmen | Kebutuhan Inti | Kesiapan Qalcuity | Catatan |
|---|---|---|---|
| **RT/RW** | Iuran warga, kas tunai, surat pengantar, data warga, pengumuman | 🟢 **Tinggi** — Invoice/RecurringInvoice/Contact/Expense/period-closing sudah jalan; gap hanya domain warga/iuran | Segmen masuk paling murah & paling aman |
| **Kelurahan** | Data kependudukan, surat domisili/SKTM, kas, laporan kecamatan | 🟡 **Sedang** — butuh modul surat + statistik penduduk; regulasi ringan (tidak wajib Siskeudes) | Konsultasi/komunikasi internal, bukan pengganti SIPD |
| **Desa (pemerintahan resmi)** | Siskeudes-compatible, pelaporan Kemendagri/BPK, APBDes | 🔴 **Rendah** — Siskeudes sudah dominan, migrasi berisiko, format laporan berat | **DEFER** — masuk hanya sebagai pendampingan/pelaporan, bukan pengganti |

### Kesiapan Arsitektur

**Skor: FONDASI KUAT / GAP DOMAIN** — 7 prinsip teknis terpenuhi ≥70% oleh mekanisme nyata (tabel §1.2). Yang belum ada murni **domain entity** (Warga, IuranBill, SuratPengantar) dan **preset role community** — semuanya dapat dibangun di atas fondasi yang sudah teruji (tenant isolation, double-entry, period closing, offline sync). Risiko arsitektur rendah; risiko produk/pasar yang perlu dibuktikan dulu.

### Rekomendasi Keputusan

> **VALIDASI DULU (Fase 0), JANGAN bangun modul penuh sekarang.** Alasan: (1) produk community Qalcuity belum pernah diuji pengguna nyata — asumsi "semua tingkat dalam satu sistem" perlu dibuktikan apakah RT mau naik kelas ke fitur desa; (2) kompetitor (RTRW Online) sudah punya base user besar tapi lemah di integrasi administrasi→keuangan — celah ini hanya valid jika user benar-benar mengelola keuangan di sistem, bukan cash manual; (3) arsitektur tidak mendesak untuk dibangun penuh sebelum ada 3–5 pilot RT yang membayar/menggunakan aktif.

---

## 3. Analisis Produk

### 3.1 Segmentasi 3 Segmen

| Aspek | RT/RW | Kelurahan | Desa |
|---|---|---|---|
| **Pengguna inti** | Ketua RT/RW, bendahara, warga (pembayar iuran) | Lurah, Sekkel, staf kependudukan, bendahara | Kepala desa, Sekdes, bendahara, Kaur keuangan |
| **Jumlah entitas (IDN)** | ~850 ribu RT + ~75 ribu RW | ~4.100 kelurahan | ~75 ribu desa |
| **Kompleksitas data** | Rendah–sedang (ratusan warga/RT) | Sedang–tinggi (ribuan dokumen/bulan) | Tinggi (APBDes, multi-Kaur, pelaporan) |
| **Regulasi** | Tidak ada regulasi negara khusus; adat/ketentuan lingkungan | Permendagri administrasi umum; format surat standar | **Siskeudes (BPKP/Kemendagri)** — pelaporan wajib, format kaku |
| **Sensitivitas** | Sedang (NIK untuk surat pengantar) | Tinggi (data kependudukan) | Sangat tinggi (APBDes, dana desa negara) |
| **Willingness to pay** | Rendah (kas kecil, kebiasaan cash) | Sedang (anggaran operasional) | Rendah–sedang (anggaran desa, proses pengadaan) |

### 3.2 Positioning Qalcuity

> **"Satu platform Community & Public Administration — dari administrasi warga sampai keuangan transparan — untuk RT/RW, kelurahan, dan desa, dikonfigurasi per jenis organisasi."**

Positioning ini selaras dengan: (a) instruksi founder **"semua tingkat dalam satu sistem"**; (b) filosofi **Core + Configuration** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — satu core finance/permission/workflow, dikonfigurasi via industry pack per jenis organisasi; (c) Decision Tree §10 — community = **Industry Module** (pack `community` + domain module), bukan hardcoded `if (industry === 'desa')`.

### 3.3 Diferensiasi vs Kompetitor

| Diferensiator | Qalcuity | RTRW Online / Wargakita / Aplikasi Warga |
|---|---|---|
| **Konsolidasi multi-RT dalam 1 RW** | ✅ Alami — banyak tenant RT di bawah 1 akun pengawas RW (explicit grant, §5.5) | ❌ Umumnya 1 RT per akun; RW harus pindah-pindah |
| **Integritas finansial mewarisi ERP** | ✅ Double-entry `JournalEntry`, `AccountingPeriod` closing, lock policy, SoD approval ([`period-closing.ts`](apps/web/lib/period-closing.ts), [`lock-policy.ts`](apps/web/lib/lock-policy.ts)) | ❌ Buku kas sederhana (income/expense list), tanpa jurnal/period lock |
| **Audit trail & transparansi ke warga** | ✅ `AuditLog` semua mutasi + portal warga read-only + laporan publik | ⚠️ Sebagian; jarang ada audit trail immutable |
| **Integrasi administrasi → keuangan → laporan** | ✅ Satu alur: surat pengantar terbit → tercatat di profil warga; iuran `RecurringInvoice` → `Payment` → jurnal → laporan kas | ❌ Modul terpisah-pisah, ekspor manual |
| **Mobile & offline** | ✅ React Native aktif + pola offline sync ([`pos-offline/sync.ts`](apps/web/lib/pos-offline/sync.ts)) | ⚠️ Web-only atau PWA ringan |
| **Kekurangan Qalcuity** | ❌ Belum ada brand di segmen ini; basis pengguna 0 | ✅ RTRW Online: base user besar, first-mover, harga murah |

### 3.4 Peta 10 Modul Usulan — Dinilai Ulang Terhadap Codebase

Modul usulan dari dokumen awal dinilai ulang dengan Decision Tree §10 (REUSE = model Prisma ada / CONFIG = industry pack + custom field / NEW = model baru / DEFER):

| # | Modul Usulan | Verdict | Mekanisme di Qalcuity |
|---|---|---|---|
| 1 | **Data Warga/Keluarga** | 🆕 **NEW** (model baru) | `CommunityMember`, `CommunityFamily` — `Contact` cukup untuk eksternal, tapi warga punya NIK/RT/rumah/keluarga = relasi; `TenantCustomField` hanya untuk field flat |
| 2 | **Iuran & Keuangan** | ♻️ **REUSE + NEW** | `RecurringInvoice`+`Invoice`+`Payment` untuk tagihan iuran bulanan; NEW `IuranType` (jenis iuran) — atau full reuse tanpa model baru (lihat §5.3 trade-off) |
| 3 | **Pengeluaran Kas & Pengajuan** | ♻️ **REUSE** | `Expense` + `ApprovalRequest` + workflow approval + SoD — engine sudah jalan |
| 4 | **Surat Pengantar (domisili, SKTM, dll.)** | 🆕 **NEW** (model baru) | `SuratPengantar` + extension [`pdf-generator.ts`](apps/web/lib/pdf-generator.ts) (kop surat, nomor urut, QR verifikasi) |
| 5 | **Aset/Inventaris Lingkungan** | ♻️ **REUSE ringan** | `Product`+`StockMovement` dipakai sebagai aset sederhana; atau NEW `CommunityAsset` jika butuh lokasi/kondisi/peminjaman |
| 6 | **Kegiatan & Anggaran Kegiatan** | 🆕 **NEW** (ringan) | `CommunityActivity` + link ke `Expense`; anggaran via `ProjectBudget` pola reuse |
| 7 | **Pengumuman & Notifikasi Warga** | ♻️ **REUSE** | `InAppNotification` + [`notification-pubsub.ts`](apps/web/lib/notification-pubsub.ts) SSE + fitur `WHATSAPP_INTEGRATION` (flag sudah ada, `requiredPlan: growth`) |
| 8 | **Portal Warga (read-only)** | 🆕 **NEW** (UI) | Halaman portal role VIEWER-esque + `PermissionEngine` — backend sudah ada, perlu UI khusus |
| 9 | **Laporan Kas & Transparansi** | ♻️ **REUSE** | `SavedReport` + `formatCurrencyIDR` ([`pdf-generator.ts`](apps/web/lib/pdf-generator.ts)) + laporan period setelah closing |
| 10 | **Statistik/Penduduk Desa** | ⏸️ **DEFER** | Berguna untuk desa/kelurahan fase lanjut; jangan di MVP (kompleks, dekat Siskeudes) |

---

## 4. Validasi Pasar

### 4.1 Rencana Pilot 4 Fase (adaptasi dari dokumen user)

| Fase | Durasi Relatif | Aktivitas | Indikator Keberhasilan (Go/No-Go) |
|---|---|---|---|
| **Fase 0a — Discovery** | Singkat | Wawancara 15–20 bendahara/ketua RT/RW + 5–10 kelurahan; temukan "10 pekerjaan paling menyakitkan" | ≥60% menyebut masalah KONSISTEN (bukan fitur wishlist); minimal 5 organisasi rela coba prototype |
| **Fase 0b — Wizard-of-Oz** | Singkat | Layani 3–5 RT secara manual pakai Qalcuity existing (Invoice/Expense) di-backoffice tanpa UI community | ≥3 RT bertahan memakai ≥4 minggu; iuran tercatat >80% warga |
| **Fase 0c — Concierge MVP** | Sedang | UI minimum (warga + iuran) untuk 3–5 pilot RT | ≥2 RT bayar (paket RT Pro) atau ≥1 RW konsolidasi; NPS pilot ≥8 |
| **Fase 1 — MVP publik** | — | Rilis MVP (lihat §5.6) ke waitlist | 20 tenant community aktif bulanan; retensi 3 bulan ≥50% |

**Template wawancara — 7 pertanyaan kunci:**

1. Berapa jumlah warga yang Anda kelola, dan bagaimana Anda mencatat iuran bulan ini (manual/cash book/spreadsheet/aplikasi)?
2. Ceritakan terakhir kali Anda membuat surat pengantar — berapa lama, formatnya dari mana, siapa yang minta?
3. Saat kas RW/RT besar (ada kegiatan), bagaimana Anda memastikan tidak ada uang yang "hilang"? Siapa yang mengawasi?
4. Apa yang terjadi saat bendahara ganti — bagaimana serah terima keuangan dilakukan?
5. Kalau ada warga ingin melihat laporan kas, apa yang Anda lakukan sekarang?
6. Apakah Anda/siapapun pernah mencoba aplikasi RT (RTRW Online dsb)? Kenapa bertahan/berhenti?
7. Jika ada sistem yang mencatat iuran + terbit surat otomatis + laporan bisa dilihat warga, siapa yang harus menyetujui dan berapa yang wajar dibayar per bulan/tahun?

### 4.2 Pemetaan Kompetitor & Sistem Resmi

| Pemain | Posisi | Kekuatan | Kelemahan | Strategi Qalcuity |
|---|---|---|---|---|
| **RTRW Online** | Leader RT/RW | First-mover, basis user besar, murah | Modul terpisah, keuangan sederhana, lemah di audit trail | **Jangan serang frontally** — unggul di integrasi keuangan+transparansi |
| **Wargakita / Aplikasi Warga** | Challenger | UI modern, pengumuman | Fokus informasi, bukan keuangan akuntabel | Positioning "bukan sekadar pengumuman — sampai ke buku kas" |
| **Siskeudes (BPKP/Kemendagri)** | Monopoli desa resmi | Wajib, format pelaporan resmi | Kaku, lokal/pemerintah-pusat, kompleks | ⛔ **JANGAN positioning pengganti.** Fase desa = **pendampingan/pelaporan** — Qalcuity mencatat operasional, ekspor/pelaporan tetap ke Siskeudes |
| **SIPADES / SIPD** | Sistem pemerintah daerah | Resmi | Terintegrasi ke pusat | Sama — hindari klaim "gantikan"; tawarkan lapisan operasional harian |

> **Risiko regulasi (TINGGI untuk segmen desa):** Klaim positioning sebagai pengganti/pengolah dana desa resmi dapat menyeret Qalcuity ke isu kepatuhan dana desa. Mitigasi: kontrak desa (Fase 3) memuat disclaimer "bukan sistem pelaporan resmi", dan fitur desa difokuskan ke interoperabilitas, bukan substitusi.

### 4.3 Hipotesis Harga

| Paket | Harga (hipotesis) | Isi | Sasaran |
|---|---|---|---|
| **RT Basic** | **Gratis** selamanya | 1 RT, ≤100 warga, iuran manual, laporan kas bulanan, portal warga read-only | Akuisisi & bottom-up (warga nagih ketua) |
| **RT Pro** | Rp30–50 rb/bulan | Semua Basic + surat pengantar otomatis, iuran otomatis (reminder), audit trail, ekspor PDF | Monetisasi RT mandiri |
| **RW Multi-RT** | Rp150–300 rb/bulan | Konsolidasi N RT, laporan gabungan, pengawasan kas lintas RT, approval berlapis | Monetisasi utama — differentiator nyata |
| **Desa/Kelurahan** | **Penawaran khusus** (mulai jt-an/tahun) | Modul surat kependudukan, aset, kegiatan+anggaran, ekspor format pelaporan, onboarding | Fase 3 — setelah validasi, tidak di harga publik |

> Harga diuji di Fase 0a/0c (van Westendorp + willingness-to-pay eksplisit), BUKAN dipatok sekarang.

### 4.4 Risiko Utama & Mitigasi

| # | Risiko | Dampak | Probabilitas | Mitigasi |
|---|---|---|---|---|
| 1 | Bendahara menolak pindah dari cash book | Tinggi | Tinggi | Fase 0b buktikan input ≤3 menit/hari; mode input super-ringkas mobile; offline |
| 2 | RT tidak mau bayar software | Tinggi | Tinggi | Freemium RT Basic; monetisasi dari RW/kelurahan yang beranggaran |
| 3 | RTRW Online bundling/agresif harga | Sedang | Sedang | Diferensiasi keuangan-akuntabel + konsolidasi RW, bukan perang harga |
| 4 | Pelanggaran privasi data warga (UU PDP) | Sangat tinggi | Sedang | Field-level encryption NIK; minimisasi data; retensi; audit; lisensi data-controller di kontrak |
| 5 | Isu regulasi dana desa (Siskeudes) | Sangat tinggi | Rendah (jika DEFER) | Fase 3 only; disclaimer kontrak; positioning pendampingan |
| 6 | Scope creep "semua tingkat sekaligus" | Tinggi | Sedang | RT/RW dulu (Fase 1–2), desa/kelurahan = kajian terpisah (Fase 3) |

---

## 5. Rekomendasi Arsitektur

### 5.1 Pendekatan: Satu Platform, Domain Module Terpisah — Hybrid Pack + Domain

Dua opsi dinilai:

| Opsi | Deskripsi | Nilai | Masalah |
|---|---|---|---|
| **A. Industry pack saja** (`community`/`village`) | Semua fitur via config engine | Konsisten Decision Tree; cepat | Engine hanya flat custom-field — **tidak bisa** merepresentasikan relasi Warga→Keluarga→Rumah→Iuran→Surat; tidak ada tempat hidup untuk API domain |
| **B. Domain module saja** (modul baru murni) | Models + routes baru tanpa pack | Lengkap untuk domain | Melanggar filosofi Core+Configuration — dashboard/workflow/visibility jadi hardcoded; tidak bisa dikonfigurasi per RT vs kelurahan |

> **✅ REKOMENDASI: HYBRID** — **domain module `community` di `apps/web/`** (model Prisma baru + API routes + halaman) yang **dikonfigurasi melalui industry pack `community`** (module toggles, custom fields, dashboard widgets, workflows) dan **dijaga feature flag** `COMMUNITY_MODULE` ([`packages/config/src/features.ts`](packages/config/src/features.ts)) + entitlement plan.
>
> Ini mengikuti Decision Tree §10: entity relational spesifik community → **Industry Module**; yang bisa config (field tambahan, workflow, widget) → **Industry Config**. Nama pack: `community` dengan `baseIndustry: 'general'` + `orgType: RT | RW | KELURAHAN | DESA` untuk variasi level (extension kecil di `IndustryType` atau via `IndustryConfiguration.config`).

### 5.2 Peta Model Data — REUSE vs NEW

**♻️ REUSE langsung (sudah ada, dengan alasannya):**

| Model Prisma | Dipakai sebagai | Alasan reuse |
|---|---|---|
| `Tenant` | Unit RT/RW/desa/kelurahan | Isolasi data natural; `settings Json` untuk konfigurasi community (pola `lock-policy.ts`) |
| `User` + `Role` (DB) | Pengurus + warga akun | Custom role via `Role.permissions Json` — preset Ketua/Bendahara/Sekretaris/Warga |
| `Contact` (+`TenantCustomField`) | Kartu warga minimum | `Contact` sudah punya alamat/telepon/taxId(NIK via custom field); cukup untuk MVP sebelum `CommunityMember` |
| `Invoice`/`InvoiceItem` + `Payment` | Tagihan iuran + pembayaran | Alur tagihan→bayar→status sudah mature (workflow INVOICE juga ada) |
| `RecurringInvoice` | Iuran bulanan otomatis | `frequency MONTHLY`, `dayOfMonth`, `nextRunDate`, cron [`recurring-invoice`](apps/web/app/api/cron/run/route.ts) — persis pola iuran |
| `Expense` + `ApprovalRequest` | Pengeluaran kas + approval | Approval engine + SoD sudah production |
| `JournalEntry`/`Item` + `CoAAccount` | Buku besar kas (opsional, §5.4) | Double-entry & balanced-check sudah ada |
| `AccountingPeriod` + `LockRecord` | Tutup buku iuran bulanan | [`period-closing.ts`](apps/web/lib/period-closing.ts) + [`lock-policy.ts`](apps/web/lib/lock-policy.ts) langsung dipakai |
| `AuditLog` | Jejak audit semua aksi | Wajib untuk transparansi ke warga |
| `InAppNotification` + pubsub | Pengumuman & reminder iuran | [`notification-pubsub.ts`](apps/web/lib/notification-pubsub.ts) SSE real-time |
| `Product`/`StockMovement` | Aset sederhana (opsional) | Cukup untuk aset tanpa lokasi/peminjaman |
| POS offline engine | Mode offline bendahara | [`pos-offline/sync.ts`](apps/web/lib/pos-offline/sync.ts) — replikasi pola queue+retry+conflict |

**🆕 NEW models (rencana — MIGRASI DI FASE IMPLEMENTASI, bukan sekarang):**

| Model Baru | Field Inti | Kapan dibuat | Alternatif Config |
|---|---|---|---|
| `CommunityMember` | name, nikEnc (encrypted), noKK, rumah/alamat, status (AKTIF/PINDAH/MD), contactId link | Fase 1 | `Contact`+custom fields cukup untuk pilot — buktikan dulu sebelum model baru |
| `CommunityOrganization` | name, orgType (RT/RW/KELURAHAN/DESA), code, parentOrgId (hierarki RT-in-RW), wilayah | Fase 2 (multi-RT) | Fase 1 cukup 1 tenant = 1 RT |
| `IuranType` | name, nominal, frequency, akun COA link (opsional) | Fase 1 | Bisa diawali `Tenant.settings.iuranTypes` JSON (pola lockPolicy) — model baru jika skala |
| `SuratPengantar` | nomor urut, tujuan, jenis, memberId, status workflow, pdfUrl, qrToken | Fase 2 | Tidak ada — domain inti |
| `CommunityActivity` | name, tanggal, anggaran, realisasi link Expense | Fase 2 | `Project`+`ProjectBudget` bisa dipakai darurat |
| `CommunityAsset` | name, kategori, kondisi, lokasi, nilai perolehan | Fase 2 (opsional) | `Product` sederhana untuk MVP |

> **Prinsip:** Jangan tambah model sebelum pilot membuktikan `Contact`+custom field+`settings JSON` tidak cukup. Schema.prisma adalah **Do-Not-Touch** — setiap penambahan butuh migration terencana + drift check ([`check-drift.sh`](packages/db/scripts/check-drift.sh), CI Session 70k).

### 5.3 Peta 10 Modul → Mekanisme (Ringkas Teknis)

| Modul | API Routes (baru di `apps/web/app/api/community/…`) | Engine dipakai |
|---|---|---|
| Warga | `GET/POST/PATCH /members` | Encryption (NIK), `AuditLog` |
| Iuran | `POST /iuran/generate` (panggil RecurringInvoice) + `/iuran/payments` | `RecurringInvoice`, `Invoice`, `Payment`, cron |
| Kas keluar | reuse `/api/finance/expenses` + approval | `ApprovalRequest`, SoD |
| Surat | `POST /surat`, `GET /surat/[id]/pdf` | WorkflowEngine (state surat), `pdf-generator.ts` extension |
| Pengumuman | `POST /announcements` → `InAppNotification` | notification-pubsub, WhatsApp flag |
| Laporan | `GET /reports/kas`, `GET /reports/period/[id]` | `SavedReport`, period-closing |
| Portal warga | `GET /portal/...` (read-only) | `PermissionEngine` role Warga |

### 5.4 Alur Finansial Community — Cashbook vs Full COA

| Pendekatan | Deskripsi | Biaya Kompleksitas | Manfaat | Rekomendasi |
|---|---|---|---|---|
| **A. Cashbook-only** | Iuran = `RecurringInvoice`→`Invoice`+`Payment`; keluar = `Expense`; laporan = daftar ± saldo period | Rendah — engine existing, tanpa jurnal | Cukup untuk bendahara nonteknis; cepat launch | ✅ **Default MVP (RT/RW)** |
| **B. Full COA + JournalEntry** | Setiap iuran/pengeluaran auto-post jurnal ([`auto-journal.ts`](apps/web/lib/auto-journal.ts)); COA community preset | Sedang — COA seed + mapping | Audit kuat, siap desa/kelurahan, period closing penuh | ⚙️ **Opsional "Advanced"** untuk kelurahan/desa & RW besar (Fase 2+) |
| **C. Hybrid** | Cashbook default; toggle "Mode Akuntansi" per tenant via `Tenant.settings` → aktifkan auto-jurnal + COA | Sedang | Kedua dunia; selaras filosofi configurability | ✅ **Rekomendasi jangka panjang** |

Period closing & approval **mewarisi engine apa pun pilihannya** — `AccountingPeriod` closing checks dan lock policy bekerja sama untuk cashbook maupun mode akuntansi.

### 5.5 Role & Scope — Pemetaan ke Permission Engine

| Role Community | Basis Qalcuity | Permission Inti |
|---|---|---|
| **Ketua** | Custom `Role` (preset seed per tenant) | `community:*`, `finance:approve`, `reports:*` — approver akhir |
| **Bendahara** | Custom `Role` | `finance:create/edit`, `community:members:edit`, TANPA self-approve (SoD enforcement sudah ada) |
| **Sekretaris** | Custom `Role` | `community:surat:*`, `notification:*`, `finance:view` |
| **Warga** | Custom `Role` atau akun portal read-only | `portal:view` saja — lihat laporan kas & tagihan sendiri |

- **Role baru vs custom role:** Gunakan **custom `Role` record** (model DB sudah mendukung `permissions Json`, `isSystem=false`) dengan preset seed — TIDAK menambah system role baru (menjaga [`roles.ts`](packages/permissions/src/roles.ts) tetap 4 system role).
- **Akses lintas RT (RW):** Mekanisme **explicit tenant grant** — 1 User di-`link` ke banyak `Tenant` (extension: tabel pivot `UserTenantAccess` ATAU duplikasi `User` per tenant dengan note — diputuskan di desain Fase 2; jalur paling aman = user berbeda per RT, diakui via delegation [`apps/web/lib/delegation.ts`](apps/web/lib/delegation.ts) yang sudah ada sebagai preseden).

### 5.6 Privasi, Mobile, Offline

- **Privasi (UU PDP):** (a) NIK/noKK di-encrypt at-rest via generalisasi [`encryption.ts`](apps/web/lib/encryption.ts) (AES-256-GCM sudah jalan); (b) portal warga read-only menampilkan data sendiri saja; (c) fitur ekspor/hapus data warga (right to erasure) di backlog Fase 2; (d) `AuditLog` untuk akses data pribadi.
- **Mobile-first:** Fase 1 memakai web responsive (dual layout pattern); Fase 2 tambah screen RN [`apps/mobile/`](apps/mobile/screens/LoginScreen.tsx) untuk bendahara (input iuran/kas) — auth JWT [`mobile-auth.ts`](apps/web/lib/mobile-auth.ts) sudah siap.
- **Offline:** Replikasi pola [`pos-offline/`](apps/web/lib/pos-offline/index.ts) — module `community-offline`: queue input iuran/pengeluaran di IndexedDB, sync saat online, conflict rule = server-wins untuk pembayaran ganda (idempotency key). Backup: ekspor CSV/PDF kas bulanan (menggunakan [`export.ts`](apps/web/lib/export.ts) + [`pdf-generator.ts`](apps/web/lib/pdf-generator.ts)).

### 5.7 Phased Roadmap (Estimasi Relatif: S/M/L)

| Fase | Scope | Model | Halaman Minimum | Effort |
|---|---|---|---|---|
| **Fase 0 — Validasi** | Wawancara + wizard-of-oz pakai fitur existing; TANPA kode besar | Tanpa perubahan | Tanpa (backoffice manual) | **S** |
| **Fase 1 — MVP RT/RW** | Warga, iuran (RecurringInvoice), kas (Expense+approval), laporan kas, portal read-only, feature flag `COMMUNITY_MODULE`, pack `community` | 0–2 baru (`IuranType` via settings JSON dulu) | Members list+detail, Iuran dashboard, Kas, Reports, Portal | **M** |
| **Fase 2 — Multi-RT/RW + Surat/Aset** | Konsolidasi RW, Surat Pengantar (PDF+QR), Kegiatan, Aset, offline bendahara, mode akuntansi opsional | 3–4 baru (`CommunityOrganization`, `SuratPengantar`, `CommunityActivity`, ±`CommunityAsset`) | RW dashboard, Surat CRUD+preview, Aset | **L** |
| **Fase 3 — Kajian Desa/Kelurahan** | Kajian khusus: interoperabilitas Siskeudes (ekspor/pelaporan), statistik penduduk, kepatuhan — BUKAN pengganti | Kajian dulu, model menyusul | Kajian dulu | **L (setelah kajian)** |

---

## 6. Kesimpulan & Keputusan yang Disarankan

**Kesimpulan:** Fondasi arsitektur Qalcuity (tenant isolation, double-entry finance, period closing & lock policy, approval+SoD, audit trail, offline-sync precedent, mobile app aktif, industry-config engine, custom role) **sangat mendukung** lini Community & Public Administration. Yang belum ada murni **domain entity** (warga, iuran, surat) dan **preset role community** — keduanya dapat dibangun di atas mekanisme nyata tanpa merombak core. Risiko terbesar ada di **produk & pasar** (adopsi bendahara non-teknis, willingness-to-pay), bukan di teknologi — karena itu validasi mendahului pembangunan.

**5 Keputusan yang Disarankan untuk Founder:**

1. **SETUJUI Fase 0 validasi** (wawancara 15–20 pengurus + wizard-of-oz 3–5 RT) sebelum mengalokasikan tim modul penuh — tanpa bukti adopsi, jangan bangun MVP penuh.
2. **ADOPSI arsitektur hybrid**: domain module `community` di `apps/web/` + industry pack `community` + feature flag `COMMUNITY_MODULE` — TIDAK membuat `packages/community-domain` (bertentangan dengan struktur app-centric monorepo).
3. **MULAI dari RT/RW** (Fase 1–2); **DEFER desa resmi/Siskeudes** ke Fase 3 kajian khusus — jangan positioning sebagai pengganti sistem resmi (risiko regulasi tinggi).
4. **Keuangan mulai cashbook-first** (`RecurringInvoice`+`Payment`+`Expense`), toggle "Mode Akuntansi" (full COA/jurnal) sebagai fitur Advanced untuk RW/kelurahan — jangan paksa bendahara RT belajar jurnal.
5. **Custom role community via seed `Role` record** (bukan system role baru) + rencana explicit grant lintas-tenant untuk RW — menolak usulan role hardcoded di engine permissions.

---

> **Dokumen ini:** analisis & rencana sahaja — tidak ada perubahan kode/schema/docs yang dibuat. Langkah implementasi (migration model community, pack `community`, feature flag) adalah fase terpisah dengan approval founder.
