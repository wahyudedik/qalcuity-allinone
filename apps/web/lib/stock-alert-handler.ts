// ─── Stock Alert Cron Handler ───────────────────────────────────────────────
// Separated from route file to comply with Next.js App Router export rules.
// Next.js routes may only export HTTP method handlers (GET, POST, etc.).

import { prisma } from '@/lib/db';
import { checkAllLowStockProducts } from '@/lib/stock-alert';
import type { CronTaskResult } from '@/lib/cron-scheduler';

export async function runStockAlert(): Promise<CronTaskResult> {
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

    return {
        success: true,
        message: `Checked ${totalChecked} products across ${tenants.length} tenants, ${totalAlerted} alerts, ${totalSkipped} skipped`,
        data: {
            tenants: tenants.length,
            checked: totalChecked,
            alerted: totalAlerted,
            skipped: totalSkipped,
        },
    };
}
