// ─── NLU Parser — Intent + Entity Recognition ─────────────────────────────────
// Pure TypeScript NLU parser (NO external ML dependencies).
// Supports Bahasa Indonesia and English queries.
// Uses pattern matching + weighted keyword scoring for intent classification.

import { logger } from '@/lib/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export type IntentType =
    | 'REPORT'
    | 'COMPARE'
    | 'FILTER'
    | 'AGGREGATE'
    | 'PREDICT'
    | 'ACTION'
    | 'ANALYZE'
    | 'GENERAL';

export type ModuleName =
    | 'invoice'
    | 'payment'
    | 'contact'
    | 'product'
    | 'employee'
    | 'purchaseOrder'
    | 'journalEntry'
    | 'quotation'
    | 'lead'
    | 'deal'
    | 'payroll'
    | 'attendance'
    | 'leave'
    | 'finance'
    | 'inventory'
    | 'hr'
    | 'crm';

export type AggregationType = 'total' | 'average' | 'count' | 'min' | 'max' | 'sum';

export type StatusValue =
    | 'DRAFT'
    | 'SENT'
    | 'PAID'
    | 'OVERDUE'
    | 'PENDING'
    | 'CANCELLED'
    | 'COMPLETED'
    | 'FAILED'
    | 'ACTIVE'
    | 'INACTIVE'
    | 'APPROVED'
    | 'REJECTED'
    | 'ACCEPTED'
    | 'EXPIRED'
    | 'RECEIVED'
    | 'VOID'
    | 'POSTED';

export interface TimePeriod {
    type: 'relative' | 'absolute' | 'range';
    label: string;
    startDate: Date;
    endDate: Date;
}

export interface ExtractedEntity {
    timePeriod?: TimePeriod;
    amount?: { value: number; operator?: '=' | '>' | '<' | '>=' | '<=' };
    status?: StatusValue[];
    moduleName?: ModuleName;
    comparisonTarget?: string;
    aggregationType?: AggregationType;
    contactName?: string;
    searchQuery?: string;
    limit?: number;
}

export interface NLUParseResult {
    intent: IntentType;
    confidence: number;
    entities: ExtractedEntity;
    normalizedQuery: string;
    rawQuery: string;
    intentScores: Record<IntentType, number>;
}

// ─── Intent Definitions ──────────────────────────────────────────────────────

interface IntentPattern {
    keywords: string[];
    weight: number;
}

interface IntentDefinition {
    type: IntentType;
    /** Exact phrase matches — high confidence boost */
    exactPhrases: string[];
    /** Weighted keyword patterns */
    patterns: IntentPattern[];
}

const INTENT_DEFINITIONS: IntentDefinition[] = [
    {
        type: 'REPORT',
        exactPhrases: [
            'tampilkan', 'show me', 'display', 'lihat', 'cek', 'check',
            'tunjukkan', 'show', 'display data', 'lihat data', 'tampilkan data',
            'laporan', 'report', 'rekap', 'summary', 'ringkasan',
        ],
        patterns: [
            { keywords: ['penjualan', 'sales', 'revenue', 'pendapatan'], weight: 0.8 },
            { keywords: ['invoice', 'faktur'], weight: 0.7 },
            { keywords: ['customer', 'kontak', 'pelanggan', 'contact'], weight: 0.7 },
            { keywords: ['produk', 'product', 'stok', 'inventory', 'barang'], weight: 0.7 },
            { keywords: ['karyawan', 'employee', 'hr', 'staff'], weight: 0.7 },
            { keywords: ['keuangan', 'finance', 'pembayaran', 'payment'], weight: 0.7 },
            { keywords: ['bulanan', 'monthly', 'mingguan', 'weekly', 'harian', 'daily'], weight: 0.3 },
        ],
    },
    {
        type: 'COMPARE',
        exactPhrases: [
            'bandingkan', 'compare', 'comparison', 'vs', 'versus',
            'dibandingkan', 'compared', 'perbandingan', 'selisih', 'difference',
            'lebih tinggi', 'lebih rendah', 'higher', 'lower',
        ],
        patterns: [
            { keywords: ['q1', 'q2', 'q3', 'q4', 'kuartal', 'quarter'], weight: 0.9 },
            { keywords: ['bulan lalu', 'last month', 'bulan ini', 'this month'], weight: 0.8 },
            { keywords: ['tahun lalu', 'last year', 'tahun ini', 'this year'], weight: 0.8 },
            { keywords: ['penjualan', 'sales', 'revenue'], weight: 0.5 },
            { keywords: ['invoice', 'customer', 'produk'], weight: 0.5 },
        ],
    },
    {
        type: 'FILTER',
        exactPhrases: [
            'yang', 'which', 'that are', 'sedang', 'dalam status',
            'filter', 'cari', 'find', 'search', 'lookup',
            'belum', 'sudah', 'tidak', 'belum bayar', 'belum lunas',
        ],
        patterns: [
            { keywords: ['overdue', 'terlambat', 'jatuh tempo', 'overdue'], weight: 0.9 },
            { keywords: ['pending', 'menunggu', 'diproses'], weight: 0.8 },
            { keywords: ['paid', 'lunas', 'terbayar', 'completed'], weight: 0.8 },
            { keywords: ['draft', 'belum dikirim'], weight: 0.7 },
            { keywords: ['cancelled', 'dibatalkan'], weight: 0.7 },
            { keywords: ['active', 'aktif', 'inactive', 'tidak aktif'], weight: 0.7 },
            { keywords: ['low stock', 'stok rendah', 'habis', 'stok menipis'], weight: 0.8 },
            { keywords: ['overdue', 'terlambat', 'jatuh tempo'], weight: 0.9 },
        ],
    },
    {
        type: 'AGGREGATE',
        exactPhrases: [
            'total', 'jumlah', 'how many', 'count', 'berapa',
            'rata-rata', 'average', 'avg', 'mean',
            'terbesar', 'terkecil', 'biggest', 'smallest', 'largest',
            'paling banyak', 'paling sedikit', 'most', 'least',
            'semua', 'all',
        ],
        patterns: [
            { keywords: ['penjualan', 'sales', 'revenue', 'pendapatan'], weight: 0.6 },
            { keywords: ['customer', 'kontak', 'pelanggan', 'karyawan'], weight: 0.6 },
            { keywords: ['invoice', 'order', 'produk'], weight: 0.6 },
            { keywords: ['total', 'jumlah', 'count', 'sum'], weight: 0.9 },
            { keywords: ['rata-rata', 'average', 'mean'], weight: 0.9 },
            { keywords: ['terbesar', 'terkecil', 'max', 'min'], weight: 0.9 },
        ],
    },
    {
        type: 'PREDICT',
        exactPhrases: [
            'prediksi', 'predict', 'prediction', 'forecast',
            'proyeksi', 'projection', 'estimasi', 'estimate',
            'kedepan', 'mendatang', 'future', 'next',
            'akan datang', 'bulan depan', 'next month',
        ],
        patterns: [
            { keywords: ['cash flow', 'arus kas'], weight: 0.9 },
            { keywords: ['penjualan', 'sales', 'revenue'], weight: 0.7 },
            { keywords: ['demand', 'permintaan'], weight: 0.7 },
            { keywords: ['profit', 'laba', 'keuntungan'], weight: 0.7 },
            { keywords: ['30 hari', '60 hari', '90 hari', '30 days', '60 days', '90 days'], weight: 0.8 },
        ],
    },
    {
        type: 'ACTION',
        exactPhrases: [
            'buat', 'create', 'add', 'tambah', 'new', 'baru',
            'edit', 'update', 'ubah', 'modify', 'ganti',
            'hapus', 'delete', 'remove', 'buang',
            'kirim', 'send', 'submit', 'ajukan',
            'approve', 'setujui', 'reject', 'tolak',
        ],
        patterns: [
            { keywords: ['invoice', 'faktur'], weight: 0.8 },
            { keywords: ['order', 'pesanan', 'purchase order', 'po'], weight: 0.8 },
            { keywords: ['customer', 'kontak', 'pelanggan'], weight: 0.8 },
            { keywords: ['produk', 'product', 'barang'], weight: 0.8 },
            { keywords: ['karyawan', 'employee'], weight: 0.8 },
            { keywords: ['quotation', 'penawaran', 'quote'], weight: 0.8 },
            { keywords: ['payment', 'pembayaran'], weight: 0.8 },
        ],
    },
    {
        type: 'ANALYZE',
        exactPhrases: [
            'analisis', 'analyze', 'analysis', 'analisa',
            'mengapa', 'why', 'kenapa', 'reason', 'alasan',
            'bagaimana', 'how', 'strategy', 'strategi',
            'insight', 'saran', 'suggestion', 'rekomendasi', 'recommendation',
            'optimasi', 'optimize', 'improve', 'tingkatkan',
        ],
        patterns: [
            { keywords: ['profit', 'laba', 'keuntungan', 'margin'], weight: 0.8 },
            { keywords: ['penjualan', 'sales', 'revenue'], weight: 0.7 },
            { keywords: ['customer', 'retention', 'churn'], weight: 0.7 },
            { keywords: ['inventory', 'stok', 'supply chain'], weight: 0.7 },
            { keywords: ['performa', 'performance', 'productivity'], weight: 0.7 },
            { keywords: ['turun', 'naik', 'drop', 'increase', 'decrease'], weight: 0.6 },
        ],
    },
];

// ─── Module Name Mapping ─────────────────────────────────────────────────────

const MODULE_KEYWORDS: Record<ModuleName, string[]> = {
    invoice: ['invoice', 'faktur'],
    payment: ['payment', 'pembayaran', 'bayar', 'paid'],
    contact: ['customer', 'kontak', 'pelanggan', 'client', 'mitra'],
    product: ['produk', 'product', 'barang', 'item', 'stok', 'inventory'],
    employee: ['karyawan', 'employee', 'staff', 'pegawai'],
    purchaseOrder: ['purchase order', 'po', 'pembelian', 'pembelian barang'],
    journalEntry: ['jurnal', 'journal', 'journal entry', 'general ledger', 'gl'],
    quotation: ['quotation', 'penawaran', 'quote', 'rfq'],
    lead: ['lead', 'leads', 'prospek'],
    deal: ['deal', 'deals', 'kesepakatan', 'pipeline'],
    payroll: ['payroll', 'gaji', 'salary', 'upah'],
    attendance: ['attendance', 'absensi', 'hadir', 'clock in', 'clock out'],
    leave: ['leave', 'cuti', 'izin', 'sakit'],
    finance: ['keuangan', 'finance', 'arus kas', 'cash flow', 'profit', 'laba'],
    inventory: ['inventory', 'stok', 'gudang', 'warehouse'],
    hr: ['hr', 'human resource', 'sdm', 'sumber daya manusia'],
    crm: ['crm', 'customer relationship'],
};

// ─── Abbreviation & Typo Normalization ───────────────────────────────────────

const ABBREVIATIONS: Record<string, string> = {
    'brp': 'berapa',
    'utk': 'untuk',
    'yg': 'yang',
    'dg': 'dengan',
    'dr': 'dari',
    'tp': 'tapi',
    'krn': 'karena',
    'klo': 'kalau',
    'aja': 'saja',
    'gk': 'tidak',
    'gak': 'tidak',
    'tdk': 'tidak',
    'bkn': 'bukan',
    'sy': 'saya',
    'gw': 'saya',
    'gue': 'saya',
    'km': 'kamu',
    'lo': 'kamu',
    'lg': 'lagi',
    'bgt': 'banget',
    'dbs': 'dibawah',
    'ats': 'diatas',
    'jml': 'jumlah',
    'tgl': 'tanggal',
    'bln': 'bulan',
    'thn': 'tahun',
    'hr': 'hari',
    'mnggu': 'minggu',
    'mggu': 'minggu',
    'mgu': 'minggu',
    'jmt': 'jumat',
    'kam': 'kamis',
    'sel': 'selasa',
    'rab': 'rabu',
    'sn': 'senin',
    'sbt': 'sabtu',
    'min': 'minggu',
    'jan': 'januari',
    'feb': 'februari',
    'mar': 'maret',
    'apr': 'april',
    'mei': 'mei',
    'jun': 'juni',
    'jul': 'juli',
    'ags': 'agustus',
    'agu': 'agustus',
    'sep': 'september',
    'okt': 'oktober',
    'nov': 'november',
    'des': 'desember',
};

// ─── Date Helpers ────────────────────────────────────────────────────────────

/**
 * Get today's date at midnight (local time).
 */
function getToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Get start of today.
 */
function getStartOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Get end of today.
 */
function getEndOfDay(date: Date): Date {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setHours(23, 59, 59, 999);
    return d;
}

// ─── NLU Parser ─────────────────────────────────────────────────────────────

/**
 * Normalize the query: expand abbreviations, fix common typos, lowercase.
 */
export function normalizeQuery(query: string): string {
    let normalized = query.toLowerCase().trim();

    // Expand abbreviations (word-boundary aware)
    for (const [abbr, full] of Object.entries(ABBREVIATIONS)) {
        const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
        normalized = normalized.replace(regex, full);
    }

    // Common typo fixes
    const typos: [RegExp, string][] = [
        [/penjulaan/g, 'penjualan'],
        [/penjulalan/g, 'penjualan'],
        [/invoce/g, 'invoice'],
        [/invocie/g, 'invoice'],
        [/prodcut/g, 'product'],
        [/prodk/g, 'produk'],
        [/cutomer/g, 'customer'],
        [/costumer/g, 'customer'],
        [/kostumer/g, 'customer'],
        [/employe[^e]/g, 'employee'],
        [/karyawa[n]/g, 'karyawan'],
        [/pembayaran/g, 'pembayaran'],
        [/pembeyaran/g, 'pembayaran'],
        [/rekapan/g, 'rekap'],
        [/rekapitulasi/g, 'rekap'],
        [/strock/g, 'stok'],
        [/sstock/g, 'stok'],
        [/analisa/g, 'analisis'],
        [/analisia/g, 'analisis'],
        [/predicksi/g, 'prediksi'],
        [/prediksi/g, 'prediksi'],
        [/overdued/g, 'overdue'],
        [/overdue/g, 'overdue'],
    ];

    for (const [pattern, replacement] of typos) {
        normalized = normalized.replace(pattern, replacement);
    }

    return normalized;
}

/**
 * Extract time period entities from the query.
 */
export function extractTimePeriod(query: string): TimePeriod | undefined {
    const today = getToday();
    const lower = query.toLowerCase();

    // "hari ini" / "today"
    if (/\b(hari\s*ini|today)\b/.test(lower)) {
        return {
            type: 'relative',
            label: 'hari ini',
            startDate: getStartOfDay(today),
            endDate: getEndOfDay(today),
        };
    }

    // "kemarin" / "yesterday"
    if (/\b(kemarin|yesterday)\b/.test(lower)) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
            type: 'relative',
            label: 'kemarin',
            startDate: getStartOfDay(yesterday),
            endDate: getEndOfDay(yesterday),
        };
    }

    // "minggu ini" / "this week"
    if (/\b(minggu\s*ini|this\s*week)\b/.test(lower)) {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
        return {
            type: 'relative',
            label: 'minggu ini',
            startDate: getStartOfDay(startOfWeek),
            endDate: getEndOfDay(today),
        };
    }

    // "minggu lalu" / "last week"
    if (/\b(minggu\s*lalu|last\s*week)\b/.test(lower)) {
        const startOfLastWeek = new Date(today);
        startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
        const endOfLastWeek = new Date(today);
        endOfLastWeek.setDate(today.getDate() - today.getDay() - 1);
        return {
            type: 'relative',
            label: 'minggu lalu',
            startDate: getStartOfDay(startOfLastWeek),
            endDate: getEndOfDay(endOfLastWeek),
        };
    }

    // "bulan ini" / "this month"
    if (/\b(bulan\s*ini|this\s*month)\b/.test(lower)) {
        return {
            type: 'relative',
            label: 'bulan ini',
            startDate: new Date(today.getFullYear(), today.getMonth(), 1),
            endDate: getEndOfDay(today),
        };
    }

    // "bulan lalu" / "last month"
    if (/\b(bulan\s*lalu|last\s*month)\b/.test(lower)) {
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
            type: 'relative',
            label: 'bulan lalu',
            startDate: getStartOfDay(startOfLastMonth),
            endDate: getEndOfDay(endOfLastMonth),
        };
    }

    // "bulan depan" / "next month"
    if (/\b(bulan\s*depan|next\s*month)\b/.test(lower)) {
        const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        return {
            type: 'relative',
            label: 'bulan depan',
            startDate: getStartOfDay(startOfNextMonth),
            endDate: getEndOfDay(endOfNextMonth),
        };
    }

    // "tahun ini" / "this year"
    if (/\b(tahun\s*ini|this\s*year)\b/.test(lower)) {
        return {
            type: 'relative',
            label: 'tahun ini',
            startDate: new Date(today.getFullYear(), 0, 1),
            endDate: getEndOfDay(today),
        };
    }

    // "tahun lalu" / "last year"
    if (/\b(tahun\s*lalu|last\s*year)\b/.test(lower)) {
        return {
            type: 'relative',
            label: 'tahun lalu',
            startDate: new Date(today.getFullYear() - 1, 0, 1),
            endDate: new Date(today.getFullYear() - 1, 11, 31),
        };
    }

    // "Q1/Q2/Q3/Q4 [YYYY]" — quarter
    const quarterMatch = lower.match(/\b(q[1-4])\s*(\d{4})?\b/);
    if (quarterMatch) {
        const q = parseInt(quarterMatch[1]!.replace('q', ''), 10);
        const year = quarterMatch[2] ? parseInt(quarterMatch[2], 10) : today.getFullYear();
        const startMonth = (q - 1) * 3;
        return {
            type: 'absolute',
            label: `Q${q} ${year}`,
            startDate: new Date(year, startMonth, 1),
            endDate: getEndOfDay(new Date(year, startMonth + 3, 0)),
        };
    }

    // "N hari terakhir" / "last N days"
    const lastDaysMatch = lower.match(/(\d+)\s*(hari\s*terakhir|days?\s*ago|last\s*\d+\s*days?)/);
    if (lastDaysMatch) {
        const days = parseInt(lastDaysMatch[1]!, 10);
        const start = new Date(today);
        start.setDate(today.getDate() - days);
        return {
            type: 'relative',
            label: `${days} hari terakhir`,
            startDate: getStartOfDay(start),
            endDate: getEndOfDay(today),
        };
    }

    // "N hari ke depan" / "next N days"
    const nextDaysMatch = lower.match(/(\d+)\s*(hari\s*ke\s*depan|days?\s*from\s*now|next\s*\d+\s*days?)/);
    if (nextDaysMatch) {
        const days = parseInt(nextDaysMatch[1]!, 10);
        const end = new Date(today);
        end.setDate(today.getDate() + days);
        return {
            type: 'relative',
            label: `${days} hari ke depan`,
            startDate: getStartOfDay(today),
            endDate: getEndOfDay(end),
        };
    }

    // "N bulan terakhir" / "last N months"
    const lastMonthsMatch = lower.match(/(\d+)\s*(bulan\s*terakhir|months?\s*ago|last\s*\d+\s*months?)/);
    if (lastMonthsMatch) {
        const months = parseInt(lastMonthsMatch[1]!, 10);
        const start = new Date(today.getFullYear(), today.getMonth() - months, 1);
        return {
            type: 'relative',
            label: `${months} bulan terakhir`,
            startDate: getStartOfDay(start),
            endDate: getEndOfDay(today),
        };
    }

    // Indonesian month names — "januari 2024", "feb 2024", etc.
    const monthNames: Record<string, number> = {
        januari: 0, jan: 0,
        februari: 1, feb: 1,
        maret: 2, mar: 2,
        april: 3, apr: 3,
        mei: 4,
        juni: 5, jun: 5,
        juli: 6, jul: 6,
        agustus: 7, ags: 7, agu: 7,
        september: 8, sep: 8,
        oktober: 9, okt: 9,
        november: 10, nov: 10,
        desember: 11, des: 11,
    };

    for (const [name, monthIdx] of Object.entries(monthNames)) {
        const monthRegex = new RegExp(`\\b${name}\\s*(\\d{4})?\\b`, 'i');
        const monthMatch = lower.match(monthRegex);
        if (monthMatch) {
            const year = monthMatch[1] ? parseInt(monthMatch[1], 10) : today.getFullYear();
            return {
                type: 'absolute',
                label: `${name} ${year}`,
                startDate: new Date(year, monthIdx, 1),
                endDate: getEndOfDay(new Date(year, monthIdx + 1, 0)),
            };
        }
    }

    return undefined;
}

/**
 * Extract amount entities from the query.
 */
export function extractAmount(query: string): { value: number; operator?: '=' | '>' | '<' | '>=' | '<=' } | undefined {
    const lower = query.toLowerCase();

    // "Rp X juta/jt" or "Rp X miliar/M"
    const rupiahMatch = lower.match(/(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(juta|jt|miliar|m|ribu|rb|k)\b/);
    if (rupiahMatch) {
        let value = parseFloat(rupiahMatch[1]!.replace(',', '.'));
        const unit = rupiahMatch[2];
        if (unit === 'juta' || unit === 'jt' || unit === 'm') value *= 1_000_000;
        else if (unit === 'miliar' || unit === 'miliar') value *= 1_000_000_000;
        else if (unit === 'ribu' || unit === 'rb' || unit === 'k') value *= 1_000;

        // Check for operator
        const operatorMatch = lower.match(/([><=]+)\s*(?:rp\.?\s*)?\d+/);
        const operator = operatorMatch ? (operatorMatch[1] as '=' | '>' | '<' | '>=' | '<=') : undefined;

        return { value, operator };
    }

    // Plain number with operator: "> 1000000", "< 500000"
    const plainMatch = lower.match(/([><=]+)\s*(\d+(?:[.,]\d+)?)\b/);
    if (plainMatch) {
        const value = parseFloat(plainMatch[2]!.replace(',', '.'));
        const operator = plainMatch[1] as '=' | '>' | '<' | '>=' | '<=';
        return { value, operator };
    }

    // Plain large number: "5000000", "5,000,000"
    const numMatch = lower.match(/\b(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?)\b/);
    if (numMatch) {
        const value = parseFloat(numMatch[1]!.replace(/,/g, ''));
        if (value >= 1000) return { value };
    }

    return undefined;
}

/**
 * Extract status entities from the query.
 */
export function extractStatus(query: string): StatusValue[] | undefined {
    const lower = query.toLowerCase();
    const statuses: StatusValue[] = [];

    const statusMap: [RegExp, StatusValue[]][] = [
        [/overdue|terlambat|jatuh\s*tempo/, ['OVERDUE']],
        [/\bpaid\b|lunas|terbayar|sudah\s*bayar|sudah\s*lunas/, ['PAID']],
        [/\bpending\b|menunggu|diproses|belum\s*diproses/, ['PENDING']],
        [/\bdraft\b|belum\s*kirim|belum\s*dikirim/, ['DRAFT']],
        [/\bsent\b|terkirim|sudah\s*kirim|sudah\s*dikirim/, ['SENT']],
        [/cancelled|dibatalkan/, ['CANCELLED']],
        [/completed|selesai|tuntas/, ['COMPLETED']],
        [/failed|gagal/, ['FAILED']],
        [/\bactive\b|aktif/, ['ACTIVE']],
        [/\binactive\b|tidak\s*aktif/, ['INACTIVE']],
        [/approved|disetujui|disahkan/, ['APPROVED']],
        [/rejected|ditolak/, ['REJECTED']],
        [/accepted|diterima/, ['ACCEPTED']],
        [/expired|kedaluwarsa/, ['EXPIRED']],
        [/received|diterima/, ['RECEIVED']],
        [/void|batal/, ['VOID']],
        [/posted|diposting/, ['POSTED']],
        [/belum\s*bayar|belum\s*lunas|outstanding/, ['PENDING', 'OVERDUE']],
    ];

    for (const [pattern, vals] of statusMap) {
        if (pattern.test(lower)) {
            statuses.push(...vals);
        }
    }

    return statuses.length > 0 ? statuses : undefined;
}

/**
 * Extract module name from the query.
 */
export function extractModuleName(query: string): ModuleName | undefined {
    const lower = query.toLowerCase();

    // Check for general module categories first
    if (/\b(keuangan|finance|arus\s*kas|cash\s*flow|profit|laba)\b/.test(lower)) {
        return 'finance';
    }
    if (/\b(inventory|persediaan)\b/.test(lower)) {
        return 'inventory';
    }
    if (/\b(hr|human\s*resource|sdm)\b/.test(lower)) {
        return 'hr';
    }
    if (/\b(crm|customer\s*relationship)\b/.test(lower)) {
        return 'crm';
    }

    // Check specific modules
    for (const [module, keywords] of Object.entries(MODULE_KEYWORDS)) {
        for (const kw of keywords) {
            if (lower.includes(kw)) {
                return module as ModuleName;
            }
        }
    }

    return undefined;
}

/**
 * Extract aggregation type from the query.
 */
export function extractAggregationType(query: string): AggregationType | undefined {
    const lower = query.toLowerCase();

    if (/\b(rata[-\s]?rata|average|avg|mean)\b/.test(lower)) return 'average';
    if (/\b(terbesar|biggest|largest|max|maximum|tertinggi|paling\s*tinggi)\b/.test(lower)) return 'max';
    if (/\b(terkecil|smallest|minimum|min|terendah|paling\s*rendah)\b/.test(lower)) return 'min';
    if (/\b(count|berapa|jumlah|total|sum|jumlahkan)\b/.test(lower)) {
        // Distinguish between count and sum
        if (/\b(count|berapa|jumlah\s*(orang|produk|invoice|customer|karyawan|item))\b/.test(lower)) {
            return 'count';
        }
        return 'sum';
    }

    return undefined;
}

/**
 * Extract contact name from the query (e.g., "untuk PT ABC").
 */
export function extractContactName(query: string): string | undefined {
    const lower = query.toLowerCase();

    // "untuk PT ABC", "ke CV XYZ", "dari PT ABC"
    const match = lower.match(/(?:untuk|ke|dari|for|to|from)\s+([A-Z][\w\s]+?)(?:\s*$|\s*\?|\s*\.,)/i);
    if (match) return match[1]!.trim();

    // "PT ABC" or "CV XYZ" pattern (Indonesian company prefixes)
    const companyMatch = query.match(/\b(PT|CV|UD|TBK|Tbk|Ltd|LLC|Inc|Corp)\s+[\w\s]+/i);
    if (companyMatch) return companyMatch[0]!.trim();

    return undefined;
}

/**
 * Extract comparison target from the query.
 */
export function extractComparisonTarget(query: string): string | undefined {
    const lower = query.toLowerCase();

    // "vs Q2", "versus Q3", "compared to last month"
    const vsMatch = lower.match(/(?:vs|versus|dibandingkan|dengan|compared?\s*to|compared?\s*with)\s+(.+?)(?:\s*$|\s*\?)/);
    if (vsMatch) return vsMatch[1]!.trim();

    // "Q2 vs Q3" pattern
    const qMatch = lower.match(/(q[1-4])\s*(?:vs|versus|dibandingkan|dengan)\s*(q[1-4])/);
    if (qMatch) return `${qMatch[1]} vs ${qMatch[2]}`;

    return undefined;
}

/**
 * Detect the intent of the query using weighted keyword scoring.
 */
function detectIntent(normalizedQuery: string): { intent: IntentType; confidence: number; scores: Record<IntentType, number> } {
    const scores: Record<IntentType, number> = {
        REPORT: 0,
        COMPARE: 0,
        FILTER: 0,
        AGGREGATE: 0,
        PREDICT: 0,
        ACTION: 0,
        ANALYZE: 0,
        GENERAL: 0,
    };

    for (const def of INTENT_DEFINITIONS) {
        // Exact phrase matching (high weight)
        for (const phrase of def.exactPhrases) {
            if (normalizedQuery.includes(phrase)) {
                scores[def.type] += 0.4;
            }
        }

        // Pattern matching (weighted)
        for (const pattern of def.patterns) {
            for (const kw of pattern.keywords) {
                if (normalizedQuery.includes(kw)) {
                    scores[def.type] += pattern.weight * 0.15;
                }
            }
        }
    }

    // Normalize scores to 0-1 range
    const maxScore = Math.max(...Object.values(scores), 0.01);
    const normalizedScores: Record<IntentType, number> = {} as Record<IntentType, number>;
    for (const key of Object.keys(scores) as IntentType[]) {
        normalizedScores[key] = Math.min(scores[key] / maxScore, 1);
    }

    // Find the best intent
    let bestIntent: IntentType = 'GENERAL';
    let bestScore = 0;

    for (const [intent, score] of Object.entries(normalizedScores) as [IntentType, number][]) {
        if (score > bestScore) {
            bestScore = score;
            bestIntent = intent;
        }
    }

    // If best score is too low, fallback to GENERAL
    if (bestScore < 0.2) {
        bestIntent = 'GENERAL';
        bestScore = 0.5; // Moderate confidence for general queries
    }

    return {
        intent: bestIntent,
        confidence: Math.round(bestScore * 100) / 100,
        scores: normalizedScores,
    };
}

/**
 * Extract limit from query (e.g., "5 teratas", "top 10", "top 5").
 */
function extractLimit(query: string): number | undefined {
    const lower = query.toLowerCase();

    // "top N", "5 teratas", "5 terbaik", "5 besar"
    const topMatch = lower.match(/(?:top|atas|besar|terbaik|teratas|largest|biggest)\s*(\d+)/);
    if (topMatch) return parseInt(topMatch[1]!, 10);

    const numTopMatch = lower.match(/(\d+)\s*(?:teratas|terbaik|terbesar|top|besar|data|record|item|row)/);
    if (numTopMatch) return parseInt(numTopMatch[1]!, 10);

    // "5 invoice terbaru"
    const newestMatch = lower.match(/(\d+)\s+\w+\s*(?:terbaru|terakhir|latest|newest|recent)/);
    if (newestMatch) return parseInt(newestMatch[1]!, 10);

    return undefined;
}

// ─── Main Parse Function ────────────────────────────────────────────────────

/**
 * Parse a natural language query and extract intent + entities.
 *
 * @param query - Raw user query string
 * @returns NLUParseResult with intent, confidence, entities, and normalized query
 *
 * @example
 * ```ts
 * const result = parseQuery("tampilkan penjualan bulan ini");
 * // result.intent === 'REPORT'
 * // result.entities.timePeriod.label === 'bulan ini'
 * // result.entities.moduleName === 'invoice'
 * ```
 */
export function parseQuery(query: string): NLUParseResult {
    try {
        // Step 1: Normalize query
        const normalizedQuery = normalizeQuery(query);

        // Step 2: Detect intent
        const { intent, confidence, scores } = detectIntent(normalizedQuery);

        // Step 3: Extract entities
        const entities: ExtractedEntity = {};

        const timePeriod = extractTimePeriod(normalizedQuery);
        if (timePeriod) entities.timePeriod = timePeriod;

        const amount = extractAmount(normalizedQuery);
        if (amount) entities.amount = amount;

        const status = extractStatus(normalizedQuery);
        if (status) entities.status = status;

        const moduleName = extractModuleName(normalizedQuery);
        if (moduleName) entities.moduleName = moduleName;

        const aggregationType = extractAggregationType(normalizedQuery);
        if (aggregationType) entities.aggregationType = aggregationType;

        const contactName = extractContactName(query); // use raw query for proper casing
        if (contactName) entities.contactName = contactName;

        const comparisonTarget = extractComparisonTarget(normalizedQuery);
        if (comparisonTarget) entities.comparisonTarget = comparisonTarget;

        const limit = extractLimit(normalizedQuery);
        if (limit) entities.limit = limit;

        const searchQuery = normalizedQuery;
        entities.searchQuery = searchQuery;

        logger.debug('[NLU] Parsed query:', {
            intent,
            confidence,
            entities,
            normalizedQuery,
        });

        return {
            intent,
            confidence,
            entities,
            normalizedQuery,
            rawQuery: query,
            intentScores: scores,
        };
    } catch (error) {
        logger.error('[NLU] Parse error:', error instanceof Error ? error.message : 'Unknown');
        return {
            intent: 'GENERAL',
            confidence: 0.5,
            entities: { searchQuery: query.toLowerCase() },
            normalizedQuery: query.toLowerCase(),
            rawQuery: query,
            intentScores: {} as Record<IntentType, number>,
        };
    }
}
