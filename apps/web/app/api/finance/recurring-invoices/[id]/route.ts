export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { requirePermission, requireMutateAuth } from '@/lib/session';
import { MSG } from '@/lib/api-messages';
import { updateRecurringInvoiceSchema } from '@/lib/validation-schemas';

// ─── GET: Detail recurring invoice ───────────────────────────────────────────

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermission('finance.invoice');
        const { tenantId } = auth;

        const recurringInvoice = await prisma.recurringInvoice.findFirst({
            where: { id: params.id, tenantId },
            include: {
                contact: { select: { id: true, name: true, email: true, phone: true } },
                items: {
                    include: { product: { select: { id: true, name: true, sku: true } } },
                },
                generatedInvoices: {
                    select: {
                        id: true,
                        invoiceNumber: true,
                        status: true,
                        total: true,
                        dueDate: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
            },
        });

        if (!recurringInvoice) {
            return NextResponse.json(
                { success: false, error: MSG.DATA_NOT_FOUND },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: recurringInvoice });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT: Update recurring invoice ───────────────────────────────────────────

export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireMutateAuth();
        const { tenantId } = auth;

        const body = await req.json();

        // Validate input with Zod schema
        const validated = updateRecurringInvoiceSchema.parse(body);

        // Verify ownership
        const existing = await prisma.recurringInvoice.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.DATA_NOT_FOUND },
                { status: 404 }
            );
        }

        // Update fields from validated input
        const updateData: Record<string, unknown> = {};

        if (validated.status !== undefined) updateData.status = validated.status;
        if (validated.frequency !== undefined) updateData.frequency = validated.frequency;
        if (validated.dayOfMonth !== undefined) updateData.dayOfMonth = validated.dayOfMonth;
        if (validated.dayOfWeek !== undefined) updateData.dayOfWeek = validated.dayOfWeek;
        if (validated.startDate !== undefined) updateData.startDate = new Date(validated.startDate);
        if (validated.endDate !== undefined) updateData.endDate = validated.endDate ? new Date(validated.endDate) : null;
        if (validated.notes !== undefined) updateData.notes = validated.notes;
        if (validated.invoiceNumber !== undefined) updateData.invoiceNumber = validated.invoiceNumber;
        if (validated.taxRate !== undefined) updateData.taxRate = validated.taxRate;

        const updated = await prisma.recurringInvoice.update({
            where: { id: params.id },
            data: updateData,
            include: {
                contact: { select: { id: true, name: true, email: true } },
                items: true,
            },
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── DELETE: Cancel recurring invoice (soft delete) ──────────────────────────

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireMutateAuth();
        const { tenantId } = auth;

        const existing = await prisma.recurringInvoice.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.DATA_NOT_FOUND },
                { status: 404 }
            );
        }

        // Soft delete — set status to CANCELLED
        await prisma.recurringInvoice.update({
            where: { id: params.id },
            data: { status: 'CANCELLED' },
        });

        return NextResponse.json({ success: true, message: 'Recurring invoice cancelled' });
    } catch (error) {
        return handleApiError(error);
    }
}
