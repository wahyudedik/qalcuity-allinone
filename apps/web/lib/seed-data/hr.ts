/**
 * HR Demo Seed Module — Shared dataset source untuk SEMUA loader HR (C1, C3, C7–C9).
 *
 * Digunakan OLEH KEDUA loader sehingga menghasilkan data IDENTIK:
 *  - packages/db/prisma/seed.ts   → import { seedHrData } from "../../../apps/web/lib/seed-data/hr"
 *  - apps/web/lib/seed-data/demo.ts → import { seedHrData } from "./hr"
 *
 * Cakupan (plans/demo-data-enhancement.md §6.2):
 *  C1. Unifikasi dataset   — Department, Employee, Payroll, Attendance, Leave
 *                            (SATU sumber untuk seed.ts & loadDemoData)
 *  C3. Department          — 7 divisi (Direksi, Keuangan, Penjualan, SDM, Gudang,
 *                            IT, Operasional) + Employee.departmentId ter-link
 *                            (field string `department` lama tetap diisi — fallback)
 *  C7. Payroll             — 6 periode (2026-05..2026-10) × 15 karyawan = 90 record;
 *                            periode lama PAID + paidAt, terbaru PENDING.
 *                            Jurnal payroll di finance.ts meng-aggregate tabel ini
 *                            (status PAID → jurnal POSTED) — jadi modul ini WAJIB
 *                            di-seed SEBELUM seedFinanceData().
 *  C8. Attendance          — 90 hari kerja (weekdays) deterministik dari anchorDate;
 *                            variasi PRESENT/LATE/WFH/ABSENT/LEAVE — TANPA Math.random().
 *  C9. Leave               — 16 pengajuan (ANNUAL/SICK/PERSONAL/MATERNITY/UNPAID ×
 *                            PENDING/APPROVED/REJECTED); tanggal cuti APPROVED
 *                            di-override menjadi status LEAVE di attendance.
 *
 * PRINSIP HARD:
 *  - Idempotent: re-run tidak pernah menduplikasi (upsert/findUnique by @@unique
 *    per-tenant; LeaveRequest tanpa unique → findFirst by kunci bisnis).
 *  - Tanpa Math.random() — semua nilai deterministik via mulberry32(seed) + anchorDate.
 *  - Setiap query menyaring tenantId.
 *  - Stable keys: Department → name, Employee → employeeId,
 *    PayrollRecord → (employeeId, period), AttendanceRecord → (employeeId, date),
 *    LeaveRequest → (employeeId, type, startDate).
 */

import type { Prisma } from '@prisma/client';
import { addDays, mulberry32, toUtcDate } from './finance';

// ============================================================
// 1. Dataset statis (single source of truth — C1)
// ============================================================

/** Anchor date default — SAMA dengan finance.ts & crm.ts DEFAULT_ANCHOR_DATE. */
export const HR_DEFAULT_ANCHOR_DATE = '2026-10-10';

/** Jumlah hari kerja (weekdays) attendance yang di-seed (C8). */
export const HR_ATTENDANCE_DAYS = 90;

// ─── Department (7 — C3) ─────────────────────────────────────

export interface HrDepartmentSpec {
    name: string;
    description: string;
}

export const HR_DEPARTMENTS: readonly HrDepartmentSpec[] = [
    { name: 'Direksi', description: 'Pimpinan perusahaan dan pengambil keputusan strategis' },
    { name: 'Keuangan', description: 'Pengelolaan keuangan, akuntansi, dan pelaporan' },
    { name: 'Penjualan', description: 'Penjualan, pemasaran, dan pengembangan pelanggan' },
    { name: 'SDM', description: 'Sumber daya manusia, rekrutmen, dan pengembangan karyawan' },
    { name: 'Gudang', description: 'Pengelolaan stok, pergudangan, dan logistik' },
    { name: 'IT', description: 'Pengembangan perangkat lunak dan infrastruktur teknologi' },
    { name: 'Operasional', description: 'Operasional harian, administrasi, dan dukungan pelanggan' },
];

// ─── Employee (15) ───────────────────────────────────────────
// Urutan penting — leave/payroll mereferensikan index karyawan (employeeIdx).
// `departmentName` = nama Department (C3) yang di-link via departmentId;
// field string `department` (legacy) diisi dengan nama yang sama.

export interface HrEmployeeSpec {
    employeeId: string;
    name: string;
    email: string;
    phone: string;
    position: string;
    departmentName: string;
    joinDate: string; // ISO date
    salary: number;
    /** Tunjangan tetap per bulan (komponen payroll). */
    allowances: number;
    /** Potongan tetap per bulan (komponen payroll). */
    deductions: number;
}

export const HR_EMPLOYEES: readonly HrEmployeeSpec[] = [
    { employeeId: 'EMP-001', name: 'Budi Santoso', email: 'budi@qalcuity.com', phone: '0812-3456-7890', position: 'Software Engineer', departmentName: 'IT', joinDate: '2024-01-15', salary: 15000000, allowances: 1500000, deductions: 500000 },
    { employeeId: 'EMP-002', name: 'Sari Dewi', email: 'sari@qalcuity.com', phone: '0812-4567-8901', position: 'Marketing Manager', departmentName: 'Penjualan', joinDate: '2023-06-01', salary: 18000000, allowances: 2000000, deductions: 600000 },
    { employeeId: 'EMP-003', name: 'Andi Pratama', email: 'andi@qalcuity.com', phone: '0812-5678-9012', position: 'Accountant', departmentName: 'Keuangan', joinDate: '2025-03-10', salary: 12000000, allowances: 1500000, deductions: 400000 },
    { employeeId: 'EMP-004', name: 'Dewi Lestari', email: 'dewi@qalcuity.com', phone: '0812-6789-0123', position: 'HR Specialist', departmentName: 'SDM', joinDate: '2024-09-01', salary: 12000000, allowances: 1500000, deductions: 400000 },
    { employeeId: 'EMP-005', name: 'Eko Prasetyo', email: 'eko@qalcuity.com', phone: '0812-7890-1234', position: 'Sales Executive', departmentName: 'Penjualan', joinDate: '2025-03-01', salary: 14000000, allowances: 1500000, deductions: 500000 },
    { employeeId: 'EMP-006', name: 'Rina Wulandari', email: 'rina@qalcuity.com', phone: '0813-1234-5678', position: 'UI/UX Designer', departmentName: 'IT', joinDate: '2024-03-01', salary: 13000000, allowances: 1500000, deductions: 450000 },
    { employeeId: 'EMP-007', name: 'Fajar Nugroho', email: 'fajar@qalcuity.com', phone: '0813-2345-6789', position: 'DevOps Engineer', departmentName: 'IT', joinDate: '2024-06-15', salary: 16000000, allowances: 2000000, deductions: 550000 },
    { employeeId: 'EMP-008', name: 'Maya Sari', email: 'maya@qalcuity.com', phone: '0813-3456-7890', position: 'Content Writer', departmentName: 'Penjualan', joinDate: '2025-01-10', salary: 8000000, allowances: 1000000, deductions: 300000 },
    { employeeId: 'EMP-009', name: 'Rizky Pratama', email: 'rizky@qalcuity.com', phone: '0813-4567-8901', position: 'Sales Manager', departmentName: 'Penjualan', joinDate: '2023-09-01', salary: 20000000, allowances: 2500000, deductions: 700000 },
    { employeeId: 'EMP-010', name: 'Putri Ayu', email: 'putri@qalcuity.com', phone: '0813-5678-9012', position: 'Finance Manager', departmentName: 'Keuangan', joinDate: '2023-03-15', salary: 22000000, allowances: 3000000, deductions: 800000 },
    { employeeId: 'EMP-011', name: 'Ahmad Hidayat', email: 'ahmad@qalcuity.com', phone: '0813-6789-0123', position: 'Warehouse Supervisor', departmentName: 'Gudang', joinDate: '2024-04-20', salary: 9000000, allowances: 1000000, deductions: 350000 },
    { employeeId: 'EMP-012', name: 'Lestari Putri', email: 'lestari@qalcuity.com', phone: '0813-7890-1234', position: 'Admin Officer', departmentName: 'Operasional', joinDate: '2025-02-01', salary: 7000000, allowances: 1000000, deductions: 300000 },
    { employeeId: 'EMP-013', name: 'Dedi Kurniawan', email: 'dedi@qalcuity.com', phone: '0813-8901-2345', position: 'Quality Assurance', departmentName: 'IT', joinDate: '2024-07-01', salary: 12000000, allowances: 1500000, deductions: 400000 },
    { employeeId: 'EMP-014', name: 'Nina Susanti', email: 'nina@qalcuity.com', phone: '0813-9012-3456', position: 'Customer Support Lead', departmentName: 'Operasional', joinDate: '2024-02-15', salary: 11000000, allowances: 1000000, deductions: 350000 },
    { employeeId: 'EMP-015', name: 'Reza Ferdiansyah', email: 'reza@qalcuity.com', phone: '0813-0123-4567', position: 'Business Analyst', departmentName: 'Operasional', joinDate: '2025-04-01', salary: 14000000, allowances: 1500000, deductions: 380000 },
];

// ─── Payroll (6 periode × 15 = 90 — C7) ─────────────────────

/** 6 periode berurutan; 4 terdahulu PAID, 2 terbaru PENDING. */
export const HR_PAYROLL_PERIODS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'] as const;

const PAID_PERIODS: ReadonlySet<string> = new Set(['2026-05', '2026-06', '2026-07', '2026-08']);

export interface HrPayrollSpec {
    period: string;
    employeeIdx: number;
    baseSalary: number;
    allowances: number;
    deductions: number;
    bonus: number;
    /** baseSalary + allowances − deductions + bonus (formula seed historis). */
    netSalary: number;
    status: 'PAID' | 'PENDING';
    /** ISO date; hanya untuk status PAID (akhir periode). */
    paidAt: string | null;
}

/** Hari terakhir bulan periode (UTC) — untuk paidAt payroll PAID. */
export function endOfMonthUtc(period: string): Date {
    const [year, month] = period.split('-').map(Number);
    return new Date(Date.UTC(year, month, 0));
}

/** Formula net salary seed historis: base + allowances − deductions + bonus. */
export function computeNetSalary(base: number, allowances: number, deductions: number, bonus: number): number {
    return base + allowances - deductions + bonus;
}

/**
 * Membangun 90 spesifikasi payroll secara deterministik (C7).
 * Bonus bervariasi via mulberry32(seed per employee+periode) — 0 atau 2–8% gaji
 * (dibulatkan ke 50 ribu terdekat); tunjangan/potongan konstan per karyawan.
 */
export function buildPayrollSpecs(): HrPayrollSpec[] {
    const specs: HrPayrollSpec[] = [];
    HR_PAYROLL_PERIODS.forEach((period, periodIdx) => {
        HR_EMPLOYEES.forEach((emp, employeeIdx) => {
            const rand = mulberry32(periodIdx * 1000 + employeeIdx + 1)();
            const bonus =
                rand < 0.35
                    ? 0
                    : Math.round((emp.salary * (0.02 + rand * 0.06)) / 50000) * 50000;
            const netSalary = computeNetSalary(emp.salary, emp.allowances, emp.deductions, bonus);
            const isPaid = PAID_PERIODS.has(period);
            specs.push({
                period,
                employeeIdx,
                baseSalary: emp.salary,
                allowances: emp.allowances,
                deductions: emp.deductions,
                bonus,
                netSalary,
                status: isPaid ? 'PAID' : 'PENDING',
                paidAt: isPaid ? endOfMonthUtc(period).toISOString() : null,
            });
        });
    });
    return specs;
}

// ─── Leave Requests (16 — C9) ────────────────────────────────
// 13 pengajuan historis + 3 tambahan (SICK/APPROVED, ANNUAL/PENDING,
// UNPAID/REJECTED). Semua tanggal berada di window attendance (weekdays).

export type HrLeaveType = 'ANNUAL' | 'SICK' | 'PERSONAL' | 'MATERNITY' | 'UNPAID';
export type HrLeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface HrLeaveSpec {
    employeeIdx: number;
    type: HrLeaveType;
    startDate: string; // ISO date
    endDate: string; // ISO date
    days: number;
    reason: string;
    status: HrLeaveStatus;
    appliedDate: string; // ISO date
    approvedBy?: string;
    notes?: string;
}

export const HR_LEAVE_SPECS: readonly HrLeaveSpec[] = [
    // ── 13 historis (dari seed.ts) ──
    { employeeIdx: 0, type: 'ANNUAL', startDate: '2026-08-04', endDate: '2026-08-05', days: 2, reason: 'Istirahat', status: 'APPROVED', appliedDate: '2026-08-01', approvedBy: 'Admin Qalcuity' },
    { employeeIdx: 1, type: 'SICK', startDate: '2026-08-03', endDate: '2026-08-03', days: 1, reason: 'Sakit demam', status: 'APPROVED', appliedDate: '2026-08-03', approvedBy: 'Admin Qalcuity' },
    { employeeIdx: 2, type: 'ANNUAL', startDate: '2026-08-06', endDate: '2026-08-08', days: 3, reason: 'Keluarga', status: 'PENDING', appliedDate: '2026-08-02' },
    { employeeIdx: 3, type: 'PERSONAL', startDate: '2026-08-20', endDate: '2026-08-20', days: 1, reason: 'Urusan pribadi — melebihi kuota cuti tahunan', status: 'REJECTED', appliedDate: '2026-08-10', approvedBy: 'Admin Qalcuity', notes: 'Ditolak karena kuota cuti tahunan habis' },
    { employeeIdx: 4, type: 'SICK', startDate: '2026-07-14', endDate: '2026-07-15', days: 2, reason: 'Sakit perut, diare', status: 'APPROVED', appliedDate: '2026-07-14', approvedBy: 'Admin Qalcuity' },
    { employeeIdx: 5, type: 'ANNUAL', startDate: '2026-07-21', endDate: '2026-07-25', days: 5, reason: 'Liburan keluarga ke Bali', status: 'APPROVED', appliedDate: '2026-07-10', approvedBy: 'Manager' },
    { employeeIdx: 6, type: 'ANNUAL', startDate: '2026-09-01', endDate: '2026-09-03', days: 3, reason: 'Menemani anak masuk sekolah', status: 'PENDING', appliedDate: '2026-08-25' },
    { employeeIdx: 7, type: 'SICK', startDate: '2026-08-12', endDate: '2026-08-12', days: 1, reason: 'Sakit kepala migrain', status: 'APPROVED', appliedDate: '2026-08-12', approvedBy: 'Admin Qalcuity' },
    { employeeIdx: 8, type: 'MATERNITY', startDate: '2026-09-01', endDate: '2026-12-01', days: 90, reason: 'Cuti melahirkan', status: 'APPROVED', appliedDate: '2026-08-15', approvedBy: 'HR Director' },
    { employeeIdx: 9, type: 'PERSONAL', startDate: '2026-08-28', endDate: '2026-08-28', days: 1, reason: 'Urusan pernikahan keluarga', status: 'PENDING', appliedDate: '2026-08-20' },
    { employeeIdx: 10, type: 'ANNUAL', startDate: '2026-07-07', endDate: '2026-07-09', days: 3, reason: 'Liburan Lebaran', status: 'APPROVED', appliedDate: '2026-07-01', approvedBy: 'Manager' },
    { employeeIdx: 11, type: 'SICK', startDate: '2026-08-06', endDate: '2026-08-07', days: 2, reason: 'DBD, rawat inap', status: 'APPROVED', appliedDate: '2026-08-06', approvedBy: 'Admin Qalcuity' },
    { employeeIdx: 12, type: 'ANNUAL', startDate: '2026-09-15', endDate: '2026-09-16', days: 2, reason: 'Wisuda anak', status: 'PENDING', appliedDate: '2026-08-28' },
    // ── 3 tambahan (C9) ──
    { employeeIdx: 13, type: 'SICK', startDate: '2026-09-22', endDate: '2026-09-23', days: 2, reason: 'Flu dan demam ringan', status: 'APPROVED', appliedDate: '2026-09-22', approvedBy: 'Admin Qalcuity' },
    { employeeIdx: 14, type: 'ANNUAL', startDate: '2026-09-28', endDate: '2026-09-30', days: 3, reason: 'Liburan akhir triwulan bersama keluarga', status: 'PENDING', appliedDate: '2026-09-20' },
    { employeeIdx: 9, type: 'UNPAID', startDate: '2026-09-10', endDate: '2026-09-10', days: 1, reason: 'Cuti tanpa dibayar untuk keperluan mendesak', status: 'REJECTED', appliedDate: '2026-09-05', approvedBy: 'Admin Qalcuity', notes: 'Ditolak — kebutuhan operasional tim sedang tinggi' },
];

// ============================================================
// 2. Helper murni (deterministik — unit-testable)
// ============================================================

/** Kunci tanggal UTC "YYYY-MM-DD". */
export function dateKeyUtc(date: Date): string {
    const d = toUtcDate(date);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Semua kunci tanggal (termasuk start & end) untuk rentang cuti. */
export function leaveDateKeys(startIso: string, endIso: string): string[] {
    const keys: string[] = [];
    const end = toUtcDate(endIso).getTime();
    let cursor = toUtcDate(startIso);
    while (cursor.getTime() <= end) {
        keys.push(dateKeyUtc(cursor));
        cursor = addDays(cursor, 1);
    }
    return keys;
}

/**
 * `count` hari kerja (Senin–Jumat) terakhir hingga anchorDate (inklusif jika
 * anchor hari kerja), diurutkan menaik. Menentukan tanggal attendance C8.
 */
export function listWorkdays(anchorDate: string, count: number): Date[] {
    const days: Date[] = [];
    let cursor = toUtcDate(anchorDate);
    while (days.length < count) {
        const weekday = cursor.getUTCDay(); // 0=Minggu, 6=Sabtu
        if (weekday !== 0 && weekday !== 6) days.push(cursor);
        cursor = addDays(cursor, -1);
    }
    return days.reverse();
}

export type HrAttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE' | 'WFH';

/** Pemetaan deterministik angka acak [0,1) → status kehadiran (C8). */
export function attendanceStatusFor(rand: number): HrAttendanceStatus {
    if (rand < 0.70) return 'PRESENT';
    if (rand < 0.83) return 'LATE';
    if (rand < 0.90) return 'WFH';
    if (rand < 0.95) return 'ABSENT';
    return 'LEAVE';
}

function hourOnDate(date: Date, hour: number, minute: number): Date {
    const d = toUtcDate(date);
    d.setUTCHours(hour, minute, 0, 0);
    return d;
}

// ============================================================
// 3. Seeder (idempotent, tenant-scoped)
// ============================================================

export interface SeedHrOptions {
    tenantId: string;
    /** Default HR_DEFAULT_ANCHOR_DATE ('2026-10-10') — sama dengan finance & crm. */
    anchorDate?: string;
}

export interface HrEntityRef {
    id: string;
    name: string;
}

export interface HrEmployeeRef extends HrEntityRef {
    employeeId: string;
}

export interface SeedHrResult {
    /** Total record dalam tenant setelah seeding (termasuk data existing). */
    counts: {
        departments: number;
        employees: number;
        payroll: number;
        attendance: number;
        leaves: number;
    };
    /** Jumlah record yang BARU dibuat pada run ini (0 = idempotent). */
    created: {
        departments: number;
        employees: number;
        payroll: number;
        attendance: number;
        leaves: number;
    };
    departments: HrEntityRef[];
    employees: HrEmployeeRef[];
}

export async function seedHrData(
    db: Prisma.TransactionClient,
    options: SeedHrOptions
): Promise<SeedHrResult> {
    const { tenantId } = options;
    const anchorDate = options.anchorDate ?? HR_DEFAULT_ANCHOR_DATE;

    // ─── Departments (C3 — upsert per name+tenant) ───────────
    const departments: HrEntityRef[] = [];
    let departmentsCreated = 0;
    for (const spec of HR_DEPARTMENTS) {
        const existing = await db.department.findFirst({
            where: { name: spec.name, tenantId },
            select: { id: true, name: true },
        });
        if (existing) {
            departments.push(existing);
        } else {
            const created = await db.department.create({
                data: { name: spec.name, description: spec.description, tenantId },
                select: { id: true, name: true },
            });
            departments.push(created);
            departmentsCreated += 1;
        }
    }
    const deptIdByName = new Map(departments.map((d) => [d.name, d.id]));

    // ─── Employees (link departmentId — C3) ──────────────────
    const employees: HrEmployeeRef[] = [];
    let employeesCreated = 0;
    for (const spec of HR_EMPLOYEES) {
        const departmentId = deptIdByName.get(spec.departmentName) ?? null;
        const existing = await db.employee.findFirst({
            where: { employeeId: spec.employeeId, tenantId },
            select: { id: true, employeeId: true, name: true, departmentId: true },
        });
        if (existing) {
            // Repair link departmentId bila belum terisi / menunjuk departemen lain.
            if (departmentId && existing.departmentId !== departmentId) {
                await db.employee.update({
                    where: { id: existing.id },
                    data: { departmentId, department: spec.departmentName },
                });
            }
            employees.push({ id: existing.id, employeeId: existing.employeeId, name: existing.name });
        } else {
            const created = await db.employee.create({
                data: {
                    employeeId: spec.employeeId,
                    name: spec.name,
                    email: spec.email,
                    phone: spec.phone,
                    position: spec.position,
                    department: spec.departmentName,
                    departmentId,
                    joinDate: toUtcDate(spec.joinDate),
                    salary: spec.salary,
                    tenantId,
                },
                select: { id: true, employeeId: true, name: true },
            });
            employees.push(created);
            employeesCreated += 1;
        }
    }

    // ─── Payroll (90 — C7; unik employeeId+period+tenant) ────
    const payrollSpecs = buildPayrollSpecs();
    let payrollCreated = 0;
    for (const spec of payrollSpecs) {
        const emp = employees[spec.employeeIdx];
        if (!emp) continue;
        const existing = await db.payrollRecord.findUnique({
            where: {
                employeeId_period_tenantId: { employeeId: emp.id, period: spec.period, tenantId },
            },
            select: { id: true },
        });
        if (existing) continue;
        await db.payrollRecord.create({
            data: {
                period: spec.period,
                baseSalary: spec.baseSalary,
                allowances: spec.allowances,
                deductions: spec.deductions,
                bonus: spec.bonus,
                netSalary: spec.netSalary,
                status: spec.status,
                paidAt: spec.paidAt ? toUtcDate(spec.paidAt) : null,
                employeeId: emp.id,
                tenantId,
            },
        });
        payrollCreated += 1;
    }

    // ─── Attendance (90 hari kerja — C8; LEAVE override C9) ──
    // Set tanggal cuti APPROVED per employee → status attendance LEAVE.
    const approvedLeaveKeys = new Map<string, Set<string>>();
    for (const spec of HR_LEAVE_SPECS) {
        if (spec.status !== 'APPROVED') continue;
        const emp = employees[spec.employeeIdx];
        if (!emp) continue;
        let set = approvedLeaveKeys.get(emp.id);
        if (!set) {
            set = new Set<string>();
            approvedLeaveKeys.set(emp.id, set);
        }
        for (const key of leaveDateKeys(spec.startDate, spec.endDate)) set.add(key);
    }

    const workdays = listWorkdays(anchorDate, HR_ATTENDANCE_DAYS);
    const existingAttendance = await db.attendanceRecord.findMany({
        where: { tenantId },
        select: { employeeId: true, date: true },
    });
    const existingAttendanceKeys = new Set(
        existingAttendance.map((a) => `${a.employeeId}|${dateKeyUtc(a.date)}`)
    );

    const attendanceCreates: Prisma.AttendanceRecordCreateManyInput[] = [];
    workdays.forEach((date, dayIdx) => {
        const dateStr = dateKeyUtc(date);
        employees.forEach((emp, employeeIdx) => {
            if (existingAttendanceKeys.has(`${emp.id}|${dateStr}`)) return;
            const onLeave = approvedLeaveKeys.get(emp.id)?.has(dateStr) ?? false;
            const rand = mulberry32(employeeIdx * 1000 + dayIdx + 1)();
            const status: HrAttendanceStatus = onLeave ? 'LEAVE' : attendanceStatusFor(rand);
            const clocked = status === 'PRESENT' || status === 'LATE';
            const notes =
                status === 'WFH'
                    ? 'Work from home'
                    : status === 'ABSENT'
                        ? 'Sakit'
                        : onLeave
                            ? 'Cuti (leave disetujui)'
                            : null;
            attendanceCreates.push({
                employeeId: emp.id,
                tenantId,
                date,
                clockIn: clocked ? hourOnDate(date, 8, status === 'LATE' ? 30 : 0) : null,
                clockOut: clocked ? hourOnDate(date, 17, 0) : null,
                status,
                workHours: clocked ? 8 : 0,
                notes,
            });
        });
    });
    let attendanceCreated = 0;
    if (attendanceCreates.length > 0) {
        const result = await db.attendanceRecord.createMany({ data: attendanceCreates });
        attendanceCreated = result.count;
    }

    // ─── Leave Requests (16 — C9; tanpa unique → findFirst) ──
    let leavesCreated = 0;
    for (const spec of HR_LEAVE_SPECS) {
        const emp = employees[spec.employeeIdx];
        if (!emp) continue;
        const existing = await db.leaveRequest.findFirst({
            where: {
                employeeId: emp.id,
                type: spec.type,
                startDate: toUtcDate(spec.startDate),
                tenantId,
            },
            select: { id: true },
        });
        if (existing) continue;
        await db.leaveRequest.create({
            data: {
                type: spec.type,
                startDate: toUtcDate(spec.startDate),
                endDate: toUtcDate(spec.endDate),
                days: spec.days,
                reason: spec.reason,
                status: spec.status,
                appliedDate: toUtcDate(spec.appliedDate),
                approvedBy: spec.approvedBy,
                notes: spec.notes,
                employeeId: emp.id,
                tenantId,
            },
        });
        leavesCreated += 1;
    }

    // ─── Counts total dalam tenant (untuk summary/verifikasi) ─
    const [departmentsTotal, employeesTotal, payrollTotal, attendanceTotal, leavesTotal] =
        await Promise.all([
            db.department.count({ where: { tenantId } }),
            db.employee.count({ where: { tenantId } }),
            db.payrollRecord.count({ where: { tenantId } }),
            db.attendanceRecord.count({ where: { tenantId } }),
            db.leaveRequest.count({ where: { tenantId } }),
        ]);

    return {
        counts: {
            departments: departmentsTotal,
            employees: employeesTotal,
            payroll: payrollTotal,
            attendance: attendanceTotal,
            leaves: leavesTotal,
        },
        created: {
            departments: departmentsCreated,
            employees: employeesCreated,
            payroll: payrollCreated,
            attendance: attendanceCreated,
            leaves: leavesCreated,
        },
        departments,
        employees,
    };
}
