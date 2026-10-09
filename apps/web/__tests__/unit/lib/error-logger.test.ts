/**
 * Error Logger Unit Tests
 *
 * Tests untuk lib/error-logger.ts (file-based JSONL error logging):
 * - sanitizeErrorData: redact sensitive fields (password/token/authorization, nested)
 * - Truncation: message > 2000 char & stack > 8000 char
 * - computeFingerprint: stabil untuk input sama, beda untuk input beda
 * - logError: menulis 1 baris valid JSON ke file (via ERROR_LOG_DIR override)
 * - logApiError: derive message/stack dari Error instance, source 'api'
 *
 * Logger di-mock agar tidak bocor ke console (pola sama dengan audit.test.ts).
 * File write diarahkan ke direktori temp via process.env.ERROR_LOG_DIR —
 * modul melewati VITEST-guard ketika ERROR_LOG_DIR di-set eksplisit.
 */

import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync, readdirSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Mock logger (relative path — error-logger.ts import './logger' secara relatif)
vi.mock('../../../lib/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock alias '@/lib/logger' juga (dipakai modul lain yang mungkin ikut ter-import)
vi.mock('@/lib/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

import {
    sanitizeErrorData,
    computeFingerprint,
    logError,
    logApiError,
    type ErrorLogEntry,
} from '../../../lib/error-logger';

// ---------------------------------------------------------------------------
// Temp directory setup — semua file write diarahkan ke sini
// ---------------------------------------------------------------------------

let tempDir: string;

beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'error-logger-test-'));
    process.env.ERROR_LOG_DIR = tempDir;
    // Pastikan disabled-guard tidak aktif selama test
    delete process.env.ERROR_LOG_DISABLED;
});

afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.ERROR_LOG_DIR;
    delete process.env.ERROR_LOG_DISABLED;
});

afterAll(() => {
    vi.restoreAllMocks();
});

/** Baca semua baris JSONL di direktori temp, return array parsed entries. */
function readAllLoggedEntries(): ErrorLogEntry[] {
    const files = readdirSync(tempDir).filter((f) => f.endsWith('.jsonl'));
    const entries: ErrorLogEntry[] = [];
    for (const file of files) {
        const content = readFileSync(join(tempDir, file), 'utf8');
        const lines = content.split('\n').filter((line) => line.trim() !== '');
        for (const line of lines) {
            entries.push(JSON.parse(line) as ErrorLogEntry);
        }
    }
    return entries;
}

// ---------------------------------------------------------------------------
// sanitizeErrorData
// ---------------------------------------------------------------------------

describe('error-logger — sanitizeErrorData', () => {
    it('should redact password/token/authorization fields (top-level)', () => {
        const result = sanitizeErrorData({
            password: 'rahasia123',
            token: 'abc-def',
            authorization: 'Bearer xyz',
            username: 'alice',
        }) as Record<string, unknown>;

        expect(result.password).toBe('[REDACTED]');
        expect(result.token).toBe('[REDACTED]');
        expect(result.authorization).toBe('[REDACTED]');
        expect(result.username).toBe('alice'); // field aman tetap utuh
    });

    it('should redact nested sensitive fields (case-insensitive)', () => {
        const result = sanitizeErrorData({
            user: {
                name: 'bob',
                ApiKey: 'key-123',
                // Key 'credentials' sendiri match pola sensitive →
                // SELURUH object value-nya di-redact (fail-safe).
                credentials: { password: 'nested-pass' },
            },
            // Non-sensitive container key → walk ke dalam, redact password-nya.
            context: { password: 'deep-pass', role: 'admin' },
            headers: { Cookie: 'session=abc' },
        }) as {
            user: Record<string, unknown>;
            context: Record<string, unknown>;
            headers: Record<string, unknown>;
        };

        expect(result.user.ApiKey).toBe('[REDACTED]');
        expect(result.user.credentials).toBe('[REDACTED]'); // seluruh object di-redact
        expect(result.user.name).toBe('bob');
        expect(result.context.password).toBe('[REDACTED]'); // redact di kedalaman
        expect(result.context.role).toBe('admin');
        expect(result.headers.Cookie).toBe('[REDACTED]');
    });

    it('should handle non-object values without throwing', () => {
        expect(sanitizeErrorData('just-a-string')).toBe('just-a-string');
        expect(sanitizeErrorData(42)).toBe(42);
        expect(sanitizeErrorData(null)).toBe(null);
        expect(sanitizeErrorData(undefined)).toBe(undefined);
    });

    it('should not mutate the original object', () => {
        const original = { password: 'visible', keep: 'same' };
        sanitizeErrorData(original);
        expect(original.password).toBe('visible');
        expect(original.keep).toBe('same');
    });
});

// ---------------------------------------------------------------------------
// Truncation
// ---------------------------------------------------------------------------

describe('error-logger — truncation', () => {
    it('should truncate message longer than 2000 chars', () => {
        const longMessage = 'x'.repeat(3000);
        const entry = logError({ level: 'error', source: 'api', message: longMessage });
        expect(entry.message.length).toBe(2000);
        expect(entry.message).toBe('x'.repeat(2000));
    });

    it('should truncate stack longer than 8000 chars', () => {
        const longStack = 'y'.repeat(10000);
        const entry = logError({ level: 'error', source: 'route', message: 'boom', stack: longStack });
        expect(entry.stack).toBeDefined();
        expect(entry.stack!.length).toBe(8000);
        expect(entry.stack).toBe('y'.repeat(8000));
    });

    it('should keep short message and stack untouched', () => {
        const entry = logError({
            level: 'warn',
            source: 'cron',
            message: 'short message',
            stack: 'Error: short',
        });
        expect(entry.message).toBe('short message');
        expect(entry.stack).toBe('Error: short');
    });
});

// ---------------------------------------------------------------------------
// computeFingerprint
// ---------------------------------------------------------------------------

describe('error-logger — computeFingerprint', () => {
    it('should be stable for identical inputs', () => {
        const a = computeFingerprint('api', 'Database down', 'POST /api/finance/invoices');
        const b = computeFingerprint('api', 'Database down', 'POST /api/finance/invoices');
        expect(a).toBe(b);
    });

    it('should differ when message differs', () => {
        const a = computeFingerprint('api', 'Database down', 'POST /api/x');
        const b = computeFingerprint('api', 'Cache down', 'POST /api/x');
        expect(a).not.toBe(b);
    });

    it('should differ when source or route differs', () => {
        const base = computeFingerprint('api', 'Boom', '/api/x');
        expect(computeFingerprint('cron', 'Boom', '/api/x')).not.toBe(base);
        expect(computeFingerprint('api', 'Boom', '/api/y')).not.toBe(base);
    });

    it('should return 12-char hex string', () => {
        const fp = computeFingerprint('api', 'Boom', '/api/x');
        expect(fp).toMatch(/^[0-9a-f]{12}$/);
    });

    it('should treat missing route as empty string consistently', () => {
        expect(computeFingerprint('api', 'Boom')).toBe(computeFingerprint('api', 'Boom', ''));
    });
});

// ---------------------------------------------------------------------------
// logError — file write
// ---------------------------------------------------------------------------

describe('error-logger — logError', () => {
    it('should write 1 valid JSONL line with required fields', () => {
        const entry = logError({
            level: 'error',
            source: 'api',
            message: 'Invoice creation failed',
            route: 'POST /api/finance/invoices',
            statusCode: 500,
            errorCode: 'INTERNAL_SERVER_ERROR',
            tenantId: 'tenant-1',
            userId: 'user-1',
            meta: { detail: 'pg timeout' },
        });

        // Return value = entry lengkap
        expect(entry.id).toBeDefined();
        expect(entry.level).toBe('error');
        expect(entry.source).toBe('api');
        expect(entry.fingerprint).toMatch(/^[0-9a-f]{12}$/);
        expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

        // File berisi tepat 1 baris JSON valid dengan field wajib
        const entries = readAllLoggedEntries();
        expect(entries.length).toBe(1);
        const persisted = entries[0];
        expect(persisted.level).toBe('error');
        expect(persisted.source).toBe('api');
        expect(persisted.fingerprint).toBe(entry.fingerprint);
        expect(persisted.timestamp).toBe(entry.timestamp);
        expect(persisted.route).toBe('POST /api/finance/invoices');
        expect(persisted.statusCode).toBe(500);
        expect(persisted.errorCode).toBe('INTERNAL_SERVER_ERROR');
        expect(persisted.tenantId).toBe('tenant-1');
        expect(persisted.userId).toBe('user-1');
        expect(persisted.meta).toEqual({ detail: 'pg timeout' });
    });

    it('should sanitize meta before persisting', () => {
        logError({
            level: 'error',
            source: 'api',
            message: 'Auth failed',
            meta: { token: 'secret-token', nested: { password: 'pw' } },
        });

        const [persisted] = readAllLoggedEntries();
        expect(persisted.meta).toEqual({
            token: '[REDACTED]',
            nested: { password: '[REDACTED]' },
        });
    });

    it('should append (not overwrite) on multiple calls', () => {
        logError({ level: 'error', source: 'api', message: 'first' });
        logError({ level: 'warn', source: 'cron', message: 'second' });

        const entries = readAllLoggedEntries();
        expect(entries.length).toBe(2);
        expect(entries[0].message).toBe('first');
        expect(entries[1].message).toBe('second');
    });

    it('should not throw when ERROR_LOG_DISABLED=true (still returns entry)', () => {
        process.env.ERROR_LOG_DISABLED = 'true';
        const entry = logError({ level: 'fatal', source: 'process', message: 'crash' });
        expect(entry.message).toBe('crash');
        expect(entry.level).toBe('fatal');
        // Tidak ada file yang tertulis
        const files = readdirSync(tempDir).filter((f) => f.endsWith('.jsonl'));
        expect(files.length).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// logApiError
// ---------------------------------------------------------------------------

describe('error-logger — logApiError', () => {
    it('should derive message & stack from Error instance with source "api"', () => {
        const error = new Error('Prisma connection pool exhausted');
        const entry = logApiError(error, {
            route: '/api/finance/invoices',
            method: 'POST',
            statusCode: 500,
            errorCode: 'DATABASE_ERROR',
            tenantId: 't-9',
        });

        expect(entry.source).toBe('api');
        expect(entry.message).toBe('Prisma connection pool exhausted');
        expect(entry.stack).toContain('Error: Prisma connection pool exhausted');
        expect(entry.route).toBe('POST /api/finance/invoices'); // method digabung
        expect(entry.statusCode).toBe(500);
        expect(entry.errorCode).toBe('DATABASE_ERROR');
        expect(entry.tenantId).toBe('t-9');
        expect(entry.fingerprint).toMatch(/^[0-9a-f]{12}$/);
    });

    it('should handle non-Error values via String()', () => {
        const entry = logApiError('plain string failure');
        expect(entry.source).toBe('api');
        expect(entry.message).toBe('plain string failure');
        expect(entry.stack).toBeUndefined();
        expect(entry.route).toBeUndefined();
    });

    it('should persist to file when logApiError called', () => {
        logApiError(new Error('file persist check'), { route: '/api/test', method: 'GET' });

        const entries = readAllLoggedEntries();
        expect(entries.length).toBe(1);
        expect(entries[0].message).toBe('file persist check');
        expect(entries[0].source).toBe('api');
    });
});
