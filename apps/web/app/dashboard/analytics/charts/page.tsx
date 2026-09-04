'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import {
    BarChart3,
    Plus,
    Loader2,
    AlertCircle,
    Inbox,
    Trash2,
    Eye,
    MoreHorizontal,
    LineChart,
    PieChart,
    Activity,
    Table,
    Grid3X3,
} from 'lucide-react'

/* ============================================
   TYPES
   ============================================ */

interface ChartItem {
    id: string
    name: string
    description: string | null
    slug: string
    chartType: string
    config: string
    dataSource: string
    datasetId: string | null
    queryId: string | null
    metricId: string | null
    visibility: string
    ownerId: string
    ownerName: string | null
    viewCount: number
    lastViewedAt: string | null
    isTemplate: boolean
    tags: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
}

interface ChartsResponse {
    success: boolean
    data: ChartItem[]
}

/* ============================================
   HELPERS
   ============================================ */

function getChartTypeIcon(chartType: string): typeof BarChart3 {
    switch (chartType) {
        case 'line': return LineChart
        case 'pie':
        case 'donut': return PieChart
        case 'area': return Activity
        case 'table': return Table
        case 'scatter':
        case 'heatmap': return Grid3X3
        case 'bar':
        default: return BarChart3
    }
}

function getChartTypeColor(chartType: string): string {
    switch (chartType) {
        case 'line': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        case 'pie':
        case 'donut': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
        case 'area': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        case 'table': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
        case 'scatter':
        case 'heatmap': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
        case 'bar':
        default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    }
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

export default function ChartsPage() {
    const { t } = useTranslation()
    const [charts, setCharts] = useState<ChartItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [actionMenuId, setActionMenuId] = useState<string | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [createForm, setCreateForm] = useState({
        name: '',
        description: '',
        chartType: 'bar',
        visibility: 'PRIVATE' as string,
    })

    const fetchCharts = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (typeFilter !== 'all') params.set('chartType', typeFilter)
            const res = await fetch(`/api/analytics/charts?${params}`)
            const json: ChartsResponse = await res.json()
            if (!res.ok || !json.success) {
                throw new Error(t('analytics.errors.loadFailed'))
            }
            setCharts(json.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [typeFilter])

    useEffect(() => {
        fetchCharts()
    }, [fetchCharts])

    /* ---------- Create ---------- */
    const createChart = async () => {
        if (!createForm.name.trim()) return
        try {
            setSaving(true)
            const slug = createForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            const res = await fetch('/api/analytics/charts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: createForm.name.trim(),
                    description: createForm.description.trim() || null,
                    slug,
                    chartType: createForm.chartType,
                    visibility: createForm.visibility,
                }),
            })
            const json = await res.json()
            if (!json.success) {
                throw new Error(json.error || 'Failed to create chart')
            }
            setShowCreateModal(false)
            setCreateForm({ name: '', description: '', chartType: 'bar', visibility: 'PRIVATE' })
            fetchCharts()
        } catch (err) {
            setError(err instanceof Error ? err.message : t('analytics.errors.createFailed'))
        } finally {
            setSaving(false)
        }
    }

    /* ---------- Delete ---------- */
    const deleteChart = async (id: string) => {
        if (!confirm(t('analytics.charts.deleteConfirm'))) return
        try {
            const res = await fetch(`/api/analytics/charts/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete')
            setCharts(prev => prev.filter(c => c.id !== id))
            setActionMenuId(null)
        } catch {
            setError(t('analytics.errors.deleteFailed'))
        }
    }

    /* ---------- Filter ---------- */
    const filteredCharts = charts.filter(c => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            return c.name.toLowerCase().includes(q) ||
                (c.description && c.description.toLowerCase().includes(q))
        }
        return true
    })

    /* ---------- Chart type counts ---------- */
    const typeCounts = charts.reduce<Record<string, number>>((acc, c) => {
        acc[c.chartType] = (acc[c.chartType] || 0) + 1
        return acc
    }, {})

    const chartTypes = ['all', 'bar', 'line', 'pie', 'donut', 'area', 'scatter', 'heatmap', 'kpi_card', 'table'] as const

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('analytics.charts.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t('analytics.charts.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    {t('analytics.charts.create')}
                </button>
            </div>

            {/* Type Filter Pills */}
            <div className="flex flex-wrap gap-2">
                {chartTypes.map((type) => (
                    <button
                        key={type}
                        onClick={() => setTypeFilter(type)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${typeFilter === type
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        {type === 'all' ? t('analytics.common.all') : (t(`analytics.charts.types.${type}`) || type)}
                        <span className="text-xs opacity-70">
                            {type === 'all' ? charts.length : (typeCounts[type] || 0)}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('analytics.common.search')}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
                <BarChart3 className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>

            {/* Loading State */}
            {loading && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 space-y-2">
                                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                                </div>
                                <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse dark:bg-gray-700" />
                            </div>
                            <div className="mt-4 h-24 bg-gray-100 rounded-lg animate-pulse dark:bg-gray-700" />
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
            {!loading && !error && filteredCharts.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-gray-800">
                    <Inbox className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {t('analytics.charts.empty.title')}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {t('analytics.charts.empty.description')}
                    </p>
                </div>
            )}

            {/* Charts Grid */}
            {!loading && !error && filteredCharts.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredCharts.map((chart) => {
                        const ChartIcon = getChartTypeIcon(chart.chartType)
                        const colorClass = getChartTypeColor(chart.chartType)
                        const tags = chart.tags ? chart.tags.split(',').map(s => s.trim()).filter(Boolean) : []
                        return (
                            <div
                                key={chart.id}
                                className="group rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                            >
                                {/* Chart Preview Area */}
                                <div className="relative border-b border-gray-100 p-6 dark:border-gray-700">
                                    <div className="flex flex-col items-center justify-center">
                                        <ChartIcon className={`h-12 w-12 ${colorClass}`} />
                                        <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
                                            {t(`analytics.charts.types.${chart.chartType}`) || chart.chartType}
                                        </span>
                                    </div>
                                    {/* Actions overlay */}
                                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="relative">
                                            <button
                                                onClick={() => setActionMenuId(actionMenuId === chart.id ? null : chart.id)}
                                                className="rounded-lg bg-white p-1.5 text-gray-400 shadow-sm hover:text-gray-600 dark:bg-gray-700 dark:hover:text-gray-300"
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                            {actionMenuId === chart.id && (
                                                <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
                                                    <button
                                                        onClick={() => setActionMenuId(null)}
                                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        {t('common.view')}
                                                    </button>
                                                    <button
                                                        onClick={() => deleteChart(chart.id)}
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

                                {/* Chart Info */}
                                <div className="p-4">
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{chart.name}</h3>
                                    {chart.description && (
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{chart.description}</p>
                                    )}
                                    <div className="mt-3 flex flex-wrap gap-1">
                                        {tags.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                                        <span>{t('common.updatedAt')} {timeAgo(chart.updatedAt)}</span>
                                        <span>{chart.viewCount} views</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            {t('analytics.charts.createTitle') || 'Buat Chart Baru'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Chart</label>
                                <input
                                    type="text"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g., Revenue by Month"
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-gray-100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deskripsi</label>
                                <input
                                    type="text"
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Deskripsi singkat (opsional)"
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-gray-100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipe Chart</label>
                                <select
                                    value={createForm.chartType}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, chartType: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 dark:text-gray-100"
                                >
                                    <option value="bar">Bar Chart</option>
                                    <option value="line">Line Chart</option>
                                    <option value="pie">Pie Chart</option>
                                    <option value="donut">Donut Chart</option>
                                    <option value="area">Area Chart</option>
                                    <option value="scatter">Scatter Plot</option>
                                    <option value="heatmap">Heatmap</option>
                                    <option value="kpi_card">KPI Card</option>
                                    <option value="table">Table</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Visibilitas</label>
                                <select
                                    value={createForm.visibility}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, visibility: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 dark:text-gray-100"
                                >
                                    <option value="PRIVATE">Private</option>
                                    <option value="TEAM">Team</option>
                                    <option value="ORGANIZATION">Organization</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={createChart}
                                disabled={!createForm.name.trim() || saving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                {t('common.create') || 'Buat'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
