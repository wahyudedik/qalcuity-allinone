'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import {
    BarChart3, Loader2, AlertCircle, Check, Download,
    TrendingUp, Receipt, DollarSign, ShoppingCart,
} from 'lucide-react'
import { BarChart, PieChart } from '@/components/ui/charts'

type DashboardData = {
    todaySales: number
    todayTax: number
    todayTransactionCount: number
    totalTransactions: number
    activeSessions: number
    recentTransactions: {
        id: string
        transactionNo: string
        totalAmount: number
        paymentMethod: string
        status: string
        createdAt: string
    }[]
    paymentMethods: {
        method: string
        count: number
        total: number
    }[]
}

type ReportData = {
    daily: { date: string; total: number; count: number }[]
    weekly: { date: string; total: number; count: number }[]
    monthly: { date: string; total: number; count: number }[]
    topProducts: { name: string; quantity: number; revenue: number }[]
    paymentBreakdown: { method: string; count: number; total: number; percentage: number }[]
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: 'Tunai',
    CARD: 'Kartu',
    QRIS: 'QRIS',
    E_WALLET: 'E-Wallet',
    BANK_TRANSFER: 'Transfer',
}

const PAYMENT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']

export default function POSReportsPage() {
    const { t } = useTranslation()

    const [dashboard, setDashboard] = useState<DashboardData | null>(null)
    const [report, setReport] = useState<ReportData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Date range filter
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        return d.toISOString().split('T')[0]
    })
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchDashboard = useCallback(async () => {
        try {
            const response = await fetch('/api/pos/dashboard')
            const data = await response.json()
            if (data.success) {
                setDashboard(data.data)
            }
        } catch {
            // Silent fail for dashboard
        }
    }, [])

    const fetchReport = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            params.set('dateFrom', dateFrom)
            params.set('dateTo', dateTo)

            // Fetch transactions for the date range
            const response = await fetch(`/api/pos/transactions?${params.toString()}&limit=1000`)
            const data = await response.json()
            if (data.success) {
                const transactions = data.data as { totalAmount: number; paymentMethod: string; status: string; createdAt: string; items: { productName: string; quantity: number; unitPrice: number; subtotal: number }[] }[]

                // Build daily data
                const dailyMap = new Map<string, { total: number; count: number }>()
                const weeklyMap = new Map<string, { total: number; count: number }>()
                const monthlyMap = new Map<string, { total: number; count: number }>()
                const productMap = new Map<string, { quantity: number; revenue: number }>()
                const paymentMap = new Map<string, { count: number; total: number }>()

                for (const tx of transactions) {
                    if (tx.status !== 'COMPLETED') continue

                    const date = new Date(tx.createdAt)
                    const dayKey = date.toISOString().split('T')[0]
                    const weekKey = getWeekKey(date)
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

                    // Daily
                    const dayEntry = dailyMap.get(dayKey) || { total: 0, count: 0 }
                    dayEntry.total += tx.totalAmount
                    dayEntry.count += 1
                    dailyMap.set(dayKey, dayEntry)

                    // Weekly
                    const weekEntry = weeklyMap.get(weekKey) || { total: 0, count: 0 }
                    weekEntry.total += tx.totalAmount
                    weekEntry.count += 1
                    weeklyMap.set(weekKey, weekEntry)

                    // Monthly
                    const monthEntry = monthlyMap.get(monthKey) || { total: 0, count: 0 }
                    monthEntry.total += tx.totalAmount
                    monthEntry.count += 1
                    monthlyMap.set(monthKey, monthEntry)

                    // Products
                    for (const item of tx.items) {
                        const prod = productMap.get(item.productName) || { quantity: 0, revenue: 0 }
                        prod.quantity += item.quantity
                        prod.revenue += item.subtotal
                        productMap.set(item.productName, prod)
                    }

                    // Payment methods
                    const payEntry = paymentMap.get(tx.paymentMethod) || { count: 0, total: 0 }
                    payEntry.count += 1
                    payEntry.total += tx.totalAmount
                    paymentMap.set(tx.paymentMethod, payEntry)
                }

                const daily = Array.from(dailyMap.entries())
                    .map(([date, v]) => ({ date, ...v }))
                    .sort((a, b) => a.date.localeCompare(b.date))

                const weekly = Array.from(weeklyMap.entries())
                    .map(([date, v]) => ({ date, ...v }))
                    .sort((a, b) => a.date.localeCompare(b.date))

                const monthly = Array.from(monthlyMap.entries())
                    .map(([date, v]) => ({ date, ...v }))
                    .sort((a, b) => a.date.localeCompare(b.date))

                const topProducts = Array.from(productMap.entries())
                    .map(([name, v]) => ({ name, ...v }))
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 10)

                const totalPaymentCount = Array.from(paymentMap.values()).reduce((s, v) => s + v.count, 0)
                const paymentBreakdown = Array.from(paymentMap.entries())
                    .map(([method, v]) => ({
                        method,
                        ...v,
                        percentage: totalPaymentCount > 0 ? Math.round((v.count / totalPaymentCount) * 100) : 0,
                    }))
                    .sort((a, b) => b.total - a.total)

                setReport({ daily, weekly, monthly, topProducts, paymentBreakdown })
            } else {
                setError(data.error || 'Gagal memuat data laporan')
            }
        } catch {
            setError('Gagal memuat data laporan. Periksa koneksi jaringan Anda.')
        } finally {
            setLoading(false)
        }
    }, [dateFrom, dateTo])

    useEffect(() => {
        fetchDashboard()
        fetchReport()
    }, [fetchDashboard, fetchReport])

    const handleExport = () => {
        setToast({ message: 'Fitur export akan segera hadir', type: 'success' })
    }

    // Calculate summary stats
    const todayTotal = dashboard?.todaySales || 0
    const todayCount = dashboard?.todayTransactionCount || 0
    const todayAvg = todayCount > 0 ? todayTotal / todayCount : 0

    // Weekly summary from report data
    const weeklyTotal = report?.weekly.reduce((s, w) => s + w.total, 0) || 0
    const weeklyCount = report?.weekly.reduce((s, w) => s + w.count, 0) || 0

    // Monthly summary from report data
    const monthlyTotal = report?.monthly.reduce((s, m) => s + m.total, 0) || 0
    const monthlyCount = report?.monthly.reduce((s, m) => s + m.count, 0) || 0

    // Daily chart data (last 7 days)
    const chartDaily = report?.daily.slice(-7) || []
    const chartDailyLabels = chartDaily.map((d) => {
        const date = new Date(d.date)
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    })
    const chartDailyData = chartDaily.map((d) => d.total)

    // Payment pie chart
    const pieLabels = report?.paymentBreakdown.map((p) => PAYMENT_METHOD_LABELS[p.method] || p.method) || []
    const pieData = report?.paymentBreakdown.map((p) => p.total) || []

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="h-6 w-6" />
                        {t('pos.reports.title') || 'Laporan POS'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">{t('pos.reports.subtitle') || 'Analisis dan laporan penjualan point of sale'}</p>
                </div>
                <button
                    onClick={handleExport}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                    <Download className="h-4 w-4" />
                    Export
                </button>
            </div>

            {/* Date Range Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500">Dari:</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500">Sampai:</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                </div>
                <button
                    onClick={fetchReport}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <BarChart3 className="h-4 w-4" />
                    Filter
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
                    <p className="text-sm text-gray-500">{error}</p>
                    <button onClick={fetchReport} className="mt-3 text-sm text-blue-600 hover:underline">Coba Lagi</button>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                    <DollarSign className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('pos.reports.todaySales') || 'Penjualan Hari Ini'}</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(todayTotal)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                                    <Receipt className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('pos.reports.todayTransactions') || 'Transaksi Hari Ini'}</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">{todayCount} transaksi</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                    <TrendingUp className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('pos.reports.avgPerTransaction') || 'Rata-rata/Transaksi'}</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(todayAvg)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                    <ShoppingCart className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('pos.reports.activeSessions') || 'Sesi Aktif'}</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">{dashboard?.activeSessions || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Period Summaries */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('pos.reports.weeklySummary') || 'Ringkasan Minggu Ini'}</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Total Penjualan</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(weeklyTotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Jumlah Transaksi</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{weeklyCount}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Rata-rata/Transaksi</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(weeklyCount > 0 ? weeklyTotal / weeklyCount : 0)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('pos.reports.monthlySummary') || 'Ringkasan Bulan Ini'}</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Total Penjualan</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(monthlyTotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Jumlah Transaksi</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{monthlyCount}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Rata-rata/Transaksi</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(monthlyCount > 0 ? monthlyTotal / monthlyCount : 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Daily Sales Chart */}
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">{t('pos.reports.dailySales') || 'Penjualan Harian (7 Hari Terakhir)'}</h3>
                            {chartDailyData.length > 0 ? (
                                <BarChart
                                    data={chartDailyData}
                                    labels={chartDailyLabels}
                                    height={200}
                                    valuePrefix="Rp "
                                />
                            ) : (
                                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                                    Belum ada data
                                </div>
                            )}
                        </div>

                        {/* Payment Method Breakdown */}
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">{t('pos.reports.paymentBreakdown') || 'Metode Pembayaran'}</h3>
                            {pieData.length > 0 ? (
                                <PieChart
                                    data={pieData}
                                    labels={pieLabels}
                                    colors={PAYMENT_COLORS}
                                    size={140}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                                    Belum ada data
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Products */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">{t('pos.reports.topProducts') || 'Produk Terlaris'}</h3>
                        {report?.topProducts && report.topProducts.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pendapatan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {report.topProducts.map((p, i) => (
                                            <tr key={p.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{p.name}</td>
                                                <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">{formatNumber(p.quantity)}</td>
                                                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(p.revenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 text-center py-8">Belum ada data produk</p>
                        )}
                    </div>

                    {/* Payment Method Table */}
                    {report?.paymentBreakdown && report.paymentBreakdown.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">{t('pos.reports.paymentSummary') || 'Ringkasan Metode Pembayaran'}</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metode</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Persentase</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {report.paymentBreakdown.map((p) => (
                                            <tr key={p.method} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                                    {PAYMENT_METHOD_LABELS[p.method] || p.method}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">{p.count}</td>
                                                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(p.total)}</td>
                                                <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">{p.percentage}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

function getWeekKey(date: Date): string {
    const startOfYear = new Date(date.getFullYear(), 0, 1)
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)
    return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`
}
