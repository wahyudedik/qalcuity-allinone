export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { generatePurchaseOrderPDF, type CompanyInfo } from '@/lib/pdf-generator';

export async function GET(
    request: Request,
    { params }: { params: { id: string } },
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:purchase-orders:pdf:${ip}`, 30, 60000);
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

        // Fetch purchase order with items and supplier
        const purchaseOrder = await prisma.purchaseOrder.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            include: {
                items: true,
                supplier: {
                    select: {
                        name: true,
                        email: true,
                        phone: true,
                        address: true,
                    },
                },
            },
        });

        if (!purchaseOrder) {
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
        const doc = generatePurchaseOrderPDF(
            {
                poNumber: purchaseOrder.poNumber,
                createdAt: purchaseOrder.createdAt.toISOString(),
                expectedDelivery: purchaseOrder.deliveryDate?.toISOString() || null,
                status: purchaseOrder.status,
                supplierName: purchaseOrder.supplier?.name || '-',
                supplierEmail: purchaseOrder.supplier?.email,
                supplierPhone: purchaseOrder.supplier?.phone,
                supplierAddress: purchaseOrder.supplier?.address,
                items: purchaseOrder.items.map((item) => ({
                    description: item.description,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    total: Number(item.total),
                })),
                subtotal: Number(purchaseOrder.subtotal),
                taxRate: Number(purchaseOrder.taxRate),
                taxAmount: Number(purchaseOrder.taxAmount),
                total: Number(purchaseOrder.total),
                notes: purchaseOrder.notes,
            },
            company,
        );

        // Convert to Buffer
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="purchase-order-${purchaseOrder.poNumber}.pdf"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
