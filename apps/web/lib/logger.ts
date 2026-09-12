/**
 * Structured Logger — Drop-in replacement for console.log/warn/error.
 *
 * Features:
 *   - JSON-structured output for production log aggregation
 *   - Log level filtering via LOG_LEVEL env var (debug, info, warn, error)
 *   - Safe for both server (Node.js) and client (browser) environments
 *   - Timestamps in ISO 8601 format
 *
 * Environment Variables:
 *   - LOG_LEVEL — Minimum log level to output (default: 'info')
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('Server started', { port: 3000 });
 *   logger.error('Connection failed', error, { host: 'localhost' });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_MAP: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

/**
 * Safely read LOG_LEVEL from environment.
 * Works in both Node.js (process.env) and browser (undefined) contexts.
 */
function getLogLevel(): number {
    try {
        // eslint-disable-next-line no-restricted-properties
        const envLevel = typeof process !== 'undefined' && process.env?.LOG_LEVEL;
        return LOG_LEVEL_MAP[(envLevel as LogLevel) ?? 'info'] ?? LOG_LEVEL_MAP.info;
    } catch {
        return LOG_LEVEL_MAP.info;
    }
}

const currentLevel = getLogLevel();

/**
 * Serialize an error into a safe, structured object.
 * Handles Error instances, unknown values, and nested errors.
 */
function serializeError(error: Error | unknown): Record<string, unknown> | unknown {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            ...(error.stack ? { stack: error.stack } : {}),
        };
    }
    return error;
}

/**
 * Structured logger with level filtering and JSON output.
 *
 * In production, logs are output as single-line JSON objects suitable for
 * log aggregation services (CloudWatch, Datadog, ELK, etc.).
 *
 * In development, logs are still JSON but can be pretty-printed by devtools.
 */
export const logger = {
    /**
     * Debug-level log. Only emitted when LOG_LEVEL=debug.
     * Use for verbose diagnostic information.
     */
    debug(message: string, data?: Record<string, unknown>): void {
        if (currentLevel <= LOG_LEVEL_MAP.debug) {
            console.log(
                JSON.stringify({
                    level: 'debug',
                    message,
                    ...data,
                    timestamp: new Date().toISOString(),
                })
            );
        }
    },

    /**
     * Info-level log. Emitted when LOG_LEVEL is debug or info (default).
     * Use for normal operational events.
     */
    info(message: string, data?: Record<string, unknown>): void {
        if (currentLevel <= LOG_LEVEL_MAP.info) {
            console.log(
                JSON.stringify({
                    level: 'info',
                    message,
                    ...data,
                    timestamp: new Date().toISOString(),
                })
            );
        }
    },

    /**
     * Warning-level log. Emitted when LOG_LEVEL is debug, info, or warn.
     * Use for unexpected but non-fatal situations.
     */
    warn(message: string, data?: Record<string, unknown>): void {
        if (currentLevel <= LOG_LEVEL_MAP.warn) {
            console.warn(
                JSON.stringify({
                    level: 'warn',
                    message,
                    ...data,
                    timestamp: new Date().toISOString(),
                })
            );
        }
    },

    /**
     * Error-level log. Always emitted (unless LOG_LEVEL is beyond error).
     * Use for failures that need attention.
     */
    error(
        message: string,
        error?: Error | unknown,
        data?: Record<string, unknown>
    ): void {
        if (currentLevel <= LOG_LEVEL_MAP.error) {
            console.error(
                JSON.stringify({
                    level: 'error',
                    message,
                    ...(error !== undefined ? { error: serializeError(error) } : {}),
                    ...data,
                    timestamp: new Date().toISOString(),
                })
            );
        }
    },
};
