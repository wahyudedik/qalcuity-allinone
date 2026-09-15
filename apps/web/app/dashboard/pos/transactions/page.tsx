'use client'
import { usePermission } from '@/lib/use-permission'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import {
    Search, Receipt, Loader2, Check, X, AlertCircle, Eye, Ban,
    ChevronLeft, ChevronRight, Printer, PackageCheck,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import POSReceipt, { type POSReceiptData } from '@/components/pos/pos-receipt'

type Transaction = {
    id: string
    transactionNo: string
    customerName: string
    subtotal: number
    discountAmount: number
    taxAmount: number
    totalAmount: number
    paidAmount: number
    changeAmount: number
    paymentMethod: string
    status: string
    notes: string
    itemCount: number
    items: { id: string; productName: string; quantity: number; unitPrice: number; subtotal: number }[]
    payments: { id: string; method: string; amount: number; reference: string | null; status: string }[]
    refunds: { id: string; amount: number; reason: string; status: string }[]
    createdAt: string
}

export default function POSTransactionsPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const { isAdmin } = usePermission()
    const canManage = isAdmin()

    const PAYMENT_METHOD_LABELS: Record<string, string> = {
        CASH: t('pos.cash') || 'Tunai',
        CARD: t('pos.card') || 'Kartu',
        QRIS: 'QRIS',
        E_WALLET: t('pos.eWallet') || 'E-Wallet',
        BANK_TRANSFER: t('pos.bankTransfer') || 'Transfer',
    }

    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState('all')
    const [filterPayment, setFilterPayment] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Detail modal
    const [showDetail, setShowDetail] = useState(false)
    const [detailTransaction, setDetailTransaction] = useState<Transaction | null>(null)

    // Void modal
    const [showVoidModal, setShowVoidModal] = useState(false)
    const [voidingId, setVoidingId] = useState<string | null>(null)
    const [voiding, setVoiding] = useState(false)
    const [voidReason, setVoidReason] = useState('')

    // Receipt modal
    const [showReceipt, setShowReceipt] = useState(false)
    const [receiptData, setReceiptData] = useState<POSReceiptData | null>(null)
    const [loadingReceipt, setLoadingReceipt] = useState(false)

    // Return modal
    const [showReturnModal, setShowReturnModal] = useState(false)
    const [returningTransaction, setReturningTransaction] = useState<Transaction | null>(null)
    const [returning, setReturning] = useState(false)
    const [returnReason, setReturnReason] = useState('')
    const [returnRestock, setReturnRestock] = useState(true)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchTransactions = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (filterStatus !== 'all') params.set('status', filterStatus)
            if (filterPayment !== 'all') params.set('paymentMethod', filterPayment)
            params.set('page', String(page))
            params.set('limit', '20')
            const response = await fetch(`/api/pos/transactions?${params.toString()}`)
            const data = await response.json()
            if (data.success) {
                setTransactions(data.data)
                setTotalPages(data.totalPages)
            } else {
                setError(data.error || (t('pos.transactions.errorLoad') || 'Gagal memuat data transaksi'))
            }
        } catch {
            setError(t('pos.transactions.errorLoadNetwork') || 'Gagal memuat data transaksi. Periksa koneksi jaringan Anda.')
        } finally {
            setLoading(false)
        }
    }, [filterStatus, filterPayment, page, t])

    useEffect(() => {
        fetchTransactions()
    }, [fetchTransactions])

    const filtered = transactions.filter((tr) => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            tr.transactionNo.toLowerCase().includes(q) ||
            tr.customerName.toLowerCase().includes(q)
        )
    })

    const handleVoid = async () => {
        if (!voidingId || !voidReason.trim()) return
        setVoiding(true)
        try {
            const response = await fetch(`/api/pos/transactions/${voidingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: voidReason.trim() }),
            })
            const data = await response.json()
            if (data.success) {
                setToast({ message: t('pos.transactions.successVoid') || 'Transaksi berhasil dibatalkan', type: 'success' })
                setShowVoidModal(false)
                setVoidingId(null)
                setVoidReason('')
                fetchTransactions()
            } else {
                setToast({ message: data.error || (t('pos.transactions.errorVoid') || 'Gagal membatalkan transaksi'), type: 'error' })
            }
        } catch {
            setToast({ message: t('pos.transactions.errorVoid') || 'Gagal membatalkan transaksi', type: 'error' })
        } finally {
            setVoiding(false)
        }
    }

    const fetchDetail = async (id: string) => {
        try {
            const response = await fetch(`/api/pos/transactions/${id}`)
            const data = await response.json()
            if (data.success) {
                setDetailTransaction(data.data)
                setShowDetail(true)
            }
        } catch {
            setToast({ message: t('pos.transactions.errorLoadDetail') || 'Gagal memuat detail transaksi', type: 'error' })
        }
    }

    const fetchReceipt = async (id: string) => {
        try {
            setLoadingReceipt(true)
            const response = await fetch(`/api/pos/transactions/${id}`)
            const data = await response.json()
            if (data.success) {
                const d = data.data
                setReceiptData({
                    id: d.id,
                    transactionNumber: d.transactionNo,
                    createdAt: d.createdAt,
                    items: d.items.map((item: { productName: string; quantity: number; unitPrice: number; subtotal: number; taxRate?: number }) => ({
                        name: item.productName,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        total: item.subtotal,
                        taxRate: item.taxRate,
                    })),
                    subtotal: d.subtotal,
                    discount: d.discountAmount,
                    taxAmount: d.taxAmount,
                    total: d.totalAmount,
                    paymentMethod: d.paymentMethod,
                    paymentAmount: d.paidAmount,
                    change: d.changeAmount,
                    customerName: d.customerName,
                    cashierName: d.cashierName,
                    storeName: d.storeName,
                    storeAddress: d.storeAddress,
                    storePhone: d.storePhone,
                    notes: d.notes,
                })
                setShowReceipt(true)
            }
        } catch {
            setToast({ message: t('pos.transactions.errorLoadDetail') || 'Gagal memuat data struk', type: 'error' })
        } finally {
            setLoadingReceipt(false)
        }
    }

    const handleReturn = async () => {
        if (!returningTransaction || !returnReason.trim()) return
        setReturning(true)
        try {
            const response = await fetch('/api/pos/refunds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionId: returningTransaction.id,
                    amount: returningTransaction.totalAmount,
                    reason: returnReason.trim(),
                    restockItem: returnRestock,
                }),
            })
            const data = await response.json()
            if (data.success) {
                setToast({ message: t('pos.refunds.returnSuccess') || 'Return berhasil, stok telah dikembalikan', type: 'success' })
                setShowReturnModal(false)
                setReturningTransaction(null)
                setReturnReason('')
                setReturnRestock(true)
                fetchTransactions()
            } else {
                setToast({ message: data.error || (t('pos.refunds.errorProcess') || 'Gagal memproses return'), type: 'error' })
            }
        } catch {
            setToast({ message: t('pos.refunds.errorProcess') || 'Gagal memproses return', type: 'error' })
        } finally {
            setReturning(false)
        }
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
                        <Receipt className="h-6 w-6" />
                        {t('pos.transactions.title') || 'Transaksi POS'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">{t('pos.transactions.description') || 'Riwayat semua transaksi point of sale'}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('pos.transactions.searchPlaceholder') || 'Cari nomor transaksi atau pelanggan...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                    <option value="all">{t('pos.transactions.allStatus') || 'Semua Status'}</option>
                    <option value="COMPLETED">{t('pos.transactions.completed') || 'Selesai'}</option>
                    <option value="VOIDED">{t('pos.transactions.voided') || 'Dibatalkan'}</option>
                    <option value="REFUNDED">{t('pos.transactions.refunded') || 'Direfund'}</option>
                </select>
                <select
                    value={filterPayment}
                    onChange={(e) => { setFilterPayment(e.target.value); setPage(1) }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                    <option value="all">{t('pos.transactions.allPaymentMethods') || 'Semua Pembayaran'}</option>
                    <option value="CASH">{t('pos.cash') || 'Tunai'}</option>
                    <option value="CARD">{t('pos.card') || 'Kartu'}</option>
                    <option value="QRIS">QRIS</option>
                    <option value="E_WALLET">{t('pos.eWallet') || 'E-Wallet'}</option>
                    <option value="BANK_TRANSFER">{t('pos.bankTransfer') || 'Transfer'}</option>
                </select>
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
                    <button onClick={fetchTransactions} className="mt-3 text-sm text-blue-600 hover:underline">{t('pos.transactions.retry') || 'Coba Lagi'}</button>
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState icon={Receipt} title={t('pos.transactions.empty') || 'Belum ada transaksi'} description={t('pos.transactions.emptyDescription') || 'Transaksi POS akan muncul di sini.'} />
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pos.transactions.no') || 'No'}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pos.transactions.date') || 'Tanggal'}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pos.transactions.customer') || 'Pelanggan'}</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('pos.transactions.item') || 'Item'}</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('pos.transactions.total') || 'Total'}</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('pos.transactions.payment') || 'Pembayaran'}</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('pos.transactions.status') || 'Status'}</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('pos.transactions.actions') || 'Aksi'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                                {filtered.map((tr) => (
                                    <tr key={tr.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">{tr.transactionNo}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDateTime(tr.createdAt)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{tr.customerName || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400">{tr.itemCount}</td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(tr.totalAmount)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                {PAYMENT_METHOD_LABELS[tr.paymentMethod] || tr.paymentMethod}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tr.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                tr.status === 'VOIDED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                }`}>
                                                {tr.status === 'COMPLETED' ? (t('pos.transactions.completed') || 'Selesai') : tr.status === 'VOIDED' ? (t('pos.transactions.voided') || 'Dibatalkan') : (t('pos.transactions.refunded') || 'Direfund')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => fetchDetail(tr.id)}
                                                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    {t('pos.transactions.detail') || 'Detail'}
                                                </button>
                                                {tr.status === 'COMPLETED' && (
                                                    <button
                                                        onClick={() => fetchReceipt(tr.id)}
                                                        disabled={loadingReceipt}
                                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
                                                    >
                                                        <Printer className="h-3.5 w-3.5" />
                                                        {t('pos.transactions.print') || 'Cetak'}
                                                    </button>
                                                )}
                                                {tr.status === 'COMPLETED' && canManage && (
                                                    <button
                                                        onClick={() => { setVoidingId(tr.id); setShowVoidModal(true) }}
                                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    >
                                                        <Ban className="h-3.5 w-3.5" />
                                                        {t('pos.transactions.voidBtn') || 'Void'}
                                                    </button>
                                                )}
                                                {tr.status === 'COMPLETED' && canManage && (
                                                    <button
                                                        onClick={() => { setReturningTransaction(tr); setShowReturnModal(true) }}
                                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                                    >
                                                        <PackageCheck className="h-3.5 w-3.5" />
                                                        {t('pos.refunds.returnItem') || 'Return'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {filtered.map((tr) => (
                            <div key={tr.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">{tr.transactionNo}</p>
                                        <p className="text-xs text-gray-400">{formatDateTime(tr.createdAt)}</p>
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tr.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                        tr.status === 'VOIDED' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {tr.status === 'COMPLETED' ? (t('pos.transactions.completed') || 'Selesai') : tr.status === 'VOIDED' ? (t('pos.transactions.voided') || 'Dibatalkan') : (t('pos.transactions.refunded') || 'Direfund')}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-sm">
                                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                        {PAYMENT_METHOD_LABELS[tr.paymentMethod] || tr.paymentMethod}
                                    </span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-gray-500">{tr.itemCount} {t('pos.transactions.itemCount') || 'item'}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(tr.totalAmount)}</p>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => fetchDetail(tr.id)}
                                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                                        >
                                            {t('pos.transactions.detail') || 'Detail'}
                                        </button>
                                        {tr.status === 'COMPLETED' && (
                                            <button
                                                onClick={() => fetchReceipt(tr.id)}
                                                disabled={loadingReceipt}
                                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 disabled:opacity-50"
                                            >
                                                <Printer className="h-3.5 w-3.5 inline mr-0.5" />
                                                {t('pos.transactions.print') || 'Cetak'}
                                            </button>
                                        )}
                                        {tr.status === 'COMPLETED' && canManage && (
                                            <button
                                                onClick={() => { setVoidingId(tr.id); setShowVoidModal(true) }}
                                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                            >
                                                {t('pos.transactions.voidBtn') || 'Void'}
                                            </button>
                                        )}
                                        {tr.status === 'COMPLETED' && canManage && (
                                            <button
                                                onClick={() => { setReturningTransaction(tr); setShowReturnModal(true) }}
                                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50"
                                            >
                                                <PackageCheck className="h-3.5 w-3.5 inline mr-0.5" />
                                                {t('pos.refunds.returnItem') || 'Return'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">{t('pos.transactions.pagination') || 'Halaman'} {page} {t('pos.transactions.paginationOf') || 'dari'} {totalPages}</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    {t('pos.transactions.previous') || 'Sebelumnya'}
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600"
                                >
                                    {t('pos.transactions.next') || 'Selanjutnya'}
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Detail Modal */}
            {showDetail && detailTransaction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDetail(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('pos.transactions.detailTitle') || 'Detail Transaksi'}</h3>
                            <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">{t('pos.transactions.number') || 'Nomor'}</span>
                                <span className="font-mono font-medium">{detailTransaction.transactionNo}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">{t('pos.transactions.date') || 'Tanggal'}</span>
                                <span>{formatDateTime(detailTransaction.createdAt)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">{t('pos.transactions.customer') || 'Pelanggan'}</span>
                                <span>{detailTransaction.customerName || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">{t('pos.transactions.status') || 'Status'}</span>
                                <span className={`font-medium ${detailTransaction.status === 'COMPLETED' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {detailTransaction.status === 'COMPLETED' ? (t('pos.transactions.completed') || 'Selesai') : (t('pos.transactions.voided') || 'Dibatalkan')}
                                </span>
                            </div>
                        </div>

                        {/* Items */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('pos.transactions.items') || 'Item'}</h4>
                            <div className="space-y-1.5">
                                {detailTransaction.items.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between text-sm rounded-lg bg-gray-50 dark:bg-gray-700/50 px-3 py-2">
                                        <div>
                                            <span className="font-medium">{item.productName}</span>
                                            <span className="text-gray-400 ml-2">x{item.quantity}</span>
                                        </div>
                                        <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-1.5 text-sm">
                            <div className="flex justify-between text-gray-500">
                                <span>{t('pos.subtotal') || 'Subtotal'}</span>
                                <span>{formatCurrency(detailTransaction.subtotal)}</span>
                            </div>
                            {detailTransaction.discountAmount > 0 && (
                                <div className="flex justify-between text-red-500">
                                    <span>{t('pos.discount') || 'Diskon'}</span>
                                    <span>-{formatCurrency(detailTransaction.discountAmount)}</span>
                                </div>
                            )}
                            {detailTransaction.taxAmount > 0 && (
                                <div className="flex justify-between text-gray-500">
                                    <span>{t('pos.tax') || 'Pajak'}</span>
                                    <span>{formatCurrency(detailTransaction.taxAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1.5 font-bold text-gray-900 dark:text-white">
                                <span>{t('pos.total') || 'Total'}</span>
                                <span>{formatCurrency(detailTransaction.totalAmount)}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                                <span>{t('pos.paid') || 'Dibayar'}</span>
                                <span>{formatCurrency(detailTransaction.paidAmount)}</span>
                            </div>
                            {detailTransaction.changeAmount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>{t('pos.change') || 'Kembalian'}</span>
                                    <span>{formatCurrency(detailTransaction.changeAmount)}</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setShowDetail(false)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600"
                        >
                            {t('pos.transactions.close') || 'Tutup'}
                        </button>
                    </div>
                </div>
            )}

            {/* Void Modal */}
            {showVoidModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !voiding && setShowVoidModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Ban className="h-5 w-5 text-red-500" />
                                {t('pos.transactions.voidTitle') || 'Batalkan Transaksi'}
                            </h3>
                            {!voiding && (
                                <button onClick={() => { setShowVoidModal(false); setVoidReason('') }} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-gray-500">
                            {t('pos.transactions.voidConfirm') || 'Apakah Anda yakin ingin membatalkan transaksi ini? Tindakan ini tidak dapat dibatalkan.'}
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('pos.transactions.voidReason') || 'Alasan Pembatalan'} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={voidReason}
                                onChange={(e) => setVoidReason(e.target.value)}
                                placeholder={t('pos.transactions.voidReasonPlaceholder') || 'Masukkan alasan pembatalan...'}
                                disabled={voiding}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowVoidModal(false); setVoidReason('') }}
                                disabled={voiding}
                                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600"
                            >
                                {t('pos.transactions.cancel') || 'Batal'}
                            </button>
                            <button
                                onClick={handleVoid}
                                disabled={voiding || !voidReason.trim()}
                                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {voiding ? (t('pos.transactions.voiding') || 'Membatalkan...') : (t('pos.transactions.voidConfirmButton') || 'Ya, Batalkan')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {showReceipt && receiptData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowReceipt(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4 no-print">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('pos.transactions.receiptTitle') || 'Struk Transaksi'}</h3>
                            <button onClick={() => setShowReceipt(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <POSReceipt
                            transaction={receiptData}
                            onClose={() => setShowReceipt(false)}
                        />
                    </div>
                </div>
            )}

            {/* Return Modal */}
            {showReturnModal && returningTransaction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !returning && setShowReturnModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <PackageCheck className="h-5 w-5 text-orange-500" />
                                {t('pos.refunds.returnItem') || 'Return Barang'}
                            </h3>
                            {!returning && (
                                <button onClick={() => setShowReturnModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3 text-sm space-y-1">
                            <div className="flex justify-between">
                                <span className="text-gray-500">{t('pos.transactions.number') || 'Nomor'}</span>
                                <span className="font-mono">{returningTransaction.transactionNo}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">{t('pos.transactions.total') || 'Total'}</span>
                                <span className="font-bold">{formatCurrency(returningTransaction.totalAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">{t('pos.transactions.item') || 'Item'}</span>
                                <span>{returningTransaction.itemCount} {t('pos.transactions.itemCount') || 'item'}</span>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500">
                            {t('pos.refunds.returnDescription') || 'Kembalikan barang dan pulihkan stok'}
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('pos.refunds.returnReason') || 'Alasan Return'} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={returnReason}
                                onChange={(e) => setReturnReason(e.target.value)}
                                placeholder={t('pos.refunds.returnReasonPlaceholder') || 'Masukkan alasan return...'}
                                disabled={returning}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                                autoFocus
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="returnRestock"
                                checked={returnRestock}
                                onChange={(e) => setReturnRestock(e.target.checked)}
                                disabled={returning}
                                className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                            />
                            <label htmlFor="returnRestock" className="text-sm text-gray-700 dark:text-gray-300">
                                {t('pos.refunds.restock') || 'Kembalikan Stok'}
                            </label>
                        </div>
                        {returnRestock && (
                            <p className="text-xs text-gray-400 -mt-2">
                                {t('pos.refunds.restockDescription') || 'Barang akan dikembalikan ke inventori'}
                            </p>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowReturnModal(false); setReturnReason(''); setReturnRestock(true) }}
                                disabled={returning}
                                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600"
                            >
                                {t('pos.refunds.cancel') || 'Batal'}
                            </button>
                            <button
                                onClick={handleReturn}
                                disabled={returning || !returnReason.trim()}
                                className="flex-1 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                            >
                                {returning ? (t('pos.refunds.processing') || 'Memproses...') : (t('pos.refunds.returnItem') || 'Return Barang')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
