import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:quotations:convert:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;

        // Fetch quotation with items and contact
        const quotation = await prisma.quotation.findFirst({
            where: { id, tenantId },
            include: {
                items: true,
                contact: true,
            },
        });

        if (!quotation) {
            return NextResponse.json(
                { success: false, error: 'Quotation tidak ditemukan' },
                { status: 404 }
            );
        }

        // Check if quotation can be converted (must be SENT or ACCEPTED)
        const convertibleStatuses = ['SENT', 'ACCEPTED'];
        if (!convertibleStatuses.includes(quotation.status)) {
            return NextResponse.json(
                { success: false, error: 'Hanya quotation dengan status SENT atau ACCEPTED yang dapat dikonversi' },
                { status: 400 }
            );
        }

        // Create invoice from quotation data in a transaction
        const invoice = await prisma.$transaction(async (tx) => {
            // Generate unique invoice number
            const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

            // Create invoice
            const newInvoice = await tx.invoice.create({
                data: {
                    invoiceNumber,
                    status: 'DRAFT',
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
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
                include: { items: true, contact: true },
            });

            // Update quotation status to CONVERTED (use DRAFT as there's no CONVERTED status in the enum)
            await tx.quotation.update({
                where: { id },
                data: { status: 'ACCEPTED' },
            });

            return newInvoice;
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CONVERT',
            entity: 'Quotation',
            entityId: id,
            newValues: { convertedToInvoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber } as Record<string, unknown>,
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
