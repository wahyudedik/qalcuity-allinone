"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { logger } from "@/lib/logger";
// Type-only import — aman untuk client bundle (tidak menarik `fs`).
import type {
    ErrorLogEntry,
    ErrorLogStats,
    ErrorLogLevel,
    ErrorLogSource,
} from "@/lib/error-log-reader";
import {
    AlertTriangle,
    XCircle,
    Flame,
    Activity,
    RefreshCw,
    Search,
    X,
    ShieldAlert,
    ChevronLeft,
    ChevronRight,
    Copy,
    Check,
    Filter,
    Inbox,
    Eye,
    Clock,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_LEVELS: ErrorLogLevel[] = ["error", "warn", "fatal"];
const FILTER_SOURCES = ["api", "frontend", "cron", "process", "middleware"] as const;
type FilterSource = (typeof FILTER_SOURCES)[number];
const DAY_OPTIONS = [1, 3, 7, 14, 31];
const PAGE_LIMIT = 100;

const LEVEL_COLORS: Record<ErrorLogLevel, string> = {
    error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    warn: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    fatal: "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900",
};

const SOURCE_COLORS: Record<string, string> = {
    api: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    frontend: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    cron: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    process: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    middleware: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    route: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

const SOURCE_BAR_COLORS: Record<string, string> = {
    api: "bg-blue-500",
    frontend: "bg-purple-500",
    cron: "bg-orange-500",
    process: "bg-gray-400",
    middleware: "bg-indigo-500",
    route: "bg-teal-500",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return iso;
    }
}

function formatFullTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    } catch {
        return iso;
    }
}

function formatShortTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return iso;
    }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function LevelBadge({ level }: { level: ErrorLogLevel }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[level] || LEVEL_COLORS.error}`}
        >
            {level}
        </span>
    );
}

function SourceBadge({ source }: { source: ErrorLogSource }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_COLORS[source] || SOURCE_COLORS.process}`}
        >
            {source}
        </span>
    );
}

function StatusCodeBadge({ code }: { code: number }) {
    const colors =
        code >= 500
            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            : code >= 400
                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    return (
        <span className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-xs font-medium ${colors}`}>
            {code}
        </span>
    );
}

function FilterChip({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition ${active
                ? "border-purple-300 bg-purple-100 text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
        >
            {children}
        </button>
    );
}

function StatCard({
    label,
    value,
    icon: Icon,
    iconClass,
    iconWrapClass,
}: {
    label: string;
    value: number;
    icon: React.ElementType;
    iconClass: string;
    iconWrapClass: string;
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${iconWrapClass}`}>
                    <Icon className={`h-5 w-5 ${iconClass}`} />
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
}

// ─── API response shapes ──────────────────────────────────────────────────────
interface ErrorListData {
    items: ErrorLogEntry[];
    total: number;
    limit: number;
    offset: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlatformErrorLogsPage() {
    const { t } = useTranslation();

    // List state
    const [items, setItems] = useState<ErrorLogEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [listError, setListError] = useState<string | null>(null);
    const [forbidden, setForbidden] = useState(false);

    // Stats state
    const [stats, setStats] = useState<ErrorLogStats | null>(null);

    // Filters
    const [days, setDays] = useState(7);
    const [levels, setLevels] = useState<ErrorLogLevel[]>([]);
    const [sources, setSources] = useState<FilterSource[]>([]);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [fingerprint, setFingerprint] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);

    // UI state
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [selected, setSelected] = useState<ErrorLogEntry | null>(null);
    const [copiedFingerprint, setCopiedFingerprint] = useState<string | null>(null);

    // Race-guard — fetch terakhir yang menang.
    const fetchIdRef = useRef(0);

    // Debounce search 400ms
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    // ─── Fetch stats ──────────────────────────────────────────────────────────
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(`/api/platform/errors/stats?days=${days}`);
            if (res.status === 403) return; // ditangani oleh list fetch (forbidden state)
            if (!res.ok) return;
            const json = (await res.json()) as { success?: boolean; data?: ErrorLogStats };
            if (json.success && json.data) {
                setStats(json.data);
            }
        } catch {
            // stats bersifat pelengkap — gagal fetch tidak menghalangi list
        }
    }, [days]);

    // ─── Fetch list ───────────────────────────────────────────────────────────
    const fetchLogs = useCallback(
        async (isRefresh = false) => {
            if (isRefresh) setRefreshing(true);
            const fetchId = ++fetchIdRef.current;
            if (!isRefresh) setLoading(true);
            setListError(null);
            try {
                const params = new URLSearchParams();
                params.set("days", String(days));
                params.set("limit", String(PAGE_LIMIT));
                params.set("offset", String(offset));
                if (levels.length > 0) params.set("level", levels.join(","));
                if (sources.length > 0) params.set("source", sources.join(","));
                if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
                if (fingerprint) params.set("fingerprint", fingerprint);

                const res = await fetch(`/api/platform/errors?${params.toString()}`);
                if (fetchId !== fetchIdRef.current) return; // stale response — skip

                if (res.status === 403) {
                    setForbidden(true);
                    setItems([]);
                    setTotal(0);
                    return;
                }
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                const json = (await res.json()) as { success?: boolean; data?: ErrorListData; error?: string };
                if (json.success && json.data) {
                    setForbidden(false);
                    setItems(json.data.items);
                    setTotal(json.data.total);
                } else {
                    throw new Error(json.error || "Failed to fetch error logs");
                }
            } catch (err) {
                if (fetchId !== fetchIdRef.current) return;
                logger.error("[ErrorLogs] Failed to fetch error logs", err);
                setListError(err instanceof Error ? err.message : "Failed to load error logs");
            } finally {
                if (fetchId === fetchIdRef.current) {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        },
        [days, levels, sources, debouncedSearch, fingerprint, offset]
    );

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            fetchLogs(true);
            fetchStats();
        }, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchLogs, fetchStats]);

    // Escape key menutup modal detail
    useEffect(() => {
        if (!selected) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setSelected(null);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selected]);

    const handleRefresh = () => {
        fetchLogs(true);
        fetchStats();
    };

    const toggleLevel = (level: ErrorLogLevel) => {
        setLevels((prev) => {
            const next = prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level];
            return ALL_LEVELS.filter((l) => next.includes(l));
        });
        setOffset(0);
    };

    const toggleSource = (source: FilterSource) => {
        setSources((prev) =>
            prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
        );
        setOffset(0);
    };

    const clearFilters = () => {
        setLevels([]);
        setSources([]);
        setSearch("");
        setDebouncedSearch("");
        setFingerprint(null);
        setOffset(0);
    };

    const hasActiveFilters =
        levels.length > 0 || sources.length > 0 || debouncedSearch.trim() !== "" || fingerprint !== null;

    const applyFingerprintFilter = (fp: string) => {
        setFingerprint(fp);
        setOffset(0);
        setSelected(null);
    };

    const copyFingerprint = async (fp: string) => {
        try {
            await navigator.clipboard.writeText(fp);
            setCopiedFingerprint(fp);
            setTimeout(() => setCopiedFingerprint(null), 2000);
        } catch {
            // clipboard tidak tersedia — diamkan
        }
    };

    // ─── 403 Forbidden ────────────────────────────────────────────────────────
    if (forbidden) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                        <ShieldAlert className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                        {t("platform.errorLogsPage.forbiddenTitle")}
                    </h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {t("platform.errorLogsPage.forbiddenMessage")}
                    </p>
                </div>
            </div>
        );
    }

    // ─── Loading skeleton ─────────────────────────────────────────────────────
    if (loading && items.length === 0 && !listError) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-4 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                    ))}
                </div>
                <div className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="h-96 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
            </div>
        );
    }

    // ─── Error state (tanpa data) ─────────────────────────────────────────────
    if (listError && items.length === 0 && !loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <XCircle className="h-12 w-12 text-red-500" />
                <p className="text-sm text-red-600 dark:text-red-400">
                    {t("platform.errorLogsPage.serverError")}
                </p>
                <button
                    onClick={handleRefresh}
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                    <RefreshCw className="h-4 w-4" />
                    {t("platform.errorLogsPage.retry")}
                </button>
            </div>
        );
    }

    const bySource = stats?.bySource;
    const sourceRows: { key: string; count: number }[] = [
        ...FILTER_SOURCES.map((s) => ({ key: s, count: bySource?.[s] ?? 0 })),
        ...((bySource?.route ?? 0) > 0 ? [{ key: "route", count: bySource?.route ?? 0 }] : []),
    ];
    const maxSourceCount = Math.max(1, ...sourceRows.map((r) => r.count));
    const sourceTotal = sourceRows.reduce((sum, r) => sum + r.count, 0);

    const windowStart = total === 0 ? 0 : offset + 1;
    const windowEnd = Math.min(offset + PAGE_LIMIT, total);
    const canPrev = offset > 0;
    const canNext = offset + PAGE_LIMIT < total;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t("platform.errorLogsPage.title")}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t("platform.errorLogsPage.subtitle")}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        {t("platform.errorLogsPage.autoRefresh")}
                    </label>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                        {t("platform.errorLogsPage.refresh")}
                    </button>
                </div>
            </div>

            {/* Error banner (refresh gagal tapi data lama masih ada) */}
            {listError && items.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                    {listError} — {t("platform.errorLogsPage.showingLast")}.
                </div>
            )}

            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                    label={t("platform.errorLogsPage.errors24h")}
                    value={stats?.totals.last24h.error ?? 0}
                    icon={XCircle}
                    iconWrapClass="bg-red-100 dark:bg-red-900/30"
                    iconClass="text-red-600 dark:text-red-400"
                />
                <StatCard
                    label={t("platform.errorLogsPage.warns24h")}
                    value={stats?.totals.last24h.warn ?? 0}
                    icon={AlertTriangle}
                    iconWrapClass="bg-yellow-100 dark:bg-yellow-900/30"
                    iconClass="text-yellow-600 dark:text-yellow-400"
                />
                <StatCard
                    label={t("platform.errorLogsPage.fatals24h")}
                    value={stats?.totals.last24h.fatal ?? 0}
                    icon={Flame}
                    iconWrapClass="bg-gray-900 dark:bg-gray-800"
                    iconClass="text-red-400"
                />
                <StatCard
                    label={t("platform.errorLogsPage.total7d")}
                    value={stats?.totals.last7d.all ?? 0}
                    icon={Activity}
                    iconWrapClass="bg-purple-100 dark:bg-purple-900/30"
                    iconClass="text-purple-600 dark:text-purple-400"
                />
            </div>

            {/* By Source + Top Repeating Errors */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* By Source */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t("platform.errorLogsPage.bySource")}
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        {sourceRows.every((r) => r.count === 0) ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t("platform.errorLogsPage.noData")}
                            </p>
                        ) : (
                            sourceRows.map((row) => {
                                const pct = sourceTotal > 0 ? Math.round((row.count / sourceTotal) * 100) : 0;
                                const widthPct = Math.round((row.count / maxSourceCount) * 100);
                                return (
                                    <div key={row.key}>
                                        <div className="mb-1 flex items-center justify-between">
                                            <SourceBadge source={row.key as ErrorLogSource} />
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                {row.count} ({pct}%)
                                            </span>
                                        </div>
                                        <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800">
                                            <div
                                                className={`h-2.5 rounded-full ${SOURCE_BAR_COLORS[row.key] || "bg-gray-400"}`}
                                                style={{ width: `${widthPct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Top Repeating Errors */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t("platform.errorLogsPage.topRepeating")}
                        </h2>
                    </div>
                    {stats && stats.topFingerprints.length === 0 ? (
                        <div className="px-6 py-8 text-center">
                            <Check className="mx-auto h-8 w-8 text-green-500" />
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                {t("platform.errorLogsPage.noTopErrors")}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {stats?.topFingerprints.map((fp) => (
                                <button
                                    key={fp.fingerprint}
                                    type="button"
                                    onClick={() => applyFingerprintFilter(fp.fingerprint)}
                                    className="flex w-full items-start gap-3 px-6 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                    title={t("platform.errorLogsPage.filterThisError")}
                                >
                                    <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                        {fp.count}×
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                                            {fp.message}
                                        </span>
                                        <span className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                            <SourceBadge source={fp.source} />
                                            {fp.route && (
                                                <span className="truncate font-mono">{fp.route}</span>
                                            )}
                                            <span className="ml-auto shrink-0 whitespace-nowrap">
                                                <Clock className="mr-1 inline h-3 w-3" />
                                                {formatShortTime(fp.lastSeen)}
                                            </span>
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Filter bar */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Days select */}
                    <select
                        value={days}
                        onChange={(e) => {
                            setDays(Number(e.target.value));
                            setOffset(0);
                        }}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        aria-label={t("platform.errorLogsPage.rangeLabel")}
                    >
                        {DAY_OPTIONS.map((d) => (
                            <option key={d} value={d}>
                                {d} {t("platform.errorLogsPage.daysUnit")}
                            </option>
                        ))}
                    </select>

                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

                    {/* Level chips */}
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {t("platform.errorLogsPage.levelLabel")}
                    </span>
                    {ALL_LEVELS.map((level) => (
                        <FilterChip key={level} active={levels.includes(level)} onClick={() => toggleLevel(level)}>
                            {level}
                        </FilterChip>
                    ))}

                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

                    {/* Source chips */}
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {t("platform.errorLogsPage.sourceLabel")}
                    </span>
                    {FILTER_SOURCES.map((source) => (
                        <FilterChip
                            key={source}
                            active={sources.includes(source)}
                            onClick={() => toggleSource(source)}
                        >
                            {source}
                        </FilterChip>
                    ))}

                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

                    {/* Search */}
                    <div className="relative min-w-[200px] flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setOffset(0);
                            }}
                            placeholder={t("platform.errorLogsPage.searchPlaceholder")}
                            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        />
                    </div>

                    {/* Active fingerprint filter */}
                    {fingerprint && (
                        <button
                            type="button"
                            onClick={() => {
                                setFingerprint(null);
                                setOffset(0);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-purple-300 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                            title={t("platform.errorLogsPage.clearFilters")}
                        >
                            <Filter className="h-3 w-3" />
                            {fingerprint}
                            <X className="h-3 w-3" />
                        </button>
                    )}

                    {/* Clear filters */}
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                        >
                            <X className="h-4 w-4" />
                            {t("platform.errorLogsPage.clearFilters")}
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t("platform.errorLogsPage.listTitle")}
                        <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                            ({total.toLocaleString()})
                        </span>
                    </h2>
                </div>

                {items.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Inbox className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                            {t("platform.errorLogsPage.empty")}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {t("platform.errorLogsPage.colTimestamp")}
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {t("platform.errorLogsPage.colLevel")}
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {t("platform.errorLogsPage.colSource")}
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {t("platform.errorLogsPage.colRoute")}
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {t("platform.errorLogsPage.colMessage")}
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {t("platform.errorLogsPage.colStatus")}
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {t("platform.errorLogsPage.colAction")}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {items.map((entry) => (
                                        <tr
                                            key={entry.id}
                                            onClick={() => setSelected(entry)}
                                            className="cursor-pointer transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                        >
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                {formatTime(entry.timestamp)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <LevelBadge level={entry.level} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <SourceBadge source={entry.source} />
                                            </td>
                                            <td className="max-w-[200px] px-4 py-3">
                                                <span
                                                    className="block truncate font-mono text-xs text-gray-600 dark:text-gray-400"
                                                    title={entry.route}
                                                >
                                                    {entry.route || "—"}
                                                </span>
                                            </td>
                                            <td className="max-w-[280px] px-4 py-3">
                                                <span
                                                    className="block truncate text-sm text-gray-700 dark:text-gray-300"
                                                    title={entry.message}
                                                >
                                                    {entry.message}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {entry.statusCode ? (
                                                    <StatusCodeBadge code={entry.statusCode} />
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelected(entry);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    {t("platform.errorLogsPage.detail")}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                            {items.map((entry) => (
                                <button
                                    key={entry.id}
                                    type="button"
                                    onClick={() => setSelected(entry)}
                                    className="block w-full p-4 text-left"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <LevelBadge level={entry.level} />
                                            <SourceBadge source={entry.source} />
                                        </div>
                                        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                                            {formatTime(entry.timestamp)}
                                        </span>
                                    </div>
                                    <p className="mt-2 truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                                        {entry.message}
                                    </p>
                                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        {entry.route && (
                                            <span className="truncate font-mono">{entry.route}</span>
                                        )}
                                        {entry.statusCode && <StatusCodeBadge code={entry.statusCode} />}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t("platform.errorLogsPage.showing")} {windowStart.toLocaleString()}–
                                {windowEnd.toLocaleString()} {t("platform.errorLogsPage.of")}{" "}
                                {total.toLocaleString()}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setOffset(Math.max(0, offset - PAGE_LIMIT))}
                                    disabled={!canPrev || loading}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    {t("platform.errorLogsPage.prev")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOffset(offset + PAGE_LIMIT)}
                                    disabled={!canNext || loading}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    {t("platform.errorLogsPage.next")}
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Detail Modal */}
            {selected && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setSelected(null)}
                >
                    <div
                        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-gray-900"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label={t("platform.errorLogsPage.modalTitle")}
                    >
                        {/* Modal Header */}
                        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {t("platform.errorLogsPage.modalTitle")}
                                </h3>
                                <div className="mt-1 flex items-center gap-2">
                                    <LevelBadge level={selected.level} />
                                    <SourceBadge source={selected.source} />
                                    {selected.statusCode && <StatusCodeBadge code={selected.statusCode} />}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelected(null)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                                aria-label={t("platform.errorLogsPage.close")}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="space-y-5 p-6">
                            {/* Message */}
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                    {t("platform.errorLogsPage.colMessage")}
                                </p>
                                <p className="mt-1 break-words text-sm text-gray-800 dark:text-gray-200">
                                    {selected.message}
                                </p>
                            </div>

                            {/* Details grid */}
                            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                        {t("platform.errorLogsPage.colTimestamp")}
                                    </p>
                                    <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">
                                        {formatFullTime(selected.timestamp)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                        {t("platform.errorLogsPage.colRoute")}
                                    </p>
                                    <p className="mt-0.5 break-all font-mono text-sm text-gray-700 dark:text-gray-300">
                                        {selected.route || "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                        {t("platform.errorLogsPage.tenantId")}
                                    </p>
                                    <p className="mt-0.5 break-all font-mono text-sm text-gray-700 dark:text-gray-300">
                                        {selected.tenantId || "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                        {t("platform.errorLogsPage.errorCode")}
                                    </p>
                                    <p className="mt-0.5 break-all font-mono text-sm text-gray-700 dark:text-gray-300">
                                        {selected.errorCode || "—"}
                                    </p>
                                </div>
                            </div>

                            {/* Stack trace */}
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                    {t("platform.errorLogsPage.stackTrace")}
                                </p>
                                {selected.stack ? (
                                    <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-xs whitespace-pre-wrap break-all text-gray-800 dark:bg-gray-950 dark:text-gray-300">
                                        {selected.stack}
                                    </pre>
                                ) : (
                                    <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                                        {t("platform.errorLogsPage.noStack")}
                                    </p>
                                )}
                            </div>

                            {/* Meta */}
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                    {t("platform.errorLogsPage.meta")}
                                </p>
                                {selected.meta && Object.keys(selected.meta).length > 0 ? (
                                    <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-gray-50 p-3 text-xs whitespace-pre-wrap break-all text-gray-800 dark:bg-gray-950 dark:text-gray-300">
                                        {JSON.stringify(selected.meta, null, 2)}
                                    </pre>
                                ) : (
                                    <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                                        {t("platform.errorLogsPage.noMeta")}
                                    </p>
                                )}
                            </div>

                            {/* Fingerprint + actions */}
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                    {t("platform.errorLogsPage.fingerprint")}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <code className="rounded bg-white px-2 py-1 font-mono text-sm text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                                        {selected.fingerprint}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={() => copyFingerprint(selected.fingerprint)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                                        title={t("platform.errorLogsPage.copyFingerprint")}
                                    >
                                        {copiedFingerprint === selected.fingerprint ? (
                                            <Check className="h-3.5 w-3.5 text-green-500" />
                                        ) : (
                                            <Copy className="h-3.5 w-3.5" />
                                        )}
                                        {copiedFingerprint === selected.fingerprint
                                            ? t("platform.errorLogsPage.copied")
                                            : t("platform.errorLogsPage.copyFingerprint")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyFingerprintFilter(selected.fingerprint)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-purple-700"
                                    >
                                        <Filter className="h-3.5 w-3.5" />
                                        {t("platform.errorLogsPage.filterThisError")}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                            <button
                                onClick={() => setSelected(null)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t("platform.errorLogsPage.close")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
