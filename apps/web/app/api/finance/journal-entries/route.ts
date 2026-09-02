import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createJournalEntrySchema, formatZodError } from '@/lib/validation-schemas';

// Helper: generate sequential entry number JE-YYYYMMDD-XXXX
async function generateEntryNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `JE-${dateStr}-`;

    const lastEntry = await prisma.journalEntry.findFirst({
        where: {
            tenantId,
            entryNumber: { startsWith: prefix },
        },
        orderBy: { entryNumber: 'desc' },
        select: { entryNumber: true },
    });

    let seq = 1;
    if (lastEntry) {
        const lastSeq = parseInt(lastEntry.entryNumber.split('-').pop() || '0', 10);
        seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
}

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:journal-entries:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const sourceType = searchParams.get('sourceType');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (status) {
            where.status = status.toUpperCase();
        }

        if (sourceType) {
            where.sourceType = sourceType;
        }

        if (dateFrom || dateTo) {
            const dateFilter: Record<string, Date> = {};
            if (dateFrom) dateFilter.gte = new Date(dateFrom);
            if (dateTo) dateFilter.lte = new Date(dateTo);
            where.date = dateFilter;
        }

        if (search) {
            where.OR = [
                { entryNumber: { contains: search } },
                { description: { contains: search } },
                { reference: { contains: search } },
            ];
        }

        const [entries, total] = await Promise.all([
            prisma.journalEntry.findMany({
                where,
                include: {
                    items: {
                        include: {
                            account: { select: { id: true, code: true, name: true, type: true } },
                        },
                    },
                },
                orderBy: [{ date: 'desc' }, { entryNumber: 'desc' }],
                skip,
                take: limit,
            }),
            prisma.journalEntry.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: entries,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:journal-entries:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();

        const validation = createJournalEntrySchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { items, date, ...restData } = validation.data;

        // Calculate totals
        const totalDebit = items.reduce((sum: number, item: { debit?: number; credit?: number }) => sum + (item.debit || 0), 0);
        const totalCredit = items.reduce((sum: number, item: { debit?: number; credit?: number }) => sum + (item.credit || 0), 0);

        // Double-entry balance check
        if (Math.abs(totalDebit - totalCredit) >= 0.01) {
            return NextResponse.json(
                { success: false, error: `Total debit (${totalDebit}) harus sama dengan total credit (${totalCredit})` },
                { status: 400 }
            );
        }

        if (totalDebit <= 0 || totalCredit <= 0) {
            return NextResponse.json(
                { success: false, error: 'Total debit dan total credit harus lebih dari 0' },
                { status: 400 }
            );
        }

        // Validate each item has either debit OR credit, not both
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if ((item.debit || 0) > 0 && (item.credit || 0) > 0) {
                return NextResponse.json(
                    { success: false, error: `Item ${i + 1}: hanya boleh memiliki debit ATAU credit, bukan keduanya` },
                    { status: 400 }
                );
            }
            if ((item.debit || 0) === 0 && (item.credit || 0) === 0) {
                return NextResponse.json(
                    { success: false, error: `Item ${i + 1}: harus memiliki minimal debit atau credit` },
                    { status: 400 }
                );
            }
        }

        // Generate entry number
        const entryNumber = await generateEntryNumber(tenantId);

        // Create journal entry with items in a transaction
        const journalEntry = await prisma.$transaction(async (tx) => {
            const entry = await tx.journalEntry.create({
                data: {
                    tenantId,
                    entryNumber,
                    date: date ? new Date(date) : new Date(),
                    description: restData.description,
                    reference: restData.reference || null,
                    sourceType: restData.sourceType,
                    sourceId: restData.sourceId || null,
                    status: 'DRAFT',
                    totalDebit,
                    totalCredit,
                    createdBy: userId,
                },
            });

            // Create journal entry items
            await tx.journalEntryItem.createMany({
                data: items.map((item: { accountId: string; debit?: number; credit?: number; description?: string | null }) => ({
                    tenantId,
                    journalEntryId: entry.id,
                    accountId: item.accountId,
                    debit: item.debit || 0,
                    credit: item.credit || 0,
                    description: item.description || null,
                })),
            });

            return entry;
        }) as Awaited<ReturnType<typeof prisma.journalEntry.create>>;

        // Fetch complete entry with items
        const completeEntry = await prisma.journalEntry.findUnique({
            where: { id: journalEntry.id },
            include: {
                items: {
                    include: {
                        account: { select: { id: true, code: true, name: true, type: true } },
                    },
                },
            },
        });

        // Audit logging non-blocking
        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'JournalEntry',
            entityId: journalEntry.id,
            newValues: { entryNumber, description: restData.description, totalDebit, totalCredit, itemCount: items.length },
            request,
        });

        return NextResponse.json({ success: true, data: completeEntry }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
