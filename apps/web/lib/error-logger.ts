/**
 * Error Logger — Structured error logging ke file JSONL (server-only).
 *
 * Mengapa file-based (bukan database)?
 *   schema.prisma masuk Do-Not-Touch (AGENT.md Rule 5) — keputusan arsitektur:
 *   persist error log sebagai JSONL harian di `apps/web/.logs/errors/errors-YYYY-MM-DD.jsonl`.
 *   Zero migration, standard practice (Next.js/Laravel juga pakai file logs),
 *   dan tidak pernah gagal karena DB down (justru saat DB error kita tetap perlu log).
 *
 * ⛔ SERVER-ONLY — modul ini meng-import `fs`. JANGAN PERNAH di-import dari
 *    client component / browser bundle. Aman dipakai di route handlers,
 *    server components, cron jobs, dan instrumentation hook.
 *
 * Environment Variables:
 *   - ERROR_LOG_DISABLED='true' — skip tulis file (tetap return entry + mirror console)
 *   - ERROR_LOG_DIR             — override direktori log (untuk test; default: <cwd>/.logs/errors)
 *   - VITEST                    — otomatis diset vitest; skip tulis file kecuali
 *                                 ERROR_LOG_DIR di-set eksplisit oleh test
 *
 * Usage (route handler):
 *   catch (e) {
 *       return handleApiError(e, { route: '/api/finance/invoices', method: 'POST', tenantId, userId });
 *   }
 *
 * Usage (process-level, via instrumentation.ts):
 *   process.on('uncaughtException', (err) => logProcessError('uncaughtException', err));
 */

import { createHash, randomUUID } from 'crypto';
import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
// Relative import — diperlukan untuk vitest mock interception (lihat pola audit.test.ts)
import { logger } from './logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Severity level error. `fatal` = process-level crash (uncaughtException). */
export type ErrorLogLevel = 'error' | 'warn' | 'fatal';

/** Asal error — menentukan grouping/tracing di halaman platform. */
export type ErrorLogSource = 'api' | 'route' | 'frontend' | 'cron' | 'process' | 'middleware';

/** Konteks request untuk logging error API (semua field optional / backward compatible). */
export interface ApiErrorContext {
    /** Path route, e.g. '/api/finance/invoices' */
    route?: string;
    /** HTTP method, e.g. 'POST' — digabung dengan route saat logging */
    method?: string;
    /** Tenant pemilik request (tenant isolation tracing) */
    tenantId?: string;
    /** User yang melakukan request */
    userId?: string;
    /** Email user (untuk debugging manual; tidak disimpan di entry utama) */
    userEmail?: string;
}

/** Satu baris error log yang dipersist ke file JSONL. */
export interface ErrorLogEntry {
    /** Random UUID unik per error occurrence */
    id: string;
    /** ISO 8601 timestamp (UTC) */
    timestamp: string;
    level: ErrorLogLevel;
    source: ErrorLogSource;
    /** Error message — truncated maksimal 2000 karakter */
    message: string;
    /** Stack trace — truncated maksimal 8000 karakter */
    stack?: string;
    /** e.g. "POST /api/finance/invoices" (method + route digabung) */
    route?: string;
    statusCode?: number;
    tenantId?: string;
    userId?: string;
    /** e.g. 'INTERNAL_SERVER_ERROR', 'DATABASE_ERROR', 'SERVICE_UNAVAILABLE' */
    errorCode?: string;
    /** Metadata tambahan — SELALU di-sanitize sebelum persist */
    meta?: Record<string, unknown>;
    /** Grouping key: sha1(source|message|route).slice(0,12) — untuk dedup/tracing */
    fingerprint: string;
}

/** Input untuk fungsi utama {@link logError}. */
export interface LogErrorInput {
    level: ErrorLogLevel;
    source: ErrorLogSource;
    message: string;
    stack?: string;
    route?: string;
    statusCode?: number;
    tenantId?: string;
    userId?: string;
    errorCode?: string;
    meta?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maksimal panjang message (dipotong jika lebih). */
export const MAX_MESSAGE_LENGTH = 2000;
/** Maksimal panjang stack trace (dipotong jika lebih). */
export const MAX_STACK_LENGTH = 8000;

/** Key yang mengandung pola ini akan di-redact menjadi '[REDACTED]'. */
const SENSITIVE_KEY_PATTERN = /password|token|secret|authorization|apikey|api_key|cookie|credential/i;
/** Batas kedalaman recursive walk saat sanitize. */
const SANITIZE_MAX_DEPTH = 5;
/** Batas jumlah key yang di-walk saat sanitize. */
const SANITIZE_MAX_KEYS = 50;
/** Default direktori log (server: cwd = apps/web). */
const DEFAULT_LOG_DIR = join(process.cwd(), '.logs', 'errors');

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

/**
 * Deep-sanitize object untuk menghapus sensitive data sebelum persist.
 *
 * - Key yang match `password|token|secret|authorization|apikey|api_key|cookie|credential`
 *   (case-insensitive) diganti value-nya dengan `'[REDACTED]'`.
 * - Walk maksimal depth 5 dan maksimal 50 key (guard terhadap object liar).
 * - Non-object values diteruskan apa adanya.
 */
export function sanitizeErrorData(value: unknown): unknown {
    return sanitizeWalk(value, 0, { count: 0 });
}

function sanitizeWalk(value: unknown, depth: number, counter: { count: number }): unknown {
    if (value === null || typeof value !== 'object') {
        return value;
    }
    if (depth >= SANITIZE_MAX_DEPTH) {
        return '[MAX_DEPTH_EXCEEDED]';
    }
    if (Array.isArray(value)) {
        return value.slice(0, SANITIZE_MAX_KEYS).map((item) => sanitizeWalk(item, depth + 1, counter));
    }
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        if (counter.count >= SANITIZE_MAX_KEYS) {
            result['...'] = '[MAX_KEYS_EXCEEDED]';
            break;
        }
        counter.count += 1;
        result[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : sanitizeWalk(val, depth + 1, counter);
    }
    return result;
}

// ---------------------------------------------------------------------------
// Fingerprint
// ---------------------------------------------------------------------------

/**
 * Hitung fingerprint stabil untuk grouping error serupa.
 *
 * sha1(`${source}|${message}|${route||''}`) dipotong 12 karakter hex.
 * Input sama → fingerprint sama. Salah satu berbeda → fingerprint berbeda.
 */
export function computeFingerprint(source: string, message: string, route?: string): string {
    return createHash('sha1').update(`${source}|${message}|${route || ''}`).digest('hex').slice(0, 12);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(value: string, maxLength: number): string {
    return value.length > maxLength ? value.slice(0, maxLength) : value;
}

/**
 * Tanggal file log dalam timezone Asia/Jakarta (UTC+7, tanpa DST).
 * Offset statis +7 jam — tanpa library eksternal.
 * Format: 'YYYY-MM-DD' (diambil dari ISO string UTC hasil shift offset).
 */
function getJakartaDateString(): string {
    const SHIFT_MS = 7 * 60 * 60 * 1000; // UTC+7 = Asia/Jakarta (no DST)
    return new Date(Date.now() + SHIFT_MS).toISOString().slice(0, 10);
}

function isFileWriteSkipped(): boolean {
    if (process.env.ERROR_LOG_DISABLED === 'true') {
        return true;
    }
    // Di bawah vitest: skip tulis file agar tidak pollute direktori log asli,
    // KECUALI test men-set ERROR_LOG_DIR secara eksplisit (test file-write).
    if (process.env.VITEST && !process.env.ERROR_LOG_DIR) {
        return true;
    }
    return false;
}

// ---------------------------------------------------------------------------
// Main logger
// ---------------------------------------------------------------------------

/**
 * Tulis satu baris JSON (JSONL) ke file error log harian, lalu mirror ke console.
 *
 * File: `<ERROR_LOG_DIR|<cwd>/.logs/errors>/errors-YYYY-MM-DD.jsonl` (timezone Asia/Jakarta).
 * Sifatnya **never-throw**: semua error saat write file ditelan (error logging
 * tidak boleh merusak request yang sedang diproses). Selalu mengembalikan entry
 * yang sudah dibentuk agar bisa di-test/di-inspect meskipun file write disabled.
 */
export function logError(input: LogErrorInput): ErrorLogEntry {
    const message = truncate(input.message, MAX_MESSAGE_LENGTH);
    const stack = input.stack !== undefined ? truncate(input.stack, MAX_STACK_LENGTH) : undefined;
    const fingerprint = computeFingerprint(input.source, message, input.route);

    const entry: ErrorLogEntry = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        level: input.level,
        source: input.source,
        message,
        ...(stack !== undefined ? { stack } : {}),
        ...(input.route !== undefined ? { route: input.route } : {}),
        ...(input.statusCode !== undefined ? { statusCode: input.statusCode } : {}),
        ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
        ...(input.userId !== undefined ? { userId: input.userId } : {}),
        ...(input.errorCode !== undefined ? { errorCode: input.errorCode } : {}),
        ...(input.meta !== undefined ? { meta: sanitizeErrorData(input.meta) as Record<string, unknown> } : {}),
        fingerprint,
    };

    if (!isFileWriteSkipped()) {
        try {
            const dir = process.env.ERROR_LOG_DIR || DEFAULT_LOG_DIR;
            mkdirSync(dir, { recursive: true });
            const filePath = join(dir, `errors-${getJakartaDateString()}.jsonl`);
            appendFileSync(filePath, JSON.stringify(entry) + '\n', 'utf8');
        } catch {
            // Never-throw: error logging tidak boleh melempar exception.
        }
    }

    // Mirror ke console/terminal agar tetap visible di dev server & aaPanel logs.
    logger.error(`[${input.source.toUpperCase()}] ${message}`, undefined, {
        fingerprint,
        source: input.source,
        route: input.route,
        statusCode: input.statusCode,
    });

    return entry;
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Log error dari API route handler (source: 'api').
 *
 * Derive message/stack dari Error instance atau String(error).
 * Context bersifat optional — signature `handleApiError(error)` lama tetap valid.
 *
 * Usage:
 *   logApiError(error, { route: '/api/finance/invoices', method: 'POST', tenantId, statusCode: 500, errorCode: 'DATABASE_ERROR' });
 */
export function logApiError(
    error: unknown,
    ctx?: ApiErrorContext & { statusCode?: number; errorCode?: string; meta?: Record<string, unknown> }
): ErrorLogEntry {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);
    const stack = isError ? error.stack : undefined;
    // Route digabung dengan method: "POST /api/finance/invoices"
    const route = ctx?.method && ctx?.route ? `${ctx.method} ${ctx.route}` : ctx?.route;

    return logError({
        level: 'error',
        source: 'api',
        message,
        ...(stack !== undefined ? { stack } : {}),
        ...(route !== undefined ? { route } : {}),
        ...(ctx?.statusCode !== undefined ? { statusCode: ctx.statusCode } : {}),
        ...(ctx?.tenantId !== undefined ? { tenantId: ctx.tenantId } : {}),
        ...(ctx?.userId !== undefined ? { userId: ctx.userId } : {}),
        ...(ctx?.errorCode !== undefined ? { errorCode: ctx.errorCode } : {}),
        ...(ctx?.meta !== undefined ? { meta: ctx.meta } : {}),
    });
}

/**
 * Log error process-level yang lolos dari semua lapisan (route handlers, cron,
 * background tasks) — dipanggil dari instrumentation.ts handlers:
 *   - uncaughtException → level 'fatal'
 *   - unhandledRejection → level 'error'
 */
export function logProcessError(kind: 'uncaughtException' | 'unhandledRejection', error: unknown): ErrorLogEntry {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);
    const stack = isError ? error.stack : undefined;

    return logError({
        level: kind === 'uncaughtException' ? 'fatal' : 'error',
        source: 'process',
        message: `[${kind}] ${message}`,
        ...(stack !== undefined ? { stack } : {}),
        errorCode: kind.toUpperCase(),
    });
}
