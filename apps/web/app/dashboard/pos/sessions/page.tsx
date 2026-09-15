'use client'
import { usePermission } from '@/lib/use-permission'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import {
    Search, BookOpen, Loader2, Check, X, AlertCircle, Lock, Unlock,
    BarChart3, CreditCard, Package, AlertTriangle, Banknote,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

type Session = {
    id: string
    terminalId: string
    terminalName: string
    terminalCode: string
    cashierId: string
    cashierName: string
    status: string
    openingCash: number
    closingCash: number | null
    expectedCash: number | null
    variance: number | null
    transactionCount: number
    totalSales: number
    openedAt: string
    closedAt: string | null
    createdAt: string
}

type ClosingReport = {
    sessionId: string
    terminal: { name: string; code: string }
    cashier: { name: string }
    period: { openedAt: string; closedAt: string | null }
    sales: {
        totalTransactions: number
        grossSales: number
        totalDiscounts: number
        totalTax: number
        netSales: number
        totalRevenue: number
    }
    paymentMethods: { method: string; count: number; total: number }[]
    topProducts: { name: string; quantity: number; total: number }[]
    refunds: { count: number; total: number }
    voids: { count: number; total: number }
    cashSummary: {
        openingCash: number
        cashSales: number
        cashRefunds: number
        expectedCash: number
    }
}

export default function POSSessionsPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const { isAdmin } = usePermission()
    const canManage = isAdmin()

    const [sessions, setSessions] = useState<Session[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Close session modal
    const [showCloseModal, setShowCloseModal] = useState(false)
    const [closingSessionId, setClosingSessionId] = useState<string | null>(null)
    const [closingCash, setClosingCash] = useState<number>(0)
    const [closing, setClosing] = useState(false)

    // Closing report
    const [closingReport, setClosingReport] = useState<ClosingReport | null>(null)
    const [loadingReport, setLoadingReport] = useState(false)
    const [reportError, setReportError] = useState<string | null>(null)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchSessions = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (filterStatus !== 'all') params.set('status', filterStatus)
            const response = await fetch(`/api/pos/sessions?${params.toString()}`)
            const data = await response.json()
            if (data.success) {
                setSessions(data.data)
            } else {
                setError(data.error || (t('pos.sessions.errorLoad') || 'Gagal memuat data sesi'))
            }
        } catch {
            setError(t('pos.sessions.errorLoadNetwork') || 'Gagal memuat data sesi. Periksa koneksi jaringan Anda.')
        } finally {
            setLoading(false)
        }
    }, [filterStatus, t])

    useEffect(() => {
        fetchSessions()
    }, [fetchSessions])

    const filtered = sessions.filter((s) => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            s.terminalName.toLowerCase().includes(q) ||
            s.terminalCode.toLowerCase().includes(q) ||
            s.cashierName.toLowerCase().includes(q)
        )
    })

    const handleOpenCloseModal = async (sessionId: string) => {
        setClosingSessionId(sessionId)
        setClosingReport(null)
        setClosingCash(0)
        setReportError(null)
        setShowCloseModal(true)
        setLoadingReport(true)

        try {
            const response = await fetch(`/api/pos/sessions/${sessionId}/closing-report`)
            const data = await response.json()
            if (data.success) {
                setClosingReport(data.data)
                // Pre-fill closingCash with expected cash
                setClosingCash(data.data.cashSummary.expectedCash)
            } else {
                setReportError(data.error || 'Gagal memuat laporan penutupan')
            }
        } catch {
            setReportError('Gagal memuat laporan penutupan. Periksa koneksi jaringan.')
        } finally {
            setLoadingReport(false)
        }
    }

    const handleCloseSession = async () => {
        if (!closingSessionId) return
        setClosing(true)
        try {
            const response = await fetch(`/api/pos/sessions/${closingSessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ closingCash }),
            })
            const data = await response.json()
            if (data.success) {
                setToast({ message: t('pos.sessions.successClose') || 'Sesi berhasil ditutup', type: 'success' })
                setShowCloseModal(false)
                setClosingSessionId(null)
                setClosingCash(0)
                setClosingReport(null)
                fetchSessions()
            } else {
                setToast({ message: data.error || (t('pos.sessions.errorClose') || 'Gagal menutup sesi'), type: 'error' })
            }
        } catch {
            setToast({ message: t('pos.sessions.errorClose') || 'Gagal menutup sesi', type: 'error' })
        } finally {
            setClosing(false)
        }
    }

    // Calculate variance from report
    const variance = closingReport ? closingCash - closingReport.cashSummary.expectedCash : 0

    const formatPaymentMethod = (method: string) => {
        const labels: Record<string, string> = {
            CASH: 'Tunai',
            CARD: 'Kartu',
            QRIS: 'QRIS',
            E_WALLET: 'E-Wallet',
            BANK_TRANSFER: 'Transfer Bank',
        }
        return labels[method] || method
    }

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
                        <BookOpen className="h-6 w-6" />
                        {t('pos.sessions.title') || 'Sesi Kasir'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">{t('pos.sessions.description') || 'Kelola sesi kasir dan penutupan kas'}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('pos.sessions.searchPlaceholder') || 'Cari terminal atau kasir...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'OPEN', 'CLOSED'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${filterStatus === status
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600'
                                }`}
                        >
                            {status === 'all' ? (t('pos.sessions.all') || 'Semua') : status === 'OPEN' ? (t('pos.sessions.open') || 'Aktif') : (t('pos.sessions.closed') || 'Tertutup')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
                    <p className="text-sm text-gray-500">{error}</p>
                    <button onClick={fetchSessions} className="mt-3 text-sm text-blue-600 hover:underline">{t('pos.sessions.retry') || 'Coba Lagi'}</button>
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState icon={BookOpen} title={t('pos.sessions.empty') || 'Belum ada sesi'} description={t('pos.sessions.emptyDescription') || 'Sesi kasir akan muncul di sini setelah dibuka.'} />
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pos.sessions.terminal') || 'Terminal'}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pos.sessions.cashier') || 'Kasir'}</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('pos.sessions.openingCash') || 'Uang Awal'}</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('pos.sessions.sales') || 'Penjualan'}</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('pos.sessions.closingCash') || 'Uang Tutup'}</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('pos.sessions.variance') || 'Selisih'}</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('pos.sessions.status') || 'Status'}</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('pos.sessions.actions') || 'Aksi'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                                {filtered.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{s.terminalName}</div>
                                            <div className="text-xs text-gray-400">{s.terminalCode}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{s.cashierName}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">{formatCurrency(s.openingCash)}</td>
                                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">{formatCurrency(s.totalSales)}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                                            {s.closingCash !== null ? formatCurrency(s.closingCash) : '-'}
                                        </td>
                                        <td className={`px-4 py-3 text-sm text-right font-medium ${s.variance === null ? 'text-gray-400' :
                                            s.variance === 0 ? 'text-green-600' :
                                                'text-red-600'
                                            }`}>
                                            {s.variance !== null ? formatCurrency(s.variance) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.status === 'OPEN'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                                }`}>
                                                {s.status === 'OPEN' ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                                {s.status === 'OPEN' ? (t('pos.sessions.open') || 'Aktif') : (t('pos.sessions.closed') || 'Tertutup')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {s.status === 'OPEN' && canManage && (
                                                <button
                                                    onClick={() => handleOpenCloseModal(s.id)}
                                                    className="inline-flex items-center gap-1 rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400"
                                                >
                                                    <Lock className="h-3 w-3" />
                                                    {t('pos.sessions.close') || 'Tutup'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {filtered.map((s) => (
                            <div key={s.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{s.terminalName}</p>
                                        <p className="text-xs text-gray-400">{s.terminalCode} • {s.cashierName}</p>
                                    </div>
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.status === 'OPEN'
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                        }`}>
                                        {s.status === 'OPEN' ? (t('pos.sessions.open') || 'Aktif') : (t('pos.sessions.closed') || 'Tertutup')}
                                    </span>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <p className="text-gray-400 text-xs">{t('pos.sessions.openingCash') || 'Uang Awal'}</p>
                                        <p className="font-medium">{formatCurrency(s.openingCash)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs">{t('pos.sessions.sales') || 'Penjualan'}</p>
                                        <p className="font-medium">{formatCurrency(s.totalSales)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs">{t('pos.sessions.closingCash') || 'Uang Tutup'}</p>
                                        <p>{s.closingCash !== null ? formatCurrency(s.closingCash) : '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs">{t('pos.sessions.variance') || 'Selisih'}</p>
                                        <p className={s.variance === null ? '' : s.variance === 0 ? 'text-green-600' : 'text-red-600'}>
                                            {s.variance !== null ? formatCurrency(s.variance) : '-'}
                                        </p>
                                    </div>
                                </div>
                                {s.status === 'OPEN' && canManage && (
                                    <button
                                        onClick={() => handleOpenCloseModal(s.id)}
                                        className="mt-3 w-full inline-flex items-center justify-center gap-1 rounded-lg bg-orange-100 px-3 py-2 text-xs font-medium text-orange-700 hover:bg-orange-200"
                                    >
                                        <Lock className="h-3 w-3" />
                                        {t('pos.sessions.closeSession') || 'Tutup Sesi'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Close Session Modal with Closing Report */}
            {showCloseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !closing && setShowCloseModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-xl z-10">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-blue-600" />
                                {t('pos.sessions.closingReportTitle') || 'Laporan Penutupan'}
                            </h3>
                            {!closing && (
                                <button onClick={() => setShowCloseModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Loading State */}
                            {loadingReport && (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                                    <p className="text-sm text-gray-500">Memuat laporan penutupan...</p>
                                </div>
                            )}

                            {/* Error State */}
                            {reportError && (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
                                    <p className="text-sm text-red-600 dark:text-red-400">{reportError}</p>
                                    <button
                                        onClick={() => closingSessionId && handleOpenCloseModal(closingSessionId)}
                                        className="mt-3 text-sm text-blue-600 hover:underline"
                                    >
                                        Coba Lagi
                                    </button>
                                </div>
                            )}

                            {/* Report Content */}
                            {closingReport && !loadingReport && (
                                <>
                                    {/* Session Info */}
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Session #{closingReport.sessionId.slice(-8).toUpperCase()} • {closingReport.terminal.name} ({closingReport.terminal.code}) • {closingReport.cashier.name}
                                    </div>

                                    {/* Sales Summary Cards */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
                                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('pos.sessions.revenue') || 'Total Pendapatan'}</p>
                                            <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{formatCurrency(closingReport.sales.totalRevenue)}</p>
                                        </div>
                                        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4">
                                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">{t('pos.sessions.totalTransactions') || 'Total Transaksi'}</p>
                                            <p className="text-xl font-bold text-green-700 dark:text-green-300 mt-1">{closingReport.sales.totalTransactions}</p>
                                        </div>
                                    </div>

                                    {/* Sales Breakdown */}
                                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('pos.sessions.salesBreakdown') || 'Rincian Penjualan'}</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">{t('pos.sessions.grossSales') || 'Penjualan Kotor'}</span>
                                                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(closingReport.sales.grossSales)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">{t('pos.sessions.discounts') || 'Diskon'}</span>
                                                <span className="font-medium text-red-600 dark:text-red-400">-{formatCurrency(closingReport.sales.totalDiscounts)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">{t('pos.sessions.tax') || 'Pajak'}</span>
                                                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(closingReport.sales.totalTax)}</span>
                                            </div>
                                            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                                                <span className="font-semibold text-gray-900 dark:text-white">{t('pos.sessions.netSales') || 'Penjualan Bersih'}</span>
                                                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(closingReport.sales.netSales)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Methods */}
                                    {closingReport.paymentMethods.length > 0 && (
                                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                                <CreditCard className="h-4 w-4" />
                                                {t('pos.sessions.paymentMethods') || 'Metode Pembayaran'}
                                            </h4>
                                            <div className="space-y-2">
                                                {closingReport.paymentMethods.map((pm) => (
                                                    <div key={pm.method} className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-600 dark:text-gray-400">{formatPaymentMethod(pm.method)}</span>
                                                        <div className="text-right">
                                                            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(pm.total)}</span>
                                                            <span className="text-gray-400 ml-2">({pm.count})</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Top Products */}
                                    {closingReport.topProducts.length > 0 && (
                                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                                <Package className="h-4 w-4" />
                                                {t('pos.sessions.topProducts') || 'Produk Terlaris'}
                                            </h4>
                                            <div className="space-y-2">
                                                {closingReport.topProducts.slice(0, 5).map((product, idx) => (
                                                    <div key={product.name} className="flex items-center justify-between text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-400 text-xs font-medium w-5">{idx + 1}.</span>
                                                            <span className="text-gray-700 dark:text-gray-300">{product.name}</span>
                                                            <span className="text-gray-400 text-xs">({product.quantity})</span>
                                                        </div>
                                                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(product.total)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Refunds & Voids */}
                                    {(closingReport.refunds.count > 0 || closingReport.voids.count > 0) && (
                                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4" />
                                                {t('pos.sessions.refundsAndVoids') || 'Refund & Void'}
                                            </h4>
                                            <div className="space-y-2 text-sm">
                                                {closingReport.refunds.count > 0 && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500 dark:text-gray-400">Refund ({closingReport.refunds.count})</span>
                                                        <span className="font-medium text-red-600 dark:text-red-400">-{formatCurrency(closingReport.refunds.total)}</span>
                                                    </div>
                                                )}
                                                {closingReport.voids.count > 0 && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500 dark:text-gray-400">Void ({closingReport.voids.count})</span>
                                                        <span className="font-medium text-orange-600 dark:text-orange-400">{formatCurrency(closingReport.voids.total)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Cash Summary */}
                                    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                            <Banknote className="h-4 w-4" />
                                            {t('pos.sessions.cashSummary') || 'Ringkasan Kas'}
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">{t('pos.sessions.openingCash') || 'Uang Awal'}</span>
                                                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(closingReport.cashSummary.openingCash)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">{t('pos.sessions.cashSales') || 'Penjualan Tunai'}</span>
                                                <span className="font-medium text-green-600 dark:text-green-400">+{formatCurrency(closingReport.cashSummary.cashSales)}</span>
                                            </div>
                                            {closingReport.cashSummary.cashRefunds > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">{t('pos.sessions.cashRefunds') || 'Refund Tunai'}</span>
                                                    <span className="font-medium text-red-600 dark:text-red-400">-{formatCurrency(closingReport.cashSummary.cashRefunds)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between border-t border-amber-300 dark:border-amber-700 pt-2">
                                                <span className="font-semibold text-gray-900 dark:text-white">{t('pos.sessions.expectedCash') || 'Kas yang Diharapkan'}</span>
                                                <span className="font-bold text-amber-700 dark:text-amber-300">{formatCurrency(closingReport.cashSummary.expectedCash)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Closing Cash Input */}
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('pos.sessions.closingCashLabel') || 'Uang Tutup (Closing Cash)'}</label>
                                            <input
                                                type="number"
                                                value={closingCash || ''}
                                                onChange={(e) => setClosingCash(Number(e.target.value))}
                                                min="0"
                                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>

                                        {/* Variance Display */}
                                        <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${variance === 0
                                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                            : variance > 0
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                                            }`}>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('pos.sessions.variance') || 'Selisih'}</span>
                                            <span className={`text-sm font-bold ${variance === 0
                                                ? 'text-green-700 dark:text-green-400'
                                                : variance > 0
                                                    ? 'text-blue-700 dark:text-blue-400'
                                                    : 'text-red-700 dark:text-red-400'
                                                }`}>
                                                {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                                                {variance === 0 ? ' ✓' : variance > 0 ? ' (Lebih)' : ' (Kurang)'}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowCloseModal(false)}
                                    disabled={closing}
                                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 disabled:opacity-50"
                                >
                                    {t('pos.sessions.cancel') || 'Batal'}
                                </button>
                                <button
                                    onClick={handleCloseSession}
                                    disabled={closing || loadingReport || !closingReport}
                                    className="flex-1 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {closing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            {t('pos.sessions.closing') || 'Menutup...'}
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="h-4 w-4" />
                                            {t('pos.sessions.closeSession') || 'Tutup Sesi'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
