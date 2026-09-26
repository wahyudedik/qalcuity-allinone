export const dynamic = 'force-dynamic';

/**
 * Mobile API — Invoice Detail (GET + Update + Delete)
 *
 * GET    /api/mobile/finance/invoices/[id]  — Get invoice detail
 * PUT    /api/mobile/finance/invoices/[id]  — Update invoice
 * DELETE /api/mobile/finance/invoices/[id]  — Soft delete invoice
 *
 * Auth: JWT Bearer token via requireMobileAuth()
 * Tenant: Filtered by user.tenantId
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireMobileAuth } from '@/lib/mobile-auth-guard';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { sanitizeObject } from '@/lib/sanitize';
import { createInvoiceSchema, formatZodError } from '@/lib/validation-schemas';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';
import { calculateTax } from '@/lib/ppn';

// ─── GET /api/mobile/finance/invoices/[id] ────────────────────────────────────

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireMobileAuth(req);
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        const invoice = await prisma.invoice.findFirst({
            where: { id: params.id, tenantId: user.tenantId, deletedAt: null },
            include: {
                contact: { select: { id: true, name: true, email: true, phone: true } },
                items: true,
                payments: { select: { id: true, amount: true, status: true } },
            },
        });

        if (!invoice) {
            return NextResponse.json(
                { success: false, error: MSG.INVOICE_NOT_FOUND },
                { status: 404 }
            );
        }

        const data = {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.contact?.name || '-',
            contactId: invoice.contactId,
            subtotal: invoice.subtotal,
            tax: invoice.taxAmount,
            total: invoice.total,
            currency: 'IDR',
            status: invoice.status.toLowerCase(),
            dueDate: invoice.dueDate.toISOString().split('T')[0],
            createdAt: invoice.createdAt.toISOString(),
            notes: invoice.notes,
            items: invoice.items.map((item) => ({
                id: item.id,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
            })),
            paidAmount: invoice.payments
                .filter((p) => p.status === 'COMPLETED')
                .reduce((sum, p) => sum + Number(p.amount), 0),
        };

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT /api/mobile/finance/invoices/[id] ────────────────────────────────────

export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireMobileAuth(req);
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        if (user.role === 'VIEWER') {
            return NextResponse.json(
                { success: false, error: MSG.FORBIDDEN },
                { status: 403 }
            );
        }

        const { id: userId, tenantId } = user;
        const body = await req.json();

        // Sanitize text inputs before validation
        const sanitizedBody = sanitizeObject(body);

        const validation = createInvoiceSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Cek apakah invoice ada dan milik tenant ini
        const existing = await prisma.invoice.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.INVOICE_NOT_FOUND },
                { status: 404 }
            );
        }

        // Calculate totals
        const subtotal = validatedData.items.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
        );
        const taxRate = validatedData.taxRate || 0;
        const taxAmount = validatedData.taxAmount ?? calculateTax(subtotal, taxRate).taxAmount;
        const total = subtotal + taxAmount;

        // Update invoice: delete old items, create new ones
        const updated = await prisma.$transaction(async (tx) => {
            // Delete existing items
            await tx.invoiceItem.deleteMany({ where: { invoiceId: params.id } });

            // Update invoice with new items
            return tx.invoice.update({
                where: { id: params.id },
                data: {
                    dueDate: new Date(validatedData.dueDate || existing.dueDate.toISOString()),
                    notes: validatedData.notes || '',
                    subtotal,
                    taxRate,
                    taxCode: validatedData.taxCode || null,
                    taxAmount,
                    totalBeforeTax: subtotal,
                    total,
                    contactId: validatedData.contactId || existing.contactId,
                    items: {
                        create: validatedData.items.map((item) => ({
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            total: item.total || item.quantity * item.unitPrice,
                        })),
                    },
                },
                include: { items: true, contact: true },
            });
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'Invoice',
            entityId: params.id,
            oldValues: { invoiceNumber: existing.invoiceNumber, total: existing.total },
            newValues: { invoiceNumber: updated.invoiceNumber, total: updated.total },
            request: req,
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── DELETE /api/mobile/finance/invoices/[id] ─────────────────────────────────

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireMobileAuth(req);
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        if (user.role === 'VIEWER') {
            return NextResponse.json(
                { success: false, error: MSG.FORBIDDEN },
                { status: 403 }
            );
        }

        const { id: userId, tenantId } = user;

        const existing = await prisma.invoice.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.INVOICE_NOT_FOUND },
                { status: 404 }
            );
        }

        // Soft delete
        await prisma.invoice.update({
            where: { id: params.id },
            data: { deletedAt: new Date() },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'Invoice',
            entityId: params.id,
            oldValues: { invoiceNumber: existing.invoiceNumber, total: existing.total },
            request: req,
        });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
