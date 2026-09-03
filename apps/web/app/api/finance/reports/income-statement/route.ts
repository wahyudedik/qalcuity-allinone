import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

// ============================================
// VALIDATION SCHEMA
// ============================================

const incomeStatementQuerySchema = z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    period: z.enum(['monthly', 'quarterly', 'yearly']).optional().default('yearly'),
});

// ============================================
// TYPES
// ============================================

interface IncomeStatementAccount {
    accountId: string;
    accountCode: string;
    accountName: string;
    amount: number;
}

interface IncomeStatementSection {
    label: string;
    accounts: IncomeStatementAccount[];
    total: number;
}

interface PeriodData {
    period: string;
    revenue: number;
    cogs: number;
    grossProfit: number;
    operatingExpenses: number;
    operatingIncome: number;
    nonOperatingIncome: number;
    nonOperatingExpenses: number;
    netIncome: number;
}

interface IncomeStatementResponse {
    revenue: IncomeStatementSection;
    cogs: IncomeStatementSection;
    grossProfit: number;
    operatingExpenses: IncomeStatementSection;
    operatingIncome: number;
    nonOperatingIncome: IncomeStatementSection;
    nonOperatingExpenses: IncomeStatementSection;
    netIncome: number;
    byPeriod: PeriodData[];
    dateFrom: string | null;
    dateTo: string | null;
    generatedAt: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * Categorize revenue accounts into operating vs non-operating based on code/name.
 * Operating revenue: codes 4100-4199 (main business revenue)
 * Non-operating revenue: codes 4200+ (interest, gains, etc.)
 */
function isNonOperatingRevenue(code: string, name: string): boolean {
    const codeNum = parseInt(code, 10);
    if (codeNum >= 4200) return true;
    const lowerName = name.toLowerCase();
    if (
        lowerName.includes('bunga') || lowerName.includes('interest') ||
        lowerName.includes('selisih kurs') || lowerName.includes('exchange') ||
        lowerName.includes('keuntungan lain') || lowerName.includes('gain') ||
        lowerName.includes('pendapatan sewa') || lowerName.includes('rent income')
    ) return true;
    return false;
}

/**
 * Categorize expense accounts into COGS, operating, or non-operating.
 * COGS: codes 5100-5199 (cost of goods sold)
 * Non-operating: codes 5300+ (interest expense, losses, etc.)
 */
function categorizeExpense(code: string, name: string): 'cogs' | 'operating' | 'nonOperating' {
    const codeNum = parseInt(code, 10);
    const lowerName = name.toLowerCase();

    // COGS
    if (codeNum >= 5100 && codeNum < 5200) return 'cogs';
    if (
        lowerName.includes('hpp') || lowerName.includes('harga pokok') ||
        lowerName.includes('cost of goods') || lowerName.includes('cogs') ||
        lowerName.includes('bahan baku') || lowerName.includes('raw material') ||
        lowerName.includes('barang terjual') || lowerName.includes('cost of sales')
    ) return 'cogs';

    // Non-operating
    if (codeNum >= 5300) return 'nonOperating';
    if (
        lowerName.includes('bunga') || lowerName.includes('interest') ||
        lowerName.includes('kerugian') || lowerName.includes('loss') ||
        lowerName.includes('beban pokok') || lowerName.includes('pendapatan bunga')
    ) return 'nonOperating';

    // Default: operating expense
    return 'operating';
}

/**
 * Generate period label based on date and period type
 */
function getPeriodLabel(date: Date, periodType: string): string {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    switch (periodType) {
        case 'monthly':
            return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        case 'quarterly': {
            const quarter = Math.floor(date.getMonth() / 3) + 1;
            return `Q${quarter} ${date.getFullYear()}`;
        }
        case 'yearly':
        default:
            return `${date.getFullYear()}`;
    }
}

// ============================================
// API HANDLER
// ============================================

export async function GET(request: Request) {
    try {
        // Rate limiting
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:income-statement:${ip}`, 60, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        // Auth check
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { tenantId } = auth;

        // Parse and validate query params
        const { searchParams } = new URL(request.url);
        const queryParams = Object.fromEntries(searchParams.entries());
        const validation = incomeStatementQuerySchema.safeParse(queryParams);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'Parameter tidak valid', details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const { dateFrom, dateTo, period } = validation.data;

        // Default date range: current fiscal year
        const now = new Date();
        const defaultDateFrom = `${now.getFullYear()}-01-01`;
        const defaultDateTo = `${now.getFullYear()}-12-31`;
        const effectiveDateFrom = dateFrom || defaultDateFrom;
        const effectiveDateTo = dateTo || defaultDateTo;

        const startDate = new Date(effectiveDateFrom);
        const endDate = new Date(effectiveDateTo);
        endDate.setHours(23, 59, 59, 999);

        // Get all active COA accounts
        const accounts = await prisma.coAAccount.findMany({
            where: { tenantId, isActive: true },
            select: { id: true, code: true, name: true, type: true },
        });

        // Get all posted journal entry items in the date range
        const journalEntryItems = await prisma.journalEntryItem.findMany({
            where: {
                tenantId,
                journalEntry: {
                    tenantId,
                    status: 'POSTED',
                    date: { gte: startDate, lte: endDate },
                },
            },
            include: {
                journalEntry: {
                    select: { date: true },
                },
                account: {
                    select: { id: true, code: true, name: true, type: true },
                },
            },
        });

        // Build account lookup
        const accountLookup = new Map<string, { code: string; name: string; type: string }>();
        for (const account of accounts) {
            accountLookup.set(account.id, { code: account.code, name: account.name, type: account.type });
        }

        // Categorize all journal entry items
        const revenueAccounts = new Map<string, { code: string; name: string; amount: number }>();
        const cogsAccounts = new Map<string, { code: string; name: string; amount: number }>();
        const operatingExpenseAccounts = new Map<string, { code: string; name: string; amount: number }>();
        const nonOperatingIncomeAccounts = new Map<string, { code: string; name: string; amount: number }>();
        const nonOperatingExpenseAccounts = new Map<string, { code: string; name: string; amount: number }>();

        for (const item of journalEntryItems) {
            const acctInfo = accountLookup.get(item.accountId);
            if (!acctInfo) continue;

            const netAmount = (Number(item.debit) || 0) - (Number(item.credit) || 0);

            switch (acctInfo.type) {
                case 'REVENUE': {
                    // Revenue: credit balance = positive revenue (netAmount is negative for credit)
                    const revenueAmount = -netAmount;
                    if (isNonOperatingRevenue(acctInfo.code, acctInfo.name)) {
                        const existing = nonOperatingIncomeAccounts.get(item.accountId);
                        if (existing) {
                            existing.amount += revenueAmount;
                        } else {
                            nonOperatingIncomeAccounts.set(item.accountId, {
                                code: acctInfo.code,
                                name: acctInfo.name,
                                amount: revenueAmount,
                            });
                        }
                    } else {
                        const existing = revenueAccounts.get(item.accountId);
                        if (existing) {
                            existing.amount += revenueAmount;
                        } else {
                            revenueAccounts.set(item.accountId, {
                                code: acctInfo.code,
                                name: acctInfo.name,
                                amount: revenueAmount,
                            });
                        }
                    }
                    break;
                }
                case 'EXPENSE': {
                    const expenseAmount = netAmount; // Positive = expense
                    const category = categorizeExpense(acctInfo.code, acctInfo.name);
                    const targetMap = category === 'cogs' ? cogsAccounts
                        : category === 'nonOperating' ? nonOperatingExpenseAccounts
                            : operatingExpenseAccounts;
                    const existing = targetMap.get(item.accountId);
                    if (existing) {
                        existing.amount += expenseAmount;
                    } else {
                        targetMap.set(item.accountId, {
                            code: acctInfo.code,
                            name: acctInfo.name,
                            amount: expenseAmount,
                        });
                    }
                    break;
                }
            }
        }

        // Convert maps to sorted arrays
        const sortByName = (a: { code: string }, b: { code: string }) => a.code.localeCompare(b.code, undefined, { numeric: true });

        const revenueArr: IncomeStatementAccount[] = Array.from(revenueAccounts.values())
            .sort(sortByName)
            .map(a => ({ accountId: a.code, accountCode: a.code, accountName: a.name, amount: a.amount }));

        const cogsArr: IncomeStatementAccount[] = Array.from(cogsAccounts.values())
            .sort(sortByName)
            .map(a => ({ accountId: a.code, accountCode: a.code, accountName: a.name, amount: a.amount }));

        const operatingExpArr: IncomeStatementAccount[] = Array.from(operatingExpenseAccounts.values())
            .sort(sortByName)
            .map(a => ({ accountId: a.code, accountCode: a.code, accountName: a.name, amount: a.amount }));

        const nonOpIncomeArr: IncomeStatementAccount[] = Array.from(nonOperatingIncomeAccounts.values())
            .sort(sortByName)
            .map(a => ({ accountId: a.code, accountCode: a.code, accountName: a.name, amount: a.amount }));

        const nonOpExpenseArr: IncomeStatementAccount[] = Array.from(nonOperatingExpenseAccounts.values())
            .sort(sortByName)
            .map(a => ({ accountId: a.code, accountCode: a.code, accountName: a.name, amount: a.amount }));

        // Calculate totals
        const totalRevenue = revenueArr.reduce((sum, a) => sum + a.amount, 0);
        const totalCogs = cogsArr.reduce((sum, a) => sum + a.amount, 0);
        const grossProfit = totalRevenue - totalCogs;
        const totalOperatingExpenses = operatingExpArr.reduce((sum, a) => sum + a.amount, 0);
        const operatingIncome = grossProfit - totalOperatingExpenses;
        const totalNonOperatingIncome = nonOpIncomeArr.reduce((sum, a) => sum + a.amount, 0);
        const totalNonOperatingExpenses = nonOpExpenseArr.reduce((sum, a) => sum + a.amount, 0);
        const netIncome = operatingIncome + totalNonOperatingIncome - totalNonOperatingExpenses;

        // Build period breakdown
        const byPeriod: PeriodData[] = [];
        const periodMap = new Map<string, PeriodData>();

        for (const item of journalEntryItems) {
            const acctInfo = accountLookup.get(item.accountId);
            if (!acctInfo) continue;

            const periodLabel = getPeriodLabel(item.journalEntry.date, period);
            if (!periodMap.has(periodLabel)) {
                periodMap.set(periodLabel, {
                    period: periodLabel,
                    revenue: 0,
                    cogs: 0,
                    grossProfit: 0,
                    operatingExpenses: 0,
                    operatingIncome: 0,
                    nonOperatingIncome: 0,
                    nonOperatingExpenses: 0,
                    netIncome: 0,
                });
            }

            const pd = periodMap.get(periodLabel)!;
            const netAmount = (Number(item.debit) || 0) - (Number(item.credit) || 0);

            if (acctInfo.type === 'REVENUE') {
                const revenueAmount = -netAmount;
                if (isNonOperatingRevenue(acctInfo.code, acctInfo.name)) {
                    pd.nonOperatingIncome += revenueAmount;
                } else {
                    pd.revenue += revenueAmount;
                }
            } else if (acctInfo.type === 'EXPENSE') {
                const expenseAmount = netAmount;
                const category = categorizeExpense(acctInfo.code, acctInfo.name);
                if (category === 'cogs') {
                    pd.cogs += expenseAmount;
                } else if (category === 'nonOperating') {
                    pd.nonOperatingExpenses += expenseAmount;
                } else {
                    pd.operatingExpenses += expenseAmount;
                }
            }
        }

        // Calculate period summaries
        for (const pd of periodMap.values()) {
            pd.grossProfit = pd.revenue - pd.cogs;
            pd.operatingIncome = pd.grossProfit - pd.operatingExpenses;
            pd.netIncome = pd.operatingIncome + pd.nonOperatingIncome - pd.nonOperatingExpenses;
            byPeriod.push(pd);
        }

        // Sort periods chronologically
        byPeriod.sort((a, b) => a.period.localeCompare(b.period));

        const response: IncomeStatementResponse = {
            revenue: {
                label: 'Pendapatan Usaha (Revenue)',
                accounts: revenueArr,
                total: totalRevenue,
            },
            cogs: {
                label: 'Harga Pokok Penjualan (COGS)',
                accounts: cogsArr,
                total: totalCogs,
            },
            grossProfit,
            operatingExpenses: {
                label: 'Biaya Operasional (Operating Expenses)',
                accounts: operatingExpArr,
                total: totalOperatingExpenses,
            },
            operatingIncome,
            nonOperatingIncome: {
                label: 'Pendapatan Non-Operasional',
                accounts: nonOpIncomeArr,
                total: totalNonOperatingIncome,
            },
            nonOperatingExpenses: {
                label: 'Beban Non-Operasional',
                accounts: nonOpExpenseArr,
                total: totalNonOperatingExpenses,
            },
            netIncome,
            byPeriod,
            dateFrom: effectiveDateFrom,
            dateTo: effectiveDateTo,
            generatedAt: new Date().toISOString(),
        };

        return NextResponse.json({ success: true, data: response });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
