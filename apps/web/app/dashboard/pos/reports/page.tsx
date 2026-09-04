'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import {
    BarChart3, Loader2, AlertCircle, Check, Download,
    TrendingUp, TrendingDown, Receipt, DollarSign, ShoppingCart,
    Users, Minus,
} from 'lucide-react'
import { BarChart, PieChart, LineChart } from '@/components/ui/charts'

// ─── Types ──────────────────────────────────────────────────────────────────

type SummaryData = {
    today: { sales: number; tax: number; transactionCount: number; avgTransactionValue: number }
    yesterday: { sales: number; tax: number; transactionCount: number; avgTransactionValue: number }
    change: { salesPercent: number; countPercent: number; avgPercent: number }
    activeSessions: number
    totalTerminals: number
}

type AnalyticsData = {
    salesByPeriod: { date: string; total: number; count: number }[]
    topProducts: { name: string; quantity: number; revenue: number }[]
    salesByCategory: { category: string; quantity: number; revenue: number }[]
    hourlyTrend: { hour: number; count: number; total: number }[]
    paymentMethodBreakdown: { method: string; count: number; total: number; percentage: number }[]
    meta: { period: string; startDate: string; endDate: string; totalTransactions: number }
}

type CashierData = {
    cashierId: string
    cashierName: string
    transactionCount: number
    totalSales: number
    avgTransactionValue: number
    sessionCount: number
}

type PeriodOption = 'daily' | 'weekly' | 'monthly' | 'custom'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: 'Tunai',
    CARD: 'Kartu',
    QRIS: 'QRIS',
    E_WALLET: 'E-Wallet',
    BANK_TRANSFER: 'Transfer',
}

const PAYMENT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']

// ─── Component ──────────────────────────────────────────────────────────────

export default function POSReportsPage() {
    const { t } = useTranslation()

    const [summary, setSummary] = useState<SummaryData | null>(null)
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
    const [cashiers, setCashiers] = useState<CashierData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Period selector
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('weekly')
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        return d.toISOString().split('T')[0]
    })
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    // Handle period preset selection
    const handlePeriodChange = useCallback((period: PeriodOption) => {
        setSelectedPeriod(period)
        const now = new Date()
        const to = now.toISOString().split('T')[0]
        let from: string

        switch (period) {
            case 'daily': {
                const d = new Date(now)
                from = d.toISOString().split('T')[0]
                break
            }
            case 'weekly': {
                const d = new Date(now)
                d.setDate(d.getDate() - 7)
                from = d.toISOString().split('T')[0]
                break
            }
            case 'monthly': {
                const d = new Date(now)
                d.setMonth(d.getMonth() - 1)
                from = d.toISOString().split('T')[0]
                break
            }
            default:
                from = dateFrom
        }
        setDateFrom(from)
        setDateTo(to)
    }, [dateFrom])

    const fetchSummary = useCallback(async () => {
        try {
            const response = await fetch('/api/pos/analytics/summary')
            const data = await response.json()
            if (data.success) {
                setSummary(data.data)
            }
        } catch {
            // Silent fail for summary
        }
    }, [])

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const params = new URLSearchParams()
            if (selectedPeriod === 'custom') {
                params.set('period', 'custom')
                params.set('startDate', dateFrom)
                params.set('endDate', dateTo)
            } else {
                params.set('period', selectedPeriod)
                params.set('startDate', dateFrom)
                params.set('endDate', dateTo)
            }

            const [analyticsRes, cashiersRes] = await Promise.all([
                fetch(`/api/pos/analytics?${params.toString()}`),
                fetch(`/api/pos/analytics/cashiers?period=${selectedPeriod}`),
            ])

            const analyticsData = await analyticsRes.json()
            const cashiersData = await cashiersRes.json()

            if (analyticsData.success) {
                setAnalytics(analyticsData.data)
            } else {
                setError(analyticsData.error || 'Gagal memuat data analitik')
            }

            if (cashiersData.success) {
                setCashiers(cashiersData.data.cashiers)
            }
        } catch {
            setError('Gagal memuat data analitik. Periksa koneksi jaringan Anda.')
        } finally {
            setLoading(false)
        }
    }, [selectedPeriod, dateFrom, dateTo])

    useEffect(() => {
        fetchSummary()
        fetchAnalytics()
    }, [fetchSummary, fetchAnalytics])

    // CSV Export
    const handleExport = useCallback(() => {
        if (!analytics) return

        const rows: string[] = []
        rows.push('Tanggal,Total,Jumlah Transaksi')
        for (const row of analytics.salesByPeriod) {
            rows.push(`${row.date},${row.total},${row.count}`)
        }
        rows.push('')
        rows.push('Produk,Qty Terjual,Pendapatan')
        for (const p of analytics.topProducts) {
            rows.push(`"${p.name}",${p.quantity},${p.revenue}`)
        }
        rows.push('')
        rows.push('Kategori,Qty Terjual,Pendapatan')
        for (const c of analytics.salesByCategory) {
            rows.push(`"${c.category}",${c.quantity},${c.revenue}`)
        }
        rows.push('')
        rows.push('Metode Pembayaran,Jumlah,Total,Persentase')
        for (const p of analytics.paymentMethodBreakdown) {
            rows.push(`${PAYMENT_METHOD_LABELS[p.method] || p.method},${p.count},${p.total},${p.percentage}%`)
        }
        rows.push('')
        rows.push('Kasir,Transaksi,Total Penjualan,Rata-rata,Sesi')
        for (const c of cashiers) {
            rows.push(`"${c.cashierName}",${c.transactionCount},${c.totalSales},${Math.round(c.avgTransactionValue)},${c.sessionCount}`)
        }

        const csvContent = rows.join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `pos-report-${dateFrom}-${dateTo}.csv`
        link.click()
        URL.revokeObjectURL(url)
        setToast({ message: 'Berhasil diekspor ke CSV', type: 'success' })
    }, [analytics, cashiers, dateFrom, dateTo])

    // Chart data
    const salesChartLabels = analytics?.salesByPeriod.map((d) => {
        const date = new Date(d.date)
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    }) || []
    const salesChartData = analytics?.salesByPeriod.map((d) => d.total) || []

    const hourlyLabels = analytics?.hourlyTrend.map((h) => `${h.hour}:00`) || []
    const hourlyData = analytics?.hourlyTrend.map((h) => h.total) || []

    const pieLabels = analytics?.paymentMethodBreakdown.map((p) => PAYMENT_METHOD_LABELS[p.method] || p.method) || []
    const pieData = analytics?.paymentMethodBreakdown.map((p) => p.total) || []

    const catLabels = analytics?.salesByCategory.map((c) => c.category) || []
    const catData = analytics?.salesByCategory.map((c) => c.revenue) || []

    // Summary calculations
    const todaySales = summary?.today.sales || 0
    const todayCount = summary?.today.transactionCount || 0
    const todayAvg = summary?.today.avgTransactionValue || 0
    const salesChange = summary?.change.salesPercent || 0
    const countChange = summary?.change.countPercent || 0
    const avgChange = summary?.change.avgPercent || 0

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
                    disabled={!analytics}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                    <Download className="h-4 w-4" />
                    {t('common.export') || 'Export CSV'}
                </button>
            </div>

            {/* Period Selector */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                    {([
                        { key: 'daily' as PeriodOption, label: t('pos.reports.today') || 'Hari Ini' },
                        { key: 'weekly' as PeriodOption, label: t('pos.reports.thisWeek') || 'Minggu Ini' },
                        { key: 'monthly' as PeriodOption, label: t('pos.reports.thisMonth') || 'Bulan Ini' },
                        { key: 'custom' as PeriodOption, label: t('pos.reports.dateRange') || 'Custom' },
                    ]).map((opt) => (
                        <button
                            key={opt.key}
                            onClick={() => handlePeriodChange(opt.key)}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${selectedPeriod === opt.key
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                {selectedPeriod === 'custom' && (
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                    </div>
                )}
                <button
                    onClick={fetchAnalytics}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <BarChart3 className="h-4 w-4" />
                    {t('common.filter') || 'Filter'}
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
                    <button onClick={fetchAnalytics} className="mt-3 text-sm text-blue-600 hover:underline">{t('common.tryAgain') || 'Coba Lagi'}</button>
                </div>
            ) : (
                <>
                    {/* Summary Cards with Today vs Yesterday */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <SummaryCard
                            icon={<DollarSign className="h-5 w-5 text-blue-600" />}
                            iconBg="bg-blue-100 dark:bg-blue-900/30"
                            label={t('pos.reports.todaySales') || 'Penjualan Hari Ini'}
                            value={formatCurrency(todaySales)}
                            change={salesChange}
                        />
                        <SummaryCard
                            icon={<Receipt className="h-5 w-5 text-green-600" />}
                            iconBg="bg-green-100 dark:bg-green-900/30"
                            label={t('pos.reports.todayTransactions') || 'Transaksi Hari Ini'}
                            value={`${todayCount} transaksi`}
                            change={countChange}
                        />
                        <SummaryCard
                            icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
                            iconBg="bg-purple-100 dark:bg-purple-900/30"
                            label={t('pos.reports.avgPerTransaction') || 'Rata-rata/Transaksi'}
                            value={formatCurrency(todayAvg)}
                            change={avgChange}
                        />
                        <SummaryCard
                            icon={<Users className="h-5 w-5 text-orange-600" />}
                            iconBg="bg-orange-100 dark:bg-orange-900/30"
                            label={t('pos.reports.activeSessions') || 'Sesi Aktif'}
                            value={`${summary?.activeSessions || 0} / ${summary?.totalTerminals || 0}`}
                            change={null}
                        />
                    </div>

                    {/* Sales Trend Line Chart */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                            {t('pos.reports.salesTrend') || 'Tren Penjualan'}
                        </h3>
                        {salesChartData.length >= 2 ? (
                            <LineChart
                                data={salesChartData}
                                labels={salesChartLabels}
                                height={220}
                                color="#3B82F6"
                            />
                        ) : salesChartData.length === 1 ? (
                            <BarChart
                                data={salesChartData}
                                labels={salesChartLabels}
                                height={220}
                                valuePrefix="Rp "
                            />
                        ) : (
                            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                                {t('pos.reports.noData') || 'Belum ada data'}
                            </div>
                        )}
                    </div>

                    {/* Charts Row: Category + Payment Method */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Sales by Category */}
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                                {t('pos.reports.salesByCategory') || 'Penjualan per Kategori'}
                            </h3>
                            {catData.length > 0 ? (
                                <BarChart
                                    data={catData}
                                    labels={catLabels}
                                    height={200}
                                    valuePrefix="Rp "
                                />
                            ) : (
                                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                                    {t('pos.reports.noData') || 'Belum ada data'}
                                </div>
                            )}
                        </div>

                        {/* Payment Method Breakdown */}
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                                {t('pos.reports.paymentBreakdown') || 'Metode Pembayaran'}
                            </h3>
                            {pieData.length > 0 ? (
                                <PieChart
                                    data={pieData}
                                    labels={pieLabels}
                                    colors={PAYMENT_COLORS}
                                    size={140}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                                    {t('pos.reports.noData') || 'Belum ada data'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Hourly Trend */}
                    {analytics?.hourlyTrend && analytics.hourlyTrend.some((h) => h.count > 0) && (
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                                {t('pos.reports.hourlyTrend') || 'Tren Per Jam'}
                            </h3>
                            <BarChart
                                data={hourlyData}
                                labels={hourlyLabels}
                                height={180}
                                valuePrefix="Rp "
                            />
                        </div>
                    )}

                    {/* Top Products Table */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                            {t('pos.reports.topProducts') || 'Produk Terlaris'}
                        </h3>
                        {analytics?.topProducts && analytics.topProducts.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pos.reports.product') || 'Produk'}</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('pos.reports.quantitySold') || 'Qty'}</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('pos.reports.revenue') || 'Pendapatan'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {analytics.topProducts.map((p, i) => (
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
                            <p className="text-sm text-gray-400 text-center py-8">{t('pos.reports.noData') || 'Belum ada data produk'}</p>
                        )}
                    </div>

                    {/* Payment Method Table */}
                    {analytics?.paymentMethodBreakdown && analytics.paymentMethodBreakdown.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                                {t('pos.reports.paymentSummary') || 'Ringkasan Metode Pembayaran'}
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pos.reports.paymentMethodLabel') || 'Metode'}</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('pos.reports.count') || 'Jumlah'}</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('pos.reports.totalRevenue') || 'Total'}</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {analytics.paymentMethodBreakdown.map((p) => (
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

                    {/* Cashier Performance Table */}
                    {cashiers.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                                {t('pos.reports.cashierPerformance') || 'Performa Kasir'}
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pos.reports.cashier') || 'Kasir'}</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('pos.reports.count') || 'Transaksi'}</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('pos.reports.totalRevenue') || 'Total Penjualan'}</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('pos.reports.avgPerTransaction') || 'Rata-rata'}</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('pos.reports.sessions') || 'Sesi'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {cashiers.map((c, i) => (
                                            <tr key={c.cashierId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{c.cashierName}</td>
                                                <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">{c.transactionCount}</td>
                                                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(c.totalSales)}</td>
                                                <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">{formatCurrency(c.avgTransactionValue)}</td>
                                                <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">{c.sessionCount}</td>
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

// ─── Summary Card Component ─────────────────────────────────────────────────

function SummaryCard({
    icon,
    iconBg,
    label,
    value,
    change,
}: {
    icon: React.ReactNode
    iconBg: string
    label: string
    value: string
    change: number | null
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 truncate">{label}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
                {change !== null && (
                    <div className={`flex items-center gap-0.5 text-xs font-medium ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-400'
                        }`}>
                        {change > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : change < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                        {Math.abs(change).toFixed(1)}%
                    </div>
                )}
            </div>
        </div>
    )
}
