// Email sending utility — SMTP transport via nodemailer
// Falls back to console.log when SMTP is not configured (development mode)

import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { prisma } from './db';
import { emailTemplates, getEmailTemplate } from './email-templates';

export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    from?: string;
    replyTo?: string;
    cc?: string;
    bcc?: string;
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }>;
}

export interface SendEmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

// ---------------------------------------------------------------------------
// SMTP Configuration helpers
// ---------------------------------------------------------------------------

/**
 * Check whether SMTP credentials are configured via environment variables.
 * All of SMTP_HOST, SMTP_USER, and SMTP_PASS must be non-empty to consider
 * the transport "configured".
 */
function isSmtpConfigured(): boolean {
    return Boolean(
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
    );
}

/**
 * Lazily-created nodemailer transport singleton.
 * Created once on first use and reused for subsequent emails.
 */
let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
    if (_transporter) return _transporter;

    const host = process.env.SMTP_HOST || '';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';

    _transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        // Reasonable defaults for a B2B app
        connectionTimeout: 10_000,
        greetingTimeout: 5_000,
        socketTimeout: 15_000,
    });

    return _transporter;
}

/**
 * Get the default "from" address.
 * Uses SMTP_FROM env var when set, otherwise falls back to noreply@qalcuity.com.
 */
function getDefaultFrom(): string {
    return process.env.SMTP_FROM || 'noreply@qalcuity.com';
}

// ---------------------------------------------------------------------------
// Core email sending function
// ---------------------------------------------------------------------------

/**
 * Mengirim email menggunakan konfigurasi SMTP.
 *
 * - Jika SMTP terkonfigurasi (SMTP_HOST, SMTP_USER, SMTP_PASS terisi),
 *   email dikirim melalui nodemailer SMTP transport.
 * - Jika tidak, fallback ke console.log agar development tetap berjalan.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
        // Validasi input
        if (!options.to || !options.subject || !options.html) {
            return {
                success: false,
                error: 'Field to, subject, dan html wajib diisi',
            };
        }

        // Validasi format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(options.to)) {
            return {
                success: false,
                error: 'Format email tidak valid',
            };
        }

        const from = options.from || getDefaultFrom();

        // --- SMTP transport path ---
        if (isSmtpConfigured()) {
            const transporter = getTransporter();

            const info = await transporter.sendMail({
                from,
                to: options.to,
                subject: options.subject,
                html: options.html,
                cc: options.cc || undefined,
                bcc: options.bcc || undefined,
                attachments: options.attachments || undefined,
                replyTo: options.replyTo || undefined,
            });

            console.log('[Email] Sent via SMTP:', {
                messageId: info.messageId,
                to: options.to,
                subject: options.subject,
                from,
                timestamp: new Date().toISOString(),
            });

            return {
                success: true,
                messageId: info.messageId,
            };
        }

        // --- Fallback: console.log (development / unconfigured SMTP) ---
        console.warn(
            '[Email] SMTP not configured — falling back to console.log. ' +
            'Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env to enable real email delivery.'
        );
        console.log('[Email] Would be sent:', {
            to: options.to,
            subject: options.subject,
            from,
            timestamp: new Date().toISOString(),
        });

        return {
            success: true,
            messageId: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Email] Failed to send:', message);
        return {
            success: false,
            error: `Gagal mengirim email: ${message}`,
        };
    }
}

// ---------------------------------------------------------------------------
// Template helpers
// ---------------------------------------------------------------------------

/**
 * Render template email dengan data.
 * Mengganti placeholder {{key}} dengan value dari data.
 */
/**
 * Encode HTML entities in a value to prevent injection in HTML email context.
 */
function encodeHtmlEntities(value: string): string {
    const amp = String.fromCharCode(38) + 'amp;';
    const lt = String.fromCharCode(38) + 'lt;';
    const gt = String.fromCharCode(38) + 'gt;';
    return value
        .replace(/&/g, amp)
        .replace(/</g, lt)
        .replace(/>/g, gt);
}

export function renderTemplate(
    template: string,
    data: Record<string, string>
): string {
    return Object.entries(data).reduce(
        (result, [key, value]) =>
            result.replace(
                new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
                encodeHtmlEntities(value)
            ),
        template
    );
}

/**
 * Generate HTML email lengkap dengan wrapper
 */
export function generateEmailHtml(
    content: string,
    options?: {
        companyName?: string;
        footerText?: string;
        primaryColor?: string;
    }
): string {
    const companyName = options?.companyName || 'Qalcuity';
    const footerText = options?.footerText || 'Email ini dikirim oleh ' + companyName;
    const primaryColor = options?.primaryColor || '#2563eb';

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 40px; height: 40px; background-color: ${primaryColor}; border-radius: 10px; line-height: 40px; color: white; font-weight: bold; font-size: 18px;">Q</div>
            <span style="font-size: 20px; font-weight: bold; color: #111827; margin-left: 8px;">${companyName}</span>
          </div>
          <div style="color: #374151; line-height: 1.6;">
            ${content}
          </div>
        </div>
        <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
          <p>${footerText}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ---------------------------------------------------------------------------
// SMTP connection test
// ---------------------------------------------------------------------------

/**
 * Test koneksi SMTP.
 * Jika SMTP tidak dikonfigurasi, mengembalikan success: false dengan pesan.
 */
export async function testSmtpConnection(config?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        // Jika config diberikan, buat transport sementara untuk test
        if (config && config.host) {
            const testTransporter = nodemailer.createTransport({
                host: config.host,
                port: config.port,
                secure: config.secure,
                auth: { user: config.user, pass: config.pass },
                connectionTimeout: 10_000,
                greetingTimeout: 5_000,
                socketTimeout: 15_000,
            });
            await testTransporter.verify();
            console.log('[SMTP] Connection test passed:', {
                host: config.host,
                port: config.port,
                secure: config.secure,
            });
            return { success: true };
        }

        // Jika tidak ada config, gunakan env-based transport
        if (!isSmtpConfigured()) {
            return {
                success: false,
                error: 'SMTP belum dikonfigurasi. Set SMTP_HOST, SMTP_USER, SMTP_PASS di .env',
            };
        }

        const transporter = getTransporter();
        await transporter.verify();

        console.log('[SMTP] Connection test passed:', {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || '587',
            secure: process.env.SMTP_SECURE === 'true',
        });

        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[SMTP] Connection test failed:', message);
        return { success: false, error: message };
    }
}

// ---------------------------------------------------------------------------
// High-level email notification functions
// ---------------------------------------------------------------------------

/**
 * Notify superadmin when a new billing payment is received.
 * Fetches payment + tenant + plan from DB, renders template, sends email to info@qalcuity.com
 */
export async function notifySuperadminPayment(paymentId: string): Promise<SendEmailResult> {
    try {
        const payment = await prisma.billingPayment.findUnique({
            where: { id: paymentId },
            include: {
                tenant: {
                    select: { name: true, email: true },
                },
                subscription: {
                    include: {
                        plan: {
                            select: { name: true, price: true },
                        },
                    },
                },
            },
        });

        if (!payment) {
            return { success: false, error: 'Payment not found' };
        }

        const template = emailTemplates.billingPaymentReceived;
        const proofLink = payment.proofFileUrl
            ? `<a href="${payment.proofFileUrl}">Lihat Bukti Transfer</a>`
            : 'Tidak ada';

        const htmlBody = renderTemplate(template.body, {
            tenantName: payment.tenant.name,
            tenantEmail: payment.tenant.email || '-',
            planName: payment.subscription.plan.name,
            amount: `Rp ${Number(payment.amount).toLocaleString('id-ID')}`,
            bankName: payment.bankName || '-',
            accountNumber: payment.accountNumber || '-',
            accountName: payment.accountName || '-',
            paymentDate: new Date(payment.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }),
            proofLink,
        });

        const html = generateEmailHtml(htmlBody, {
            companyName: 'Qalcuity',
            footerText: 'Email ini dikirim otomatis oleh Qalcuity Billing System',
        });

        const result = await sendEmail({
            to: 'info@qalcuity.com',
            subject: `Pembayaran Langganan Baru - ${payment.tenant.name}`,
            html,
        });

        return result;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Email] Failed to notify superadmin:', message);
        return { success: false, error: `Gagal mengirim notifikasi: ${message}` };
    }
}

// ---------------------------------------------------------------------------
// Business event email triggers
// ---------------------------------------------------------------------------

/**
 * Send email when a new invoice is created.
 * Graceful — logs warning if SMTP is not configured, never throws.
 */
export async function sendInvoiceCreatedEmail(
    invoice: {
        id: string;
        invoiceNumber: string;
        total: number | unknown;
        dueDate: Date | string | null;
        contact?: { name?: string | null; email?: string | null } | null;
    },
    tenant: { name: string; id: string }
): Promise<SendEmailResult> {
    try {
        const customerEmail = invoice.contact?.email;
        if (!customerEmail) {
            console.warn('[Email] sendInvoiceCreatedEmail: no customer email, skipping');
            return { success: false, error: 'No customer email address' };
        }

        const template = emailTemplates.invoice;
        const dueDateStr = invoice.dueDate
            ? new Date(invoice.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            : '-';

        const htmlBody = renderTemplate(template.body, {
            invoiceNumber: invoice.invoiceNumber,
            companyName: tenant.name,
            customerName: invoice.contact?.name || 'Pelanggan',
            date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
            dueDate: dueDateStr,
            total: `Rp ${Number(invoice.total).toLocaleString('id-ID')}`,
        });

        const html = generateEmailHtml(htmlBody, { companyName: tenant.name });

        const result = await sendEmail({
            to: customerEmail,
            subject: renderTemplate(template.subject, {
                invoiceNumber: invoice.invoiceNumber,
                companyName: tenant.name,
            }),
            html,
        });

        return result;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Email] Failed to send invoice created email:', message);
        return { success: false, error: message };
    }
}

/**
 * Send email when a payment is received.
 * Graceful — logs warning if SMTP is not configured, never throws.
 */
export async function sendPaymentReceivedEmail(
    payment: {
        id: string;
        paymentNumber: string;
        amount: number | unknown;
        invoice?: {
            invoiceNumber?: string | null;
            contact?: { name?: string | null; email?: string | null } | null;
        } | null;
    },
    tenant: { name: string; id: string }
): Promise<SendEmailResult> {
    try {
        const customerEmail = payment.invoice?.contact?.email;
        if (!customerEmail) {
            console.warn('[Email] sendPaymentReceivedEmail: no customer email, skipping');
            return { success: false, error: 'No customer email address' };
        }

        const template = emailTemplates.paymentConfirmation;
        const invoiceNumber = payment.invoice?.invoiceNumber || '-';

        const htmlBody = renderTemplate(template.body, {
            invoiceNumber,
            companyName: tenant.name,
            customerName: payment.invoice?.contact?.name || 'Pelanggan',
            total: `Rp ${Number(payment.amount).toLocaleString('id-ID')}`,
        });

        const html = generateEmailHtml(htmlBody, { companyName: tenant.name });

        const result = await sendEmail({
            to: customerEmail,
            subject: renderTemplate(template.subject, {
                invoiceNumber,
                companyName: tenant.name,
            }),
            html,
        });

        return result;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Email] Failed to send payment received email:', message);
        return { success: false, error: message };
    }
}

/**
 * Send welcome email after user registration.
 * Graceful — logs warning if SMTP is not configured, never throws.
 */
export async function sendWelcomeEmail(
    user: { name: string; email: string },
    tenant: { name: string; id: string }
): Promise<SendEmailResult> {
    try {
        if (!user.email) {
            console.warn('[Email] sendWelcomeEmail: no user email, skipping');
            return { success: false, error: 'No user email address' };
        }

        const template = emailTemplates.welcome;

        const htmlBody = renderTemplate(template.body, {
            companyName: tenant.name,
            customerName: user.name,
        });

        const html = generateEmailHtml(htmlBody, { companyName: tenant.name });

        const result = await sendEmail({
            to: user.email,
            subject: renderTemplate(template.subject, {
                companyName: tenant.name,
            }),
            html,
        });

        return result;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Email] Failed to send welcome email:', message);
        return { success: false, error: message };
    }
}

/**
 * Send payment reminder for overdue invoices.
 * Graceful — logs warning if SMTP is not configured, never throws.
 */
export async function sendPaymentReminderEmail(
    invoice: {
        id: string;
        invoiceNumber: string;
        total: number | unknown;
        dueDate: Date | string | null;
        contact?: { name?: string | null; email?: string | null } | null;
    },
    tenant: { name: string; id: string }
): Promise<SendEmailResult> {
    try {
        const customerEmail = invoice.contact?.email;
        if (!customerEmail) {
            console.warn('[Email] sendPaymentReminderEmail: no customer email, skipping');
            return { success: false, error: 'No customer email address' };
        }

        const template = emailTemplates.paymentReminder;
        const dueDateStr = invoice.dueDate
            ? new Date(invoice.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            : '-';

        const htmlBody = renderTemplate(template.body, {
            invoiceNumber: invoice.invoiceNumber,
            companyName: tenant.name,
            customerName: invoice.contact?.name || 'Pelanggan',
            total: `Rp ${Number(invoice.total).toLocaleString('id-ID')}`,
            dueDate: dueDateStr,
        });

        const html = generateEmailHtml(htmlBody, { companyName: tenant.name });

        const result = await sendEmail({
            to: customerEmail,
            subject: renderTemplate(template.subject, {
                invoiceNumber: invoice.invoiceNumber,
            }),
            html,
        });

        return result;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Email] Failed to send payment reminder email:', message);
        return { success: false, error: message };
    }
}
