export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';
import { handleApiError } from '@/lib/api-error';

// ============================================
// VALIDATION SCHEMA
// ============================================

const cashFlowQuerySchema = z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
});

// ============================================
// TYPES
// ============================================

interface CashFlowItem {
    accountId: string;
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
}

interface CashFlowSection {
    items: CashFlowItem[];
    total: number;
}

interface CashFlowResponse {
    operating: CashFlowSection;
    investing: CashFlowSection;
    financing: CashFlowSection;
    netChangeInCash: number;
    openingCash: number;
    closingCash: number;
    dateFrom: string | null;
    dateTo: string | null;
    generatedAt: string;
}

// ============================================
// HELPER: Categorize account into cash flow section
// ============================================

function getCashFlowSection(code: string, type: string): 'operating' | 'investing' | 'financing' | null {
    // Cash and cash equivalents - not a flow item
    if (code.startsWith('1101') || code.startsWith('1102')) return null;

    switch (type) {
        case 'REVENUE':
        case 'EXPENSE':
            return 'operating';
        case 'ASSET':
            // Current assets (11xx) = operating
            // Non-current assets (12xx+) = investing
            if (code.startsWith('11')) return 'operating';
            return 'investing';
        case 'LIABILITY':
            // Current liabilities (21xx) = operating
            // Long-term liabilities (22xx+) = financing
            if (code.startsWith('21')) return 'operating';
            return 'financing';
        case 'EQUITY':
            return 'financing';
        default:
            return 'operating';
    }
}

// ============================================
// API HANDLER
// ============================================

export async function GET(request: Request) {
    try {
        // Rate limiting
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:cash-flow:${ip}`, 60, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
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
        const validation = cashFlowQuerySchema.safeParse(queryParams);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'Invalid parameters', details: validation.error.flatten(), code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        const { dateFrom, dateTo } = validation.data;

        // Build date filter for journal entries
        const dateFilter: Record<string, unknown> = { tenantId };
        if (dateFrom || dateTo) {
            const dateRange: Record<string, Date> = {};
            if (dateFrom) dateRange.gte = new Date(dateFrom);
            if (dateTo) {
                const endDate = new Date(dateTo);
                endDate.setHours(23, 59, 59, 999);
                dateRange.lte = endDate;
            }
            dateFilter.date = dateRange;
        }

        // Only POSTED entries
        dateFilter.status = 'POSTED';

        // Get all journal entry items with account info
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

        // Categorize into cash flow sections
        const operatingItems: CashFlowItem[] = [];
        const investingItems: CashFlowItem[] = [];
        const financingItems: CashFlowItem[] = [];

        let openingCash = 0;

        // Get opening cash balance (cash & bank accounts)
        const cashAccounts = await prisma.coAAccount.findMany({
            where: {
                tenantId,
                isActive: true,
                code: { startsWith: '1101' },
            },
            select: { id: true, balance: true },
        });

        for (const acc of cashAccounts) {
            openingCash += Number(acc.balance) || 0;
        }

        // If dateFrom is provided, calculate opening balance from entries before dateFrom
        if (dateFrom) {
            const priorItems = await prisma.journalEntryItem.findMany({
                where: {
                    tenantId,
                    account: { code: { startsWith: '1101' } },
                    journalEntry: {
                        tenantId,
                        status: 'POSTED',
                        date: { lt: new Date(dateFrom) },
                    },
                },
                include: {
                    account: { select: { code: true } },
                },
            });

            let priorDebit = 0;
            let priorCredit = 0;
            for (const item of priorItems) {
                priorDebit += Number(item.debit) || 0;
                priorCredit += Number(item.credit) || 0;
            }
            openingCash = priorDebit - priorCredit;
        }

        for (const [, acc] of accountMap) {
            const section = getCashFlowSection(acc.accountCode, acc.accountType);
            if (!section) continue;

            const netAmount = acc.totalDebit - acc.totalCredit;
            if (netAmount === 0) continue;

            const item: CashFlowItem = {
                accountId: acc.accountId,
                accountCode: acc.accountCode,
                accountName: acc.accountName,
                debit: acc.totalDebit,
                credit: acc.totalCredit,
            };

            switch (section) {
                case 'operating':
                    operatingItems.push(item);
                    break;
                case 'investing':
                    investingItems.push(item);
                    break;
                case 'financing':
                    financingItems.push(item);
                    break;
            }
        }

        // Sort items by account code
        const sortByCode = (a: CashFlowItem, b: CashFlowItem) =>
            a.accountCode.localeCompare(b.accountCode, undefined, { numeric: true });

        operatingItems.sort(sortByCode);
        investingItems.sort(sortByCode);
        financingItems.sort(sortByCode);

        // Calculate totals
        const totalOperating = operatingItems.reduce((sum, item) => sum + (item.credit - item.debit), 0);
        const totalInvesting = investingItems.reduce((sum, item) => sum + (item.credit - item.debit), 0);
        const totalFinancing = financingItems.reduce((sum, item) => sum + (item.credit - item.debit), 0);

        const netChangeInCash = totalOperating + totalInvesting + totalFinancing;
        const closingCash = openingCash + netChangeInCash;

        const response: CashFlowResponse = {
            operating: { items: operatingItems, total: totalOperating },
            investing: { items: investingItems, total: totalInvesting },
            financing: { items: financingItems, total: totalFinancing },
            netChangeInCash,
            openingCash,
            closingCash,
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
            generatedAt: new Date().toISOString(),
        };

        return NextResponse.json({ success: true, data: response });
    } catch (error) {
        return handleApiError(error);
    }
}
