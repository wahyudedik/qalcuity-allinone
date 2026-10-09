/**
 * Error Log Reader Unit Tests
 *
 * Tests untuk lib/error-log-reader.ts (baca/filter/agregasi JSONL error logs):
 * - readErrorLogs: filter level/source/route/search/fingerprint/tenantId,
 *   sort timestamp desc, pagination limit/offset, skip baris rusak
 * - countErrorLogs: total setelah filter
 * - readErrorStats: totals last24h & last7d, byDay (7 slot, asc),
 *   topFingerprints (count desc), bySource
 * - findErrorLogById: ketemu / tidak ketemu (null)
 * - Direktori tidak ada → return empty/zeros tanpa throw
 * - clampIntParam / parseCommaListParam helpers
 *
 * Fixture JSONL ditulis manual (writeSync) ke direktori temp via
 * process.env.ERROR_LOG_DIR — pola sama dengan error-logger.test.ts.
 * Nama file mengikuti konvensi writer: errors-YYYY-MM-DD.jsonl (Asia/Jakarta +7).
 */

import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    readErrorLogs,
    countErrorLogs,
    readErrorStats,
    findErrorLogById,
    cleanupErrorLogs,
    clampIntParam,
    parseCommaListParam,
    ERROR_LOG_LEVEL_VALUES,
    ERROR_LOG_SOURCE_VALUES,
    type ErrorLogEntry,
    type ErrorLogLevel,
    type ErrorLogSource,
} from '../../../lib/error-log-reader';

// ---------------------------------------------------------------------------
// Temp directory setup — semua bacaan log diarahkan ke sini
// ---------------------------------------------------------------------------

let tempDir: string;

beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'error-log-reader-test-'));
    process.env.ERROR_LOG_DIR = tempDir;
});

afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.ERROR_LOG_DIR;
});

afterAll(() => {
    vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** Offset statis Asia/Jakarta — logika identik dengan writer & reader. */
const JAKARTA_SHIFT_MS = 7 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Tanggal Jakarta (YYYY-MM-DD) untuk `daysAgo` hari lalu. */
function jakartaDate(daysAgo = 0): string {
    return new Date(Date.now() + JAKARTA_SHIFT_MS - daysAgo * MS_PER_DAY)
        .toISOString()
        .slice(0, 10);
}

/** Buat ErrorLogEntry parsial dengan default wajib yang valid. */
function makeEntry(overrides: Partial<ErrorLogEntry>): ErrorLogEntry {
    return {
        id: '00000000-0000-4000-8000-000000000000',
        timestamp: new Date().toISOString(),
        level: 'error',
        source: 'api',
        message: 'sample error message',
        fingerprint: 'abc123def456',
        ...overrides,
    } as ErrorLogEntry;
}

/** Tanggal Jakarta (YYYY-MM-DD) dari timestamp entry — formula identik reader. */
function jakartaDateOfTimestamp(timestamp: string): string {
    return new Date(new Date(timestamp).getTime() + JAKARTA_SHIFT_MS)
        .toISOString()
        .slice(0, 10);
}

/**
 * Tulis array entries ke file JSONL di tempDir. Nama file ditentukan dari
 * tanggal Jakarta SETIAP entry (bukan relatif "hari ini") sehingga fixture
 * deterministik terlepas jam berapa test dijalankan (dekat tengah malam WIB
 * sekalipun). Entries dengan tanggal sama otomatis ter-group ke satu file.
 * Baris rusak opsional disisipkan di setiap file untuk menguji shape guard.
 */
function writeFixtureFile(entries: ErrorLogEntry[], extraBrokenLines: string[] = []): void {
    const byDay = new Map<string, ErrorLogEntry[]>();
    for (const entry of entries) {
        const dayKey = jakartaDateOfTimestamp(entry.timestamp);
        const bucket = byDay.get(dayKey);
        if (bucket) {
            bucket.push(entry);
        } else {
            byDay.set(dayKey, [entry]);
        }
    }
    for (const [dayKey, dayEntries] of byDay) {
        const filePath = join(tempDir, `errors-${dayKey}.jsonl`);
        const lines = dayEntries.map((e) => JSON.stringify(e));
        lines.push(...extraBrokenLines);
        writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
    }
}

// ---------------------------------------------------------------------------
// Fixture data — 5 entry "hari ini" + 2 entry "kemarin" + baris rusak
// ---------------------------------------------------------------------------

const now = Date.now();

const entryApiError = makeEntry({
    id: '11111111-1111-4111-8111-111111111111',
    timestamp: new Date(now - 30 * 60 * 1000).toISOString(), // 30m lalu
    level: 'error',
    source: 'api',
    message: 'Invoice creation failed',
    route: '/api/finance/invoices',
    fingerprint: 'aaa111bbb222',
    tenantId: 'tenant-alpha',
});
const entryFrontendWarn = makeEntry({
    id: '22222222-2222-4222-8222-222222222222',
    timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(), // 2j lalu
    level: 'warn',
    source: 'frontend',
    message: 'Slow render detected',
    route: '/dashboard',
    fingerprint: 'ccc333ddd444',
});
const entryCronError = makeEntry({
    id: '33333333-3333-4333-8333-333333333333',
    timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(), // 3j lalu
    level: 'error',
    source: 'cron',
    message: 'Payment reminder failed',
    route: '/api/cron/payment-reminder',
    fingerprint: 'aaa111bbb222', // sengaja sama dengan entryApiError
});
const entryProcessFatal = makeEntry({
    id: '44444444-4444-4444-8444-444444444444',
    timestamp: new Date(now - 4 * 60 * 60 * 1000).toISOString(), // 4j lalu
    level: 'fatal',
    source: 'process',
    message: 'Uncaught exception in worker',
    fingerprint: 'eee555fff666',
});
const entryApiErrorTenant2 = makeEntry({
    id: '55555555-5555-4555-8555-555555555555',
    timestamp: new Date(now - 5 * 60 * 60 * 1000).toISOString(), // 5j lalu
    level: 'error',
    source: 'api',
    message: 'Tenant query timeout',
    route: '/api/platform/tenants',
    fingerprint: 'ggg777hhh888',
    tenantId: 'tenant-beta',
});

const todayEntries = [
    entryApiError,
    entryFrontendWarn,
    entryCronError,
    entryProcessFatal,
    entryApiErrorTenant2,
];

// Entry "kemarin" berusia 25–26 jam (relatif) — selalu di luar jendela
// last24h (deterministik) dan tanggal Jakarta-nya kemarin atau 2 hari lalu
// tergantung jam jalannya test (dekat tengah malam WIB). Nama file fixture
// dihitung dari timestamp entry sehingga tetap konsisten dengan reader.
const entryYesterdayWarn = makeEntry({
    id: '66666666-6666-4666-8666-666666666666',
    timestamp: new Date(now - 25 * 60 * 60 * 1000).toISOString(), // 25j lalu
    level: 'warn',
    source: 'middleware',
    message: 'Rate limit exceeded',
    fingerprint: 'iii999jjj000',
});
const entryYesterdayApiError = makeEntry({
    id: '77777777-7777-4777-8777-777777777777',
    timestamp: new Date(now - 26 * 60 * 60 * 1000).toISOString(), // 26j lalu
    level: 'error',
    source: 'api',
    message: 'Database connection reset',
    fingerprint: 'kkk111lll222',
    tenantId: 'tenant-alpha',
});
const yesterdayEntries = [entryYesterdayWarn, entryYesterdayApiError];

/** Baris rusak: bukan JSON & JSON valid tapi shape salah — keduanya harus di-skip. */
const BROKEN_LINES = [
    'this-is-not-json{{{',
    '{"foo":1,"bar":2}',
];

/** Tulis seluruh fixture standar (hari ini + entry luar 24h + baris rusak). */
function seedFixtures(): void {
    writeFixtureFile([...todayEntries, ...yesterdayEntries], BROKEN_LINES);
}

// ---------------------------------------------------------------------------
// readErrorLogs — dasar
// ---------------------------------------------------------------------------

describe('error-log-reader — readErrorLogs (dasar)', () => {
    it('should return valid entries only (skip broken lines), sorted timestamp desc', async () => {
        seedFixtures();

        const items = await readErrorLogs({ days: 7 });

        // 7 entry valid (5 hari ini + 2 kemarin); 2 baris rusak di-skip
        expect(items).toHaveLength(7);
        // Semua shape valid
        for (const item of items) {
            expect(typeof item.id).toBe('string');
            expect(typeof item.fingerprint).toBe('string');
        }
        // Sort timestamp desc
        const timestamps = items.map((e) => e.timestamp);
        const sorted = [...timestamps].sort().reverse();
        expect(timestamps).toEqual(sorted);
    });

    it('should return [] when log directory does not exist (no throw)', async () => {
        process.env.ERROR_LOG_DIR = join(tempDir, 'does-not-exist');

        const items = await readErrorLogs({ days: 7 });
        expect(items).toEqual([]);
    });

    it('should return [] when log directory is empty (no files)', async () => {
        mkdirSync(tempDir, { recursive: true });

        const items = await readErrorLogs({ days: 7 });
        expect(items).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// readErrorLogs — filters
// ---------------------------------------------------------------------------

describe('error-log-reader — readErrorLogs (filters)', () => {
    beforeEach(() => {
        seedFixtures();
    });

    it('should filter by level (multi)', async () => {
        const items = await readErrorLogs({ days: 7, levels: ['error'] });
        expect(items).toHaveLength(4);
        for (const item of items) expect(item.level).toBe('error');

        const fatals = await readErrorLogs({ days: 7, levels: ['fatal'] });
        expect(fatals).toHaveLength(1);
        expect(fatals[0].id).toBe(entryProcessFatal.id);
    });

    it('should filter by source (multi)', async () => {
        const items = await readErrorLogs({ days: 7, sources: ['api', 'cron'] });
        // entryApiError + entryCronError + entryApiErrorTenant2 + entryOldApiError(26j)
        expect(items).toHaveLength(4);
        for (const item of items) expect(['api', 'cron']).toContain(item.source);
    });

    it('should filter by route substring case-insensitive', async () => {
        const items = await readErrorLogs({ days: 7, route: 'INVOICES' });
        expect(items).toHaveLength(1);
        expect(items[0].id).toBe(entryApiError.id);
    });

    it('should filter by message search substring case-insensitive', async () => {
        const items = await readErrorLogs({ days: 7, search: 'payment' });
        expect(items).toHaveLength(1);
        expect(items[0].id).toBe(entryCronError.id);
    });

    it('should filter by fingerprint exact match', async () => {
        const items = await readErrorLogs({ days: 7, fingerprint: 'aaa111bbb222' });
        expect(items).toHaveLength(2);
        for (const item of items) expect(item.fingerprint).toBe('aaa111bbb222');
    });

    it('should filter by tenantId exact match', async () => {
        const items = await readErrorLogs({ days: 7, tenantId: 'tenant-alpha' });
        expect(items).toHaveLength(2);
        for (const item of items) expect(item.tenantId).toBe('tenant-alpha');
    });

    it('should only read entries within the days window (today-only when days=1)', async () => {
        // days=1 hanya membaca file tanggal Jakarta hari ini. Jumlah entry
        // yang lolos dihitung dinamis dari tanggal Jakarta setiap entry —
        // deterministik terlepas jam berapa test dijalankan.
        const allEntries = [...todayEntries, ...yesterdayEntries];
        const todayCount = allEntries.filter(
            (e) => jakartaDateOfTimestamp(e.timestamp) === jakartaDate(0)
        ).length;
        const items = await readErrorLogs({ days: 1 });
        expect(items).toHaveLength(todayCount);
        // Entry 25/26j hanya boleh muncul jika tanggal Jakarta-nya memang hari ini
        for (const old of [entryYesterdayWarn, entryYesterdayApiError]) {
            if (jakartaDateOfTimestamp(old.timestamp) !== jakartaDate(0)) {
                expect(items.map((e) => e.id)).not.toContain(old.id);
            }
        }
    });
});

// ---------------------------------------------------------------------------
// readErrorLogs — pagination
// ---------------------------------------------------------------------------

describe('error-log-reader — readErrorLogs (pagination)', () => {
    beforeEach(() => {
        seedFixtures();
    });

    it('should apply limit correctly', async () => {
        const items = await readErrorLogs({ days: 7, limit: 3 });
        expect(items).toHaveLength(3);
    });

    it('should apply offset correctly (page 2)', async () => {
        // Urutan desc penuh: [entryApiError(30m), entryFrontendWarn(2j),
        // entryCronError(3j), entryProcessFatal(4j), entryApiErrorTenant2(5j),
        // entryYesterdayApiError, entryYesterdayWarn]
        const page = await readErrorLogs({ days: 7, limit: 2, offset: 2 });
        expect(page).toHaveLength(2);
        expect(page[0].id).toBe(entryCronError.id);
        expect(page[1].id).toBe(entryProcessFatal.id);
    });

    it('should return [] when offset beyond total', async () => {
        const items = await readErrorLogs({ days: 7, limit: 5, offset: 100 });
        expect(items).toEqual([]);
    });

    it('should apply pagination AFTER filtering (not before)', async () => {
        // Filter error → 4 entry (4 error today + 1 error kemarin = 4? cek:
        // entryApiError, entryCronError, entryApiErrorTenant2, entryYesterdayApiError = 4)
        const page = await readErrorLogs({ days: 7, levels: ['error'], limit: 2, offset: 2 });
        expect(page).toHaveLength(2);
        for (const item of page) expect(item.level).toBe('error');
    });
});

// ---------------------------------------------------------------------------
// countErrorLogs
// ---------------------------------------------------------------------------

describe('error-log-reader — countErrorLogs', () => {
    beforeEach(() => {
        seedFixtures();
    });

    it('should count all valid entries (broken lines excluded)', async () => {
        const total = await countErrorLogs({ days: 7 });
        expect(total).toBe(todayEntries.length + yesterdayEntries.length);
    });

    it('should count with filters applied', async () => {
        const total = await countErrorLogs({ days: 7, levels: ['error'] });
        expect(total).toBe(4);
    });

    it('should return 0 when log directory does not exist', async () => {
        process.env.ERROR_LOG_DIR = join(tempDir, 'does-not-exist');
        const total = await countErrorLogs({ days: 7 });
        expect(total).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// readErrorStats
// ---------------------------------------------------------------------------

describe('error-log-reader — readErrorStats', () => {
    beforeEach(() => {
        seedFixtures();
    });

    it('should compute totals.last24h correctly (recent entries only)', async () => {
        const stats = await readErrorStats(7);
        // Entry 25/26j lalu selalu di luar cutoff 24h (deterministik);
        // entry 30m-5j lalu selalu di dalam.
        expect(stats.totals.last24h.all).toBe(todayEntries.length);
        expect(stats.totals.last24h.error).toBe(3); // api + cron + tenant2
        expect(stats.totals.last24h.warn).toBe(1); // frontend
        expect(stats.totals.last24h.fatal).toBe(1); // process
    });

    it('should compute totals.last7d correctly (all entries in window)', async () => {
        const stats = await readErrorStats(7);
        expect(stats.totals.last7d.all).toBe(todayEntries.length + yesterdayEntries.length);
        expect(stats.totals.last7d.error).toBe(4); // 3 hari ini + 1 kemarin
        expect(stats.totals.last7d.warn).toBe(2); // 1 hari ini + 1 kemarin
        expect(stats.totals.last7d.fatal).toBe(1);
    });

    it('should have byDay with N slots (asc), today as last slot, matching per-entry buckets', async () => {
        const stats = await readErrorStats(7);
        expect(stats.byDay).toHaveLength(7);
        // Asc — tanggal meningkat
        const dates = stats.byDay.map((d) => d.date);
        const asc = [...dates].sort();
        expect(dates).toEqual(asc);
        // Slot terakhir = hari ini (Jakarta)
        expect(dates[dates.length - 1]).toBe(jakartaDate(0));
        // Expected buckets di-recompute dengan formula yang sama dengan reader
        const expected = new Map<string, { error: number; warn: number; fatal: number }>();
        for (const date of dates) expected.set(date, { error: 0, warn: 0, fatal: 0 });
        for (const entry of [...todayEntries, ...yesterdayEntries]) {
            const bucket = expected.get(jakartaDateOfTimestamp(entry.timestamp));
            if (bucket) bucket[entry.level as 'error' | 'warn' | 'fatal']++;
        }
        for (const slot of stats.byDay) {
            const exp = expected.get(slot.date)!;
            expect(slot.error).toBe(exp.error);
            expect(slot.warn).toBe(exp.warn);
            expect(slot.fatal).toBe(exp.fatal);
        }
        // Hari kosong (3 hari lalu — tidak mungkin terisi fixture) → zeros
        const emptySlot = stats.byDay.find((d) => d.date === jakartaDate(3));
        expect(emptySlot).toBeDefined();
        expect(emptySlot!.error).toBe(0);
        expect(emptySlot!.warn).toBe(0);
        expect(emptySlot!.fatal).toBe(0);
        // Invariant: total semua slot = totals.last7d.all
        const byDayTotal = stats.byDay.reduce((sum, d) => sum + d.error + d.warn + d.fatal, 0);
        expect(byDayTotal).toBe(stats.totals.last7d.all);
    });

    it('should compute bySource correctly', async () => {
        const stats = await readErrorStats(7);
        expect(stats.bySource.api).toBe(3); // entryApiError + entryApiErrorTenant2 + entryYesterdayApiError
        expect(stats.bySource.frontend).toBe(1);
        expect(stats.bySource.cron).toBe(1);
        expect(stats.bySource.process).toBe(1);
        expect(stats.bySource.middleware).toBe(1);
    });

    it('should order topFingerprints by count desc with lastSeen tie-break', async () => {
        const stats = await readErrorStats(7);
        expect(stats.topFingerprints.length).toBeGreaterThan(0);
        // aaa111bbb222 muncul 2x → harusnya posisi pertama
        expect(stats.topFingerprints[0].fingerprint).toBe('aaa111bbb222');
        expect(stats.topFingerprints[0].count).toBe(2);
        // lastSeen = timestamp terbaru di antara kedua entry (entryApiError 30m lalu)
        expect(stats.topFingerprints[0].lastSeen).toBe(entryApiError.timestamp);
        // Urutan count desc
        const counts = stats.topFingerprints.map((f) => f.count);
        const desc = [...counts].sort((a, b) => b - a);
        expect(counts).toEqual(desc);
    });

    it('should list recentFiles with name and sizeBytes', async () => {
        const stats = await readErrorStats(7);
        // Jumlah file = jumlah tanggal Jakarta unik dari seluruh entries
        // (dihitung dinamis — deterministik terlepas jam jalannya test).
        const allEntries = [...todayEntries, ...yesterdayEntries];
        const uniqueDays = new Set(allEntries.map((e) => jakartaDateOfTimestamp(e.timestamp)));
        expect(stats.recentFiles.length).toBe(uniqueDays.size);
        for (const file of stats.recentFiles) {
            expect(file.name).toMatch(/^errors-\d{4}-\d{2}-\d{2}\.jsonl$/);
            expect(file.sizeBytes).toBeGreaterThan(0);
            expect(file.mtime).toBeTruthy();
        }
    });

    it('should return zeros / empty structures when log directory does not exist', async () => {
        process.env.ERROR_LOG_DIR = join(tempDir, 'does-not-exist');

        const stats = await readErrorStats(7);
        expect(stats.totals.last24h.all).toBe(0);
        expect(stats.totals.last7d.all).toBe(0);
        expect(stats.bySource.api).toBe(0);
        expect(stats.byDay).toHaveLength(7); // tetap 7 slot zeros
        expect(stats.topFingerprints).toEqual([]);
        expect(stats.recentFiles).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// findErrorLogById
// ---------------------------------------------------------------------------

describe('error-log-reader — findErrorLogById', () => {
    beforeEach(() => {
        seedFixtures();
    });

    it('should find an entry by id (today file)', async () => {
        const found = await findErrorLogById(entryProcessFatal.id, 7);
        expect(found).not.toBeNull();
        expect(found!.id).toBe(entryProcessFatal.id);
        expect(found!.message).toBe(entryProcessFatal.message);
    });

    it('should find an entry by id (older file, beyond 24h)', async () => {
        const found = await findErrorLogById(entryYesterdayWarn.id, 7);
        expect(found).not.toBeNull();
        expect(found!.source).toBe('middleware');
    });

    it('should return null when id not found', async () => {
        const found = await findErrorLogById('non-existent-id', 7);
        expect(found).toBeNull();
    });

    it('should return null for empty id', async () => {
        const found = await findErrorLogById('', 7);
        expect(found).toBeNull();
    });

    it('should return null when log directory does not exist', async () => {
        process.env.ERROR_LOG_DIR = join(tempDir, 'does-not-exist');
        const found = await findErrorLogById(entryApiError.id, 7);
        expect(found).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// cleanupErrorLogs — retention cleanup file harian
// ---------------------------------------------------------------------------

describe('error-log-reader — cleanupErrorLogs', () => {
    /**
     * Tulis file log harian secara langsung dengan nama persis mengikuti
     * konvensi writer: `errors-<jakartaDate(daysAgo)>.jsonl`. Kontrol penuh
     * atas nama file (dibanding writeFixtureFile yang group per timestamp).
     */
    function writeLogFileDirect(daysAgo: number, message = 'cleanup fixture'): string {
        const name = `errors-${jakartaDate(daysAgo)}.jsonl`;
        const filePath = join(tempDir, name);
        const entry = makeEntry({ message, timestamp: new Date(now - daysAgo * MS_PER_DAY).toISOString() });
        writeFileSync(filePath, JSON.stringify(entry) + '\n', 'utf8');
        return filePath;
    }

    it('should delete files older than retention, keep recent ones', async () => {
        const todayFile = writeLogFileDirect(0, 'today entry');
        const tenDaysFile = writeLogFileDirect(10, '10 days ago entry');
        const fortyDaysFile = writeLogFileDirect(40, '40 days ago entry');
        const fortyDaysSize = statSync(fortyDaysFile).size;

        const result = await cleanupErrorLogs(30);

        // File 40 hari lalu terhapus, 2 lainnya kept
        expect(existsSync(fortyDaysFile)).toBe(false);
        expect(existsSync(todayFile)).toBe(true);
        expect(existsSync(tenDaysFile)).toBe(true);

        // Return values benar
        expect(result.deletedFiles).toEqual([`errors-${jakartaDate(40)}.jsonl`]);
        expect(result.keptFiles).toBe(2);
        expect(result.freedBytes).toBe(fortyDaysSize);
    });

    it('should keep files exactly at the cutoff boundary (date >= cutoff)', async () => {
        // Retention 30 → cutoff = 30 hari lalu. File dengan tanggal PERSIS cutoff tetap kept.
        const boundaryFile = writeLogFileDirect(30, 'exactly at cutoff');
        const olderFile = writeLogFileDirect(31, 'one day past cutoff');

        const result = await cleanupErrorLogs(30);

        expect(existsSync(boundaryFile)).toBe(true);
        expect(existsSync(olderFile)).toBe(false);
        expect(result.keptFiles).toBe(1);
        expect(result.deletedFiles).toEqual([`errors-${jakartaDate(31)}.jsonl`]);
    });

    it('should use ERROR_LOG_RETENTION_DAYS env when no argument passed', async () => {
        process.env.ERROR_LOG_RETENTION_DAYS = '5';
        const threeDaysFile = writeLogFileDirect(3, 'within env retention');
        const tenDaysFile = writeLogFileDirect(10, 'past env retention');

        const result = await cleanupErrorLogs();

        expect(existsSync(threeDaysFile)).toBe(true);
        expect(existsSync(tenDaysFile)).toBe(false);
        expect(result.deletedFiles).toEqual([`errors-${jakartaDate(10)}.jsonl`]);
        expect(result.keptFiles).toBe(1);
    });

    it('should fall back to default 30 days when env is empty / invalid', async () => {
        process.env.ERROR_LOG_RETENTION_DAYS = '';
        const tenDaysFile = writeLogFileDirect(10, 'kept with default 30');
        const fortyDaysFile = writeLogFileDirect(40, 'deleted with default 30');

        const result = await cleanupErrorLogs();

        expect(existsSync(tenDaysFile)).toBe(true);
        expect(existsSync(fortyDaysFile)).toBe(false);
        expect(result.keptFiles).toBe(1);

        // Env non-numeric → juga fallback ke 30
        process.env.ERROR_LOG_RETENTION_DAYS = 'not-a-number';
        const result2 = await cleanupErrorLogs();
        expect(result2.keptFiles).toBe(1);
    });

    it('should clamp retentionDays to 1–365', async () => {
        // Clamp bawah: retentionDays=0 → 1 → file 2 hari lalu terhapus, hari ini kept
        const twoDaysFile = writeLogFileDirect(2, 'clamped min 1');
        const resultMin = await cleanupErrorLogs(0);
        expect(existsSync(twoDaysFile)).toBe(false);
        expect(resultMin.deletedFiles).toHaveLength(1);

        // Clamp atas: retentionDays=9999 → 365 → semua file kept (fixtures < 365 hari)
        const recentFile = writeLogFileDirect(5, 'clamped max 365');
        const resultMax = await cleanupErrorLogs(9999);
        expect(existsSync(recentFile)).toBe(true);
        expect(resultMax.deletedFiles).toHaveLength(0);
        expect(resultMax.keptFiles).toBe(1);
    });

    it('should ignore non-matching filenames in log directory', async () => {
        const validFile = writeLogFileDirect(40, 'valid old log');
        // File dengan pola salah — tidak boleh dihapus / dihitung
        const strayFile = join(tempDir, 'random-note.txt');
        writeFileSync(strayFile, 'not a log file', 'utf8');
        const malformedFile = join(tempDir, 'errors-not-a-date.jsonl');
        writeFileSync(malformedFile, '{}', 'utf8');

        const result = await cleanupErrorLogs(30);

        expect(existsSync(validFile)).toBe(false);
        expect(existsSync(strayFile)).toBe(true);
        expect(existsSync(malformedFile)).toBe(true);
        expect(result.deletedFiles).toEqual([`errors-${jakartaDate(40)}.jsonl`]);
        // keptFiles hanya menghitung file log harian yang valid, bukan stray
        expect(result.keptFiles).toBe(0);
    });

    it('should return empty result when log directory does not exist', async () => {
        process.env.ERROR_LOG_DIR = join(tempDir, 'does-not-exist');
        const result = await cleanupErrorLogs(30);
        expect(result).toEqual({ deletedFiles: [], keptFiles: 0, freedBytes: 0 });
    });

    it('should never throw even with unreadable directory entries', async () => {
        writeLogFileDirect(40, 'old log');
        // Direktori kosong valid — hasil parsial tanpa throw
        const emptyDir = join(tempDir, 'empty-subdir');
        mkdirSync(emptyDir);
        process.env.ERROR_LOG_DIR = emptyDir;
        const resultEmpty = await cleanupErrorLogs(30);
        expect(resultEmpty).toEqual({ deletedFiles: [], keptFiles: 0, freedBytes: 0 });

        // Path yang exists tapi BUKAN direktori (readdirSync throw → catch → hasil parsial)
        process.env.ERROR_LOG_DIR = join(tempDir, 'errors-not-a-date.jsonl');
        const resultNotDir = await cleanupErrorLogs(30);
        expect(resultNotDir.deletedFiles).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Query param helpers
// ---------------------------------------------------------------------------

describe('error-log-reader — clampIntParam', () => {
    it('should return default for null / empty / NaN', () => {
        expect(clampIntParam(null, 7, 1, 31)).toBe(7);
        expect(clampIntParam('', 7, 1, 31)).toBe(7);
        expect(clampIntParam('abc', 7, 1, 31)).toBe(7);
    });

    it('should clamp within min/max', () => {
        expect(clampIntParam('0', 7, 1, 31)).toBe(1);
        expect(clampIntParam('100', 7, 1, 31)).toBe(31);
        expect(clampIntParam('15', 7, 1, 31)).toBe(15);
    });

    it('should floor fractional values', () => {
        expect(clampIntParam('3.9', 7, 1, 31)).toBe(3);
    });
});

describe('error-log-reader — parseCommaListParam', () => {
    it('should parse comma-separated values and drop invalid ones', () => {
        const result = parseCommaListParam<ErrorLogLevel>(
            'error,fatal,invalid',
            ERROR_LOG_LEVEL_VALUES
        );
        expect(result).toEqual(['error', 'fatal']);
    });

    it('should return [] for null / empty input', () => {
        expect(parseCommaListParam(null, ERROR_LOG_SOURCE_VALUES)).toEqual([]);
        expect(parseCommaListParam('', ERROR_LOG_SOURCE_VALUES)).toEqual([]);
    });

    it('should trim whitespace around values', () => {
        const result = parseCommaListParam<ErrorLogSource>(
            ' api , cron ',
            ERROR_LOG_SOURCE_VALUES
        );
        expect(result).toEqual(['api', 'cron']);
    });
});
