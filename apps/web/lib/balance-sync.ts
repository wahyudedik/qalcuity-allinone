// ============================================
// Account Balance Auto-Sync (GL-GAP-02)
//
// Keeps CoAAccount.balance in sync with the
// actual sum of JournalEntryItem debits/credits.
//
// Trigger points:
// - After journal entry is POSTED
// - After journal entry is VOID'd
// - Manual recalculation (full resync)
// ============================================

import { prisma } from './db';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

export interface BalanceSyncResult {
    accountId: string;
    previousBalance: number;
    newBalance: number;
    adjustment: number;
}

export interface FullSyncResult {
    tenantId: string;
    accountsSynced: number;
    totalAdjustment: number;
    details: BalanceSyncResult[];
}

// ============================================
// Core: Sync Single Account Balance
// ============================================

/**
 * Recalculate and update the balance for a single CoAAccount
 * based on all posted JournalEntryItems.
 *
 * Balance formula:
 *   For ASSET & EXPENSE: balance = totalDebit - totalCredit
 *   For LIABILITY, EQUITY, REVENUE: balance = totalCredit - totalDebit
 *
 * This follows normal accounting convention:
 *   - Debit increases assets/expenses, decreases liabilities/equity/revenue
 *   - Credit increases liabilities/equity/revenue, decreases assets/expenses
 */
export async function syncAccountBalance(
    accountId: string,
    tenantId: string,
    tx?: Prisma.TransactionClient
): Promise<BalanceSyncResult> {
    const client = tx ?? prisma;

    // Fetch the account to get its type
    const account = await client.coAAccount.findFirst({
        where: { id: accountId, tenantId },
        select: { id: true, type: true, balance: true },
    });

    if (!account) {
        throw new Error(`Account ${accountId} not found for tenant ${tenantId}`);
    }

    const previousBalance = Number(account.balance);

    // Sum all posted journal entry items for this account
    const aggregates = await client.journalEntryItem.aggregate({
        where: {
            accountId,
            tenantId,
            journalEntry: { status: 'POSTED' },
        },
        _sum: {
            debit: true,
            credit: true,
        },
    });

    const totalDebit = Number(aggregates._sum.debit ?? 0);
    const totalCredit = Number(aggregates._sum.credit ?? 0);

    // Calculate new balance based on account type
    let newBalance: number;
    switch (account.type) {
        case 'ASSET':
        case 'EXPENSE':
            // Normal debit balance
            newBalance = totalDebit - totalCredit;
            break;
        case 'LIABILITY':
        case 'EQUITY':
        case 'REVENUE':
            // Normal credit balance
            newBalance = totalCredit - totalDebit;
            break;
        default:
            newBalance = totalDebit - totalCredit;
    }

    // Round to 4 decimal places to match Decimal(19,4)
    newBalance = Math.round(newBalance * 10000) / 10000;
    const adjustment = Math.round((newBalance - previousBalance) * 10000) / 10000;

    // Update the account balance
    await client.coAAccount.update({
        where: { id: accountId },
        data: { balance: newBalance },
    });

    return {
        accountId,
        previousBalance,
        newBalance,
        adjustment,
    };
}

// ============================================
// Sync Multiple Accounts (from journal entry)
// ============================================

/**
 * Sync balances for all accounts affected by a journal entry.
 * Called after a journal entry is posted or voided.
 */
export async function syncAccountsFromJournalEntry(
    journalEntryId: string,
    tenantId: string,
    tx?: Prisma.TransactionClient
): Promise<BalanceSyncResult[]> {
    const client = tx ?? prisma;

    // Get all unique account IDs from the journal entry items
    const items = await client.journalEntryItem.findMany({
        where: { journalEntryId, tenantId },
        select: { accountId: true },
    });

    const accountIds = [...new Set(items.map((item) => item.accountId))];

    // Sync each account
    const results: BalanceSyncResult[] = [];
    for (const accountId of accountIds) {
        try {
            const result = await syncAccountBalance(accountId, tenantId, client);
            results.push(result);
        } catch (error) {
            logger.error(`[BalanceSync] Failed to sync account ${accountId}:`, error);
            throw error;
        }
    }

    return results;
}

// ============================================
// Full Resync: Recalculate All Account Balances
// ============================================

/**
 * Recalculate balances for ALL accounts in a tenant.
 * Useful for fixing drift or running periodic verification.
 */
export async function fullResyncAccountBalances(
    tenantId: string
): Promise<FullSyncResult> {
    const accounts = await prisma.coAAccount.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, code: true, name: true, balance: true },
    });

    const details: BalanceSyncResult[] = [];
    let totalAdjustment = 0;

    for (const account of accounts) {
        try {
            const result = await syncAccountBalance(account.id, tenantId);
            details.push(result);
            totalAdjustment += Math.abs(result.adjustment);
        } catch (error) {
            logger.error(`[BalanceSync] Failed to resync account ${account.code} (${account.name}):`, error);
            // Continue with other accounts instead of failing entirely
        }
    }

    return {
        tenantId,
        accountsSynced: details.length,
        totalAdjustment: Math.round(totalAdjustment * 10000) / 10000,
        details,
    };
}

// ============================================
// Balance Verification (compare stored vs actual)
// ============================================

export interface BalanceDiscrepancy {
    accountId: string;
    accountCode: string;
    accountName: string;
    accountType: string;
    storedBalance: number;
    calculatedBalance: number;
    discrepancy: number;
}

/**
 * Verify all account balances by comparing stored balance
 * with calculated balance from journal entry items.
 * Returns list of accounts with discrepancies.
 */
export async function verifyAccountBalances(
    tenantId: string
): Promise<BalanceDiscrepancy[]> {
    const accounts = await prisma.coAAccount.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, code: true, name: true, type: true, balance: true },
    });

    const discrepancies: BalanceDiscrepancy[] = [];

    for (const account of accounts) {
        const aggregates = await prisma.journalEntryItem.aggregate({
            where: {
                accountId: account.id,
                tenantId,
                journalEntry: { status: 'POSTED' },
            },
            _sum: { debit: true, credit: true },
        });

        const totalDebit = Number(aggregates._sum.debit ?? 0);
        const totalCredit = Number(aggregates._sum.credit ?? 0);

        let calculatedBalance: number;
        switch (account.type) {
            case 'ASSET':
            case 'EXPENSE':
                calculatedBalance = totalDebit - totalCredit;
                break;
            case 'LIABILITY':
            case 'EQUITY':
            case 'REVENUE':
                calculatedBalance = totalCredit - totalDebit;
                break;
            default:
                calculatedBalance = totalDebit - totalCredit;
        }

        calculatedBalance = Math.round(calculatedBalance * 10000) / 10000;
        const storedBalance = Number(account.balance);
        const discrepancy = Math.round((calculatedBalance - storedBalance) * 10000) / 10000;

        if (Math.abs(discrepancy) > 0.01) {
            discrepancies.push({
                accountId: account.id,
                accountCode: account.code,
                accountName: account.name,
                accountType: account.type,
                storedBalance,
                calculatedBalance,
                discrepancy,
            });
        }
    }

    return discrepancies;
}
