import { prisma } from './db';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';

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

export interface PeriodCloseResult {
    success: boolean;
    periodId: string;
    closeSummary?: Record<string, unknown>;
    message: string;
    error?: string;
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

// ============================================
// Approval Check for Period Closing (GL-GAP-03)
// ============================================

/**
 * Check if user has permission to close an accounting period.
 * Only users with `finance:approve` permission (ADMIN+) can close periods.
 *
 * This is a role-based check — the user must be ADMIN or higher role.
 * The permission engine validates against the user's role assignment.
 */
export async function canUserClosePeriod(userId: string, tenantId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
        const user = await prisma.user.findFirst({
            where: { id: userId, tenantId },
            select: { role: true, isActive: true },
        });

        if (!user) {
            return { allowed: false, reason: 'User tidak ditemukan.' };
        }

        if (!user.isActive) {
            return { allowed: false, reason: 'User tidak aktif.' };
        }

        // Only ADMIN and SUPERADMIN can close periods
        const allowedRoles = ['ADMIN', 'SUPERADMIN'];
        if (!allowedRoles.includes(user.role)) {
            return {
                allowed: false,
                reason: `Role "${user.role}" tidak memiliki akses untuk menutup period. Diperlukan role ADMIN atau SUPERADMIN.`,
            };
        }

        return { allowed: true };
    } catch (error) {
        logger.error('[PeriodClosing] Error checking user permission:', error);
        return { allowed: false, reason: 'Gagal memeriksa permission user.' };
    }
}

// ============================================
// Close Period with Summary (GL-GAP-03 + GL-GAP-04)
// ============================================

/**
 * Close an accounting period with pre-close checks and summary generation.
 *
 * Steps:
 * 1. Run pre-close checks
 * 2. Verify user has permission (ADMIN+)
 * 3. Generate period summary (total entries, debit/credit, net income)
 * 4. Update period status to CLOSED
 * 5. Save closeSummary as JSON on AccountingPeriod
 */
export async function closePeriod(
    periodId: string,
    tenantId: string,
    userId: string,
    closeNotes?: string
): Promise<PeriodCloseResult> {
    try {
        // 1. Fetch the period
        const period = await prisma.accountingPeriod.findFirst({
            where: { id: periodId, tenantId },
        });

        if (!period) {
            return { success: false, periodId, message: 'Period tidak ditemukan.', error: 'NOT_FOUND' };
        }

        if (period.status === 'CLOSED') {
            return { success: false, periodId, message: 'Period sudah ditutup sebelumnya.', error: 'ALREADY_CLOSED' };
        }

        // 2. Run pre-close checks
        const preCloseResult = await runPreCloseChecks({
            tenantId,
            startDate: period.startDate,
            endDate: period.endDate,
        });

        if (!preCloseResult.canClose) {
            const failedChecks = preCloseResult.checks.filter((c) => c.status === 'fail');
            return {
                success: false,
                periodId,
                message: `Pre-close checks gagal: ${failedChecks.map((c) => c.message).join('; ')}`,
                error: 'PRE_CLOSE_FAILED',
            };
        }

        // 3. Check user permission
        const permission = await canUserClosePeriod(userId, tenantId);
        if (!permission.allowed) {
            return {
                success: false,
                periodId,
                message: permission.reason || 'Tidak memiliki akses untuk menutup period.',
                error: 'FORBIDDEN',
            };
        }

        // 4. Generate period summary
        const entries = await prisma.journalEntry.findMany({
            where: {
                tenantId,
                date: { gte: period.startDate, lte: period.endDate },
            },
        });

        const postedEntries = entries.filter((e) => e.status === 'POSTED');
        let totalDebit = 0;
        let totalCredit = 0;

        for (const entry of postedEntries) {
            totalDebit += Number(entry.totalDebit);
            totalCredit += Number(entry.totalCredit);
        }

        // Get revenue and expense totals from posted entries
        const postedItems = await prisma.journalEntryItem.findMany({
            where: {
                tenantId,
                journalEntry: {
                    status: 'POSTED',
                    date: { gte: period.startDate, lte: period.endDate },
                },
            },
            include: {
                account: { select: { type: true } },
            },
        });

        let totalRevenue = 0;
        let totalExpenses = 0;

        for (const item of postedItems) {
            const debit = Number(item.debit);
            const credit = Number(item.credit);
            if (item.account.type === 'REVENUE') {
                totalRevenue += credit - debit;
            } else if (item.account.type === 'EXPENSE') {
                totalExpenses += debit - credit;
            }
        }

        const netIncome = totalRevenue - totalExpenses;

        const closeSummary = {
            totalEntries: entries.length,
            postedEntries: postedEntries.length,
            draftEntries: entries.filter((e) => e.status === 'DRAFT').length,
            voidEntries: entries.filter((e) => e.status === 'VOID').length,
            totalDebit: Math.round(totalDebit * 10000) / 10000,
            totalCredit: Math.round(totalCredit * 10000) / 10000,
            balanceDifference: Math.round((totalDebit - totalCredit) * 10000) / 10000,
            totalRevenue: Math.round(totalRevenue * 10000) / 10000,
            totalExpenses: Math.round(totalExpenses * 10000) / 10000,
            netIncome: Math.round(netIncome * 10000) / 10000,
            closedBy: userId,
            closedAt: new Date().toISOString(),
        };

        // 5. Update period to CLOSED with summary
        await prisma.accountingPeriod.update({
            where: { id: periodId },
            data: {
                status: 'CLOSED',
                closedBy: userId,
                closedAt: new Date(),
                closeNotes: closeNotes || null,
                closeSummary: closeSummary as unknown as Prisma.InputJsonValue,
            },
        });

        return {
            success: true,
            periodId,
            closeSummary,
            message: `Period "${period.name}" berhasil ditutup. Laba Bersih: Rp ${netIncome.toLocaleString('id-ID')}`,
        };
    } catch (error) {
        logger.error('[PeriodClosing] Error closing period:', error);
        return {
            success: false,
            periodId,
            message: 'Gagal menutup period.',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
