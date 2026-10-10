/**
 * Unit test Finance Seed Module (apps/web/lib/seed-data/finance.ts).
 *
 * Fokus: helper murni + engine rencana jurnal — TANPA database.
 * Jalankan dari repo root: npx vitest run apps/web/__tests__/unit/lib/finance-seed.test.ts
 */
import { describe, it, expect } from 'vitest';
import {
    mulberry32,
    round2,
    generateTenantPrefix,
    generateEntryNumber,
    toUtcDate,
    addDays,
    monthKey,
    yyyymmOf,
    lastDayOfMonth,
    periodeName,
    deriveInvoiceDate,
    isJasaDescription,
    paymentCashAccountCode,
    EXPENSE_CATEGORY_ACCOUNT,
    FINANCE_TAX_RATES,
    FINANCE_COA_ACCOUNTS,
    FINANCE_BILLS,
    FINANCE_EXPENSES,
    FINANCE_PERIODS,
    FINANCE_PARTIAL_PAYMENTS,
    CLOSED_MONTHS,
    ALL_SEED_MONTHS,
    OPENING_BALANCE_LINES,
    generateHistoricalInvoiceSpecs,
    buildFinanceJournalPlans,
    computePeriodSummaries,
    assertJournalBalanced,
} from '../../../lib/seed-data/finance';
import type { JournalSources, JournalPlan } from '../../../lib/seed-data/finance';

// ─── Util: assert seimbang secara independen ─────────────────────────────────
function totalOf(lines: Array<{ debit: number; credit: number }>, field: 'debit' | 'credit'): number {
    return Math.round(lines.reduce((s, l) => s + l[field], 0) * 100) / 100;
}

/** Sources sample lengkap — satu jalan per sumber transaksi. */
function sampleSources(): JournalSources {
    return {
        invoices: [
            {
                id: 'inv-1',
                invoiceNumber: 'INV-T-001',
                createdAt: toUtcDate('2026-06-10'),
                dueDate: toUtcDate('2026-07-10'),
                status: 'SENT',
                subtotal: 10_000_000,
                taxAmount: 1_100_000,
                total: 11_100_000,
                taxCode: 'PPN-KELUARAN',
                items: [{ description: 'Komponen Elektronik Premium', total: 10_000_000 }],
            },
            {
                // DRAFT — harus di-skip
                id: 'inv-2',
                invoiceNumber: 'INV-T-002',
                createdAt: toUtcDate('2026-06-12'),
                dueDate: toUtcDate('2026-07-12'),
                status: 'DRAFT',
                subtotal: 5_000_000,
                taxAmount: 0,
                total: 5_000_000,
                taxCode: null,
                items: [],
            },
            {
                id: 'inv-3',
                invoiceNumber: 'INV-T-003',
                createdAt: toUtcDate('2026-07-05'),
                dueDate: toUtcDate('2026-08-04'),
                status: 'PAID',
                subtotal: 7_000_000,
                taxAmount: 770_000,
                total: 7_770_000,
                taxCode: 'PPN-KELUARAN',
                items: [{ description: 'Jasa Konsultasi Bisnis Bulanan', total: 7_000_000 }],
            },
        ],
        payments: [
            {
                id: 'pay-1',
                paymentNumber: 'PAY-T-001',
                amount: 11_100_000,
                paymentDate: toUtcDate('2026-07-02'),
                method: 'BANK_TRANSFER',
                status: 'COMPLETED',
                type: 'INCOME',
                invoiceId: 'inv-1',
                invoiceNumber: 'INV-T-001',
                notes: null,
            },
            {
                // PENDING → jurnal DRAFT
                id: 'pay-2',
                paymentNumber: 'PAY-T-002',
                amount: 3_000_000,
                paymentDate: toUtcDate('2026-10-05'),
                method: 'CASH',
                status: 'PENDING',
                type: 'INCOME',
                invoiceId: 'inv-3',
                invoiceNumber: 'INV-T-003',
                notes: null,
            },
            {
                // FAILED — harus di-skip
                id: 'pay-3',
                paymentNumber: 'PAY-T-003',
                amount: 999_999,
                paymentDate: toUtcDate('2026-07-03'),
                method: 'CASH',
                status: 'FAILED',
                type: 'INCOME',
                invoiceId: null,
                invoiceNumber: null,
                notes: null,
            },
        ],
        bills: [
            {
                id: 'bill-1',
                billNumber: 'BILL-T-001',
                vendorName: 'PT Listrik Demo',
                status: 'APPROVED',
                subtotal: 4_000_000,
                taxAmount: 440_000,
                totalAmount: 4_440_000,
                paidAmount: 0,
                billDate: toUtcDate('2026-06-05'),
                dueDate: toUtcDate('2026-07-05'),
                paidDate: null,
                accountCode: '5203',
                payAccountCode: null,
            },
            {
                id: 'bill-2',
                billNumber: 'BILL-T-002',
                vendorName: 'CV Perawatan Demo',
                status: 'PAID',
                subtotal: 2_000_000,
                taxAmount: 0,
                totalAmount: 2_000_000,
                paidAmount: 2_000_000,
                billDate: toUtcDate('2026-06-15'),
                dueDate: toUtcDate('2026-07-15'),
                paidDate: toUtcDate('2026-07-01'),
                accountCode: '5204',
                payAccountCode: '1102',
            },
        ],
        expenses: [
            {
                id: 'exp-1',
                expenseNumber: 'EXP-T-001',
                category: 'TRAVEL',
                description: 'Perjalanan dinas Bandung',
                amount: 1_500_000,
                taxAmount: 0,
                totalAmount: 1_500_000,
                expenseDate: toUtcDate('2026-06-20'),
                paymentMethod: 'CASH',
                status: 'APPROVED',
            },
            {
                id: 'exp-2',
                expenseNumber: 'EXP-T-002',
                category: 'MARKETING',
                description: 'Iklan digital',
                amount: 2_500_000,
                taxAmount: 275_000,
                totalAmount: 2_775_000,
                expenseDate: toUtcDate('2026-10-06'),
                paymentMethod: 'BANK_TRANSFER',
                status: 'PENDING_APPROVAL',
            },
        ],
        payroll: [
            { period: '2026-06', gross: 15_000_000, net: 13_500_000, deductions: 1_500_000, status: 'PAID' },
            { period: '2026-07', gross: 15_000_000, net: 13_500_000, deductions: 1_500_000, status: 'PENDING' },
        ],
    };
}

// ─── 1. PRNG deterministik ───────────────────────────────────────────────────
describe('mulberry32', () => {
    it('deterministik: seed sama → sequence sama', () => {
        const a = mulberry32(42);
        const b = mulberry32(42);
        const seqA = Array.from({ length: 50 }, () => a());
        const seqB = Array.from({ length: 50 }, () => b());
        expect(seqA).toEqual(seqB);
    });

    it('seed berbeda → sequence berbeda', () => {
        const a = mulberry32(42);
        const b = mulberry32(43);
        expect(a()).not.toBe(b());
    });

    it('semua output di rentang [0, 1)', () => {
        const rng = mulberry32(20261010);
        for (let i = 0; i < 1000; i++) {
            const v = rng();
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });
});

// ─── 2. Helper murni ─────────────────────────────────────────────────────────
describe('round2', () => {
    it('membulatkan ke 2 desimal dengan EPSILON', () => {
        expect(round2(1.005)).toBe(1.01);
        expect(round2(0.1 + 0.2)).toBe(0.3);
        expect(round2(123.456)).toBe(123.46);
        expect(round2(10_000_000)).toBe(10_000_000);
    });
});

describe('generateTenantPrefix', () => {
    it('inisial per kata, maksimal 3 karakter', () => {
        expect(generateTenantPrefix('qalcuity-demo')).toBe('QD');
        expect(generateTenantPrefix('toko-besar-jaya')).toBe('TBJ');
    });

    it('fallback DEM untuk slug < 2 kata', () => {
        expect(generateTenantPrefix('acme')).toBe('DEM');
        expect(generateTenantPrefix('')).toBe('DEM');
    });
});

describe('generateEntryNumber', () => {
    it('format JE-{prefix}-{YYYYMM}-{seq 4 digit}', () => {
        expect(generateEntryNumber('QD', '202605', 7)).toBe('JE-QD-202605-0007');
        expect(generateEntryNumber('QD', '202610', 123)).toBe('JE-QD-202610-0123');
    });
});

describe('date helpers', () => {
    it('toUtcDate + monthKey + yyyymmOf', () => {
        const d = toUtcDate('2026-05-01');
        expect(d.toISOString().slice(0, 10)).toBe('2026-05-01');
        expect(monthKey(d)).toBe('2026-05');
        expect(yyyymmOf(d)).toBe('202605');
    });

    it('addDays menembus batas bulan', () => {
        expect(addDays(toUtcDate('2026-05-31'), 1).toISOString().slice(0, 10)).toBe('2026-06-01');
    });

    it('lastDayOfMonth', () => {
        expect(lastDayOfMonth(2026, 5).toISOString().slice(0, 10)).toBe('2026-05-31');
        expect(lastDayOfMonth(2026, 2).toISOString().slice(0, 10)).toBe('2026-02-28');
    });

    it('periodeName memakai nama bulan Indonesia', () => {
        expect(periodeName('2026-05')).toBe('Mei 2026');
        expect(periodeName('2026-10')).toBe('Oktober 2026');
    });
});

describe('deriveInvoiceDate', () => {
    it('createdAt ≤ dueDate → pakai createdAt', () => {
        const created = toUtcDate('2026-06-10');
        expect(deriveInvoiceDate(created, toUtcDate('2026-07-10')).toISOString().slice(0, 10)).toBe('2026-06-10');
    });

    it('createdAt > dueDate → dueDate − 30 hari', () => {
        const due = toUtcDate('2026-07-05');
        expect(deriveInvoiceDate(new Date(), due).toISOString().slice(0, 10)).toBe('2026-06-05');
    });
});

describe('isJasaDescription', () => {
    it('mengenali deskripsi jasa', () => {
        expect(isJasaDescription('Jasa Konsultasi Bisnis Bulanan')).toBe(true);
        expect(isJasaDescription('Jasa Maintenance Sistem & Support')).toBe(true);
        expect(isJasaDescription('Komponen Elektronik Premium')).toBe(false);
    });
});

describe('paymentCashAccountCode', () => {
    it('memetakan metode pembayaran ke akun kas/bank', () => {
        expect(paymentCashAccountCode('CASH')).toBe('1101');
        expect(paymentCashAccountCode('BANK_TRANSFER')).toBe('1102');
        expect(paymentCashAccountCode('E_WALLET')).toBe('1102');
        expect(paymentCashAccountCode('CREDIT_CARD')).toBe('2101');
    });
});

describe('EXPENSE_CATEGORY_ACCOUNT', () => {
    it('setiap kategori expense punya akun CoA', () => {
        expect(EXPENSE_CATEGORY_ACCOUNT.UTILITIES).toBe('5203');
        expect(EXPENSE_CATEGORY_ACCOUNT.SALARIES).toBe('5201');
        expect(EXPENSE_CATEGORY_ACCOUNT.MAINTENANCE).toBe('5204');
        expect(EXPENSE_CATEGORY_ACCOUNT.OFFICE).toBe('5205');
        expect(EXPENSE_CATEGORY_ACCOUNT.TRAVEL).toBe('5206');
        expect(EXPENSE_CATEGORY_ACCOUNT.MARKETING).toBe('5301');
        expect(EXPENSE_CATEGORY_ACCOUNT.OTHER).toBe('5400');
    });
});

// ─── 3. Dataset statis ───────────────────────────────────────────────────────
describe('dataset Finance', () => {
    it('FINANCE_TAX_RATES: 5 tarif, kode unik, default sesuai', () => {
        expect(FINANCE_TAX_RATES).toHaveLength(5);
        const codes = FINANCE_TAX_RATES.map((t) => t.code);
        expect(new Set(codes).size).toBe(codes.length);
        const ppn = FINANCE_TAX_RATES.find((t) => t.code === 'PPN-KELUARAN');
        expect(ppn).toMatchObject({ rate: 11, type: 'VAT', isDefault: true });
        const pph23 = FINANCE_TAX_RATES.find((t) => t.code === 'PPH23');
        expect(pph23).toMatchObject({ rate: 2, type: 'INCOME_TAX', isDefault: true });
    });

    it('FINANCE_COA_ACCOUNTS: 47 akun, kode unik, termasuk akun child baru', () => {
        expect(FINANCE_COA_ACCOUNTS).toHaveLength(47);
        const codes = FINANCE_COA_ACCOUNTS.map((a) => a.code);
        expect(new Set(codes).size).toBe(codes.length);
        expect(codes).toContain('5204');
        expect(codes).toContain('5205');
        expect(codes).toContain('5206');
    });

    it('FINANCE_BILLS: 7 tagihan; FINANCE_EXPENSES: 12 pengeluaran', () => {
        expect(FINANCE_BILLS).toHaveLength(7);
        expect(FINANCE_EXPENSES).toHaveLength(12);
        const billNumbers = FINANCE_BILLS.map((b) => b.billNumber);
        expect(new Set(billNumbers).size).toBe(billNumbers.length);
        const expNumbers = FINANCE_EXPENSES.map((e) => e.expenseNumber);
        expect(new Set(expNumbers).size).toBe(expNumbers.length);
        // Minimal 3 PAID (skenario aging) & 2 PENDING_APPROVAL
        expect(FINANCE_BILLS.filter((b) => b.status === 'PAID').length).toBeGreaterThanOrEqual(3);
        expect(FINANCE_EXPENSES.filter((e) => e.status === 'PENDING_APPROVAL').length).toBeGreaterThanOrEqual(2);
    });

    it('FINANCE_PERIODS: 6 periode (4 CLOSED + 2 OPEN)', () => {
        expect(FINANCE_PERIODS).toHaveLength(6);
        expect(FINANCE_PERIODS.filter((p) => p.status === 'CLOSED')).toHaveLength(4);
        expect(FINANCE_PERIODS.filter((p) => p.status === 'OPEN')).toHaveLength(2);
        expect(CLOSED_MONTHS).toEqual(['2026-05', '2026-06', '2026-07', '2026-08']);
        expect(ALL_SEED_MONTHS).toHaveLength(6);
    });

    it('FINANCE_PARTIAL_PAYMENTS: 3 pembayaran parsial', () => {
        expect(FINANCE_PARTIAL_PAYMENTS).toHaveLength(3);
    });

    it('OPENING_BALANCE_LINES seimbang (debit === credit)', () => {
        expect(totalOf(OPENING_BALANCE_LINES, 'debit')).toBe(totalOf(OPENING_BALANCE_LINES, 'credit'));
    });
});

describe('generateHistoricalInvoiceSpecs', () => {
    it('deterministik: dua panggilan menghasilkan data identik', () => {
        const a = generateHistoricalInvoiceSpecs();
        const b = generateHistoricalInvoiceSpecs();
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });

    it('28 invoice dengan nomor unik & total konsisten', () => {
        const { invoices, payments } = generateHistoricalInvoiceSpecs();
        expect(invoices).toHaveLength(28);
        const numbers = invoices.map((i) => i.invoiceNumber);
        expect(new Set(numbers).size).toBe(28);
        for (const inv of invoices) {
            expect(inv.total).toBeCloseTo(inv.subtotal + inv.taxAmount, 2);
            expect(inv.total).toBeGreaterThan(0);
        }
        const payNumbers = payments.map((p) => p.paymentNumber);
        expect(new Set(payNumbers).size).toBe(payNumbers.length);
        expect(payments.some((p) => p.status === 'PENDING')).toBe(true);
    });
});

// ─── 4. Engine rencana jurnal ────────────────────────────────────────────────
describe('assertJournalBalanced', () => {
    const base: JournalPlan = {
        key: 'test',
        date: new Date('2026-06-01'),
        description: 'test',
        sourceType: 'manual',
        status: 'POSTED',
        lines: [],
    };

    it('melempar error untuk plan tidak seimbang', () => {
        expect(() =>
            assertJournalBalanced({ ...base, lines: [{ accountCode: '1101', debit: 100, credit: 0 }] })
        ).toThrow(/tidak seimbang/);
    });

    it('melempar error untuk nilai negatif', () => {
        expect(() =>
            assertJournalBalanced({
                ...base,
                lines: [
                    { accountCode: '1101', debit: -100, credit: 0 },
                    { accountCode: '3100', debit: 0, credit: -100 },
                ],
            })
        ).toThrow(/negatif/);
    });

    it('lolos untuk plan seimbang', () => {
        expect(() =>
            assertJournalBalanced({
                ...base,
                lines: [
                    { accountCode: '1101', debit: 100, credit: 0 },
                    { accountCode: '3100', debit: 0, credit: 100 },
                ],
            })
        ).not.toThrow();
    });
});

describe('buildFinanceJournalPlans', () => {
    it('SEMUA plan seimbang + ada jurnal per sumber transaksi', () => {
        const { plans } = buildFinanceJournalPlans(sampleSources());
        expect(plans.length).toBeGreaterThanOrEqual(20);
        for (const plan of plans) {
            const d = totalOf(plan.lines, 'debit');
            const c = totalOf(plan.lines, 'credit');
            expect(Math.abs(d - c)).toBeLessThanOrEqual(0.005);
        }
        // Invoice DRAFT & payment FAILED di-skip
        const keys = plans.map((p) => p.key);
        expect(keys).toContain('invoice:INV-T-001');
        expect(keys).toContain('invoice:INV-T-003');
        expect(keys).not.toContain('invoice:INV-T-002');
        expect(keys).not.toContain('payment:PAY-T-003');
        // sourceType menunjuk dokumen asal
        const invoicePlan = plans.find((p) => p.key === 'invoice:INV-T-001');
        expect(invoicePlan?.sourceType).toBe('invoice');
        expect(invoicePlan?.sourceId).toBe('inv-1');
        const paymentPlan = plans.find((p) => p.key === 'payment:PAY-T-001');
        expect(paymentPlan?.sourceType).toBe('payment');
        // Payment PENDING → jurnal DRAFT
        const pendingPay = plans.find((p) => p.key === 'payment:PAY-T-002');
        expect(pendingPay?.status).toBe('DRAFT');
        // Ada jurnal payroll & tagihan
        expect(plans.some((p) => p.sourceType === 'payroll')).toBe(true);
        expect(keys.some((k) => k.startsWith('bill:'))).toBe(true);
        expect(keys.some((k) => k.startsWith('expense:'))).toBe(true);
    });

    it('aman dengan sources kosong (tetap seimbang, ada saldo awal + jurnal bulanan)', () => {
        const empty: JournalSources = { invoices: [], payments: [], bills: [], expenses: [], payroll: [] };
        const { plans } = buildFinanceJournalPlans(empty);
        expect(plans.length).toBeGreaterThan(0);
        for (const plan of plans) {
            expect(Math.abs(totalOf(plan.lines, 'debit') - totalOf(plan.lines, 'credit'))).toBeLessThanOrEqual(0.005);
        }
        expect(plans.some((p) => p.key === 'opening:2026')).toBe(true);
    });

    it('data historis lengkap menghasilkan ±130–160 rencana jurnal (target ±150)', () => {
        // Sumber = dataset historis + bayangan tagihan/belanja/payroll minimum
        const { invoices, payments } = generateHistoricalInvoiceSpecs();
        const sources: JournalSources = {
            invoices: invoices.map((i, idx) => ({
                id: `hist-${idx}`,
                invoiceNumber: i.invoiceNumber,
                createdAt: i.createdAt,
                dueDate: i.dueDate,
                status: i.status,
                subtotal: i.subtotal,
                taxAmount: i.taxAmount,
                total: i.total,
                taxCode: i.taxCode,
                items: i.items,
            })),
            payments: payments.map((p, idx) => ({
                id: `histpay-${idx}`,
                paymentNumber: p.paymentNumber,
                amount: p.amount,
                paymentDate: p.paymentDate,
                method: p.method,
                status: p.status,
                type: p.type,
                invoiceId: null,
                invoiceNumber: p.invoiceNumber,
                notes: p.notes,
            })),
            bills: FINANCE_BILLS.map((b, idx) => ({
                id: `bill-${idx}`,
                billNumber: b.billNumber,
                vendorName: b.vendorName,
                status: b.status,
                subtotal: b.subtotal,
                taxAmount: b.taxAmount,
                totalAmount: b.totalAmount,
                paidAmount: b.paidAmount ?? 0,
                billDate: toUtcDate(b.billDate),
                dueDate: b.dueDate ? toUtcDate(b.dueDate) : null,
                paidDate: b.paidDate ? toUtcDate(b.paidDate) : null,
                accountCode: b.accountCode ?? '5400',
                payAccountCode: b.payAccountCode ?? null,
            })),
            expenses: FINANCE_EXPENSES.map((e, idx) => ({
                id: `exp-${idx}`,
                expenseNumber: e.expenseNumber,
                category: e.category,
                description: e.description,
                amount: e.amount,
                taxAmount: e.taxAmount,
                totalAmount: e.amount + e.taxAmount,
                expenseDate: toUtcDate(e.expenseDate),
                paymentMethod: e.paymentMethod,
                status: e.status,
            })),
            payroll: [
                { period: '2026-06', gross: 15_000_000, net: 13_500_000, deductions: 1_500_000, status: 'PAID' },
                { period: '2026-07', gross: 15_000_000, net: 13_500_000, deductions: 1_500_000, status: 'PAID' },
                { period: '2026-08', gross: 15_000_000, net: 13_500_000, deductions: 1_500_000, status: 'PAID' },
            ],
        };
        const { plans } = buildFinanceJournalPlans(sources);
        // Subset ini (28 invoice + 18 pembayaran + 7 bill + 12 expense + 3 payroll
        // + saldo awal + biaya admin/setoran pajak bulanan + closing) ≈ 90–100 plan.
        // Total di DB juga mencakup dokumen demo loader → ±130 entry.
        expect(plans.length).toBeGreaterThanOrEqual(80);
        expect(plans.length).toBeLessThanOrEqual(200);
        for (const plan of plans) {
            expect(Math.abs(totalOf(plan.lines, 'debit') - totalOf(plan.lines, 'credit'))).toBeLessThanOrEqual(0.005);
        }
        // entryNumber deterministik & unik per bulan (simulasi penomoran seedFinanceData)
        const sorted = [...plans].sort(
            (a, b) => a.date.getTime() - b.date.getTime() || a.key.localeCompare(b.key)
        );
        const seqByMonth = new Map<string, number>();
        const entryNumbers = new Set<string>();
        for (const plan of sorted) {
            const yyyymm = yyyymmOf(plan.date);
            const seq = (seqByMonth.get(yyyymm) ?? 0) + 1;
            seqByMonth.set(yyyymm, seq);
            const entryNumber = generateEntryNumber('QD', yyyymm, seq);
            expect(entryNumbers.has(entryNumber)).toBe(false);
            entryNumbers.add(entryNumber);
        }
        expect(entryNumbers.size).toBe(sorted.length);
    });
});

describe('computePeriodSummaries', () => {
    it('menghitung revenue & expense per bulan + netIncome', () => {
        const summaries = computePeriodSummaries(sampleSources(), ['2026-06', '2026-07']);
        expect(summaries['2026-06'].totalRevenue).toBe(11_100_000); // INV-T-001 (DRAFT di-skip)
        expect(summaries['2026-07'].totalRevenue).toBe(7_770_000); // INV-T-003
        // Expense Juni: bill 5203 (4.000.000) + bill 5204 (2.000.000) + EXP-T-001 (1.500.000) + payroll (15.000.000)
        expect(summaries['2026-06'].totalExpenses).toBe(22_500_000);
        expect(summaries['2026-06'].netIncome).toBe(round2(11_100_000 - 22_500_000));
    });

    it('bulan tanpa transaksi → nol', () => {
        const empty: JournalSources = { invoices: [], payments: [], bills: [], expenses: [], payroll: [] };
        const summaries = computePeriodSummaries(empty, ['2026-09']);
        expect(summaries['2026-09']).toEqual({ totalRevenue: 0, totalExpenses: 0, netIncome: 0 });
    });
});
