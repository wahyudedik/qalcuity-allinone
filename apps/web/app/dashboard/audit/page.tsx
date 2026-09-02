'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { PlusCircle, Pencil, Trash2, Eye, Search } from 'lucide-react'

type AuditLog = {
    id: string
    userName: string
    userInitials: string
    action: string
    entity: string
    entityId: string | null
    description: string
    details: string | null
    ipAddress: string
    timestamp: string
}

const actionConfig: Record<string, { bg: string; text: string; icon: string }> = {
    CREATE: { bg: 'bg-green-100', text: 'text-green-700', icon: 'plus-circle' },
    UPDATE: { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'pencil' },
    DELETE: { bg: 'bg-red-100', text: 'text-red-700', icon: 'trash-2' },
    READ: { bg: 'bg-gray-100', text: 'text-gray-700', icon: 'eye' },
}

const modules = ['all', 'Invoice', 'Deal', 'Lead', 'Contact', 'Product', 'Employee', 'Payment', 'Quotation', 'PurchaseOrder']
const actions = ['all', 'CREATE', 'UPDATE', 'DELETE']

const moduleLabels: Record<string, string> = {
    all: 'Semua',
    Invoice: 'Finance',
    Deal: 'Sales',
    Lead: 'CRM',
    Contact: 'CRM',
    Product: 'Inventory',
    Employee: 'HR',
    Payment: 'Finance',
    Quotation: 'Finance',
    PurchaseOrder: 'Finance',
}

const actionLabels: Record<string, string> = {
    all: 'Semua',
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
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (selectedModule !== 'all') params.set('entity', selectedModule)
            if (selectedAction !== 'all') params.set('action', selectedAction)
            if (search) params.set('search', search)
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
    }, [selectedModule, selectedAction, search, page])

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    // Reset page when filters change
    useEffect(() => {
        setPage(1)
    }, [selectedModule, selectedAction, search])

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

    // Count by action for stats
    const createCount = logs.filter(l => l.action === 'CREATE').length
    const updateCount = logs.filter(l => l.action === 'UPDATE').length
    const deleteCount = logs.filter(l => l.action === 'DELETE').length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('audit.title')}</h1>
                    <p className="text-gray-600 mt-1">{t('audit.subtitle')}</p>
                </div>
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
                            <option key={m} value={m}>Modul: {moduleLabels[m] || m}</option>
                        ))}
                    </select>
                    <select
                        value={selectedAction}
                        onChange={(e) => setSelectedAction(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                    >
                        {actions.map(a => (
                            <option key={a} value={a}>Aksi: {actionLabels[a] || a}</option>
                        ))}
                    </select>
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
                            <p className="text-lg text-gray-400"><Eye className="w-6 h-6 mx-auto" /></p>
                            <p className="mt-2">{t('audit.empty')}</p>
                            <p className="text-sm mt-1">{t('audit.emptyDescription')}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {logs.map((log) => {
                                const colorConfig = actionConfig[log.action] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: 'eye' }
                                return (
                                    <div key={log.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-start gap-4">
                                            {/* Avatar */}
                                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                                                {log.userInitials}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium text-gray-900">{log.userName}</span>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorConfig.bg} ${colorConfig.text}`}>
                                                        {log.action}
                                                    </span>
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                        {moduleLabels[log.entity] || log.entity}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 mt-1">{log.description}</p>
                                                {log.details && (
                                                    <p className="text-xs text-gray-500 mt-1">{log.details}</p>
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
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {t('audit.previous')}
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {t('audit.next')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
