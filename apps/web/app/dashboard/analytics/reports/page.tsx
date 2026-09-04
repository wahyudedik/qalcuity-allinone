'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import {
    FileText,
    Play,
    Edit3,
    Share2,
    MoreHorizontal,
    Star,
    Folder,
    Search,
    Loader2,
    AlertCircle,
    Check,
    X,
    BarChart3,
    LayoutDashboard,
    Clock,
    Tag,
} from 'lucide-react'

/* ============================================
   TYPES
   ============================================ */

interface ReportOwner {
    id: string
    name: string
}

interface SavedReport {
    id: string
    name: string
    description: string | null
    type: string
    config: Record<string, unknown>
    tags: string[]
    folder: string | null
    isStarred: boolean
    lastRunAt: string | null
    createdAt: string
    updatedAt: string
    owner: ReportOwner
}

interface ReportsListResponse {
    success: boolean
    data: SavedReport[]
}

type TabFilter = 'all' | 'starred' | 'folders'

/* ============================================
   HELPERS
   ============================================ */

function getReportTypeIcon(type: string): typeof FileText {
    switch (type) {
        case 'chart': return BarChart3
        case 'dashboard': return LayoutDashboard
        default: return FileText
    }
}

function getReportTypeLabel(type: string): string {
    switch (type) {
        case 'chart': return 'Chart'
        case 'pivot': return 'Pivot'
        case 'query': return 'Query'
        case 'dashboard': return 'Dashboard'
        default: return 'Report'
    }
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

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

/* ============================================
   MAIN PAGE
   ============================================ */

export default function AnalyticsReportsPage() {
    const { t } = useTranslation()
    const [reports, setReports] = useState<SavedReport[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<TabFilter>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [actionMenuId, setActionMenuId] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchReports = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (activeTab === 'starred') params.set('isStarred', 'true')
            const res = await fetch(`/api/analytics/reports?${params}`)
            const json: ReportsListResponse = await res.json()
            if (!res.ok || !json.success) {
                throw new Error(t('analytics.errors.loadFailed'))
            }
            setReports(json.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [activeTab])

    useEffect(() => {
        fetchReports()
    }, [fetchReports])

    /* ---------- Toggle Star ---------- */
    const toggleStar = async (id: string, current: boolean) => {
        try {
            const res = await fetch(`/api/analytics/reports/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isStarred: !current }),
            })
            if (!res.ok) throw new Error('Failed to update')
            setReports(prev => prev.map(r =>
                r.id === id ? { ...r, isStarred: !r.isStarred } : r
            ))
        } catch {
            setError(t('analytics.errors.saveFailed'))
        }
    }

    /* ---------- Delete ---------- */
    const deleteReport = async (id: string) => {
        if (!confirm('Delete this report?')) return
        try {
            const res = await fetch(`/api/analytics/reports/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete')
            setReports(prev => prev.filter(r => r.id !== id))
        } catch {
            setError(t('analytics.errors.deleteFailed'))
        }
    }

    /* ---------- Run Report ---------- */
    const runReport = async (report: SavedReport) => {
        try {
            const res = await fetch(`/api/analytics/reports/${report.id}/execute`, {
                method: 'POST',
            })
            if (!res.ok) throw new Error('Failed to run report')
            fetchReports()
        } catch {
            setError(t('analytics.errors.runFailed'))
        }
    }

    /* ---------- Edit ---------- */
    const editReport = (report: SavedReport) => {
        window.location.href = `/dashboard/analytics/explorer?edit=${report.id}`
    }

    /* ---------- Share ---------- */
    const shareReport = async (report: SavedReport) => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: report.name,
                    text: `Lihat laporan: ${report.name}`,
                    url: `${window.location.origin}/dashboard/analytics/reports?shared=${report.id}`,
                })
            } else {
                await navigator.clipboard.writeText(
                    `${window.location.origin}/dashboard/analytics/reports?shared=${report.id}`
                )
                setToast({ message: 'Link laporan berhasil disalin ke clipboard!', type: 'success' })
            }
        } catch {
            // User cancelled share
        }
    }

    /* ---------- Filter ---------- */
    const filteredReports = reports.filter(r => {
        if (activeTab === 'folders') return r.folder !== null
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            return r.name.toLowerCase().includes(q) ||
                r.tags.some(tag => tag.toLowerCase().includes(q))
        }
        return true
    })

    /* ---------- Groups for folder view ---------- */
    const folderGroups = activeTab === 'folders'
        ? filteredReports.reduce<Record<string, SavedReport[]>>((acc, r) => {
            const folder = r.folder || 'Uncategorized'
            if (!acc[folder]) acc[folder] = []
            acc[folder].push(r)
            return acc
        }, {})
        : {}

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t('analytics.reports.title') || 'Saved Reports'}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('analytics.reports.subtitle') || 'Manage and run your saved analytics reports'}
                    </p>
                </div>
            </div>

            {/* Tabs + Search */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                    {(['all', 'starred', 'folders'] as TabFilter[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === tab
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                                }`}
                        >
                            {tab === 'all' ? t('analytics.reports.tabs.all') : tab === 'starred' ? t('analytics.reports.tabs.starred') : t('analytics.reports.tabs.folders')}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('common.searchPlaceholder')}
                        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 sm:w-64"
                    />
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="h-4 w-4 text-red-400" />
                    </button>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-20 animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="mt-2 h-3 w-56 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredReports.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-16 dark:border-gray-600">
                    <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-600 dark:text-gray-400">
                        {t('analytics.reports.empty.title') || 'No Saved Reports'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-400 dark:text-gray-500 text-center max-w-sm">
                        {t('analytics.reports.empty.description') || 'Create your first analysis from Data Explorer and save it here.'}
                    </p>
                    <a
                        href="/dashboard/analytics/explorer"
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        {t('analytics.reports.goToExplorer') || 'Go to Data Explorer'} →
                    </a>
                </div>
            )}

            {/* Reports List — Flat view */}
            {!loading && activeTab !== 'folders' && filteredReports.length > 0 && (
                <div className="space-y-3">
                    {filteredReports.map(report => (
                        <ReportCard
                            key={report.id}
                            report={report}
                            onToggleStar={toggleStar}
                            onDelete={deleteReport}
                            onRun={runReport}
                            onEdit={editReport}
                            onShare={shareReport}
                            actionMenuId={actionMenuId}
                            setActionMenuId={setActionMenuId}
                        />
                    ))}
                </div>
            )}

            {/* Reports List — Folder view */}
            {!loading && activeTab === 'folders' && (
                <div className="space-y-6">
                    {Object.entries(folderGroups).length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Folder className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                            <p className="mt-2 text-sm text-gray-400">No reports in folders</p>
                        </div>
                    )}
                    {Object.entries(folderGroups).map(([folder, items]) => (
                        <div key={folder}>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <Folder className="h-4 w-4" />
                                {folder}
                                <span className="text-gray-400">({items.length})</span>
                            </h3>
                            <div className="space-y-3">
                                {items.map(report => (
                                    <ReportCard
                                        key={report.id}
                                        report={report}
                                        onToggleStar={toggleStar}
                                        onDelete={deleteReport}
                                        onRun={runReport}
                                        onEdit={editReport}
                                        onShare={shareReport}
                                        actionMenuId={actionMenuId}
                                        setActionMenuId={setActionMenuId}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                    <span className="inline-flex items-center gap-1.5">
                        {toast.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        {toast.message}
                    </span>
                </div>
            )}
        </div>
    )
}

/* ============================================
   REPORT CARD COMPONENT
   ============================================ */

interface ReportCardProps {
    report: SavedReport
    onToggleStar: (id: string, current: boolean) => void
    onDelete: (id: string) => void
    onRun: (report: SavedReport) => void
    onEdit: (report: SavedReport) => void
    onShare: (report: SavedReport) => void
    actionMenuId: string | null
    setActionMenuId: (id: string | null) => void
}

function ReportCard({ report, onToggleStar, onDelete, onRun, onEdit, onShare, actionMenuId, setActionMenuId }: ReportCardProps) {
    const TypeIcon = getReportTypeIcon(report.type)
    const isOpen = actionMenuId === report.id

    return (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {/* Icon */}
            <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/30">
                <TypeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {report.name}
                    </h3>
                    {report.isStarred && (
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    )}
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                    <span className="inline-flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        {getReportTypeLabel(report.type)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last run: {timeAgo(report.lastRunAt)}
                    </span>
                </div>
                {report.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                        {report.tags.map(tag => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                            >
                                <Tag className="h-2.5 w-2.5" />
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onRun(report)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-blue-900/20"
                >
                    <Play className="h-3 w-3" />
                    Run
                </button>
                <button
                    onClick={() => onToggleStar(report.id, report.isStarred)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-yellow-500 dark:hover:bg-gray-700"
                >
                    <Star className={`h-4 w-4 ${report.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                </button>
                <div className="relative">
                    <button
                        onClick={() => setActionMenuId(isOpen ? null : report.id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {isOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
                            <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                                <button
                                    onClick={() => { onEdit(report); setActionMenuId(null) }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    <Edit3 className="h-3.5 w-3.5" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => { onShare(report); setActionMenuId(null) }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    <Share2 className="h-3.5 w-3.5" />
                                    Share
                                </button>
                                <button
                                    onClick={() => { onDelete(report.id); setActionMenuId(null) }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Delete
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
