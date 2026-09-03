import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

// ============================================
// VALIDATION SCHEMA
// ============================================

const trialBalanceQuerySchema = z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    includeZeroBalance: z.enum(['true', 'false']).optional().default('false'),
});

// ============================================
// TYPES
// ============================================

interface TrialBalanceAccount {
    accountId: string;
    accountCode: string;
    accountName: string;
    accountType: string;
    totalDebit: number;
    totalCredit: number;
    balance: number;
    balanceType: 'debit' | 'credit';
}

interface TrialBalanceResponse {
    accounts: TrialBalanceAccount[];
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
    dateFrom: string | null;
    dateTo: string | null;
    generatedAt: string;
}

// ============================================
// API HANDLER
// ============================================

export async function GET(request: Request) {
    try {
        // Rate limiting
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:trial-balance:${ip}`, 60, 60000);
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
        const validation = trialBalanceQuerySchema.safeParse(queryParams);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'Parameter tidak valid', details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const { dateFrom, dateTo, includeZeroBalance } = validation.data;

        // Build date filter for journal entries
        const dateFilter: Record<string, unknown> = { tenantId };
        if (dateFrom || dateTo) {
            const dateRange: Record<string, Date> = {};
            if (dateFrom) dateRange.gte = new Date(dateFrom);
            if (dateTo) {
                // Set to end of day
                const endDate = new Date(dateTo);
                endDate.setHours(23, 59, 59, 999);
                dateRange.lte = endDate;
            }
            dateFilter.date = dateRange;
        }

        // Only include POSTED journal entries for accurate balances
        dateFilter.status = 'POSTED';

        // Get all journal entry items with account info, grouped by account
        const journalEntryItems = await prisma.journalEntryItem.findMany({
            where: {
                tenantId,
                journalEntry: dateFilter as never,
            },
            include: {
                account: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        type: true,
                    },
                },
            },
        });

        // Aggregate by account
        const accountMap = new Map<string, {
            accountId: string;
            accountCode: string;
            accountName: string;
            accountType: string;
            totalDebit: number;
            totalCredit: number;
        }>();

        for (const item of journalEntryItems) {
            const key = item.accountId;
            const existing = accountMap.get(key);

            const debit = Number(item.debit) || 0;
            const credit = Number(item.credit) || 0;

            if (existing) {
                existing.totalDebit += debit;
                existing.totalCredit += credit;
            } else {
                accountMap.set(key, {
                    accountId: item.account.id,
                    accountCode: item.account.code,
                    accountName: item.account.name,
                    accountType: item.account.type,
                    totalDebit: debit,
                    totalCredit: credit,
                });
            }
        }

        // Also include COA accounts that have no journal entries but have a balance
        const allAccounts = await prisma.coAAccount.findMany({
            where: { tenantId, isActive: true },
            select: { id: true, code: true, name: true, type: true, balance: true },
        });

        for (const account of allAccounts) {
            if (!accountMap.has(account.id)) {
                const balance = Number(account.balance) || 0;
                // For accounts with existing balance but no journal entries in period
                if (balance !== 0) {
                    const isDebitType = ['ASSET', 'EXPENSE'].includes(account.type);
                    accountMap.set(account.id, {
                        accountId: account.id,
                        accountCode: account.code,
                        accountName: account.name,
                        accountType: account.type,
                        totalDebit: isDebitType ? balance : 0,
                        totalCredit: isDebitType ? 0 : balance,
                    });
                } else if (includeZeroBalance === 'true') {
                    accountMap.set(account.id, {
                        accountId: account.id,
                        accountCode: account.code,
                        accountName: account.name,
                        accountType: account.type,
                        totalDebit: 0,
                        totalCredit: 0,
                    });
                }
            }
        }

        // Convert to array and calculate balances
        let accounts: TrialBalanceAccount[] = Array.from(accountMap.values()).map(acc => {
            const netBalance = acc.totalDebit - acc.totalCredit;
            return {
                ...acc,
                balance: Math.abs(netBalance),
                balanceType: netBalance >= 0 ? 'debit' as const : 'credit' as const,
            };
        });

        // Filter out zero balance accounts if requested
        if (includeZeroBalance !== 'true') {
            accounts = accounts.filter(acc => acc.totalDebit !== 0 || acc.totalCredit !== 0);
        }

        // Sort by account code
        accounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode, undefined, { numeric: true }));

        // Calculate totals
        const totalDebit = accounts.reduce((sum, acc) => sum + acc.totalDebit, 0);
        const totalCredit = accounts.reduce((sum, acc) => sum + acc.totalCredit, 0);
        const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

        const response: TrialBalanceResponse = {
            accounts,
            totalDebit,
            totalCredit,
            isBalanced,
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
            generatedAt: new Date().toISOString(),
        };

        return NextResponse.json({ success: true, data: response });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
