// ─── Recurring Invoice Cron Handler ─────────────────────────────────────────
// Separated from route file to comply with Next.js App Router export rules.
// Next.js routes may only export HTTP method handlers (GET, POST, etc.).

import { prisma } from '@/lib/db';
import { generateInvoiceFromRecurring } from '@/lib/recurring-invoice';
import type { CronTaskResult } from '@/lib/cron-scheduler';
import { logger } from '@/lib/logger';

export async function runRecurringInvoice(): Promise<CronTaskResult> {
    const now = new Date();
    let processed = 0;
    let generated = 0;
    let failed = 0;

    // Find all active recurring invoices that are due (excluding expired ones)
    const dueRecurringInvoices = await prisma.recurringInvoice.findMany({
        where: {
            status: 'ACTIVE',
            nextRunDate: { lte: now },
            OR: [
                { endDate: null },
                { endDate: { gte: now } },
            ],
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
            logger.error(`[Cron] Failed to generate invoice for recurring ${recurring.id}`, error);
            failed++;
        }
    }

    logger.info('[Cron] Recurring Invoice completed', { processed, generated, failed });

    return {
        success: true,
        message: `Processed ${processed} recurring invoices, generated ${generated}, failed ${failed}`,
        data: { processed, generated, failed },
    };
}
