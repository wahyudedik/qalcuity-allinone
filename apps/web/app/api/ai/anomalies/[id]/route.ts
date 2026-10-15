export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runAnomalyScan } from '@/lib/ai/anomaly-detection';
import { verifyCronAuth, cronSuccess, cronError } from '@/lib/cron';
import { logger } from '@/lib/logger';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { updateAnomalyStatusSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';

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

// ─── PATCH: Update anomaly status ──────────────────────────────────────────────
// Digunakan oleh dashboard AI Anomalies (action: investigate / dismiss / block).
// Session auth + permission check (lihat route-permissions: ADMIN fallback).

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:anomaly-status:${ip}`, 60, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        const body = await request.json();
        const validation = updateAnomalyStatusSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { status, statusNote } = validation.data;

        // Tenant isolation: hanya update anomaly milik tenant sendiri
        const result = await prisma.anomalyDetection.updateMany({
            where: { id: params.id, tenantId },
            data: {
                status,
                statusChangedBy: userId,
                statusChangedAt: new Date(),
                ...(statusNote !== undefined ? { statusNote } : {}),
            },
        });

        if (result.count === 0) {
            return NextResponse.json({ success: false, error: MSG.ANOMALY_NOT_FOUND }, { status: 404 });
        }

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'AnomalyDetection',
            entityId: params.id,
            newValues: { status, statusNote } as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, message: MSG.ANOMALY_STATUS_UPDATED });
    } catch (error) {
        return handleApiError(error);
    }
}
