// ─── Stock Alert Utility ─────────────────────────────────────────────────────
// Checks if a product's stock has fallen below its minimum threshold
// and triggers email + in-app notifications when appropriate.
// Prevents duplicate alerts within a 24-hour window.

import { prisma } from './db';
import { sendStockAlertEmail } from './email';

export interface StockAlertResult {
    alerted: boolean;
    reason?: string;
}

/**
 * Check if a product's stock is at or below its minimum level,
 * and send an alert if no alert was sent in the last 24 hours.
 *
 * @param product - The product to check (must include stock, minStock, name, tenantId)
 * @returns StockAlertResult indicating if an alert was sent
 */
export async function checkAndSendStockAlert(
    product: { id: string; name: string; stock: number; minStock: number; tenantId: string }
): Promise<StockAlertResult> {
    // Only alert if minStock is configured and stock is at or below it
    if (product.minStock <= 0 || product.stock > product.minStock) {
        return { alerted: false, reason: 'Stock is above minimum threshold' };
    }

    // Prevent duplicate alerts within 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAlert = await prisma.inAppNotification.findFirst({
        where: {
            tenantId: product.tenantId,
            type: 'stock_alert',
            title: `Low Stock: ${product.name}`,
            createdAt: { gte: twentyFourHoursAgo },
        },
    });

    if (recentAlert) {
        return { alerted: false, reason: 'Alert already sent within 24 hours' };
    }

    // Get tenant admin users for notification
    const admins = await prisma.user.findMany({
        where: {
            tenantId: product.tenantId,
            role: { in: ['ADMIN', 'SUPERADMIN'] },
        },
        select: { id: true, email: true, name: true },
    });

    if (admins.length === 0) {
        return { alerted: false, reason: 'No admin users found for tenant' };
    }

    // Get tenant info for email
    const tenant = await prisma.tenant.findUnique({
        where: { id: product.tenantId },
        select: { id: true, name: true, email: true },
    });

    if (!tenant) {
        return { alerted: false, reason: 'Tenant not found' };
    }

    // Send email to admin/owner
    const adminEmail = tenant.email || admins[0].email;
    if (adminEmail) {
        await sendStockAlertEmail(adminEmail, {
            name: product.name,
            stock: product.stock,
            minStock: product.minStock,
            tenantId: product.tenantId,
        }, tenant.name);
    }

    // Create in-app notifications for all admins
    const notifications = admins.map((admin) => ({
        tenantId: product.tenantId,
        userId: admin.id,
        type: 'stock_alert',
        title: `Low Stock: ${product.name}`,
        message: `Stock for "${product.name}" is at ${product.stock} units (minimum: ${product.minStock}). Please restock.`,
        link: '/dashboard/inventory/stock',
    }));

    await prisma.inAppNotification.createMany({ data: notifications });

    return { alerted: true };
}

/**
 * Check all products in a tenant for low stock conditions.
 * Used by the cron endpoint.
 */
export async function checkAllLowStockProducts(tenantId: string): Promise<{
    checked: number;
    alerted: number;
    skipped: number;
}> {
    const lowStockProducts = await prisma.product.findMany({
        where: {
            tenantId,
            isActive: true,
            deletedAt: null,
            minStock: { gt: 0 },
            stock: { lte: 0 }, // We'll filter more precisely in JS since Prisma can't compare two columns
        },
        select: {
            id: true,
            name: true,
            stock: true,
            minStock: true,
            tenantId: true,
        },
    });

    // Filter products where stock <= minStock (Prisma can't do column-to-column comparison)
    const productsToAlert = lowStockProducts.filter((p) => p.stock <= p.minStock);

    let alerted = 0;
    let skipped = 0;

    for (const product of productsToAlert) {
        const result = await checkAndSendStockAlert(product);
        if (result.alerted) {
            alerted++;
        } else {
            skipped++;
        }
    }

    return {
        checked: lowStockProducts.length,
        alerted,
        skipped,
    };
}
