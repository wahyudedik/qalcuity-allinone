'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import {
    Clock,
    Search,
    Loader2,
    AlertCircle,
    Inbox,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Ban,
    RotateCw,
    Copy,
    Trash2,
    MoreHorizontal,
    ChevronLeft,
    ChevronRight,
    Code,
    Eye,
} from 'lucide-react'

/* ============================================
   TYPES
   ============================================ */

interface QueryHistoryItem {
    id: string
    userId: string
    userName: string | null
    queryType: string
    sql: string
    visualConfig: string | null
    datasetId: string | null
    datasetName: string | null
    executionMs: number
    rowsReturned: number
    rowsScanned: number | null
    status: string
    errorMessage: string | null
    fromCache: boolean
    createdAt: string
}

interface Pagination {
    page: number
    limit: number
    total: number
    totalPages: number
}

interface HistoryResponse {
    success: boolean
    data: QueryHistoryItem[]
    pagination: Pagination
}

/* ============================================
   HELPERS
   ============================================ */

function getStatusConfig(status: string): { color: string; bg: string; icon: typeof CheckCircle2; label: string } {
    switch (status) {
        case 'SUCCESS':
            return { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle2, label: 'Success' }
        case 'FAILED':
            return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', icon: XCircle, label: 'Failed' }
        case 'TIMEOUT':
            return { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', icon: AlertTriangle, label: 'Timeout' }
        case 'BLOCKED':
            return { color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700', icon: Ban, label: 'Blocked' }
        default:
            return { color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700', icon: AlertCircle, label: status }
    }
}

function getQueryTypeColor(type: string): string {
    switch (type) {
        case 'SQL': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        case 'VISUAL': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        case 'AI': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
        case 'DASHBOARD': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
        case 'KPI': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
        default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
    }
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
}

function timeAgo(dateStr: string): string {
    const now = new Date()
    const date = new Date(dateStr)
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
}

function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

/* ============================================
   MAIN PAGE
   ============================================ */

export default function HistoryPage() {
    const { t } = useTranslation()
    const [histories, setHistories] = useState<QueryHistoryItem[]>([])
    const [pagination, setPagination] = useState<Pagination | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [actionMenuId, setActionMenuId] = useState<string | null>(null)

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            params.set('page', String(page))
            params.set('limit', '20')
            if (statusFilter !== 'all') params.set('status', statusFilter)
            if (typeFilter !== 'all') params.set('queryType', typeFilter)
            const res = await fetch(`/api/analytics/query-history?${params}`)
            const json: HistoryResponse = await res.json()
            if (!res.ok || !json.success) {
                throw new Error(t('analytics.errors.loadFailed'))
            }
            setHistories(json.data)
            setPagination(json.pagination)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [page, statusFilter, typeFilter])

    useEffect(() => {
        fetchHistory()
    }, [fetchHistory])

    /* ---------- Delete ---------- */
    const deleteHistory = async (id: string) => {
        if (!confirm(t('analytics.history.deleteConfirm'))) return
        try {
            const res = await fetch(`/api/analytics/query-history/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete')
            setHistories(prev => prev.filter(h => h.id !== id))
            setActionMenuId(null)
        } catch {
            setError(t('analytics.errors.deleteFailed'))
        }
    }

    const statusFilters = ['all', 'SUCCESS', 'FAILED', 'TIMEOUT', 'BLOCKED'] as const
    const typeFilters = ['all', 'SQL', 'VISUAL', 'AI', 'DASHBOARD', 'KPI'] as const

    /* ---------- Stats ---------- */
    const totalQueries = pagination?.total || histories.length
    const successCount = histories.filter(h => h.status === 'SUCCESS').length
    const failedCount = histories.filter(h => h.status === 'FAILED').length
    const avgDuration = histories.length > 0
        ? Math.round(histories.reduce((sum, h) => sum + h.executionMs, 0) / histories.length)
        : 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('analytics.history.title')}</h1>
                <p className="text-gray-500 dark:text-gray-400">{t('analytics.history.subtitle')}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Queries</span>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{totalQueries}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Success</span>
                    <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{successCount}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Failed</span>
                    <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{failedCount}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Avg Duration</span>
                    <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{formatDuration(avgDuration)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                {/* Status Filter */}
                <div className="flex flex-wrap gap-1.5">
                    {statusFilters.map((status) => (
                        <button
                            key={status}
                            onClick={() => { setStatusFilter(status); setPage(1) }}
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === status
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                }`}
                        >
                            {status === 'all' ? t('analytics.common.all') : (t(`analytics.history.status.${status}`) || status)}
                        </button>
                    ))}
                </div>
                {/* Type Filter */}
                <div className="flex flex-wrap gap-1.5">
                    {typeFilters.map((type) => (
                        <button
                            key={type}
                            onClick={() => { setTypeFilter(type); setPage(1) }}
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${typeFilter === type
                                    ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
                                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
                                }`}
                        >
                            {type === 'all' ? t('analytics.common.all') : (t(`analytics.history.types.${type}`) || type)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse dark:bg-gray-700" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                                    <div className="h-3 w-64 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                                </div>
                                <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse dark:bg-gray-700" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && histories.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-gray-800">
                    <Inbox className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {t('analytics.history.empty.title')}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {t('analytics.history.empty.description')}
                    </p>
                </div>
            )}

            {/* History List */}
            {!loading && !error && histories.length > 0 && (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('analytics.common.status')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Dataset</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('analytics.history.executionTime')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('analytics.history.rowsReturned')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Cache</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('common.date')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {histories.map((item) => {
                                        const statusConfig = getStatusConfig(item.status)
                                        const StatusIcon = statusConfig.icon
                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                                                        <StatusIcon className="h-3 w-3" />
                                                        {t(`analytics.history.status.${item.status}`) || item.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getQueryTypeColor(item.queryType)}`}>
                                                        {t(`analytics.history.types.${item.queryType}`) || item.queryType}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                    {item.datasetName || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                    {formatDuration(item.executionMs)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                    {item.rowsReturned.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {item.fromCache && (
                                                        <span className="inline-block rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                            Cache
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                    {timeAgo(item.createdAt)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                                            className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                            title="View SQL"
                                                        >
                                                            <Code className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setActionMenuId(actionMenuId === item.id ? null : item.id)}
                                                            className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Cards */}
                    <div className="space-y-3 md:hidden">
                        {histories.map((item) => {
                            const statusConfig = getStatusConfig(item.status)
                            const StatusIcon = statusConfig.icon
                            return (
                                <div
                                    key={item.id}
                                    className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                                                <StatusIcon className="h-3 w-3" />
                                                {t(`analytics.history.status.${item.status}`) || item.status}
                                            </span>
                                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getQueryTypeColor(item.queryType)}`}>
                                                {item.queryType}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(item.createdAt)}</span>
                                    </div>
                                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400 text-xs">Dataset</span>
                                            <p className="text-gray-900 dark:text-gray-100">{item.datasetName || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400 text-xs">{t('analytics.history.executionTime')}</span>
                                            <p className="text-gray-900 dark:text-gray-100">{formatDuration(item.executionMs)}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400 text-xs">{t('analytics.history.rowsReturned')}</span>
                                            <p className="text-gray-900 dark:text-gray-100">{item.rowsReturned.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    {item.errorMessage && (
                                        <p className="mt-2 text-xs text-red-600 dark:text-red-400 line-clamp-2">{item.errorMessage}</p>
                                    )}
                                    <div className="mt-3 flex items-center gap-2">
                                        <button
                                            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                        >
                                            <Code className="h-3 w-3" />
                                            {t('analytics.history.sql')}
                                        </button>
                                        <button
                                            onClick={() => deleteHistory(item.id)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:border-gray-600 dark:text-red-400 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Expanded SQL View */}
                    {expandedId && (() => {
                        const item = histories.find(h => h.id === expandedId)
                        if (!item) return null
                        return (
                            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{t('analytics.history.sql')}</h3>
                                    <button
                                        onClick={() => setExpandedId(null)}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </button>
                                </div>
                                <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-sm text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                                    <code>{item.sql}</code>
                                </pre>
                                {item.errorMessage && (
                                    <div className="mt-3 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                                        <p className="text-sm text-red-700 dark:text-red-400">{item.errorMessage}</p>
                                    </div>
                                )}
                            </div>
                        )
                    })()}

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    {t('analytics.common.previous')}
                                </button>
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {pagination.page} / {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                    disabled={page >= pagination.totalPages}
                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    {t('analytics.common.next')}
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
