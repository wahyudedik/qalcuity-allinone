/**
 * Platform Settings — Redis-backed cache with in-memory fallback.
 *
 * Provides access to platform-wide settings (maintenanceMode, allowRegistration,
 * emailNotifications, securityAlerts) with a two-tier cache:
 *   L1: Redis (shared across processes, TTL 60s)
 *   L2: In-memory (per-process, TTL 60s — used as fallback and for Edge Runtime)
 *
 * Design:
 *   - Async functions (getPlatformSettings) use dynamic import of Prisma —
 *     safe for Edge Runtime because the import only happens inside the async body.
 *   - Sync functions (getPlatformSettingsCached) are fully Edge-safe —
 *     they only read from the module-level in-memory cache.
 *   - Redis is optional — if unavailable, falls back to in-memory only.
 *   - All Redis operations are wrapped in try-catch — Redis failure never breaks the app.
 *   - Cache is invalidated via invalidatePlatformSettingsCache() after PUT updates.
 *
 * @see apps/web/app/api/platform/settings/route.ts — GET/PUT handlers
 * @see apps/web/middleware.ts — Uses getPlatformSettingsCached() for maintenance mode
 */

import { type PlatformSetting } from '@prisma/client';
import { getRedisClient, getRedisClientSync } from '@/lib/redis';
import { logger } from '@/lib/logger';

// ─── Cache Configuration ────────────────────────────────────────────────────

const CACHE_KEY = 'platform:settings';
const CACHE_TTL = 60; // seconds (used for both Redis TTL and memory TTL)

// ─── In-memory Cache (L2 — Edge-safe fallback) ─────────────────────────────

let memoryCache: PlatformSetting | null = null;
let memoryCacheTimestamp = 0;

// ─── Async: Fetch from DB with Redis + in-memory cache ─────────────────────

/**
 * Fetch platform settings with two-tier cache (Redis L1 → memory L2 → DB).
 * Uses dynamic import of Prisma to avoid Edge Runtime crashes.
 * Only call this from Node.js runtime (API routes, server components).
 */
export async function getPlatformSettings(): Promise<PlatformSetting | null> {
    const now = Date.now();

    // 1. Try Redis cache (L1) — shared across processes
    try {
        const redis = await getRedisClient();
        if (redis) {
            const cached = await redis.get(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached) as PlatformSetting;
                // Also populate memory cache for sync reads
                memoryCache = parsed;
                memoryCacheTimestamp = now;
                return parsed;
            }
        }
    } catch {
        // Redis unavailable or parse error — fall through to memory/DB
    }

    // 2. Try in-memory cache (L2) — per-process fallback
    if (memoryCache && (now - memoryCacheTimestamp) < CACHE_TTL * 1000) {
        return memoryCache;
    }

    // 3. Fetch from DB (cache miss on both tiers)
    try {
        // Dynamic import — avoids top-level Prisma dependency (Edge-safe)
        const { prisma } = await import('@/lib/db');
        const settings = await prisma.platformSetting.findFirst();

        // Populate memory cache (L2)
        memoryCache = settings;
        memoryCacheTimestamp = now;

        // Populate Redis cache (L1) — fire-and-forget with error handling
        try {
            const redis = await getRedisClient();
            if (redis && settings) {
                await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(settings));
            }
        } catch {
            // Redis write failed — memory cache still works
        }

        return settings;
    } catch (error) {
        // If DB fetch fails, return cached value if available (stale is better than nothing)
        logger.error('[PlatformSettings] Failed to fetch from DB', error);
        return memoryCache;
    }
}

// ─── Sync: Read from in-memory cache only (Edge-safe) ──────────────────────

/**
 * Get platform settings from in-memory cache only (synchronous, Edge-safe).
 * Returns null if cache is cold (no prior DB fetch).
 * Used by middleware which runs in Edge Runtime.
 */
export function getPlatformSettingsCached(): PlatformSetting | null {
    return memoryCache;
}

// ─── Cache Invalidation ─────────────────────────────────────────────────────

/**
 * Force-invalidate both Redis and in-memory settings cache.
 * Called after PUT /api/platform/settings to ensure fresh data.
 */
export function invalidatePlatformSettingsCache(): void {
    // Clear memory cache (L2)
    memoryCache = null;
    memoryCacheTimestamp = 0;

    // Clear Redis cache (L1) — fire-and-forget
    try {
        const redis = getRedisClientSync();
        if (redis) {
            redis.del(CACHE_KEY).catch(() => { });
        }
    } catch {
        // Redis delete failed — OK, TTL will expire naturally
    }
}

// ─── Plan Tenant Limit Check ────────────────────────────────────────────────

/**
 * Check if the tenant limit for a given plan has been reached.
 *
 * Counts tenants where `currentPlanSlug` matches the given planName,
 * OR where `currentPlanSlug` is null (unassigned tenants are treated as
 * the default "starter" tier).
 *
 * @param planName - The plan slug to check (e.g., "starter", "professional", "enterprise")
 * @returns Object with `allowed`, `current` count, and `limit`
 *
 * @example
 * ```ts
 * const check = await checkPlanTenantLimit('starter');
 * if (!check.allowed) {
 *   // Return 403 — limit reached
 * }
 * ```
 */
export async function checkPlanTenantLimit(
    planName: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
    try {
        const { prisma } = await import('@/lib/db');

        const limit = await prisma.planTenantLimit.findUnique({
            where: { planName },
        });

        // No limit configured or unlimited (maxTenants === 0 means unlimited)
        if (!limit || limit.maxTenants === 0) {
            return { allowed: true, current: 0, limit: 0 };
        }

        // Count tenants on this plan.
        // Tenants with null currentPlanSlug are treated as "starter" (default tier).
        const isStarter = planName === 'starter';
        const currentCount = await prisma.tenant.count({
            where: {
                deletedAt: null,
                ...(isStarter
                    ? { OR: [{ currentPlanSlug: planName }, { currentPlanSlug: null }] }
                    : { currentPlanSlug: planName }),
            },
        });

        return {
            allowed: currentCount < limit.maxTenants,
            current: currentCount,
            limit: limit.maxTenants,
        };
    } catch (error) {
        logger.error('[PlanTenantLimit] Failed to check limit', error);
        // On error, allow registration (fail-open for availability)
        return { allowed: true, current: 0, limit: 0 };
    }
}
