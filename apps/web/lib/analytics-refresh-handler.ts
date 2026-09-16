// ─── Analytics Refresh Cron Handler ──────────────────────────────────────────
// Separated from route file to comply with Next.js App Router export rules.
// Next.js routes may only export HTTP method handlers (GET, POST, etc.).
//
// Refresh semua materialized views secara periodik (setiap 6 jam).
// Menggunakan REFRESH MATERIALIZED VIEW CONCURRENTLY agar non-blocking.

import { refreshAllViews } from '@/lib/analytics/read-model';
import type { CronTaskResult } from '@/lib/cron-scheduler';
import { logger } from '@/lib/logger';

export async function runRefreshAnalyticsViews(): Promise<CronTaskResult> {
    const startTime = Date.now();

    try {
        logger.info('[Cron] Starting analytics materialized views refresh');

        const results = await refreshAllViews();

        const duration = Date.now() - startTime;
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        if (failCount > 0) {
            const failedViews = results
                .filter(r => !r.success)
                .map(r => `${r.viewName}: ${r.error}`)
                .join('; ');

            logger.warn(`[Cron] Analytics refresh completed with ${failCount} failures: ${failedViews}`);

            return {
                success: true, // Partial success is still success
                message: `Analytics views refreshed: ${successCount}/${results.length} success, ${failCount} failed (${duration}ms)`,
                data: {
                    total: results.length,
                    success: successCount,
                    failed: failCount,
                    duration,
                    results: results.map(r => ({
                        view: r.viewName,
                        success: r.success,
                        duration: r.duration,
                        error: r.error,
                    })),
                },
            };
        }

        logger.info(`[Cron] Analytics refresh complete: all ${successCount} views refreshed in ${duration}ms`);

        return {
            success: true,
            message: `All ${successCount} analytics materialized views refreshed successfully (${duration}ms)`,
            data: {
                total: results.length,
                success: successCount,
                failed: 0,
                duration,
            },
        };
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[Cron] Analytics refresh failed after ${duration}ms:`, error);

        return {
            success: false,
            message: `Analytics refresh failed: ${errorMessage} (${duration}ms)`,
        };
    }
}
