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
    type LucideIcon,
} from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils'

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

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true)
                const response = await fetch('/api/dashboard/stats')
                const data = await response.json()
                if (data.success) {
                    setStats(data.data)
                } else {
                    setError('Gagal memuat data dashboard')
                }
            } catch {
                setError('Gagal memuat data dashboard')
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
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
            </div>
        )
    }

    if (error || !stats) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <p className="text-lg text-gray-600">{error || 'Data tidak tersedia'}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                    >
                        Muat Ulang
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
        { title: 'Total Revenue', value: formatCurrency(stats.revenue.current), change: stats.revenue.change },
        { title: 'Total Orders', value: stats.orders.current.toString(), change: stats.orders.change },
        { title: 'Customers', value: stats.customers.current.toString(), change: stats.customers.change },
        { title: 'Products', value: stats.products.current.toString(), change: stats.products.change },
    ]

    const quickActions = [
        { href: '/dashboard/finance/invoices', iconKey: 'invoice', label: 'Buat Invoice' },
        { href: '/dashboard/crm/leads', iconKey: 'lead', label: 'Kelola Lead' },
        { href: '/dashboard/inventory/products', iconKey: 'product', label: 'Kelola Produk' },
        { href: '/dashboard/finance/payments', iconKey: 'payment', label: 'Catat Pembayaran' },
    ]

    return (
        <div className="space-y-6">
            {/* Page Title */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Selamat datang kembali! Berikut ringkasan bisnis Anda hari ini.
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
                        Alerts
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
                                            Lihat →
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
                {/* Revenue Chart */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Revenue</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">6 bulan terakhir</p>
                    <div className="mt-4 flex h-48 items-end gap-2">
                        {[40, 65, 45, 80, 60, 95].map((height, i) => (
                            <div key={i} className="flex flex-1 flex-col items-center gap-1">
                                <div
                                    className="w-full rounded-t bg-blue-500 transition-all hover:bg-blue-600"
                                    style={{ height: `${height}%` }}
                                />
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    {["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"][i]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Aktivitas terbaru</p>
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
                            <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada aktivitas terbaru</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h3>
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
