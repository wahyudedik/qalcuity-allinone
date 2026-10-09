import { cleanupErrorLogs } from './error-log-reader';
import type { CronTaskResult } from './cron-scheduler';
import { logger } from './logger';

// ─── Error Log Cleanup Cron Handler ──────────────────────────────────────────
// Deletes expired JSONL error log files based on ERROR_LOG_RETENTION_DAYS
// (default 30 days, clamped 1–365, Asia/Jakarta timezone).
// Registered in the unified cron dispatcher as task `error-log-cleanup`
// (daily 03:00 WIB) and also exposed via GET /api/cron/error-log-cleanup.

export async function runErrorLogCleanup(): Promise<CronTaskResult> {
    const result = await cleanupErrorLogs();
    const message = `Deleted ${result.deletedFiles.length} expired log file(s), kept ${result.keptFiles} (${result.freedBytes} bytes freed)`;

    if (result.deletedFiles.length > 0) {
        logger.info(`[ErrorLogCleanup] ${message}`, {
            deletedFiles: result.deletedFiles,
            freedBytes: result.freedBytes,
        });
    } else {
        logger.info(`[ErrorLogCleanup] ${message}`);
    }

    return {
        success: true,
        message,
        data: {
            deletedCount: result.deletedFiles.length,
            keptFiles: result.keptFiles,
            freedBytes: result.freedBytes,
            deletedFiles: result.deletedFiles,
        },
    };
}
