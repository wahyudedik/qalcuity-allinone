export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { sendPaymentReminderEmail } from '@/lib/email';
import { requirePermission } from '@/lib/session';
import { MSG } from '@/lib/api-messages';

// ─── POST: Manual trigger payment reminder for a specific invoice ────────────

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        // Auth check — requires finance.update permission
        const auth = await requirePermission('finance.invoice');
        const { tenantId } = auth;
        const invoiceId = params.id;

        // Get invoice with contact info
        const invoice = await prisma.invoice.findFirst({
            where: {
                id: invoiceId,
                tenantId, // Tenant isolation
            },
            include: {
                contact: { select: { name: true, email: true } },
                tenant: { select: { name: true, id: true } },
            },
        });

        if (!invoice) {
            return NextResponse.json(
                { success: false, error: MSG.DATA_NOT_FOUND },
                { status: 404 }
            );
        }

        // Only allow reminders for SENT or OVERDUE invoices
        if (!['SENT', 'OVERDUE'].includes(invoice.status)) {
            return NextResponse.json(
                { success: false, error: 'Payment reminder can only be sent for SENT or OVERDUE invoices' },
                { status: 400 }
            );
        }

        const now = new Date();
        const daysOverdue = invoice.dueDate
            ? Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        // Send email
        const emailResult = await sendPaymentReminderEmail(
            {
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                total: Number(invoice.total),
                dueDate: invoice.dueDate,
                contact: invoice.contact,
            },
            { name: invoice.tenant.name, id: invoice.tenant.id }
        );

        // Count previous reminders for this invoice
        const previousReminders = await prisma.paymentReminderLog.count({
            where: { tenantId, invoiceId },
        });

        // Create reminder log
        await prisma.paymentReminderLog.create({
            data: {
                tenantId,
                invoiceId,
                channel: 'email',
                reminderCount: previousReminders + 1,
                daysOverdue: Math.max(0, daysOverdue),
            },
        });

        // Update invoice status to OVERDUE if it's still SENT
        if (invoice.status === 'SENT' && daysOverdue > 0) {
            await prisma.invoice.update({
                where: { id: invoiceId },
                data: { status: 'OVERDUE' },
            });
        }

        return NextResponse.json({
            success: true,
            message: emailResult.success
                ? 'Payment reminder sent successfully'
                : 'Reminder logged but email delivery failed',
            emailSent: emailResult.success,
            daysOverdue,
            reminderCount: previousReminders + 1,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
