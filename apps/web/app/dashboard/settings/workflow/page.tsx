'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import {
    GitBranch,
    Loader2,
    CheckCircle,
    X,
    ChevronDown,
    ChevronRight,
    ArrowRight,
    Settings,
    ClipboardCheck,
    Clock,
    Check,
    XCircle,
    History,
    Filter,
} from 'lucide-react'
import { formatDateTime, formatCurrency } from '@/lib/utils'

type WorkflowDef = {
    id: string
    tenantId: string
    entityType: string
    name: string
    description: string | null
    config: {
        states: string[]
        transitions: { from: string; to: string; action: string; requiredRole?: string }[]
        initialState: string
        finalStates: string[]
    }
    isSystem: boolean
    isActive: boolean
    createdAt: string
    updatedAt: string
}

type ApprovalHistoryItem = {
    id: string
    entityType: string
    entityId: string
    entityDisplay?: string
    entityAmount?: number | null
    currentLevel: number
    status: string
    requestedBy: string
    requesterName?: string
    resolvedBy?: string | null
    resolverName?: string | null
    comments?: string | null
    requestedAt: string
    resolvedAt?: string | null
    createdAt: string
}

type TabType = 'workflows' | 'history'

const ENTITY_LABELS: Record<string, string> = {
    INVOICE: 'Invoice',
    QUOTATION: 'Quotation',
    PURCHASE_ORDER: 'Purchase Order',
    LEAVE: 'Cuti',
    PAYROLL: 'Payroll',
    DEAL: 'Deal',
}

const STATE_COLORS: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    PAID: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-red-100 text-red-700',
    COMPLETED: 'bg-green-100 text-green-700',
    ACTIVE: 'bg-blue-100 text-blue-700',
    CLOSED: 'bg-gray-100 text-gray-700',
    SENT: 'bg-purple-100 text-purple-700',
    DELIVERED: 'bg-teal-100 text-teal-700',
    PARTIAL: 'bg-orange-100 text-orange-700',
    PROCESSING: 'bg-blue-100 text-blue-700',
}

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
    PENDING: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock, label: 'Menunggu' },
    APPROVED: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Disetujui' },
    REJECTED: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: 'Ditolak' },
    CANCELLED: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: XCircle, label: 'Dibatalkan' },
}

function getStateColor(state: string): string {
    return STATE_COLORS[state] || 'bg-gray-100 text-gray-700'
}

export default function WorkflowSettingsPage() {
    const { t } = useTranslation()
    const [activeTab, setActiveTab] = useState<TabType>('workflows')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <X className="h-5 w-5" />}
                    <span className="text-sm font-medium">{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-gray-900">Workflow & Approval</h2>
                <p className="text-gray-600 mt-1">Konfigurasi alur kerja dan riwayat persetujuan transaksi</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('workflows')}
                        className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${activeTab === 'workflows'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <GitBranch className="h-4 w-4" />
                        Workflow Configuration
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${activeTab === 'history'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <History className="h-4 w-4" />
                        Approval History
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'workflows' && (
                <WorkflowsTab />
            )}
            {activeTab === 'history' && (
                <ApprovalHistoryTab showToast={setToast} />
            )}
        </div>
    )
}

// ============================================
// Workflows Tab
// ============================================

function WorkflowsTab() {
    const [workflows, setWorkflows] = useState<WorkflowDef[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const fetchWorkflows = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/workflow/definitions')
            const data = await res.json()
            if (data.success) {
                setWorkflows(data.data)
            } else {
                setError(data.error || 'Gagal memuat data workflow')
            }
        } catch {
            setError('Gagal terhubung ke server')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchWorkflows()
    }, [fetchWorkflows])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-96"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="animate-pulse space-y-3">
                                <div className="h-6 bg-gray-200 rounded w-32"></div>
                                <div className="h-4 bg-gray-200 rounded w-full"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8">
                <div className="flex flex-col items-center text-center">
                    <GitBranch className="h-12 w-12 text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Gagal Memuat Workflow</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button onClick={fetchWorkflows} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Coba Lagi
                    </button>
                </div>
            </div>
        )
    }

    return (
        <>
            {workflows.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <GitBranch className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Workflow</h3>
                    <p className="text-gray-600">Workflow akan dibuat otomatis untuk setiap jenis transaksi.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {workflows.map(wf => {
                        const config = wf.config
                        const isExpanded = expandedId === wf.id
                        return (
                            <div key={wf.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div
                                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : wf.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-50">
                                                <GitBranch className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-gray-900">{wf.name}</span>
                                                    {wf.isSystem && (
                                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">System</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    {ENTITY_LABELS[wf.entityType] || wf.entityType}
                                                    {wf.description && ` — ${wf.description}`}
                                                </p>
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                                    </div>
                                </div>

                                {isExpanded && config && (
                                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                                        <div className="mb-4">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                                <Settings className="h-4 w-4" />
                                                States
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {config.states.map(state => (
                                                    <span key={state} className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStateColor(state)}`}>
                                                        {state === config.initialState && '🟢 '}
                                                        {config.finalStates.includes(state) && '🏁 '}
                                                        {state}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="mt-2 text-xs text-gray-500">
                                                <span className="font-medium">Initial:</span> {config.initialState}
                                                {' | '}
                                                <span className="font-medium">Final:</span> {config.finalStates.join(', ')}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                                <ArrowRight className="h-4 w-4" />
                                                Transitions
                                            </h4>
                                            <div className="space-y-1.5">
                                                {config.transitions.map((trans, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStateColor(trans.from)}`}>
                                                            {trans.from}
                                                        </span>
                                                        <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStateColor(trans.to)}`}>
                                                            {trans.to}
                                                        </span>
                                                        <span className="text-gray-400">•</span>
                                                        <span className="text-gray-600">{trans.action}</span>
                                                        {trans.requiredRole && (
                                                            <span className="ml-auto px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                                                {trans.requiredRole}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </>
    )
}

// ============================================
// Approval History Tab
// ============================================

function ApprovalHistoryTab({ showToast }: { showToast: (toast: { message: string; type: 'success' | 'error' } | null) => void }) {
    const [history, setHistory] = useState<ApprovalHistoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState<string>('ALL')
    const [filterEntityType, setFilterEntityType] = useState<string>('ALL')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const params = new URLSearchParams()
            params.set('page', page.toString())
            params.set('limit', '15')
            if (filterStatus !== 'ALL') params.set('status', filterStatus)
            if (filterEntityType !== 'ALL') params.set('entityType', filterEntityType)

            const res = await fetch(`/api/approval/requests?${params.toString()}`)
            const data = await res.json()

            if (data.success) {
                setHistory(data.data || [])
                setTotalPages(data.totalPages || 1)
                setTotal(data.total || 0)
            } else {
                setError(data.error || 'Gagal memuat riwayat approval')
            }
        } catch {
            setError('Gagal terhubung ke server')
        } finally {
            setLoading(false)
        }
    }, [page, filterStatus, filterEntityType])

    useEffect(() => {
        fetchHistory()
    }, [fetchHistory])

    const handleApprove = async (id: string) => {
        try {
            const res = await fetch(`/api/approval/requests/${id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comments: '' }),
            })
            const data = await res.json()
            if (data.success) {
                showToast({ message: 'Approval berhasil', type: 'success' })
                fetchHistory()
            } else {
                showToast({ message: data.error || 'Gagal approve', type: 'error' })
            }
        } catch {
            showToast({ message: 'Gagal terhubung ke server', type: 'error' })
        }
    }

    const handleReject = async (id: string) => {
        try {
            const res = await fetch(`/api/approval/requests/${id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comments: '' }),
            })
            const data = await res.json()
            if (data.success) {
                showToast({ message: 'Rejection berhasil', type: 'success' })
                fetchHistory()
            } else {
                showToast({ message: data.error || 'Gagal reject', type: 'error' })
            }
        } catch {
            showToast({ message: 'Gagal terhubung ke server', type: 'error' })
        }
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Filter:</span>
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                    <option value="ALL">Semua Status</option>
                    <option value="PENDING">Menunggu</option>
                    <option value="APPROVED">Disetujui</option>
                    <option value="REJECTED">Ditolak</option>
                    <option value="CANCELLED">Dibatalkan</option>
                </select>
                <select
                    value={filterEntityType}
                    onChange={(e) => { setFilterEntityType(e.target.value); setPage(1) }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                    <option value="ALL">Semua Jenis</option>
                    <option value="INVOICE">Invoice</option>
                    <option value="PURCHASE_ORDER">Purchase Order</option>
                    <option value="QUOTATION">Quotation</option>
                </select>
                <span className="text-sm text-gray-500">
                    {total} data
                </span>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-3 text-gray-600">Memuat riwayat...</span>
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Gagal Memuat Riwayat</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button onClick={fetchHistory} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Coba Lagi
                    </button>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && history.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <ClipboardCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Riwayat</h3>
                    <p className="text-gray-600">Riwayat approval akan muncul di sini setelah ada transaksi yang memerlukan persetujuan.</p>
                </div>
            )}

            {/* History List */}
            {!loading && !error && history.length > 0 && (
                <>
                    {/* Desktop: Table */}
                    <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jenis</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nomor</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diajukan Oleh</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diproses Oleh</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {history.map((item) => {
                                    const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING
                                    const StatusIcon = statusConf.icon
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                {ENTITY_LABELS[item.entityType] || item.entityType}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {item.entityDisplay || item.entityId}
                                                {item.entityAmount != null && (
                                                    <span className="ml-1 text-xs text-gray-400">
                                                        ({formatCurrency(item.entityAmount)})
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConf.color}`}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {statusConf.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {item.requesterName || 'Unknown'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {item.resolverName || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {formatDateTime(item.requestedAt)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {item.status === 'PENDING' && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleApprove(item.id)}
                                                            className="rounded-md bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 transition-colors"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(item.id)}
                                                            className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                                {item.comments && item.status !== 'PENDING' && (
                                                    <span className="text-xs text-gray-400" title={item.comments || ''}>
                                                        {item.comments.length > 30 ? item.comments.substring(0, 30) + '...' : item.comments}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile: Cards */}
                    <div className="md:hidden space-y-3">
                        {history.map((item) => {
                            const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING
                            const StatusIcon = statusConf.icon
                            return (
                                <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="text-sm font-semibold text-gray-900">
                                                {ENTITY_LABELS[item.entityType] || item.entityType}
                                            </span>
                                            <span className="ml-2 text-sm text-gray-500">
                                                {item.entityDisplay || item.entityId}
                                            </span>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConf.color}`}>
                                            <StatusIcon className="h-3 w-3" />
                                            {statusConf.label}
                                        </span>
                                    </div>
                                    {item.entityAmount != null && (
                                        <p className="mt-1 text-sm text-gray-600">
                                            {formatCurrency(item.entityAmount)}
                                        </p>
                                    )}
                                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                                        <span>Oleh: {item.requesterName || 'Unknown'}</span>
                                        <span>{formatDateTime(item.requestedAt)}</span>
                                    </div>
                                    {item.status === 'PENDING' && (
                                        <div className="mt-3 flex items-center gap-2">
                                            <button
                                                onClick={() => handleApprove(item.id)}
                                                className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 transition-colors"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleReject(item.id)}
                                                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 transition-colors"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                                Halaman {page} dari {totalPages}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Sebelumnya
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Selanjutnya
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
