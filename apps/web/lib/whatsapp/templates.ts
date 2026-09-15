/**
 * WhatsApp Message Templates
 *
 * Pre-built text message templates for common business scenarios.
 * These are simple text messages (not Meta approved templates — those require
 * Meta review). Use string interpolation with Indonesian business context.
 *
 * All templates are in Bahasa Indonesia for the Indonesian market.
 */

// ---------------------------------------------------------------------------
// Currency formatter
// ---------------------------------------------------------------------------

/**
 * Format number as Indonesian Rupiah.
 * e.g., 1500000 → "Rp1.500.000"
 */
function formatRupiah(amount: number): string {
    return `Rp${amount.toLocaleString('id-ID')}`;
}

/**
 * Format a date to Indonesian format.
 * e.g., 2026-09-14 → "14 September 2026"
 */
function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/**
 * Invoice delivery notification.
 * Sent when an invoice is created and needs to be delivered to the customer.
 *
 * @param invoiceNumber - Invoice number (e.g., "INV-2026-001")
 * @param amount - Total amount in Rupiah
 * @param dueDate - Payment due date
 * @returns Formatted message string
 */
export function invoiceTemplate(
    invoiceNumber: string,
    amount: number,
    dueDate: Date | string
): string {
    return [
        `📋 *INVOICE*`,
        ``,
        `Halo,`,
        ``,
        `Berikut adalah invoice dari perusahaan Anda:`,
        ``,
        `Nomor: *${invoiceNumber}*`,
        `Total: *${formatRupiah(amount)}*`,
        `Jatuh Tempo: *${formatDate(dueDate)}*`,
        ``,
        `Silakan lakukan pembayaran sebelum jatuh tempo.`,
        ``,
        `Terima kasih atas kerjasamanya.`,
    ].join('\n');
}

/**
 * Payment reminder for overdue invoices.
 * Sent to remind customers about overdue payments.
 *
 * @param invoiceNumber - Invoice number
 * @param amount - Outstanding amount in Rupiah
 * @param overdueDays - Number of days overdue
 * @returns Formatted message string
 */
export function paymentReminderTemplate(
    invoiceNumber: string,
    amount: number,
    overdueDays: number
): string {
    return [
        `⏰ *REMINDER PEMBAYARAN*`,
        ``,
        `Halo,`,
        ``,
        `Ini adalah pengingat bahwa invoice Anda sudah *jatuh tempo*.`,
        ``,
        `Nomor: *${invoiceNumber}*`,
        `Total: *${formatRupiah(amount)}*`,
        `Terlambat: *${overdueDays} hari*`,
        ``,
        `Mohon segera lakukan pembayaran untuk menghindari keterlambatan lebih lanjut.`,
        ``,
        `Jika sudah melakukan pembayaran, mohon abaikan pesan ini.`,
    ].join('\n');
}

/**
 * Payment confirmation.
 * Sent when a payment has been received successfully.
 *
 * @param invoiceNumber - Invoice number that was paid
 * @param amount - Amount paid in Rupiah
 * @param method - Payment method (e.g., "Transfer Bank", "QRIS", "Tunai")
 * @returns Formatted message string
 */
export function paymentConfirmationTemplate(
    invoiceNumber: string,
    amount: number,
    method: string
): string {
    return [
        `✅ *KONFIRMASI PEMBAYARAN*`,
        ``,
        `Halo,`,
        ``,
        `Pembayaran Anda telah berhasil diterima.`,
        ``,
        `Nomor: *${invoiceNumber}*`,
        `Jumlah: *${formatRupiah(amount)}*`,
        `Metode: *${method}*`,
        ``,
        `Terima kasih atas pembayaran Anda.`,
    ].join('\n');
}

/**
 * Order confirmation.
 * Sent when an order has been placed successfully.
 *
 * @param orderNumber - Order number (e.g., "ORD-2026-001")
 * @param items - Array of item names with quantities
 * @param total - Total order amount in Rupiah
 * @returns Formatted message string
 */
export function orderConfirmationTemplate(
    orderNumber: string,
    items: Array<{ name: string; quantity: number }>,
    total: number
): string {
    const itemLines = items
        .map((item) => `  • ${item.name} x${item.quantity}`)
        .join('\n');

    return [
        `🛒 *KONFIRMASI PESANAN*`,
        ``,
        `Halo,`,
        ``,
        `Pesanan Anda telah berhasil dibuat.`,
        ``,
        `Nomor: *${orderNumber}*`,
        `Items:`,
        itemLines,
        ``,
        `Total: *${formatRupiah(total)}*`,
        ``,
        `Kami akan segera memproses pesanan Anda.`,
    ].join('\n');
}

/**
 * Shipping notification.
 * Sent when an order has been shipped.
 *
 * @param orderNumber - Order number
 * @param carrier - Shipping carrier name (e.g., "JNE", "J&T", "SiCepat")
 * @param tracking - Tracking number
 * @returns Formatted message string
 */
export function shippingNotificationTemplate(
    orderNumber: string,
    carrier: string,
    tracking: string
): string {
    return [
        `🚚 *INFO PENGIRIMAN*`,
        ``,
        `Halo,`,
        ``,
        `Pesanan Anda sedang dalam perjalanan.`,
        ``,
        `Nomor: *${orderNumber}*`,
        `Kurir: *${carrier}*`,
        `No. Resi: *${tracking}*`,
        ``,
        `Anda dapat melacak pengiriman melalui website kurir.`,
        ``,
        `Terima kasih atas kesabaran Anda.`,
    ].join('\n');
}
