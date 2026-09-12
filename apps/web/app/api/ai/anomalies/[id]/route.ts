export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { runAnomalyScan } from '@/lib/ai/anomaly-detection';
import { verifyCronAuth, cronSuccess, cronError } from '@/lib/cron';
import { logger } from '@/lib/logger';

// â”€â”€â”€ GET: Cron endpoint for external cron service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Authenticates via CRON_SECRET Bearer token (not session auth).
// Scans ALL active tenants for anomalies â€” designed for cron-job.org, Vercel Cron, etc.

export async function GET(req: Request) {
    try {
        // Cron auth (CRON_SECRET Bearer token)
        if (!verifyCronAuth(req)) {
            return cronError('Unauthorized', 401);
        }

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
                logger.error(`[Cron Scan] Tenant ${tenant.id} failed:`, error);
                results.push({
                    tenantId: tenant.id,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        return cronSuccess({
            tenantsScanned: tenants.length,
            results,
            scannedAt: new Date().toISOString(),
        });
    } catch (error) {
        logger.error('[Cron Scan] Anomaly scan failed:', error);
        return cronError(error instanceof Error ? error.message : 'Internal server error', 500);
    }
}
