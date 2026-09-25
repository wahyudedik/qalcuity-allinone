export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { generateInvoicePDF, type CompanyInfo } from '@/lib/pdf-generator';

export async function GET(
    request: Request,
    { params }: { params: { id: string } },
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:invoices:pdf:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429 },
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }
        const { tenantId } = auth;

        // Fetch invoice with items and contact
        const invoice = await prisma.invoice.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            include: {
                items: true,
                contact: {
                    select: {
                        name: true,
                        email: true,
                        phone: true,
                        address: true,
                    },
                },
            },
        });

        if (!invoice) {
            return NextResponse.json(
                { success: false, error: MSG.DATA_NOT_FOUND },
                { status: 404 },
            );
        }

        // Fetch tenant/company info
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                name: true,
                address: true,
                phone: true,
                email: true,
                website: true,
                logo: true,
            },
        });

        const company: CompanyInfo = {
            name: tenant?.name || 'Qalcuity',
            address: tenant?.address,
            phone: tenant?.phone,
            email: tenant?.email,
            website: tenant?.website,
            logo: tenant?.logo,
        };

        // Generate PDF
        const doc = generateInvoicePDF(
            {
                invoiceNumber: invoice.invoiceNumber,
                createdAt: invoice.createdAt.toISOString(),
                dueDate: invoice.dueDate.toISOString(),
                status: invoice.status,
                customerName: invoice.contact?.name || '-',
                customerEmail: invoice.contact?.email,
                customerPhone: invoice.contact?.phone,
                customerAddress: invoice.contact?.address,
                items: invoice.items.map((item) => ({
                    description: item.description,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    total: Number(item.total),
                })),
                subtotal: Number(invoice.subtotal),
                taxRate: Number(invoice.taxRate),
                taxAmount: Number(invoice.taxAmount),
                total: Number(invoice.total),
                notes: invoice.notes,
            },
            company,
        );

        // Convert to Buffer
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
