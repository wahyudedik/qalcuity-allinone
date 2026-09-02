'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import {
    CalendarClock,
    Plus,
    Loader2,
    AlertCircle,
    Inbox,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    MoreHorizontal,
    Play,
    Pause,
    Timer,
    Repeat,
} from 'lucide-react'

/* ============================================
   TYPES
   ============================================ */

interface ScheduledQueryItem {
    id: string
    name: string
    description: string | null
    queryHistoryId: string
    datasetId: string | null
    cronExpression: string
    frequency: string
    timeOfDay: string | null
    outputFormat: string | null
    recipients: string[] | null
    alertOnFailure: boolean
    alertOnAnomaly: boolean
    isActive: boolean
    lastRunAt: string | null
    nextRunAt: string | null
    lastRunStatus: string | null
    runCount: number
    ownerId: string
    createdAt: string
    updatedAt: string
}

interface ScheduledResponse {
    success: boolean
    data: ScheduledQueryItem[]
}

/* ============================================
   HELPERS
   ============================================ */

function getStatusConfig(isActive: boolean, lastRunStatus: string | null): { color: string; bg: string; icon: typeof CheckCircle2; label: string } {
    if (!isActive) {
        return { color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700', icon: Pause, label: 'Paused' }
    }
    switch (lastRunStatus) {
        case 'SUCCESS':
            return { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle2, label: 'Active' }
        case 'FAILED':
            return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', icon: XCircle, label: 'Error' }
        case 'TIMEOUT':
            return { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', icon: AlertTriangle, label: 'Timeout' }
        default:
            return { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: CheckCircle2, label: 'Active' }
    }
}

function getFrequencyLabel(frequency: string): string {
    switch (frequency) {
        case 'daily': return 'Daily'
        case 'weekly': return 'Weekly'
        case 'monthly': return 'Monthly'
        case 'quarterly': return 'Quarterly'
        default: return frequency
    }
}

function getFrequencyColor(frequency: string): string {
    switch (frequency) {
        case 'daily': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        case 'weekly': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        case 'monthly': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
        case 'quarterly': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
        default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
    }
}

function formatDateTime(dateStr: string | null): string {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function timeAgo(dateStr: string | null): string {
    if (!dateStr) return 'Never'
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

/* ============================================
   MAIN PAGE
   ============================================ */

export default function ScheduledPage() {
    const { t } = useTranslation()
    const [scheduled, setScheduled] = useState<ScheduledQueryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [frequencyFilter, setFrequencyFilter] = useState<string>('all')
    const [actionMenuId, setActionMenuId] = useState<string | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [createForm, setCreateForm] = useState({
        name: '',
        description: '',
        frequency: 'daily',
        timeOfDay: '08:00',
        outputFormat: 'pdf',
    })
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    const fetchScheduled = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (frequencyFilter !== 'all') params.set('frequency', frequencyFilter)
            const res = await fetch(`/api/analytics/scheduled?${params}`)
            const json: ScheduledResponse = await res.json()
            if (!res.ok || !json.success) {
                throw new Error('Failed to load scheduled queries')
            }
            setScheduled(json.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [frequencyFilter])

    useEffect(() => {
        fetchScheduled()
    }, [fetchScheduled])

    /* ---------- Toggle Active ---------- */
    const toggleActive = async (id: string, current: boolean) => {
        try {
            const res = await fetch(`/api/analytics/scheduled/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !current }),
            })
            if (!res.ok) throw new Error('Failed to update')
            setScheduled(prev => prev.map(s =>
                s.id === id ? { ...s, isActive: !s.isActive } : s
            ))
            setActionMenuId(null)
        } catch {
            setError('Failed to toggle scheduled query')
        }
    }

    /* ---------- Delete ---------- */
    const deleteScheduled = async (id: string) => {
        if (!confirm(t('analytics.scheduled.deleteConfirm'))) return
        try {
            const res = await fetch(`/api/analytics/scheduled/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete')
            setScheduled(prev => prev.filter(s => s.id !== id))
            setActionMenuId(null)
        } catch {
            setError('Failed to delete scheduled query')
        }
    }

    /* ---------- Stats ---------- */
    const activeCount = scheduled.filter(s => s.isActive).length
    const pausedCount = scheduled.filter(s => !s.isActive).length
    const totalRuns = scheduled.reduce((sum, s) => sum + (s.runCount || 0), 0)
    const errorCount = scheduled.filter(s => s.lastRunStatus === 'FAILED' || s.lastRunStatus === 'TIMEOUT').length

    const stats = [
        { label: t('analytics.scheduled.active'), value: activeCount, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' },
        { label: t('analytics.scheduled.paused'), value: pausedCount, icon: Pause, color: 'text-gray-600 dark:text-gray-400' },
        { label: 'Total Runs', value: totalRuns, icon: Repeat, color: 'text-blue-600 dark:text-blue-400' },
        { label: 'Errors', value: errorCount, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400' },
    ]

    const frequencyFilters = ['all', 'daily', 'weekly', 'monthly', 'quarterly'] as const

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('analytics.scheduled.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t('analytics.scheduled.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    {t('analytics.scheduled.create')}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</span>
                                <Icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                            <p className={`mt-2 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        </div>
                    )
                })}
            </div>

            {/* Frequency Filter */}
            <div className="flex flex-wrap gap-1.5">
                {frequencyFilters.map((freq) => (
                    <button
                        key={freq}
                        onClick={() => setFrequencyFilter(freq)}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${frequencyFilter === freq
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        {freq === 'all' ? t('analytics.common.all') : (t(`analytics.scheduled.frequencies.${freq}`) || freq)}
                    </button>
                ))}
            </div>

            {/* Loading State */}
            {loading && (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
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
            {!loading && !error && scheduled.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-gray-800">
                    <Inbox className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {t('analytics.scheduled.empty.title')}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {t('analytics.scheduled.empty.description')}
                    </p>
                </div>
            )}

            {/* Scheduled List */}
            {!loading && !error && scheduled.length > 0 && (
                <div className="space-y-3">
                    {scheduled.map((item) => {
                        const statusConfig = getStatusConfig(item.isActive, item.lastRunStatus)
                        const StatusIcon = statusConfig.icon
                        const freqColor = getFrequencyColor(item.frequency)
                        return (
                            <div
                                key={item.id}
                                className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className={`rounded-lg p-2 ${statusConfig.bg}`}>
                                            <CalendarClock className={`h-5 w-5 ${statusConfig.color}`} />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900 dark:text-gray-100">{item.name}</h3>
                                            {item.description && (
                                                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                                            )}
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${freqColor}`}>
                                                    <Repeat className="h-3 w-3" />
                                                    {getFrequencyLabel(item.frequency)}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {statusConfig.label}
                                                </span>
                                                {item.timeOfDay && (
                                                    <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                                        <Clock className="h-3 w-3" />
                                                        {item.timeOfDay}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400 sm:grid-cols-4">
                                                <div>
                                                    <span className="text-gray-400 dark:text-gray-500">{t('analytics.scheduled.nextRun')}: </span>
                                                    <span className="text-gray-700 dark:text-gray-300">{formatDateTime(item.nextRunAt)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400 dark:text-gray-500">{t('analytics.scheduled.lastRun')}: </span>
                                                    <span className="text-gray-700 dark:text-gray-300">{timeAgo(item.lastRunAt)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400 dark:text-gray-500">{t('analytics.scheduled.runCount')}: </span>
                                                    <span className="text-gray-700 dark:text-gray-300">{item.runCount}</span>
                                                </div>
                                                {item.outputFormat && (
                                                    <div>
                                                        <span className="text-gray-400 dark:text-gray-500">Format: </span>
                                                        <span className="text-gray-700 dark:text-gray-300">{item.outputFormat}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => toggleActive(item.id, item.isActive)}
                                            className={`rounded-lg p-2 transition-colors ${item.isActive
                                                ? 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'
                                                : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                            title={item.isActive ? 'Pause' : 'Resume'}
                                        >
                                            {item.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                                        </button>
                                        <div className="relative">
                                            <button
                                                onClick={() => setActionMenuId(actionMenuId === item.id ? null : item.id)}
                                                className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                            {actionMenuId === item.id && (
                                                <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
                                                    <button
                                                        onClick={() => setActionMenuId(null)}
                                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                                                    >
                                                        <Play className="h-4 w-4" />
                                                        Run Now
                                                    </button>
                                                    <button
                                                        onClick={() => deleteScheduled(item.id)}
                                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        {t('common.delete')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Create Scheduled Report Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {t('analytics.scheduled.create') || 'Buat Scheduled Report'}
                            </h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nama</label>
                                <input
                                    type="text"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                    placeholder="Monthly Sales Report"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Deskripsi</label>
                                <input
                                    type="text"
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                    placeholder="Laporan penjualan bulanan otomatis"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Frekuensi</label>
                                    <select
                                        value={createForm.frequency}
                                        onChange={(e) => setCreateForm({ ...createForm, frequency: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Waktu</label>
                                    <input
                                        type="time"
                                        value={createForm.timeOfDay}
                                        onChange={(e) => setCreateForm({ ...createForm, timeOfDay: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Format Output</label>
                                <select
                                    value={createForm.outputFormat}
                                    onChange={(e) => setCreateForm({ ...createForm, outputFormat: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                >
                                    <option value="pdf">PDF</option>
                                    <option value="csv">CSV</option>
                                    <option value="xlsx">Excel (XLSX)</option>
                                    <option value="json">JSON</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            >
                                Batal
                            </button>
                            <button
                                onClick={async () => {
                                    if (!createForm.name) {
                                        setToast({ message: 'Nama wajib diisi', type: 'error' })
                                        return
                                    }
                                    try {
                                        const res = await fetch('/api/analytics/scheduled', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(createForm),
                                        })
                                        const data = await res.json()
                                        if (data.success) {
                                            setToast({ message: 'Scheduled report berhasil dibuat', type: 'success' })
                                            setShowCreateModal(false)
                                            fetchScheduled()
                                        } else {
                                            setToast({ message: data.error || 'Gagal membuat scheduled report', type: 'error' })
                                        }
                                    } catch {
                                        setToast({ message: 'Gagal membuat scheduled report', type: 'error' })
                                    }
                                }}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Buat Scheduled Report
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    <span className="inline-flex items-center gap-1.5">
                        {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {toast.message}
                    </span>
                </div>
            )}
        </div>
    )
}
