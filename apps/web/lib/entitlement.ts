/**
 * Entitlement Engine — Plan-based Feature Gating
 *
 * Core library untuk mengontrol akses fitur berdasarkan plan/subscription.
 * Menggunakan caching (Redis if available, in-memory fallback) untuk performance.
 *
 * Functions:
 *   - getEntitlement(tenantId)        → Get tenant's entitlement with plan details
 *   - hasFeature(tenantId, featureKey) → Check if tenant has access to a feature
 *   - checkLimit(tenantId, featureKey) → Check usage limit for a feature
 *   - trackUsage(tenantId, featureKey) → Track usage for a feature
 *   - getUsageStats(tenantId, period)  → Get usage statistics
 *   - ensureEntitlement(tenantId)      → Ensure tenant has entitlement (create if missing)
 */

import { prisma } from '@/lib/db';
import { getRedisClientSync } from '@/lib/redis';
import {
    FEATURE_KEYS,
    DEFAULT_PLANS,
    ENTITLEMENT_STATUS,
    TRIAL_DAYS,
    type FeatureKey,
} from '@/lib/entitlements-config';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface EntitlementData {
    id: string;
    tenantId: string;
    planId: string;
    billingCycle: string;
    status: string;
    trialEndsAt: Date | null;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    plan: {
        id: string;
        name: string;
        slug: string;
        priceMonthly: number;
        priceYearly: number | null;
        maxUsers: number;
        maxStorage: number | null;
        features: {
            id: string;
            featureKey: string;
            enabled: boolean;
            limit: number | null;
        }[];
    };
}

export interface UsageStats {
    tenantId: string;
    period: string;
    features: Record<string, { current: number; limit: number | null; percentage: number }>;
    totalUsage: number;
}

export interface LimitCheckResult {
    allowed: boolean;
    current: number;
    limit: number | null; // null = unlimited
    percentage: number;
}

// ─── Cache Configuration ───────────────────────────────────────────────────────

const CACHE_PREFIX = 'entitlement:';
const CACHE_TTL = 3600; // 1 hour in seconds
const USAGE_CACHE_TTL = 300; // 5 minutes for usage data

// ─── In-memory cache (fallback when Redis unavailable) ─────────────────────────

const memoryCache = new Map<string, { data: unknown; expiresAt: number }>();

function getCacheKey(tenantId: string): string {
    return `${CACHE_PREFIX}${tenantId}`;
}

function getUsageCacheKey(tenantId: string, featureKey: string, period: string): string {
    return `${CACHE_PREFIX}usage:${tenantId}:${featureKey}:${period}`;
}

function getCached<T>(key: string): T | null {
    // Try Redis first
    const redis = getRedisClientSync();
    if (redis) {
        // Redis access is async but we use sync getter for middleware
        // Fall through to memory cache for sync contexts
    }

    // Memory cache fallback
    const cached = memoryCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data as T;
    }
    if (cached) {
        memoryCache.delete(key);
    }
    return null;
}

function setCache(key: string, data: unknown, ttl: number = CACHE_TTL): void {
    // Memory cache
    memoryCache.set(key, {
        data,
        expiresAt: Date.now() + ttl * 1000,
    });

    // Also try Redis (async, non-blocking)
    const redis = getRedisClientSync();
    if (redis) {
        redis.setex(key, ttl, JSON.stringify(data)).catch(() => {
            // Silently fail — memory cache is primary fallback
        });
    }
}

function invalidateCache(tenantId: string): void {
    const key = getCacheKey(tenantId);
    memoryCache.delete(key);

    const redis = getRedisClientSync();
    if (redis) {
        redis.del(key).catch(() => { });
    }
}

// ─── Core Functions ────────────────────────────────────────────────────────────

/**
 * Get tenant's entitlement with plan details and features.
 * Uses caching for performance.
 */
export async function getEntitlement(tenantId: string): Promise<EntitlementData | null> {
    // Check cache first
    const cacheKey = getCacheKey(tenantId);
    const cached = getCached<EntitlementData>(cacheKey);
    if (cached) {
        return cached;
    }

    // Query database
    const entitlement = await prisma.tenantEntitlement.findUnique({
        where: { tenantId },
        include: {
            plan: {
                include: {
                    features: true,
                },
            },
        },
    });

    if (!entitlement) {
        return null;
    }

    const data: EntitlementData = {
        id: entitlement.id,
        tenantId: entitlement.tenantId,
        planId: entitlement.planId,
        billingCycle: entitlement.billingCycle,
        status: entitlement.status,
        trialEndsAt: entitlement.trialEndsAt,
        currentPeriodStart: entitlement.currentPeriodStart,
        currentPeriodEnd: entitlement.currentPeriodEnd,
        plan: {
            id: entitlement.plan.id,
            name: entitlement.plan.name,
            slug: entitlement.plan.slug,
            priceMonthly: entitlement.plan.priceMonthly,
            priceYearly: entitlement.plan.priceYearly,
            maxUsers: entitlement.plan.maxUsers,
            maxStorage: entitlement.plan.maxStorage,
            features: entitlement.plan.features.map((f) => ({
                id: f.id,
                featureKey: f.featureKey,
                enabled: f.enabled,
                limit: f.limit,
            })),
        },
    };

    // Cache the result
    setCache(cacheKey, data, CACHE_TTL);

    return data;
}

/**
 * Check if tenant has access to a specific feature.
 * Returns false if feature is not enabled or tenant has no entitlement.
 */
export async function hasFeature(
    tenantId: string,
    featureKey: FeatureKey | string
): Promise<boolean> {
    const entitlement = await getEntitlement(tenantId);

    if (!entitlement) {
        // No entitlement = no features (shouldn't happen for existing tenants)
        return false;
    }

    // Check if entitlement is active or in trial
    if (
        entitlement.status !== ENTITLEMENT_STATUS.ACTIVE &&
        entitlement.status !== ENTITLEMENT_STATUS.TRIAL
    ) {
        // Check grace period for suspended
        if (entitlement.status === ENTITLEMENT_STATUS.SUSPENDED) {
            // Allow read-only access during grace period
            return false;
        }
        return false;
    }

    // Check trial expiry
    if (entitlement.status === ENTITLEMENT_STATUS.TRIAL && entitlement.trialEndsAt) {
        if (new Date() > entitlement.trialEndsAt) {
            return false;
        }
    }

    // Find the feature
    const feature = entitlement.plan.features.find((f) => f.featureKey === featureKey);

    return feature?.enabled ?? false;
}

/**
 * Check usage limit for a specific feature.
 * Returns allowed status, current usage, and limit.
 */
export async function checkLimit(
    tenantId: string,
    featureKey: FeatureKey | string
): Promise<LimitCheckResult> {
    const entitlement = await getEntitlement(tenantId);

    if (!entitlement) {
        return { allowed: false, current: 0, limit: null, percentage: 0 };
    }

    // Find the feature
    const feature = entitlement.plan.features.find((f) => f.featureKey === featureKey);

    if (!feature || !feature.enabled) {
        return { allowed: false, current: 0, limit: null, percentage: 0 };
    }

    // No limit = unlimited
    if (feature.limit === null) {
        return { allowed: true, current: 0, limit: null, percentage: 0 };
    }

    // Get current period usage
    const currentPeriod = getCurrentPeriod();
    const usage = await prisma.usageRecord.findUnique({
        where: {
            tenantId_featureKey_period: {
                tenantId,
                featureKey,
                period: currentPeriod,
            },
        },
    });

    const current = usage?.count ?? 0;
    const percentage = feature.limit > 0 ? (current / feature.limit) * 100 : 0;

    return {
        allowed: current < feature.limit,
        current,
        limit: feature.limit,
        percentage: Math.min(percentage, 100),
    };
}

/**
 * Track usage for a specific feature.
 * Increments the usage count for the current period.
 */
export async function trackUsage(
    tenantId: string,
    featureKey: FeatureKey | string,
    count: number = 1
): Promise<void> {
    const currentPeriod = getCurrentPeriod();

    await prisma.usageRecord.upsert({
        where: {
            tenantId_featureKey_period: {
                tenantId,
                featureKey,
                period: currentPeriod,
            },
        },
        update: {
            count: { increment: count },
        },
        create: {
            tenantId,
            featureKey,
            count,
            period: currentPeriod,
        },
    });

    // Invalidate usage cache
    const usageCacheKey = getUsageCacheKey(tenantId, featureKey, currentPeriod);
    memoryCache.delete(usageCacheKey);
}

/**
 * Get usage statistics for a tenant.
 * Returns usage for all features in the given period.
 */
export async function getUsageStats(
    tenantId: string,
    period?: string
): Promise<UsageStats> {
    const targetPeriod = period || getCurrentPeriod();

    // Get entitlement for limits
    const entitlement = await getEntitlement(tenantId);
    const featureLimits = new Map<string, number | null>();
    const featureEnabled = new Map<string, boolean>();

    if (entitlement) {
        for (const f of entitlement.plan.features) {
            featureLimits.set(f.featureKey, f.limit);
            featureEnabled.set(f.featureKey, f.enabled);
        }
    }

    // Get usage records
    const usageRecords = await prisma.usageRecord.findMany({
        where: {
            tenantId,
            period: targetPeriod,
        },
    });

    const features: Record<
        string,
        { current: number; limit: number | null; percentage: number }
    > = {};

    let totalUsage = 0;

    // Build usage stats for all enabled features
    for (const [featureKey, limit] of featureLimits) {
        if (featureEnabled.get(featureKey)) {
            const record = usageRecords.find((r) => r.featureKey === featureKey);
            const current = record?.count ?? 0;
            const percentage = limit !== null && limit > 0 ? (current / limit) * 100 : 0;

            features[featureKey] = {
                current,
                limit,
                percentage: Math.min(percentage, 100),
            };
            totalUsage += current;
        }
    }

    return {
        tenantId,
        period: targetPeriod,
        features,
        totalUsage,
    };
}

/**
 * Ensure tenant has an entitlement record.
 * Creates one with Free plan if missing (for existing tenants).
 */
export async function ensureEntitlement(tenantId: string): Promise<EntitlementData> {
    const existing = await getEntitlement(tenantId);
    if (existing) {
        return existing;
    }

    // Get or create Free plan
    let freePlan = await prisma.plan.findUnique({
        where: { slug: 'free' },
        include: { features: true },
    });

    if (!freePlan) {
        // Create Free plan from defaults
        const freePlanDef = DEFAULT_PLANS.find((p) => p.slug === 'free');
        if (!freePlanDef) {
            throw new Error('Free plan definition not found');
        }

        freePlan = await prisma.plan.create({
            data: {
                name: freePlanDef.name,
                slug: freePlanDef.slug,
                description: freePlanDef.description,
                priceMonthly: freePlanDef.priceMonthly,
                priceYearly: freePlanDef.priceYearly,
                maxUsers: freePlanDef.maxUsers,
                maxStorage: freePlanDef.maxStorage,
                sortOrder: freePlanDef.sortOrder,
                features: {
                    create: freePlanDef.features.map((f) => ({
                        featureKey: f.featureKey,
                        enabled: f.enabled,
                        limit: f.limit,
                    })),
                },
            },
            include: { features: true },
        });
    }

    // Create entitlement for tenant
    const now = new Date();
    const trialEnds = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const entitlement = await prisma.tenantEntitlement.create({
        data: {
            tenantId,
            planId: freePlan.id,
            billingCycle: 'monthly',
            status: ENTITLEMENT_STATUS.TRIAL,
            trialEndsAt: trialEnds,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
        },
        include: {
            plan: {
                include: {
                    features: true,
                },
            },
        },
    });

    // Invalidate cache
    invalidateCache(tenantId);

    return {
        id: entitlement.id,
        tenantId: entitlement.tenantId,
        planId: entitlement.planId,
        billingCycle: entitlement.billingCycle,
        status: entitlement.status,
        trialEndsAt: entitlement.trialEndsAt,
        currentPeriodStart: entitlement.currentPeriodStart,
        currentPeriodEnd: entitlement.currentPeriodEnd,
        plan: {
            id: entitlement.plan.id,
            name: entitlement.plan.name,
            slug: entitlement.plan.slug,
            priceMonthly: entitlement.plan.priceMonthly,
            priceYearly: entitlement.plan.priceYearly,
            maxUsers: entitlement.plan.maxUsers,
            maxStorage: entitlement.plan.maxStorage,
            features: entitlement.plan.features.map((f) => ({
                id: f.id,
                featureKey: f.featureKey,
                enabled: f.enabled,
                limit: f.limit,
            })),
        },
    };
}

/**
 * Change tenant's plan.
 */
export async function changePlan(
    tenantId: string,
    planSlug: string,
    billingCycle: string = 'monthly'
): Promise<EntitlementData> {
    const plan = await prisma.plan.findUnique({
        where: { slug: planSlug },
    });

    if (!plan) {
        throw new Error(`Plan "${planSlug}" not found`);
    }

    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const entitlement = await prisma.tenantEntitlement.upsert({
        where: { tenantId },
        update: {
            planId: plan.id,
            billingCycle,
            status: ENTITLEMENT_STATUS.ACTIVE,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
        },
        create: {
            tenantId,
            planId: plan.id,
            billingCycle,
            status: ENTITLEMENT_STATUS.ACTIVE,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
        },
        include: {
            plan: {
                include: {
                    features: true,
                },
            },
        },
    });

    // Invalidate cache
    invalidateCache(tenantId);

    return {
        id: entitlement.id,
        tenantId: entitlement.tenantId,
        planId: entitlement.planId,
        billingCycle: entitlement.billingCycle,
        status: entitlement.status,
        trialEndsAt: entitlement.trialEndsAt,
        currentPeriodStart: entitlement.currentPeriodStart,
        currentPeriodEnd: entitlement.currentPeriodEnd,
        plan: {
            id: entitlement.plan.id,
            name: entitlement.plan.name,
            slug: entitlement.plan.slug,
            priceMonthly: entitlement.plan.priceMonthly,
            priceYearly: entitlement.plan.priceYearly,
            maxUsers: entitlement.plan.maxUsers,
            maxStorage: entitlement.plan.maxStorage,
            features: entitlement.plan.features.map((f) => ({
                id: f.id,
                featureKey: f.featureKey,
                enabled: f.enabled,
                limit: f.limit,
            })),
        },
    };
}

/**
 * Invalidate entitlement cache for a tenant.
 */
export function invalidateEntitlementCache(tenantId: string): void {
    invalidateCache(tenantId);
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Get current period string in YYYY-MM format.
 */
function getCurrentPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
