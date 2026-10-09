/**
 * Error Log Reader — baca, filter, dan agregasi error log JSONL (server-only).
 *
 * Counterpart dari `lib/error-logger.ts` (writer). File log harian berada di
 * `<ERROR_LOG_DIR|<cwd>/.logs/errors>/errors-YYYY-MM-DD.jsonl` (timezone Asia/Jakarta,
 * offset statis +7 — pola yang sama dengan writer).
 *
 * ⛔ SERVER-ONLY — modul ini meng-import `fs`. JANGAN PERNAH di-import dari
 *    client component / browser bundle. Aman dipakai di route handlers,
 *    server components, dan cron jobs.
 *
 * Behavior:
 *   - Direktori log tidak ada / file kosong → return empty/zeros (never-throw).
 *   - Baris JSON rusak → di-skip (try/catch per baris).
 *   - Hasil akhir selalu di-sort by `timestamp` desc (terbaru dulu).
 *
 * Usage (route handler):
 *   const items = await readErrorLogs({ days: 7, levels: ['error'], limit: 50 });
 *   const stats = await readErrorStats(7);
 *   const entry = await findErrorLogById(id);
 */

import { existsSync, readFileSync, readdirSync, statSync, unlinkSync } from 'fs';
import { basename, join } from 'path';
import type { ErrorLogEntry, ErrorLogLevel, ErrorLogSource } from './error-logger';
// Relative import — diperlukan untuk vitest mock interception (pola sama dengan error-logger.ts)
import { logger } from './logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Opsi filter/pagination untuk {@link readErrorLogs} dan {@link countErrorLogs}. */
export interface ReadErrorLogsOptions {
    /** Rentang hari yang dibaca (termasuk hari ini). Default 7, max 31. */
    days?: number;
    /** Filter level — entry hanya lolos jika level-nya ada di array. */
    levels?: ErrorLogLevel[];
    /** Filter source — entry hanya lolos jika source-nya ada di array. */
    sources?: ErrorLogSource[];
    /** Filter route — substring case-insensitive terhadap field `route`. */
    route?: string;
    /** Filter fingerprint — exact match. */
    fingerprint?: string;
    /** Filter tenantId — exact match. */
    tenantId?: string;
    /** Free-text search — substring case-insensitive terhadap field `message`. */
    search?: string;
    /** Jumlah entry per halaman. Default 200, max 1000. */
    limit?: number;
    /** Offset entry untuk pagination. Default 0. */
    offset?: number;
}

/** Satu kelompok fingerprint untuk {@link ErrorLogStats.topFingerprints}. */
export interface ErrorFingerprintGroup {
    fingerprint: string;
    count: number;
    level: ErrorLogLevel;
    source: ErrorLogSource;
    message: string;
    route?: string;
    /** Timestamp ISO entry terbaru dengan fingerprint ini. */
    lastSeen: string;
}

/** Agregasi statistik error log untuk halaman platform. */
export interface ErrorLogStats {
    totals: {
        last24h: { error: number; warn: number; fatal: number; all: number };
        last7d: { error: number; warn: number; fatal: number; all: number };
    };
    /** Jumlah entry per source (agregat seluruh window `days`). */
    bySource: Record<ErrorLogSource, number>;
    /** Jumlah entry per hari (timezone Asia/Jakarta), urut tanggal asc. Hari tanpa log = zeros. */
    byDay: { date: string; error: number; warn: number; fatal: number }[];
    /** Top 10 fingerprint tersering (count desc, tie-break lastSeen desc). */
    topFingerprints: ErrorFingerprintGroup[];
    /** File log yang ada beserta ukuran (byte) dan mtime. */
    recentFiles: { name: string; sizeBytes: number; mtime: string }[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default direktori log (sama dengan writer; server: cwd = apps/web). */
const DEFAULT_LOG_DIR = join(process.cwd(), '.logs', 'errors');
/** Offset statis Asia/Jakarta (UTC+7, tanpa DST) — konsisten dengan error-logger. */
const JAKARTA_SHIFT_MS = 7 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = 7;
const MAX_DAYS = 31;
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;
/** Retention default file log (hari) — override via `ERROR_LOG_RETENTION_DAYS`. */
const DEFAULT_RETENTION_DAYS = 30;
const MIN_RETENTION_DAYS = 1;
const MAX_RETENTION_DAYS = 365;
/** Safety cap jumlah entry yang diparse per operasi agregasi (jaga memori). */
const MAX_ENTRIES_SCAN = 20000;

/** Valid value untuk filter level (runtime guard terhadap input liar). */
const VALID_LEVELS: ReadonlySet<string> = new Set(['error', 'warn', 'fatal']);
/** Valid value untuk filter source (runtime guard terhadap input liar). */
const VALID_SOURCES: ReadonlySet<string> = new Set([
    'api',
    'route',
    'frontend',
    'cron',
    'process',
    'middleware',
]);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Direktori log aktif — `ERROR_LOG_DIR` override atau default `<cwd>/.logs/errors`. */
function resolveLogDir(): string {
    return process.env.ERROR_LOG_DIR || DEFAULT_LOG_DIR;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/**
 * Tanggal log dalam timezone Asia/Jakarta (UTC+7) untuk `daysAgo` hari lalu.
 * Format 'YYYY-MM-DD' (diambil dari ISO string UTC hasil shift offset +7).
 */
function jakartaDateString(daysAgo: number = 0): string {
    return new Date(Date.now() + JAKARTA_SHIFT_MS - daysAgo * MS_PER_DAY)
        .toISOString()
        .slice(0, 10);
}

/**
 * Generate path file log untuk `days` hari terakhir (termasuk hari ini),
 * terbaru dulu, filter hanya yang benar-benar ada di disk.
 */
function listLogFiles(days: number): string[] {
    const dir = resolveLogDir();
    const clampedDays = clamp(Math.floor(days) || DEFAULT_DAYS, 1, MAX_DAYS);
    const files: string[] = [];
    for (let i = 0; i < clampedDays; i++) {
        const filePath = join(dir, `errors-${jakartaDateString(i)}.jsonl`);
        if (existsSync(filePath)) {
            files.push(filePath);
        }
    }
    return files;
}

/** Parse satu baris JSONL menjadi ErrorLogEntry; baris rusak / shape salah → null. */
function parseEntryLine(line: string): ErrorLogEntry | null {
    const trimmed = line.trim();
    if (trimmed === '') return null;
    try {
        const parsed = JSON.parse(trimmed) as Partial<ErrorLogEntry>;
        // Minimal shape guard — field wajib harus ada dan bertipe benar
        if (
            typeof parsed !== 'object' ||
            parsed === null ||
            typeof parsed.id !== 'string' ||
            typeof parsed.timestamp !== 'string' ||
            typeof parsed.level !== 'string' ||
            typeof parsed.source !== 'string' ||
            typeof parsed.message !== 'string' ||
            typeof parsed.fingerprint !== 'string'
        ) {
            return null;
        }
        return parsed as ErrorLogEntry;
    } catch {
        return null;
    }
}

/** Baca semua baris valid dari satu file; file tidak bisa dibaca → []. */
function readEntriesFromFile(filePath: string): ErrorLogEntry[] {
    try {
        const content = readFileSync(filePath, 'utf8');
        const entries: ErrorLogEntry[] = [];
        for (const line of content.split('\n')) {
            const entry = parseEntryLine(line);
            if (entry) entries.push(entry);
        }
        return entries;
    } catch {
        return [];
    }
}

/** Apakah entry lolos semua filter pada options? */
function matchesFilters(entry: ErrorLogEntry, options: ReadErrorLogsOptions): boolean {
    if (options.levels && options.levels.length > 0 && !options.levels.includes(entry.level)) {
        return false;
    }
    if (options.sources && options.sources.length > 0 && !options.sources.includes(entry.source)) {
        return false;
    }
    if (options.route && !entry.route?.toLowerCase().includes(options.route.toLowerCase())) {
        return false;
    }
    if (options.fingerprint && entry.fingerprint !== options.fingerprint) {
        return false;
    }
    if (options.tenantId && entry.tenantId !== options.tenantId) {
        return false;
    }
    if (options.search && !entry.message.toLowerCase().includes(options.search.toLowerCase())) {
        return false;
    }
    return true;
}

/** Sort desc by timestamp (ISO string — lexicographic order = chronological order). */
function sortByTimestampDesc(entries: ErrorLogEntry[]): ErrorLogEntry[] {
    return entries.sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0));
}

// ---------------------------------------------------------------------------
// Query param helpers (dipakai route handlers — REUSE, jangan duplikasi)
// ---------------------------------------------------------------------------

/**
 * Clamp query param numerik dari string. Aman untuk input kosong / NaN /
 * nilai tidak wajib — tidak pernah melempar.
 *
 * @param raw - Nilai mentah dari `searchParams.get()`
 * @param defaultValue - Nilai default jika raw kosong / bukan angka valid
 * @param min - Batas bawah hasil clamp
 * @param max - Batas atas hasil clamp
 */
export function clampIntParam(
    raw: string | null,
    defaultValue: number,
    min: number,
    max: number
): number {
    if (raw === null || raw.trim() === '') return defaultValue;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return defaultValue;
    return clamp(Math.floor(parsed), min, max);
}

/**
 * Parse query param multi-value comma-separated (e.g. `?level=error,fatal`).
 * Value yang tidak ada di `validValues` di-drop. Kosong → [].
 *
 * @param raw - Nilai mentah dari `searchParams.get()`
 * @param validValues - Set value yang diizinkan
 */
export function parseCommaListParam<T extends string>(
    raw: string | null,
    validValues: ReadonlySet<string>
): T[] {
    if (!raw) return [];
    return raw
        .split(',')
        .map((v) => v.trim())
        .filter((v): v is T => v !== '' && validValues.has(v));
}

/** Valid level values — untuk parseCommaListParam di route handlers. */
export const ERROR_LOG_LEVEL_VALUES: ReadonlySet<string> = VALID_LEVELS;
/** Valid source values — untuk parseCommaListParam di route handlers. */
export const ERROR_LOG_SOURCE_VALUES: ReadonlySet<string> = VALID_SOURCES;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Baca error log dengan filter + pagination.
 *
 * Membaca file dari yang paling baru ke lama dan berhenti lebih awal begitu
 * terkumpul `limit + offset` entries **setelah filter** (efisiensi I/O).
 * Hasil akhir di-sort `timestamp` desc lalu di-slice `[offset, offset+limit]`.
 *
 * Direktori tidak ada / tidak ada data → `[]` (never-throw).
 */
export async function readErrorLogs(options: ReadErrorLogsOptions = {}): Promise<ErrorLogEntry[]> {
    const limit = clamp(Math.floor(options.limit ?? DEFAULT_LIMIT), 1, MAX_LIMIT);
    const offset = clamp(Math.floor(options.offset ?? 0), 0, Number.MAX_SAFE_INTEGER);
    const target = limit + offset;

    const files = listLogFiles(options.days ?? DEFAULT_DAYS);
    const collected: ErrorLogEntry[] = [];

    for (const filePath of files) {
        for (const entry of readEntriesFromFile(filePath)) {
            if (!matchesFilters(entry, options)) continue;
            collected.push(entry);
            if (collected.length >= target) break;
        }
        if (collected.length >= target) break;
    }

    sortByTimestampDesc(collected);
    return collected.slice(offset, offset + limit);
}

/**
 * Hitung total entry setelah filter (untuk pagination total).
 * Membaca penuh seluruh window tapi hanya menyimpan count (tidak menumpuk
 * array besar). Direktori tidak ada → 0.
 */
export async function countErrorLogs(options: ReadErrorLogsOptions = {}): Promise<number> {
    const files = listLogFiles(options.days ?? DEFAULT_DAYS);
    let count = 0;
    for (const filePath of files) {
        for (const entry of readEntriesFromFile(filePath)) {
            if (matchesFilters(entry, options)) count++;
        }
    }
    return count;
}

/**
 * Agregasi statistik error log untuk halaman platform superadmin.
 *
 * @param days - Rentang hari (default 7, max 31)
 * @returns ErrorLogStats — totals, bySource, byDay (asc), topFingerprints, recentFiles
 */
export async function readErrorStats(days: number = DEFAULT_DAYS): Promise<ErrorLogStats> {
    const clampedDays = clamp(Math.floor(days) || DEFAULT_DAYS, 1, MAX_DAYS);
    const files = listLogFiles(clampedDays);
    const now = Date.now();
    const cutoff24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    const levelCounts = (): { error: number; warn: number; fatal: number; all: number } => ({
        error: 0,
        warn: 0,
        fatal: 0,
        all: 0,
    });
    const totals = { last24h: levelCounts(), last7d: levelCounts() };
    const bySource: Record<ErrorLogSource, number> = {
        api: 0,
        route: 0,
        frontend: 0,
        cron: 0,
        process: 0,
        middleware: 0,
    };

    // 7 (atau days) slot hari, urut asc — hari tanpa log tetap zeros
    const byDayMap = new Map<string, { error: number; warn: number; fatal: number }>();
    for (let i = clampedDays - 1; i >= 0; i--) {
        byDayMap.set(jakartaDateString(i), { error: 0, warn: 0, fatal: 0 });
    }

    const fingerprintMap = new Map<string, ErrorFingerprintGroup>();
    let scanned = 0;

    for (const filePath of files) {
        for (const entry of readEntriesFromFile(filePath)) {
            if (scanned >= MAX_ENTRIES_SCAN) break;
            scanned++;

            // totals
            if (entry.level in totals.last7d) {
                totals.last7d[entry.level as 'error' | 'warn' | 'fatal']++;
            }
            totals.last7d.all++;
            if (entry.timestamp >= cutoff24h) {
                if (entry.level in totals.last24h) {
                    totals.last24h[entry.level as 'error' | 'warn' | 'fatal']++;
                }
                totals.last24h.all++;
            }

            // bySource
            if (entry.source in bySource) {
                bySource[entry.source]++;
            }

            // byDay (tanggal Asia/Jakarta dari timestamp)
            const dayKey = new Date(new Date(entry.timestamp).getTime() + JAKARTA_SHIFT_MS)
                .toISOString()
                .slice(0, 10);
            const dayBucket = byDayMap.get(dayKey);
            if (dayBucket && entry.level in dayBucket) {
                dayBucket[entry.level as 'error' | 'warn' | 'fatal']++;
            }

            // topFingerprints
            const existing = fingerprintMap.get(entry.fingerprint);
            if (!existing) {
                fingerprintMap.set(entry.fingerprint, {
                    fingerprint: entry.fingerprint,
                    count: 1,
                    level: entry.level,
                    source: entry.source,
                    message: entry.message,
                    ...(entry.route !== undefined ? { route: entry.route } : {}),
                    lastSeen: entry.timestamp,
                });
            } else {
                existing.count++;
                if (entry.timestamp >= existing.lastSeen) {
                    existing.lastSeen = entry.timestamp;
                    existing.level = entry.level;
                    existing.source = entry.source;
                    existing.message = entry.message;
                    existing.route = entry.route;
                }
            }
        }
        if (scanned >= MAX_ENTRIES_SCAN) break;
    }

    const topFingerprints = Array.from(fingerprintMap.values())
        .sort((a, b) => b.count - a.count || (a.lastSeen < b.lastSeen ? 1 : -1))
        .slice(0, 10);

    const recentFiles = files.map((filePath) => {
        let sizeBytes = 0;
        let mtime = '';
        try {
            const stat = statSync(filePath);
            sizeBytes = stat.size;
            mtime = stat.mtime.toISOString();
        } catch {
            // file hilang di tengah jalan — skip data, tetap tampilkan nama
        }
        return { name: basename(filePath), sizeBytes, mtime };
    });

    return {
        totals,
        bySource,
        byDay: Array.from(byDayMap.entries()).map(([date, counts]) => ({ date, ...counts })),
        topFingerprints,
        recentFiles,
    };
}

/**
 * Cari satu error log entry berdasarkan id (linear scan file recent → lama).
 *
 * @param id - Entry id (UUID)
 * @param days - Rentang hari yang discan (default 7, max 31)
 * @returns Entry pertama yang cocok, atau null jika tidak ditemukan
 */
export async function findErrorLogById(
    id: string,
    days: number = DEFAULT_DAYS
): Promise<ErrorLogEntry | null> {
    if (!id) return null;
    const files = listLogFiles(days);
    for (const filePath of files) {
        for (const entry of readEntriesFromFile(filePath)) {
            if (entry.id === id) return entry;
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// Retention cleanup
// ---------------------------------------------------------------------------

/** Hasil operasi {@link cleanupErrorLogs} — selalu parsial, tidak pernah throw. */
export interface CleanupErrorLogsResult {
    /** Nama file (basename) yang berhasil dihapus. */
    deletedFiles: string[];
    /** Jumlah file log yang tersisa (tidak dihapus karena masih dalam retention). */
    keptFiles: number;
    /** Total byte yang dibebaskan dari file yang berhasil dihapus. */
    freedBytes: number;
}

/** Pola nama file log harian writer: `errors-YYYY-MM-DD.jsonl`. */
const LOG_FILE_PATTERN = /^errors-(\d{4}-\d{2}-\d{2})\.jsonl$/;

/**
 * Resolve retention hari dari argumen atau env `ERROR_LOG_RETENTION_DAYS`.
 * Nilai tidak valid / kosong → default 30. Hasil di-clamp 1–365.
 */
function resolveRetentionDays(retentionDays?: number): number {
    if (retentionDays !== undefined && Number.isFinite(retentionDays)) {
        return clamp(Math.floor(retentionDays), MIN_RETENTION_DAYS, MAX_RETENTION_DAYS);
    }
    const envRaw = process.env.ERROR_LOG_RETENTION_DAYS?.trim();
    const envParsed = envRaw ? Number(envRaw) : NaN;
    return clamp(
        Number.isFinite(envParsed) ? Math.floor(envParsed) : DEFAULT_RETENTION_DAYS,
        MIN_RETENTION_DAYS,
        MAX_RETENTION_DAYS
    );
}

/**
 * Hapus file log harian yang lebih tua dari retention (file lifecycle mgmt).
 *
 * File `errors-YYYY-MM-DD.jsonl` dihapus jika tanggalnya (Asia/Jakarta, +7 —
 * konsisten dengan writer/reader) **lebih awal** dari (hari ini − retentionDays).
 * File dengan tanggal persis di boundary cutoff TETAP dipertahankan.
 *
 * Behavior:
 *   - Direktori tidak ada → return hasil kosong (never-throw).
 *   - `unlinkSync` per file dalam try/catch — gagal hapus 1 file tidak
 *     menghentikan file lain; kegagalan dicatat via `logger.error`.
 *   - Return daftar file terhapus + count file tersisa + total bytes freed.
 *
 * @param retentionDays - Retention dalam hari. Default: env `ERROR_LOG_RETENTION_DAYS` else 30 (clamp 1–365).
 */
export async function cleanupErrorLogs(retentionDays?: number): Promise<CleanupErrorLogsResult> {
    const days = resolveRetentionDays(retentionDays);
    const dir = resolveLogDir();
    const result: CleanupErrorLogsResult = { deletedFiles: [], keptFiles: 0, freedBytes: 0 };

    try {
        if (!existsSync(dir)) return result;

        // Cutoff = tanggal Jakarta `days` hari lalu. File date < cutoff → hapus.
        const cutoffDate = jakartaDateString(days);

        for (const name of readdirSync(dir)) {
            const match = LOG_FILE_PATTERN.exec(name);
            if (!match) continue; // Bukan file log harian — skip

            const fileDate = match[1]; // 'YYYY-MM-DD' — lexicographic = chronological
            if (fileDate >= cutoffDate) {
                result.keptFiles++;
                continue;
            }

            const filePath = join(dir, name);
            try {
                const stat = statSync(filePath);
                unlinkSync(filePath);
                result.deletedFiles.push(name);
                result.freedBytes += stat.size;
            } catch (unlinkError) {
                // Gagal hapus 1 file (permission / race) — skip, lanjut file lain
                logger.error(`[ErrorLogReader] Failed to delete expired log file: ${name}`, unlinkError);
            }
        }
    } catch (listError) {
        // Direktori tidak bisa dibaca — return hasil parsial (never-throw)
        logger.error('[ErrorLogReader] Failed to scan log directory for cleanup', listError);
    }

    return result;
}

// Re-export tipe writer agar konsumen cukup import dari modul ini bila perlu.
export type { ErrorLogEntry, ErrorLogLevel, ErrorLogSource };
