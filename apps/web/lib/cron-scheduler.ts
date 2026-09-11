// ─── Unified Cron Scheduler ──────────────────────────────────────────────────
// Laravel-style scheduler: 1 cron entry → dispatcher checks each task's schedule.
// All times in UTC. WIB = UTC+7 conversion done at config level.
//
// Usage:
//   - aaPanel: single cron entry every 5-10 minutes
//   - GET /api/cron/run → dispatcher runs all due tasks
//   - GET /api/cron/run?task=payment-reminder → run specific task

import { prisma } from '@/lib/db';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CronTaskResult {
    success: boolean;
    message: string;
    data?: Record<string, unknown>;
}

export interface CronTaskSchedule {
    type: 'daily' | 'hourly' | 'interval';
    /** Hour in UTC (0-23). Used for 'daily' schedule. */
    hour?: number;
    /** Minute in UTC (0-59). Used for 'daily' schedule. */
    minute?: number;
    /** Interval in hours. Used for 'interval' schedule. */
    intervalHours?: number;
}

export interface CronTask {
    id: string;
    name: string;
    schedule: CronTaskSchedule;
    handler: () => Promise<CronTaskResult>;
    enabled: boolean;
}

export interface CronTaskStatus {
    id: string;
    name: string;
    schedule: CronTaskSchedule;
    enabled: boolean;
    lastRunAt: Date | null;
    lastRunStatus: string | null;
    lastRunMessage: string | null;
    nextRunAt: Date | null;
}

// ─── In-memory last-run tracker (backup for DB) ─────────────────────────────

const lastRunMap = new Map<string, { at: Date; status: string; message: string }>();

// ─── Schedule Logic ──────────────────────────────────────────────────────────

/**
 * Check if a task should run based on its schedule config and last run time.
 *
 * For 'daily' tasks: runs once per day at the specified UTC hour/minute.
 * For 'hourly' tasks: runs once per hour at the specified minute.
 * For 'interval' tasks: runs every N hours since last run.
 */
export function shouldRun(task: CronTask, lastRunAt: Date | null): boolean {
    const now = new Date();
    const schedule = task.schedule;

    if (!lastRunAt) {
        // Never run before → always run
        return true;
    }

    const timeSinceLastRun = now.getTime() - lastRunAt.getTime();
    const ONE_MINUTE_MS = 60 * 1000;

    switch (schedule.type) {
        case 'daily': {
            const hour = schedule.hour ?? 0;
            const minute = schedule.minute ?? 0;

            // Calculate today's scheduled run time in UTC
            const scheduledToday = new Date(now);
            scheduledToday.setUTCHours(hour, minute, 0, 0);

            // Calculate yesterday's scheduled run time
            const scheduledYesterday = new Date(scheduledToday);
            scheduledYesterday.setUTCDate(scheduledYesterday.getUTCDate() - 1);

            // Run if:
            // 1. Today's scheduled time has passed AND last run was before today's scheduled time
            //    OR last run was before yesterday's scheduled time (missed run)
            if (now.getTime() >= scheduledToday.getTime()) {
                if (lastRunAt.getTime() < scheduledToday.getTime()) {
                    return true;
                }
            }

            // Also handle edge case: if we're within 1 minute of scheduled time
            const diffToScheduled = Math.abs(now.getTime() - scheduledToday.getTime());
            if (diffToScheduled <= ONE_MINUTE_MS && lastRunAt.getTime() < scheduledToday.getTime()) {
                return true;
            }

            return false;
        }

        case 'hourly': {
            const minute = schedule.minute ?? 0;
            const scheduledThisHour = new Date(now);
            scheduledThisHour.setUTCMinutes(minute, 0, 0);

            if (now.getTime() >= scheduledThisHour.getTime()) {
                if (lastRunAt.getTime() < scheduledThisHour.getTime()) {
                    return true;
                }
            }
            return false;
        }

        case 'interval': {
            const intervalMs = (schedule.intervalHours ?? 1) * 60 * 60 * 1000;
            return timeSinceLastRun >= intervalMs;
        }

        default:
            return false;
    }
}

/**
 * Calculate the next run time for a task based on its schedule.
 */
export function getNextRunTime(schedule: CronTaskSchedule, lastRunAt: Date | null): Date {
    const now = new Date();

    switch (schedule.type) {
        case 'daily': {
            const hour = schedule.hour ?? 0;
            const minute = schedule.minute ?? 0;

            const next = new Date(now);
            next.setUTCHours(hour, minute, 0, 0);

            // If today's time has passed, schedule for tomorrow
            if (next.getTime() <= now.getTime()) {
                next.setUTCDate(next.getUTCDate() + 1);
            }
            return next;
        }

        case 'hourly': {
            const minute = schedule.minute ?? 0;
            const next = new Date(now);
            next.setUTCMinutes(minute, 0, 0);

            if (next.getTime() <= now.getTime()) {
                next.setUTCHours(next.getUTCHours() + 1);
            }
            return next;
        }

        case 'interval': {
            if (!lastRunAt) return now;
            const intervalMs = (schedule.intervalHours ?? 1) * 60 * 60 * 1000;
            return new Date(lastRunAt.getTime() + intervalMs);
        }

        default:
            return now;
    }
}

// ─── Task Registry ───────────────────────────────────────────────────────────

// Lazy-loaded task registry to avoid circular imports.
// Tasks are registered after handler functions are imported.
let registeredTasks: CronTask[] = [];

/**
 * Register tasks with the scheduler. Called once during initialization.
 */
export function registerTasks(tasks: CronTask[]): void {
    registeredTasks = tasks;
}

/**
 * Get all registered tasks.
 */
export function getScheduledTasks(): CronTask[] {
    return registeredTasks;
}

/**
 * Find a task by its ID.
 */
export function getTaskById(id: string): CronTask | undefined {
    return registeredTasks.find((t) => t.id === id);
}

// ─── Last Run Tracking ───────────────────────────────────────────────────────

/**
 * Get the last run info for a task. Checks in-memory first, then DB.
 */
export async function getLastRunInfo(
    taskId: string
): Promise<{ at: Date | null; status: string | null; message: string | null }> {
    // Check in-memory first
    const memEntry = lastRunMap.get(taskId);
    if (memEntry) {
        return { at: memEntry.at, status: memEntry.status, message: memEntry.message };
    }

    // Check DB
    try {
        const lastLog = await prisma.cronRunLog.findFirst({
            where: { taskId },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true, status: true, message: true },
        });

        if (lastLog) {
            return { at: lastLog.createdAt, status: lastLog.status, message: lastLog.message };
        }
    } catch {
        // Table might not exist yet — that's OK
    }

    return { at: null, status: null, message: null };
}

/**
 * Update the last run info for a task (both in-memory and DB).
 */
export async function updateLastRun(
    taskId: string,
    status: string,
    message: string,
    duration: number | null = null
): Promise<void> {
    const now = new Date();

    // Update in-memory
    lastRunMap.set(taskId, { at: now, status, message });

    // Update DB (best-effort)
    try {
        await prisma.cronRunLog.create({
            data: {
                taskId,
                status,
                message,
                duration,
            },
        });
    } catch {
        // Table might not exist yet — log but don't fail
        console.warn(`[Scheduler] Failed to log CronRunLog for task ${taskId}`);
    }
}

// ─── Status API ──────────────────────────────────────────────────────────────

/**
 * Get status of all registered tasks (for monitoring/debugging).
 */
export async function getSchedulerStatus(): Promise<CronTaskStatus[]> {
    const statuses: CronTaskStatus[] = [];

    for (const task of registeredTasks) {
        const lastRun = await getLastRunInfo(task.id);
        const nextRun = getNextRunTime(task.schedule, lastRun.at);

        statuses.push({
            id: task.id,
            name: task.name,
            schedule: task.schedule,
            enabled: task.enabled,
            lastRunAt: lastRun.at,
            lastRunStatus: lastRun.status,
            lastRunMessage: lastRun.message,
            nextRunAt: nextRun,
        });
    }

    return statuses;
}
