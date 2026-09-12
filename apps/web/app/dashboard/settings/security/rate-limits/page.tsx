'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { formatDateTime } from '@/lib/utils'
import {
    Shield, Activity, AlertTriangle, Globe, Clock,
    RefreshCw, Server, Ban, CheckCircle2, TrendingUp,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RateLimitSummary {
    totalRequests: number
    totalBlocked: number
    uniqueIPs: number
    blockRate: number
    topIPs: Array<{ ip: string; count: number }>
    topRoutes: Array<{ endpoint: string; count: number }>
    timeRange: { from: string; to: string }
}

interface RecentViolation {
    id: string
    ip: string
    endpoint: string
    requestCount: number
    blocked: boolean
    createdAt: string
}

interface ConfigRule {
    name: string
    maxRequests: number
    windowMs: number
    description: string
}

interface RateLimitData {
    summary: RateLimitSummary
    realtime: { todayViolations: number; todayBlocked: number; redisAvailable: boolean }
    redis: { available: boolean; latencyMs?: number }
    recent: RecentViolation[]
    config: {
        default: { maxRequests: number; windowMs: number }
        rules: ConfigRule[]
        skipPaths: string[]
    }
}

type Period = '1h' | '24h' | '7d'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatWindow(ms: number): string {
    if (ms >= 3600000) return `${ms / 3600000} jam`
    if (ms >= 60000) return `${ms / 60000} menit`
    return `${ms / 1000} detik`
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RateLimitsPage() {
    const { t } = useTranslation()
    const [data, setData] = useState<RateLimitData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [period, setPeriod] = useState<Period>('24h')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch(`/api/admin/rate-limits?period=${period}&limit=50`)
            if (!res.ok) {
                if (res.status === 403) {
                    setError('Anda tidak memiliki akses ke halaman ini. Hanya ADMIN yang dapat mengakses.')
                } else {
                    setError('Gagal memuat data rate limit.')
                }
                return
            }
            const json = await res.json()
            if (json.success) {
                setData(json.data)
            } else {
                setError('Gagal memuat data rate limit.')
            }
        } catch {
            setError('Gagal terhubung ke server.')
        } finally {
            setLoading(false)
        }
    }, [period])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleCleanup = async () => {
        try {
            const res = await fetch('/api/admin/rate-limits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ retentionDays: 30 }),
            })
            const json = await res.json()
            if (json.success) {
                setToast({ message: json.data.message, type: 'success' })
                fetchData()
            } else {
                setToast({ message: 'Gagal melakukan cleanup.', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal terhubung ke server.', type: 'error' })
        }
    }

    // ─── Loading State ──────────────────────────────────────────────────────

    if (loading && !data) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                    ))}
                </div>
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            </div>
        )
    }

    // ─── Error State ────────────────────────────────────────────────────────

    if (error && !data) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Shield className="h-7 w-7 text-purple-600" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Rate Limit Monitor
                    </h1>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Coba Lagi
                    </button>
                </div>
            </div>
        )
    }

    const summary = data?.summary
    const recent = data?.recent || []
    const config = data?.config
    const realtime = data?.realtime

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${toast.type === 'success'
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
                        <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Rate Limit Monitor
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Pantau dan analisis rate limit hits di production
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Period Selector */}
                    <div className="flex rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                        {(['1h', '24h', '7d'] as Period[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${period === p
                                        ? 'bg-purple-600 text-white'
                                        : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={handleCleanup}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                        <Ban className="h-4 w-4" />
                        Cleanup Old Logs
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Requests */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                            <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Total Requests</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {summary?.totalRequests?.toLocaleString() ?? 0}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Blocked Requests */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
                            <Ban className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Blocked Requests</p>
                            <p className="text-lg font-bold text-red-600 dark:text-red-400">
                                {summary?.totalBlocked?.toLocaleString() ?? 0}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Block Rate */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
                            <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Block Rate</p>
                            <p className={`text-lg font-bold ${(summary?.blockRate ?? 0) > 10
                                    ? 'text-red-600 dark:text-red-400'
                                    : (summary?.blockRate ?? 0) > 5
                                        ? 'text-orange-600 dark:text-orange-400'
                                        : 'text-green-600 dark:text-green-400'
                                }`}>
                                {summary?.blockRate?.toFixed(1) ?? '0.0'}%
                            </p>
                        </div>
                    </div>
                </div>

                {/* Unique IPs */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                            <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Unique IPs</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {summary?.uniqueIPs ?? 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Redis & Realtime Status */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <Server className="h-5 w-5 text-gray-500" />
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Redis Backend</p>
                            <div className="flex items-center gap-2">
                                {data?.redis?.available ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                )}
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {data?.redis?.available ? 'Connected' : 'In-Memory Fallback'}
                                </span>
                                {data?.redis?.latencyMs !== undefined && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        ({data.redis.latencyMs}ms)
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-gray-500" />
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Hari Ini</p>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {realtime?.todayViolations ?? 0} violations terdeteksi
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Rate Limit Hits - Desktop Table */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Recent Rate Limit Hits
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {recent.length} entries terbaru
                    </p>
                </div>

                {recent.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <CheckCircle2 className="h-12 w-12 text-green-400 mb-3" />
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Tidak ada rate limit hits</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Semua request dalam batas normal</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            IP Address
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Endpoint
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Requests
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Timestamp
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {recent.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-mono text-gray-900 dark:text-white">
                                                    {entry.ip}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {entry.endpoint}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {entry.requestCount}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {entry.blocked ? (
                                                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                        Blocked
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                        Violated
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    {formatDateTime(entry.createdAt)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                            {recent.map((entry) => (
                                <div key={entry.id} className="p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                                            {entry.ip}
                                        </span>
                                        {entry.blocked ? (
                                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                Blocked
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                Violated
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                        {entry.endpoint}
                                    </p>
                                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                        <span>{entry.requestCount} requests</span>
                                        <span>{formatDateTime(entry.createdAt)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Top Offenders & Top Routes - Side by Side */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Top Offending IPs */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Top Offending IPs
                        </h2>
                    </div>
                    {(!summary?.topIPs || summary.topIPs.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Globe className="h-8 w-8 text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada data</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {summary.topIPs.map((item, idx) => {
                                const pct = summary.totalRequests > 0
                                    ? Math.round((item.count / summary.totalRequests) * 10000) / 100
                                    : 0
                                return (
                                    <div key={item.ip} className="flex items-center justify-between px-6 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-medium text-gray-400 w-5">{idx + 1}</span>
                                            <span className="text-sm font-mono text-gray-900 dark:text-white">{item.ip}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">{item.count}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">{pct}%</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Top Routes */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Top Routes
                        </h2>
                    </div>
                    {(!summary?.topRoutes || summary.topRoutes.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Activity className="h-8 w-8 text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada data</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {summary.topRoutes.map((item, idx) => {
                                const pct = summary.totalRequests > 0
                                    ? Math.round((item.count / summary.totalRequests) * 10000) / 100
                                    : 0
                                return (
                                    <div key={item.endpoint} className="flex items-center justify-between px-6 py-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-xs font-medium text-gray-400 w-5">{idx + 1}</span>
                                            <span className="text-sm text-gray-900 dark:text-white truncate">{item.endpoint}</span>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">{item.count}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">{pct}%</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Configuration Table */}
            {config && (
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Rate Limit Configuration
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Konfigurasi rate limit saat ini per endpoint group
                        </p>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Group
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Max Requests
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Window
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Description
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {/* Default rule */}
                                <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                                    <td className="px-6 py-3">
                                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                            default
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">
                                        {config.default.maxRequests}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">
                                        {formatWindow(config.default.windowMs)}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                                        Default rule untuk unmatched endpoints
                                    </td>
                                </tr>
                                {/* Named rules */}
                                {config.rules.map((rule) => (
                                    <tr key={rule.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-6 py-3">
                                            <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                {rule.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">
                                            {rule.maxRequests}
                                        </td>
                                        <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {formatWindow(rule.windowMs)}
                                        </td>
                                        <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                                            {rule.description}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                        <div className="p-4 space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                    default
                                </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                {config.default.maxRequests} requests / {formatWindow(config.default.windowMs)}
                            </p>
                        </div>
                        {config.rules.map((rule) => (
                            <div key={rule.name} className="p-4 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                        {rule.name}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {rule.maxRequests} requests / {formatWindow(rule.windowMs)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {rule.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Skip Paths */}
            {config?.skipPaths && config.skipPaths.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        Skipped Paths (Rate Limiting Disabled)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {config.skipPaths.map((path) => (
                            <span
                                key={path}
                                className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-mono text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            >
                                {path}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
