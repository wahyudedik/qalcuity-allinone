'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { formatDateTime } from '@/lib/utils'
import {
    History, Search, Filter, ChevronLeft, ChevronRight,
    Loader2, RefreshCw, Eye, User, Clock, Globe,
    AlertTriangle, ArrowDownCircle, ArrowUpCircle, Edit3,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type AuditLogEntry = {
    id: string
    userId: string
    userName: string
    userInitials: string
    action: string
    entity: string
    entityId: string | null
    description: string
    details: string | null
    oldValues: string | null
    ipAddress: string
    timestamp: string
}

type PaginationInfo = {
    page: number
    limit: number
    total: number
    totalPages: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getActionIcon(action: string) {
    switch (action) {
        case 'CREATE': return <ArrowUpCircle className="h-4 w-4 text-green-600" />
        case 'UPDATE': return <Edit3 className="h-4 w-4 text-blue-600" />
        case 'DELETE': return <ArrowDownCircle className="h-4 w-4 text-red-600" />
        default: return <History className="h-4 w-4 text-gray-500" />
    }
}

function getActionBadgeColor(action: string) {
    switch (action) {
        case 'CREATE': return 'bg-green-100 text-green-800'
        case 'UPDATE': return 'bg-blue-100 text-blue-800'
        case 'DELETE': return 'bg-red-100 text-red-800'
        default: return 'bg-gray-100 text-gray-800'
    }
}

function getEntityBadgeColor(entity: string) {
    switch (entity) {
        case 'Invoice': return 'bg-purple-100 text-purple-800'
        case 'Payment': return 'bg-emerald-100 text-emerald-800'
        case 'Contact': return 'bg-indigo-100 text-indigo-800'
        case 'Deal': return 'bg-amber-100 text-amber-800'
        case 'Lead': return 'bg-cyan-100 text-cyan-800'
        case 'Product': return 'bg-orange-100 text-orange-800'
        case 'PurchaseOrder': return 'bg-pink-100 text-pink-800'
        case 'Employee': return 'bg-teal-100 text-teal-800'
        case 'JournalEntry': return 'bg-lime-100 text-lime-800'
        case 'Quotation': return 'bg-violet-100 text-violet-800'
        default: return 'bg-gray-100 text-gray-700'
    }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AuditLogPage() {
    const { t } = useTranslation()

    // Data state
    const [logs, setLogs] = useState<AuditLogEntry[]>([])
    const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 25, total: 0, totalPages: 0 })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filter state
    const [search, setSearch] = useState('')
    const [entityFilter, setEntityFilter] = useState('all')
    const [actionFilter, setActionFilter] = useState('all')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    // Detail modal state
    const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
    const [showDetail, setShowDetail] = useState(false)

    // ─── Fetch Audit Logs ─────────────────────────────────────────────────────

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            params.set('page', String(page))
            params.set('limit', String(pagination.limit))
            if (search) params.set('search', search)
            if (entityFilter !== 'all') params.set('entity', entityFilter)
            if (actionFilter !== 'all') params.set('action', actionFilter)
            if (dateFrom) params.set('dateFrom', dateFrom)
            if (dateTo) params.set('dateTo', dateTo)

            const res = await fetch(`/api/audit/logs?${params.toString()}`)
            if (!res.ok) throw new Error('Gagal memuat audit log')

            const json = await res.json()
            if (!json.success) throw new Error(json.error || 'Gagal memuat audit log')

            setLogs(json.data || [])
            setPagination({
                page: json.page || 1,
                limit: json.limit || 25,
                total: json.total || 0,
                totalPages: json.totalPages || 0,
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
        } finally {
            setLoading(false)
        }
    }, [pagination.limit, search, entityFilter, actionFilter, dateFrom, dateTo])

    useEffect(() => {
        fetchLogs(1)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleFilter = () => {
        fetchLogs(1)
    }

    const handleResetFilter = () => {
        setSearch('')
        setEntityFilter('all')
        setActionFilter('all')
        setDateFrom('')
        setDateTo('')
    }

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchLogs(newPage)
        }
    }

    const openDetail = (log: AuditLogEntry) => {
        setSelectedLog(log)
        setShowDetail(true)
    }

    // Unique entity list for filter dropdown
    const entityOptions = [
        'Invoice', 'Payment', 'Contact', 'Deal', 'Lead', 'Product',
        'PurchaseOrder', 'Quotation', 'Employee', 'JournalEntry', 'User',
    ]

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <History className="h-6 w-6 text-blue-600" />
                    {t('settings.audit.title') || 'Audit Log'}
                </h2>
                <p className="text-gray-600 mt-1">
                    {t('settings.audit.desc') || 'Catatan aktivitas perubahan data di seluruh sistem'}
                </p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Filter</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Entity filter */}
                    <select
                        value={entityFilter}
                        onChange={(e) => setEntityFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">Semua Entitas</option>
                        {entityOptions.map((entity) => (
                            <option key={entity} value={entity}>{entity}</option>
                        ))}
                    </select>

                    {/* Action filter */}
                    <select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">Semua Aksi</option>
                        <option value="CREATE">CREATE</option>
                        <option value="UPDATE">UPDATE</option>
                        <option value="DELETE">DELETE</option>
                    </select>

                    {/* Date from */}
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        title="Tanggal Mulai"
                    />

                    {/* Date to */}
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        title="Tanggal Akhir"
                    />
                </div>
                <div className="flex items-center gap-2 mt-3">
                    <button
                        onClick={handleFilter}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        Terapkan Filter
                    </button>
                    <button
                        onClick={handleResetFilter}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                        Reset
                    </button>
                    <button
                        onClick={() => fetchLogs(pagination.page)}
                        className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                        title="Muat Ulang"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-gray-500 ml-auto">
                        {pagination.total.toLocaleString()} total entri
                    </span>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                    <button
                        onClick={() => fetchLogs(pagination.page)}
                        className="ml-auto text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                        Coba Lagi
                    </button>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="bg-white rounded-xl border border-gray-200 p-8">
                    <div className="flex flex-col items-center justify-center">
                        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
                        <p className="text-sm text-gray-500">Memuat audit log...</p>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && logs.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-8">
                    <div className="flex flex-col items-center text-center">
                        <History className="h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Audit Log</h3>
                        <p className="text-gray-600">
                            Aktivitas perubahan data akan tercatat di sini.
                        </p>
                    </div>
                </div>
            )}

            {/* Desktop Table */}
            {!loading && logs.length > 0 && (
                <>
                    <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Waktu</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Entitas</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Detail</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">IP Address</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                                                    {formatDateTime(log.timestamp)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                                                        {log.userInitials}
                                                    </div>
                                                    <span className="font-medium">{log.userName}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(log.action)}`}>
                                                    {getActionIcon(log.action)}
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEntityBadgeColor(log.entity)}`}>
                                                    {log.entity}
                                                </span>
                                                {log.entityId && (
                                                    <span className="text-xs text-gray-400 ml-1.5">#{log.entityId.slice(0, 8)}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 max-w-[250px] truncate">
                                                {log.description}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <Globe className="h-3.5 w-3.5 text-gray-400" />
                                                    {log.ipAddress}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => openDetail(log)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Lihat Detail"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {logs.map((log) => (
                            <div key={log.id} className="bg-white rounded-xl border border-gray-200 p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                                            {log.userInitials}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                                            <div className="text-xs text-gray-500">{formatDateTime(log.timestamp)}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => openDetail(log)}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(log.action)}`}>
                                        {getActionIcon(log.action)}
                                        {log.action}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getEntityBadgeColor(log.entity)}`}>
                                        {log.entity}
                                    </span>
                                    {log.entityId && (
                                        <span className="text-xs text-gray-400">#{log.entityId.slice(0, 8)}</span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 truncate">{log.description}</p>
                                <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                                    <Globe className="h-3 w-3" />
                                    {log.ipAddress}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
                            <div className="text-sm text-gray-600">
                                Halaman {pagination.page} dari {pagination.totalPages}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    const start = Math.max(1, pagination.page - 2)
                                    const pageNum = start + i
                                    if (pageNum > pagination.totalPages) return null
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => handlePageChange(pageNum)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${pageNum === pagination.page
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-gray-600 hover:bg-gray-50 border border-gray-300'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    )
                                })}
                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.totalPages}
                                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Detail Modal */}
            {showDetail && selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDetail(false)}>
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Detail Audit Log</h3>
                            <button
                                onClick={() => setShowDetail(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                            >
                                &times;
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">Waktu</label>
                                    <p className="text-sm text-gray-900 mt-0.5">{formatDateTime(selectedLog.timestamp)}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">User</label>
                                    <p className="text-sm text-gray-900 mt-0.5 flex items-center gap-2">
                                        <User className="h-3.5 w-3.5 text-gray-400" />
                                        {selectedLog.userName}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">Aksi</label>
                                    <p className="mt-0.5">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(selectedLog.action)}`}>
                                            {getActionIcon(selectedLog.action)}
                                            {selectedLog.action}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">Entitas</label>
                                    <p className="mt-0.5">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEntityBadgeColor(selectedLog.entity)}`}>
                                            {selectedLog.entity}
                                        </span>
                                        {selectedLog.entityId && (
                                            <span className="text-xs text-gray-400 ml-1.5">#{selectedLog.entityId.slice(0, 8)}</span>
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">IP Address</label>
                                    <p className="text-sm text-gray-900 mt-0.5 flex items-center gap-1">
                                        <Globe className="h-3.5 w-3.5 text-gray-400" />
                                        {selectedLog.ipAddress}
                                    </p>
                                </div>
                            </div>

                            {/* New Values */}
                            {selectedLog.details && (
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">Nilai Baru (JSON)</label>
                                    <pre className="mt-1 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-all">
                                        {(() => {
                                            try {
                                                return JSON.stringify(JSON.parse(selectedLog.details), null, 2)
                                            } catch {
                                                return selectedLog.details
                                            }
                                        })()}
                                    </pre>
                                </div>
                            )}

                            {/* Old Values */}
                            {selectedLog.oldValues && (
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">Nilai Lama (JSON)</label>
                                    <pre className="mt-1 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-all">
                                        {(() => {
                                            try {
                                                return JSON.stringify(JSON.parse(selectedLog.oldValues), null, 2)
                                            } catch {
                                                return selectedLog.oldValues
                                            }
                                        })()}
                                    </pre>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-200">
                            <button
                                onClick={() => setShowDetail(false)}
                                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
