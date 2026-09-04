"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";
import {
    Activity,
    Server,
    Database,
    Globe,
    Clock,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    RefreshCw,
    Cpu,
    HardDrive,
    Wifi,
    Zap,
    Users,
    FileText,
    Shield,
    TrendingUp,
    ArrowDownRight,
    ArrowUpRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SystemHealth {
    status: "healthy" | "degraded" | "down";
    uptime: number;
    apiLatency: number;
    errorRate: number;
    requestsPerMinute: number;
    activeSessions: number;
    lastChecked: string;
}

interface DatabaseMetrics {
    totalTenants: number;
    activeTenants: number;
    totalUsers: number;
    activeUsersToday: number;
    totalInvoices: number;
    invoicesLastHour: number;
    totalAuditLogs: number;
    auditLogsLastHour: number;
}

interface ServiceStatus {
    name: string;
    status: "operational" | "degraded" | "down";
    latency: number;
    uptime: number;
}

interface RecentAlert {
    id: string;
    action: string;
    entity: string;
    entityId: string;
    ipAddress: string;
    createdAt: string;
}

interface SubscriptionDist {
    status: string;
    count: number;
}

interface MonitoringData {
    systemHealth: SystemHealth;
    database: DatabaseMetrics;
    services: ServiceStatus[];
    recentAlerts: RecentAlert[];
    subscriptionDistribution: SubscriptionDist[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleString("id-ID", {
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

function StatusDot({ status }: { status: "operational" | "degraded" | "down" }) {
    switch (status) {
        case "operational":
            return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case "degraded":
            return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
        case "down":
            return <XCircle className="h-4 w-4 text-red-500" />;
    }
}

function HealthStatusBadge({ status }: { status: string }) {
    switch (status) {
        case "healthy":
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Healthy
                </span>
            );
        case "degraded":
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <AlertTriangle className="h-4 w-4" />
                    Degraded
                </span>
            );
        case "down":
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <XCircle className="h-4 w-4" />
                    Down
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                    Unknown
                </span>
            );
    }
}

function AlertActionBadge({ action }: { action: string }) {
    const upper = action.toUpperCase();
    let colors = "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    if (upper.includes("ERROR")) {
        colors = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    } else if (upper.includes("FAILED")) {
        colors = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    } else if (upper.includes("SUSPENDED")) {
        colors = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    }
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors}`}>
            {action}
        </span>
    );
}

function UsageBar({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
    const color = value > 80 ? "bg-red-500" : value > 60 ? "bg-yellow-500" : "bg-green-500";
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{value}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlatformMonitoringPage() {
    const { t } = useTranslation();
    const [data, setData] = useState<MonitoringData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);

    const fetchMonitoring = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        setError(null);
        try {
            const res = await fetch("/api/platform/monitoring");
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const json = await res.json();
            if (json.success && json.data) {
                setData(json.data);
            } else {
                throw new Error(json.error || "Failed to fetch monitoring data");
            }
        } catch (err) {
            console.error("[Monitoring Fetch Error]", err);
            setError(err instanceof Error ? err.message : "Failed to load monitoring data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchMonitoring();
    }, [fetchMonitoring]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            fetchMonitoring(true);
        }, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchMonitoring]);

    const handleRefresh = () => {
        fetchMonitoring(true);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Loading skeleton */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-4 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="h-80 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                    <div className="h-80 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                </div>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <XCircle className="h-12 w-12 text-red-500" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                <button
                    onClick={handleRefresh}
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                    <RefreshCw className="h-4 w-4" />
                    {t('platform.monitoringPage.retry')}
                </button>
            </div>
        );
    }

    const health = data?.systemHealth;
    const db = data?.database;
    const services = data?.services || [];
    const alerts = data?.recentAlerts || [];
    const subDist = data?.subscriptionDistribution || [];

    // Calculate estimated resource usage from DB metrics
    const estimatedCpu = health ? Math.min(95, Math.round(health.requestsPerMinute / 30)) : 0;
    const estimatedMemory = db ? Math.min(95, Math.round((db.totalAuditLogs / 10000) * 100)) : 0;
    const estimatedDisk = db ? Math.min(95, Math.round((db.totalInvoices / 500) * 100)) : 0;
    const estimatedDbConn = db ? Math.min(100, Math.round((db.activeTenants / Math.max(db.totalTenants, 1)) * 100)) : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t('platform.monitoringPage.title')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('platform.monitoringPage.subtitle')}
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
                        {t('platform.monitoringPage.autoRefresh')}
                    </label>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                        {t('platform.monitoringPage.refresh')}
                    </button>
                </div>
            </div>

            {/* Error banner (if data exists but refresh failed) */}
            {error && data && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                    {error} — {t('platform.monitoringPage.showingLast')}.
                </div>
            )}

            {/* Overall Status Banner */}
            {health && (
                <div className={`rounded-xl border p-4 ${health.status === "healthy"
                    ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                    : health.status === "degraded"
                        ? "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20"
                        : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {health.status === "healthy" ? (
                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                            ) : health.status === "degraded" ? (
                                <AlertTriangle className="h-6 w-6 text-yellow-500" />
                            ) : (
                                <XCircle className="h-6 w-6 text-red-500" />
                            )}
                            <div>
                                <p className={`text-sm font-semibold ${health.status === "healthy"
                                    ? "text-green-800 dark:text-green-300"
                                    : health.status === "degraded"
                                        ? "text-yellow-800 dark:text-yellow-300"
                                        : "text-red-800 dark:text-red-300"
                                    }`}>
                                    {health.status === "healthy"
                                        ? t('platform.monitoringPage.allOperational')
                                        : health.status === "degraded"
                                            ? t('platform.monitoringPage.degraded')
                                            : t('platform.monitoringPage.down')
                                    }
                                </p>
                                <p className={`text-xs ${health.status === "healthy"
                                    ? "text-green-600 dark:text-green-400"
                                    : health.status === "degraded"
                                        ? "text-yellow-600 dark:text-yellow-400"
                                        : "text-red-600 dark:text-red-400"
                                    }`}>
                                    Uptime: {health.uptime}% · Last checked: {formatTime(health.lastChecked)}
                                </p>
                            </div>
                        </div>
                        <HealthStatusBadge status={health.status} />
                    </div>
                </div>
            )}

            {/* Quick Stats */}
            {health && (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                                <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('platform.monitoringPage.apiLatency')}</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{health.apiLatency}ms</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                                <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('platform.monitoringPage.requestsPerMinute')}</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{health.requestsPerMinute.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
                                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('platform.monitoringPage.activeSessions')}</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{health.activeSessions}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                        <div className="flex items-center gap-3">
                            <div className={`rounded-lg p-2 ${health.errorRate > 5
                                ? "bg-red-100 dark:bg-red-900/30"
                                : "bg-yellow-100 dark:bg-yellow-900/30"
                                }`}>
                                <AlertTriangle className={`h-5 w-5 ${health.errorRate > 5
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-yellow-600 dark:text-yellow-400"
                                    }`} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('platform.monitoringPage.errorRate')}</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{health.errorRate}%</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Services + Resources + DB Metrics */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Services Status */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t('platform.monitoringPage.services')}
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {services.map((service) => (
                            <div key={service.name} className="flex items-center justify-between px-6 py-3">
                                <div className="flex items-center gap-3">
                                    <StatusDot status={service.status} />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {service.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    {service.latency > 0 && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {service.latency}ms
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {service.uptime}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Resource Usage */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t('platform.monitoringPage.resources')}
                        </h2>
                    </div>
                    <div className="p-6 space-y-5">
                        <UsageBar label={t('platform.monitoringPage.cpuEstimated')} value={estimatedCpu} icon={Cpu} />
                        <UsageBar label={t('platform.monitoringPage.memoryEstimated')} value={estimatedMemory} icon={HardDrive} />
                        <UsageBar label={t('platform.monitoringPage.diskEstimated')} value={estimatedDisk} icon={Server} />
                        <UsageBar label={t('platform.monitoringPage.dbConnectionPool')} value={estimatedDbConn} icon={Database} />
                    </div>
                </div>
            </div>

            {/* Database Metrics + Subscription Distribution */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Database Metrics */}
                {db && (
                    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {t('platform.monitoringPage.dbMetrics')}
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-blue-500" />
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('platform.monitoringPage.totalTenants')}</span>
                                    </div>
                                    <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{db.totalTenants}</p>
                                    <p className="text-xs text-green-600 dark:text-green-400">{db.activeTenants} {t('platform.monitoringPage.activeLabel')}</p>
                                </div>
                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-purple-500" />
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('platform.monitoringPage.totalUsers')}</span>
                                    </div>
                                    <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{db.totalUsers}</p>
                                    <p className="text-xs text-green-600 dark:text-green-400">{db.activeUsersToday} {t('platform.monitoringPage.activeToday')}</p>
                                </div>
                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-green-500" />
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('platform.monitoringPage.invoices')}</span>
                                    </div>
                                    <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{db.totalInvoices.toLocaleString()}</p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400">+{db.invoicesLastHour} {t('platform.monitoringPage.lastHour')}</p>
                                </div>
                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-orange-500" />
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('platform.monitoringPage.auditLogs')}</span>
                                    </div>
                                    <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{db.totalAuditLogs.toLocaleString()}</p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400">+{db.auditLogsLastHour} {t('platform.monitoringPage.lastHour')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Subscription Distribution */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t('platform.monitoringPage.subscriptionDist')}
                        </h2>
                    </div>
                    <div className="p-6">
                        {subDist.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('platform.monitoringPage.noSubscriptionData')}</p>
                        ) : (
                            <div className="space-y-3">
                                {subDist.map((item) => {
                                    const total = subDist.reduce((sum, s) => sum + s.count, 0);
                                    const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                                    const statusColors: Record<string, string> = {
                                        ACTIVE: "bg-green-500",
                                        TRIAL: "bg-blue-500",
                                        SUSPENDED: "bg-yellow-500",
                                        CANCELLED: "bg-red-500",
                                        PENDING: "bg-gray-400",
                                    };
                                    const barColor = statusColors[item.status] || "bg-gray-400";
                                    return (
                                        <div key={item.status}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {item.status}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    {item.count} ({pct}%)
                                                </span>
                                            </div>
                                            <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800">
                                                <div
                                                    className={`h-2.5 rounded-full ${barColor}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Alerts / Errors */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('platform.monitoringPage.recentAlerts')}
                    </h2>
                </div>
                {alerts.length === 0 ? (
                    <div className="px-6 py-8 text-center">
                        <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {t('platform.monitoringPage.noAlerts')}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {t('platform.monitoringPage.action')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {t('platform.monitoringPage.entity')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {t('platform.monitoringPage.entityId')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {t('platform.monitoringPage.ipAddress')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {t('platform.monitoringPage.time')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {alerts.map((alert) => (
                                        <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="px-6 py-3">
                                                <AlertActionBadge action={alert.action} />
                                            </td>
                                            <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                {alert.entity}
                                            </td>
                                            <td className="px-6 py-3 text-sm font-mono text-gray-500 dark:text-gray-400">
                                                {alert.entityId ? alert.entityId.substring(0, 8) + "..." : "-"}
                                            </td>
                                            <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                {alert.ipAddress || "-"}
                                            </td>
                                            <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                {formatTime(alert.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                            {alerts.map((alert) => (
                                <div key={alert.id} className="p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <AlertActionBadge action={alert.action} />
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatTime(alert.createdAt)}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        {alert.entity}
                                        {alert.entityId && (
                                            <span className="ml-1 font-mono text-xs text-gray-400">
                                                ({alert.entityId.substring(0, 8)}...)
                                            </span>
                                        )}
                                    </div>
                                    {alert.ipAddress && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            IP: {alert.ipAddress}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
