export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { generateQuotationPDF, type CompanyInfo } from '@/lib/pdf-generator';

export async function GET(
    request: Request,
    { params }: { params: { id: string } },
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:quotations:pdf:${ip}`, 30, 60000);
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

        // Fetch quotation with items and contact
        const quotation = await prisma.quotation.findFirst({
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

        if (!quotation) {
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
        const doc = generateQuotationPDF(
            {
                quotationNumber: quotation.quotationNumber,
                createdAt: quotation.createdAt.toISOString(),
                validUntil: quotation.validUntil.toISOString(),
                status: quotation.status,
                customerName: quotation.contact?.name || '-',
                customerEmail: quotation.contact?.email,
                customerPhone: quotation.contact?.phone,
                customerAddress: quotation.contact?.address,
                items: quotation.items.map((item) => ({
                    description: item.description,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    total: Number(item.total),
                })),
                subtotal: Number(quotation.subtotal),
                taxRate: Number(quotation.taxRate),
                taxAmount: Number(quotation.taxAmount),
                discount: Number(quotation.discount),
                total: Number(quotation.total),
                notes: quotation.notes,
                terms: quotation.terms,
            },
            company,
        );

        // Convert to Buffer
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="quotation-${quotation.quotationNumber}.pdf"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
