/**
 * BPJS (Badan Penyelenggara Jaminan Sosial) Calculator
 * Kesehatan + Ketenagakerjaan
 *
 * Referensi:
 * - PP No. 51 Tahun 2024 (Iuran BPJS Kesehatan)
 * - PP No. 15 Tahun 2023 (Iuran BPJS Ketenagakerjaan)
 * - Permenaker 2/2022 (JKK rate)
 */

// ============================================
// Types
// ============================================

export interface BPJSInput {
    /** Gaji kotor bulanan (Rp) — untuk perhitungan BPJS */
    grossSalary: number;
    /** Risiko kerja untuk JKK (opsional, default: 0.24%) */
    jkkRiskLevel?: 'low' | 'medium' | 'high';
}

export interface BPJSKesehatanResult {
    /** Iuran karyawan (4% dari gaji, capped) */
    employee: number;
    /** Iuran perusahaan (4% dari gaji, capped) */
    employer: number;
    /** Total iuran kesehatan */
    total: number;
    /** Gaji yang digunakan untuk perhitungan (setelah cap) */
    salaryUsed: number;
}

export interface BPJSKetenagakerjaanResult {
    /** JKK - Jaminan Kecelakaan Kerja (0.24% - 1.74%) */
    jkk: {
        employer: number;
        rate: number;
        rateLabel: string;
    };
    /** JKM - Jaminan Kematian (0.30%) */
    jkm: {
        employer: number;
        rate: number;
    };
    /** JHT - Jaminan Hari Tua (Employer 3.7% + Employee 2%) */
    jht: {
        employee: number;
        employer: number;
        employeeRate: number;
        employerRate: number;
    };
    /** JP - Jaminan Pensiun (Employer 2% + Employee 1%) */
    jp: {
        employee: number;
        employer: number;
        employeeRate: number;
        employerRate: number;
    };
    /** Total iuran karyawan */
    totalEmployee: number;
    /** Total iuran perusahaan */
    totalEmployer: number;
    /** Total seluruh */
    total: number;
    /** Gaji yang digunakan untuk perhitungan (setelah cap) */
    salaryUsed: number;
}

export interface BPJSResult {
    kesehatan: BPJSKesehatanResult;
    ketenagakerjaan: BPJSKetenagakerjaanResult;
    /** Total iuran karyawan (kesehatan + ketenagakerjaan) */
    totalEmployee: number;
    /** Total iuran perusahaan (kesehatan + ketenagakerjaan) */
    totalEmployer: number;
    /** Grand total */
    grandTotal: number;
}

// ============================================
// Constants
// ============================================

/** Batas maksimum upah untuk BPJS Kesehatan (2024): Rp 12.000.000 */
const BPJS_KESEHATAN_MAX_SALARY = 12_000_000;

/** Batas maksimum upah untuk BPJS Ketenagakerjaan (2024): Rp 9.559.600 */
const BPJS_KTENAGAKERJAAN_MAX_SALARY = 9_559_600;

/** Iuran minimum BPJS Kesehatan: Rp 35.000 */
const BPJS_KESEHATAN_MIN = 35_000;

/** Tarif BPJS Kesehatan: 4% employee + 4% employer */
const BPJS_KESEHATAN_RATE = 0.04;

/** JKK rates berdasarkan risiko */
const JKK_RATES: Record<string, { rate: number; label: string }> = {
    low: { rate: 0.0024, label: 'Rendah (0.24%)' },
    medium: { rate: 0.0089, label: 'Sedang (0.89%)' },
    high: { rate: 0.0174, label: 'Tinggi (1.74%)' },
};

/** Tarif JKM: 0.30% */
const JKM_RATE = 0.003;

/** Tarif JHT: Employer 3.7% + Employee 2% */
const JHT_EMPLOYER_RATE = 0.037;
const JHT_EMPLOYEE_RATE = 0.02;

/** Tarif JP: Employer 2% + Employee 1% */
const JP_EMPLOYER_RATE = 0.02;
const JP_EMPLOYEE_RATE = 0.01;

// ============================================
// Calculator
// ============================================

/**
 * Hitung iuran BPJS Kesehatan
 */
function hitungBPJSKesehatan(salary: number): BPJSKesehatanResult {
    // Cap gaji untuk perhitungan
    const salaryUsed = Math.min(salary, BPJS_KESEHATAN_MAX_SALARY);

    let employee = Math.round(salaryUsed * BPJS_KESEHATAN_RATE);
    let employer = Math.round(salaryUsed * BPJS_KESEHATAN_RATE);

    // Apply minimum iuran
    employee = Math.max(employee, BPJS_KESEHATAN_MIN);
    employer = Math.max(employer, BPJS_KESEHATAN_MIN);

    return {
        employee,
        employer,
        total: employee + employer,
        salaryUsed,
    };
}

/**
 * Hitung iuran BPJS Ketenagakerjaan
 */
function hitungBPJSKetenagakerjaan(
    salary: number,
    jkkRiskLevel: 'low' | 'medium' | 'high' = 'low'
): BPJSKetenagakerjaanResult {
    // Cap gaji untuk perhitungan
    const salaryUsed = Math.min(salary, BPJS_KTENAGAKERJAAN_MAX_SALARY);

    // JKK (Jaminan Kecelakaan Kerja) - Employer only
    const jkkInfo = JKK_RATES[jkkRiskLevel];
    const jkk = {
        employer: Math.round(salaryUsed * jkkInfo.rate),
        rate: jkkInfo.rate * 100,
        rateLabel: jkkInfo.label,
    };

    // JKM (Jaminan Kematian) - Employer only
    const jkm = {
        employer: Math.round(salaryUsed * JKM_RATE),
        rate: JKM_RATE * 100,
    };

    // JHT (Jaminan Hari Tua) - Split
    const jht = {
        employee: Math.round(salaryUsed * JHT_EMPLOYEE_RATE),
        employer: Math.round(salaryUsed * JHT_EMPLOYER_RATE),
        employeeRate: JHT_EMPLOYEE_RATE * 100,
        employerRate: JHT_EMPLOYER_RATE * 100,
    };

    // JP (Jaminan Pensiun) - Split
    const jp = {
        employee: Math.round(salaryUsed * JP_EMPLOYEE_RATE),
        employer: Math.round(salaryUsed * JP_EMPLOYER_RATE),
        employeeRate: JP_EMPLOYEE_RATE * 100,
        employerRate: JP_EMPLOYER_RATE * 100,
    };

    const totalEmployee = jht.employee + jp.employee;
    const totalEmployer = jkk.employer + jkm.employer + jht.employer + jp.employer;

    return {
        jkk,
        jkm,
        jht,
        jp,
        totalEmployee,
        totalEmployer,
        total: totalEmployee + totalEmployer,
        salaryUsed,
    };
}

/**
 * Hitung seluruh BPJS (Kesehatan + Ketenagakerjaan)
 *
 * @param input - Parameter perhitungan BPJS
 * @returns Hasil perhitungan BPJS lengkap
 *
 * @example
 * ```ts
 * const result = calculateBPJS({
 *   grossSalary: 15_000_000,
 *   jkkRiskLevel: 'low',
 * });
 * // result.totalEmployee = total iuran yang dipotong dari gaji
 * // result.totalEmployer = total iuran yang ditanggung perusahaan
 * ```
 */
export function calculateBPJS(input: BPJSInput): BPJSResult {
    const { grossSalary, jkkRiskLevel = 'low' } = input;

    const kesehatan = hitungBPJSKesehatan(grossSalary);
    const ketenagakerjaan = hitungBPJSKetenagakerjaan(grossSalary, jkkRiskLevel);

    const totalEmployee = kesehatan.employee + ketenagakerjaan.totalEmployee;
    const totalEmployer = kesehatan.employer + ketenagakerjaan.totalEmployer;

    return {
        kesehatan,
        ketenagakerjaan,
        totalEmployee,
        totalEmployer,
        grandTotal: totalEmployee + totalEmployer,
    };
}

/**
 * Format BPJS result untuk display
 */
export function formatBPSJSummary(result: BPJSResult): string {
    const lines = [
        `=== Perhitungan BPJS ===`,
        ``,
        `--- BPJS Kesehatan ---`,
        `Iuran Karyawan (4%): Rp ${result.kesehatan.employee.toLocaleString('id-ID')}`,
        `Iuran Perusahaan (4%): Rp ${result.kesehatan.employer.toLocaleString('id-ID')}`,
        `Total: Rp ${result.kesehatan.total.toLocaleString('id-ID')}`,
        ``,
        `--- BPJS Ketenagakerjaan ---`,
        `JKK (${result.ketenagakerjaan.jkk.rateLabel}): Rp ${result.ketenagakerjaan.jkk.employer.toLocaleString('id-ID')}`,
        `JKM (0.30%): Rp ${result.ketenagakerjaan.jkm.employer.toLocaleString('id-ID')}`,
        `JHT Karyawan (2%): Rp ${result.ketenagakerjaan.jht.employee.toLocaleString('id-ID')}`,
        `JHT Perusahaan (3.7%): Rp ${result.ketenagakerjaan.jht.employer.toLocaleString('id-ID')}`,
        `JP Karyawan (1%): Rp ${result.ketenagakerjaan.jp.employee.toLocaleString('id-ID')}`,
        `JP Perusahaan (2%): Rp ${result.ketenagakerjaan.jp.employer.toLocaleString('id-ID')}`,
        ``,
        `Total Karyawan: Rp ${result.totalEmployee.toLocaleString('id-ID')}`,
        `Total Perusahaan: Rp ${result.totalEmployer.toLocaleString('id-ID')}`,
        `Grand Total: Rp ${result.grandTotal.toLocaleString('id-ID')}`,
    ];
    return lines.join('\n');
}

/**
 * Mendapatkan opsi JKK risk level
 */
export function getJkkRiskOptions(): { value: string; label: string; rate: number }[] {
    return Object.entries(JKK_RATES).map(([key, val]) => ({
        value: key,
        label: val.label,
        rate: val.rate * 100,
    }));
}
