export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { verifyCronAuth, cronSuccess, cronError } from '@/lib/cron';
import { checkAllLowStockProducts } from '@/lib/stock-alert';

// ─── GET: Cron endpoint for stock alerts ─────────────────────────────────────
// Authenticates via CRON_SECRET Bearer token (not session auth).
// Scans all active tenants for low stock products.

export async function GET(req: Request) {
    try {
        if (!verifyCronAuth(req)) return cronError('Unauthorized', 401);

        const tenants = await prisma.tenant.findMany({
            where: { deletedAt: null },
            select: { id: true },
        });

        const results: Array<{
            tenantId: string;
            checked: number;
            alerted: number;
            skipped: number;
        }> = [];

        for (const tenant of tenants) {
            const result = await checkAllLowStockProducts(tenant.id);
            results.push({ tenantId: tenant.id, ...result });
        }

        const totalChecked = results.reduce((sum, r) => sum + r.checked, 0);
        const totalAlerted = results.reduce((sum, r) => sum + r.alerted, 0);
        const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

        console.log(`[Cron] Stock Alert: tenants=${tenants.length}, checked=${totalChecked}, alerted=${totalAlerted}, skipped=${totalSkipped}`);

        return cronSuccess({
            tenants: tenants.length,
            checked: totalChecked,
            alerted: totalAlerted,
            skipped: totalSkipped,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
