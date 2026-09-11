// ─── Recurring Invoice Logic ─────────────────────────────────────────────────
// Generates invoices from recurring invoice templates.
// Calculates next run date based on frequency.

import { prisma } from './db';

export interface RecurringInvoiceData {
    id: string;
    tenantId: string;
    contactId: string;
    invoiceNumber: string | null;
    notes: string | null;
    taxRate: unknown;
    frequency: string;
    dayOfMonth: number | null;
    dayOfWeek: number | null;
    startDate: Date;
    endDate: Date | null;
    nextRunDate: Date;
    lastRunDate: Date | null;
    status: string;
    createdBy: string;
    items: Array<{
        description: string;
        quantity: unknown;
        unitPrice: unknown;
        productId: string | null;
    }>;
    contact: {
        id: string;
        name: string | null;
        email: string | null;
    };
}

/**
 * Calculate the next run date based on frequency and configuration.
 */
export function calculateNextRunDate(
    frequency: string,
    dayOfMonth: number | null,
    dayOfWeek: number | null,
    fromDate: Date
): Date {
    const next = new Date(fromDate);

    switch (frequency) {
        case 'WEEKLY': {
            next.setDate(next.getDate() + 7);
            if (dayOfWeek !== null && dayOfWeek !== undefined) {
                // Adjust to the target day of week
                const currentDay = next.getDay();
                const diff = dayOfWeek - currentDay;
                next.setDate(next.getDate() + (diff >= 0 ? diff : diff + 7));
            }
            break;
        }
        case 'BIWEEKLY': {
            next.setDate(next.getDate() + 14);
            if (dayOfWeek !== null && dayOfWeek !== undefined) {
                const currentDay = next.getDay();
                const diff = dayOfWeek - currentDay;
                next.setDate(next.getDate() + (diff >= 0 ? diff : diff + 7));
            }
            break;
        }
        case 'MONTHLY': {
            next.setMonth(next.getMonth() + 1);
            const targetDay = Math.min(dayOfMonth || 1, 28);
            next.setDate(targetDay);
            break;
        }
        case 'QUARTERLY': {
            next.setMonth(next.getMonth() + 3);
            const targetDay = Math.min(dayOfMonth || 1, 28);
            next.setDate(targetDay);
            break;
        }
        case 'YEARLY': {
            next.setFullYear(next.getFullYear() + 1);
            const targetDay = Math.min(dayOfMonth || 1, 28);
            next.setDate(targetDay);
            break;
        }
        default: {
            // Default: monthly
            next.setMonth(next.getMonth() + 1);
            next.setDate(Math.min(dayOfMonth || 1, 28));
            break;
        }
    }

    return next;
}

/**
 * Generate a unique invoice number for the tenant.
 */
async function generateInvoiceNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Count existing invoices this month
    const count = await prisma.invoice.count({
        where: {
            tenantId,
            createdAt: {
                gte: new Date(now.getFullYear(), now.getMonth(), 1),
                lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
            },
        },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `INV-${year}${month}-${sequence}`;
}

/**
 * Generate an invoice from a recurring invoice template.
 * Creates a new DRAFT invoice, updates nextRunDate, and checks for completion.
 */
export async function generateInvoiceFromRecurring(
    recurring: RecurringInvoiceData
): Promise<string> {
    const now = new Date();

    // Calculate subtotal from items
    let subtotal = 0;
    for (const item of recurring.items) {
        subtotal += Number(item.quantity) * Number(item.unitPrice);
    }

    const taxRate = recurring.taxRate ? Number(recurring.taxRate) : 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Generate invoice number
    const invoiceNumber = recurring.invoiceNumber || await generateInvoiceNumber(recurring.tenantId);

    // Create the invoice
    const invoice = await prisma.invoice.create({
        data: {
            tenantId: recurring.tenantId,
            contactId: recurring.contactId,
            invoiceNumber,
            status: 'DRAFT',
            dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            notes: recurring.notes || undefined,
            subtotal,
            taxRate,
            taxAmount,
            totalBeforeTax: subtotal,
            total,
            recurringInvoiceId: recurring.id,
            items: {
                create: recurring.items.map((item) => ({
                    description: item.description,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    total: Number(item.quantity) * Number(item.unitPrice),
                    productId: item.productId || undefined,
                })),
            },
        },
        select: { id: true },
    });

    // Calculate next run date
    const nextRunDate = calculateNextRunDate(
        recurring.frequency,
        recurring.dayOfMonth,
        recurring.dayOfWeek,
        now
    );

    // Check if we've passed the end date
    let newStatus = 'ACTIVE';
    if (recurring.endDate && nextRunDate > recurring.endDate) {
        newStatus = 'COMPLETED';
    }

    // Update the recurring invoice
    await prisma.recurringInvoice.update({
        where: { id: recurring.id },
        data: {
            nextRunDate,
            lastRunDate: now,
            status: newStatus,
        },
    });

    return invoice.id;
}
