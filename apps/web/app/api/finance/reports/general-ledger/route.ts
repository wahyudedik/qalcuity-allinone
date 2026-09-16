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

const generalLedgerQuerySchema = z.object({
    accountId: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    status: z.enum(['DRAFT', 'POSTED', 'VOID']).optional(),
});

// ============================================
// TYPES
// ============================================

interface GeneralLedgerItem {
    id: string;
    date: string;
    entryNumber: string;
    description: string;
    accountCode: string;
    accountName: string;
    accountId: string;
    debit: number;
    credit: number;
    runningBalance: number;
}

interface GeneralLedgerResponse {
    items: GeneralLedgerItem[];
    totalDebit: number;
    totalCredit: number;
    accounts: { id: string; code: string; name: string }[];
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
        const rateLimitResult = checkRateLimit(`api:general-ledger:${ip}`, 60, 60000);
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
        const validation = generalLedgerQuerySchema.safeParse(queryParams);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'Invalid parameters', details: validation.error.flatten(), code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        const { accountId, dateFrom, dateTo, status } = validation.data;

        // Build journal entry filter
        const journalFilter: Record<string, unknown> = { tenantId };
        if (dateFrom || dateTo) {
            const dateRange: Record<string, Date> = {};
            if (dateFrom) dateRange.gte = new Date(dateFrom);
            if (dateTo) {
                const endDate = new Date(dateTo);
                endDate.setHours(23, 59, 59, 999);
                dateRange.lte = endDate;
            }
            journalFilter.date = dateRange;
        }
        if (status) {
            journalFilter.status = status;
        }

        // Build item filter
        const itemFilter: Record<string, unknown> = {
            tenantId,
            journalEntry: journalFilter as never,
        };
        if (accountId) {
            itemFilter.accountId = accountId;
        }

        // Get journal entry items
        const journalEntryItems = await prisma.journalEntryItem.findMany({
            where: itemFilter as never,
            include: {
                account: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
                journalEntry: {
                    select: {
                        id: true,
                        date: true,
                        entryNumber: true,
                        description: true,
                        status: true,
                    },
                },
            },
            orderBy: [
                { journalEntry: { date: 'asc' } },
                { account: { code: 'asc' } },
            ],
        });

        // Get all active accounts for the filter dropdown
        const allAccounts = await prisma.coAAccount.findMany({
            where: { tenantId, isActive: true },
            select: { id: true, code: true, name: true },
            orderBy: { code: 'asc' },
        });

        // Build ledger items with running balance
        const items: GeneralLedgerItem[] = [];
        let totalDebit = 0;
        let totalCredit = 0;

        // Calculate running balance per account
        const runningBalances = new Map<string, number>();

        for (const item of journalEntryItems) {
            const debit = Number(item.debit) || 0;
            const credit = Number(item.credit) || 0;

            totalDebit += debit;
            totalCredit += credit;

            // Update running balance
            const currentBalance = runningBalances.get(item.accountId) || 0;
            const newBalance = currentBalance + debit - credit;
            runningBalances.set(item.accountId, newBalance);

            items.push({
                id: item.id,
                date: item.journalEntry.date.toISOString(),
                entryNumber: item.journalEntry.entryNumber,
                description: item.journalEntry.description || '',
                accountCode: item.account.code,
                accountName: item.account.name,
                accountId: item.accountId,
                debit,
                credit,
                runningBalance: newBalance,
            });
        }

        const response: GeneralLedgerResponse = {
            items,
            totalDebit,
            totalCredit,
            accounts: allAccounts,
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
            generatedAt: new Date().toISOString(),
        };

        return NextResponse.json({ success: true, data: response });
    } catch (error) {
        return handleApiError(error);
    }
}
