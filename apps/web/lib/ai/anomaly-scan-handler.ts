// ─── Anomaly Scan Cron Handler ──────────────────────────────────────────────
// Separated from route file to comply with Next.js App Router export rules.
// Next.js routes may only export HTTP method handlers (GET, POST, etc.).

import { prisma } from '@/lib/db';
import { runAnomalyScan } from './anomaly-detection';
import type { CronTaskResult } from '@/lib/cron-scheduler';
import { logger } from '@/lib/logger';

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
            logger.error(`[Cron Scan] Tenant ${tenant.id} failed`, error);
            results.push({
                tenantId: tenant.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    const totalAnomalies = results.reduce((sum, r) => {
        return sum + ('anomaliesFound' in r ? r.anomaliesFound : 0);
    }, 0);

    logger.info(`[Cron] Anomaly Scan: tenants=${tenants.length}, totalAnomalies=${totalAnomalies}`);

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
