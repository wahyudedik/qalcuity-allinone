/**
 * POS Cache Invalidation — Centralized cache invalidation for POS module.
 *
 * When a POS transaction or refund is created/updated/deleted, the analytics
 * and dashboard caches for that tenant must be invalidated so subsequent
 * requests fetch fresh data from the database.
 *
 * Cache key patterns:
 *   - Analytics: pos:analytics:{tenantId}:{period}:{startDate}:{endDate}
 *   - Dashboard: pos:dashboard:{tenantId}:{date}
 *
 * Invalidation uses deletePattern() to clear ALL cache variants for the tenant.
 *
 * @see apps/web/app/api/pos/analytics/route.ts — analytics cache read logic
 * @see apps/web/app/api/pos/dashboard/route.ts — dashboard cache read logic
 * @see apps/web/lib/redis.ts — deletePattern utility
 */

import { deletePattern } from '@/lib/redis';
import { logger } from '@/lib/logger';

/**
 * POS analytics cache TTL in seconds (matches ANALYTICS_CACHE_TTL in analytics/route.ts).
 * Used for logging purposes only — actual TTL is set in the analytics route.
 */
const POS_ANALYTICS_CACHE_PREFIX = 'pos:analytics';

/**
 * POS dashboard cache TTL in seconds (matches DASHBOARD_CACHE_TTL in dashboard/route.ts).
 * Used for logging purposes only — actual TTL is set in the dashboard route.
 */
const POS_DASHBOARD_CACHE_PREFIX = 'pos:dashboard';

/**
 * Invalidate all POS analytics cache entries for a given tenant.
 *
 * This function is designed to be called via fire-and-forget pattern:
 * ```ts
 * invalidatePosAnalyticsCache(tenantId).catch(() => {});
 * ```
 *
 * It will NOT throw — all errors are caught and logged gracefully.
 *
 * @param tenantId - The tenant whose analytics cache should be invalidated
 */
export async function invalidatePosAnalyticsCache(tenantId: string): Promise<void> {
    if (!tenantId) {
        logger.warn('[PosCache] invalidatePosAnalyticsCache called without tenantId');
        return;
    }

    try {
        const pattern = `${POS_ANALYTICS_CACHE_PREFIX}:${tenantId}:*`;
        const deletedCount = await deletePattern(pattern);

        if (deletedCount > 0) {
            logger.info(
                `[PosCache] Invalidated ${deletedCount} analytics cache entries for tenant ${tenantId}`
            );
        } else {
            logger.info(
                `[PosCache] No analytics cache entries found for tenant ${tenantId} (already expired or not cached)`
            );
        }
    } catch (error) {
        // Graceful fallback — don't crash if Redis is down
        logger.warn('[PosCache] Failed to invalidate analytics cache', {
            tenantId,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

/**
 * Invalidate all POS dashboard cache entries for a given tenant.
 *
 * Dashboard cache keys follow the pattern: pos:dashboard:{tenantId}:{date}
 * Since the dashboard always shows today's data, this will typically only
 * delete one key, but we use pattern delete for safety.
 *
 * This function is designed to be called via fire-and-forget pattern:
 * ```ts
 * invalidatePosDashboardCache(tenantId).catch(() => {});
 * ```
 *
 * It will NOT throw — all errors are caught and logged gracefully.
 *
 * @param tenantId - The tenant whose dashboard cache should be invalidated
 */
export async function invalidatePosDashboardCache(tenantId: string): Promise<void> {
    if (!tenantId) {
        logger.warn('[PosCache] invalidatePosDashboardCache called without tenantId');
        return;
    }

    try {
        const pattern = `${POS_DASHBOARD_CACHE_PREFIX}:${tenantId}:*`;
        const deletedCount = await deletePattern(pattern);

        if (deletedCount > 0) {
            logger.info(
                `[PosCache] Invalidated ${deletedCount} dashboard cache entries for tenant ${tenantId}`
            );
        } else {
            logger.info(
                `[PosCache] No dashboard cache entries found for tenant ${tenantId} (already expired or not cached)`
            );
        }
    } catch (error) {
        // Graceful fallback — don't crash if Redis is down
        logger.warn('[PosCache] Failed to invalidate dashboard cache', {
            tenantId,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
