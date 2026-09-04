'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatNumber } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import {
    Plus,
    Gauge,
    Edit3,
    Trash2,
    RefreshCw,
    Loader2,
    AlertCircle,
    Target,
    TrendingUp,
    TrendingDown,
    Check,
    X,
    BarChart3,
} from 'lucide-react'

/* ============================================
   TYPES
   ============================================ */

interface KPIEvaluation {
    value: number
    status: string
    changePercent: number | null
    evaluatedAt: string
}

interface KPItem {
    id: string
    name: string
    description: string | null
    category: string
    metricId: string
    formula: string | null
    target: number
    targetType: string
    warningThreshold: number | null
    criticalThreshold: number | null
    period: string
    ownerId: string | null
    departmentId: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
    latestEvaluation: KPIEvaluation | null
}

interface KPIListResponse {
    success: boolean
    data: KPItem[]
}

interface MetricOption {
    id: string
    name: string
    category: string
    format: string
}

/* ============================================
   CONSTANTS
   ============================================ */

const CATEGORIES = ['all', 'finance', 'sales', 'inventory', 'hr', 'crm', 'cross_module'] as const
type CategoryFilter = typeof CATEGORIES[number]

const METRIC_OPTIONS: MetricOption[] = [
    { id: 'revenue', name: 'Revenue', category: 'finance', format: 'currency' },
    { id: 'total_expenses', name: 'Total Expenses', category: 'finance', format: 'currency' },
    { id: 'gross_profit', name: 'Gross Profit', category: 'finance', format: 'currency' },
    { id: 'net_income', name: 'Net Income', category: 'finance', format: 'currency' },
    { id: 'cash_flow', name: 'Net Cash Flow', category: 'finance', format: 'currency' },
    { id: 'total_deals', name: 'Total Deals', category: 'sales', format: 'count' },
    { id: 'win_rate', name: 'Win Rate', category: 'sales', format: 'percentage' },
    { id: 'pipeline_value', name: 'Pipeline Value', category: 'sales', format: 'currency' },
    { id: 'total_stock_value', name: 'Total Stock Value', category: 'inventory', format: 'currency' },
    { id: 'stock_turnover', name: 'Stock Turnover', category: 'inventory', format: 'number' },
    { id: 'employee_count', name: 'Employee Count', category: 'hr', format: 'count' },
    { id: 'attendance_rate', name: 'Attendance Rate', category: 'hr', format: 'percentage' },
    { id: 'lead_conversion_rate', name: 'Lead Conversion Rate', category: 'crm', format: 'percentage' },
]

const PERIODS = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const

/* ============================================
   HELPERS
   ============================================ */

function getStatusConfig(status: string): { color: string; bg: string; label: string } {
    switch (status) {
        case 'above_target':
            return { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Above Target' }
        case 'on_target':
            return { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'On Target' }
        case 'below_target':
            return { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', label: 'Below Target' }
        case 'critical':
            return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Critical' }
        default:
            return { color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700', label: 'Unknown' }
    }
}

function getStatusDot(status: string): string {
    switch (status) {
        case 'above_target': return 'bg-green-500'
        case 'on_target': return 'bg-blue-500'
        case 'below_target': return 'bg-orange-500'
        case 'critical': return 'bg-red-500'
        default: return 'bg-gray-400'
    }
}

function getProgressPercent(current: number, target: number): number {
    if (target === 0) return 0
    return Math.min((current / target) * 100, 200)
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

/* ============================================
   CREATE KPI FORM TYPE
   ============================================ */

interface CreateKPIForm {
    name: string
    description: string
    category: string
    metricId: string
    target: number
    targetType: string
    period: string
}

const DEFAULT_FORM: CreateKPIForm = {
    name: '',
    description: '',
    category: 'finance',
    metricId: 'revenue',
    target: 10,
    targetType: 'gte',
    period: 'monthly',
}

/* ============================================
   MAIN PAGE
   ============================================ */

export default function KPIPage() {
    const { t } = useTranslation()
    const [kpis, setKPIs] = useState<KPItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [form, setForm] = useState<CreateKPIForm>(DEFAULT_FORM)
    const [saving, setSaving] = useState(false)
    const [evaluating, setEvaluating] = useState<string | null>(null)

    const fetchKPIs = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (categoryFilter !== 'all') params.set('category', categoryFilter)
            const res = await fetch(`/api/analytics/kpi?${params}`)
            const json: KPIListResponse = await res.json()
            if (!res.ok || !json.success) {
                throw new Error(t('analytics.errors.loadFailed'))
            }
            setKPIs(json.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [categoryFilter])

    useEffect(() => {
        fetchKPIs()
    }, [fetchKPIs])

    /* ---------- Create KPI ---------- */
    const createKPI = async () => {
        if (!form.name.trim()) return
        try {
            setSaving(true)
            const res = await fetch('/api/analytics/kpi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || 'Failed to create KPI')
            }
            setShowCreateModal(false)
            setForm(DEFAULT_FORM)
            fetchKPIs()
        } catch (err) {
            setError(err instanceof Error ? err.message : t('analytics.errors.createFailed'))
        } finally {
            setSaving(false)
        }
    }

    /* ---------- Delete KPI ---------- */
    const deleteKPI = async (id: string) => {
        if (!confirm('Delete this KPI?')) return
        try {
            const res = await fetch(`/api/analytics/kpi/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete')
            setKPIs(prev => prev.filter(k => k.id !== id))
        } catch {
            setError(t('analytics.errors.deleteFailed'))
        }
    }

    /* ---------- Evaluate KPI ---------- */
    const evaluateKPI = async (id: string) => {
        try {
            setEvaluating(id)
            const res = await fetch(`/api/analytics/kpi/${id}/evaluate`, { method: 'POST' })
            if (!res.ok) throw new Error('Failed to evaluate')
            fetchKPIs()
        } catch {
            setError(t('analytics.errors.queryFailed'))
        } finally {
            setEvaluating(null)
        }
    }

    const filteredKPIs = categoryFilter === 'all'
        ? kpis
        : kpis.filter(k => k.category === categoryFilter)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t('analytics.kpi.title') || 'KPI Management'}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('analytics.kpi.subtitle') || 'Track and manage your Key Performance Indicators'}
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4" />
                    {t('analytics.kpi.create') || 'Create KPI'}
                </button>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                            categoryFilter === cat
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                        }`}
                    >
                        {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
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
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-32 animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="mt-3 h-3 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="mt-3 h-6 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    ))}
                </div>
            )}

            {/* KPI Cards */}
            {!loading && filteredKPIs.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-16 dark:border-gray-600">
                    <Gauge className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-600 dark:text-gray-400">
                        {t('analytics.kpi.empty.title') || 'No KPIs Yet'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-400 dark:text-gray-500 text-center max-w-sm">
                        {t('analytics.kpi.empty.description') || 'Create your first KPI to start tracking performance metrics.'}
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        {t('analytics.kpi.create') || 'Create KPI'}
                    </button>
                </div>
            )}

            {!loading && filteredKPIs.length > 0 && (
                <div className="space-y-4">
                    {filteredKPIs.map(kpi => {
                        const eval_ = kpi.latestEvaluation
                        const status = eval_?.status || 'on_target'
                        const statusConfig = getStatusConfig(status)
                        const progress = eval_ ? getProgressPercent(eval_.value, kpi.target) : 0
                        const progressWidth = Math.min(progress, 100)

                        return (
                            <div
                                key={kpi.id}
                                className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                {kpi.name}
                                            </h3>
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(status)}`} />
                                                {statusConfig.label}
                                            </span>
                                        </div>
                                        {kpi.description && (
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{kpi.description}</p>
                                        )}
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                            Target: {kpi.targetType === 'gte' ? '≥' : '≤'} {formatNumber(kpi.target)}% | Current: {eval_ ? `${eval_.value.toFixed(1)}%` : '—'}
                                        </p>

                                        {/* Progress Bar */}
                                        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    progress >= 100
                                                        ? 'bg-green-500'
                                                        : progress >= 75
                                                            ? 'bg-blue-500'
                                                            : progress >= 50
                                                                ? 'bg-orange-500'
                                                                : 'bg-red-500'
                                                }`}
                                                style={{ width: `${progressWidth}%` }}
                                            />
                                        </div>
                                        <div className="mt-1 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                                            <span>{progress.toFixed(0)}% of target</span>
                                            {eval_ && (
                                                <span>Last evaluated: {timeAgo(eval_.evaluatedAt)}</span>
                                            )}
                                        </div>

                                        {/* Meta */}
                                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                                            <span>Period: {kpi.period}</span>
                                            <span>Category: {kpi.category}</span>
                                            {eval_?.changePercent !== null && eval_?.changePercent !== undefined && (
                                                <span className={eval_.changePercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                                    {eval_.changePercent >= 0 ? (
                                                        <TrendingUp className="inline h-3 w-3 mr-0.5" />
                                                    ) : (
                                                        <TrendingDown className="inline h-3 w-3 mr-0.5" />
                                                    )}
                                                    {eval_.changePercent >= 0 ? '+' : ''}{eval_.changePercent.toFixed(1)}%
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="ml-4 flex items-center gap-1">
                                        <button
                                            onClick={() => evaluateKPI(kpi.id)}
                                            disabled={evaluating === kpi.id}
                                            title="Re-evaluate"
                                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700 dark:hover:text-blue-400 disabled:opacity-50"
                                        >
                                            {evaluating === kpi.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <RefreshCw className="h-4 w-4" />
                                            )}
                                        </button>
                                        <button
                                            title="Edit"
                                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                                        >
                                            <Edit3 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => deleteKPI(kpi.id)}
                                            title="Delete"
                                            className="rounded-lg p-2 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {t('analytics.kpi.createTitle') || 'Create New KPI'}
                        </h3>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g., Revenue Growth"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={form.description}
                                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Optional description"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                                    >
                                        {CATEGORIES.filter(c => c !== 'all').map(cat => (
                                            <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Metric *</label>
                                    <select
                                        value={form.metricId}
                                        onChange={(e) => setForm(f => ({ ...f, metricId: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                                    >
                                        {METRIC_OPTIONS.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target *</label>
                                    <input
                                        type="number"
                                        value={form.target}
                                        onChange={(e) => setForm(f => ({ ...f, target: Number(e.target.value) }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Direction</label>
                                    <select
                                        value={form.targetType}
                                        onChange={(e) => setForm(f => ({ ...f, targetType: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                                    >
                                        <option value="gte">≥ Greater than</option>
                                        <option value="lte">≤ Less than</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Period</label>
                                    <select
                                        value={form.period}
                                        onChange={(e) => setForm(f => ({ ...f, period: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                                    >
                                        {PERIODS.map(p => (
                                            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => { setShowCreateModal(false); setForm(DEFAULT_FORM) }}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createKPI}
                                disabled={!form.name.trim() || saving}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
