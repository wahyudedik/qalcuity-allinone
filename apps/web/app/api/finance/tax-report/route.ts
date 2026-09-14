export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { handleApiError } from '@/lib/api-error';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { MSG } from '@/lib/api-messages';

// ─── Types ──────────────────────────────────────────────────────────────────

interface InvoiceDetail {
    id: string;
    number: string;
    date: string;
    contactName: string;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    status: string;
}

interface PurchaseOrderDetail {
    id: string;
    number: string;
    date: string;
    supplierName: string;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    status: string;
}

interface TaxReportResponse {
    period: { startDate: string; endDate: string };
    ppn: {
        ppnOut: number;
        ppnIn: number;
        ppnPayable: number;
        invoiceCount: number;
        poCount: number;
    };
    pph: {
        pph21Total: number;
        pph23Total: number;
        totalWithholding: number;
    };
    details: {
        invoices: InvoiceDetail[];
        purchaseOrders: PurchaseOrderDetail[];
    };
    totalTaxCollected: number;
    totalTaxPaid: number;
    netTaxPosition: number;
}

// ─── Helper: parse decimal to number ────────────────────────────────────────

function toNumber(val: unknown): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val) || 0;
    // Prisma Decimal objects
    if (typeof val === 'object' && 'toNumber' in (val as Record<string, unknown>)) {
        return (val as { toNumber: () => number }).toNumber();
    }
    return 0;
}

// ─── GET /api/finance/tax-report ────────────────────────────────────────────

export async function GET(request: Request) {
    try {
        // Rate limit
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:tax-report:${ip}`, 60, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        // Auth check
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }
        const { tenantId } = auth;

        // Parse query params
        const { searchParams } = new URL(request.url);
        const now = new Date();
        const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const startDate = searchParams.get('startDate')
            ? new Date(searchParams.get('startDate')!)
            : defaultStart;
        const endDate = searchParams.get('endDate')
            ? new Date(searchParams.get('endDate')!)
            : defaultEnd;

        // Ensure endDate covers the full day
        endDate.setHours(23, 59, 59, 999);

        const dateFilter = {
            gte: startDate,
            lte: endDate,
        };

        // ─── Query Invoices (PPN Out) ────────────────────────────────────
        // PPN Keluar: Invoice dengan status PAID atau SENT
        const invoices = await prisma.invoice.findMany({
            where: {
                tenantId,
                createdAt: dateFilter,
                status: { in: ['PAID', 'SENT'] },
            },
            include: {
                contact: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // ─── Query Purchase Orders (PPN In) ──────────────────────────────
        // PPN Masuk: PO dengan status RECEIVED
        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where: {
                tenantId,
                createdAt: dateFilter,
                status: { in: ['RECEIVED'] },
            },
            include: {
                supplier: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // ─── Query PPh 23 from Invoices ──────────────────────────────────
        // PPh 23: Invoice dengan taxCode = "PPH23"
        const pph23Invoices = await prisma.invoice.findMany({
            where: {
                tenantId,
                createdAt: dateFilter,
                taxCode: 'PPH23',
                status: { in: ['PAID', 'SENT'] },
            },
            select: {
                taxAmount: true,
            },
        });

        // ─── Query PPh 21 from Payroll ───────────────────────────────────
        // PPh 21: PayrollRecord deductions (approximation — deductions may include other items)
        const payrollRecords = await prisma.payrollRecord.findMany({
            where: {
                tenantId,
                createdAt: dateFilter,
                status: { in: ['PROCESSED', 'PAID'] },
            },
            select: {
                deductions: true,
            },
        });

        // ─── Aggregate PPN Out ────────────────────────────────────────────
        let ppnOut = 0;
        const invoiceDetails: InvoiceDetail[] = invoices.map((inv) => {
            const taxAmt = toNumber(inv.taxAmount);
            ppnOut += taxAmt;
            return {
                id: inv.id,
                number: inv.invoiceNumber,
                date: inv.createdAt.toISOString(),
                contactName: inv.contact?.name || '-',
                subtotal: toNumber(inv.subtotal),
                taxRate: toNumber(inv.taxRate),
                taxAmount: taxAmt,
                total: toNumber(inv.total),
                status: inv.status,
            };
        });

        // ─── Aggregate PPN In ─────────────────────────────────────────────
        let ppnIn = 0;
        const poDetails: PurchaseOrderDetail[] = purchaseOrders.map((po) => {
            const taxAmt = toNumber(po.taxAmount);
            ppnIn += taxAmt;
            return {
                id: po.id,
                number: po.poNumber,
                date: po.createdAt.toISOString(),
                supplierName: po.supplier?.name || '-',
                subtotal: toNumber(po.subtotal),
                taxRate: toNumber(po.taxRate),
                taxAmount: taxAmt,
                total: toNumber(po.total),
                status: po.status,
            };
        });

        // ─── Aggregate PPh ────────────────────────────────────────────────
        const pph23Total = pph23Invoices.reduce(
            (sum, inv) => sum + toNumber(inv.taxAmount),
            0
        );
        // PPh 21: Use deductions from payroll as approximation
        const pph21Total = payrollRecords.reduce(
            (sum, pr) => sum + toNumber(pr.deductions),
            0
        );

        // ─── Build Response ───────────────────────────────────────────────
        const ppnPayable = ppnOut - ppnIn;
        const totalTaxCollected = ppnOut;
        const totalTaxPaid = ppnIn;
        const netTaxPosition = totalTaxCollected - totalTaxPaid;

        const response: TaxReportResponse = {
            period: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
            ppn: {
                ppnOut,
                ppnIn,
                ppnPayable,
                invoiceCount: invoices.length,
                poCount: purchaseOrders.length,
            },
            pph: {
                pph21Total,
                pph23Total,
                totalWithholding: pph21Total + pph23Total,
            },
            details: {
                invoices: invoiceDetails,
                purchaseOrders: poDetails,
            },
            totalTaxCollected,
            totalTaxPaid,
            netTaxPosition,
        };

        return NextResponse.json({ success: true, data: response });
    } catch (error) {
        return handleApiError(error);
    }
}
