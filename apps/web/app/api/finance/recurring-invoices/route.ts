export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { requirePermission, requireMutateAuth } from '@/lib/session';
import { createRecurringInvoiceSchema } from '@/lib/validation-schemas';
import { MSG } from '@/lib/api-messages';
import { calculateNextRunDate } from '@/lib/recurring-invoice';

// ─── GET: List recurring invoices ────────────────────────────────────────────

export async function GET(req: Request) {
    try {
        const auth = await requirePermission('finance.invoice');
        const { tenantId } = auth;
        const { searchParams } = new URL(req.url);

        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const status = searchParams.get('status') || undefined;
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };
        if (status) where.status = status;

        const [recurringInvoices, total] = await Promise.all([
            prisma.recurringInvoice.findMany({
                where,
                include: {
                    contact: { select: { id: true, name: true, email: true } },
                    items: true,
                    _count: { select: { generatedInvoices: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.recurringInvoice.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: recurringInvoices,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── POST: Create new recurring invoice ──────────────────────────────────────

export async function POST(req: Request) {
    try {
        const auth = await requireMutateAuth();
        const { userId, tenantId } = auth;

        const body = await req.json();
        const validated = createRecurringInvoiceSchema.parse(body);

        // Verify contact exists and belongs to tenant
        const contact = await prisma.contact.findFirst({
            where: { id: validated.contactId, tenantId },
        });

        if (!contact) {
            return NextResponse.json(
                { success: false, error: MSG.DATA_NOT_FOUND },
                { status: 404 }
            );
        }

        const now = new Date();
        const startDate = new Date(validated.startDate);

        // Calculate initial next run date
        const nextRunDate = calculateNextRunDate(
            validated.frequency,
            validated.dayOfMonth || null,
            validated.dayOfWeek || null,
            startDate
        );

        const recurringInvoice = await prisma.recurringInvoice.create({
            data: {
                tenantId,
                contactId: validated.contactId,
                invoiceNumber: validated.invoiceNumber || null,
                notes: validated.notes || null,
                taxRate: validated.taxRate || null,
                frequency: validated.frequency,
                dayOfMonth: validated.dayOfMonth || null,
                dayOfWeek: validated.dayOfWeek || null,
                startDate,
                endDate: validated.endDate ? new Date(validated.endDate) : null,
                nextRunDate,
                status: 'ACTIVE',
                createdBy: userId,
                items: {
                    create: validated.items.map((item) => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        productId: item.productId || null,
                    })),
                },
            },
            include: {
                contact: { select: { id: true, name: true, email: true } },
                items: true,
            },
        });

        return NextResponse.json({ success: true, data: recurringInvoice }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
