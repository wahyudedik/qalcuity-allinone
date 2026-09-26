// ============================================
// Closing Entry Generator (GL-GAP-01)
//
// Year-end closing process:
// 1. Close all Revenue accounts → Income Summary
// 2. Close all Expense accounts → Income Summary
// 3. Close Income Summary → Retained Earnings
//
// This ensures Revenue and Expense accounts start
// with zero balance at the beginning of the new year.
// ============================================

import { prisma } from './db';
import { Prisma } from '@prisma/client';
import { logAudit } from './audit';
import { syncAccountBalance } from './balance-sync';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

export interface ClosingEntryResult {
    success: boolean;
    journalEntryIds: string[];
    netIncome: number;
    totalRevenue: number;
    totalExpenses: number;
    message: string;
    error?: string;
}

export interface PeriodClosingSummary {
    totalEntries: number;
    totalDebit: number;
    totalCredit: number;
    netIncome: number;
    totalRevenue: number;
    totalExpenses: number;
    revenueBreakdown: Array<{ accountId: string; code: string; name: string; balance: number }>;
    expenseBreakdown: Array<{ accountId: string; code: string; name: string; balance: number }>;
}

// ============================================
// Helper: Find or Create Account
// ============================================

/**
 * Find a CoA account by code, or create it if it doesn't exist.
 */
async function findOrCreateAccount(
    tx: Prisma.TransactionClient,
    tenantId: string,
    code: string,
    name: string,
    type: string,
    description: string
): Promise<string> {
    let account = await tx.coAAccount.findUnique({
        where: { tenantId_code: { tenantId, code } },
        select: { id: true },
    });

    if (!account) {
        account = await tx.coAAccount.create({
            data: {
                tenantId,
                code,
                name,
                type,
                description,
                isActive: true,
            },
            select: { id: true },
        });
    }

    return account.id;
}

// ============================================
// Generate Entry Number
// ============================================

async function generateEntryNumber(
    tx: Prisma.TransactionClient,
    tenantId: string,
    prefix: string
): Promise<string> {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const prefixStr = `${prefix}-${dateStr}-`;

    const lastEntry = await tx.journalEntry.findFirst({
        where: {
            tenantId,
            entryNumber: { startsWith: prefixStr },
        },
        orderBy: { entryNumber: 'desc' },
        select: { entryNumber: true },
    });

    let seq = 1;
    if (lastEntry) {
        const lastSeq = parseInt(lastEntry.entryNumber.split('-').pop() || '0', 10);
        seq = lastSeq + 1;
    }

    return `${prefixStr}${String(seq).padStart(4, '0')}`;
}

// ============================================
// Generate Closing Entries
// ============================================

/**
 * Generate year-end closing entries for a specific period.
 *
 * Process:
 * 1. Find all REVENUE accounts with posted journal entries in this period
 * 2. Find all EXPENSE accounts with posted journal entries in this period
 * 3. Create closing entries to zero out Revenue and Expense accounts
 * 4. Transfer net income/loss to Retained Earnings
 *
 * Journal entries created:
 *   JE-1: DR Revenue accounts → CR Income Summary (4001)
 *   JE-2: DR Income Summary → CR Expense accounts (5001)
 *   JE-3: DR/CR Income Summary → CR/DR Retained Earnings (3101)
 */
export async function generateClosingEntries(
    tenantId: string,
    periodId: string,
    userId: string,
    request?: Request
): Promise<ClosingEntryResult> {
    try {
        // 1. Fetch the period
        const period = await prisma.accountingPeriod.findFirst({
            where: { id: periodId, tenantId },
        });

        if (!period) {
            return { success: false, journalEntryIds: [], netIncome: 0, totalRevenue: 0, totalExpenses: 0, message: 'Period not found', error: 'Period not found' };
        }

        if (period.status !== 'OPEN' && period.status !== 'CLOSING') {
            return { success: false, journalEntryIds: [], netIncome: 0, totalRevenue: 0, totalExpenses: 0, message: 'Period must be OPEN or CLOSING to generate closing entries', error: 'Invalid period status' };
        }

        // 2. Find all REVENUE accounts with posted entries in this period
        const revenueItems = await prisma.journalEntryItem.findMany({
            where: {
                tenantId,
                account: { type: 'REVENUE' },
                journalEntry: {
                    status: 'POSTED',
                    date: { gte: period.startDate, lte: period.endDate },
                },
            },
            include: {
                account: { select: { id: true, code: true, name: true, type: true } },
            },
        });

        // 3. Find all EXPENSE accounts with posted entries in this period
        const expenseItems = await prisma.journalEntryItem.findMany({
            where: {
                tenantId,
                account: { type: 'EXPENSE' },
                journalEntry: {
                    status: 'POSTED',
                    date: { gte: period.startDate, lte: period.endDate },
                },
            },
            include: {
                account: { select: { id: true, code: true, name: true, type: true } },
            },
        });

        // 4. Aggregate by account
        const revenueByAccount = new Map<string, { accountId: string; code: string; name: string; totalDebit: number; totalCredit: number }>();
        for (const item of revenueItems) {
            const existing = revenueByAccount.get(item.accountId) || {
                accountId: item.accountId,
                code: item.account.code,
                name: item.account.name,
                totalDebit: 0,
                totalCredit: 0,
            };
            existing.totalDebit += Number(item.debit);
            existing.totalCredit += Number(item.credit);
            revenueByAccount.set(item.accountId, existing);
        }

        const expenseByAccount = new Map<string, { accountId: string; code: string; name: string; totalDebit: number; totalCredit: number }>();
        for (const item of expenseItems) {
            const existing = expenseByAccount.get(item.accountId) || {
                accountId: item.accountId,
                code: item.account.code,
                name: item.account.name,
                totalDebit: 0,
                totalCredit: 0,
            };
            existing.totalDebit += Number(item.debit);
            existing.totalCredit += Number(item.credit);
            expenseByAccount.set(item.accountId, existing);
        }

        // 5. Check if there are any revenue or expenses to close
        const hasRevenue = revenueByAccount.size > 0;
        const hasExpenses = expenseByAccount.size > 0;

        if (!hasRevenue && !hasExpenses) {
            return {
                success: true,
                journalEntryIds: [],
                netIncome: 0,
                totalRevenue: 0,
                totalExpenses: 0,
                message: 'Tidak ada pendapatan atau biaya yang perlu ditutup di period ini.',
            };
        }

        // 6. Calculate totals (using normal balance: Revenue = credit - debit, Expense = debit - credit)
        let totalRevenue = 0;
        for (const [, acct] of revenueByAccount) {
            totalRevenue += acct.totalCredit - acct.totalDebit;
        }

        let totalExpenses = 0;
        for (const [, acct] of expenseByAccount) {
            totalExpenses += acct.totalDebit - acct.totalCredit;
        }

        totalRevenue = Math.round(totalRevenue * 10000) / 10000;
        totalExpenses = Math.round(totalExpenses * 10000) / 10000;
        const netIncome = Math.round((totalRevenue - totalExpenses) * 10000) / 10000;

        // 7. Create closing entries in a transaction
        const journalEntryIds: string[] = [];

        await prisma.$transaction(async (tx) => {
            // Standard accounts
            const incomeSummaryId = await findOrCreateAccount(
                tx, tenantId, '4000', 'Income Summary', 'EQUITY',
                'Akun sementara untuk proses closing tahunan'
            );
            const retainedEarningsId = await findOrCreateAccount(
                tx, tenantId, '3101', 'Laba Ditahan', 'EQUITY',
                'Akumulasi laba/rugi yang ditahan dari tahun ke tahun'
            );

            // JE-1: Close Revenue accounts → Income Summary
            if (hasRevenue) {
                const revenueLines: Array<{ accountId: string; debit: number; credit: number; description: string }> = [];

                for (const [, acct] of revenueByAccount) {
                    // Revenue has credit balance, so we DEBIT to close it
                    const closeAmount = acct.totalCredit - acct.totalDebit;
                    if (closeAmount > 0) {
                        revenueLines.push({
                            accountId: acct.accountId,
                            debit: closeAmount,
                            credit: 0,
                            description: `Tutup ${acct.name} (${acct.code}) ke Income Summary`,
                        });
                    }
                }

                // Credit Income Summary with total revenue
                revenueLines.push({
                    accountId: incomeSummaryId,
                    debit: 0,
                    credit: totalRevenue,
                    description: `Income Summary — total pendapatan ${period.name}`,
                });

                if (revenueLines.length > 0) {
                    const totalDebit = revenueLines.reduce((s, l) => s + l.debit, 0);
                    const totalCredit = revenueLines.reduce((s, l) => s + l.credit, 0);

                    const entryNumber = await generateEntryNumber(tx, tenantId, 'CLS');
                    const je = await tx.journalEntry.create({
                        data: {
                            tenantId,
                            entryNumber,
                            date: new Date(),
                            description: `Closing Entry — Tutup Pendapatan (${period.name})`,
                            reference: period.name,
                            sourceType: 'closing',
                            sourceId: periodId,
                            status: 'POSTED',
                            totalDebit: Math.round(totalDebit * 10000) / 10000,
                            totalCredit: Math.round(totalCredit * 10000) / 10000,
                            createdBy: userId,
                            items: {
                                create: revenueLines.map((line) => ({
                                    tenantId,
                                    accountId: line.accountId,
                                    debit: line.debit,
                                    credit: line.credit,
                                    description: line.description,
                                })),
                            },
                        },
                    });
                    journalEntryIds.push(je.id);
                }
            }

            // JE-2: Close Expense accounts → Income Summary
            if (hasExpenses) {
                const expenseLines: Array<{ accountId: string; debit: number; credit: number; description: string }> = [];

                // Debit Income Summary with total expenses
                expenseLines.push({
                    accountId: incomeSummaryId,
                    debit: totalExpenses,
                    credit: 0,
                    description: `Income Summary — total biaya ${period.name}`,
                });

                for (const [, acct] of expenseByAccount) {
                    // Expense has debit balance, so we CREDIT to close it
                    const closeAmount = acct.totalDebit - acct.totalCredit;
                    if (closeAmount > 0) {
                        expenseLines.push({
                            accountId: acct.accountId,
                            debit: 0,
                            credit: closeAmount,
                            description: `Tutup ${acct.name} (${acct.code}) ke Income Summary`,
                        });
                    }
                }

                if (expenseLines.length > 0) {
                    const totalDebit = expenseLines.reduce((s, l) => s + l.debit, 0);
                    const totalCredit = expenseLines.reduce((s, l) => s + l.credit, 0);

                    const entryNumber = await generateEntryNumber(tx, tenantId, 'CLS');
                    const je = await tx.journalEntry.create({
                        data: {
                            tenantId,
                            entryNumber,
                            date: new Date(),
                            description: `Closing Entry — Tutup Biaya (${period.name})`,
                            reference: period.name,
                            sourceType: 'closing',
                            sourceId: periodId,
                            status: 'POSTED',
                            totalDebit: Math.round(totalDebit * 10000) / 10000,
                            totalCredit: Math.round(totalCredit * 10000) / 10000,
                            createdBy: userId,
                            items: {
                                create: expenseLines.map((line) => ({
                                    tenantId,
                                    accountId: line.accountId,
                                    debit: line.debit,
                                    credit: line.credit,
                                    description: line.description,
                                })),
                            },
                        },
                    });
                    journalEntryIds.push(je.id);
                }
            }

            // JE-3: Close Income Summary → Retained Earnings
            if (netIncome !== 0) {
                const netIncomeAbs = Math.abs(netIncome);
                const incomeLines: Array<{ accountId: string; debit: number; credit: number; description: string }> = [];

                if (netIncome > 0) {
                    // Net income: Income Summary has credit balance → DEBIT to close
                    incomeLines.push({
                        accountId: incomeSummaryId,
                        debit: netIncomeAbs,
                        credit: 0,
                        description: `Tutup Income Summary — laba bersih ${period.name}`,
                    });
                    incomeLines.push({
                        accountId: retainedEarningsId,
                        debit: 0,
                        credit: netIncomeAbs,
                        description: `Laba ditahan dari ${period.name}`,
                    });
                } else {
                    // Net loss: Income Summary has debit balance → CREDIT to close
                    incomeLines.push({
                        accountId: incomeSummaryId,
                        debit: 0,
                        credit: netIncomeAbs,
                        description: `Tutup Income Summary — rugi bersih ${period.name}`,
                    });
                    incomeLines.push({
                        accountId: retainedEarningsId,
                        debit: netIncomeAbs,
                        credit: 0,
                        description: `Rugi bersih ditambahkan ke laba ditahan ${period.name}`,
                    });
                }

                const totalDebit = incomeLines.reduce((s, l) => s + l.debit, 0);
                const totalCredit = incomeLines.reduce((s, l) => s + l.credit, 0);

                const entryNumber = await generateEntryNumber(tx, tenantId, 'CLS');
                const je = await tx.journalEntry.create({
                    data: {
                        tenantId,
                        entryNumber,
                        date: new Date(),
                        description: `Closing Entry — Transfer ke Laba Ditahan (${period.name})`,
                        reference: period.name,
                        sourceType: 'closing',
                        sourceId: periodId,
                        status: 'POSTED',
                        totalDebit: Math.round(totalDebit * 10000) / 10000,
                        totalCredit: Math.round(totalCredit * 10000) / 10000,
                        createdBy: userId,
                        items: {
                            create: incomeLines.map((line) => ({
                                tenantId,
                                accountId: line.accountId,
                                debit: line.debit,
                                credit: line.credit,
                                description: line.description,
                            })),
                        },
                    },
                });
                journalEntryIds.push(je.id);
            }
        });

        // 8. Sync affected account balances
        for (const jeId of journalEntryIds) {
            try {
                const items = await prisma.journalEntryItem.findMany({
                    where: { journalEntryId: jeId, tenantId },
                    select: { accountId: true },
                });
                const accountIds = [...new Set(items.map((i) => i.accountId))];
                for (const accountId of accountIds) {
                    await syncAccountBalance(accountId, tenantId);
                }
            } catch (syncError) {
                logger.error(`[ClosingEntry] Balance sync failed for JE ${jeId}:`, syncError);
                // Non-blocking — entries are created, sync can be retried
            }
        }

        // 9. Audit logging
        if (request) {
            void logAudit({
                userId,
                tenantId,
                action: 'CREATE',
                entity: 'ClosingEntry',
                entityId: periodId,
                newValues: {
                    periodId,
                    periodName: period.name,
                    journalEntryIds,
                    totalRevenue,
                    totalExpenses,
                    netIncome,
                },
                request,
            });
        }

        return {
            success: true,
            journalEntryIds,
            netIncome,
            totalRevenue,
            totalExpenses,
            message: `Closing entries berhasil dibuat. Pendapatan: Rp ${totalRevenue.toLocaleString('id-ID')}, Biaya: Rp ${totalExpenses.toLocaleString('id-ID')}, Laba Bersih: Rp ${netIncome.toLocaleString('id-ID')}`,
        };
    } catch (error) {
        logger.error('[ClosingEntry] Error generating closing entries:', error);
        return {
            success: false,
            journalEntryIds: [],
            netIncome: 0,
            totalRevenue: 0,
            totalExpenses: 0,
            message: 'Gagal membuat closing entries',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// ============================================
// Generate Period Summary
// ============================================

/**
 * Generate a summary of accounting activity for a period.
 * Used for Period Closing Report (GL-GAP-04).
 */
export async function generatePeriodSummary(
    tenantId: string,
    periodId: string
): Promise<PeriodClosingSummary> {
    const period = await prisma.accountingPeriod.findFirst({
        where: { id: periodId, tenantId },
    });

    if (!period) {
        throw new Error('Period not found');
    }

    // Get all posted entries in this period
    const entries = await prisma.journalEntry.findMany({
        where: {
            tenantId,
            status: 'POSTED',
            date: { gte: period.startDate, lte: period.endDate },
        },
        include: {
            items: {
                include: {
                    account: { select: { id: true, code: true, name: true, type: true } },
                },
            },
        },
    });

    let totalDebit = 0;
    let totalCredit = 0;

    // Aggregate revenue by account
    const revenueMap = new Map<string, { accountId: string; code: string; name: string; balance: number }>();
    const expenseMap = new Map<string, { accountId: string; code: string; name: string; balance: number }>();

    for (const entry of entries) {
        totalDebit += Number(entry.totalDebit);
        totalCredit += Number(entry.totalCredit);

        for (const item of entry.items) {
            const acct = item.account;
            if (acct.type === 'REVENUE') {
                const existing = revenueMap.get(acct.id) || { accountId: acct.id, code: acct.code, name: acct.name, balance: 0 };
                existing.balance += Number(item.credit) - Number(item.debit);
                revenueMap.set(acct.id, existing);
            } else if (acct.type === 'EXPENSE') {
                const existing = expenseMap.get(acct.id) || { accountId: acct.id, code: acct.code, name: acct.name, balance: 0 };
                existing.balance += Number(item.debit) - Number(item.credit);
                expenseMap.set(acct.id, existing);
            }
        }
    }

    const totalRevenue = Math.round(Array.from(revenueMap.values()).reduce((s, a) => s + a.balance, 0) * 10000) / 10000;
    const totalExpenses = Math.round(Array.from(expenseMap.values()).reduce((s, a) => s + a.balance, 0) * 10000) / 10000;
    const netIncome = Math.round((totalRevenue - totalExpenses) * 10000) / 10000;

    return {
        totalEntries: entries.length,
        totalDebit: Math.round(totalDebit * 10000) / 10000,
        totalCredit: Math.round(totalCredit * 10000) / 10000,
        netIncome,
        totalRevenue,
        totalExpenses,
        revenueBreakdown: Array.from(revenueMap.values()).map((v) => ({ ...v, balance: Math.round(v.balance * 10000) / 10000 })),
        expenseBreakdown: Array.from(expenseMap.values()).map((v) => ({ ...v, balance: Math.round(v.balance * 10000) / 10000 })),
    };
}
