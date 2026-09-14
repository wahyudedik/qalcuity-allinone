export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError, apiNotFound } from '@/lib/api-error';

/**
 * POST /api/finance/quotations/[id]/convert
 * Convert a quotation into an invoice.
 *
 * Allowed source statuses: SENT, ACCEPTED
 * The quotation status is updated to CONVERTED after successful conversion.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:quotations:convert:${ip}`, 20, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId } = auth;

        const { id } = await params;

        // 1. Fetch quotation with items and contact, enforcing tenant isolation
        const quotation = await prisma.quotation.findFirst({
            where: { id, tenantId },
            include: {
                items: true,
                contact: { select: { id: true, name: true, email: true, phone: true } },
            },
        });

        if (!quotation) {
            return apiNotFound(MSG.QUOTATION_NOT_FOUND);
        }

        // 2. Validate quotation status — only SENT or ACCEPTED can be converted
        const convertibleStatuses = ['SENT', 'ACCEPTED'];
        if (!convertibleStatuses.includes(quotation.status)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Quotation status must be one of: ${convertibleStatuses.join(', ')}. Current status: ${quotation.status}`,
                },
                { status: 400 }
            );
        }

        // 3. Validate quotation has at least one item
        if (!quotation.items || quotation.items.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Cannot convert a quotation with no items' },
                { status: 400 }
            );
        }

        // 4. Create invoice from quotation data in a transaction
        const invoice = await prisma.$transaction(async (tx) => {
            // Generate unique invoice number
            const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

            // Due date = 30 days from now
            const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            // Create invoice with line items from quotation
            const createdInvoice = await tx.invoice.create({
                data: {
                    invoiceNumber,
                    status: 'DRAFT',
                    dueDate,
                    notes: quotation.notes || '',
                    subtotal: quotation.subtotal,
                    taxRate: quotation.taxRate,
                    taxAmount: quotation.taxAmount,
                    totalBeforeTax: quotation.subtotal,
                    total: quotation.total,
                    tenantId,
                    contactId: quotation.contactId,
                    items: {
                        create: quotation.items.map((item) => ({
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            total: item.total,
                        })),
                    },
                },
                include: {
                    items: true,
                    contact: { select: { id: true, name: true, email: true, phone: true } },
                },
            });

            // Update quotation status to CONVERTED
            await tx.quotation.update({
                where: { id: quotation.id },
                data: { status: 'CONVERTED' },
            });

            return createdInvoice;
        });

        // 5. Audit trail for invoice creation
        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'Invoice',
            entityId: invoice.id,
            newValues: toAuditPayload(invoice),
            request,
        });

        // 6. Audit trail for quotation status change
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'Quotation',
            entityId: quotation.id,
            oldValues: { status: quotation.status },
            newValues: { status: 'CONVERTED', convertedToInvoiceId: invoice.id },
            request,
        });

        return NextResponse.json(
            { success: true, data: invoice },
            { status: 201 }
        );
    } catch (error) {
        return handleApiError(error);
    }
}
