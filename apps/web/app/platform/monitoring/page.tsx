"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SystemHealth {
    status: "healthy" | "degraded" | "down";
    uptime: number;
    apiLatency: number;
    errorRate: number;
    requestsPerMinute: number;
    activeConnections: number;
    dbConnections: number;
    dbLatency: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    lastDeploy: string;
}

interface ServiceStatus {
    name: string;
    status: "operational" | "degraded" | "down";
    latency: number;
    uptime: number;
}

interface RecentIncident {
    id: string;
    title: string;
    severity: "critical" | "high" | "medium" | "low";
    status: "investigating" | "identified" | "monitoring" | "resolved";
    startedAt: string;
    resolvedAt?: string;
    description: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mockHealth: SystemHealth = {
    status: "healthy",
    uptime: 99.97,
    apiLatency: 145,
    errorRate: 0.12,
    requestsPerMinute: 2450,
    activeConnections: 189,
    dbConnections: 42,
    dbLatency: 12,
    memoryUsage: 67,
    cpuUsage: 34,
    diskUsage: 45,
    lastDeploy: "31 Agustus 2026, 14:30",
};

const mockServices: ServiceStatus[] = [
    { name: "API Gateway", status: "operational", latency: 45, uptime: 99.99 },
    { name: "Authentication", status: "operational", latency: 23, uptime: 99.99 },
    { name: "Database (PostgreSQL)", status: "operational", latency: 12, uptime: 99.98 },
    { name: "File Storage", status: "operational", latency: 89, uptime: 99.95 },
    { name: "Email Service", status: "degraded", latency: 234, uptime: 99.80 },
    { name: "Payment Gateway", status: "operational", latency: 156, uptime: 99.97 },
    { name: "CDN", status: "operational", latency: 18, uptime: 99.99 },
    { name: "Cron Jobs", status: "operational", latency: 0, uptime: 99.95 },
];

const mockIncidents: RecentIncident[] = [
    {
        id: "i1",
        title: "Email Service Latency Increased",
        severity: "medium",
        status: "monitoring",
        startedAt: "1 Sep 2026, 08:00",
        description: "Email delivery latency meningkat dari 50ms ke 234ms. Tim sedang investigation.",
    },
    {
        id: "i2",
        title: "Database Connection Pool Exhausted",
        severity: "critical",
        status: "resolved",
        startedAt: "31 Ags 2026, 14:00",
        resolvedAt: "31 Ags 2026, 14:15",
        description: "Connection pool mencapai limit karena traffic spike. Pool size ditingkatkan.",
    },
    {
        id: "i3",
        title: "API Rate Limiting Triggered",
        severity: "low",
        status: "resolved",
        startedAt: "30 Ags 2026, 10:00",
        resolvedAt: "30 Ags 2026, 10:30",
        description: "Beberapa tenant mencapai rate limit. Normalized setelah traffic menurun.",
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

function SeverityBadge({ severity }: { severity: RecentIncident["severity"] }) {
    const colors = {
        critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
        medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[severity]}`}>
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
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
                <div className={`h-2 rounded-full ${color}`} style={{ width: `${value}%` }} />
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlatformMonitoringPage() {
    const [health, setHealth] = useState<SystemHealth>(mockHealth);
    const [services, setServices] = useState<ServiceStatus[]>(mockServices);
    const [incidents, setIncidents] = useState<RecentIncident[]>(mockIncidents);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await new Promise((r) => setTimeout(r, 1000));
        setRefreshing(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        System Monitoring
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Real-time system health dan performance metrics
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Overall Status */}
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    <div>
                        <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                            All Systems Operational
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                            Uptime: {health.uptime}% · Last deploy: {health.lastDeploy}
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                            <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">API Latency</p>
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
                            <p className="text-xs text-gray-500 dark:text-gray-400">Requests/min</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{health.requestsPerMinute.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
                            <Wifi className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Connections</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{health.activeConnections}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/30">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Error Rate</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{health.errorRate}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Services + Resources */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Services Status */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Services Status
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
                            Resource Usage
                        </h2>
                    </div>
                    <div className="p-6 space-y-5">
                        <UsageBar label="CPU" value={health.cpuUsage} icon={Cpu} />
                        <UsageBar label="Memory" value={health.memoryUsage} icon={HardDrive} />
                        <UsageBar label="Disk" value={health.diskUsage} icon={Server} />
                        <UsageBar label="DB Connections" value={Math.round((health.dbConnections / 100) * 100)} icon={Database} />
                    </div>
                </div>
            </div>

            {/* Recent Incidents */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Recent Incidents
                    </h2>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {incidents.map((incident) => (
                        <div key={incident.id} className="px-6 py-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {incident.title}
                                        </h3>
                                        <SeverityBadge severity={incident.severity} />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        {incident.description}
                                    </p>
                                </div>
                                <div className="text-right ml-4">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                        incident.status === "resolved"
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    }`}>
                                        {incident.status}
                                    </span>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        {incident.startedAt}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
