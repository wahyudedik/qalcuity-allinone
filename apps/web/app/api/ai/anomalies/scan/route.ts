export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runAnomalyScan } from '@/lib/ai/anomaly-detection';
import { handleApiError } from '@/lib/api-error';

// â”€â”€â”€ GET: Cron endpoint for external cron service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Authenticates via CRON_SECRET Bearer token (not session auth).
// Scans ALL active tenants for anomalies â€” designed for cron-job.org, Vercel Cron, etc.

export async function GET(req: Request) {
    try {
        // API key authentication (for cron service)
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            return NextResponse.json(
                { success: false, error: 'CRON_SECRET not configured' },
                { status: 503 }
            );
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
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
                console.error(`[Cron Scan] Tenant ${tenant.id} failed:`, error);
                results.push({
                    tenantId: tenant.id,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                tenantsScanned: tenants.length,
                results,
                scannedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
