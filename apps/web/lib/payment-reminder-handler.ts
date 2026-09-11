// ─── Payment Reminder Cron Handler ──────────────────────────────────────────
// Separated from route file to comply with Next.js App Router export rules.
// Next.js routes may only export HTTP method handlers (GET, POST, etc.).

import { prisma } from '@/lib/db';
import { sendPaymentReminderEmail } from '@/lib/email';
import type { CronTaskResult } from '@/lib/cron-scheduler';

export async function runPaymentReminder(): Promise<CronTaskResult> {
    const now = new Date();
    let processed = 0;
    let sent = 0;
    let skipped = 0;

    // Get all active tenants
    const tenants = await prisma.tenant.findMany({
        where: { deletedAt: null },
        select: { id: true },
    });

    for (const tenant of tenants) {
        // Get notification settings for this tenant
        const notifSettings = await prisma.tenantNotificationSettings.findUnique({
            where: { tenantId: tenant.id },
        });

        // Skip if email overdue is disabled
        if (notifSettings && !notifSettings.emailOverdue) {
            continue;
        }

        // Find overdue invoices (SENT or OVERDUE status with past dueDate)
        const overdueInvoices = await prisma.invoice.findMany({
            where: {
                tenantId: tenant.id,
                status: { in: ['SENT', 'OVERDUE'] },
                dueDate: { lt: now },
            },
            include: {
                contact: { select: { name: true, email: true } },
            },
        });

        for (const invoice of overdueInvoices) {
            processed++;
            const daysOverdue = Math.floor(
                (now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
            );

            // Check if reminder was already sent in the last 24 hours
            const recentReminder = await prisma.paymentReminderLog.findFirst({
                where: {
                    tenantId: tenant.id,
                    invoiceId: invoice.id,
                    sentAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
                },
            });

            if (recentReminder) {
                skipped++;
                continue;
            }

            // Get tenant info for email
            const tenantInfo = await prisma.tenant.findUnique({
                where: { id: tenant.id },
                select: { name: true, id: true },
            });

            if (!tenantInfo) {
                skipped++;
                continue;
            }

            // Send email
            const emailResult = await sendPaymentReminderEmail(
                {
                    id: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    total: Number(invoice.total),
                    dueDate: invoice.dueDate,
                    contact: invoice.contact,
                },
                tenantInfo
            );

            // Create reminder log
            await prisma.paymentReminderLog.create({
                data: {
                    tenantId: tenant.id,
                    invoiceId: invoice.id,
                    channel: 'email',
                    reminderCount: 1,
                    daysOverdue,
                },
            });

            // Update invoice status to OVERDUE if it's still SENT
            if (invoice.status === 'SENT') {
                await prisma.invoice.update({
                    where: { id: invoice.id },
                    data: { status: 'OVERDUE' },
                });
            }

            // Create in-app notification for admin users
            const admins = await prisma.user.findMany({
                where: {
                    tenantId: tenant.id,
                    role: { in: ['ADMIN', 'SUPERADMIN'] },
                },
                select: { id: true },
            });

            if (admins.length > 0) {
                await prisma.inAppNotification.createMany({
                    data: admins.map((admin) => ({
                        tenantId: tenant.id,
                        userId: admin.id,
                        type: 'payment_overdue',
                        title: `Payment Overdue: ${invoice.invoiceNumber}`,
                        message: `Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue (Rp ${Number(invoice.total).toLocaleString('id-ID')}).`,
                        link: `/dashboard/finance/invoices/${invoice.id}`,
                    })),
                });
            }

            if (emailResult.success) {
                sent++;
            }
        }
    }

    console.log(`[Cron] Payment Reminder: processed=${processed}, sent=${sent}, skipped=${skipped}`);

    return {
        success: true,
        message: `Processed ${processed} invoices, sent ${sent} reminders, skipped ${skipped}`,
        data: { processed, sent, skipped },
    };
}
