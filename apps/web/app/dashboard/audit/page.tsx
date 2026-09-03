'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { Search, ChevronDown, ChevronRight, Download, Calendar, X, Eye } from 'lucide-react'

type AuditLog = {
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

const actionConfig: Record<string, { bg: string; text: string; label: string }> = {
    CREATE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Pembuatan' },
    UPDATE: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pembaruan' },
    DELETE: { bg: 'bg-red-100', text: 'text-red-700', label: 'Penghapusan' },
    READ: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pembacaan' },
    TEST: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Testing' },
}

const modules = ['all', 'Invoice', 'Deal', 'Lead', 'Contact', 'Product', 'Employee', 'Payment', 'Quotation', 'PurchaseOrder']
const actions = ['all', 'CREATE', 'UPDATE', 'DELETE']

const moduleLabels: Record<string, string> = {
    all: 'Semua Modul',
    Invoice: 'Finance',
    Deal: 'Sales',
    Lead: 'CRM',
    Contact: 'CRM',
    Product: 'Inventory',
    Employee: 'HR',
    Payment: 'Finance',
    Quotation: 'Finance',
    PurchaseOrder: 'Finance',
    TenantNotificationSettings: 'Settings',
    TenantIntegration: 'Settings',
}

const actionLabels: Record<string, string> = {
    all: 'Semua Aksi',
    CREATE: 'Pembuatan',
    UPDATE: 'Pembaruan',
    DELETE: 'Penghapusan',
}

export default function AuditPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const { t } = useTranslation()
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedModule, setSelectedModule] = useState('all')
    const [selectedAction, setSelectedAction] = useState('all')
    const [search, setSearch] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (selectedModule !== 'all') params.set('entity', selectedModule)
            if (selectedAction !== 'all') params.set('action', selectedAction)
            if (search) params.set('search', search)
            if (dateFrom) params.set('dateFrom', dateFrom)
            if (dateTo) params.set('dateTo', dateTo)
            params.set('page', page.toString())
            params.set('limit', '20')

            const response = await fetch(`/api/audit/logs?${params.toString()}`)
            const data = await response.json()
            if (data.success) {
                setLogs(data.data)
                setTotalPages(data.totalPages)
                setTotal(data.total)
            } else {
                setError(t('audit.loadError'))
            }
        } catch {
            setError(t('audit.networkError'))
        } finally {
            setLoading(false)
        }
    }, [selectedModule, selectedAction, search, page, dateFrom, dateTo])

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    // Reset page when filters change
    useEffect(() => {
        setPage(1)
    }, [selectedModule, selectedAction, search, dateFrom, dateTo])

    // ─── Role Check: Hanya ADMIN+ yang bisa mengakses Audit Trail ─────────────
    useEffect(() => {
        if (status === 'loading') return
        const role = session?.user?.role
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            router.push('/dashboard')
        }
    }, [session, status, router])

    if (status === 'loading') {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="h-64 bg-gray-200 rounded-xl"></div>
                </div>
            </div>
        )
    }

    const role = session?.user?.role
    if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
        return null
    }

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))

        if (hours < 1) return t('audit.justNow')
        if (hours < 24) return `${hours} ${t('audit.hoursAgo')}`

        const days = Math.floor(hours / 24)
        if (days === 1) return t('audit.yesterday')
        if (days < 7) return `${days} ${t('audit.daysAgo')}`
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const formatTimestampFull = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        })
    }

    // Parse JSON details for display
    const parseDetails = (jsonStr: string | null): Record<string, unknown> | null => {
        if (!jsonStr) return null
        try {
            return JSON.parse(jsonStr)
        } catch {
            return null
        }
    }

    // Export to CSV
    const exportCSV = () => {
        const headers = ['Timestamp', 'User', 'Action', 'Entity', 'Entity ID', 'Description', 'IP Address', 'Details']
        const rows = logs.map(log => [
            formatTimestampFull(log.timestamp),
            log.userName,
            log.action,
            log.entity,
            log.entityId || '',
            log.description,
            log.ipAddress,
            log.details || '',
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n')

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`
        link.click()
        URL.revokeObjectURL(link.href)
    }

    // Count by action for stats
    const createCount = logs.filter(l => l.action === 'CREATE').length
    const updateCount = logs.filter(l => l.action === 'UPDATE').length
    const deleteCount = logs.filter(l => l.action === 'DELETE').length

    const hasActiveFilters = selectedModule !== 'all' || selectedAction !== 'all' || search || dateFrom || dateTo

    const clearFilters = () => {
        setSelectedModule('all')
        setSelectedAction('all')
        setSearch('')
        setDateFrom('')
        setDateTo('')
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('audit.title')}</h1>
                    <p className="text-gray-600 mt-1">{t('audit.subtitle')}</p>
                </div>
                <button
                    onClick={exportCSV}
                    disabled={logs.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download className="w-4 h-4" />
                    Export CSV
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">{t('audit.totalActivity')}</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{total}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">{t('audit.creation')}</div>
                    <div className="text-2xl font-bold text-green-600 mt-1">{createCount}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">{t('audit.updateAction')}</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">{updateCount}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">{t('audit.deletion')}</div>
                    <div className="text-2xl font-bold text-red-600 mt-1">{deleteCount}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col gap-4">
                    {/* Row 1: Search + Module + Action */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('audit.searchPlaceholder')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <select
                            value={selectedModule}
                            onChange={(e) => setSelectedModule(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                        >
                            {modules.map(m => (
                                <option key={m} value={m}>{moduleLabels[m] || m}</option>
                            ))}
                        </select>
                        <select
                            value={selectedAction}
                            onChange={(e) => setSelectedAction(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                        >
                            {actions.map(a => (
                                <option key={a} value={a}>{actionLabels[a] || a}</option>
                            ))}
                        </select>
                    </div>
                    {/* Row 2: Date Range */}
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
                            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                placeholder="Dari tanggal"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                            <span className="text-gray-400 text-sm">—</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                placeholder="Sampai tanggal"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                        </div>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Reset Filter
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-gray-500 mt-4">{t('audit.loading')}</p>
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={fetchLogs}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        {t('audit.retry')}
                    </button>
                </div>
            )}

            {/* Audit Log List */}
            {!loading && !error && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {logs.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Eye className="w-6 h-6 mx-auto text-gray-400" />
                            <p className="mt-2">{t('audit.empty')}</p>
                            <p className="text-sm mt-1">{t('audit.emptyDescription')}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {logs.map((log) => {
                                const colorConfig = actionConfig[log.action] || { bg: 'bg-gray-100', text: 'text-gray-700', label: log.action }
                                const isExpanded = expandedId === log.id
                                const details = parseDetails(log.details)
                                const oldVals = parseDetails(log.oldValues)

                                return (
                                    <div key={log.id}>
                                        <div
                                            className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Expand/Collapse Icon */}
                                                <button className="mt-1 flex-shrink-0 text-gray-400 hover:text-gray-600">
                                                    {isExpanded ? (
                                                        <ChevronDown className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4" />
                                                    )}
                                                </button>

                                                {/* Avatar */}
                                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                                                    {log.userInitials}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-medium text-gray-900">{log.userName}</span>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorConfig.bg} ${colorConfig.text}`}>
                                                            {colorConfig.label}
                                                        </span>
                                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                            {moduleLabels[log.entity] || log.entity}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 mt-1">{log.description}</p>
                                                    {log.details && !isExpanded && (
                                                        <p className="text-xs text-gray-500 mt-1 truncate max-w-md">{log.details}</p>
                                                    )}
                                                </div>

                                                {/* Timestamp */}
                                                <div className="text-right flex-shrink-0">
                                                    <div className="text-sm text-gray-500">{formatTimestamp(log.timestamp)}</div>
                                                    {log.ipAddress && log.ipAddress !== '-' && (
                                                        <div className="text-xs text-gray-400 mt-0.5">IP: {log.ipAddress}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Detail View */}
                                        {isExpanded && (
                                            <div className="px-6 pb-4 pt-2 bg-gray-50 border-t border-gray-100">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-10">
                                                    {/* Left: Metadata */}
                                                    <div className="space-y-2">
                                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Detail Aktivitas</h4>
                                                        <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">Waktu</span>
                                                                <span className="text-gray-900 font-medium">{formatTimestampFull(log.timestamp)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">User</span>
                                                                <span className="text-gray-900">{log.userName}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">Aksi</span>
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorConfig.bg} ${colorConfig.text}`}>
                                                                    {log.action}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">Modul</span>
                                                                <span className="text-gray-900">{log.entity}</span>
                                                            </div>
                                                            {log.entityId && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-500">Entity ID</span>
                                                                    <span className="text-gray-900 font-mono text-xs">{log.entityId}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">IP Address</span>
                                                                <span className="text-gray-900 font-mono text-xs">{log.ipAddress}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right: Changes */}
                                                    <div className="space-y-2">
                                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Perubahan Data</h4>
                                                        {details ? (
                                                            <div className="bg-white rounded-lg border border-gray-200 p-3">
                                                                {log.action === 'UPDATE' && oldVals ? (
                                                                    <div className="space-y-2">
                                                                        {Object.keys(details).map(key => (
                                                                            <div key={key} className="text-sm">
                                                                                <div className="font-medium text-gray-700 capitalize">{key}</div>
                                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                                    <span className="text-red-600 line-through text-xs bg-red-50 px-1.5 py-0.5 rounded">
                                                                                        {String(oldVals[key] ?? '-')}
                                                                                    </span>
                                                                                    <span className="text-gray-400">→</span>
                                                                                    <span className="text-green-600 text-xs bg-green-50 px-1.5 py-0.5 rounded">
                                                                                        {String(details[key] ?? '-')}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                                                                        {JSON.stringify(details, null, 2)}
                                                                    </pre>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="bg-white rounded-lg border border-gray-200 p-3 text-sm text-gray-500 italic">
                                                                Tidak ada detail perubahan tersedia
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                {t('audit.pagination').replace('{page}', String(page)).replace('{totalPages}', String(totalPages)).replace('{count}', String(total))}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(1)}
                                    disabled={page === 1}
                                    className="px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {'«'}
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {t('audit.previous')}
                                </button>
                                <span className="px-3 py-1.5 text-sm text-gray-700 font-medium bg-gray-50 rounded">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {t('audit.next')}
                                </button>
                                <button
                                    onClick={() => setPage(totalPages)}
                                    disabled={page === totalPages}
                                    className="px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {'»'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
