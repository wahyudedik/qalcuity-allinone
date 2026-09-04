"use client";

import { useState, useEffect } from "react";
import {
    Shield,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    RefreshCw,
    Eye,
    Lock,
    Unlock,
    UserX,
    Globe,
    Key,
    Activity,
    Filter,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SecurityEvent {
    id: string;
    type: "login_success" | "login_failed" | "password_change" | "role_change" | "tenant_suspend" | "api_key_created" | "data_export" | "suspicious_activity";
    severity: "critical" | "high" | "medium" | "low";
    user: string;
    tenant: string;
    description: string;
    ipAddress: string;
    userAgent: string;
    timestamp: string;
}

interface SecurityStats {
    totalEvents: number;
    criticalEvents: number;
    failedLogins: number;
    activeSessions: number;
    lastIncident: string;
}

// ─── API Data ────────────────────────────────────────────────────────────────
// Events are now fetched from /api/platform/security/events

// ─── Helpers ──────────────────────────────────────────────────────────────────
function EventIcon({ type }: { type: SecurityEvent["type"] }) {
    switch (type) {
        case "login_success":
            return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case "login_failed":
            return <XCircle className="h-4 w-4 text-red-500" />;
        case "password_change":
            return <Key className="h-4 w-4 text-blue-500" />;
        case "role_change":
            return <UserX className="h-4 w-4 text-orange-500" />;
        case "tenant_suspend":
            return <Lock className="h-4 w-4 text-red-500" />;
        case "api_key_created":
            return <Key className="h-4 w-4 text-purple-500" />;
        case "data_export":
            return <Activity className="h-4 w-4 text-yellow-500" />;
        case "suspicious_activity":
            return <AlertTriangle className="h-4 w-4 text-red-600" />;
        default:
            return <Shield className="h-4 w-4 text-gray-500" />;
    }
}

function SeverityBadge({ severity }: { severity: SecurityEvent["severity"] }) {
    const colors = {
        critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
        medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[severity]}`}>
            {severity}
        </span>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlatformSecurityPage() {
    const [stats, setStats] = useState<SecurityStats>({
        totalEvents: 0,
        criticalEvents: 0,
        failedLogins: 0,
        activeSessions: 0,
        lastIncident: "-",
    });
    const [events, setEvents] = useState<SecurityEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterSeverity, setFilterSeverity] = useState<string>("all");
    const [filterType, setFilterType] = useState<string>("all");
    const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (filterSeverity !== "all") params.set("severity", filterSeverity);
                if (filterType !== "all") params.set("type", filterType);
                if (searchQuery) params.set("search", searchQuery);

                const res = await fetch(`/api/platform/security/events?${params.toString()}`);
                const data = await res.json();
                if (data.success) {
                    setEvents(data.data.events);
                    setStats(data.data.stats);
                }
            } catch {
                // Graceful fallback — keep empty state
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, [filterSeverity, filterType, searchQuery]);

    const filteredEvents = events.filter((e) => {
        const matchSearch = searchQuery === "" ||
            e.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.tenant.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchSeverity = filterSeverity === "all" || e.severity === filterSeverity;
        const matchType = filterType === "all" || e.type === filterType;
        return matchSearch && matchSeverity && matchType;
    });

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
                        Security Events
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Monitoring aktivitas keamanan seluruh platform
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Total Events</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalEvents}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
                            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Critical</p>
                            <p className="text-lg font-bold text-red-600 dark:text-red-400">{stats.criticalEvents}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
                            <XCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Failed Logins</p>
                            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats.failedLogins}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                            <Eye className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Active Sessions</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.activeSessions}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                            <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Last Incident</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{stats.lastIncident}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari event..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                </div>
                <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-purple-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                    <option value="all">Semua Severity</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-purple-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                    <option value="all">Semua Type</option>
                    <option value="login_success">Login Success</option>
                    <option value="login_failed">Login Failed</option>
                    <option value="password_change">Password Change</option>
                    <option value="role_change">Role Change</option>
                    <option value="suspicious_activity">Suspicious Activity</option>
                    <option value="data_export">Data Export</option>
                    <option value="api_key_created">API Key Created</option>
                    <option value="tenant_suspend">Tenant Suspend</option>
                </select>
            </div>

            {/* Events Table (Desktop) */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Event
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                User
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Tenant
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Severity
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                IP Address
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Time
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredEvents.map((event) => (
                            <tr
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            >
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <EventIcon type={event.type} />
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {event.description}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {event.user}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {event.tenant}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <SeverityBadge severity={event.severity} />
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                                        {event.ipAddress}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {event.timestamp}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Events Cards (Mobile) */}
            <div className="space-y-3 md:hidden">
                {filteredEvents.map((event) => (
                    <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                                <EventIcon type={event.type} />
                                <SeverityBadge severity={event.severity} />
                            </div>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                {event.timestamp}
                            </span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {event.description}
                        </p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span>{event.user}</span>
                            <span>·</span>
                            <span>{event.tenant}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty */}
            {filteredEvents.length === 0 && (
                <div className="rounded-xl border border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-900">
                    <Shield className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                        Tidak ada event ditemukan
                    </p>
                </div>
            )}

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-gray-900">
                        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Security Event Detail
                                </h2>
                                <div className="mt-1 flex items-center gap-2">
                                    <SeverityBadge severity={selectedEvent.severity} />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {selectedEvent.timestamp}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</p>
                                <p className="text-sm text-gray-900 dark:text-gray-100">{selectedEvent.description}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">User</p>
                                    <p className="text-sm text-gray-900 dark:text-gray-100">{selectedEvent.user}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Tenant</p>
                                    <p className="text-sm text-gray-900 dark:text-gray-100">{selectedEvent.tenant}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">IP Address</p>
                                    <p className="text-sm font-mono text-gray-900 dark:text-gray-100">{selectedEvent.ipAddress}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">User Agent</p>
                                    <p className="text-sm text-gray-900 dark:text-gray-100">{selectedEvent.userAgent}</p>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
