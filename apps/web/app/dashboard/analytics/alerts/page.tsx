'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import {
    Bell,
    Plus,
    AlertCircle,
    CheckCircle,
    Clock,
    Loader2,
    X,
    Shield,
    ShieldAlert,
    ShieldCheck,
    ToggleLeft,
    ToggleRight,
    TrendingDown,
    TrendingUp,
    Hash,
} from 'lucide-react'

/* ============================================
   TYPES
   ============================================ */

interface AlertRule {
    id: string
    name: string
    description: string | null
    metricId: string
    condition: string
    threshold: number
    severity: string
    notificationChannels: string[]
    recipients: string[]
    cooldownMinutes: number
    isActive: boolean
    lastTriggeredAt: string | null
    triggerCount: number
    createdAt: string
    updatedAt: string
}

interface AlertTrigger {
    id: string
    ruleId: string
    ruleName: string
    metricId: string
    currentValue: number
    threshold: number
    severity: string
    message: string
    acknowledged: boolean
    acknowledgedBy: string | null
    acknowledgedAt: string | null
    triggeredAt: string
}

interface AlertRuleResponse {
    success: boolean
    data: AlertRule[]
}

interface AlertTriggerResponse {
    success: boolean
    data: AlertTrigger[]
}

/* ============================================
   CONSTANTS
   ============================================ */

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical'] as const
const CONDITION_OPTIONS = [
    { value: 'below', label: 'Below threshold' },
    { value: 'above', label: 'Above threshold' },
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' },
    { value: 'changes_by', label: 'Changes by %' },
]

const METRIC_OPTIONS = [
    { id: 'revenue', name: 'Revenue' },
    { id: 'total_expenses', name: 'Total Expenses' },
    { id: 'win_rate', name: 'Win Rate' },
    { id: 'pipeline_value', name: 'Pipeline Value' },
    { id: 'total_stock_value', name: 'Stock Value' },
    { id: 'employee_count', name: 'Employee Count' },
    { id: 'attendance_rate', name: 'Attendance Rate' },
]

/* ============================================
   HELPERS
   ============================================ */

function getSeverityConfig(severity: string): { color: string; bg: string; icon: typeof AlertCircle } {
    switch (severity) {
        case 'critical':
            return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', icon: ShieldAlert }
        case 'high':
            return { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', icon: ShieldAlert }
        case 'medium':
            return { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', icon: Shield }
        case 'low':
            return { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: ShieldCheck }
        default:
            return { color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700', icon: Bell }
    }
}

function getConditionLabel(condition: string): string {
    switch (condition) {
        case 'below': return '<'
        case 'above': return '>'
        case 'equals': return '='
        case 'not_equals': return '≠'
        case 'changes_by': return 'Δ%'
        default: return '?'
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

/* ============================================
   CREATE ALERT FORM
   ============================================ */

interface CreateAlertForm {
    name: string
    description: string
    metricId: string
    condition: string
    threshold: number
    severity: string
    cooldownMinutes: number
}

const DEFAULT_FORM: CreateAlertForm = {
    name: '',
    description: '',
    metricId: 'revenue',
    condition: 'below',
    threshold: 0,
    severity: 'medium',
    cooldownMinutes: 60,
}

/* ============================================
   MAIN PAGE
   ============================================ */

export default function AnalyticsAlertsPage() {
    const { t } = useTranslation()
    const [rules, setRules] = useState<AlertRule[]>([])
    const [triggers, setTriggers] = useState<AlertTrigger[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [form, setForm] = useState<CreateAlertForm>(DEFAULT_FORM)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<'rules' | 'triggers'>('rules')

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const [rulesRes, triggersRes] = await Promise.all([
                fetch('/api/analytics/alerts'),
                fetch('/api/analytics/alerts/triggers?limit=20'),
            ])
            const rulesJson: AlertRuleResponse = await rulesRes.json()
            const triggersJson: AlertTriggerResponse = await triggersRes.json()
            if (rulesJson.success) setRules(rulesJson.data)
            if (triggersJson.success) setTriggers(triggersJson.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    /* ---------- Toggle Rule ---------- */
    const toggleRule = async (id: string, current: boolean) => {
        try {
            const res = await fetch(`/api/analytics/alerts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !current }),
            })
            if (!res.ok) throw new Error('Failed to toggle')
            setRules(prev => prev.map(r =>
                r.id === id ? { ...r, isActive: !r.isActive } : r
            ))
        } catch {
            setError('Failed to toggle alert rule')
        }
    }

    /* ---------- Delete Rule ---------- */
    const deleteRule = async (id: string) => {
        if (!confirm('Delete this alert rule?')) return
        try {
            const res = await fetch(`/api/analytics/alerts/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete')
            setRules(prev => prev.filter(r => r.id !== id))
        } catch {
            setError('Failed to delete alert rule')
        }
    }

    /* ---------- Acknowledge Trigger ---------- */
    const acknowledgeTrigger = async (id: string) => {
        try {
            const res = await fetch(`/api/analytics/alerts/triggers/${id}/acknowledge`, {
                method: 'POST',
            })
            if (!res.ok) throw new Error('Failed to acknowledge')
            setTriggers(prev => prev.map(t =>
                t.id === id ? { ...t, acknowledged: true } : t
            ))
        } catch {
            setError('Failed to acknowledge trigger')
        }
    }

    /* ---------- Create Alert ---------- */
    const createAlert = async () => {
        if (!form.name.trim()) return
        try {
            setSaving(true)
            const res = await fetch('/api/analytics/alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || 'Failed to create')
            }
            setShowCreateModal(false)
            setForm(DEFAULT_FORM)
            fetchData()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create')
        } finally {
            setSaving(false)
        }
    }

    const activeRuleCount = rules.filter(r => r.isActive).length
    const totalTriggerCount = triggers.length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t('analytics.alerts.title') || 'Data Alerts'}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('analytics.alerts.subtitle') || 'Monitor metrics and get notified when thresholds are breached'}
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4" />
                    {t('analytics.alerts.create') || 'Create Alert'}
                </button>
            </div>

            {/* Stats Bar */}
            <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    Alert Rules (<span className="font-medium text-gray-700 dark:text-gray-300">{activeRuleCount} active</span>)
                </span>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    Triggers (<span className="font-medium text-gray-700 dark:text-gray-300">{totalTriggerCount} total</span>)
                </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab('rules')}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === 'rules'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                        }`}
                >
                    <Bell className="inline h-3 w-3 mr-1" />
                    Alert Rules
                </button>
                <button
                    onClick={() => setActiveTab('triggers')}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === 'triggers'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                        }`}
                >
                    <AlertCircle className="inline h-3 w-3 mr-1" />
                    Recent Triggers
                </button>
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
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-24 animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="mt-2 h-3 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="mt-2 h-3 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    ))}
                </div>
            )}

            {/* Rules Tab */}
            {!loading && activeTab === 'rules' && (
                <>
                    {rules.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-16 dark:border-gray-600">
                            <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                            <h3 className="mt-4 text-lg font-semibold text-gray-600 dark:text-gray-400">
                                {t('analytics.alerts.empty.title') || 'No Alert Rules'}
                            </h3>
                            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500 text-center max-w-sm">
                                {t('analytics.alerts.empty.description') || 'Create your first alert rule to get notified when metrics cross thresholds.'}
                            </p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                <Plus className="h-4 w-4" />
                                {t('analytics.alerts.create') || 'Create Alert'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {rules.map(rule => {
                                const sevConfig = getSeverityConfig(rule.severity)
                                const SevIcon = sevConfig.icon
                                return (
                                    <div
                                        key={rule.id}
                                        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                        {rule.name}
                                                    </h3>
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sevConfig.bg} ${sevConfig.color}`}>
                                                        <SevIcon className="h-3 w-3" />
                                                        {rule.severity.charAt(0).toUpperCase() + rule.severity.slice(1)}
                                                    </span>
                                                </div>
                                                {rule.description && (
                                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{rule.description}</p>
                                                )}
                                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                                    <span className="font-medium">IF</span> {rule.metricId} {getConditionLabel(rule.condition)} {rule.threshold}
                                                </p>
                                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                                    <span className="font-medium">THEN</span> notify via {rule.notificationChannels.join(', ')}
                                                </p>
                                                <div className="mt-2 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                                                    {rule.lastTriggeredAt && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            Last triggered: {timeAgo(rule.lastTriggeredAt)}
                                                        </span>
                                                    )}
                                                    <span>Cooldown: {rule.cooldownMinutes} min</span>
                                                    <span>{rule.triggerCount} triggers</span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="ml-4 flex items-center gap-2">
                                                <button
                                                    onClick={() => toggleRule(rule.id, rule.isActive)}
                                                    title={rule.isActive ? 'Disable' : 'Enable'}
                                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                >
                                                    {rule.isActive ? (
                                                        <ToggleRight className="h-6 w-6 text-green-500" />
                                                    ) : (
                                                        <ToggleLeft className="h-6 w-6 text-gray-400" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Triggers Tab */}
            {!loading && activeTab === 'triggers' && (
                <>
                    {triggers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-12 dark:border-gray-600">
                            <CheckCircle className="h-10 w-10 text-green-400 dark:text-green-500" />
                            <h3 className="mt-4 text-lg font-semibold text-gray-600 dark:text-gray-400">
                                All Clear
                            </h3>
                            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                                No alert triggers yet. Create alert rules to start monitoring.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {triggers.map(trigger => {
                                const sevConfig = getSeverityConfig(trigger.severity)
                                return (
                                    <div
                                        key={trigger.id}
                                        className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${trigger.acknowledged
                                                ? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                                                : 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/10'
                                            }`}
                                    >
                                        {trigger.acknowledged ? (
                                            <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                                        ) : (
                                            <AlertCircle className={`h-4 w-4 shrink-0 ${sevConfig.color}`} />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                                {trigger.message}
                                            </p>
                                            <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                                                <span>{timeAgo(trigger.triggeredAt)}</span>
                                                {trigger.acknowledged && (
                                                    <span className="text-green-600 dark:text-green-400">Acknowledged</span>
                                                )}
                                            </div>
                                        </div>
                                        {!trigger.acknowledged && (
                                            <button
                                                onClick={() => acknowledgeTrigger(trigger.id)}
                                                className="shrink-0 rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-white dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                            >
                                                Acknowledge
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {t('analytics.alerts.createTitle') || 'Create Alert Rule'}
                        </h3>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g., Revenue Below Target"
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condition *</label>
                                    <select
                                        value={form.condition}
                                        onChange={(e) => setForm(f => ({ ...f, condition: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                                    >
                                        {CONDITION_OPTIONS.map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Threshold *</label>
                                    <input
                                        type="number"
                                        value={form.threshold}
                                        onChange={(e) => setForm(f => ({ ...f, threshold: Number(e.target.value) }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severity</label>
                                    <select
                                        value={form.severity}
                                        onChange={(e) => setForm(f => ({ ...f, severity: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                                    >
                                        {SEVERITY_OPTIONS.map(s => (
                                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cooldown (min)</label>
                                    <input
                                        type="number"
                                        value={form.cooldownMinutes}
                                        onChange={(e) => setForm(f => ({ ...f, cooldownMinutes: Number(e.target.value) }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                                    />
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
                                onClick={createAlert}
                                disabled={!form.name.trim() || saving}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
