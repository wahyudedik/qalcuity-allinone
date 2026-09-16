export const dynamic = 'force-dynamic';

// ============================================
// Analytics Refresh Views API — POST
// Refresh all materialized views used by analytics.
// Only ADMIN/SUPERADMIN can trigger refresh.
// ============================================

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { requireAdminAuth } from '@/lib/session';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { refreshAllViews } from '@/lib/analytics/read-model';
import { logAudit } from '@/lib/audit';

// ============================================
// POST — Refresh materialized views
// ============================================

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        // Rate limit: 10 requests per 60 seconds (expensive operation)
        const rateLimitResult = checkRateLimit(`api:analytics:refresh-views:POST:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429 }
            );
        }

        // 1. Auth check — only ADMIN/SUPERADMIN can refresh
        const auth = await requireAdminAuth();

        // 2. Execute refresh
        const startTime = Date.now();
        const results = await refreshAllViews();
        const duration = Date.now() - startTime;

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        // 3. Audit log
        await logAudit({
            userId: auth.userId,
            tenantId: auth.tenantId,
            action: 'REFRESH',
            entity: 'MaterializedViews',
            newValues: {
                totalViews: results.length,
                success: successCount,
                failed: failCount,
                duration: `${duration}ms`,
            },
            request,
        });

        logger.info(`[ANALYTICS] Materialized views refreshed by ${auth.userId}: ${successCount}/${results.length} in ${duration}ms`);

        return NextResponse.json({
            success: true,
            data: {
                message: 'Materialized views berhasil di-refresh',
                totalViews: results.length,
                success: successCount,
                failed: failCount,
                duration: `${duration}ms`,
                refreshedAt: new Date().toISOString(),
                results: results.map(r => ({
                    view: r.viewName,
                    success: r.success,
                    duration: `${r.duration}ms`,
                    error: r.error,
                })),
            },
        });
    } catch (error) {
        logger.error('[ANALYTICS] Failed to refresh materialized views:', error);
        return handleApiError(error);
    }
}
