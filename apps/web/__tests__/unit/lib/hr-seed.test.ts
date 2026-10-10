/**
 * Unit Test — HR Demo Seed Module (apps/web/lib/seed-data/hr.ts)
 *
 * Menguji helper murni & invariant dataset statis (Subtask C3, C7–C9):
 *  - Department 7, Employee 15 ter-link departmentName valid
 *  - Payroll: buildPayrollSpecs() → 90 (6 periode × 15), deterministik,
 *    netSalary = base + allowances − deductions + bonus,
 *    periode lama PAID + paidAt, terbaru PENDING
 *  - Attendance: listWorkdays() → 90 hari kerja (weekdays) menaik
 *  - Leave: 16 pengajuan, mix status/type, 3 tambahan C9
 *
 * Jalankan: npx vitest run apps/web/__tests__/unit/lib/hr-seed.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
    HR_DEFAULT_ANCHOR_DATE,
    HR_ATTENDANCE_DAYS,
    HR_DEPARTMENTS,
    HR_EMPLOYEES,
    HR_PAYROLL_PERIODS,
    HR_LEAVE_SPECS,
    endOfMonthUtc,
    computeNetSalary,
    buildPayrollSpecs,
    dateKeyUtc,
    leaveDateKeys,
    listWorkdays,
    attendanceStatusFor,
} from '../../../lib/seed-data/hr';
import { toUtcDate } from '../../../lib/seed-data/finance';

// ============================================================
// Dataset — C3 Department + Employee
// ============================================================

describe('dataset HR_DEPARTMENTS (C3)', () => {
    it('7 divisi, nama unik', () => {
        expect(HR_DEPARTMENTS).toHaveLength(7);
        const names = HR_DEPARTMENTS.map((d) => d.name);
        expect(new Set(names).size).toBe(7);
        expect(names).toContain('Direksi');
        expect(names).toContain('Keuangan');
        expect(names).toContain('IT');
    });
});

describe('dataset HR_EMPLOYEES (C3)', () => {
    it('15 karyawan, employeeId & email unik', () => {
        expect(HR_EMPLOYEES).toHaveLength(15);
        const ids = HR_EMPLOYEES.map((e) => e.employeeId);
        const emails = HR_EMPLOYEES.map((e) => e.email);
        expect(new Set(ids).size).toBe(15);
        expect(new Set(emails).size).toBe(15);
    });

    it('setiap departmentName ter-link ke HR_DEPARTMENTS', () => {
        const deptNames = new Set(HR_DEPARTMENTS.map((d) => d.name));
        for (const e of HR_EMPLOYEES) {
            expect(deptNames.has(e.departmentName), `dept ${e.departmentName}`).toBe(true);
        }
    });

    it('gaji & komponen payroll wajar', () => {
        for (const e of HR_EMPLOYEES) {
            expect(e.salary).toBeGreaterThan(0);
            expect(e.allowances).toBeGreaterThanOrEqual(0);
            expect(e.deductions).toBeGreaterThanOrEqual(0);
            expect(e.joinDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
    });

    it('6 dari 7 departemen terpakai karyawan (Direksi kosong — diwakili user admin)', () => {
        const used = new Set(HR_EMPLOYEES.map((e) => e.departmentName));
        // 15 karyawan tersebar di 6 divisi operasional; Direksi sengaja tanpa
        // employee record (pimpinan diwakili user ADMIN/SUPERADMIN di tabel User).
        expect(used.size).toBe(6);
        expect(used.has('Direksi')).toBe(false);
    });
});

// ============================================================
// Helper murni — endOfMonthUtc + computeNetSalary
// ============================================================

describe('endOfMonthUtc', () => {
    it('hari terakhir bulan periode (UTC)', () => {
        const d = endOfMonthUtc('2026-05');
        expect(d.toISOString()).toContain('2026-05-31');
        expect(d.getUTCHours()).toBe(0);
    });

    it('menangani bulan ganjil/genap & tahun kabisat', () => {
        expect(endOfMonthUtc('2026-02').getUTCDate()).toBe(28); // 2026 bukan kabisat
        expect(endOfMonthUtc('2024-02').getUTCDate()).toBe(29); // kabisat
        expect(endOfMonthUtc('2026-09').getUTCDate()).toBe(30);
    });
});

describe('computeNetSalary', () => {
    it('base + allowances − deductions + bonus', () => {
        expect(computeNetSalary(1000000, 100000, 50000, 25000)).toBe(1075000);
        expect(computeNetSalary(5000, 0, 0, 0)).toBe(5000);
    });
});

// ============================================================
// Payroll — C7
// ============================================================

describe('buildPayrollSpecs (C7)', () => {
    const specs = buildPayrollSpecs();

    it('90 spesifikasi (6 periode × 15 karyawan), kombinasi unik', () => {
        expect(HR_PAYROLL_PERIODS).toHaveLength(6);
        expect(specs).toHaveLength(90);
        const keys = specs.map((s) => `${s.period}|${s.employeeIdx}`);
        expect(new Set(keys).size).toBe(90);
    });

    it('deterministik: dua panggilan menghasilkan data identik', () => {
        expect(buildPayrollSpecs()).toEqual(specs);
    });

    it('netSalary = base + allowances − deductions + bonus untuk SEMUA record', () => {
        for (const s of specs) {
            expect(s.netSalary).toBe(
                computeNetSalary(s.baseSalary, s.allowances, s.deductions, s.bonus)
            );
        }
    });

    it('komponen payroll konsisten dengan HR_EMPLOYEES', () => {
        for (const s of specs) {
            const emp = HR_EMPLOYEES[s.employeeIdx];
            expect(s.baseSalary).toBe(emp.salary);
            expect(s.allowances).toBe(emp.allowances);
            expect(s.deductions).toBe(emp.deductions);
        }
    });

    it('bonus deterministik ≥ 0 dan kelipatan 50 ribu', () => {
        for (const s of specs) {
            expect(s.bonus).toBeGreaterThanOrEqual(0);
            if (s.bonus > 0) {
                expect(s.bonus % 50000).toBe(0);
            }
        }
    });

    it('periode 2026-05..08 PAID + paidAt akhir bulan; 2026-09..10 PENDING + paidAt null', () => {
        const paidPeriods = new Set(['2026-05', '2026-06', '2026-07', '2026-08']);
        let paidCount = 0;
        let pendingCount = 0;
        for (const s of specs) {
            if (paidPeriods.has(s.period)) {
                expect(s.status).toBe('PAID');
                expect(s.paidAt).toBe(endOfMonthUtc(s.period).toISOString());
                paidCount += 1;
            } else {
                expect(s.status).toBe('PENDING');
                expect(s.paidAt).toBeNull();
                pendingCount += 1;
            }
        }
        expect(paidCount).toBe(60); // 4 periode × 15
        expect(pendingCount).toBe(30); // 2 periode × 15
    });
});

// ============================================================
// Leave — C9
// ============================================================

describe('dataset HR_LEAVE_SPECS (C9)', () => {
    it('16 pengajuan dengan mix status (PENDING/APPROVED/REJECTED semuanya ada)', () => {
        expect(HR_LEAVE_SPECS).toHaveLength(16);
        const statuses = new Set(HR_LEAVE_SPECS.map((l) => l.status));
        expect(statuses).toEqual(new Set(['PENDING', 'APPROVED', 'REJECTED']));
    });

    it('mix type lengkap (ANNUAL/SICK/PERSONAL/MATERNITY/UNPAID semuanya ada)', () => {
        const types = new Set(HR_LEAVE_SPECS.map((l) => l.type));
        expect(types).toEqual(new Set(['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'UNPAID']));
    });

    it('employeeIdx selalu valid + tanggal terurut + days positif', () => {
        for (const l of HR_LEAVE_SPECS) {
            expect(l.employeeIdx).toBeGreaterThanOrEqual(0);
            expect(l.employeeIdx).toBeLessThan(HR_EMPLOYEES.length);
            expect(l.startDate <= l.endDate).toBe(true);
            expect(l.days).toBeGreaterThan(0);
            expect(l.appliedDate <= l.startDate).toBe(true);
        }
    });

    it('3 tambahan C9 ada persis (SICK/APPROVED, ANNUAL/PENDING, UNPAID/REJECTED)', () => {
        expect(
            HR_LEAVE_SPECS.some(
                (l) =>
                    l.type === 'SICK' &&
                    l.status === 'APPROVED' &&
                    l.startDate === '2026-09-22' &&
                    l.employeeIdx === 13
            )
        ).toBe(true);
        expect(
            HR_LEAVE_SPECS.some(
                (l) =>
                    l.type === 'ANNUAL' &&
                    l.status === 'PENDING' &&
                    l.startDate === '2026-09-28' &&
                    l.employeeIdx === 14
            )
        ).toBe(true);
        expect(
            HR_LEAVE_SPECS.some(
                (l) =>
                    l.type === 'UNPAID' &&
                    l.status === 'REJECTED' &&
                    l.startDate === '2026-09-10' &&
                    l.employeeIdx === 9
            )
        ).toBe(true);
    });
});

// ============================================================
// Helper murni — dateKeyUtc + leaveDateKeys + listWorkdays + attendanceStatusFor
// ============================================================

describe('dateKeyUtc', () => {
    it('format YYYY-MM-DD dari Date UTC', () => {
        expect(dateKeyUtc(new Date(Date.UTC(2026, 8, 5)))).toBe('2026-09-05');
        expect(dateKeyUtc(toUtcDate('2026-10-10'))).toBe('2026-10-10');
    });

    it('pad nol untuk bulan/hari tunggal', () => {
        expect(dateKeyUtc(new Date(Date.UTC(2026, 0, 1)))).toBe('2026-01-01');
    });
});

describe('leaveDateKeys', () => {
    it('rentang inklusif start & end', () => {
        expect(leaveDateKeys('2026-08-04', '2026-08-05')).toEqual(['2026-08-04', '2026-08-05']);
        expect(leaveDateKeys('2026-09-01', '2026-09-01')).toEqual(['2026-09-01']);
    });

    it('melewati batas bulan dengan benar', () => {
        expect(leaveDateKeys('2026-08-30', '2026-09-02')).toEqual([
            '2026-08-30',
            '2026-08-31',
            '2026-09-01',
            '2026-09-02',
        ]);
    });
});

describe('listWorkdays (C8)', () => {
    // 2026-10-10 = Sabtu → hari kerja terakhir = Jumat 2026-10-09
    const days = listWorkdays(HR_DEFAULT_ANCHOR_DATE, HR_ATTENDANCE_DAYS);

    it('menghasilkan 90 hari kerja menaik tanpa weekend', () => {
        expect(days).toHaveLength(90);
        for (let i = 0; i < days.length; i++) {
            const weekday = days[i].getUTCDay();
            expect(weekday).not.toBe(0); // bukan Minggu
            expect(weekday).not.toBe(6); // bukan Sabtu
            if (i > 0) {
                expect(days[i].getTime()).toBeGreaterThan(days[i - 1].getTime());
            }
        }
    });

    it('hari terakhir = hari kerja terakhir ≤ anchor (anchor Sabtu → Jumat 2026-10-09)', () => {
        expect(dateKeyUtc(days[days.length - 1])).toBe('2026-10-09');
    });

    it('deterministik: dua panggilan identik', () => {
        expect(listWorkdays(HR_DEFAULT_ANCHOR_DATE, HR_ATTENDANCE_DAYS)).toEqual(days);
    });

    it('anchor hari kerja → termasuk anchor itu sendiri', () => {
        // 2026-10-09 = Jumat
        const d = listWorkdays('2026-10-09', 3);
        expect(d).toHaveLength(3);
        expect(dateKeyUtc(d[2])).toBe('2026-10-09');
    });
});

describe('attendanceStatusFor (C8)', () => {
    it('pemetaan threshold deterministik', () => {
        expect(attendanceStatusFor(0)).toBe('PRESENT');
        expect(attendanceStatusFor(0.69)).toBe('PRESENT');
        expect(attendanceStatusFor(0.70)).toBe('LATE');
        expect(attendanceStatusFor(0.82)).toBe('LATE');
        expect(attendanceStatusFor(0.83)).toBe('WFH');
        expect(attendanceStatusFor(0.89)).toBe('WFH');
        expect(attendanceStatusFor(0.90)).toBe('ABSENT');
        expect(attendanceStatusFor(0.94)).toBe('ABSENT');
        expect(attendanceStatusFor(0.95)).toBe('LEAVE');
        expect(attendanceStatusFor(0.999)).toBe('LEAVE');
    });
});
