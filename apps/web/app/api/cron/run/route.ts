export const dynamic = 'force-dynamic';

import { verifyCronAuth, cronSuccess, cronError } from '@/lib/cron';
import { handleApiError } from '@/lib/api-error';
import {
    shouldRun,
    getLastRunInfo,
    updateLastRun,
    type CronTask,
} from '@/lib/cron-scheduler';

// ─── Lazy-loaded task registry ───────────────────────────────────────────────
// Import handlers from dedicated handler files in lib/ to avoid circular
// dependency issues and comply with Next.js App Router export rules
// (routes may only export HTTP method handlers like GET, POST, etc.).

let _tasks: CronTask[] | null = null;

function getTasks(): CronTask[] {
    if (_tasks) return _tasks;

    // Lazy import to avoid circular dependencies
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { runPaymentReminder } = require('@/lib/payment-reminder-handler');
    const { runStockAlert } = require('@/lib/stock-alert-handler');
    const { runRecurringInvoice } = require('@/lib/recurring-invoice-handler');
    const { runAnomalyScanCron } = require('@/lib/ai/anomaly-scan-handler');

    _tasks = [
        {
            id: 'payment-reminder',
            name: 'Payment Reminder',
            schedule: { type: 'daily', hour: 1, minute: 0 }, // 08:00 WIB = 01:00 UTC
            handler: runPaymentReminder,
            enabled: true,
        },
        {
            id: 'stock-alert',
            name: 'Stock Alert',
            schedule: { type: 'interval', intervalHours: 6 }, // 4x daily (06:00, 12:00, 18:00, 22:00 WIB)
            handler: runStockAlert,
            enabled: true,
        },
        {
            id: 'recurring-invoice',
            name: 'Recurring Invoice Generation',
            schedule: { type: 'daily', hour: 0, minute: 0 }, // 07:00 WIB = 00:00 UTC
            handler: runRecurringInvoice,
            enabled: true,
        },
        {
            id: 'anomaly-scan',
            name: 'Anomaly Detection Scan',
            schedule: { type: 'daily', hour: 19, minute: 0 }, // 02:00 WIB = 19:00 UTC (previous day)
            handler: runAnomalyScanCron,
            enabled: true,
        },
    ];

    return _tasks;
}

// ─── GET: Unified Cron Dispatcher ────────────────────────────────────────────
// Single endpoint that runs all due cron tasks.
// Query params:
//   ?task=<id>   — Run a specific task only
//   ?task=all     — Run all due tasks (default behavior)
//   ?status       — Return scheduler status without running anything

interface TaskResult {
    id: string;
    name: string;
    status: 'success' | 'error' | 'skipped';
    message: string;
    duration?: number;
}

export async function GET(req: Request) {
    try {
        if (!verifyCronAuth(req)) return cronError('Unauthorized', 401);

        const url = new URL(req.url);
        const taskFilter = url.searchParams.get('task');
        const statusOnly = url.searchParams.has('status');

        const tasks = getTasks();

        // ─── Status mode ──────────────────────────────────────────────
        if (statusOnly) {
            const { getSchedulerStatus } = await import('@/lib/cron-scheduler');
            const statusResult = await getSchedulerStatus();
            return cronSuccess(statusResult);
        }

        // ─── Run mode ────────────────────────────────────────────────
        const results: TaskResult[] = [];
        let ran = 0;
        let skipped = 0;
        let failed = 0;

        for (const task of tasks) {
            // Filter by task ID if specified
            if (taskFilter && taskFilter !== 'all' && task.id !== taskFilter) {
                continue;
            }

            // Check if task is enabled
            if (!task.enabled) {
                results.push({
                    id: task.id,
                    name: task.name,
                    status: 'skipped',
                    message: 'Task is disabled',
                });
                skipped++;
                continue;
            }

            // Check if task should run based on schedule
            const lastRunInfo = await getLastRunInfo(task.id);
            if (!shouldRun(task, lastRunInfo.at)) {
                results.push({
                    id: task.id,
                    name: task.name,
                    status: 'skipped',
                    message: `Not yet due (last run: ${lastRunInfo.at?.toISOString() ?? 'never'})`,
                });
                skipped++;
                continue;
            }

            // Execute the task
            const startTime = Date.now();
            try {
                console.log(`[Scheduler] Running task: ${task.id} (${task.name})`);
                const result = await task.handler();
                const duration = Date.now() - startTime;

                await updateLastRun(task.id, 'success', result.message, duration);
                results.push({
                    id: task.id,
                    name: task.name,
                    status: 'success',
                    message: result.message,
                    duration,
                });
                ran++;

                console.log(`[Scheduler] Task ${task.id} completed in ${duration}ms: ${result.message}`);
            } catch (error) {
                const duration = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                await updateLastRun(task.id, 'error', errorMessage, duration);
                results.push({
                    id: task.id,
                    name: task.name,
                    status: 'error',
                    message: errorMessage,
                    duration,
                });
                failed++;

                console.error(`[Scheduler] Task ${task.id} failed after ${duration}ms:`, error);
            }
        }

        // If a specific task was requested but not found
        if (taskFilter && taskFilter !== 'all' && results.length === 0) {
            return cronError(`Task '${taskFilter}' not found`, 404);
        }

        console.log(`[Scheduler] Dispatch complete: ran=${ran}, skipped=${skipped}, failed=${failed}`);

        return cronSuccess({
            ran,
            skipped,
            failed,
            total: ran + skipped + failed,
            executedAt: new Date().toISOString(),
            results,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
