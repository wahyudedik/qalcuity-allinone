import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

// ============================================
// VALIDATION SCHEMA
// ============================================

const balanceSheetQuerySchema = z.object({
    date: z.string().optional(),
});

// ============================================
// TYPES
// ============================================

interface BalanceSheetAccount {
    accountId: string;
    accountCode: string;
    accountName: string;
    balance: number;
}

interface BalanceSheetSection {
    label: string;
    accounts: BalanceSheetAccount[];
    total: number;
}

interface BalanceSheetResponse {
    assets: {
        current: BalanceSheetSection;
        nonCurrent: BalanceSheetSection;
        total: number;
    };
    liabilities: {
        current: BalanceSheetSection;
        longTerm: BalanceSheetSection;
        total: number;
    };
    equity: BalanceSheetSection;
    totalLiabilitiesAndEquity: number;
    isBalanced: boolean;
    date: string;
    generatedAt: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * Determine if an asset account is current or non-current based on code prefix.
 * Current assets typically have codes starting with 11xx-13xx (cash, receivables, inventory).
 * Non-current assets start with 14xx+ (fixed assets, long-term investments).
 */
function isCurrentAsset(code: string, name: string): boolean {
    const codeNum = parseInt(code, 10);
    // Codes 1100-1399 are typically current assets
    if (codeNum >= 1100 && codeNum < 1400) return true;
    // Also check by name keywords
    const lowerName = name.toLowerCase();
    if (
        lowerName.includes('kas') || lowerName.includes('cash') ||
        lowerName.includes('piutang') || lowerName.includes('receivable') ||
        lowerName.includes('persediaan') || lowerName.includes('inventory') ||
        lowerName.includes('bayar dimuka') || lowerName.includes('prepaid') ||
        lowerName.includes('deposit') || lowerName.includes('bank')
    ) return true;
    return false;
}

/**
 * Determine if a liability is current or long-term based on code prefix.
 * Current liabilities: 2100-2399 (payables, accrued expenses).
 * Long-term liabilities: 2400+ (long-term debt, bonds).
 */
function isCurrentLiability(code: string, name: string): boolean {
    const codeNum = parseInt(code, 10);
    if (codeNum >= 2100 && codeNum < 2400) return true;
    const lowerName = name.toLowerCase();
    if (
        lowerName.includes('hutang') || lowerName.includes('payable') ||
        lowerName.includes('piutang') || lowerName.includes('accrued') ||
        lowerName.includes('pendapatan diterima') || lowerName.includes('unearned')
    ) return true;
    return false;
}

// ============================================
// API HANDLER
// ============================================

export async function GET(request: Request) {
    try {
        // Rate limiting
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:balance-sheet:${ip}`, 60, 60000);
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
        const validation = balanceSheetQuerySchema.safeParse(queryParams);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'Parameter tidak valid', details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const snapshotDate = validation.data.date || new Date().toISOString().split('T')[0];
        const snapshotDateTime = new Date(snapshotDate);
        snapshotDateTime.setHours(23, 59, 59, 999);

        // Get all active COA accounts for this tenant
        const accounts = await prisma.coAAccount.findMany({
            where: { tenantId, isActive: true },
            select: {
                id: true,
                code: true,
                name: true,
                type: true,
                balance: true,
            },
            orderBy: { code: 'asc' },
        });

        // Get all posted journal entry items up to the snapshot date
        const journalEntryItems = await prisma.journalEntryItem.findMany({
            where: {
                tenantId,
                journalEntry: {
                    tenantId,
                    status: 'POSTED',
                    date: { lte: snapshotDateTime },
                },
            },
            select: {
                accountId: true,
                debit: true,
                credit: true,
            },
        });

        // Aggregate journal entry balances by account
        const journalBalances = new Map<string, { debit: number; credit: number }>();
        for (const item of journalEntryItems) {
            const existing = journalBalances.get(item.accountId);
            const debit = Number(item.debit) || 0;
            const credit = Number(item.credit) || 0;
            if (existing) {
                existing.debit += debit;
                existing.credit += credit;
            } else {
                journalBalances.set(item.accountId, { debit, credit });
            }
        }

        // Calculate effective balance for each account
        const accountBalances = new Map<string, number>();
        for (const account of accounts) {
            const journal = journalBalances.get(account.id);
            if (journal) {
                const netJournal = journal.debit - journal.credit;
                // For debit-type accounts (ASSET, EXPENSE), positive = debit balance
                // For credit-type accounts (LIABILITY, EQUITY, REVENUE), positive = credit balance
                const isDebitType = ['ASSET', 'EXPENSE'].includes(account.type);
                accountBalances.set(account.id, isDebitType ? netJournal : -netJournal);
            } else {
                // Use stored balance from COA account
                accountBalances.set(account.id, Number(account.balance) || 0);
            }
        }

        // Build balance sheet sections
        const assetAccounts: BalanceSheetAccount[] = [];
        const liabilityAccounts: BalanceSheetAccount[] = [];
        const equityAccounts: BalanceSheetAccount[] = [];

        for (const account of accounts) {
            if (!['ASSET', 'LIABILITY', 'EQUITY'].includes(account.type)) continue;

            const balance = accountBalances.get(account.id) || 0;
            if (Math.abs(balance) < 0.01) continue; // Skip zero-balance accounts

            const absBalance = Math.abs(balance);
            const entry: BalanceSheetAccount = {
                accountId: account.id,
                accountCode: account.code,
                accountName: account.name,
                balance: absBalance,
            };

            switch (account.type) {
                case 'ASSET':
                    assetAccounts.push(entry);
                    break;
                case 'LIABILITY':
                    liabilityAccounts.push(entry);
                    break;
                case 'EQUITY':
                    equityAccounts.push(entry);
                    break;
            }
        }

        // Split assets into current and non-current
        const currentAssets = assetAccounts.filter(a => isCurrentAsset(a.accountCode, a.accountName));
        const nonCurrentAssets = assetAccounts.filter(a => !isCurrentAsset(a.accountCode, a.accountName));

        // Split liabilities into current and long-term
        const currentLiabilities = liabilityAccounts.filter(a => isCurrentLiability(a.accountCode, a.accountName));
        const longTermLiabilities = liabilityAccounts.filter(a => !isCurrentLiability(a.accountCode, a.accountName));

        // Calculate totals
        const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + a.balance, 0);
        const totalNonCurrentAssets = nonCurrentAssets.reduce((sum, a) => sum + a.balance, 0);
        const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

        const totalCurrentLiabilities = currentLiabilities.reduce((sum, a) => sum + a.balance, 0);
        const totalLongTermLiabilities = longTermLiabilities.reduce((sum, a) => sum + a.balance, 0);
        const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

        const totalEquity = equityAccounts.reduce((sum, a) => sum + a.balance, 0);
        const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

        const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

        const response: BalanceSheetResponse = {
            assets: {
                current: {
                    label: 'Aset Lancar (Current Assets)',
                    accounts: currentAssets,
                    total: totalCurrentAssets,
                },
                nonCurrent: {
                    label: 'Aset Tidak Lancar (Non-Current Assets)',
                    accounts: nonCurrentAssets,
                    total: totalNonCurrentAssets,
                },
                total: totalAssets,
            },
            liabilities: {
                current: {
                    label: 'Kewajiban Lancar (Current Liabilities)',
                    accounts: currentLiabilities,
                    total: totalCurrentLiabilities,
                },
                longTerm: {
                    label: 'Kewajiban Jangka Panjang (Long-term Liabilities)',
                    accounts: longTermLiabilities,
                    total: totalLongTermLiabilities,
                },
                total: totalLiabilities,
            },
            equity: {
                label: 'Ekuitas (Equity)',
                accounts: equityAccounts,
                total: totalEquity,
            },
            totalLiabilitiesAndEquity,
            isBalanced,
            date: snapshotDate,
            generatedAt: new Date().toISOString(),
        };

        return NextResponse.json({ success: true, data: response });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
