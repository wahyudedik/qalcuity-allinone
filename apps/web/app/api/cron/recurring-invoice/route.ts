export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { verifyCronAuth, cronSuccess, cronError } from '@/lib/cron';
import { generateInvoiceFromRecurring } from '@/lib/recurring-invoice';

// ─── GET: Cron endpoint for recurring invoice generation ─────────────────────
// Authenticates via CRON_SECRET Bearer token (not session auth).
// Scans active recurring invoices and generates new invoices when due.

export async function GET(req: Request) {
    try {
        if (!verifyCronAuth(req)) return cronError('Unauthorized', 401);

        const now = new Date();
        let processed = 0;
        let generated = 0;
        let failed = 0;

        // Find all active recurring invoices that are due
        const dueRecurringInvoices = await prisma.recurringInvoice.findMany({
            where: {
                status: 'ACTIVE',
                nextRunDate: { lte: now },
            },
            include: {
                items: true,
                contact: { select: { id: true, name: true, email: true } },
            },
        });

        for (const recurring of dueRecurringInvoices) {
            processed++;
            try {
                await generateInvoiceFromRecurring(recurring);
                generated++;
            } catch (error) {
                console.error(`[Cron] Failed to generate invoice for recurring ${recurring.id}:`, error);
                failed++;
            }
        }

        console.log(`[Cron] Recurring Invoice: processed=${processed}, generated=${generated}, failed=${failed}`);

        return cronSuccess({ processed, generated, failed });
    } catch (error) {
        return handleApiError(error);
    }
}
