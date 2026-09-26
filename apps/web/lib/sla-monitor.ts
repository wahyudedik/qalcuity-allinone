/**
 * @qalcuity/web — SLA Monitor
 *
 * SLA color-coded monitoring, dashboard aggregation, and overdue escalation.
 * Provides real-time SLA status with visual indicators:
 *   - green:  >25% time remaining
 *   - yellow: 10-25% time remaining
 *   - red:    <10% time remaining
 *   - breached: overdue (past deadline)
 *
 * Phase 4 — UCE SLA Enhancement
 */

import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export type SLAColor = 'green' | 'yellow' | 'red' | 'breached';

export interface SLAColorResult {
    color: SLAColor;
    /** Percentage of time remaining (0 = breached, 100 = just started) */
    percentRemaining: number;
    /** Hours remaining (negative = breached by this many hours) */
    hoursRemaining: number;
    /** Human-readable status label */
    label: string;
}

export interface SLATrackerWithColor {
    id: string;
    tenantId: string;
    entityType: string;
    entityId: string;
    stage: string;
    targetHours: number;
    startedAt: Date;
    deadline: Date;
    completedAt: Date | null;
    status: string;
    escalatedTo: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    /** Color-coded SLA status */
    sla: SLAColorResult;
}

export interface SLADashboardSummary {
    /** Total active SLA trackers */
    totalActive: number;
    /** Count by color */
    byColor: {
        green: number;
        yellow: number;
        red: number;
        breached: number;
    };
    /** Count by entity type */
    byEntityType: Array<{
        entityType: string;
        count: number;
        breached: number;
        avgPercentRemaining: number;
    }>;
    /** Recent breaches (last 7 days) */
    recentBreaches: number;
    /** SLA compliance rate (met / total completed) */
    complianceRate: number;
    /** Trackers with color coding */
    trackers: SLATrackerWithColor[];
}

// ─── Color Coding Engine ───────────────────────────────────────────────────

/**
 * Determine the SLA color based on deadline and completion status.
 *
 * Color thresholds:
 *   - green:  >25% of total time remaining
 *   - yellow: 10-25% of total time remaining
 *   - red:    <10% of total time remaining
 *   - breached: past deadline and not completed
 *
 * @param deadline - SLA deadline
 * @param completedAt - When the SLA was completed (null if still active)
 * @param startedAt - When the SLA started
 * @returns SLA color result with details
 */
export function getSLAColor(
    deadline: Date,
    completedAt: Date | null | undefined,
    startedAt: Date
): SLAColorResult {
    const now = new Date();

    // If completed, always green (SLA was met)
    if (completedAt) {
        if (completedAt <= deadline) {
            return {
                color: 'green',
                percentRemaining: 100,
                hoursRemaining: (deadline.getTime() - completedAt.getTime()) / (1000 * 60 * 60),
                label: 'Completed on time',
            };
        }
        // Completed but after deadline
        return {
            color: 'breached',
            percentRemaining: 0,
            hoursRemaining: (deadline.getTime() - completedAt.getTime()) / (1000 * 60 * 60),
            label: 'Completed late',
        };
    }

    // Calculate total SLA duration and remaining time
    const totalMs = deadline.getTime() - startedAt.getTime();
    const remainingMs = deadline.getTime() - now.getTime();
    const totalHours = totalMs / (1000 * 60 * 60);
    const hoursRemaining = remainingMs / (1000 * 60 * 60);

    // Breached
    if (remainingMs <= 0) {
        return {
            color: 'breached',
            percentRemaining: 0,
            hoursRemaining,
            label: `Overdue by ${Math.abs(hoursRemaining).toFixed(1)} hours`,
        };
    }

    // Calculate percentage remaining
    const percentRemaining = totalMs > 0 ? (remainingMs / totalMs) * 100 : 0;

    if (percentRemaining > 25) {
        return {
            color: 'green',
            percentRemaining: Math.round(percentRemaining),
            hoursRemaining: Math.round(hoursRemaining * 10) / 10,
            label: `${Math.round(percentRemaining)}% time remaining`,
        };
    }

    if (percentRemaining > 10) {
        return {
            color: 'yellow',
            percentRemaining: Math.round(percentRemaining),
            hoursRemaining: Math.round(hoursRemaining * 10) / 10,
            label: `${Math.round(percentRemaining)}% time remaining — attention needed`,
        };
    }

    return {
        color: 'red',
        percentRemaining: Math.round(percentRemaining),
        hoursRemaining: Math.round(hoursRemaining * 10) / 10,
        label: `${Math.round(percentRemaining)}% time remaining — urgent`,
    };
}

// ─── Dashboard Functions ───────────────────────────────────────────────────

/**
 * Get SLA dashboard data for a tenant.
 * Returns all active SLA trackers with color coding and summary statistics.
 *
 * @param tenantId - Tenant ID
 * @returns SLA dashboard summary
 */
export async function getSLADashboard(tenantId: string): Promise<SLADashboardSummary> {
    // Get all active SLA trackers
    const activeTrackers = await prisma.sLATracker.findMany({
        where: {
            tenantId,
            status: 'active',
        },
        orderBy: { deadline: 'asc' },
    });

    // Get completed trackers from last 30 days for compliance rate
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const completedTrackers = await prisma.sLATracker.findMany({
        where: {
            tenantId,
            status: { in: ['met', 'breached'] },
            updatedAt: { gte: thirtyDaysAgo },
        },
    });

    // Get recent breaches (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentBreaches = await prisma.sLATracker.count({
        where: {
            tenantId,
            status: 'breached',
            updatedAt: { gte: sevenDaysAgo },
        },
    });

    // Apply color coding to active trackers
    const trackersWithColor: SLATrackerWithColor[] = activeTrackers.map((tracker) => {
        const sla = getSLAColor(tracker.deadline, tracker.completedAt, tracker.startedAt);
        return {
            ...tracker,
            sla,
        };
    });

    // Aggregate by color
    const byColor = {
        green: 0,
        yellow: 0,
        red: 0,
        breached: 0,
    };

    for (const tracker of trackersWithColor) {
        byColor[tracker.sla.color]++;
    }

    // Aggregate by entity type
    const entityTypeMap = new Map<string, { count: number; breached: number; totalPercent: number }>();
    for (const tracker of trackersWithColor) {
        const existing = entityTypeMap.get(tracker.entityType) || { count: 0, breached: 0, totalPercent: 0 };
        existing.count++;
        if (tracker.sla.color === 'breached') existing.breached++;
        existing.totalPercent += tracker.sla.percentRemaining;
        entityTypeMap.set(tracker.entityType, existing);
    }

    const byEntityType = Array.from(entityTypeMap.entries()).map(([entityType, data]) => ({
        entityType,
        count: data.count,
        breached: data.breached,
        avgPercentRemaining: data.count > 0 ? Math.round(data.totalPercent / data.count) : 0,
    }));

    // Calculate compliance rate
    const metCount = completedTrackers.filter((t) => t.status === 'met').length;
    const totalCompleted = completedTrackers.length;
    const complianceRate = totalCompleted > 0 ? Math.round((metCount / totalCompleted) * 100) : 100;

    return {
        totalActive: activeTrackers.length,
        byColor,
        byEntityType,
        recentBreaches,
        complianceRate,
        trackers: trackersWithColor,
    };
}

/**
 * Find breached SLA trackers and escalate them.
 * Updates status to 'breached' and logs the breach.
 *
 * @param tenantId - Tenant ID
 * @returns Number of trackers escalated
 */
export async function escalateOverdueSLAs(tenantId: string): Promise<number> {
    const now = new Date();

    // Find active trackers that have passed their deadline
    const breachedTrackers = await prisma.sLATracker.findMany({
        where: {
            tenantId,
            status: 'active',
            deadline: { lt: now },
        },
    });

    let escalatedCount = 0;

    for (const tracker of breachedTrackers) {
        try {
            await prisma.sLATracker.update({
                where: { id: tracker.id },
                data: {
                    status: 'breached',
                    notes: `SLA breached at ${now.toISOString()}. Deadline was ${tracker.deadline.toISOString()}.`,
                },
            });

            // Log audit trail
            await logAudit({
                userId: 'system',
                tenantId,
                action: 'UPDATE',
                entity: 'SLATracker',
                entityId: tracker.id,
                oldValues: { status: 'active' },
                newValues: {
                    status: 'breached',
                    breachedAt: now.toISOString(),
                    entityType: tracker.entityType,
                    entityId: tracker.entityId,
                    stage: tracker.stage,
                },
            });

            escalatedCount++;
        } catch (error) {
            logger.error('Failed to escalate SLA tracker', {
                tenantId,
                trackerId: tracker.id,
                error,
            });
        }
    }

    if (escalatedCount > 0) {
        logger.info('Escalated breached SLA trackers', {
            tenantId,
            count: escalatedCount,
        });
    }

    return escalatedCount;
}

/**
 * Get SLA status for a specific entity.
 *
 * @param tenantId - Tenant ID
 * @param entityType - Entity type
 * @param entityId - Entity ID
 * @returns SLA tracker with color coding, or null if no SLA
 */
export async function getEntitySLAStatus(
    tenantId: string,
    entityType: string,
    entityId: string
): Promise<SLATrackerWithColor | null> {
    const tracker = await prisma.sLATracker.findFirst({
        where: {
            tenantId,
            entityType,
            entityId,
            status: 'active',
        },
        orderBy: { createdAt: 'desc' },
    });

    if (!tracker) return null;

    const sla = getSLAColor(tracker.deadline, tracker.completedAt, tracker.startedAt);

    return {
        ...tracker,
        sla,
    };
}

/**
 * Complete an SLA tracker (mark as met or breached based on deadline).
 *
 * @param tenantId - Tenant ID
 * @param trackerId - SLA Tracker ID
 * @returns Updated tracker with color, or null if not found
 */
export async function completeSLATracker(
    tenantId: string,
    trackerId: string
): Promise<SLATrackerWithColor | null> {
    const tracker = await prisma.sLATracker.findFirst({
        where: {
            id: trackerId,
            tenantId,
        },
    });

    if (!tracker) return null;

    const now = new Date();
    const newStatus = now <= tracker.deadline ? 'met' : 'breached';

    const updated = await prisma.sLATracker.update({
        where: { id: trackerId },
        data: {
            completedAt: now,
            status: newStatus,
        },
    });

    const sla = getSLAColor(updated.deadline, updated.completedAt, updated.startedAt);

    return {
        ...updated,
        sla,
    };
}

/**
 * Get SLA color summary counts for a set of trackers.
 * Useful for badge indicators in the UI.
 *
 * @param tenantId - Tenant ID
 * @param entityType - Optional entity type filter
 * @returns Color counts
 */
export async function getSLAColorSummary(
    tenantId: string,
    entityType?: string
): Promise<{ green: number; yellow: number; red: number; breached: number; total: number }> {
    const where: Record<string, unknown> = {
        tenantId,
        status: 'active',
    };
    if (entityType) {
        where.entityType = entityType;
    }

    const trackers = await prisma.sLATracker.findMany({ where });

    const summary = { green: 0, yellow: 0, red: 0, breached: 0, total: trackers.length };

    for (const tracker of trackers) {
        const { color } = getSLAColor(tracker.deadline, tracker.completedAt, tracker.startedAt);
        summary[color]++;
    }

    return summary;
}
