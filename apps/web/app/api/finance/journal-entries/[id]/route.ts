import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updateJournalEntrySchema, formatZodError } from '@/lib/validation-schemas';
import { sanitizeObject } from '@/lib/sanitize';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const entry = await prisma.journalEntry.findFirst({
            where: { id, tenantId },
            include: {
                items: {
                    include: {
                        account: { select: { id: true, code: true, name: true, type: true } },
                    },
                },
            },
        });

        if (!entry) {
            return NextResponse.json(
                { success: false, error: 'Journal Entry tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: entry });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;
        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);

        const validation = updateJournalEntrySchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const existing = await prisma.journalEntry.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Journal Entry tidak ditemukan' },
                { status: 404 }
            );
        }

        // Cannot modify POSTED or VOID entries
        if (existing.status === 'POSTED' || existing.status === 'VOID') {
            return NextResponse.json(
                { success: false, error: `Journal Entry dengan status ${existing.status} tidak dapat diubah` },
                { status: 400 }
            );
        }

        const { items, date, ...restData } = validatedData;

        // Build update data
        const updateData: Record<string, unknown> = {};
        if (restData.description !== undefined) updateData.description = restData.description;
        if (restData.reference !== undefined) updateData.reference = restData.reference;
        if (restData.sourceType !== undefined) updateData.sourceType = restData.sourceType;
        if (restData.sourceId !== undefined) updateData.sourceId = restData.sourceId;
        if (restData.status !== undefined) updateData.status = restData.status;
        if (date !== undefined) updateData.date = new Date(date);

        // If items are provided, validate and recalculate
        if (items && items.length > 0) {
            const totalDebit = items.reduce((sum: number, item: { debit?: number; credit?: number }) => sum + (item.debit || 0), 0);
            const totalCredit = items.reduce((sum: number, item: { debit?: number; credit?: number }) => sum + (item.credit || 0), 0);

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

            // Validate each item
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

            updateData.totalDebit = totalDebit;
            updateData.totalCredit = totalCredit;

            // Update in transaction: delete old items, create new ones
            await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
                await tx.journalEntryItem.deleteMany({ where: { journalEntryId: id } });
                await tx.journalEntryItem.createMany({
                    data: items.map((item: { accountId: string; debit?: number; credit?: number; description?: string | null }) => ({
                        tenantId,
                        journalEntryId: id,
                        accountId: item.accountId,
                        debit: item.debit || 0,
                        credit: item.credit || 0,
                        description: item.description || null,
                    })),
                });
                await tx.journalEntry.update({ where: { id }, data: updateData });
            });
        } else if (Object.keys(updateData).length > 0) {
            // Update entry without changing items
            await prisma.journalEntry.update({ where: { id }, data: updateData });
        }

        // Fetch complete entry
        const completeEntry = await prisma.journalEntry.findUnique({
            where: { id },
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
            action: 'UPDATE',
            entity: 'JournalEntry',
            entityId: id,
            oldValues: { status: existing.status, totalDebit: existing.totalDebit, totalCredit: existing.totalCredit },
            newValues: updateData as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, data: completeEntry });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;

        const existing = await prisma.journalEntry.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Journal Entry tidak ditemukan' },
                { status: 404 }
            );
        }

        // Cannot delete POSTED entries — must VOID first
        if (existing.status === 'POSTED') {
            return NextResponse.json(
                { success: false, error: 'Journal Entry yang sudah POSTED tidak dapat dihapus. Gunakan VOID untuk membatalkan.' },
                { status: 400 }
            );
        }

        // Delete items first (cascade should handle this, but explicit for safety)
        await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
            await tx.journalEntryItem.deleteMany({ where: { journalEntryId: id } });
            await tx.journalEntry.delete({ where: { id } });
        });

        // Audit logging non-blocking
        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'JournalEntry',
            entityId: id,
            oldValues: existing as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
