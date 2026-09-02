'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { LineChart } from '@/components/ui/charts'
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Receipt,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    BarChart3,
    Search,
    Gauge,
    Bell,
    FileText,
    Loader2,
    AlertCircle,
    RefreshCw,
    ChevronRight,
    Download,
    Activity,
    Users,
    Package,
    Target,
} from 'lucide-react'

/* ============================================
   TYPES
   ============================================ */

interface DashboardSummary {
    totalRevenue: number
    totalExpenses: number
    netIncome: number
    cashFlow: number
    revenueChange: number
    expensesChange: number
    totalDeals: number
    winRate: number
    pipelineValue: number
    totalProducts: number
    lowStockCount: number
    activeEmployees: number
    attendanceRate: number
}

interface TimeSeries {
    labels: string[]
    values: number[]
}

interface AlertTriggerItem {
    id: string
    ruleId: string
    message: string
    severity: string
    currentValue: number
    threshold: number
    triggeredAt: string
    acknowledged: boolean
}

interface KPISummaryItem {
    kpiId: string
    name: string
    value: number
    target: number
    status: string
    category: string
}

interface DashboardResponse {
    summary: DashboardSummary
    recentTrends: {
        revenue: TimeSeries
        expenses: TimeSeries
    }
    alerts: AlertTriggerItem[]
    topKPIs: KPISummaryItem[]
}

type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

/* ============================================
   HELPER: Relative time
   ============================================ */

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
   KPI CARD COMPONENT
   ============================================ */

interface KPICardProps {
    title: string
    value: number
    change: number
    icon: typeof DollarSign
    format: 'currency' | 'number' | 'percentage'
    prefix?: string
}

function KPICard({ title, value, change, icon: Icon, format, prefix = '' }: KPICardProps) {
    const isPositive = change >= 0
    const formattedValue = format === 'currency'
        ? formatCurrency(value)
        : format === 'percentage'
            ? `${value.toFixed(1)}%`
            : `${prefix}${formatNumber(value)}`

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
                <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/30">
                    <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
            </div>
            <div className="mt-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formattedValue}
                </span>
            </div>
            <div className="mt-1 flex items-center gap-1">
                {isPositive ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                )}
                <span
                    className={`text-xs font-medium ${isPositive
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                        }`}
                >
                    {isPositive ? '+' : ''}{change.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">vs prev period</span>
            </div>
        </div>
    )
}

/* ============================================
   ALERT SEVERITY COLORS
   ============================================ */

function getSeverityColor(severity: string): string {
    switch (severity) {
        case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
        case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
    }
}

function getSeverityIcon(severity: string): typeof AlertCircle {
    switch (severity) {
        case 'critical': return AlertCircle
        case 'high': return AlertCircle
        default: return Bell
    }
}

/* ============================================
   MAIN PAGE
   ============================================ */

export default function AnalyticsOverviewPage() {
    const { t } = useTranslation()
    const [period, setPeriod] = useState<Period>('monthly')
    const [data, setData] = useState<DashboardResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch(`/api/analytics/dashboard?period=${period}`)
            const json = await res.json()
            if (!res.ok) {
                throw new Error(json.error || 'Failed to load analytics data')
            }
            setData(json)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [period])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    /* ---------- Loading State ---------- */
    if (loading && !data) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-9 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-28 animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="mt-2 h-7 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="mt-2 h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    /* ---------- Error State ---------- */
    if (error && !data) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12 dark:border-red-800 dark:bg-red-900/20">
                <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400" />
                <h3 className="mt-4 text-lg font-semibold text-red-800 dark:text-red-300">
                    {t('analytics.errors.loadFailed') || 'Failed to Load Analytics'}
                </h3>
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
                <button
                    onClick={fetchData}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                    <RefreshCw className="h-4 w-4" />
                    {t('common.retry') || 'Retry'}
                </button>
            </div>
        )
    }

    const summary = data?.summary
    const trends = data?.recentTrends
    const alerts = data?.alerts || []
    const topKPIs = data?.topKPIs || []

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t('analytics.overview.title') || 'Analytics Workspace'}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('analytics.overview.subtitle') || 'Real-time insights across your business'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Period Selector */}
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as Period)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            {summary && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <KPICard
                        title={t('analytics.kpi.revenue') || 'Revenue'}
                        value={summary.totalRevenue}
                        change={summary.revenueChange}
                        icon={DollarSign}
                        format="currency"
                    />
                    <KPICard
                        title={t('analytics.kpi.expenses') || 'Expenses'}
                        value={summary.totalExpenses}
                        change={summary.expensesChange}
                        icon={Receipt}
                        format="currency"
                    />
                    <KPICard
                        title={t('analytics.kpi.netIncome') || 'Net Income'}
                        value={summary.netIncome}
                        change={summary.revenueChange}
                        icon={Wallet}
                        format="currency"
                    />
                    <KPICard
                        title={t('analytics.kpi.cashFlow') || 'Cash Flow'}
                        value={summary.cashFlow}
                        change={summary.cashFlow >= 0 ? 10 : -10}
                        icon={Activity}
                        format="currency"
                    />
                </div>
            )}

            {/* Charts + Metrics Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Revenue Trend Chart */}
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {t('analytics.charts.revenueTrend') || 'Revenue Trend'}
                        </h2>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            {period.charAt(0).toUpperCase() + period.slice(1)} view
                        </span>
                    </div>
                    <div className="mt-4">
                        {trends?.revenue && trends.revenue.values.length >= 2 ? (
                            <LineChart
                                data={trends.revenue.values}
                                labels={trends.revenue.labels}
                                color="#3B82F6"
                                height={220}
                                showDots={true}
                            />
                        ) : (
                            <div className="flex h-[220px] items-center justify-center text-sm text-gray-400 dark:text-gray-500">
                                <div className="text-center">
                                    <BarChart3 className="mx-auto h-8 w-8 opacity-50" />
                                    <p className="mt-2">No trend data available</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Metrics Sidebar */}
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {t('analytics.topMetrics.title') || 'Top Metrics'}
                    </h2>
                    <div className="mt-4 space-y-4">
                        {summary && (
                            <>
                                <MetricRow
                                    icon={Target}
                                    label={t('analytics.metrics.winRate') || 'Win Rate'}
                                    value={`${summary.winRate.toFixed(1)}%`}
                                    sublabel={`${summary.totalDeals} deals`}
                                />
                                <MetricRow
                                    icon={DollarSign}
                                    label={t('analytics.metrics.pipeline') || 'Pipeline Value'}
                                    value={formatCurrency(summary.pipelineValue)}
                                    sublabel={`${summary.totalDeals} active deals`}
                                />
                                <MetricRow
                                    icon={Users}
                                    label={t('analytics.metrics.headcount') || 'Headcount'}
                                    value={formatNumber(summary.activeEmployees)}
                                    sublabel={`${summary.attendanceRate.toFixed(1)}% attendance`}
                                />
                                <MetricRow
                                    icon={Package}
                                    label={t('analytics.metrics.stockValue') || 'Stock Value'}
                                    value={formatCurrency(summary.totalProducts * 100000)}
                                    sublabel={`${summary.lowStockCount} low stock`}
                                />
                            </>
                        )}
                        {topKPIs.slice(0, 4).map((kpi) => (
                            <MetricRow
                                key={kpi.kpiId}
                                icon={Gauge}
                                label={kpi.name}
                                value={`${kpi.value.toFixed(1)}%`}
                                sublabel={`Target: ${kpi.target.toFixed(1)}%`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Active Alerts */}
            {alerts.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {t('analytics.alerts.active') || 'Active Alerts'} ({alerts.length})
                        </h2>
                        <Link
                            href="/dashboard/analytics/alerts"
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                            {t('common.viewAll') || 'View All'}
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {alerts.slice(0, 5).map((alert) => {
                            const SeverityIcon = getSeverityIcon(alert.severity)
                            return (
                                <div
                                    key={alert.id}
                                    className="flex items-center gap-3 px-4 py-3"
                                >
                                    <span className={`inline-flex items-center justify-center rounded-full p-1.5 ${getSeverityColor(alert.severity)}`}>
                                        <SeverityIcon className="h-3.5 w-3.5" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                            {alert.message}
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                            {timeAgo(alert.triggeredAt)}
                                        </p>
                                    </div>
                                    {alert.acknowledged && (
                                        <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                            Acknowledged
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {t('analytics.quickActions.title') || 'Quick Actions'}
                </h2>
                <div className="mt-3 flex flex-wrap gap-3">
                    <QuickAction
                        href="/dashboard/analytics/explorer"
                        icon={Search}
                        label={t('analytics.actions.explorer') || 'Data Explorer'}
                    />
                    <QuickAction
                        href="/dashboard/analytics/kpi"
                        icon={Gauge}
                        label={t('analytics.actions.kpi') || 'KPI Builder'}
                    />
                    <QuickAction
                        href="/dashboard/analytics/reports"
                        icon={FileText}
                        label={t('analytics.actions.reports') || 'Reports'}
                    />
                    <QuickAction
                        href="/dashboard/analytics/alerts"
                        icon={Bell}
                        label={t('analytics.actions.alerts') || 'Alerts'}
                    />
                </div>
            </div>
        </div>
    )
}

/* ============================================
   SUB-COMPONENTS
   ============================================ */

interface MetricRowProps {
    icon: typeof DollarSign
    label: string
    value: string
    sublabel: string
}

function MetricRow({ icon: Icon, label, value, sublabel }: MetricRowProps) {
    return (
        <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-700">
                <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</p>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">{sublabel}</span>
        </div>
    )
}

interface QuickActionProps {
    href: string
    icon: typeof BarChart3
    label: string
}

function QuickAction({ href, icon: Icon, label }: QuickActionProps) {
    return (
        <Link
            href={href}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 dark:hover:border-blue-700"
        >
            <Icon className="h-4 w-4" />
            {label}
        </Link>
    )
}
