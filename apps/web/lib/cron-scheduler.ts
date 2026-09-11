// ─── Unified Cron Scheduler ──────────────────────────────────────────────────
// Laravel-style scheduler: 1 cron entry → dispatcher checks each task's schedule.
// Schedule calculations use APP_TIMEZONE for accurate local-time scheduling.
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

// ─── Timezone Helpers ────────────────────────────────────────────────────────

/**
 * Get the configured APP_TIMEZONE. Falls back to 'Asia/Jakarta' (WIB).
 */
export function getAppTimezone(): string {
    return process.env.APP_TIMEZONE || 'Asia/Jakarta';
}

/**
 * Get the current hour (0-23) in the configured timezone.
 */
export function getLocalHour(date: Date = new Date()): number {
    const tz = getAppTimezone();
    return parseInt(
        date.toLocaleString('en-US', {
            hour: 'numeric',
            hour12: false,
            timeZone: tz,
        }),
        10
    );
}

/**
 * Get the current minute (0-59) in the configured timezone.
 */
export function getLocalMinute(date: Date = new Date()): number {
    const tz = getAppTimezone();
    return parseInt(
        date.toLocaleString('en-US', {
            minute: 'numeric',
            timeZone: tz,
        }),
        10
    );
}

/**
 * Get the current date components (year, month, day) in the configured timezone.
 */
export function getLocalDateComponents(date: Date = new Date()): {
    year: number;
    month: number;
    day: number;
} {
    const tz = getAppTimezone();
    const parts = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: tz,
    }).formatToParts(date);

    const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
    return { year: get('year'), month: get('month'), day: get('day') };
}

// ─── In-memory last-run tracker (backup for DB) ─────────────────────────────

const lastRunMap = new Map<string, { at: Date; status: string; message: string }>();

// ─── Schedule Logic ──────────────────────────────────────────────────────────

/**
 * Check if a task should run based on its schedule config and last run time.
 *
 * For 'daily' tasks: runs once per day at the specified local hour/minute (via APP_TIMEZONE).
 * For 'hourly' tasks: runs once per hour at the specified minute.
 * For 'interval' tasks: runs every N hours since last run.
 */
export function shouldRun(task: CronTask, lastRunAt: Date | null): boolean {
    const now = new Date();
    const schedule = task.schedule;

    // Get current time in configured timezone
    const currentHour = getLocalHour(now);
    const currentMinute = getLocalMinute(now);

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

            // Compare local hour/minute in configured timezone
            // Run if current local time >= scheduled time AND last run was before scheduled time today
            if (currentHour > hour || (currentHour === hour && currentMinute >= minute)) {
                if (!lastRunAt) return true;

                // Check if last run was before today's scheduled time
                const lastRunHour = getLocalHour(lastRunAt);
                const lastRunMinute = getLocalMinute(lastRunAt);
                const lastRunDate = getLocalDateComponents(lastRunAt);
                const todayDate = getLocalDateComponents(now);

                // If last run was on a different day, definitely run
                if (lastRunDate.year !== todayDate.year ||
                    lastRunDate.month !== todayDate.month ||
                    lastRunDate.day !== todayDate.day) {
                    return true;
                }

                // If last run was before today's scheduled time, run
                if (lastRunHour < hour || (lastRunHour === hour && lastRunMinute < minute)) {
                    return true;
                }
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
 * Uses APP_TIMEZONE for accurate local-time scheduling.
 */
export function getNextRunTime(schedule: CronTaskSchedule, lastRunAt: Date | null): Date {
    const now = new Date();

    switch (schedule.type) {
        case 'daily': {
            const hour = schedule.hour ?? 0;
            const minute = schedule.minute ?? 0;

            // Get current local time components
            const currentHour = getLocalHour(now);
            const currentMinute = getLocalMinute(now);

            // If current local time has not yet reached scheduled time, next run is today
            if (currentHour < hour || (currentHour === hour && currentMinute < minute)) {
                return now; // Will be picked up in the current window
            }
            // Otherwise next run is tomorrow at the scheduled local time
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow;
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
 * Includes timezone information for debugging schedule accuracy.
 */
export async function getSchedulerStatus(): Promise<{
    tasks: CronTaskStatus[];
    timezone: string;
    localTime: string;
    utcTime: string;
}> {
    const tz = getAppTimezone();
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

    return {
        tasks: statuses,
        timezone: tz,
        localTime: new Date().toLocaleString('en-US', { timeZone: tz }),
        utcTime: new Date().toISOString(),
    };
}
