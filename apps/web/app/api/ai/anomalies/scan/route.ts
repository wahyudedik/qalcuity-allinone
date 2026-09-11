export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { runAnomalyScan } from '@/lib/ai/anomaly-detection';
import { verifyCronAuth, cronSuccess, cronError } from '@/lib/cron';
import type { CronTaskResult } from '@/lib/cron-scheduler';

// ─── Handler function (importable by scheduler) ─────────────────────────────

export async function runAnomalyScanCron(): Promise<CronTaskResult> {
    // Get all active tenants (exclude soft-deleted)
    const tenants = await prisma.tenant.findMany({
        where: { deletedAt: null },
        select: { id: true },
    });

    const results: Array<{
        tenantId: string;
        anomaliesFound: number;
        scannedEntities: number;
    } | {
        tenantId: string;
        error: string;
    }> = [];

    // Scan each tenant (sequential to avoid overwhelming DB)
    for (const tenant of tenants) {
        try {
            const result = await runAnomalyScan(tenant.id);
            results.push({
                tenantId: tenant.id,
                anomaliesFound: result.anomalies.length,
                scannedEntities: result.scannedEntities,
            });
        } catch (error) {
            // Log error but continue scanning other tenants
            console.error(`[Cron Scan] Tenant ${tenant.id} failed:`, error);
            results.push({
                tenantId: tenant.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    const totalAnomalies = results.reduce((sum, r) => {
        return sum + ('anomaliesFound' in r ? r.anomaliesFound : 0);
    }, 0);

    console.log(`[Cron] Anomaly Scan: tenants=${tenants.length}, totalAnomalies=${totalAnomalies}`);

    return {
        success: true,
        message: `Scanned ${tenants.length} tenants, found ${totalAnomalies} anomalies`,
        data: {
            tenantsScanned: tenants.length,
            results,
            scannedAt: new Date().toISOString(),
        },
    };
}

// ─── GET: Cron endpoint (direct call) ───────────────────────────────────────

export async function GET(req: Request) {
    try {
        // Cron auth (CRON_SECRET Bearer token)
        if (!verifyCronAuth(req)) {
            return cronError('Unauthorized', 401);
        }

        const result = await runAnomalyScanCron();
        return cronSuccess(result.data ?? {});
    } catch (error) {
        console.error('[Cron Scan] Anomaly scan failed:', error);
        return cronError(error instanceof Error ? error.message : 'Internal server error', 500);
    }
}
