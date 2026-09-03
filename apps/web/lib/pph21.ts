/**
 * PPh21 (Pajak Penghasilan Pasal 21) Calculator
 * Berdasarkan peraturan perpajakan Indonesia 2024
 *
 * Referensi:
 * - UU HPP (Harmonisasi Peraturan Perpajakan)
 * - PMK 168/PMK.03/2023 (Tarif PPh 21)
 * - UU No. 7 Tahun 2021 tentang Harmonisasi Peraturan Perpajakan
 */

// ============================================
// Types
// ============================================

export type StatusKawin = 'TK/0' | 'TK/1' | 'TK/2' | 'TK/3' | 'K/0' | 'K/1' | 'K/2' | 'K/3';

export interface PPh21Input {
    /** Gaji kotor bulanan (Rp) */
    grossSalaryMonthly: number;
    /** Status kawin dan tanggungan */
    statusKawin: StatusKawin;
    /** Tunjangan lain yang kena pajak (bulanan) */
    otherTaxableIncome?: number;
}

export interface PPh21Result {
    /** Gaji kotor bulanan */
    grossSalaryMonthly: number;
    /** Gaji kotor tahunan */
    grossSalaryYearly: number;
    /** Penghasilan tambahan yang kena pajak (bulanan) */
    otherTaxableIncomeMonthly: number;
    /** Penghasilan tambahan yang kena pajak (tahunan) */
    otherTaxableIncomeYearly: number;
    /** Total penghasilan kena pajak tahunan (sebelum PTKP) */
    totalTaxableIncomeYearly: number;
    /** PTKP tahunan */
    ptkpYearly: number;
    /** Penghasilan kena pajak (PKP) tahunan */
    pkpYearly: number;
    /** PPh21 tahunan */
    pph21Yearly: number;
    /** PPh21 bulanan (ditahan/dipotong) */
    pph21Monthly: number;
    /** Effective tax rate */
    effectiveRate: number;
    /** Status kawin yang digunakan */
    statusKawin: StatusKawin;
}

// ============================================
// PTKP Table 2024 (Penghasilan Tidak Kena Pajak)
// ============================================
// PTKP dasar: Rp 54.000.000/tahun
// Tambahan istri: Rp 4.500.000/tahun
// Tambahan anak: Rp 4.500.000/tahun (maksimal 3 anak)

const PTKP_BASE = 54_000_000;        // TK/0 atau K/0 (tanpa tanggungan)
const PTKP_SPOUSE = 4_500_000;       // Tambahan untuk istri/suami
const PTKP_CHILD = 4_500_000;        // Tambahan per anak (maks 3)

export const PTKP_TABLE: Record<StatusKawin, number> = {
    'TK/0': PTKP_BASE,                          // 54.000.000
    'TK/1': PTKP_BASE + PTKP_CHILD,             // 58.500.000
    'TK/2': PTKP_BASE + 2 * PTKP_CHILD,         // 63.000.000
    'TK/3': PTKP_BASE + 3 * PTKP_CHILD,         // 67.500.000
    'K/0': PTKP_BASE + PTKP_SPOUSE,             // 58.500.000
    'K/1': PTKP_BASE + PTKP_SPOUSE + PTKP_CHILD, // 63.000.000
    'K/2': PTKP_BASE + PTKP_SPOUSE + 2 * PTKP_CHILD, // 67.500.000
    'K/3': PTKP_BASE + PTKP_SPOUSE + 3 * PTKP_CHILD, // 72.000.000
};

// ============================================
// Tarif Progresif PPh 21 (UU HPP 2021)
// ============================================

interface TarifBraket {
    min: number;       // Batas bawah braket (Rp/tahun)
    max: number | null; // Batas atas braket (null = tanpa batas)
    rate: number;      // Tarif pajak (desimal)
    label: string;     // Label braket
}

export const TARIF_PPH21: TarifBraket[] = [
    { min: 0, max: 60_000_000, rate: 0.05, label: '≤ Rp 60 juta' },
    { min: 60_000_000, max: 250_000_000, rate: 0.15, label: 'Rp 60 - 250 juta' },
    { min: 250_000_000, max: 500_000_000, rate: 0.25, label: 'Rp 250 - 500 juta' },
    { min: 500_000_000, max: null, rate: 0.30, label: '> Rp 500 juta' },
];

// ============================================
// Helper Functions
// ============================================

/**
 * Hitung PPh21 untuk satu braket tertentu
 */
function hitungBraket(pkp: number, braket: TarifBraket): number {
    if (pkp <= braket.min) return 0;

    const braketMax = braket.max ?? Infinity;
    const taxableInBraket = Math.min(pkp, braketMax) - braket.min;

    return taxableInBraket * braket.rate;
}

/**
 * Hitung total PPh21 dari PKP menggunakan tarif progresif
 */
function hitungTotalPPh21(pkp: number): number {
    if (pkp <= 0) return 0;

    let total = 0;
    for (const braket of TARIF_PPH21) {
        total += hitungBraket(pkp, braket);
    }
    return total;
}

// ============================================
// Main Calculator
// ============================================

/**
 * Hitung PPh21 berdasarkan gaji kotor dan status kawin
 *
 * @param input - Parameter perhitungan PPh21
 * @returns Hasil perhitungan PPh21 lengkap
 *
 * @example
 * ```ts
 * const result = calculatePPh21({
 *   grossSalaryMonthly: 15_000_000,
 *   statusKawin: 'TK/0',
 * });
 * // result.pph21Monthly = Rp yang harus dipotong per bulan
 * ```
 */
export function calculatePPh21(input: PPh21Input): PPh21Result {
    const {
        grossSalaryMonthly,
        statusKawin,
        otherTaxableIncome = 0,
    } = input;

    // 1. Gaji kotor tahunan
    const grossSalaryYearly = grossSalaryMonthly * 12;

    // 2. Penghasilan tambahan yang kena pajak
    const otherTaxableIncomeMonthly = Math.max(0, otherTaxableIncome);
    const otherTaxableIncomeYearly = otherTaxableIncomeMonthly * 12;

    // 3. Total penghasilan kena pajak tahunan (sebelum PTKP)
    const totalTaxableIncomeYearly = grossSalaryYearly + otherTaxableIncomeYearly;

    // 4. PTKP berdasarkan status kawin
    const ptkpYearly = PTKP_TABLE[statusKawin];

    // 5. Penghasilan Kena Pajak (PKP) = Total - PTKP
    const pkpYearly = Math.max(0, totalTaxableIncomeYearly - ptkpYearly);

    // 6. PPh21 tahunan (menggunakan tarif progresif)
    const pph21Yearly = hitungTotalPPh21(pkpYearly);

    // 7. PPh21 bulanan (ditahan/dipotong dari gaji)
    const pph21Monthly = Math.round(pph21Yearly / 12);

    // 8. Effective tax rate
    const effectiveRate = grossSalaryYearly > 0
        ? (pph21Yearly / grossSalaryYearly) * 100
        : 0;

    return {
        grossSalaryMonthly,
        grossSalaryYearly,
        otherTaxableIncomeMonthly,
        otherTaxableIncomeYearly,
        totalTaxableIncomeYearly,
        ptkpYearly,
        pkpYearly,
        pph21Yearly,
        pph21Monthly,
        effectiveRate: Math.round(effectiveRate * 100) / 100, // 2 decimal places
        statusKawin,
    };
}

/**
 * Format PPh21 result untuk display
 */
export function formatPPh21Summary(result: PPh21Result): string {
    const lines = [
        `=== Perhitungan PPh 21 ===`,
        `Status Kawin: ${result.statusKawin}`,
        `PTKP: Rp ${result.ptkpYearly.toLocaleString('id-ID')}`,
        ``,
        `Gaji Kotor Bulanan: Rp ${result.grossSalaryMonthly.toLocaleString('id-ID')}`,
        `Gaji Kotor Tahunan: Rp ${result.grossSalaryYearly.toLocaleString('id-ID')}`,
        ``,
        `PKP Tahunan: Rp ${result.pkpYearly.toLocaleString('id-ID')}`,
        `PPh 21 Tahunan: Rp ${result.pph21Yearly.toLocaleString('id-ID')}`,
        `PPh 21 Bulanan: Rp ${result.pph21Monthly.toLocaleString('id-ID')}`,
        `Effective Rate: ${result.effectiveRate}%`,
    ];
    return lines.join('\n');
}

/**
 * Mendapatkan daftar semua status kawin yang tersedia
 */
export function getStatusKawinOptions(): { value: StatusKawin; label: string; ptkp: number }[] {
    return (Object.keys(PTKP_TABLE) as StatusKawin[]).map((key) => ({
        value: key,
        label: `${key} — PTKP Rp ${(PTKP_TABLE[key] / 1_000_000).toFixed(0)} jt`,
        ptkp: PTKP_TABLE[key],
    }));
}
