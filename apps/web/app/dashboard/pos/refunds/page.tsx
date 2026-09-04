'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import {
    Search, RotateCcw, Loader2, Check, X, AlertCircle, Eye, Ban,
    ChevronLeft, ChevronRight,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

type Refund = {
    id: string
    refundNo: string
    transactionId: string
    transactionNo: string
    transactionTotal: number
    customerName: string
    paymentMethod: string
    amount: number
    reason: string
    status: string
    approvedBy: string | null
    approvedAt: string | null
    createdBy: string | null
    createdAt: string
}

type RefundDetail = Refund & {
    transaction: {
        id: string
        transactionNo: string
        totalAmount: number
        paidAmount: number
        customerName: string
        paymentMethod: string
        status: string
        createdAt: string
    }
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: 'Tunai',
    CARD: 'Kartu',
    QRIS: 'QRIS',
    E_WALLET: 'E-Wallet',
    BANK_TRANSFER: 'Transfer',
}

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Menunggu',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
}

export default function POSRefundsPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canManage = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN'

    const [refunds, setRefunds] = useState<Refund[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Detail modal
    const [showDetail, setShowDetail] = useState(false)
    const [detailRefund, setDetailRefund] = useState<RefundDetail | null>(null)

    // Approve/Reject modal
    const [actionModal, setActionModal] = useState<{ type: 'APPROVED' | 'REJECTED'; refund: Refund } | null>(null)
    const [actionLoading, setActionLoading] = useState(false)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchRefunds = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (filterStatus !== 'all') params.set('status', filterStatus)
            params.set('page', String(page))
            params.set('limit', '20')
            const response = await fetch(`/api/pos/refunds?${params.toString()}`)
            const data = await response.json()
            if (data.success) {
                setRefunds(data.data)
                setTotalPages(data.totalPages)
            } else {
                setError(data.error || 'Gagal memuat data refund')
            }
        } catch {
            setError('Gagal memuat data refund. Periksa koneksi jaringan Anda.')
        } finally {
            setLoading(false)
        }
    }, [filterStatus, page])

    useEffect(() => {
        fetchRefunds()
    }, [fetchRefunds])

    const filtered = refunds.filter((r) => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            r.refundNo.toLowerCase().includes(q) ||
            r.transactionNo.toLowerCase().includes(q) ||
            r.customerName.toLowerCase().includes(q)
        )
    })

    const handleApproveReject = async () => {
        if (!actionModal) return
        setActionLoading(true)
        try {
            const response = await fetch(`/api/pos/refunds/${actionModal.refund.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: actionModal.type }),
            })
            const data = await response.json()
            if (data.success) {
                setToast({
                    message: actionModal.type === 'APPROVED' ? 'Refund berhasil disetujui' : 'Refund berhasil ditolak',
                    type: 'success',
                })
                setActionModal(null)
                fetchRefunds()
            } else {
                setToast({ message: data.error || 'Gagal memproses refund', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal memproses refund', type: 'error' })
        } finally {
            setActionLoading(false)
        }
    }

    const fetchDetail = async (id: string) => {
        try {
            const response = await fetch(`/api/pos/refunds/${id}`)
            const data = await response.json()
            if (data.success) {
                setDetailRefund(data.data)
                setShowDetail(true)
            }
        } catch {
            setToast({ message: 'Gagal memuat detail refund', type: 'error' })
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
                        <RotateCcw className="h-6 w-6" />
                        {t('pos.refunds.title') || 'Refund POS'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">{t('pos.refunds.subtitle') || 'Kelola permintaan refund transaksi'}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('pos.refunds.searchPlaceholder') || 'Cari nomor refund atau transaksi...'}
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
                    <option value="all">{t('pos.refunds.allStatus') || 'Semua Status'}</option>
                    <option value="PENDING">{t('pos.refunds.pending') || 'Menunggu'}</option>
                    <option value="APPROVED">{t('pos.refunds.approved') || 'Disetujui'}</option>
                    <option value="REJECTED">{t('pos.refunds.rejected') || 'Ditolak'}</option>
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
                    <button onClick={fetchRefunds} className="mt-3 text-sm text-blue-600 hover:underline">Coba Lagi</button>
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState icon={RotateCcw} title={t('pos.refunds.empty') || 'Belum ada permintaan refund'} description={t('pos.refunds.emptyDescription') || 'Permintaan refund akan muncul di sini.'} />
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pos.refunds.refundNo') || 'No Refund'}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pos.refunds.transactionNo') || 'No Transaksi'}</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('pos.refunds.amount') || 'Jumlah'}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pos.refunds.reason') || 'Alasan'}</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('pos.refunds.status') || 'Status'}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pos.refunds.date') || 'Tanggal'}</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('pos.refunds.actions') || 'Aksi'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                                {filtered.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">{r.refundNo}</td>
                                        <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">{r.transactionNo}</td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">{formatCurrency(r.amount)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate">{r.reason}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${r.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                r.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                }`}>
                                                {STATUS_LABELS[r.status] || r.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDateTime(r.createdAt)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => fetchDetail(r.id)}
                                                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    Detail
                                                </button>
                                                {r.status === 'PENDING' && canManage && (
                                                    <>
                                                        <button
                                                            onClick={() => setActionModal({ type: 'APPROVED', refund: r })}
                                                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                            Setujui
                                                        </button>
                                                        <button
                                                            onClick={() => setActionModal({ type: 'REJECTED', refund: r })}
                                                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        >
                                                            <Ban className="h-3.5 w-3.5" />
                                                            Tolak
                                                        </button>
                                                    </>
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
                        {filtered.map((r) => (
                            <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">{r.refundNo}</p>
                                        <p className="text-xs text-gray-400">{r.transactionNo}</p>
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${r.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                        r.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {STATUS_LABELS[r.status] || r.status}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-sm">
                                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                        {PAYMENT_METHOD_LABELS[r.paymentMethod] || r.paymentMethod}
                                    </span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-gray-500">{r.customerName}</span>
                                </div>
                                <div className="mt-2 text-sm text-gray-500 truncate">{r.reason}</div>
                                <div className="mt-2 flex items-center justify-between">
                                    <p className="text-lg font-bold text-red-600">{formatCurrency(r.amount)}</p>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => fetchDetail(r.id)}
                                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                                        >
                                            Detail
                                        </button>
                                        {r.status === 'PENDING' && canManage && (
                                            <>
                                                <button
                                                    onClick={() => setActionModal({ type: 'APPROVED', refund: r })}
                                                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50"
                                                >
                                                    Setujui
                                                </button>
                                                <button
                                                    onClick={() => setActionModal({ type: 'REJECTED', refund: r })}
                                                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                                >
                                                    Tolak
                                                </button>
                                            </>
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
            {showDetail && detailRefund && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDetail(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detail Refund</h3>
                            <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Nomor Refund</span>
                                <span className="font-mono font-medium">{detailRefund.refundNo}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Nomor Transaksi</span>
                                <span className="font-mono font-medium">{detailRefund.transaction.transactionNo}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Tanggal Transaksi</span>
                                <span>{formatDateTime(detailRefund.transaction.createdAt)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Pelanggan</span>
                                <span>{detailRefund.customerName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Total Transaksi</span>
                                <span className="font-medium">{formatCurrency(detailRefund.transaction.totalAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Metode Pembayaran</span>
                                <span>{PAYMENT_METHOD_LABELS[detailRefund.paymentMethod] || detailRefund.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Status</span>
                                <span className={`font-medium ${detailRefund.status === 'APPROVED' ? 'text-green-600' :
                                    detailRefund.status === 'REJECTED' ? 'text-red-600' : 'text-yellow-600'
                                    }`}>
                                    {STATUS_LABELS[detailRefund.status] || detailRefund.status}
                                </span>
                            </div>
                        </div>

                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2 text-sm">
                            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Detail Refund</h4>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Jumlah Refund</span>
                                <span className="font-bold text-red-600">{formatCurrency(detailRefund.amount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Alasan</span>
                                <span className="text-right max-w-[60%]">{detailRefund.reason}</span>
                            </div>
                            {detailRefund.approvedAt && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Disetujui pada</span>
                                    <span>{formatDateTime(detailRefund.approvedAt)}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-500">Diajukan pada</span>
                                <span>{formatDateTime(detailRefund.createdAt)}</span>
                            </div>
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

            {/* Approve/Reject Modal */}
            {actionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !actionLoading && setActionModal(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {actionModal.type === 'APPROVED' ? 'Setujui Refund' : 'Tolak Refund'}
                            </h3>
                            {!actionLoading && (
                                <button onClick={() => setActionModal(null)} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3 text-sm space-y-1">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Refund</span>
                                <span className="font-mono">{actionModal.refund.refundNo}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Transaksi</span>
                                <span className="font-mono">{actionModal.refund.transactionNo}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Jumlah</span>
                                <span className="font-bold">{formatCurrency(actionModal.refund.amount)}</span>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500">
                            {actionModal.type === 'APPROVED'
                                ? 'Dengan menyetujui refund ini, status transaksi akan diubah menjadi REFUNDED.'
                                : 'Apakah Anda yakin ingin menolak permintaan refund ini?'}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setActionModal(null)}
                                disabled={actionLoading}
                                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleApproveReject}
                                disabled={actionLoading}
                                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 ${actionModal.type === 'APPROVED'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                {actionLoading ? 'Memproses...' : actionModal.type === 'APPROVED' ? 'Ya, Setujui' : 'Ya, Tolak'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
