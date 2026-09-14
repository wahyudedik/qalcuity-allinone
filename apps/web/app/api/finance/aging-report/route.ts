export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { handleApiError } from '@/lib/api-error';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { MSG } from '@/lib/api-messages';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AgingBucket {
    count: number;
    total: number;
}

interface AgingSummary {
    current: AgingBucket;
    days31_60: AgingBucket;
    days61_90: AgingBucket;
    days90plus: AgingBucket;
    total: AgingBucket;
}

interface AgingDetail {
    id: string;
    number: string;
    contactName: string;
    total: number;
    paid: number;
    balance: number;
    referenceDate: string;
    ageDays: number;
    bucket: 'Current' | '31-60' | '61-90' | '90+';
}

interface AgingReportResponse {
    asOf: string;
    accountsReceivable: {
        summary: AgingSummary;
        details: AgingDetail[];
    };
    accountsPayable: {
        summary: AgingSummary;
        details: AgingDetail[];
    };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function toNumber(val: unknown): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val) || 0;
    if (typeof val === 'object' && 'toNumber' in (val as Record<string, unknown>)) {
        return (val as { toNumber: () => number }).toNumber();
    }
    return 0;
}

function calculateAgeDays(referenceDate: Date, today: Date): number {
    const diffMs = today.getTime() - referenceDate.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getBucket(ageDays: number): AgingDetail['bucket'] {
    if (ageDays <= 30) return 'Current';
    if (ageDays <= 60) return '31-60';
    if (ageDays <= 90) return '61-90';
    return '90+';
}

function createEmptySummary(): AgingSummary {
    return {
        current: { count: 0, total: 0 },
        days31_60: { count: 0, total: 0 },
        days61_90: { count: 0, total: 0 },
        days90plus: { count: 0, total: 0 },
        total: { count: 0, total: 0 },
    };
}

function addToSummary(summary: AgingSummary, bucket: AgingDetail['bucket'], amount: number): void {
    summary.total.count += 1;
    summary.total.total += amount;

    switch (bucket) {
        case 'Current':
            summary.current.count += 1;
            summary.current.total += amount;
            break;
        case '31-60':
            summary.days31_60.count += 1;
            summary.days31_60.total += amount;
            break;
        case '61-90':
            summary.days61_90.count += 1;
            summary.days61_90.total += amount;
            break;
        case '90+':
            summary.days90plus.count += 1;
            summary.days90plus.total += amount;
            break;
    }
}

// ─── GET /api/finance/aging-report ──────────────────────────────────────────

export async function GET(request: Request) {
    try {
        // Rate limit: 30 req/min
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:aging-report:${ip}`, 30, 60000);
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

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // ─── Accounts Receivable (AR): Invoice ───────────────────────────
        // Filter: status IN ['SENT', 'OVERDUE', 'PARTIAL'] (belum lunas)
        const arInvoices = await prisma.invoice.findMany({
            where: {
                tenantId,
                status: { in: ['SENT', 'OVERDUE'] },
            },
            include: {
                contact: { select: { name: true } },
                payments: { select: { amount: true } },
            },
            orderBy: { dueDate: 'asc' },
        });

        const arDetails: AgingDetail[] = arInvoices.map((inv) => {
            const totalPaid = inv.payments.reduce(
                (sum, p) => sum + toNumber(p.amount),
                0
            );
            const balance = toNumber(inv.total) - totalPaid;
            const referenceDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.createdAt);
            const ageDays = calculateAgeDays(referenceDate, today);
            const bucket = getBucket(ageDays);

            return {
                id: inv.id,
                number: inv.invoiceNumber,
                contactName: inv.contact?.name || '-',
                total: toNumber(inv.total),
                paid: totalPaid,
                balance,
                referenceDate: referenceDate.toISOString().split('T')[0],
                ageDays,
                bucket,
            };
        });

        // Filter out fully paid invoices (balance <= 0)
        const arFiltered = arDetails.filter((d) => d.balance > 0);

        const arSummary = createEmptySummary();
        for (const detail of arFiltered) {
            addToSummary(arSummary, detail.bucket, detail.balance);
        }

        // ─── Accounts Payable (AP): PurchaseOrder ────────────────────────
        // Filter: status IN ['SENT', 'RECEIVED'] (belum dibayar — no payment tracking on PO)
        const apPOs = await prisma.purchaseOrder.findMany({
            where: {
                tenantId,
                status: { in: ['SENT', 'RECEIVED'] },
            },
            include: {
                supplier: { select: { name: true } },
            },
            orderBy: { deliveryDate: 'asc' },
        });

        const apDetails: AgingDetail[] = apPOs.map((po) => {
            const balance = toNumber(po.total);
            const referenceDate = po.deliveryDate
                ? new Date(po.deliveryDate)
                : new Date(po.createdAt);
            const ageDays = calculateAgeDays(referenceDate, today);
            const bucket = getBucket(ageDays);

            return {
                id: po.id,
                number: po.poNumber,
                contactName: po.supplier?.name || '-',
                total: toNumber(po.total),
                paid: 0,
                balance,
                referenceDate: referenceDate.toISOString().split('T')[0],
                ageDays,
                bucket,
            };
        });

        const apSummary = createEmptySummary();
        for (const detail of apDetails) {
            addToSummary(apSummary, detail.bucket, detail.balance);
        }

        // ─── Response ────────────────────────────────────────────────────

        const response: AgingReportResponse = {
            asOf: today.toISOString().split('T')[0],
            accountsReceivable: {
                summary: arSummary,
                details: arFiltered,
            },
            accountsPayable: {
                summary: apSummary,
                details: apDetails,
            },
        };

        return NextResponse.json({ success: true, data: response });
    } catch (error) {
        return handleApiError(error);
    }
}
