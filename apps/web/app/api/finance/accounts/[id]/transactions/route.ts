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

const accountTransactionsQuerySchema = z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    status: z.enum(['DRAFT', 'POSTED', 'VOID']).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================
// TYPES
// ============================================

interface AccountTransactionItem {
    id: string;
    date: string;
    entryNumber: string;
    description: string;
    reference: string | null;
    sourceType: string;
    status: string;
    debit: number;
    credit: number;
    lineDescription: string | null;
}

interface AccountTransactionsResponse {
    account: {
        id: string;
        code: string;
        name: string;
        type: string;
        balance: number;
    };
    transactions: AccountTransactionItem[];
    summary: {
        totalDebit: number;
        totalCredit: number;
        netBalance: number;
        transactionCount: number;
    };
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    generatedAt: string;
}

// ============================================
// API HANDLER
// ============================================

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // Rate limiting
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:account-transactions:${ip}`, 60, 60000);
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

        // Verify account exists and belongs to tenant
        const account = await prisma.coAAccount.findFirst({
            where: { id: params.id, tenantId },
            select: { id: true, code: true, name: true, type: true, balance: true },
        });

        if (!account) {
            return NextResponse.json(
                { success: false, error: MSG.DATA_NOT_FOUND, code: 'ACCOUNT_NOT_FOUND' },
                { status: 404 }
            );
        }

        // Parse and validate query params
        const { searchParams } = new URL(request.url);
        const queryParams = Object.fromEntries(searchParams.entries());
        const validation = accountTransactionsQuerySchema.safeParse(queryParams);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'Invalid parameters', details: validation.error.flatten(), code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        const { dateFrom, dateTo, status, search, page, limit } = validation.data;
        const skip = (page - 1) * limit;

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
        if (search) {
            journalFilter.OR = [
                { entryNumber: { contains: search } },
                { description: { contains: search } },
                { reference: { contains: search } },
            ];
        }

        // Query journal entry items for this account with pagination
        const [items, totalItems] = await Promise.all([
            prisma.journalEntryItem.findMany({
                where: {
                    accountId: params.id,
                    tenantId,
                    journalEntry: journalFilter,
                },
                include: {
                    journalEntry: {
                        select: {
                            id: true,
                            date: true,
                            entryNumber: true,
                            description: true,
                            reference: true,
                            sourceType: true,
                            status: true,
                        },
                    },
                },
                orderBy: { journalEntry: { date: 'desc' } },
                skip,
                take: limit,
            }),
            prisma.journalEntryItem.count({
                where: {
                    accountId: params.id,
                    tenantId,
                    journalEntry: journalFilter,
                },
            }),
        ]);

        // Calculate summary (all items, not just paginated)
        const summaryAggregates = await prisma.journalEntryItem.aggregate({
            where: {
                accountId: params.id,
                tenantId,
                journalEntry: journalFilter,
            },
            _sum: { debit: true, credit: true },
            _count: true,
        });

        const totalDebit = Number(summaryAggregates._sum.debit ?? 0);
        const totalCredit = Number(summaryAggregates._sum.credit ?? 0);

        // Map to response format
        const transactions: AccountTransactionItem[] = items.map((item) => ({
            id: item.journalEntry.id,
            date: item.journalEntry.date.toISOString(),
            entryNumber: item.journalEntry.entryNumber,
            description: item.journalEntry.description,
            reference: item.journalEntry.reference,
            sourceType: item.journalEntry.sourceType,
            status: item.journalEntry.status,
            debit: Number(item.debit),
            credit: Number(item.credit),
            lineDescription: item.description,
        }));

        const totalPages = Math.ceil(totalItems / limit);

        const response: AccountTransactionsResponse = {
            account: {
                ...account,
                balance: Number(account.balance),
            },
            transactions,
            summary: {
                totalDebit,
                totalCredit,
                netBalance: account.type === 'ASSET' || account.type === 'EXPENSE'
                    ? totalDebit - totalCredit
                    : totalCredit - totalDebit,
                transactionCount: summaryAggregates._count,
            },
            pagination: {
                page,
                limit,
                total: totalItems,
                totalPages,
            },
            generatedAt: new Date().toISOString(),
        };

        return NextResponse.json({ success: true, data: response });
    } catch (error) {
        return handleApiError(error);
    }
}
