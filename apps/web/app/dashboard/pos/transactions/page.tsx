'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import {
    Search, Receipt, Loader2, Check, X, AlertCircle, Eye, Ban,
    ChevronLeft, ChevronRight,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: 'Tunai',
    CARD: 'Kartu',
    QRIS: 'QRIS',
    E_WALLET: 'E-Wallet',
    BANK_TRANSFER: 'Transfer',
}

export default function POSTransactionsPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canManage = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN'

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
                setError(data.error || 'Gagal memuat data transaksi')
            }
        } catch {
            setError('Gagal memuat data transaksi. Periksa koneksi jaringan Anda.')
        } finally {
            setLoading(false)
        }
    }, [filterStatus, filterPayment, page])

    useEffect(() => {
        fetchTransactions()
    }, [fetchTransactions])

    const filtered = transactions.filter((t) => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            t.transactionNo.toLowerCase().includes(q) ||
            t.customerName.toLowerCase().includes(q)
        )
    })

    const handleVoid = async () => {
        if (!voidingId) return
        setVoiding(true)
        try {
            const response = await fetch(`/api/pos/transactions/${voidingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'VOIDED' }),
            })
            const data = await response.json()
            if (data.success) {
                setToast({ message: 'Transaksi berhasil dibatalkan', type: 'success' })
                setShowVoidModal(false)
                setVoidingId(null)
                fetchTransactions()
            } else {
                setToast({ message: data.error || 'Gagal membatalkan transaksi', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal membatalkan transaksi', type: 'error' })
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
            setToast({ message: 'Gagal memuat detail transaksi', type: 'error' })
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
                    <p className="text-sm text-gray-500 mt-1">Riwayat semua transaksi point of sale</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari nomor transaksi atau pelanggan..."
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
                    <option value="all">Semua Status</option>
                    <option value="COMPLETED">Selesai</option>
                    <option value="VOIDED">Dibatalkan</option>
                    <option value="REFUNDED">Direfund</option>
                </select>
                <select
                    value={filterPayment}
                    onChange={(e) => { setFilterPayment(e.target.value); setPage(1) }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                    <option value="all">Semua Pembayaran</option>
                    <option value="CASH">Tunai</option>
                    <option value="CARD">Kartu</option>
                    <option value="QRIS">QRIS</option>
                    <option value="E_WALLET">E-Wallet</option>
                    <option value="BANK_TRANSFER">Transfer</option>
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
                    <button onClick={fetchTransactions} className="mt-3 text-sm text-blue-600 hover:underline">Coba Lagi</button>
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState icon={Receipt} title="Belum ada transaksi" description="Transaksi POS akan muncul di sini." />
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pelanggan</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Item</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pembayaran</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                                {filtered.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">{t.transactionNo}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDateTime(t.createdAt)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{t.customerName || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400">{t.itemCount}</td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(t.totalAmount)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                {PAYMENT_METHOD_LABELS[t.paymentMethod] || t.paymentMethod}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${t.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    t.status === 'VOIDED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                }`}>
                                                {t.status === 'COMPLETED' ? 'Selesai' : t.status === 'VOIDED' ? 'Dibatalkan' : 'Direfund'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => fetchDetail(t.id)}
                                                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    Detail
                                                </button>
                                                {t.status === 'COMPLETED' && canManage && (
                                                    <button
                                                        onClick={() => { setVoidingId(t.id); setShowVoidModal(true) }}
                                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    >
                                                        <Ban className="h-3.5 w-3.5" />
                                                        Void
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
                        {filtered.map((t) => (
                            <div key={t.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">{t.transactionNo}</p>
                                        <p className="text-xs text-gray-400">{formatDateTime(t.createdAt)}</p>
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${t.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                            t.status === 'VOIDED' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {t.status === 'COMPLETED' ? 'Selesai' : t.status === 'VOIDED' ? 'Dibatalkan' : 'Direfund'}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-sm">
                                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                        {PAYMENT_METHOD_LABELS[t.paymentMethod] || t.paymentMethod}
                                    </span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-gray-500">{t.itemCount} item</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(t.totalAmount)}</p>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => fetchDetail(t.id)}
                                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                                        >
                                            Detail
                                        </button>
                                        {t.status === 'COMPLETED' && canManage && (
                                            <button
                                                onClick={() => { setVoidingId(t.id); setShowVoidModal(true) }}
                                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                            >
                                                Void
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
                            <p className="text-sm text-gray-500">Halaman {page} dari {totalPages}</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Sebelumnya
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600"
                                >
                                    Selanjutnya
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
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detail Transaksi</h3>
                            <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Nomor</span>
                                <span className="font-mono font-medium">{detailTransaction.transactionNo}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Tanggal</span>
                                <span>{formatDateTime(detailTransaction.createdAt)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Pelanggan</span>
                                <span>{detailTransaction.customerName || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Status</span>
                                <span className={`font-medium ${detailTransaction.status === 'COMPLETED' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {detailTransaction.status === 'COMPLETED' ? 'Selesai' : 'Dibatalkan'}
                                </span>
                            </div>
                        </div>

                        {/* Items */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Item</h4>
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
                                <span>Subtotal</span>
                                <span>{formatCurrency(detailTransaction.subtotal)}</span>
                            </div>
                            {detailTransaction.discountAmount > 0 && (
                                <div className="flex justify-between text-red-500">
                                    <span>Diskon</span>
                                    <span>-{formatCurrency(detailTransaction.discountAmount)}</span>
                                </div>
                            )}
                            {detailTransaction.taxAmount > 0 && (
                                <div className="flex justify-between text-gray-500">
                                    <span>Pajak</span>
                                    <span>{formatCurrency(detailTransaction.taxAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1.5 font-bold text-gray-900 dark:text-white">
                                <span>Total</span>
                                <span>{formatCurrency(detailTransaction.totalAmount)}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                                <span>Dibayar</span>
                                <span>{formatCurrency(detailTransaction.paidAmount)}</span>
                            </div>
                            {detailTransaction.changeAmount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Kembalian</span>
                                    <span>{formatCurrency(detailTransaction.changeAmount)}</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setShowDetail(false)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}

            {/* Void Modal */}
            {showVoidModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !voiding && setShowVoidModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Batalkan Transaksi</h3>
                            {!voiding && (
                                <button onClick={() => setShowVoidModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-gray-500">
                            Apakah Anda yakin ingin membatalkan transaksi ini? Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowVoidModal(false)}
                                disabled={voiding}
                                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleVoid}
                                disabled={voiding}
                                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {voiding ? 'Membatalkan...' : 'Ya, Batalkan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
