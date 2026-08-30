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
    type LucideIcon,
} from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

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

interface PaymentData {
    id: string
    amount: number | string
    type: string
    date: string
    status: string
}

interface InvoiceData {
    id: string
    invoiceNumber: string
    status: string
    dueDate: string
    total: number | string
}

interface ProductData {
    id: string
    name: string
    sku: string
    stock: number
    minStock: number
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

const statIcons: LucideIcon[] = [DollarSign, ShoppingCart, Users, ClipboardList]

const quickActionIcons: Record<string, LucideIcon> = {
    invoice: FileText,
    lead: UserCheck,
    product: Package,
    payment: Banknote,
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [revenueChartData, setRevenueChartData] = useState<number[]>([])
    const [revenueChartLabels, setRevenueChartLabels] = useState<string[]>([])
    const [overdueCount, setOverdueCount] = useState(0)
    const [overdueTotal, setOverdueTotal] = useState(0)
    const [lowStockCount, setLowStockCount] = useState(0)
    const [lowStockNames, setLowStockNames] = useState<string[]>([])
    const [revenueChangePercent, setRevenueChangePercent] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { t } = useTranslation()

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true)
                setError(null)

                // Fetch dashboard stats + supporting data in parallel
                const [statsRes, paymentsRes, invoicesRes, productsRes] = await Promise.all([
                    fetch('/api/dashboard/stats'),
                    fetch('/api/finance/payments?limit=1000&type=INCOME'),
                    fetch('/api/finance/invoices?limit=1000'),
                    fetch('/api/inventory/products?limit=1000'),
                ])

                const [statsJson, paymentsJson, invoicesJson, productsJson] = await Promise.all([
                    statsRes.json(),
                    paymentsRes.json(),
                    invoicesRes.json(),
                    productsRes.json(),
                ])

                if (statsJson.success) {
                    setStats(statsJson.data)
                }

                // Process payments for revenue chart (last 6 months)
                if (paymentsJson.success) {
                    const payments: PaymentData[] = paymentsJson.data
                    const now = new Date()
                    const chartData: number[] = []
                    const chartLabels: string[] = []

                    for (let i = 5; i >= 0; i--) {
                        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
                        const month = monthDate.getMonth()
                        const year = monthDate.getFullYear()

                        const monthTotal = payments
                            .filter((p) => {
                                const pDate = new Date(p.date)
                                return pDate.getMonth() === month && pDate.getFullYear() === year && p.status === 'completed'
                            })
                            .reduce((sum, p) => sum + Number(p.amount || 0), 0)

                        chartData.push(monthTotal)
                        chartLabels.push(MONTH_LABELS[month])
                    }

                    setRevenueChartData(chartData)
                    setRevenueChartLabels(chartLabels)

                    // Calculate revenue change (this month vs last month)
                    const thisMonth = payments.filter((p) => {
                        const pDate = new Date(p.date)
                        return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear() && p.status === 'completed'
                    }).reduce((sum, p) => sum + Number(p.amount || 0), 0)

                    const lastMonth = payments.filter((p) => {
                        const pDate = new Date(p.date)
                        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                        return pDate.getMonth() === lastMonthDate.getMonth() && pDate.getFullYear() === lastMonthDate.getFullYear() && p.status === 'completed'
                    }).reduce((sum, p) => sum + Number(p.amount || 0), 0)

                    if (lastMonth > 0) {
                        setRevenueChangePercent(Math.round(((thisMonth - lastMonth) / lastMonth) * 100))
                    } else if (thisMonth > 0) {
                        setRevenueChangePercent(100)
                    }
                }

                // Process invoices for overdue count
                if (invoicesJson.success) {
                    const invoices: InvoiceData[] = invoicesJson.data
                    const now = new Date()
                    const overdue = invoices.filter((inv) =>
                        ['sent', 'overdue'].includes(inv.status) && new Date(inv.dueDate) < now
                    )
                    setOverdueCount(overdue.length)
                    setOverdueTotal(overdue.reduce((sum, inv) => sum + Number(inv.total || 0), 0))
                }

                // Process products for low stock
                if (productsJson.success) {
                    const products: ProductData[] = productsJson.data
                    const lowStock = products.filter((p) => p.stock <= p.minStock)
                    setLowStockCount(lowStock.length)
                    setLowStockNames(lowStock.slice(0, 3).map((p) => p.name))
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

    const statValues = [
        { title: t('dashboard.totalRevenue'), value: formatCurrency(stats.revenue.current), change: stats.revenue.change },
        { title: t('dashboard.totalOrders'), value: stats.orders.current.toString(), change: stats.orders.change },
        { title: t('dashboard.customers'), value: stats.customers.current.toString(), change: stats.customers.change },
        { title: t('dashboard.products'), value: stats.products.current.toString(), change: stats.products.change },
    ]

    const quickActions = [
        { href: '/dashboard/finance/invoices', iconKey: 'invoice', label: t('dashboard.createInvoice') },
        { href: '/dashboard/crm/leads', iconKey: 'lead', label: t('dashboard.manageLeads') },
        { href: '/dashboard/inventory/products', iconKey: 'product', label: t('dashboard.manageProducts') },
        { href: '/dashboard/finance/payments', iconKey: 'payment', label: t('dashboard.recordPayment') },
    ]

    // Calculate max value for chart scaling
    const maxChartValue = Math.max(...revenueChartData, 1)

    // AI Insights from real data
    const revenueInsightText = revenueChangePercent >= 0
        ? `↑ ${revenueChangePercent}% dari bulan lalu`
        : `↓ ${Math.abs(revenueChangePercent)}% dari bulan lalu`
    const revenueInsightDesc = revenueChangePercent >= 10
        ? 'Pertumbuhan kuat. Pertahankan momentum ini.'
        : revenueChangePercent >= 0
            ? 'Pertumbuhan stabil. Pertimbangkan promosi untuk mencapai target Q3.'
            : 'Revenue menurun. Perlu evaluasi strategi penjualan.'

    const cashFlowInsightText = overdueCount > 0
        ? `${overdueCount} invoice overdue`
        : 'Tidak ada invoice overdue'
    const cashFlowInsightDesc = overdueCount > 0
        ? `Total ${formatCurrency(overdueTotal)} perlu follow up segera.`
        : 'Semua invoice sudah sesuai jadwal.'

    const stockInsightText = lowStockCount > 0
        ? `${lowStockCount} produk low stock`
        : 'Semua stok produk aman'
    const stockInsightDesc = lowStockCount > 0
        ? `${lowStockNames.join(', ')}${lowStockCount > 3 ? ` dan ${lowStockCount - 3} lainnya` : ''} perlu restock.`
        : 'Tidak ada produk yang perlu restock saat ini.'

    return (
        <div className="space-y-6">
            {/* Page Title */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('dashboard.welcome')}
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statValues.map((stat, i) => {
                    const Icon = statIcons[i]
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

            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Revenue Chart — Dynamic from payments data */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.revenue')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.lastSixMonths')}</p>
                    <div className="mt-4 flex h-48 items-end gap-2">
                        {revenueChartData.length > 0 ? revenueChartData.map((value, i) => {
                            const heightPercent = maxChartValue > 0 ? (value / maxChartValue) * 100 : 0
                            return (
                                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                                    <div
                                        className="w-full rounded-t bg-blue-500 transition-all hover:bg-blue-600"
                                        style={{ height: `${Math.max(heightPercent, 2)}%` }}
                                        title={formatCurrency(value)}
                                    />
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        {revenueChartLabels[i]}
                                    </span>
                                </div>
                            )
                        }) : (
                            <div className="flex w-full items-center justify-center">
                                <p className="text-sm text-gray-400 dark:text-gray-500">{t('common.noData') || 'Belum ada data'}</p>
                            </div>
                        )}
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
            </div>

            {/* AI Insights — Dynamic from real data */}
            <div className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                <div className="mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">AI Insights</h2>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg bg-white/10 p-4">
                        <p className="text-sm opacity-80">Revenue Insight</p>
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
                        <p className="text-sm opacity-80">Cash Flow Alert</p>
                        <div className="flex items-center gap-1 font-semibold">
                            {overdueCount > 0 && <AlertCircle className="h-4 w-4" />}
                            {cashFlowInsightText}
                        </div>
                        <p className="mt-1 text-xs opacity-70">
                            {cashFlowInsightDesc}
                        </p>
                    </div>

                    <div className="rounded-lg bg-white/10 p-4">
                        <p className="text-sm opacity-80">Stock Warning</p>
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
    change,
    changeType,
    icon: Icon,
}: {
    title: string
    value: string
    change: string
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
                <p className={`mt-1 text-sm ${changeColors[changeType]}`}>{change}</p>
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
