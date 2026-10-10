/**
 * Finance Demo Seed Module — Shared dataset source untuk SEMUA loader Finance P0.
 *
 * Digunakan OLEH KEDUA loader sehingga menghasilkan data IDENTIC:
 *  - packages/db/prisma/seed.ts  → import { seedFinanceData } from "../../../apps/web/lib/seed-data/finance"
 *  - apps/web/lib/seed-data/demo.ts → import { seedFinanceData } from "./finance"
 *
 * Cakupan (plans/demo-data-enhancement.md §6.1 B1–B8, Finance P0):
 *  B1. TaxRate           — 5 tarif (PPN keluaran/masukan, PPh 21/23/4(2))
 *  B2. CoAAccount        — 44 akun seed.ts + 3 akun child baru (5204/5205/5206)
 *  B3. JournalEntry      — jurnal otomatis dari transaksi (±130 entry, SEMUA seimbang,
 *                          6 bulan riwayat, sourceType/sourceId menunjuk dokumen asal,
 *                          POSTED historis + DRAFT untuk dokumen terbaru/pending)
 *  B4. Bill              — 7 tagihan vendor (4 APPROVED + 3 PAID)
 *  B5. Expense           — 12 pengeluaran lintas kategori (10 APPROVED + 2 PENDING_APPROVAL)
 *  B6. Payment pelengkap — 3 pembayaran parsial + 2 DP pending untuk skenario aging
 *  B7. AccountingPeriod  — 6 periode bulanan Mei–Okt 2026 (4 CLOSED + 2 OPEN)
 *
 * PRINSIP HARD:
 *  - Idempotent: re-run tidak pernah menduplikasi (guard by @@unique key masing-masing model).
 *  - JournalEntry.entryNumber GLOBAL UNIQUE → format JE-{tenantPrefix}-{YYYYMM}-{seq:04d},
 *    plus dedup kedua via (tenantId, sourceType, sourceId, date).
 *  - SEMUA entry dijamin seimbang: totalDebit === totalCredit dihitung dari lines.
 *  - Tanpa Math.random() — memakai PRNG mulberry32 ber-seed deterministik.
 *  - Setiap query menyaring tenantId.
 */

import type { Prisma } from '@prisma/client';

// ============================================================
// 1. Seeded PRNG (deterministik — jangan ganti dengan Math.random)
// ============================================================

/**
 * Mulberry32 — PRNG deterministik 32-bit.
 * @param seed seed numerik tetap untuk hasil reproducible
 * @returns fungsi penghasil angka [0, 1)
 */
export function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return function next(): number {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ============================================================
// 2. Helper murni (unit-tested)
// ============================================================

/** Pembulatan 2 desimal (kompatibel floating point). */
export function round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Prefix entryNumber per-tenant (globally-unique entryNumber butuh namespace per tenant).
 * Contoh: "qalcuity-demo" → "QD"; "acme" → "A"; "toko-besar-jaya" → "TBJ".
 */
export function generateTenantPrefix(slug: string): string {
    const parts = (slug || '')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);
    const initials = parts.map((p) => p.charAt(0).toUpperCase()).join('');
    const prefix = initials.slice(0, 3);
    return prefix.length >= 2 ? prefix : 'DEM';
}

/**
 * Format entryNumber global: JE-{prefix}-{YYYYMM}-{seq 4 digit}.
 * Contoh: generateEntryNumber('QD', '202605', 7) → "JE-QD-202605-0007".
 */
export function generateEntryNumber(prefix: string, yyyymm: string, seq: number): string {
    return `JE-${prefix}-${yyyymm}-${String(seq).padStart(4, '0')}`;
}

const UTC_DAY_MS = 86_400_000;

/** Normalisasi ke Date UTC midnight (aman dari drift timezone). */
export function toUtcDate(value: Date | string | number): Date {
    const d = value instanceof Date ? value : new Date(value);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * UTC_DAY_MS);
}

/** "2026-05-01" → "2026-05". */
export function monthKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** "2026-05" → "202605". */
export function yyyymmOf(date: Date): string {
    return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Hari terakhir bulan (UTC). */
export function lastDayOfMonth(yyyy: number, mm: number): Date {
    return new Date(Date.UTC(yyyy, mm, 0)); // hari-0 bulan berikutnya = akhir bulan
}

const MONTH_NAMES_ID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** "2026-05" → "Mei 2026". */
export function periodeName(month: string): string {
    const [y, m] = month.split('-').map(Number);
    return `${MONTH_NAMES_ID[m - 1]} ${y}`;
}

/**
 * Estimasi tanggal terbit invoice yang andal untuk data seed.
 * Banyak invoice seed tidak menyetel createdAt (terisi waktu run) — untuk kasus itu
 * tanggal terbit = dueDate − 30 hari. Jika createdAt sudah masuk akal (≤ dueDate), pakai createdAt.
 */
export function deriveInvoiceDate(createdAt: Date, dueDate: Date): Date {
    const created = toUtcDate(createdAt);
    const due = toUtcDate(dueDate);
    if (created.getTime() > due.getTime()) return addDays(due, -30);
    return created;
}

/** Deskripsi item jasa → memetakan ke akun 4102 (selain itu 4101 produk). */
export function isJasaDescription(description: string): boolean {
    return /jasa|servis|service|konsultasi|maintenance|implementasi|support|langganan|sewa/i.test(
        description || ''
    );
}

/** Metode pembayaran → akun kas/bank/kewajiban. */
export function paymentCashAccountCode(method: string): string {
    switch (method) {
        case 'CASH':
            return '1101';
        case 'BANK_TRANSFER':
            return '1102';
        case 'E_WALLET':
            return '1102';
        case 'CREDIT_CARD':
            return '2101'; // kewajiban kartu kredit → utang usaha
        default:
            return '1101';
    }
}

/** Kategori Expense → akun beban (termasuk 3 akun child baru 5204/5205/5206). */
export const EXPENSE_CATEGORY_ACCOUNT: Record<string, string> = {
    OFFICE: '5205',
    TRAVEL: '5206',
    UTILITIES: '5203',
    MARKETING: '5301',
    SALARIES: '5201',
    MAINTENANCE: '5204',
    OTHER: '5400',
};

// ============================================================
// 3. Dataset statis — TaxRate (B1)
// ============================================================

export interface TaxRateSpec {
    code: string;
    name: string;
    rate: number;
    type: string; // VAT | INCOME_TAX | OTHER
    isDefault: boolean;
}

/** 5 tarif pajak — PPN-KELUARAN/PPH23/PPH21 kompatibel dengan seed.ts (upsert-by-code). */
export const FINANCE_TAX_RATES: TaxRateSpec[] = [
    { code: 'PPN-KELUARAN', name: 'PPN Keluaran 11%', rate: 11, type: 'VAT', isDefault: true },
    { code: 'PPN-MASUKAN', name: 'PPN Masukan 11%', rate: 11, type: 'VAT', isDefault: false },
    { code: 'PPH23', name: 'PPh 23 Jasa 2%', rate: 2, type: 'INCOME_TAX', isDefault: true },
    { code: 'PPH21', name: 'PPh 21 Karyawan', rate: 0, type: 'INCOME_TAX', isDefault: false },
    { code: 'PPH42', name: 'PPh 4(2) Final 3%', rate: 3, type: 'OTHER', isDefault: false },
];

// ============================================================
// 4. Dataset statis — CoA (B2): 44 akun seed.ts + 3 child baru
// ============================================================

export interface CoAAccountSpec {
    code: string;
    name: string;
    type: string; // ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
    parentCode: string | null;
    balance: number;
}

/** Saldo statis dipertahankan untuk kompatibilitas (keputusan §6.0 #5 — lihat catatan di bawah). */
export const FINANCE_COA_ACCOUNTS: CoAAccountSpec[] = [
    // ASSET
    { code: '1000', name: 'AKTIVA', type: 'ASSET', parentCode: null, balance: 0 },
    { code: '1100', name: 'Kas & Bank', type: 'ASSET', parentCode: '1000', balance: 0 },
    { code: '1101', name: 'Kas Perusahaan', type: 'ASSET', parentCode: '1100', balance: 45_000_000 },
    { code: '1102', name: 'Bank BCA', type: 'ASSET', parentCode: '1100', balance: 125_000_000 },
    { code: '1103', name: 'Bank Mandiri', type: 'ASSET', parentCode: '1100', balance: 78_500_000 },
    { code: '1200', name: 'Piutang', type: 'ASSET', parentCode: '1000', balance: 0 },
    { code: '1201', name: 'Piutang Dagang', type: 'ASSET', parentCode: '1200', balance: 85_000_000 },
    { code: '1202', name: 'Piutang Pajak (PPN Masukan)', type: 'ASSET', parentCode: '1200', balance: 12_000_000 },
    { code: '1300', name: 'Persediaan', type: 'ASSET', parentCode: '1000', balance: 0 },
    { code: '1301', name: 'Persediaan Barang', type: 'ASSET', parentCode: '1300', balance: 250_000_000 },
    { code: '1400', name: 'Aktiva Tetap', type: 'ASSET', parentCode: '1000', balance: 0 },
    { code: '1401', name: 'Peralatan Kantor', type: 'ASSET', parentCode: '1400', balance: 85_000_000 },
    { code: '1402', name: 'Kendaraan', type: 'ASSET', parentCode: '1400', balance: 350_000_000 },
    { code: '1403', name: 'Akumulasi Depresiasi', type: 'ASSET', parentCode: '1400', balance: -125_000_000 },
    // LIABILITY
    { code: '2000', name: 'PASIVA', type: 'LIABILITY', parentCode: null, balance: 0 },
    { code: '2100', name: 'Utang Lancar', type: 'LIABILITY', parentCode: '2000', balance: 0 },
    { code: '2101', name: 'Utang Dagang', type: 'LIABILITY', parentCode: '2100', balance: 65_000_000 },
    { code: '2102', name: 'Utang Pajak', type: 'LIABILITY', parentCode: '2100', balance: 8_500_000 },
    { code: '2103', name: 'Utang Gaji', type: 'LIABILITY', parentCode: '2100', balance: 22_000_000 },
    { code: '2200', name: 'Utang Jangka Panjang', type: 'LIABILITY', parentCode: '2000', balance: 0 },
    { code: '2201', name: 'Utang Bank', type: 'LIABILITY', parentCode: '2200', balance: 500_000_000 },
    // EQUITY
    { code: '3000', name: 'MODAL', type: 'EQUITY', parentCode: null, balance: 0 },
    { code: '3100', name: 'Modal Disetor', type: 'EQUITY', parentCode: '3000', balance: 500_000_000 },
    { code: '3200', name: 'Laba Ditahan', type: 'EQUITY', parentCode: '3000', balance: 180_000_000 },
    { code: '3300', name: 'Laba Berjalan', type: 'EQUITY', parentCode: '3000', balance: 45_000_000 },
    // REVENUE
    { code: '4000', name: 'PENDAPATAN', type: 'REVENUE', parentCode: null, balance: 0 },
    { code: '4100', name: 'Pendapatan Penjualan', type: 'REVENUE', parentCode: '4000', balance: 0 },
    { code: '4101', name: 'Penjualan Produk', type: 'REVENUE', parentCode: '4100', balance: 450_000_000 },
    { code: '4102', name: 'Penjualan Jasa', type: 'REVENUE', parentCode: '4100', balance: 125_000_000 },
    { code: '4200', name: 'Pendapatan Lain', type: 'REVENUE', parentCode: '4000', balance: 0 },
    { code: '4201', name: 'Pendapatan Bunga', type: 'REVENUE', parentCode: '4200', balance: 2_500_000 },
    // EXPENSE
    { code: '5000', name: 'BEBAN', type: 'EXPENSE', parentCode: null, balance: 0 },
    { code: '5100', name: 'Beban Pokok Penjualan', type: 'EXPENSE', parentCode: '5000', balance: 0 },
    { code: '5101', name: 'Harga Pokok Penjualan', type: 'EXPENSE', parentCode: '5100', balance: 280_000_000 },
    { code: '5200', name: 'Beban Operasional', type: 'EXPENSE', parentCode: '5000', balance: 0 },
    { code: '5201', name: 'Gaji & Tunjangan', type: 'EXPENSE', parentCode: '5200', balance: 95_000_000 },
    { code: '5202', name: 'Sewa Kantor', type: 'EXPENSE', parentCode: '5200', balance: 36_000_000 },
    { code: '5203', name: 'Listrik & Internet', type: 'EXPENSE', parentCode: '5200', balance: 8_500_000 },
    // ── 3 akun child BARU untuk kategorisasi Expense (B5) ──
    { code: '5204', name: 'Biaya Perawatan & Pemeliharaan', type: 'EXPENSE', parentCode: '5200', balance: 0 },
    { code: '5205', name: 'ATK & Perlengkapan Kantor', type: 'EXPENSE', parentCode: '5200', balance: 0 },
    { code: '5206', name: 'Biaya Perjalanan Dinas', type: 'EXPENSE', parentCode: '5200', balance: 0 },
    { code: '5300', name: 'Beban Pemasaran', type: 'EXPENSE', parentCode: '5000', balance: 0 },
    { code: '5301', name: 'Biaya Marketing', type: 'EXPENSE', parentCode: '5300', balance: 15_000_000 },
    { code: '5400', name: 'Beban Lain', type: 'EXPENSE', parentCode: '5000', balance: 0 },
    { code: '5401', name: 'Biaya Depresiasi', type: 'EXPENSE', parentCode: '5400', balance: 12_500_000 },
    { code: '5402', name: 'Biaya Bunga', type: 'EXPENSE', parentCode: '5400', balance: 5_000_000 },
    { code: '5403', name: 'Biaya Admin Bank', type: 'EXPENSE', parentCode: '5400', balance: 1_200_000 },
];

/**
 * CATATAN §6.0 #5 (CoA ↔ Journal sync):
 * Saldo akun dipertahankan statis (kompatibilitas backward dengan seed.ts) —
 * angka laporan yang dihasilkan JOURNAL tetap konsisten karena selisih dicatat di
 * entry "Saldo awal periode demo". Resync penuh tersedia via fullResyncAccountBalances()
 * bila diperlukan secara eksplisit.
 */

// ============================================================
// 5. Dataset statis — Bill (B4) & Expense (B5)
// ============================================================

export interface BillSpec {
    billNumber: string;
    vendorName: string;
    supplierInvoiceNumber: string;
    status: string; // APPROVED | PAID
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount: number;
    billDate: string; // YYYY-MM-DD
    dueDate: string;
    /** Akun debit utama (beban/persediaan) — Bill model flat tanpa items. */
    accountCode: string;
    /** Untuk PAID: akun kas/bank pembayaran + tanggal bayar. */
    payAccountCode?: string;
    paidDate?: string;
    notes: string;
}

export const FINANCE_BILLS: BillSpec[] = [
    {
        billNumber: 'BILL-2026-001', vendorName: 'PT Sinar Elektrik Nusantara', supplierInvoiceNumber: 'SE-2026-1001',
        status: 'APPROVED', subtotal: 12_000_000, taxAmount: 1_320_000, totalAmount: 13_320_000, paidAmount: 0,
        billDate: '2026-06-15', dueDate: '2026-07-15', accountCode: '1301',
        notes: 'Pembelian komponen elektronik untuk stok produksi',
    },
    {
        billNumber: 'BILL-2026-002', vendorName: 'PT Mega Mesin Industri', supplierInvoiceNumber: 'MM-2026-2088',
        status: 'APPROVED', subtotal: 8_500_000, taxAmount: 935_000, totalAmount: 9_435_000, paidAmount: 0,
        billDate: '2026-07-21', dueDate: '2026-08-20', accountCode: '5204',
        notes: 'Jasa servis & kalibrasi mesin produksi',
    },
    {
        billNumber: 'BILL-2026-003', vendorName: 'CV Angkasa Logistik', supplierInvoiceNumber: 'AL-2026-0455',
        status: 'APPROVED', subtotal: 4_200_000, taxAmount: 462_000, totalAmount: 4_662_000, paidAmount: 0,
        billDate: '2026-05-29', dueDate: '2026-06-28', accountCode: '5101',
        notes: 'Ongkos kirim barang ke pelanggan (mei)',
    },
    {
        billNumber: 'BILL-2026-004', vendorName: 'PT Pilar Logam Sejahtera', supplierInvoiceNumber: 'PL-2026-3311',
        status: 'APPROVED', subtotal: 22_000_000, taxAmount: 2_420_000, totalAmount: 24_420_000, paidAmount: 0,
        billDate: '2026-08-16', dueDate: '2026-09-15', accountCode: '1301',
        notes: 'Pembelian bahan baku logam (stok agustus)',
    },
    {
        billNumber: 'BILL-2026-005', vendorName: 'PT Karya Bangun Persada', supplierInvoiceNumber: 'KB-2026-0717',
        status: 'PAID', subtotal: 15_000_000, taxAmount: 1_650_000, totalAmount: 16_650_000, paidAmount: 16_650_000,
        billDate: '2026-06-10', dueDate: '2026-07-10', accountCode: '5204',
        payAccountCode: '1102', paidDate: '2026-07-08',
        notes: 'Renovasi & perawatan area gudang',
    },
    {
        billNumber: 'BILL-2026-006', vendorName: 'CV Sumber Pangan Nusantara', supplierInvoiceNumber: 'SP-2026-0232',
        status: 'PAID', subtotal: 6_800_000, taxAmount: 748_000, totalAmount: 7_548_000, paidAmount: 7_548_000,
        billDate: '2026-05-21', dueDate: '2026-06-20', accountCode: '5400',
        payAccountCode: '1101', paidDate: '2026-06-18',
        notes: 'Katering kantor & konsumsi rapat bulanan',
    },
    {
        billNumber: 'BILL-2026-007', vendorName: 'PT Cipta Media Kreatif', supplierInvoiceNumber: 'CM-2026-0909',
        status: 'PAID', subtotal: 10_000_000, taxAmount: 1_100_000, totalAmount: 11_100_000, paidAmount: 11_100_000,
        billDate: '2026-07-06', dueDate: '2026-08-05', accountCode: '5301',
        payAccountCode: '1103', paidDate: '2026-08-03',
        notes: 'Jasa iklan digital & produksi konten kuartal III',
    },
];

export interface ExpenseSpec {
    expenseNumber: string;
    category: string;
    description: string;
    amount: number;
    taxAmount: number;
    expenseDate: string;
    paymentMethod: string; // CASH | BANK_TRANSFER | QRIS | CREDIT_CARD
    status: string; // APPROVED | PENDING_APPROVAL
}

export const FINANCE_EXPENSES: ExpenseSpec[] = [
    { expenseNumber: 'EXP-2026-001', category: 'UTILITIES', description: 'Listrik kantor bulan Mei 2026', amount: 1_850_000, taxAmount: 0, expenseDate: '2026-05-05', paymentMethod: 'CASH', status: 'APPROVED' },
    { expenseNumber: 'EXP-2026-002', category: 'UTILITIES', description: 'Listrik & internet bulan Juni 2026', amount: 2_120_000, taxAmount: 0, expenseDate: '2026-06-05', paymentMethod: 'BANK_TRANSFER', status: 'APPROVED' },
    { expenseNumber: 'EXP-2026-003', category: 'UTILITIES', description: 'Air & kebersihan kantor bulan Juli', amount: 980_000, taxAmount: 0, expenseDate: '2026-07-05', paymentMethod: 'CASH', status: 'APPROVED' },
    { expenseNumber: 'EXP-2026-004', category: 'OFFICE', description: 'ATK: tinta printer & kertas A4', amount: 750_000, taxAmount: 0, expenseDate: '2026-05-12', paymentMethod: 'QRIS', status: 'APPROVED' },
    { expenseNumber: 'EXP-2026-005', category: 'OFFICE', description: 'Peralatan kantor (kursi & lemari arsip)', amount: 1_350_000, taxAmount: 0, expenseDate: '2026-08-14', paymentMethod: 'BANK_TRANSFER', status: 'APPROVED' },
    { expenseNumber: 'EXP-2026-006', category: 'TRAVEL', description: 'Perjalanan dinas Jakarta–Bandung', amount: 1_750_000, taxAmount: 0, expenseDate: '2026-06-18', paymentMethod: 'CASH', status: 'APPROVED' },
    { expenseNumber: 'EXP-2026-007', category: 'TRAVEL', description: 'Dinas luar kota Surabaya (tim sales)', amount: 3_200_000, taxAmount: 0, expenseDate: '2026-09-10', paymentMethod: 'CASH', status: 'PENDING_APPROVAL' },
    { expenseNumber: 'EXP-2026-008', category: 'MARKETING', description: 'Iklan sosial media kuartal III', amount: 2_500_000, taxAmount: 0, expenseDate: '2026-05-20', paymentMethod: 'BANK_TRANSFER', status: 'APPROVED' },
    { expenseNumber: 'EXP-2026-009', category: 'MARKETING', description: 'Cetak brosur & banner pameran', amount: 1_450_000, taxAmount: 0, expenseDate: '2026-07-25', paymentMethod: 'CASH', status: 'APPROVED' },
    { expenseNumber: 'EXP-2026-010', category: 'MAINTENANCE', description: 'Servis AC kantor lantai 2', amount: 680_000, taxAmount: 0, expenseDate: '2026-06-28', paymentMethod: 'CASH', status: 'APPROVED' },
    { expenseNumber: 'EXP-2026-011', category: 'MAINTENANCE', description: 'Perawatan jaringan LAN & server', amount: 1_150_000, taxAmount: 0, expenseDate: '2026-08-30', paymentMethod: 'BANK_TRANSFER', status: 'PENDING_APPROVAL' },
    { expenseNumber: 'EXP-2026-012', category: 'OTHER', description: 'Konsumsi rapat koordinasi bulanan', amount: 420_000, taxAmount: 0, expenseDate: '2026-09-20', paymentMethod: 'QRIS', status: 'APPROVED' },
];

// ============================================================
// 6. Dataset statis — AccountingPeriod (B7)
// ============================================================

export interface PeriodSpec {
    name: string;
    startDate: string;
    endDate: string;
    status: string; // CLOSED | OPEN
}

/** 4 periode CLOSED (Mei–Agustus) + 2 OPEN (September–Oktober) — anchor 2026-10-10. */
export const FINANCE_PERIODS: PeriodSpec[] = [
    { name: 'Mei 2026', startDate: '2026-05-01', endDate: '2026-05-31', status: 'CLOSED' },
    { name: 'Juni 2026', startDate: '2026-06-01', endDate: '2026-06-30', status: 'CLOSED' },
    { name: 'Juli 2026', startDate: '2026-07-01', endDate: '2026-07-31', status: 'CLOSED' },
    { name: 'Agustus 2026', startDate: '2026-08-01', endDate: '2026-08-31', status: 'CLOSED' },
    { name: 'September 2026', startDate: '2026-09-01', endDate: '2026-09-30', status: 'OPEN' },
    { name: 'Oktober 2026', startDate: '2026-10-01', endDate: '2026-10-31', status: 'OPEN' },
];

export const CLOSED_MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08'];
export const ALL_SEED_MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];

/** Tanggal anchor deterministik (klasifikasi OVERDUE/SENT & DRAFT threshold). */
export const DEFAULT_ANCHOR_DATE = '2026-10-10';
/** Invoice createdAt ≥ tanggal ini → jurnal berstatus DRAFT (ajarkan alur matching). */
export const DRAFT_JOURNAL_THRESHOLD = '2026-09-20';

// ============================================================
// 7. Generator historis deterministik (B3 — 28 invoice + pembayarannya)
// ============================================================

export interface HistoricalInvoiceItemSpec {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface HistoricalInvoiceSpec {
    invoiceNumber: string;
    createdAt: Date;
    dueDate: Date;
    status: string; // PAID | SENT | OVERDUE
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    totalBeforeTax: number;
    total: number;
    taxCode: string | null;
    notes: string;
    items: HistoricalInvoiceItemSpec[];
}

export interface HistoricalPaymentSpec {
    paymentNumber: string;
    invoiceNumber: string;
    amount: number;
    paymentDate: Date;
    method: string;
    status: string; // COMPLETED | PENDING
    type: 'INCOME';
    notes: string;
}

const PRODUK_DESCRIPTIONS = [
    'Komponen Elektronik Premium',
    'Peralatan Kantor Series X',
    'Sparepart Mesin Unit A',
    'Material Konstruksi Grade B',
    'Aksesoris Produk Tahap 2',
];

const JASA_DESCRIPTIONS = [
    'Jasa Konsultasi Bisnis Bulanan',
    'Jasa Implementasi Modul ERP',
    'Jasa Maintenance Sistem & Support',
];

const METHODS = ['BANK_TRANSFER', 'CASH', 'BANK_TRANSFER', 'E_WALLET'];

/**
 * Membangkitkan 28 invoice + pembayaran historis yang sepenuhnya deterministik
 * (PRNG ber-seed), tersebar Mei–Oktober 2026 untuk tren bulanan 6 bulan.
 * Nomor: INV-2026-021..048 & PAY-2026-016..038 (tidak bentrok dengan seed.ts 001..020 / 001..015).
 */
export function generateHistoricalInvoiceSpecs(): {
    invoices: HistoricalInvoiceSpec[];
    payments: HistoricalPaymentSpec[];
} {
    const rng = mulberry32(20_260_501);
    const anchor = toUtcDate(DEFAULT_ANCHOR_DATE);

    // Jadwal tanggal terbit: 5/bulan Mei–Sep + 3 di awal Okt (28 total).
    const schedule: Array<{ y: number; m: number; d: number }> = [];
    for (let m = 5; m <= 9; m++) {
        for (const d of [3, 8, 13, 18, 24]) schedule.push({ y: 2026, m, d });
    }
    schedule.push({ y: 2026, m: 10, d: 1 }, { y: 2026, m: 10, d: 3 }, { y: 2026, m: 10, d: 7 });

    const invoices: HistoricalInvoiceSpec[] = [];
    const payments: HistoricalPaymentSpec[] = [];
    let paySeq = 16;

    schedule.forEach((s, idx) => {
        const createdAt = new Date(Date.UTC(s.y, s.m - 1, s.d));
        const dueDate = addDays(createdAt, 30);
        const invoiceNumber = `INV-2026-${String(21 + idx).padStart(3, '0')}`;

        // Subtotal deterministik: 2–49 juta, kelipatan 100 ribu.
        const juta = Math.floor(rng() * 48) + 2;
        const ribu = Math.floor(rng() * 10) * 100_000;
        const subtotal = juta * 1_000_000 + ribu;

        const isJasa = idx % 3 === 1;
        const taxRate = idx % 10 === 4 ? 0 : 11; // 3 invoice nol-pajak (idx 4, 14, 24)
        const taxAmount = round2((subtotal * taxRate) / 100);
        const total = round2(subtotal + taxAmount);

        let items: HistoricalInvoiceItemSpec[];
        if (isJasa) {
            const desc = JASA_DESCRIPTIONS[idx % JASA_DESCRIPTIONS.length];
            items = [{ description: desc, quantity: 1, unitPrice: subtotal, total: subtotal }];
        } else {
            const desc = PRODUK_DESCRIPTIONS[idx % PRODUK_DESCRIPTIONS.length];
            const quantity = 1 + (idx % 4) * 5;
            const unitPrice = round2(subtotal / quantity);
            // koreksi rounding ke item terakhir agar jumlah item === subtotal persis
            const lastTotal = round2(subtotal - unitPrice * (quantity - 1));
            items = Array.from({ length: quantity }, (_, q) => ({
                description: `${desc} #${q + 1}`,
                quantity: 1,
                unitPrice: q === quantity - 1 ? lastTotal : unitPrice,
                total: q === quantity - 1 ? lastTotal : unitPrice,
            }));
        }

        const unpaid = idx % 4 === 1; // idx 1,5,9,13,17,21,25 → 7 invoice belum lunas
        const status = unpaid ? (dueDate.getTime() < anchor.getTime() ? 'OVERDUE' : 'SENT') : 'PAID';

        invoices.push({
            invoiceNumber,
            createdAt,
            dueDate,
            status,
            subtotal,
            taxRate,
            taxAmount,
            totalBeforeTax: subtotal,
            total,
            taxCode: taxRate > 0 ? 'PPN-KELUARAN' : null,
            notes: `Invoice penjualan historis (seed demo) — ${periodeName(monthKey(createdAt))}`,
            items,
        });

        if (!unpaid) {
            payments.push({
                paymentNumber: `PAY-2026-${String(paySeq++).padStart(3, '0')}`,
                invoiceNumber,
                amount: total,
                paymentDate: addDays(dueDate, -5),
                method: METHODS[idx % METHODS.length],
                status: 'COMPLETED',
                type: 'INCOME',
                notes: 'Pelunasan invoice historis (seed demo)',
            });
        } else if (idx === 21 || idx === 25) {
            // 2 DP pending untuk skenario alur pembayaran (journal → DRAFT).
            payments.push({
                paymentNumber: `PAY-2026-${String(paySeq++).padStart(3, '0')}`,
                invoiceNumber,
                amount: round2(total * 0.4),
                paymentDate: addDays(createdAt, 7),
                method: 'BANK_TRANSFER',
                status: 'PENDING',
                type: 'INCOME',
                notes: 'DP 40% — menunggu konfirmasi bank',
            });
        }
    });

    return { invoices, payments };
}

/**
 * Pembayaran parsial (B6) untuk invoice EXISTING seed.ts — melengkapi skenario aging/P&L.
 * Nomor PAY-2026-039..041 (setelah pembayaran historis 016..038).
 */
export const FINANCE_PARTIAL_PAYMENTS: Array<{
    paymentNumber: string;
    invoiceNumber: string;
    amount: number;
    paymentDate: string;
    method: string;
    status: string;
    notes: string;
}> = [
        { paymentNumber: 'PAY-2026-039', invoiceNumber: 'INV-2026-001', amount: 4_000_000, paymentDate: '2026-08-15', method: 'BANK_TRANSFER', status: 'COMPLETED', notes: 'DP 50% — pelunasan menyusul' },
        { paymentNumber: 'PAY-2026-040', invoiceNumber: 'INV-2026-008', amount: 20_000_000, paymentDate: '2026-09-05', method: 'BANK_TRANSFER', status: 'COMPLETED', notes: 'Pembayaran parsial tahap 1' },
        { paymentNumber: 'PAY-2026-041', invoiceNumber: 'INV-2026-013', amount: 25_000_000, paymentDate: '2026-09-02', method: 'BANK_TRANSFER', status: 'COMPLETED', notes: 'Pembayaran parsial tahap 1' },
    ];

// ============================================================
// 8. Journal planning — tipe sumber & plan (murni, unit-tested)
// ============================================================

export interface JournalInvoiceSource {
    id: string;
    invoiceNumber: string;
    createdAt: Date;
    dueDate: Date;
    status: string;
    subtotal: number;
    taxAmount: number;
    total: number;
    taxCode?: string | null;
    items?: Array<{ description: string; total: number }>;
}

export interface JournalPaymentSource {
    id: string;
    paymentNumber: string;
    amount: number;
    paymentDate: Date;
    method: string;
    status: string; // COMPLETED | PENDING (FAILED di-skip)
    type: string; // INCOME | EXPENSE
    invoiceId?: string | null;
    invoiceNumber?: string | null;
    notes?: string | null;
}

export interface JournalBillSource {
    id: string;
    billNumber: string;
    vendorName: string;
    status: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount: number;
    billDate: Date;
    dueDate?: Date | null;
    paidDate?: Date | null;
    accountCode: string;
    payAccountCode?: string | null;
}

export interface JournalExpenseSource {
    id: string;
    expenseNumber: string;
    category: string;
    description: string;
    amount: number;
    taxAmount: number;
    totalAmount: number;
    expenseDate: Date;
    paymentMethod: string;
    status: string;
}

export interface JournalPayrollSource {
    period: string; // "YYYY-MM"
    gross: number; // base + allowances + bonus
    net: number;
    deductions: number;
    status: string; // PAID | PROCESSED | PENDING
}

export interface JournalLinePlan {
    accountCode: string;
    debit: number;
    credit: number;
    description?: string;
}

export interface JournalPlan {
    /** Kunci unik per dokumen/sumber — dipakai untuk dedup dan logging. */
    key: string;
    date: Date;
    description: string;
    reference?: string;
    sourceType: string; // manual | invoice | payment | purchase_order | payroll
    sourceId?: string;
    status: 'DRAFT' | 'POSTED';
    lines: JournalLinePlan[];
}

export interface JournalSources {
    invoices: JournalInvoiceSource[];
    payments: JournalPaymentSource[];
    bills: JournalBillSource[];
    expenses: JournalExpenseSource[];
    payroll: JournalPayrollSource[];
}

export interface JournalBuildOptions {
    anchorDate?: Date;
    closedMonths?: string[];
    allMonths?: string[];
    /** Setoran pajak bulanan (PPN) — D Utang Pajak / K Bank Mandiri. */
    taxPaymentAmount?: number;
    /** Biaya admin bank tetap per bulan. */
    bankFeeAmount?: number;
    includeOpeningBalance?: boolean;
}

/** Guard: total debit === total credit (toleransi 0.005). */
export function assertJournalBalanced(plan: JournalPlan): void {
    const totalDebit = round2(plan.lines.reduce((s, l) => s + l.debit, 0));
    const totalCredit = round2(plan.lines.reduce((s, l) => s + l.credit, 0));
    if (Math.abs(totalDebit - totalCredit) > 0.005) {
        throw new Error(
            `Journal plan tidak seimbang (${plan.key}): debit ${totalDebit} ≠ credit ${totalCredit}`
        );
    }
    for (const line of plan.lines) {
        if (line.debit < 0 || line.credit < 0) {
            throw new Error(`Journal plan ${plan.key} memiliki nilai negatif pada akun ${line.accountCode}`);
        }
        if (line.debit > 0 && line.credit > 0) {
            throw new Error(`Journal plan ${plan.key} akun ${line.accountCode} memiliki debit & credit sekaligus`);
        }
    }
}

/**
 * Menyeimbangkan lines: menghitung ulang selisih ke akun penampung.
 * Baris terakhir (akun penampung) disesuaikan agar total debit === total credit.
 */
function balanceLines(key: string, lines: JournalLinePlan[], expectedTotal: number): JournalLinePlan[] {
    const total = round2(
        Math.max(
            expectedTotal,
            lines.reduce((s, l) => s + l.debit, 0),
            lines.reduce((s, l) => s + l.credit, 0)
        )
    );
    let debitSum = round2(lines.reduce((s, l) => s + l.debit, 0));
    let creditSum = round2(lines.reduce((s, l) => s + l.credit, 0));
    const diff = round2(debitSum - creditSum);
    if (Math.abs(diff) >= 0.005) {
        if (diff > 0) {
            lines.push({ accountCode: '4101', debit: 0, credit: diff, description: 'Penyesuaian pembulatan' });
            creditSum = round2(creditSum + diff);
        } else {
            const deficit = round2(-diff);
            const ar = lines.find((l) => l.accountCode === '1201' && l.debit > 0);
            if (ar) ar.debit = round2(ar.debit + deficit);
            else lines.push({ accountCode: '1201', debit: deficit, credit: 0, description: 'Penyesuaian pembulatan' });
            debitSum = round2(debitSum + deficit);
        }
    }
    void total;
    const plan: JournalPlan = { key, date: new Date(), description: '', status: 'POSTED', sourceType: 'manual', lines };
    assertJournalBalanced(plan);
    return lines;
}

/** Saldo awal demo (Mei 2026) — aset, kewajiban, dan modal (plug) yang seimbang. */
export const OPENING_BALANCE_LINES: JournalLinePlan[] = [
    { accountCode: '1101', debit: 45_000_000, credit: 0, description: 'Kas perusahaan (saldo awal)' },
    { accountCode: '1102', debit: 125_000_000, credit: 0, description: 'Bank BCA (saldo awal)' },
    { accountCode: '1103', debit: 78_500_000, credit: 0, description: 'Bank Mandiri (saldo awal)' },
    { accountCode: '1201', debit: 85_000_000, credit: 0, description: 'Piutang dagang (saldo awal)' },
    { accountCode: '1202', debit: 12_000_000, credit: 0, description: 'Piutang pajak (saldo awal)' },
    { accountCode: '1301', debit: 250_000_000, credit: 0, description: 'Persediaan (saldo awal)' },
    { accountCode: '1401', debit: 85_000_000, credit: 0, description: 'Peralatan kantor (saldo awal)' },
    { accountCode: '1402', debit: 350_000_000, credit: 0, description: 'Kendaraan (saldo awal)' },
    { accountCode: '1403', debit: 0, credit: 125_000_000, description: 'Akumulasi depresiasi (saldo awal)' },
    { accountCode: '2101', debit: 0, credit: 65_000_000, description: 'Utang dagang (saldo awal)' },
    { accountCode: '2102', debit: 0, credit: 8_500_000, description: 'Utang pajak (saldo awal)' },
    { accountCode: '2103', debit: 0, credit: 22_000_000, description: 'Utang gaji (saldo awal)' },
    { accountCode: '2201', debit: 0, credit: 500_000_000, description: 'Utang bank (saldo awal)' },
    { accountCode: '3100', debit: 0, credit: 310_000_000, description: 'Modal disetor (saldo awal — plug)' },
];

function invoiceRevenueLines(inv: JournalInvoiceSource): JournalLinePlan[] {
    let produk = 0;
    let jasa = 0;
    for (const item of inv.items ?? []) {
        const t = round2(Number(item.total));
        if (isJasaDescription(item.description)) jasa = round2(jasa + t);
        else produk = round2(produk + t);
    }
    if (produk === 0 && jasa === 0) produk = round2(inv.subtotal);

    const tax = round2(inv.taxAmount);
    const total = round2(inv.total > 0 ? inv.total : inv.subtotal + tax);

    const lines: JournalLinePlan[] = [
        { accountCode: '1201', debit: total, credit: 0, description: `Piutang ${inv.invoiceNumber}` },
    ];
    if (produk > 0) lines.push({ accountCode: '4101', debit: 0, credit: produk, description: 'Penjualan produk' });
    if (jasa > 0) lines.push({ accountCode: '4102', debit: 0, credit: jasa, description: 'Penjualan jasa' });
    if (tax > 0) {
        lines.push({
            accountCode: '2102',
            debit: 0,
            credit: tax,
            description: `PPN Keluaran (${inv.taxCode ?? 'PPN-KELUARAN'})`,
        });
    }
    return balanceLines(`invoice:${inv.invoiceNumber}`, lines, total);
}

/**
 * Membangun SEMUA rencana jurnal Finance dari sumber transaksi — FUNGSI MURNI.
 * Setiap plan dijamin seimbang (assertJournalBalanced). Deterministik.
 *
 * Komposisi:
 *  - Saldo awal 1 entry
 *  - Invoice (skip DRAFT/CANCELLED) → jurnal pendapatan (DRAFT bila tanggal ≥ threshold)
 *  - Pembayaran INCOME → jurnal penerimaan; EXPENSE → jurnal pengeluaran (PENDING → DRAFT)
 *  - Bill → jurnal utang usaha + jurnal pembayaran (bila PAID)
 *  - Expense → jurnal beban (PENDING_APPROVAL → DRAFT)
 *  - Payroll per periode → jurnal gaji (PENDING → DRAFT)
 *  - Biaya admin bank bulanan + setoran pajak bulanan
 *  - Closing per bulan CLOSED: pendapatan & beban → Laba Berjalan (3300)
 */
export function buildFinanceJournalPlans(
    sources: JournalSources,
    options: JournalBuildOptions = {}
): { plans: JournalPlan[]; warnings: string[] } {
    const anchor = options.anchorDate ? toUtcDate(options.anchorDate) : toUtcDate(DEFAULT_ANCHOR_DATE);
    const draftThreshold = toUtcDate(DRAFT_JOURNAL_THRESHOLD);
    const closedMonths = options.closedMonths ?? CLOSED_MONTHS;
    const allMonths = options.allMonths ?? ALL_SEED_MONTHS;
    const bankFeeAmount = options.bankFeeAmount ?? 200_000;
    const taxPaymentAmount = options.taxPaymentAmount ?? 2_500_000;

    const plans: JournalPlan[] = [];
    const warnings: string[] = [];

    // 8.0 Saldo awal
    if (options.includeOpeningBalance !== false) {
        const openingDate = toUtcDate('2026-05-01');
        plans.push({
            key: 'opening:2026',
            date: openingDate,
            description: 'Saldo awal periode demo (Mei 2026)',
            reference: 'OPENING-2026-05',
            sourceType: 'manual',
            sourceId: 'opening:2026',
            status: 'POSTED',
            lines: OPENING_BALANCE_LINES.map((l) => ({ ...l })),
        });
    }

    // 8.1 Pendapatan dari invoice
    const revenueByMonth = new Map<string, { produk: number; jasa: number; total: number }>();
    const sortedInvoices = [...sources.invoices].sort((a, b) =>
        a.invoiceNumber.localeCompare(b.invoiceNumber)
    );
    for (const inv of sortedInvoices) {
        if (inv.status === 'DRAFT' || inv.status === 'CANCELLED') continue; // belum diakui
        const issueDate = deriveInvoiceDate(inv.createdAt, inv.dueDate);
        const status: 'POSTED' | 'DRAFT' = issueDate.getTime() >= draftThreshold.getTime() ? 'DRAFT' : 'POSTED';
        plans.push({
            key: `invoice:${inv.invoiceNumber}`,
            date: issueDate,
            description: `Penjualan barang/jasa — Invoice ${inv.invoiceNumber}`,
            reference: inv.invoiceNumber,
            sourceType: 'invoice',
            sourceId: inv.id,
            status,
            lines: invoiceRevenueLines(inv),
        });

        const mk = monthKey(issueDate);
        const bucket = revenueByMonth.get(mk) ?? { produk: 0, jasa: 0, total: 0 };
        for (const item of inv.items ?? []) {
            const t = round2(Number(item.total));
            if (isJasaDescription(item.description)) bucket.jasa = round2(bucket.jasa + t);
            else bucket.produk = round2(bucket.produk + t);
        }
        if ((inv.items ?? []).length === 0) bucket.produk = round2(bucket.produk + inv.subtotal);
        bucket.total = round2(bucket.total + round2(inv.total > 0 ? inv.total : inv.subtotal + inv.taxAmount));
        revenueByMonth.set(mk, bucket);
    }

    // 8.2 Pembayaran
    const sortedPayments = [...sources.payments].sort((a, b) =>
        a.paymentNumber.localeCompare(b.paymentNumber)
    );
    for (const p of sortedPayments) {
        if (p.status === 'FAILED') continue;
        const amount = round2(p.amount);
        if (amount <= 0) continue;
        const jeStatus: 'POSTED' | 'DRAFT' = p.status === 'PENDING' ? 'DRAFT' : 'POSTED';
        const cashCode = paymentCashAccountCode(p.method);

        if (p.type === 'INCOME') {
            const creditAccount = p.invoiceId ? '1201' : '4101';
            const lines = balanceLines(
                `payment:${p.paymentNumber}`,
                [
                    { accountCode: cashCode, debit: amount, credit: 0, description: `Penerimaan ${p.paymentNumber}` },
                    {
                        accountCode: creditAccount,
                        debit: 0,
                        credit: amount,
                        description: p.invoiceNumber ? `Pelunasan ${p.invoiceNumber}` : 'Pendapatan langsung',
                    },
                ],
                amount
            );
            plans.push({
                key: `payment:${p.paymentNumber}`,
                date: toUtcDate(p.paymentDate),
                description: p.invoiceNumber
                    ? `Penerimaan pembayaran — ${p.invoiceNumber}`
                    : `Penerimaan pembayaran — ${p.paymentNumber}`,
                reference: p.paymentNumber,
                sourceType: 'payment',
                sourceId: p.id,
                status: jeStatus,
                lines,
            });
        } else {
            // Pengeluaran tanpa tagihan terasosiasi → persediaan/pembelian.
            const lines = balanceLines(
                `payment:${p.paymentNumber}`,
                [
                    { accountCode: '1301', debit: amount, credit: 0, description: `Pengeluaran ${p.paymentNumber}` },
                    { accountCode: cashCode, debit: 0, credit: amount, description: `Pembayaran via ${p.method}` },
                ],
                amount
            );
            plans.push({
                key: `payment:${p.paymentNumber}`,
                date: toUtcDate(p.paymentDate),
                description: `Pengeluaran kas/bank — ${p.paymentNumber}`,
                reference: p.paymentNumber,
                sourceType: 'payment',
                sourceId: p.id,
                status: jeStatus,
                lines,
            });
        }
    }

    // 8.3 Bill (utang usaha) + pembayaran bill
    const expenseBucketsByMonth = new Map<string, Map<string, number>>();
    const addExpenseBucket = (month: string, accountCode: string, amount: number): void => {
        if (!accountCode.startsWith('5') || amount <= 0) return; // hanya akun tipe EXPENSE
        const m = expenseBucketsByMonth.get(month) ?? new Map<string, number>();
        m.set(accountCode, round2((m.get(accountCode) ?? 0) + amount));
        expenseBucketsByMonth.set(month, m);
    };

    const sortedBills = [...sources.bills].sort((a, b) => a.billNumber.localeCompare(b.billNumber));
    for (const bill of sortedBills) {
        if (bill.status === 'DRAFT' || bill.status === 'CANCELLED') continue;
        const billDate = deriveInvoiceDate(bill.billDate, bill.dueDate ?? bill.billDate);
        const subtotal = round2(bill.subtotal);
        const tax = round2(bill.taxAmount);
        const total = round2(bill.totalAmount > 0 ? bill.totalAmount : subtotal + tax);
        const lines: JournalLinePlan[] = [
            { accountCode: bill.accountCode, debit: subtotal, credit: 0, description: `Beban/persediaan — ${bill.vendorName}` },
        ];
        if (tax > 0) lines.push({ accountCode: '1202', debit: tax, credit: 0, description: 'PPN Masukan' });
        lines.push({ accountCode: '2101', debit: 0, credit: total, description: `Utang usaha ${bill.vendorName}` });

        const billStatus: 'POSTED' | 'DRAFT' = bill.status === 'PENDING_APPROVAL' ? 'DRAFT' : 'POSTED';
        plans.push({
            key: `bill:${bill.billNumber}`,
            date: billDate,
            description: `Pencatatan utang usaha — ${bill.vendorName} (${bill.billNumber})`,
            reference: bill.billNumber,
            sourceType: 'manual',
            sourceId: `bill:${bill.id}`,
            status: billStatus,
            lines: balanceLines(`bill:${bill.billNumber}`, lines, total),
        });
        addExpenseBucket(monthKey(billDate), bill.accountCode, subtotal);

        if (round2(bill.paidAmount) > 0 && bill.paidDate) {
            const payAmount = round2(bill.paidAmount);
            const payCode = bill.payAccountCode ?? '1102';
            plans.push({
                key: `billpay:${bill.billNumber}`,
                date: toUtcDate(bill.paidDate),
                description: `Pembayaran vendor — ${bill.vendorName} (${bill.billNumber})`,
                reference: bill.billNumber,
                sourceType: 'manual',
                sourceId: `billpay:${bill.id}`,
                status: 'POSTED',
                lines: balanceLines(
                    `billpay:${bill.billNumber}`,
                    [
                        { accountCode: '2101', debit: payAmount, credit: 0, description: `Pelunasan ${bill.billNumber}` },
                        { accountCode: payCode, debit: 0, credit: payAmount, description: `Pembayaran via ${payCode}` },
                    ],
                    payAmount
                ),
            });
        }
    }

    // 8.4 Expense
    const sortedExpenses = [...sources.expenses].sort((a, b) => a.expenseNumber.localeCompare(b.expenseNumber));
    for (const exp of sortedExpenses) {
        if (exp.status === 'REJECTED' || exp.status === 'DRAFT') continue;
        const amount = round2(exp.amount);
        const tax = round2(exp.taxAmount);
        const total = round2(exp.totalAmount > 0 ? exp.totalAmount : amount + tax);
        if (total <= 0) continue;
        const accountCode = EXPENSE_CATEGORY_ACCOUNT[exp.category] ?? '5400';
        const cashCode = paymentCashAccountCode(exp.paymentMethod);
        const lines: JournalLinePlan[] = [
            { accountCode, debit: amount, credit: 0, description: exp.description },
        ];
        if (tax > 0) lines.push({ accountCode: '1202', debit: tax, credit: 0, description: 'PPN Masukan' });
        lines.push({ accountCode: cashCode, debit: 0, credit: total, description: `Pembayaran via ${exp.paymentMethod}` });

        plans.push({
            key: `expense:${exp.expenseNumber}`,
            date: toUtcDate(exp.expenseDate),
            description: `Beban ${exp.category.toLowerCase()} — ${exp.description}`,
            reference: exp.expenseNumber,
            sourceType: 'manual',
            sourceId: `expense:${exp.id}`,
            status: exp.status === 'PENDING_APPROVAL' ? 'DRAFT' : 'POSTED',
            lines: balanceLines(`expense:${exp.expenseNumber}`, lines, total),
        });
        if (exp.status === 'APPROVED') {
            addExpenseBucket(monthKey(toUtcDate(exp.expenseDate)), accountCode, amount);
        }
    }

    // 8.5 Payroll per periode
    const sortedPayroll = [...sources.payroll].sort((a, b) => a.period.localeCompare(b.period));
    for (const pr of sortedPayroll) {
        const gross = round2(pr.gross > 0 ? pr.gross : pr.net + pr.deductions);
        const net = round2(pr.net);
        const deductions = round2(pr.deductions);
        if (gross <= 0) continue;
        const [y, m] = pr.period.split('-').map(Number);
        const lines: JournalLinePlan[] = [
            { accountCode: '5201', debit: gross, credit: 0, description: `Beban gaji ${periodeName(pr.period)}` },
        ];
        if (net > 0) lines.push({ accountCode: '1101', debit: 0, credit: net, description: 'Penggajian karyawan' });
        if (deductions > 0) {
            lines.push({ accountCode: '2102', debit: 0, credit: deductions, description: 'PPh 21 & potongan' });
        }
        plans.push({
            key: `payroll:${pr.period}`,
            date: lastDayOfMonth(y, m),
            description: `Penggajian periode ${periodeName(pr.period)}`,
            reference: `PAYROLL-${pr.period}`,
            sourceType: 'payroll',
            sourceId: pr.period,
            status: pr.status === 'PAID' ? 'POSTED' : 'DRAFT',
            lines: balanceLines(`payroll:${pr.period}`, lines, gross),
        });
        addExpenseBucket(pr.period, '5201', gross);
    }

    // 8.6 Biaya admin bank bulanan + setoran pajak
    for (const month of allMonths) {
        const [y, m] = month.split('-').map(Number);
        plans.push({
            key: `bankfee:${month}`,
            date: lastDayOfMonth(y, m),
            description: `Biaya admin bank — ${periodeName(month)}`,
            reference: `BANKFEE-${month}`,
            sourceType: 'manual',
            sourceId: `bankfee:${month}`,
            status: 'POSTED',
            lines: balanceLines(
                `bankfee:${month}`,
                [
                    { accountCode: '5403', debit: bankFeeAmount, credit: 0, description: 'Biaya admin bank' },
                    { accountCode: '1102', debit: 0, credit: bankFeeAmount, description: 'Potongan bank BCA' },
                ],
                bankFeeAmount
            ),
        });
        addExpenseBucket(month, '5403', bankFeeAmount);
    }

    const taxPayMonths = allMonths.filter((mo) => closedMonths.includes(mo));
    for (const month of taxPayMonths) {
        const [y, m] = month.split('-').map(Number);
        const payDate = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 15)); // tgl 15 bulan berikutnya
        plans.push({
            key: `taxpay:${month}`,
            date: payDate,
            description: `Setoran pajak (PPN) — ${periodeName(month)}`,
            reference: `TAXPAY-${month}`,
            sourceType: 'manual',
            sourceId: `taxpay:${month}`,
            status: 'POSTED',
            lines: balanceLines(
                `taxpay:${month}`,
                [
                    { accountCode: '2102', debit: taxPaymentAmount, credit: 0, description: 'Setoran PPN' },
                    { accountCode: '1103', debit: 0, credit: taxPaymentAmount, description: 'Pembayaran via Bank Mandiri' },
                ],
                taxPaymentAmount
            ),
        });
    }

    // 8.7 Closing per bulan CLOSED
    for (const month of closedMonths) {
        const [y, m] = month.split('-').map(Number);
        const rev = revenueByMonth.get(month);
        if (rev && rev.total > 0) {
            const lines: JournalLinePlan[] = [];
            if (rev.produk > 0) {
                lines.push({ accountCode: '4101', debit: rev.produk, credit: 0, description: 'Close pendapatan produk' });
            }
            if (rev.jasa > 0) {
                lines.push({ accountCode: '4102', debit: rev.jasa, credit: 0, description: 'Close pendapatan jasa' });
            }
            lines.push({ accountCode: '3300', debit: 0, credit: rev.total, description: 'Laba periode berjalan' });
            plans.push({
                key: `closing:${month}:rev`,
                date: lastDayOfMonth(y, m),
                description: `Closing pendapatan — ${periodeName(month)}`,
                reference: `CLOSING-${month}-REV`,
                sourceType: 'manual',
                sourceId: `closing:${month}:rev`,
                status: 'POSTED',
                lines: balanceLines(`closing:${month}:rev`, lines, rev.total),
            });
        }

        const expMap = expenseBucketsByMonth.get(month);
        if (expMap && expMap.size > 0) {
            const entries = [...expMap.entries()].filter(([, v]) => v > 0);
            const expTotal = round2(entries.reduce((s, [, v]) => s + v, 0));
            if (expTotal > 0) {
                const lines: JournalLinePlan[] = [
                    { accountCode: '3300', debit: expTotal, credit: 0, description: 'Beban periode berjalan' },
                ];
                for (const [code, v] of entries) {
                    lines.push({ accountCode: code, debit: 0, credit: v, description: `Close beban ${code}` });
                }
                plans.push({
                    key: `closing:${month}:exp`,
                    date: lastDayOfMonth(y, m),
                    description: `Closing beban — ${periodeName(month)}`,
                    reference: `CLOSING-${month}-EXP`,
                    sourceType: 'manual',
                    sourceId: `closing:${month}:exp`,
                    status: 'POSTED',
                    lines: balanceLines(`closing:${month}:exp`, lines, expTotal),
                });
            }
        }
    }

    // Validasi global: SEMUA plan wajib seimbang.
    for (const plan of plans) assertJournalBalanced(plan);

    void anchor;
    return { plans, warnings };
}

/**
 * Ringkasan periode (closeSummary AccountingPeriod) — FUNGSI MURNI.
 * { totalRevenue, totalExpenses, netIncome } per bulan dari dokumen sumber.
 */
export function computePeriodSummaries(
    sources: JournalSources,
    months: string[] = FINANCE_PERIODS.map((p) => p.startDate.slice(0, 7))
): Record<string, { totalRevenue: number; totalExpenses: number; netIncome: number }> {
    const summaries: Record<string, { totalRevenue: number; totalExpenses: number; netIncome: number }> = {};
    for (const month of months) {
        summaries[month] = { totalRevenue: 0, totalExpenses: 0, netIncome: 0 };
    }
    const add = (month: string, field: 'totalRevenue' | 'totalExpenses', value: number): void => {
        const s = summaries[month];
        if (!s) return;
        s[field] = round2(s[field] + value);
    };

    for (const inv of sources.invoices) {
        if (inv.status === 'DRAFT' || inv.status === 'CANCELLED') continue;
        add(monthKey(deriveInvoiceDate(inv.createdAt, inv.dueDate)), 'totalRevenue', round2(inv.total > 0 ? inv.total : inv.subtotal + inv.taxAmount));
    }
    for (const bill of sources.bills) {
        if (bill.status === 'DRAFT' || bill.status === 'CANCELLED') continue;
        if (bill.accountCode.startsWith('5')) {
            add(monthKey(deriveInvoiceDate(bill.billDate, bill.dueDate ?? bill.billDate)), 'totalExpenses', round2(bill.subtotal));
        }
    }
    for (const exp of sources.expenses) {
        if (exp.status !== 'APPROVED' && exp.status !== 'PENDING_APPROVAL') continue;
        add(monthKey(toUtcDate(exp.expenseDate)), 'totalExpenses', round2(exp.amount));
    }
    for (const pr of sources.payroll) {
        add(pr.period, 'totalExpenses', round2(pr.gross > 0 ? pr.gross : pr.net + pr.deductions));
    }
    for (const month of Object.keys(summaries)) {
        summaries[month].netIncome = round2(summaries[month].totalRevenue - summaries[month].totalExpenses);
    }
    return summaries;
}

// ============================================================
// 9. Seeder (idempotent) — seedFinanceData
// ============================================================

export interface SeedFinanceOptions {
    tenantId: string;
    createdBy: string;
    /** Prefix entryNumber — default diturunkan dari slug tenant. */
    tenantPrefix?: string;
    /** Tanggal anchor deterministik (default 2026-10-10). */
    anchorDate?: string;
    /** Buat 28 invoice + pembayaran historis (default true). */
    includeHistoricalDocs?: boolean;
}

export interface SeedFinanceResult {
    taxRatesCreated: number;
    coaAccountsCreated: number;
    periodsCreated: number;
    historicalInvoicesCreated: number;
    historicalPaymentsCreated: number;
    billsCreated: number;
    expensesCreated: number;
    journalEntriesCreated: number;
    journalItemsCreated: number;
    journalEntriesSkipped: number;
    /** Peringatan non-fatal dari pembangunan rencana jurnal (debugging). */
    warnings: string[];
}

/** Upsert-by-code TaxRate (B1). Aman dipanggil lebih awal oleh loader mana pun. */
export async function ensureTaxRates(
    db: Prisma.TransactionClient,
    tenantId: string
): Promise<Array<{ code: string; rate: number; type: string }>> {
    const created: Array<{ code: string; rate: number; type: string }> = [];
    for (const spec of FINANCE_TAX_RATES) {
        const existing = await db.taxRate.findUnique({
            where: { tenantId_code: { tenantId, code: spec.code } },
        });
        if (existing) {
            created.push({ code: existing.code, rate: Number(existing.rate), type: existing.type });
            continue;
        }
        const row = await db.taxRate.create({
            data: {
                tenantId,
                name: spec.name,
                code: spec.code,
                rate: spec.rate,
                type: spec.type,
                isActive: true,
                isDefault: spec.isDefault,
            },
        });
        created.push({ code: row.code, rate: Number(row.rate), type: row.type });
    }
    return created;
}

async function ensureCoaAccounts(
    db: Prisma.TransactionClient,
    tenantId: string
): Promise<Map<string, string>> {
    const codeToId = new Map<string, string>();
    for (const spec of FINANCE_COA_ACCOUNTS) {
        const existing = await db.coAAccount.findUnique({
            where: { tenantId_code: { tenantId, code: spec.code } },
        });
        if (existing) {
            codeToId.set(spec.code, existing.id);
            continue;
        }
        const parentId = spec.parentCode ? codeToId.get(spec.parentCode) ?? null : null;
        const row = await db.coAAccount.create({
            data: {
                tenantId,
                code: spec.code,
                name: spec.name,
                type: spec.type,
                parentId,
                balance: spec.balance,
                isActive: true,
            },
        });
        codeToId.set(spec.code, row.id);
    }
    return codeToId;
}

async function deriveTenantPrefix(db: Prisma.TransactionClient, tenantId: string): Promise<string> {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
    return generateTenantPrefix(tenant?.slug ?? 'demo');
}

/**
 * Seeder utama Finance P0 — idempotent, deterministik, dijamin seimbang.
 * Panggil SETELAH data transaksi dasar (invoice/bill dsb.) tersedia agar jurnal
 * mencakup seluruh dokumen tenant.
 */
export async function seedFinanceData(
    db: Prisma.TransactionClient,
    options: SeedFinanceOptions
): Promise<SeedFinanceResult> {
    const { tenantId, createdBy } = options;
    const anchorDate = toUtcDate(options.anchorDate ?? DEFAULT_ANCHOR_DATE);
    const tenantPrefix = options.tenantPrefix ?? (await deriveTenantPrefix(db, tenantId));

    const result: SeedFinanceResult = {
        taxRatesCreated: 0,
        coaAccountsCreated: 0,
        periodsCreated: 0,
        historicalInvoicesCreated: 0,
        historicalPaymentsCreated: 0,
        billsCreated: 0,
        expensesCreated: 0,
        journalEntriesCreated: 0,
        journalItemsCreated: 0,
        journalEntriesSkipped: 0,
        warnings: [],
    };

    // 1) TaxRate (B1)
    await ensureTaxRates(db, tenantId);

    // 2) CoA (B2)
    const codeToId = await ensureCoaAccounts(db, tenantId);

    // 3) Dokumen historis (B3 pendukung) — deterministik
    if (options.includeHistoricalDocs !== false) {
        const { invoices, payments } = generateHistoricalInvoiceSpecs();
        for (const inv of invoices) {
            const existing = await db.invoice.findUnique({
                where: { tenantId_invoiceNumber: { tenantId, invoiceNumber: inv.invoiceNumber } },
            });
            if (existing) continue;
            await db.invoice.create({
                data: {
                    tenantId,
                    invoiceNumber: inv.invoiceNumber,
                    status: inv.status,
                    dueDate: inv.dueDate,
                    subtotal: inv.subtotal,
                    taxRate: inv.taxRate,
                    taxAmount: inv.taxAmount,
                    taxCode: inv.taxCode,
                    totalBeforeTax: inv.totalBeforeTax,
                    total: inv.total,
                    notes: inv.notes,
                    createdAt: inv.createdAt,
                    items: { create: inv.items },
                },
            });
            result.historicalInvoicesCreated += 1;
        }
        for (const p of payments) {
            const existing = await db.payment.findUnique({
                where: { tenantId_paymentNumber: { tenantId, paymentNumber: p.paymentNumber } },
            });
            if (existing) continue;
            const inv = await db.invoice.findUnique({
                where: { tenantId_invoiceNumber: { tenantId, invoiceNumber: p.invoiceNumber } },
                select: { id: true },
            });
            await db.payment.create({
                data: {
                    tenantId,
                    paymentNumber: p.paymentNumber,
                    amount: p.amount,
                    paymentDate: p.paymentDate,
                    method: p.method,
                    status: p.status,
                    notes: p.notes,
                    type: p.type,
                    invoiceId: inv?.id ?? null,
                    createdAt: p.paymentDate,
                },
            });
            result.historicalPaymentsCreated += 1;
        }
    }

    // 3b) Pembayaran parsial (B6)
    for (const p of FINANCE_PARTIAL_PAYMENTS) {
        const existing = await db.payment.findUnique({
            where: { tenantId_paymentNumber: { tenantId, paymentNumber: p.paymentNumber } },
        });
        if (existing) continue;
        const inv = await db.invoice.findUnique({
            where: { tenantId_invoiceNumber: { tenantId, invoiceNumber: p.invoiceNumber } },
            select: { id: true },
        });
        if (!inv) continue; // invoice induk tidak ada (tenant demo berbeda) — skip dengan aman
        await db.payment.create({
            data: {
                tenantId,
                paymentNumber: p.paymentNumber,
                amount: p.amount,
                paymentDate: toUtcDate(p.paymentDate),
                method: p.method,
                status: p.status,
                notes: p.notes,
                type: 'INCOME',
                invoiceId: inv.id,
                createdAt: toUtcDate(p.paymentDate),
            },
        });
        result.historicalPaymentsCreated += 1;
    }

    // 4) Bill (B4)
    for (const b of FINANCE_BILLS) {
        const existing = await db.bill.findUnique({
            where: { tenantId_billNumber: { tenantId, billNumber: b.billNumber } },
        });
        if (existing) continue;
        await db.bill.create({
            data: {
                tenantId,
                billNumber: b.billNumber,
                vendorName: b.vendorName,
                invoiceNumber: b.supplierInvoiceNumber,
                status: b.status,
                subtotal: b.subtotal,
                taxAmount: b.taxAmount,
                totalAmount: b.totalAmount,
                paidAmount: b.paidAmount,
                dueDate: toUtcDate(b.dueDate),
                notes: b.notes,
                createdBy,
                approvedBy: b.status === 'APPROVED' || b.status === 'PAID' ? createdBy : null,
                approvedAt: b.status === 'APPROVED' || b.status === 'PAID' ? toUtcDate(b.dueDate) : null,
                createdAt: toUtcDate(b.billDate),
            },
        });
        result.billsCreated += 1;
    }

    // 5) Expense (B5)
    for (const e of FINANCE_EXPENSES) {
        const existing = await db.expense.findUnique({
            where: { tenantId_expenseNumber: { tenantId, expenseNumber: e.expenseNumber } },
        });
        if (existing) continue;
        await db.expense.create({
            data: {
                tenantId,
                expenseNumber: e.expenseNumber,
                category: e.category,
                description: e.description,
                amount: e.amount,
                taxAmount: e.taxAmount,
                totalAmount: round2(e.amount + e.taxAmount),
                expenseDate: toUtcDate(e.expenseDate),
                paymentMethod: e.paymentMethod,
                status: e.status,
                approvedBy: e.status === 'APPROVED' ? createdBy : null,
                approvedAt: e.status === 'APPROVED' ? toUtcDate(e.expenseDate) : null,
                createdBy,
                createdAt: toUtcDate(e.expenseDate),
            },
        });
        result.expensesCreated += 1;
    }

    // 6) Baca sumber transaksi lengkap dari DB
    const invoiceRows = await db.invoice.findMany({
        where: { tenantId, deletedAt: null },
        include: { items: { select: { description: true, total: true } } },
    });
    const invoiceSources: JournalInvoiceSource[] = invoiceRows.map((row) => ({
        id: row.id,
        invoiceNumber: row.invoiceNumber,
        createdAt: row.createdAt,
        dueDate: row.dueDate,
        status: row.status,
        subtotal: Number(row.subtotal),
        taxAmount: Number(row.taxAmount),
        total: Number(row.total),
        taxCode: row.taxCode,
        items: row.items.map((it) => ({ description: it.description, total: Number(it.total) })),
    }));

    const paymentRows = await db.payment.findMany({
        where: { tenantId, deletedAt: null, status: { in: ['COMPLETED', 'PENDING'] } },
        include: { invoice: { select: { id: true, invoiceNumber: true } } },
    });
    const paymentSources: JournalPaymentSource[] = paymentRows.map((row) => ({
        id: row.id,
        paymentNumber: row.paymentNumber,
        amount: Number(row.amount),
        paymentDate: row.paymentDate,
        method: row.method,
        status: row.status,
        type: row.type,
        invoiceId: row.invoice?.id ?? null,
        invoiceNumber: row.invoice?.invoiceNumber ?? null,
        notes: row.notes,
    }));

    const billRows = await db.bill.findMany({ where: { tenantId, deletedAt: null } });
    const billMetaByNumber = new Map(FINANCE_BILLS.map((b) => [b.billNumber, b]));
    const billSources: JournalBillSource[] = billRows.map((row) => {
        const meta = billMetaByNumber.get(row.billNumber);
        return {
            id: row.id,
            billNumber: row.billNumber,
            vendorName: row.vendorName,
            status: row.status,
            subtotal: Number(row.subtotal),
            taxAmount: Number(row.taxAmount),
            totalAmount: Number(row.totalAmount),
            paidAmount: Number(row.paidAmount),
            billDate: deriveInvoiceDate(row.createdAt, row.dueDate ?? row.createdAt),
            dueDate: row.dueDate,
            paidDate: meta?.paidDate ? toUtcDate(meta.paidDate) : null,
            accountCode: meta?.accountCode ?? '5400',
            payAccountCode: meta?.payAccountCode ?? null,
        };
    });

    const expenseRows = await db.expense.findMany({ where: { tenantId, deletedAt: null } });
    const expenseSources: JournalExpenseSource[] = expenseRows.map((row) => ({
        id: row.id,
        expenseNumber: row.expenseNumber,
        category: row.category,
        description: row.description,
        amount: Number(row.amount),
        taxAmount: Number(row.taxAmount),
        totalAmount: Number(row.totalAmount),
        expenseDate: row.expenseDate,
        paymentMethod: row.paymentMethod,
        status: row.status,
    }));

    const payrollRows = await db.payrollRecord.findMany({
        where: { tenantId },
        select: {
            period: true,
            status: true,
            baseSalary: true,
            allowances: true,
            deductions: true,
            bonus: true,
            netSalary: true,
        },
    });
    const payrollMap = new Map<string, { period: string; gross: number; net: number; deductions: number; status: string }>();
    for (const row of payrollRows) {
        const agg = payrollMap.get(row.period) ?? {
            period: row.period,
            gross: 0,
            net: 0,
            deductions: 0,
            status: row.status,
        };
        agg.gross = round2(agg.gross + Number(row.baseSalary) + Number(row.allowances) + Number(row.bonus));
        agg.net = round2(agg.net + Number(row.netSalary));
        agg.deductions = round2(agg.deductions + Number(row.deductions));
        if (row.status === 'PAID') agg.status = 'PAID';
        payrollMap.set(row.period, agg);
    }
    const payrollSources = [...payrollMap.values()];

    const sources: JournalSources = {
        invoices: invoiceSources,
        payments: paymentSources,
        bills: billSources,
        expenses: expenseSources,
        payroll: payrollSources,
    };

    // 7) Bangun rencana jurnal (murni) + nomori deterministik per bulan
    const { plans, warnings } = buildFinanceJournalPlans(sources, { anchorDate });
    result.warnings = warnings;
    const sortedPlans = [...plans].sort(
        (a, b) => a.date.getTime() - b.date.getTime() || a.key.localeCompare(b.key)
    );

    // 8) Insert idempotent — guard ganda: entryNumber (global unique) + (tenantId, sourceType, sourceId, date)
    const seqByMonth = new Map<string, number>();
    for (const plan of sortedPlans) {
        const yyyymm = yyyymmOf(plan.date);
        const seq = (seqByMonth.get(yyyymm) ?? 0) + 1;
        seqByMonth.set(yyyymm, seq);
        const entryNumber = generateEntryNumber(tenantPrefix, yyyymm, seq);

        const dup = await db.journalEntry.findFirst({
            where: { tenantId, sourceType: plan.sourceType, sourceId: plan.sourceId ?? null, date: plan.date },
            select: { id: true },
        });
        if (dup) {
            result.journalEntriesSkipped += 1;
            continue;
        }
        const byNumber = await db.journalEntry.findUnique({ where: { entryNumber } });
        if (byNumber) {
            result.journalEntriesSkipped += 1;
            continue;
        }

        const totalDebit = round2(plan.lines.reduce((s, l) => s + l.debit, 0));
        const totalCredit = round2(plan.lines.reduce((s, l) => s + l.credit, 0));
        if (Math.abs(totalDebit - totalCredit) > 0.005) {
            throw new Error(`Refuse to insert unbalanced journal ${plan.key}: ${totalDebit} ≠ ${totalCredit}`);
        }
        for (const line of plan.lines) {
            if (!codeToId.has(line.accountCode)) {
                throw new Error(`Akun CoA ${line.accountCode} tidak ditemukan untuk journal ${plan.key}`);
            }
        }

        await db.journalEntry.create({
            data: {
                tenantId,
                entryNumber,
                date: plan.date,
                description: plan.description,
                reference: plan.reference,
                sourceType: plan.sourceType,
                sourceId: plan.sourceId,
                status: plan.status,
                totalDebit,
                totalCredit,
                createdBy,
                items: {
                    create: plan.lines.map((line) => ({
                        tenantId,
                        accountId: codeToId.get(line.accountCode) as string,
                        debit: line.debit,
                        credit: line.credit,
                        description: line.description,
                    })),
                },
            },
        });
        result.journalEntriesCreated += 1;
        result.journalItemsCreated += plan.lines.length;
    }

    // 9) AccountingPeriod (B7) dengan closeSummary dari dokumen sumber
    const summaries = computePeriodSummaries(
        sources,
        FINANCE_PERIODS.map((p) => p.startDate.slice(0, 7))
    );
    for (const spec of FINANCE_PERIODS) {
        const startDate = toUtcDate(spec.startDate);
        const existing = await db.accountingPeriod.findUnique({
            where: { tenantId_startDate: { tenantId, startDate } },
        });
        if (existing) continue;
        const month = spec.startDate.slice(0, 7);
        const summary = summaries[month] ?? { totalRevenue: 0, totalExpenses: 0, netIncome: 0 };
        const isClosed = spec.status === 'CLOSED';
        await db.accountingPeriod.create({
            data: {
                tenantId,
                name: spec.name,
                startDate,
                endDate: toUtcDate(spec.endDate),
                status: spec.status,
                closedBy: isClosed ? createdBy : null,
                closedAt: isClosed ? addDays(toUtcDate(spec.endDate), 1) : null,
                closeNotes: isClosed ? 'Otomatis ditutup oleh seed demo (data historis)' : null,
                closeSummary: isClosed ? summary : undefined,
            },
        });
        result.periodsCreated += 1;
    }

    void anchorDate;
    return result;
}
