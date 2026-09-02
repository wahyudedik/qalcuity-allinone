"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Building2,
    CreditCard,
    Users,
    Activity,
    TrendingUp,
    TrendingDown,
    ArrowRight,
    Clock,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlatformStats {
    totalTenants: number;
    activeTenants: number;
    totalUsers: number;
    mrr: number;
    mrrGrowth: number;
    systemHealth: "healthy" | "degraded" | "down";
    apiLatency: number;
    errorRate: number;
    uptime: number;
}

interface RecentActivity {
    id: string;
    type: "tenant_created" | "tenant_suspended" | "payment_received" | "support_ticket" | "security_event";
    message: string;
    timestamp: string;
    tenant?: string;
}

// ─── Mock Data (akan diganti dengan API call) ─────────────────────────────────
const mockStats: PlatformStats = {
    totalTenants: 47,
    activeTenants: 42,
    totalUsers: 312,
    mrr: 234500000, // Rp 234.5 juta
    mrrGrowth: 12.3,
    systemHealth: "healthy",
    apiLatency: 145,
    errorRate: 0.12,
    uptime: 99.97,
};

const mockActivities: RecentActivity[] = [
    {
        id: "1",
        type: "tenant_created",
        message: "Tenant baru terdaftar",
        timestamp: "2 menit lalu",
        tenant: "PT Maju Bersama",
    },
    {
        id: "2",
        type: "payment_received",
        message: "Pembayaran diterima",
        timestamp: "15 menit lalu",
        tenant: "CV Sejahtera",
    },
    {
        id: "3",
        type: "support_ticket",
        message: "Tiket support baru",
        timestamp: "1 jam lalu",
        tenant: "PT Digital Nusantara",
    },
    {
        id: "4",
        type: "security_event",
        message: "Login dari IP baru",
        timestamp: "2 jam lalu",
        tenant: "PT Global Tech",
    },
    {
        id: "5",
        type: "tenant_suspended",
        message: "Tenant ditangguhkan (belum bayar)",
        timestamp: "3 jam lalu",
        tenant: "CV Mitra Jaya",
    },
];

// ─── Helper: Format Currency ──────────────────────────────────────────────────
function formatRupiah(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

// ─── Helper: Activity Icon ────────────────────────────────────────────────────
function ActivityIcon({ type }: { type: RecentActivity["type"] }) {
    switch (type) {
        case "tenant_created":
            return <Building2 className="h-4 w-4 text-green-500" />;
        case "tenant_suspended":
            return <XCircle className="h-4 w-4 text-red-500" />;
        case "payment_received":
            return <CreditCard className="h-4 w-4 text-blue-500" />;
        case "support_ticket":
            return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
        case "security_event":
            return <AlertTriangle className="h-4 w-4 text-orange-500" />;
        default:
            return <Activity className="h-4 w-4 text-gray-500" />;
    }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlatformDashboardPage() {
    const [stats, setStats] = useState<PlatformStats>(mockStats);
    const [activities, setActivities] = useState<RecentActivity[]>(mockActivities);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Simulate data fetch
    useEffect(() => {
        const timer = setTimeout(() => {
            setStats(mockStats);
            setActivities(mockActivities);
            setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        // TODO: Replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
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
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Platform Overview
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Monitoring dan manajemen seluruh tenant Qalcuity
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Tenants */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Total Tenants
                            </p>
                            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                                {stats.totalTenants}
                            </p>
                            <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                                {stats.activeTenants} aktif
                            </p>
                        </div>
                        <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30">
                            <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                </div>

                {/* MRR */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Monthly Recurring Revenue
                            </p>
                            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                                {formatRupiah(stats.mrr)}
                            </p>
                            <div className="mt-1 flex items-center gap-1">
                                {stats.mrrGrowth >= 0 ? (
                                    <TrendingUp className="h-3 w-3 text-green-500" />
                                ) : (
                                    <TrendingDown className="h-3 w-3 text-red-500" />
                                )}
                                <p className={`text-xs ${stats.mrrGrowth >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                    {stats.mrrGrowth >= 0 ? "+" : ""}{stats.mrrGrowth}% dari bulan lalu
                                </p>
                            </div>
                        </div>
                        <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
                            <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </div>

                {/* Total Users */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Total Users
                            </p>
                            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                                {stats.totalUsers}
                            </p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                rata-rata {Math.round(stats.totalUsers / stats.totalTenants)} per tenant
                            </p>
                        </div>
                        <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
                            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </div>

                {/* System Health */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                System Health
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    Healthy
                                </p>
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Uptime: {stats.uptime}%
                            </p>
                        </div>
                        <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
                            <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Two Column Layout: Activity + Quick Actions */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Recent Activity — 2 columns */}
                <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Recent Activity
                        </h2>
                        <Link
                            href="/platform/monitoring"
                            className="text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
                        >
                            View All
                        </Link>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {activities.map((activity) => (
                            <div
                                key={activity.id}
                                className="flex items-center gap-4 px-6 py-3"
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                                    <ActivityIcon type={activity.type} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {activity.message}
                                    </p>
                                    {activity.tenant && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {activity.tenant}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                    <Clock className="h-3 w-3" />
                                    {activity.timestamp}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions + System Metrics */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Quick Actions
                            </h2>
                        </div>
                        <div className="p-4 space-y-2">
                            <Link
                                href="/platform/tenants"
                                className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                <span className="flex items-center gap-3">
                                    <Building2 className="h-4 w-4 text-purple-500" />
                                    Kelola Tenants
                                </span>
                                <ArrowRight className="h-4 w-4 text-gray-400" />
                            </Link>
                            <Link
                                href="/platform/billing"
                                className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                <span className="flex items-center gap-3">
                                    <CreditCard className="h-4 w-4 text-green-500" />
                                    Billing & Payments
                                </span>
                                <ArrowRight className="h-4 w-4 text-gray-400" />
                            </Link>
                            <Link
                                href="/platform/support"
                                className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                <span className="flex items-center gap-3">
                                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                    Support Tickets
                                </span>
                                <ArrowRight className="h-4 w-4 text-gray-400" />
                            </Link>
                            <Link
                                href="/platform/security"
                                className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                <span className="flex items-center gap-3">
                                    <Activity className="h-4 w-4 text-blue-500" />
                                    Security Events
                                </span>
                                <ArrowRight className="h-4 w-4 text-gray-400" />
                            </Link>
                        </div>
                    </div>

                    {/* System Metrics */}
                    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                System Metrics
                            </h2>
                        </div>
                        <div className="p-4 space-y-4">
                            {/* API Latency */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        API Latency
                                    </span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {stats.apiLatency}ms
                                    </span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                                    <div
                                        className="h-2 rounded-full bg-green-500"
                                        style={{ width: `${Math.min((stats.apiLatency / 500) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Error Rate */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        Error Rate
                                    </span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {stats.errorRate}%
                                    </span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                                    <div
                                        className="h-2 rounded-full bg-yellow-500"
                                        style={{ width: `${Math.min(stats.errorRate * 10, 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Uptime */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        Uptime
                                    </span>
                                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                        {stats.uptime}%
                                    </span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                                    <div
                                        className="h-2 rounded-full bg-green-500"
                                        style={{ width: `${stats.uptime}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
