/**
 * CRM Demo Seed Module — Shared dataset source untuk SEMUA loader CRM (C1–C2).
 *
 * Digunakan OLEH KEDUA loader sehingga menghasilkan data IDENTIK:
 *  - packages/db/prisma/seed.ts  → import { seedCrmData } from "../../../apps/web/lib/seed-data/crm"
 *  - apps/web/lib/seed-data/demo.ts → import { seedCrmData } from "./crm"
 *
 * Cakupan (plans/demo-data-enhancement.md §6.2 C1 + C2):
 *  C1. Unifikasi dataset  — Category 9, Supplier 9, Contact 23, Lead 14, Deal 14
 *                           (SATU sumber untuk seed.ts & loadDemoData — hapus duplikasi)
 *  C2. Activity           — 25 catatan CRM (CALL 6, EMAIL 6, MEETING 5, NOTE 5, TASK 3)
 *                           terhubung ke Lead/Contact/Deal, tanggal menyebar ±60 hari
 *                           dari anchorDate, deterministik, createdBy = user admin.
 *
 * PRINSIP HARD:
 *  - Idempotent: re-run tidak pernah menduplikasi (findFirst by kunci bisnis
 *    per-tenant — model CRM tidak punya @@unique selain Category).
 *  - Tanpa Math.random() — tanggal activity deterministik dari anchorDate + dayOffset.
 *  - Setiap query menyaring tenantId.
 *  - Stable keys: Category → name, Contact/Lead → name, Supplier → name,
 *    Deal → title, Activity → (entityType, entityId, type, subject).
 */

import type { Prisma } from '@prisma/client';
import { addDays, toUtcDate } from './finance';

// ============================================================
// 1. Dataset statis (single source of truth — C1)
// ============================================================

/** Anchor date default — SAMA dengan finance.ts DEFAULT_ANCHOR_DATE. */
export const CRM_DEFAULT_ANCHOR_DATE = '2026-10-10';

// ─── Category (9) ────────────────────────────────────────────

export interface CrmCategorySpec {
    name: string;
    description: string;
}

export const CRM_CATEGORIES: readonly CrmCategorySpec[] = [
    { name: 'Electronics', description: 'Produk elektronik' },
    { name: 'Mechanical', description: 'Komponen mekanik' },
    { name: 'Services', description: 'Layanan jasa' },
    { name: 'Office Supplies', description: 'Perlengkapan kantor' },
    { name: 'Furniture', description: 'Furniture kantor dan rumah' },
    { name: 'Automotive Parts', description: 'Suku cadang kendaraan' },
    { name: 'Food & Beverage', description: 'Makanan dan minuman' },
    { name: 'Software & Digital', description: 'Perangkat lunak dan layanan digital' },
    { name: 'Building Materials', description: 'Bahan bangunan dan konstruksi' },
];

// ─── Supplier (9) ────────────────────────────────────────────

export interface CrmSupplierSpec {
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    rating: number;
}

export const CRM_SUPPLIERS: readonly CrmSupplierSpec[] = [
    { name: 'PT Sejahtera Supplier', contactPerson: 'Budi Hartono', email: 'budi@sejahtera-supplier.co.id', phone: '021-7890123', address: 'Jl. Raya Bogor Km 30', city: 'Jakarta', rating: 4.5 },
    { name: 'CV Berkah Components', contactPerson: 'Siti Rahayu', email: 'siti@berkahcomp.co.id', phone: '021-8901234', address: 'Jl. Raya Bekasi Km 15', city: 'Bekasi', rating: 4.0 },
    { name: 'PT Teknologi Nusantara', contactPerson: 'Rahmat Widodo', email: 'rahmat@teknusa.co.id', phone: '021-9012345', address: 'Jl. Raya Tangerang Km 12', city: 'Tangerang', rating: 4.2 },
    { name: 'PT Supply Indonesia', contactPerson: 'Hendra Wijaya', email: 'hendra@supplyindo.co.id', phone: '021-5559012', address: 'Jl. Raya Cakung Km 5, Jakarta Timur', city: 'Jakarta', rating: 4.3 },
    { name: 'CV Distribusi Jaya', contactPerson: 'Rina Susanti', email: 'rina@distrijaya.co.id', phone: '021-5551023', address: 'Jl. Raya Cikarang Blok A No. 12, Bekasi', city: 'Bekasi', rating: 4.1 },
    { name: 'PT Logistik Nusantara', contactPerson: 'Agus Pratama', email: 'agus@logistiknusantara.co.id', phone: '0411-5552134', address: 'Jl. Raya Gorontalo Km 8', city: 'Makassar', rating: 4.6 },
    { name: 'CV Bahan Bangunan Sejahtera', contactPerson: 'Dedi Kurniawan', email: 'dedi@bbs.co.id', phone: '021-5553245', address: 'Jl. Raya Bogor Km 25, Jakarta Selatan', city: 'Jakarta', rating: 3.9 },
    { name: 'PT Komponen Elektronik Nusantara', contactPerson: 'Fandi Ahmad', email: 'fandi@kompel.co.id', phone: '021-5554356', address: 'Jl. Mangga Dua Raya No. 18, Jakarta Utara', city: 'Jakarta', rating: 4.4 },
    { name: 'CV Furniture Jati Jepara', contactPerson: 'Siti Nurjanah', email: 'siti@jatijepara.co.id', phone: '0291-5555467', address: 'Jl. Raya Jepara-Kudus Km 3, Jepara', city: 'Jepara', rating: 4.7 },
];

// ─── Contact (23) ────────────────────────────────────────────
// Urutan penting — seed.ts & demo.ts mereferensikan index kontak
// di blok invoice / quotation / deal (contactIdx).

export interface CrmContactSpec {
    name: string;
    type: 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
    company?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    taxId?: string;
}

export const CRM_CONTACTS: readonly CrmContactSpec[] = [
    // 0–4: basis seed.ts
    { name: 'PT Maju Jaya', type: 'CUSTOMER', company: 'PT Maju Jaya', email: 'info@majujaya.co.id', phone: '021-2345678', address: 'Jl. Gatot Subroto No. 45', city: 'Jakarta', taxId: '01.234.567.8-901.000' },
    { name: 'CV Berkah Mandiri', type: 'CUSTOMER', company: 'CV Berkah Mandiri', email: 'info@berkahmandiri.co.id', phone: '021-3456789', address: 'Jl. HR Rasuna Said No. 78', city: 'Jakarta' },
    { name: 'PT Sejahtera Abadi', type: 'CUSTOMER', company: 'PT Sejahtera Abadi', email: 'sales@sejahtera.co.id', phone: '021-4567890', address: 'Jl. TB Simatupang No. 90', city: 'Jakarta' },
    { name: 'PT Nusantara Jaya', type: 'CUSTOMER', company: 'PT Nusantara Jaya', email: 'info@nusantara.co.id', phone: '021-5678901', address: 'Jl. Thamrin No. 12', city: 'Jakarta' },
    { name: 'CV Sukses Mandiri', type: 'CUSTOMER', company: 'CV Sukses Mandiri', email: 'info@suksesmandiri.co.id', phone: '021-6789012', address: 'Jl. Kuningan No. 55', city: 'Jakarta' },
    // 5–6: supplier + both
    { name: 'PT Sumber Makmur', type: 'SUPPLIER', company: 'PT Sumber Makmur', email: 'info@sumbermakmur.co.id', phone: '021-5553691' },
    { name: 'CV Global Tech', type: 'BOTH', company: 'CV Global Tech', email: 'hello@globaltech.co.id', phone: '021-5557412' },
    // 7–22: perusahaan Indonesia realistis
    { name: 'PT Telkom Indonesia', type: 'CUSTOMER', company: 'PT Telkom Indonesia Tbk', email: 'procurement@telkom.co.id', phone: '021-5211111', address: 'Jl. Japati No. 1, Bandung', city: 'Bandung', taxId: '01.306.432.9-052.000' },
    { name: 'PT Astra International', type: 'CUSTOMER', company: 'PT Astra International Tbk', email: 'supply@astra.co.id', phone: '021-5088888', address: 'Jl. Gaya Motor I No. 8, Sunter, Jakarta Utara', city: 'Jakarta' },
    { name: 'PT Pertamina', type: 'CUSTOMER', company: 'PT Pertamina (Persero) Tbk', email: 'procurement@pertamina.com', phone: '021-3815111', address: 'Jl. Medan Merdeka Timur No. 1A, Jakarta Pusat', city: 'Jakarta', taxId: '01.300.014.2-094.000' },
    { name: 'PT PLN Indonesia', type: 'CUSTOMER', company: 'PT PLN (Persero) Tbk', email: 'tender@pln.co.id', phone: '021-7261122', address: 'Jl. Lapangan Banteng Timur 3-4, Jakarta Pusat', city: 'Jakarta' },
    { name: 'PT Bank Central Asia', type: 'CUSTOMER', company: 'PT Bank Central Asia Tbk', email: 'vendor@bca.co.id', phone: '021-23588300', address: 'Jl. Jend. Sudirman Kav. 78, Jakarta Selatan', city: 'Jakarta' },
    { name: 'PT Unilever Indonesia', type: 'CUSTOMER', company: 'PT Unilever Indonesia Tbk', email: 'purchase@unilever.co.id', phone: '021-80865111', address: 'Gedung Grha Unilever BSD Green Office Park, Tangerang', city: 'Tangerang' },
    { name: 'PT Indofood Sukses Makmur', type: 'CUSTOMER', company: 'PT Indofood Sukses Makmur Tbk', email: 'procurement@indofood.com', phone: '021-57958989', address: 'Jl. Sudirman Kav. 76-78, Jakarta Selatan', city: 'Jakarta' },
    { name: 'CV Adil Makmur', type: 'CUSTOMER', company: 'CV Adil Makmur', email: 'order@adilmakmur.co.id', phone: '0274-5552468', address: 'Jl. Malioboro No. 35, Yogyakarta', city: 'Yogyakarta' },
    { name: 'PT Surya Gemilang', type: 'CUSTOMER', company: 'PT Surya Gemilang Sejahtera', email: 'info@suryagemilang.co.id', phone: '031-5553691', address: 'Jl. Basuki Rachmat No. 12, Surabaya', city: 'Surabaya' },
    { name: 'UD Barokah Jaya', type: 'CUSTOMER', company: 'UD Barokah Jaya', email: 'barokah@jaya.co.id', phone: '0341-5557412', address: 'Jl. Bromo No. 22, Malang', city: 'Malang' },
    { name: 'PT Harmoni Komputama', type: 'BOTH', company: 'PT Harmoni Komputama', email: 'sales@harmoni.co.id', phone: '021-5558520', address: 'Jl. Mangga Dua No. 8, Jakarta Utara', city: 'Jakarta Utara' },
    { name: 'CV Mitra Sejati', type: 'CUSTOMER', company: 'CV Mitra Sejati', email: 'info@mitrasejati.co.id', phone: '021-5559630', address: 'Jl. Pemuda No. 15, Bekasi', city: 'Bekasi' },
    { name: 'PT Garuda Teknologi', type: 'CUSTOMER', company: 'PT Garuda Teknologi Nusantara', email: 'procurement@garudatech.co.id', phone: '021-5554710', address: 'Jl. Alternatif Cibubur Km 4, Bogor', city: 'Bogor' },
    { name: 'PT Maju Terus Perkasa', type: 'CUSTOMER', company: 'PT Maju Terus Perkasa', email: 'info@majuterus.co.id', phone: '021-5556380', address: 'Jl. Panjang No. 8, Jakarta Barat', city: 'Jakarta' },
    { name: 'CV Kencana Mulia', type: 'CUSTOMER', company: 'CV Kencana Mulia Abadi', email: 'kencana@mulia.co.id', phone: '021-5557410', address: 'Jl. Raya Ciledig No. 33, Cirebon', city: 'Cirebon' },
    { name: 'PT Bumi Damai Sejahtera', type: 'CUSTOMER', company: 'PT Bumi Damai Sejahtera', email: 'order@bumidamai.co.id', phone: '021-5558520', address: 'Jl. Pahlawan Revolusi No. 7, Jakarta Timur', city: 'Jakarta' },
];

// ─── Lead (14) ───────────────────────────────────────────────

export interface CrmLeadSpec {
    name: string;
    company: string;
    email: string;
    phone: string;
    source: string;
    status: string;
    value: number;
    notes?: string;
    /** Index ke CRM_CONTACTS — lead dihubungkan ke kontak terkait. */
    contactIdx: number;
}

export const CRM_LEADS: readonly CrmLeadSpec[] = [
    { name: 'PT Nusantara Jaya', company: 'PT Nusantara Jaya', email: 'info@nusantara.co.id', phone: '021-5678901', source: 'WEBSITE', status: 'NEW', value: 25000000, notes: 'Tertarik dengan paket enterprise', contactIdx: 3 },
    { name: 'CV Sukses Mandiri', company: 'CV Sukses Mandiri', email: 'info@suksesmandiri.co.id', phone: '021-6789012', source: 'REFERRAL', status: 'CONTACTED', value: 15000000, notes: 'Direkomendasikan oleh PT Maju Jaya', contactIdx: 4 },
    { name: 'PT ABC Technology', company: 'PT ABC Technology', email: 'info@abctech.co.id', phone: '021-7890123', source: 'SOCIAL_MEDIA', status: 'QUALIFIED', value: 50000000, notes: 'Lead dari LinkedIn, sangat potensial', contactIdx: 0 },
    { name: 'CV Berkah Jaya', company: 'CV Berkah Jaya', email: 'info@berkahjaya.co.id', phone: '021-8901234', source: 'COLD_CALL', status: 'PROPOSAL', value: 45000000, notes: 'Proposal sudah dikirim', contactIdx: 1 },
    { name: 'PT Maju Bersama', company: 'PT Maju Bersama', email: 'info@majubersama.co.id', phone: '021-5551234', source: 'REFERRAL', status: 'WON', value: 50000000, contactIdx: 0 },
    { name: 'PT Sejahtera Abadi', company: 'PT Sejahtera Abadi', email: 'procurement@sejahtera.co.id', phone: '021-5552468', source: 'COLD_CALL', status: 'WON', value: 75000000, contactIdx: 2 },
    { name: 'UD Makmur Sentosa', company: 'UD Makmur Sentosa', email: 'order@makmursentosa.co.id', phone: '0274-5551357', source: 'SOCIAL_MEDIA', status: 'LOST', value: 15000000, notes: 'Budget tidak cukup', contactIdx: 14 },
    { name: 'PT Telkom Indonesia', company: 'PT Telkom Indonesia Tbk', email: 'ict@telkom.co.id', phone: '021-5211111', source: 'REFERRAL', status: 'QUALIFIED', value: 250000000, notes: 'Proyek digitalisasi kantor pusat', contactIdx: 7 },
    { name: 'PT Astra International', company: 'PT Astra International Tbk', email: 'it@astra.co.id', phone: '021-5088888', source: 'WEBSITE', status: 'PROPOSAL', value: 180000000, notes: 'Furnitur untuk 5 cabang baru', contactIdx: 8 },
    { name: 'PT Pertamina', company: 'PT Pertamina (Persero)', email: 'procurement@pertamina.com', phone: '021-3815111', source: 'COLD_CALL', status: 'NEGOTIATION', value: 500000000, notes: 'Kontrak tahunan ATK dan elektronik', contactIdx: 9 },
    { name: 'PT PLN Indonesia', company: 'PT PLN (Persero)', email: 'supply@pln.co.id', phone: '021-7261122', source: 'SOCIAL_MEDIA', status: 'CONTACTED', value: 350000000, notes: 'Hardware untuk 10 unit distribusi', contactIdx: 10 },
    { name: 'PT Bank BCA', company: 'PT Bank Central Asia Tbk', email: 'vendor@bca.co.id', phone: '021-23588300', source: 'REFERRAL', status: 'NEW', value: 120000000, notes: 'IT equipment untuk cabang baru', contactIdx: 11 },
    { name: 'PT Unilever', company: 'PT Unilever Indonesia Tbk', email: 'purchase@unilever.co.id', phone: '021-80865111', source: 'WEBSITE', status: 'QUALIFIED', value: 200000000, notes: 'Office supplies kontrak 1 tahun', contactIdx: 12 },
    { name: 'PT Indofood', company: 'PT Indofood Sukses Makmur Tbk', email: 'procurement@indofood.com', phone: '021-57958989', source: 'COLD_CALL', status: 'PROPOSAL', value: 150000000, notes: 'Furniture untuk kantor regional', contactIdx: 13 },
];

// ─── Deal (14) ───────────────────────────────────────────────

export interface CrmDealSpec {
    title: string;
    value: number;
    stage: string;
    probability: number;
    /** ISO date string (YYYY-MM-DD) — deterministik, tanpa Date.now(). */
    closeDate: string;
    notes?: string;
    contactIdx: number;
    leadIdx?: number;
}

export const CRM_DEALS: readonly CrmDealSpec[] = [
    { title: 'PT ABC Corp - Paket Enterprise', value: 150000000, stage: 'NEGOTIATION', probability: 75, closeDate: '2026-08-30', notes: 'Sedang dalam negosiasi harga', contactIdx: 0 },
    { title: 'CV Maju Bersama - Annual Contract', value: 85000000, stage: 'PROPOSAL', probability: 55, closeDate: '2026-09-15', notes: 'Proposal annual contract', contactIdx: 1 },
    { title: 'PT Sejahtera - Bulk Order', value: 200000000, stage: 'DISCOVERY', probability: 30, closeDate: '2026-10-01', notes: 'Discovery phase, baru mulai', contactIdx: 2 },
    { title: 'CV Berkah Jaya - Maintenance Contract', value: 45000000, stage: 'CLOSING', probability: 90, closeDate: '2026-08-15', notes: 'Tinggal tanda tangan kontrak', contactIdx: 1 },
    { title: 'Paket Website Company Profile', value: 25000000, stage: 'CLOSED_WON', probability: 100, closeDate: '2026-08-10', contactIdx: 0, leadIdx: 4 },
    { title: 'Maintenance Server Tahunan', value: 15000000, stage: 'CLOSED_LOST', probability: 0, closeDate: '2026-08-15', notes: 'Customer memilih kompetitor', contactIdx: 1, leadIdx: 3 },
    { title: 'PT Telkom - Digitalisasi Kantor', value: 250000000, stage: 'NEGOTIATION', probability: 70, closeDate: '2026-09-30', notes: 'Negosiasi harga paket lengkap IT', contactIdx: 7 },
    { title: 'PT Astra - Furnitur 5 Cabang', value: 180000000, stage: 'PROPOSAL', probability: 50, closeDate: '2026-10-15', notes: 'Proposal furnitur untuk cabang baru', contactIdx: 8 },
    { title: 'PT Pertamina - Kontrak Tahunan ATK', value: 500000000, stage: 'DISCOVERY', probability: 25, closeDate: '2026-11-01', notes: 'Discovery phase, butuh presentasi', contactIdx: 9 },
    { title: 'PT PLN - Hardware Distribusi', value: 350000000, stage: 'CLOSING', probability: 85, closeDate: '2026-08-28', notes: 'Tinggal kontrak final', contactIdx: 10 },
    { title: 'CV Adil Makmur - Office Supplies', value: 12000000, stage: 'CLOSED_WON', probability: 100, closeDate: '2026-08-05', notes: 'Deal sudah final', contactIdx: 14 },
    { title: 'PT Surya Gemilang - Elektronik', value: 45000000, stage: 'PROPOSAL', probability: 45, closeDate: '2026-09-20', notes: 'Menunggu approval dari management', contactIdx: 15 },
    { title: 'UD Barokah Jaya - ATK Rutin', value: 8000000, stage: 'CLOSED_LOST', probability: 0, closeDate: '2026-08-12', notes: 'Pindah ke supplier lain', contactIdx: 16 },
    { title: 'PT Garuda Teknologi - Software License', value: 90000000, stage: 'NEGOTIATION', probability: 65, closeDate: '2026-09-10', notes: 'Negosiasi bundle software', contactIdx: 17 },
];

// ─── Activity (25 — C2) ──────────────────────────────────────
// Distribusi: CALL 6, EMAIL 6, MEETING 5, NOTE 5, TASK 3.
// dayOffset: hari relatif terhadap anchorDate (rentang −58 … −2, ≤ 60 hari).
// entityIdx menunjuk index CRM_CONTACTS / CRM_LEADS / CRM_DEALS.

export interface CrmActivitySpec {
    entityType: 'CONTACT' | 'LEAD' | 'DEAL';
    entityIdx: number;
    type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'TASK';
    subject: string;
    description?: string;
    /** Offset hari dari anchorDate untuk tanggal aktivitas (negatif = lampau). */
    dayOffset: number;
    /** Offset hari dari anchorDate untuk dueDate (hanya untuk TASK). */
    dueDayOffset?: number;
    /** true → completedAt terisi; false → masih terbuka (untuk TASK). */
    completed: boolean;
}

export const CRM_ACTIVITIES: readonly CrmActivitySpec[] = [
    // ── CALL (6) ──
    { entityType: 'CONTACT', entityIdx: 0, type: 'CALL', subject: 'Follow-up penawaran paket enterprise', description: 'Menghubungi PT Maju Jaya untuk follow-up penawaran yang dikirim minggu lalu', dayOffset: -58, completed: true },
    { entityType: 'LEAD', entityIdx: 7, type: 'CALL', subject: 'Kualifikasi kebutuhan hardware', description: 'Kualifikasi kebutuhan IT hardware 10 unit distribusi', dayOffset: -45, completed: true },
    { entityType: 'DEAL', entityIdx: 0, type: 'CALL', subject: 'Negosiasi harga paket enterprise', description: 'Negosiasi harga dengan bagian procurement', dayOffset: -33, completed: true },
    { entityType: 'CONTACT', entityIdx: 9, type: 'CALL', subject: 'Konfirmasi jadwal pengiriman', description: 'Konfirmasi jadwal pengiriman ke gudang PT Pertamina', dayOffset: -21, completed: true },
    { entityType: 'LEAD', entityIdx: 9, type: 'CALL', subject: 'Intro call kontrak ATK tahunan', description: 'Perkenalan layanan dan minat kontrak tahunan', dayOffset: -12, completed: true },
    { entityType: 'DEAL', entityIdx: 6, type: 'CALL', subject: 'Review hasil negosiasi', description: 'Review hasil negosiasi paket IT dengan PT Telkom', dayOffset: -4, completed: true },
    // ── EMAIL (6) ──
    { entityType: 'CONTACT', entityIdx: 7, type: 'EMAIL', subject: 'Kirim penawaran resmi', description: 'Penawaran resmi paket digitalisasi kantor', dayOffset: -52, completed: true },
    { entityType: 'LEAD', entityIdx: 8, type: 'EMAIL', subject: 'Kirim proposal furnitur', description: 'Proposal furnitur untuk 5 cabang baru', dayOffset: -40, completed: true },
    { entityType: 'DEAL', entityIdx: 9, type: 'EMAIL', subject: 'Kirim kontrak final', description: 'Draft kontrak final menunggu paraf', dayOffset: -27, completed: true },
    { entityType: 'CONTACT', entityIdx: 12, type: 'EMAIL', subject: 'Kirim invoice PO tahunan', description: 'Invoice untuk PO office supplies tahunan', dayOffset: -18, completed: true },
    { entityType: 'LEAD', entityIdx: 12, type: 'EMAIL', subject: 'Follow-up penawaran ATK', description: 'Follow-up penawaran office supplies kontrak 1 tahun', dayOffset: -9, completed: true },
    { entityType: 'DEAL', entityIdx: 13, type: 'EMAIL', subject: 'Kirim revisi penawaran software', description: 'Revisi bundling software sesuai permintaan', dayOffset: -3, completed: true },
    // ── MEETING (5) ──
    { entityType: 'CONTACT', entityIdx: 1, type: 'MEETING', subject: 'Presentasi solusi ERP', description: 'Presentasi solusi ERP di kantor CV Berkah Mandiri', dayOffset: -55, completed: true },
    { entityType: 'LEAD', entityIdx: 10, type: 'MEETING', subject: 'Workshop kebutuhan distribusi', description: 'Workshop pemetaan proses distribusi 10 unit', dayOffset: -37, completed: true },
    { entityType: 'DEAL', entityIdx: 3, type: 'MEETING', subject: 'Penandatanganan kontrak maintenance', description: 'TTD kontrak maintenance tahunan', dayOffset: -25, completed: true },
    { entityType: 'CONTACT', entityIdx: 13, type: 'MEETING', subject: 'Demo produk furniture', description: 'Demo katalog furniture untuk kantor regional', dayOffset: -15, completed: true },
    { entityType: 'LEAD', entityIdx: 6, type: 'MEETING', subject: 'Diskusi kebutuhan ATK', description: 'Diskusi kebutuhan ATK — ditutup karena budget', dayOffset: -6, completed: true },
    // ── NOTE (5) ──
    { entityType: 'CONTACT', entityIdx: 3, type: 'NOTE', subject: 'Catatan: minat paket enterprise', description: 'Menunjukkan minat pada paket enterprise, budget Q4', dayOffset: -50, completed: true },
    { entityType: 'LEAD', entityIdx: 2, type: 'NOTE', subject: 'Lead dari LinkedIn — sangat potensial', description: 'Sumber LinkedIn, decision maker sudah teridentifikasi', dayOffset: -31, completed: true },
    { entityType: 'DEAL', entityIdx: 1, type: 'NOTE', subject: 'Menunggu revisi proposal annual', description: 'Klien minta revisi cakupan layanan annual contract', dayOffset: -23, completed: true },
    { entityType: 'CONTACT', entityIdx: 16, type: 'NOTE', subject: 'Customer pindah ke supplier lain', description: 'UD Barokah Jaya memindahkan pembelian ke pemasok lain', dayOffset: -11, completed: true },
    { entityType: 'LEAD', entityIdx: 11, type: 'NOTE', subject: 'Butuh IT equipment cabang baru', description: 'BCA buka cabang baru, butuh peralatan Q4', dayOffset: -5, completed: true },
    // ── TASK (3) ──
    { entityType: 'DEAL', entityIdx: 2, type: 'TASK', subject: 'Siapkan proposal bulk order', description: 'Susun proposal bulk order untuk PT Sejahtera Abadi', dayOffset: -19, dueDayOffset: -12, completed: true },
    { entityType: 'CONTACT', entityIdx: 17, type: 'TASK', subject: 'Kirim dokumen tender', description: 'Lengkapi dan kirim dokumen tender PT Garuda Teknologi', dayOffset: -14, dueDayOffset: -7, completed: false },
    { entityType: 'LEAD', entityIdx: 4, type: 'TASK', subject: 'Konfirmasi pembayaran deal WON', description: 'Konfirmasi termin pembayaran deal yang sudah WON', dayOffset: -8, dueDayOffset: -2, completed: false },
];

/** Distribusi type Activity yang diharapkan (untuk verifikasi & unit test). */
export const CRM_ACTIVITY_TYPE_COUNTS: Readonly<Record<CrmActivitySpec['type'], number>> = {
    CALL: 6,
    EMAIL: 6,
    MEETING: 5,
    NOTE: 5,
    TASK: 3,
};

// ============================================================
// 2. Helper murni (deterministik — unit-tested)
// ============================================================

/**
 * Tanggal aktivitas CRM = anchorDate + dayOffset (UTC midnight).
 * @param anchorDate ISO date string (YYYY-MM-DD)
 * @param dayOffset offset hari (negatif = lampau, maksimal ±60)
 */
export function activityDate(anchorDate: string, dayOffset: number): Date {
    return addDays(toUtcDate(anchorDate), dayOffset);
}

// ============================================================
// 3. Seeder (idempotent — findFirst by kunci bisnis per-tenant)
// ============================================================

export interface SeedCrmOptions {
    tenantId: string;
    /** User id pembuat Activity (wajib — field Activity.createdBy). */
    createdBy: string;
    /** ISO date string; default CRM_DEFAULT_ANCHOR_DATE. */
    anchorDate?: string;
}

export interface CrmEntityRef {
    id: string;
    name: string;
}

export interface SeedCrmResult {
    counts: {
        categories: number;
        contacts: number;
        suppliers: number;
        leads: number;
        deals: number;
        activities: number;
    };
    /** Map nama kategori → id (dipakai inventory.ts untuk resolve categoryId). */
    categories: CrmEntityRef[];
    contacts: CrmEntityRef[];
    suppliers: CrmEntityRef[];
    leads: CrmEntityRef[];
    deals: CrmEntityRef[];
}

/**
 * Seed dataset CRM lengkap untuk satu tenant — idempotent.
 * Dipanggil SEBELUM inventory.ts (butuh categoryId) dan sebelum
 * seedFinanceData (butuh dokumen CRM untuk jurnal).
 */
export async function seedCrmData(
    db: Prisma.TransactionClient,
    options: SeedCrmOptions
): Promise<SeedCrmResult> {
    const { tenantId, createdBy } = options;
    const anchorDate = options.anchorDate ?? CRM_DEFAULT_ANCHOR_DATE;

    // ─── Categories ──────────────────────────────────────────
    const categories: CrmEntityRef[] = [];
    let categoriesCreated = 0;
    for (const spec of CRM_CATEGORIES) {
        const existing = await db.category.findFirst({
            where: { name: spec.name, tenantId },
            select: { id: true, name: true },
        });
        if (existing) {
            categories.push(existing);
        } else {
            const created = await db.category.create({
                data: { name: spec.name, description: spec.description, tenantId },
                select: { id: true, name: true },
            });
            categories.push(created);
            categoriesCreated += 1;
        }
    }

    // ─── Contacts ────────────────────────────────────────────
    const contacts: CrmEntityRef[] = [];
    let contactsCreated = 0;
    for (const spec of CRM_CONTACTS) {
        const existing = await db.contact.findFirst({
            where: { name: spec.name, tenantId },
            select: { id: true, name: true },
        });
        if (existing) {
            contacts.push(existing);
        } else {
            const created = await db.contact.create({
                data: {
                    name: spec.name,
                    type: spec.type,
                    company: spec.company,
                    email: spec.email,
                    phone: spec.phone,
                    address: spec.address,
                    city: spec.city,
                    taxId: spec.taxId,
                    tenantId,
                },
                select: { id: true, name: true },
            });
            contacts.push(created);
            contactsCreated += 1;
        }
    }

    // ─── Suppliers ───────────────────────────────────────────
    const suppliers: CrmEntityRef[] = [];
    let suppliersCreated = 0;
    for (const spec of CRM_SUPPLIERS) {
        const existing = await db.supplier.findFirst({
            where: { name: spec.name, tenantId },
            select: { id: true, name: true },
        });
        if (existing) {
            suppliers.push(existing);
        } else {
            const created = await db.supplier.create({
                data: { ...spec, tenantId },
                select: { id: true, name: true },
            });
            suppliers.push(created);
            suppliersCreated += 1;
        }
    }

    // ─── Leads (terhubung ke Contact via contactIdx) ─────────
    const leads: CrmEntityRef[] = [];
    let leadsCreated = 0;
    for (const spec of CRM_LEADS) {
        const existing = await db.lead.findFirst({
            where: { name: spec.name, tenantId },
            select: { id: true, name: true },
        });
        if (existing) {
            leads.push(existing);
        } else {
            const contactId = contacts[spec.contactIdx]?.id;
            const created = await db.lead.create({
                data: {
                    name: spec.name,
                    company: spec.company,
                    email: spec.email,
                    phone: spec.phone,
                    source: spec.source,
                    status: spec.status,
                    value: spec.value,
                    notes: spec.notes,
                    contactId,
                    tenantId,
                },
                select: { id: true, name: true },
            });
            leads.push(created);
            leadsCreated += 1;
        }
    }

    // ─── Deals (terhubung Contact + Lead opsional) ───────────
    const deals: CrmEntityRef[] = [];
    let dealsCreated = 0;
    for (const spec of CRM_DEALS) {
        const existing = await db.deal.findFirst({
            where: { title: spec.title, tenantId },
            select: { id: true, title: true },
        });
        if (existing) {
            deals.push({ id: existing.id, name: existing.title });
        } else {
            const contactId = contacts[spec.contactIdx]?.id;
            const leadId = spec.leadIdx !== undefined ? leads[spec.leadIdx]?.id : undefined;
            const created = await db.deal.create({
                data: {
                    title: spec.title,
                    value: spec.value,
                    stage: spec.stage,
                    probability: spec.probability,
                    closeDate: toUtcDate(spec.closeDate),
                    notes: spec.notes,
                    contactId,
                    leadId,
                    tenantId,
                },
                select: { id: true, title: true },
            });
            deals.push({ id: created.id, name: created.title });
            dealsCreated += 1;
        }
    }

    // ─── Activities (25 — C2, idempotent by bisnis key) ──────
    let activitiesCreated = 0;
    for (const spec of CRM_ACTIVITIES) {
        const entity =
            spec.entityType === 'CONTACT'
                ? contacts[spec.entityIdx]
                : spec.entityType === 'LEAD'
                    ? leads[spec.entityIdx]
                    : deals[spec.entityIdx];
        if (!entity) continue; // defensif — index di dataset dijamin valid

        const date = activityDate(anchorDate, spec.dayOffset);
        const existing = await db.activity.findFirst({
            where: {
                tenantId,
                entityType: spec.entityType,
                entityId: entity.id,
                type: spec.type,
                subject: spec.subject,
            },
            select: { id: true },
        });
        if (existing) continue;

        const dueDate =
            spec.dueDayOffset !== undefined ? activityDate(anchorDate, spec.dueDayOffset) : null;
        const completedAt = spec.completed ? date : null;

        await db.activity.create({
            data: {
                entityType: spec.entityType,
                entityId: entity.id,
                type: spec.type,
                subject: spec.subject,
                description: spec.description,
                dueDate,
                completedAt,
                createdBy,
                tenantId,
            },
        });
        activitiesCreated += 1;
    }

    return {
        counts: {
            categories: categories.length,
            contacts: contacts.length,
            suppliers: suppliers.length,
            leads: leads.length,
            deals: deals.length,
            activities: CRM_ACTIVITIES.length,
        },
        categories,
        contacts,
        suppliers,
        leads,
        deals,
    };
}
