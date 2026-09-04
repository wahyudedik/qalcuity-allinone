'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    DollarSign,
    ShoppingCart,
    Users,
    ClipboardList,
    AlertTriangle,
    AlertCircle,
    Info,
    FileText,
    UserCheck,
    Package,
    Banknote,
    Sparkles,
    TrendingUp,
    TrendingDown,
    Loader2,
    Receipt,
    Briefcase,
    ClipboardCheck,
    Check,
    X,
    type LucideIcon,
} from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'
import { BarChart, PieChart, LineChart } from '@/components/ui/charts'

interface DashboardStats {
    revenue: { current: number; previous: number; change: number; currency: string }
    orders: { current: number; previous: number; change: number }
    customers: { current: number; previous: number; change: number }
    products: { current: number; previous: number; change: number }
    recentActivities: Array<{
        id: string
        icon: string
        title: string
        description: string
        amount: string
        timestamp: string
        moduleId: string
    }>
    alerts: Array<{
        id: string
        type: string
        title: string
        message: string
        moduleId: string
    }>
}

interface KpiData {
    revenue: { current: number; previous: number; change: number }
    expenses: { current: number; previous: number; change: number }
    profit: { current: number; previous: number; change: number }
    outstandingInvoices: { count: number; total: number }
    lowStockProducts: { count: number; items: Array<{ id: string; name: string; stock: number; minStock: number }> }
    activeEmployees: number
    activeDeals: number
}

interface ChartsData {
    revenueByMonth: { labels: string[]; data: number[] }
    expenseByCategory: { labels: string[]; data: number[] }
    topProducts: { labels: string[]; data: number[] }
    orderTrend: { labels: string[]; data: number[] }
}

const alertIconMap: Record<string, LucideIcon> = {
    danger: AlertCircle,
    warning: AlertTriangle,
    info: Info,
}

const alertColorMap: Record<string, string> = {
    danger: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
}

const quickActionIcons: Record<string, LucideIcon> = {
    invoice: FileText,
    lead: UserCheck,
    product: Package,
    payment: Banknote,
}

interface ApprovalRequest {
    id: string
    entityType: string
    entityDisplay: string
    entityAmount: number | null
    currentLevel: number
    requesterName: string
    createdAt: string
}

interface ApprovalsData {
    count: number
    requests: ApprovalRequest[]
}

const ENTITY_LABELS: Record<string, string> = {
    INVOICE: 'Invoice',
    PURCHASE_ORDER: 'PO',
    QUOTATION: 'Quotation',
}

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [kpi, setKpi] = useState<KpiData | null>(null)
    const [charts, setCharts] = useState<ChartsData | null>(null)
    const [approvals, setApprovals] = useState<ApprovalsData>({ count: 0, requests: [] })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { t } = useTranslation()
    const { addToast } = useToast()

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true)
                setError(null)

                // Fetch dashboard stats + KPI + charts + approvals in parallel
                const [statsRes, kpiRes, chartsRes, approvalsRes] = await Promise.all([
                    fetch('/api/dashboard/stats'),
                    fetch('/api/dashboard/kpi'),
                    fetch('/api/dashboard/charts'),
                    fetch('/api/dashboard/approvals'),
                ])

                const [statsJson, kpiJson, chartsJson, approvalsJson] = await Promise.all([
                    statsRes.json(),
                    kpiRes.json(),
                    chartsRes.json(),
                    approvalsRes.json(),
                ])

                if (statsJson.success) {
                    setStats(statsJson.data)
                }

                if (kpiJson.success) {
                    setKpi(kpiJson.data)
                }

                if (chartsJson.success) {
                    setCharts(chartsJson.data)
                }

                if (approvalsJson.success) {
                    setApprovals(approvalsJson.data)
                }
            } catch {
                setError(t('dashboard.failedToLoad'))
            } finally {
                setLoading(false)
            }
        }
        fetchAllData()
    }, [])

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
                    <div className="mt-2 h-4 w-72 animate-pulse rounded bg-gray-100" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                            <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="mt-3 h-8 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-600" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
                    <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
                </div>
            </div>
        )
    }

    if (error || !stats) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
                    <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">{error || t('common.noData')}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                    >
                        {t('common.refresh') || 'Muat Ulang'}
                    </button>
                </div>
            </div>
        )
    }

    const moduleLinks: Record<string, string> = {
        finance: '/dashboard/finance',
        crm: '/dashboard/crm',
        inventory: '/dashboard/inventory',
        hr: '/dashboard/hr',
    }

    // KPI stat values — use real KPI data from API when available
    const statValues = [
        {
            title: t('dashboard.totalRevenue'),
            value: formatCurrency(kpi?.revenue?.current ?? stats.revenue.current),
            change: kpi?.revenue?.change ?? stats.revenue.change,
        },
        {
            title: t('dashboard.totalOrders'),
            value: stats.orders.current.toString(),
            change: stats.orders.change,
        },
        {
            title: t('dashboard.customers'),
            value: stats.customers.current.toString(),
            change: stats.customers.change,
        },
        {
            title: t('dashboard.products'),
            value: stats.products.current.toString(),
            change: stats.products.change,
        },
    ]

    // Extended KPI row
    const extendedKpis = kpi ? [
        {
            title: t('dashboard.monthlyProfit'),
            value: formatCurrency(kpi.profit.current),
            change: kpi.profit.change,
            icon: DollarSign,
        },
        {
            title: t('dashboard.expenses'),
            value: formatCurrency(kpi.expenses.current),
            change: kpi.expenses.change,
            icon: Receipt,
        },
        {
            title: t('dashboard.invoiceOverdue'),
            value: kpi.outstandingInvoices.count.toString(),
            subtitle: formatCurrency(kpi.outstandingInvoices.total),
            icon: FileText,
        },
        {
            title: t('dashboard.activeEmployees'),
            value: kpi.activeEmployees.toString(),
            icon: Users,
        },
    ] : []

    const quickActions = [
        { href: '/dashboard/finance/invoices', iconKey: 'invoice', label: t('dashboard.createInvoice') },
        { href: '/dashboard/crm/leads', iconKey: 'lead', label: t('dashboard.manageLeads') },
        { href: '/dashboard/inventory/products', iconKey: 'product', label: t('dashboard.manageProducts') },
        { href: '/dashboard/finance/payments', iconKey: 'payment', label: t('dashboard.recordPayment') },
    ]

    // AI Insights from real KPI data
    const revenueChangePercent = kpi?.revenue?.change ?? 0
    const revenueInsightText = revenueChangePercent >= 0
        ? `↑ ${revenueChangePercent}% ${t('dashboard.revenueFromLastMonth')}`
        : `↓ ${Math.abs(revenueChangePercent)}% ${t('dashboard.revenueFromLastMonth')}`
    const revenueInsightDesc = revenueChangePercent >= 10
        ? t('dashboard.revenueGrowthStrong')
        : revenueChangePercent >= 0
            ? t('dashboard.revenueGrowthStable')
            : t('dashboard.revenueDeclining')

    const overdueCount = kpi?.outstandingInvoices?.count ?? 0
    const overdueTotal = kpi?.outstandingInvoices?.total ?? 0
    const cashFlowInsightText = overdueCount > 0
        ? `${overdueCount} ${t('dashboard.overdueInvoicesCount')}`
        : t('dashboard.noOverdueInvoices')
    const cashFlowInsightDesc = overdueCount > 0
        ? `Total ${formatCurrency(overdueTotal)} ${t('dashboard.overdueFollowUp')}`
        : t('dashboard.allInvoicesOnSchedule')

    const lowStockCount = kpi?.lowStockProducts?.count ?? 0
    const lowStockNames = kpi?.lowStockProducts?.items?.map((p) => p.name) ?? []
    const stockInsightText = lowStockCount > 0
        ? `${lowStockCount} ${t('dashboard.lowStockCount')}`
        : t('dashboard.allStocksSafe')
    const stockInsightDesc = lowStockCount > 0
        ? `${lowStockNames.slice(0, 3).join(', ')}${lowStockCount > 3 ? ` dan ${lowStockCount - 3} lainnya` : ''} ${t('dashboard.needRestock')}`
        : t('dashboard.noRestockNeeded')

    return (
        <div className="space-y-6">
            {/* Page Title */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('common.dashboard')}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('dashboard.welcome')}
                </p>
            </div>

            {/* Primary Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statValues.map((stat) => {
                    const Icon = stat === statValues[0] ? DollarSign
                        : stat === statValues[1] ? ShoppingCart
                            : stat === statValues[2] ? Users
                                : ClipboardList
                    return (
                        <StatCard
                            key={stat.title}
                            title={stat.title}
                            value={stat.value}
                            change={`${stat.change >= 0 ? '+' : ''}${stat.change}%`}
                            changeType={stat.change >= 0 ? 'positive' : 'negative'}
                            icon={Icon}
                        />
                    )
                })}
            </div>

            {/* Extended KPI Row */}
            {extendedKpis.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {extendedKpis.map((item) => (
                        <StatCard
                            key={item.title}
                            title={item.title}
                            value={item.value}
                            subtitle={item.subtitle}
                            change={item.change !== undefined ? `${item.change >= 0 ? '+' : ''}${item.change}%` : undefined}
                            changeType={item.change !== undefined ? (item.change >= 0 ? 'positive' : 'negative') : 'neutral'}
                            icon={item.icon}
                        />
                    ))}
                </div>
            )}

            {/* Alerts */}
            {stats.alerts.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        {t('dashboard.alerts')}
                    </h3>
                    <div className="mt-4 space-y-3">
                        {stats.alerts.map((alert) => {
                            const AlertIcon = alertIconMap[alert.type] || Info
                            const iconColor = alertColorMap[alert.type] || 'text-gray-500'
                            return (
                                <div
                                    key={alert.id}
                                    className={`flex items-start gap-3 rounded-lg border p-4 ${alert.type === 'danger'
                                        ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                                        : alert.type === 'warning'
                                            ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
                                            : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                                        }`}
                                >
                                    <AlertIcon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{alert.title}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{alert.message}</p>
                                    </div>
                                    {moduleLinks[alert.moduleId] && (
                                        <Link
                                            href={moduleLinks[alert.moduleId]}
                                            className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                            {t('common.view')} →
                                        </Link>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Pending Approvals Widget */}
            {approvals.count > 0 && (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-800 dark:bg-yellow-900/20">
                    <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            <ClipboardCheck className="h-5 w-5 text-yellow-600" />
                            {t('dashboard.pendingApproval')}
                            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-sm font-bold text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
                                {approvals.count}
                            </span>
                        </h3>
                        <Link
                            href="/dashboard/settings/workflow"
                            className="text-sm font-medium text-yellow-700 hover:text-yellow-900 dark:text-yellow-300 dark:hover:text-yellow-100"
                        >
                            {t('dashboard.viewAllLink')}
                        </Link>
                    </div>
                    <div className="mt-4 space-y-3">
                        {approvals.requests.map((req) => (
                            <div
                                key={req.id}
                                className="flex items-center justify-between rounded-lg border border-yellow-200 bg-white p-4 dark:border-yellow-700 dark:bg-gray-800"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-800/50">
                                        <ClipboardCheck className="h-5 w-5 text-yellow-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {ENTITY_LABELS[req.entityType] || req.entityType} — {req.entityDisplay}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {t('dashboard.submittedBy')} {req.requesterName}
                                            {req.entityAmount !== null && (
                                                <> • {formatCurrency(req.entityAmount)}</>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={async () => {
                                            try {
                                                const res = await fetch(`/api/approval/requests/${req.id}/approve`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ comments: t('dashboard.approveFromDashboard') }),
                                                })
                                                if (res.ok) {
                                                    setApprovals((prev) => ({
                                                        count: Math.max(0, prev.count - 1),
                                                        requests: prev.requests.filter((r) => r.id !== req.id),
                                                    }))
                                                }
                                            } catch {
                                                addToast(t('dashboard.approveFailed'), 'error')
                                            }
                                        }}
                                        className="rounded-lg bg-green-600 p-2 text-white hover:bg-green-700 transition-colors"
                                        title="Approve"
                                    >
                                        <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                const res = await fetch(`/api/approval/requests/${req.id}/reject`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ comments: t('dashboard.rejectFromDashboard') }),
                                                })
                                                if (res.ok) {
                                                    setApprovals((prev) => ({
                                                        count: Math.max(0, prev.count - 1),
                                                        requests: prev.requests.filter((r) => r.id !== req.id),
                                                    }))
                                                }
                                            } catch {
                                                addToast(t('dashboard.rejectFailed'), 'error')
                                            }
                                        }}
                                        className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-700 transition-colors"
                                        title="Reject"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Revenue Chart — from KPI charts API */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.revenue')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.lastSixMonths')}</p>
                    <div className="mt-4">
                        {charts?.revenueByMonth && charts.revenueByMonth.data.length > 0 ? (
                            <BarChart
                                data={charts.revenueByMonth.data}
                                labels={charts.revenueByMonth.labels}
                                colors={CHART_COLORS}
                                height={200}
                            />
                        ) : (
                            <div className="flex h-48 items-center justify-center">
                                <p className="text-sm text-gray-400 dark:text-gray-500">{t('common.noData') || 'Belum ada data'}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Expense by Category Chart */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.expenseByCategory')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.thisMonth')}</p>
                    <div className="mt-4">
                        {charts?.expenseByCategory && charts.expenseByCategory.data.length > 0 ? (
                            <PieChart
                                data={charts.expenseByCategory.data}
                                labels={charts.expenseByCategory.labels}
                                colors={CHART_COLORS}
                                size={200}
                            />
                        ) : (
                            <div className="flex h-48 items-center justify-center">
                                <p className="text-sm text-gray-400 dark:text-gray-500">{t('common.noData') || 'Belum ada data'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Second Charts Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Top Products Chart */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.topProducts')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.lastSixMonths')}</p>
                    <div className="mt-4">
                        {charts?.topProducts && charts.topProducts.data.length > 0 ? (
                            <BarChart
                                data={charts.topProducts.data}
                                labels={charts.topProducts.labels}
                                colors={['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']}
                                height={200}
                            />
                        ) : (
                            <div className="flex h-48 items-center justify-center">
                                <p className="text-sm text-gray-400 dark:text-gray-500">{t('common.noData') || 'Belum ada data'}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Order Trend Chart */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.orderTrend')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.invoicesPerMonth')}</p>
                    <div className="mt-4">
                        {charts?.orderTrend && charts.orderTrend.data.length > 0 ? (
                            <LineChart
                                data={charts.orderTrend.data}
                                labels={charts.orderTrend.labels}
                                color="#8B5CF6"
                                height={200}
                            />
                        ) : (
                            <div className="flex h-48 items-center justify-center">
                                <p className="text-sm text-gray-400 dark:text-gray-500">{t('common.noData') || 'Belum ada data'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.recentActivity')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.latestActivity')}</p>
                <div className="mt-4 space-y-4">
                    {stats.recentActivities.length > 0 ? (
                        stats.recentActivities.map((activity) => (
                            <div key={activity.id} className="flex items-start gap-3">
                                <span className="mt-0.5 text-lg">{activity.icon}</span>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{activity.title}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                            {formatDateTime(activity.timestamp)}
                                        </span>
                                        {moduleLinks[activity.moduleId] && (
                                            <Link
                                                href={moduleLinks[activity.moduleId]}
                                                className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                            >
                                                {activity.moduleId}
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.noActivity')}</p>
                    )}
                </div>
            </div>

            {/* AI Insights — Dynamic from real KPI data */}
            <div className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                <div className="mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">AI Insights</h2>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg bg-white/10 p-4">
                        <p className="text-sm opacity-80">{t('dashboard.revenueInsight')}</p>
                        <div className="flex items-center gap-1 font-semibold">
                            {revenueChangePercent >= 0 ? (
                                <TrendingUp className="h-4 w-4" />
                            ) : (
                                <TrendingDown className="h-4 w-4" />
                            )}
                            {revenueInsightText}
                        </div>
                        <p className="mt-1 text-xs opacity-70">
                            {revenueInsightDesc}
                        </p>
                    </div>

                    <div className="rounded-lg bg-white/10 p-4">
                        <p className="text-sm opacity-80">{t('dashboard.cashFlowAlert')}</p>
                        <div className="flex items-center gap-1 font-semibold">
                            {overdueCount > 0 && <AlertCircle className="h-4 w-4" />}
                            {cashFlowInsightText}
                        </div>
                        <p className="mt-1 text-xs opacity-70">
                            {cashFlowInsightDesc}
                        </p>
                    </div>

                    <div className="rounded-lg bg-white/10 p-4">
                        <p className="text-sm opacity-80">{t('dashboard.stockWarning')}</p>
                        <div className="flex items-center gap-1 font-semibold">
                            {lowStockCount > 0 && <Package className="h-4 w-4" />}
                            {stockInsightText}
                        </div>
                        <p className="mt-1 text-xs opacity-70">
                            {stockInsightDesc}
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.quickActions')}</h3>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {quickActions.map((action) => {
                        const Icon = quickActionIcons[action.iconKey]
                        return (
                            <QuickAction key={action.href} href={action.href} icon={Icon} label={action.label} />
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function StatCard({
    title,
    value,
    subtitle,
    change,
    changeType,
    icon: Icon,
}: {
    title: string
    value: string
    subtitle?: string
    change?: string
    changeType: 'positive' | 'negative' | 'warning' | 'neutral'
    icon: LucideIcon
}) {
    const changeColors = {
        positive: 'text-green-600',
        negative: 'text-red-600',
        warning: 'text-yellow-600',
        neutral: 'text-gray-600',
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
                <Icon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
            </div>
            <div className="mt-2">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
                {subtitle && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
                )}
                {change && (
                    <p className={`mt-1 text-sm ${changeColors[changeType]}`}>{change}</p>
                )}
            </div>
        </div>
    )
}

function QuickAction({
    href,
    icon: Icon,
    label,
}: {
    href: string
    icon: LucideIcon
    label: string
}) {
    return (
        <Link
            href={href}
            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 transition hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-600 dark:hover:bg-blue-900/20"
        >
            <Icon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        </Link>
    )
}
