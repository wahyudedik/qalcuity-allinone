import { prisma } from './db';

// ============================================
// Types
// ============================================

export interface PreCloseCheck {
    tenantId: string;
    startDate: Date;
    endDate: Date;
}

export interface CheckResult {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    count?: number;
}

export interface PreCloseResult {
    canClose: boolean;
    checks: CheckResult[];
}

// ============================================
// Pre-Close Checks
// ============================================

/**
 * Menjalankan semua pre-close checks sebelum menutup period akuntansi.
 * 
 * Checks:
 * 1. Ada journal entry DRAFT di period ini? (warning — tidak block)
 * 2. Ada journal entry yang belum balanced? (fail — block closing)
 * 3. Ada invoice yang belum posted/dibayar? (warning)
 * 4. Total debit == total credit untuk semua posted entries? (fail — block)
 * 5. Period sebelumnya sudah closed? (warning jika belum)
 */
export async function runPreCloseChecks(check: PreCloseCheck): Promise<PreCloseResult> {
    const { tenantId, startDate, endDate } = check;
    const checks: CheckResult[] = [];

    // Check 1: Ada journal entry DRAFT di period ini?
    const draftEntries = await prisma.journalEntry.findMany({
        where: {
            tenantId,
            date: { gte: startDate, lte: endDate },
            status: 'DRAFT',
        },
    });
    checks.push({
        name: 'draft_entries',
        status: draftEntries.length > 0 ? 'warning' : 'pass',
        message: draftEntries.length > 0
            ? `Ada ${draftEntries.length} jurnal dengan status DRAFT. Pertimbangkan untuk memposting atau membatalkan sebelum closing.`
            : 'Tidak ada jurnal DRAFT di period ini.',
        count: draftEntries.length,
    });

    // Check 2: Ada journal entry yang belum balanced?
    const unbalancedEntries = await prisma.journalEntry.findMany({
        where: {
            tenantId,
            date: { gte: startDate, lte: endDate },
            status: 'POSTED',
        },
    });

    const unbalancedCount = unbalancedEntries.filter((entry) => {
        const totalDebit = Number(entry.totalDebit);
        const totalCredit = Number(entry.totalCredit);
        return Math.abs(totalDebit - totalCredit) > 0.01;
    }).length;

    checks.push({
        name: 'unbalanced_entries',
        status: unbalancedCount > 0 ? 'fail' : 'pass',
        message: unbalancedCount > 0
            ? `Ada ${unbalancedCount} jurnal POSTED yang tidak balance (debit ≠ credit). Harus diperbaiki sebelum closing.`
            : 'Semua jurnal POSTED sudah balance.',
        count: unbalancedCount,
    });

    // Check 3: Ada invoice yang belum posted/dibayar?
    const unpaidInvoices = await prisma.invoice.findMany({
        where: {
            tenantId,
            createdAt: { gte: startDate, lte: endDate },
            status: { in: ['DRAFT', 'SENT', 'OVERDUE'] },
        },
    });
    checks.push({
        name: 'unpaid_invoices',
        status: unpaidInvoices.length > 0 ? 'warning' : 'pass',
        message: unpaidInvoices.length > 0
            ? `Ada ${unpaidInvoices.length} invoice yang belum dibayar/lunas.`
            : 'Semua invoice di period ini sudah lunas.',
        count: unpaidInvoices.length,
    });

    // Check 4: Total debit == total credit untuk semua posted entries
    const postedEntries = await prisma.journalEntry.findMany({
        where: {
            tenantId,
            date: { gte: startDate, lte: endDate },
            status: 'POSTED',
        },
    });

    let totalDebit = 0;
    let totalCredit = 0;
    for (const entry of postedEntries) {
        totalDebit += Number(entry.totalDebit);
        totalCredit += Number(entry.totalCredit);
    }

    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
    checks.push({
        name: 'total_balance',
        status: isBalanced ? 'pass' : 'fail',
        message: isBalanced
            ? `Total debit (Rp ${totalDebit.toLocaleString('id-ID')}) = Total credit (Rp ${totalCredit.toLocaleString('id-ID')}).`
            : `Total debit (Rp ${totalDebit.toLocaleString('id-ID')}) ≠ Total credit (Rp ${totalCredit.toLocaleString('id-ID')}). Selisih: Rp ${Math.abs(totalDebit - totalCredit).toLocaleString('id-ID')}`,
        count: postedEntries.length,
    });

    // Check 5: Period sebelumnya sudah closed?
    const previousPeriod = await prisma.accountingPeriod.findFirst({
        where: {
            tenantId,
            startDate: { lt: startDate },
        },
        orderBy: { startDate: 'desc' },
    });

    const prevPeriodClosed = previousPeriod?.status === 'CLOSED';
    checks.push({
        name: 'previous_period',
        status: prevPeriodClosed ? 'pass' : 'warning',
        message: previousPeriod
            ? prevPeriodClosed
                ? `Period sebelumnya (${previousPeriod.name}) sudah ditutup.`
                : `Period sebelumnya (${previousPeriod.name}) belum ditutup. Disarankan untuk menutup secara berurutan.`
            : 'Tidak ada period sebelumnya (ini adalah period pertama).',
    });

    // Determine if closing is allowed
    const hasBlockingFail = checks.some((c) => c.status === 'fail');
    const canClose = !hasBlockingFail;

    return { canClose, checks };
}

// ============================================
// Generate Periods for Current Year
// ============================================

const MONTH_NAMES_ID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/**
 * Auto-generate 12 monthly periods untuk tahun tertentu jika belum ada.
 */
export async function generateYearlyPeriods(tenantId: string, year: number) {
    const created = [];
    for (let month = 0; month < 12; month++) {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
        const name = `${MONTH_NAMES_ID[month]} ${year}`;

        // Check if already exists
        const existing = await prisma.accountingPeriod.findFirst({
            where: { tenantId, startDate },
        });

        if (!existing) {
            const period = await prisma.accountingPeriod.create({
                data: {
                    tenantId,
                    name,
                    startDate,
                    endDate,
                    status: 'OPEN',
                },
            });
            created.push(period);
        }
    }
    return created;
}
