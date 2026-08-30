'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
    CreditCard,
    Clock,
    CheckCircle,
    XCircle,
    Building2,
    Users,
    TrendingUp,
    Loader2,
    Eye,
    Check,
    X,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Filter,
    ExternalLink,
    MessageSquare,
} from 'lucide-react'

interface PaymentWithDetails {
    id: string
    amount: number
    paymentMethod: string
    bankName: string | null
    accountNumber: string | null
    accountName: string | null
    proofFileUrl: string | null
    proofFileName: string | null
    reference: string | null
    status: string
    rejectReason: string | null
    notes: string | null
    waConfirmed: boolean
    createdAt: string
    verifiedAt: string | null
    tenant: {
        id: string
        name: string
        email: string
        slug: string
        subscriptionStatus: string
    }
    subscription: {
        id: string
        status: string
        plan: {
            id: string
            name: string
            slug: string
            price: number
        }
    }
}

interface BillingStats {
    pendingCount: number
    pendingTotal: number
    monthlyCount: number
    monthlyTotal: number
    activeTenants: number
    monthlyRevenue: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    PENDING: { label: 'Menunggu Verifikasi', color: 'text-yellow-700', bg: 'bg-yellow-100' },
    VERIFIED: { label: 'Diverifikasi', color: 'text-green-700', bg: 'bg-green-100' },
    REJECTED: { label: 'Ditolak', color: 'text-red-700', bg: 'bg-red-100' },
}

export default function BillingManagementPage() {
    const { data: session, status: sessionStatus } = useSession()
    const router = useRouter()

    const [stats, setStats] = useState<BillingStats | null>(null)
    const [payments, setPayments] = useState<PaymentWithDetails[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [processingId, setProcessingId] = useState<string | null>(null)

    // Modal states
    const [detailModal, setDetailModal] = useState<PaymentWithDetails | null>(null)
    const [approveModal, setApproveModal] = useState<PaymentWithDetails | null>(null)
    const [rejectModal, setRejectModal] = useState<PaymentWithDetails | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [proofModal, setProofModal] = useState<PaymentWithDetails | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    // Auth check
    useEffect(() => {
        if (sessionStatus === 'unauthenticated') {
            router.push('/login')
        }
    }, [sessionStatus, router])

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/billing/admin/stats')
            const data = await res.json()
            if (data.success) setStats(data.data)
        } catch {
            console.error('Error fetching stats')
        }
    }, [])

    const fetchPayments = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({
                page: String(page),
                limit: '20',
            })
            if (filter !== 'ALL') params.set('status', filter)

            const res = await fetch(`/api/billing/admin/payments?${params}`)
            const data = await res.json()
            if (data.success) {
                setPayments(data.data)
                setTotalPages(data.pagination.totalPages)
            }
        } catch {
            console.error('Error fetching payments')
        } finally {
            setLoading(false)
        }
    }, [page, filter])

    useEffect(() => {
        fetchStats()
        fetchPayments()
    }, [fetchStats, fetchPayments])

    const handleApprove = async (payment: PaymentWithDetails) => {
        try {
            setProcessingId(payment.id)
            const res = await fetch(`/api/billing/admin/payments/${payment.id}/verify`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve' }),
            })
            const data = await res.json()
            if (data.success) {
                setApproveModal(null)
                fetchPayments()
                fetchStats()
            } else {
                setToast({ message: data.error || 'Gagal memverifikasi pembayaran', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal memverifikasi pembayaran', type: 'error' })
        } finally {
            setProcessingId(null)
        }
    }

    const handleReject = async (payment: PaymentWithDetails) => {
        if (!rejectReason.trim()) {
            setToast({ message: 'Alasan penolakan wajib diisi', type: 'error' })
            return
        }
        try {
            setProcessingId(payment.id)
            const res = await fetch(`/api/billing/admin/payments/${payment.id}/verify`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject', rejectReason }),
            })
            const data = await res.json()
            if (data.success) {
                setRejectModal(null)
                setRejectReason('')
                fetchPayments()
                fetchStats()
            } else {
                setToast({ message: data.error || 'Gagal menolak pembayaran', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menolak pembayaran', type: 'error' })
        } finally {
            setProcessingId(null)
        }
    }

    const getProofUrl = (url: string | null) => {
        if (!url) return null
        if (url.startsWith('http')) return url
        return url
    }

    if (sessionStatus === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    // Check if user is admin/superadmin
    const userRole = session?.user?.role as string | undefined
    if (userRole !== 'SUPERADMIN' && userRole !== 'ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <XCircle className="w-16 h-16 text-red-300 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Akses Ditolak</h2>
                <p className="text-gray-500">Hanya Super Admin yang dapat mengakses halaman ini.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Billing Management</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Kelola pembayaran dan langganan tenant
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {stats?.pendingCount || 0}
                            </p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        Total: {formatCurrency(Number(stats?.pendingTotal || 0))}
                    </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Bulan Ini</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {stats?.monthlyCount || 0}
                            </p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        Total: {formatCurrency(Number(stats?.monthlyTotal || 0))}
                    </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                            <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Tenant Aktif</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {stats?.activeTenants || 0}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Revenue Bulan Ini</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {formatCurrency(Number(stats?.monthlyRevenue || 0))}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-0">
                {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => { setFilter(tab); setPage(1) }}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${filter === tab
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                    >
                        {tab === 'ALL' && 'Semua'}
                        {tab === 'PENDING' && `Menunggu (${stats?.pendingCount || 0})`}
                        {tab === 'VERIFIED' && 'Diverifikasi'}
                        {tab === 'REJECTED' && 'Ditolak'}
                    </button>
                ))}
            </div>

            {/* Payments Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
                {payments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">Belum ada data pembayaran</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tanggal</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tenant</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Paket</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Jumlah</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Bank</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {payments.map((payment) => {
                                    const statusCfg = STATUS_CONFIG[payment.status] || STATUS_CONFIG.PENDING
                                    return (
                                        <tr
                                            key={payment.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition"
                                            onClick={() => setDetailModal(payment)}
                                        >
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                {formatDate(payment.createdAt)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {payment.tenant.name}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {payment.tenant.email}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                {payment.subscription.plan.name}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                {formatCurrency(Number(payment.amount))}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                {payment.bankName || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                                                    {statusCfg.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1">
                                                    {payment.proofFileUrl && (
                                                        <button
                                                            onClick={() => setProofModal(payment)}
                                                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                                                            title="Lihat Bukti"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {payment.status === 'PENDING' && (
                                                        <>
                                                            <button
                                                                onClick={() => setApproveModal(payment)}
                                                                disabled={processingId === payment.id}
                                                                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
                                                                title="Approve"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => { setRejectModal(payment); setRejectReason('') }}
                                                                disabled={processingId === payment.id}
                                                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                                                                title="Reject"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Halaman {page} dari {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* DETAIL MODAL */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {detailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDetailModal(null)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:bg-gray-800 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Detail Pembayaran</h2>
                            <button
                                onClick={() => setDetailModal(null)}
                                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Status Badge */}
                            <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[detailModal.status]?.bg} ${STATUS_CONFIG[detailModal.status]?.color}`}>
                                    {STATUS_CONFIG[detailModal.status]?.label}
                                </span>
                                {detailModal.waConfirmed && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        <MessageSquare className="w-3 h-3" />
                                        WA Confirmed
                                    </span>
                                )}
                            </div>

                            {/* Tenant Info */}
                            <div className="bg-gray-50 rounded-lg p-4 dark:bg-gray-750">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    Informasi Tenant
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs text-gray-400">Nama</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{detailModal.tenant.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Email</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{detailModal.tenant.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Status Langganan</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{detailModal.tenant.subscriptionStatus}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Plan Info */}
                            <div className="bg-gray-50 rounded-lg p-4 dark:bg-gray-750">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" />
                                    Informasi Paket
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs text-gray-400">Paket</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{detailModal.subscription.plan.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Harga/Bulan</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(Number(detailModal.subscription.plan.price))}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Info */}
                            <div className="bg-gray-50 rounded-lg p-4 dark:bg-gray-750">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" />
                                    Informasi Pembayaran
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs text-gray-400">Jumlah</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(Number(detailModal.amount))}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Tanggal</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDateTime(detailModal.createdAt)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Bank Pengirim</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{detailModal.bankName || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Rekening Pengirim</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{detailModal.accountNumber || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Nama Pengirim</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{detailModal.accountName || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Reference</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{detailModal.reference || '-'}</p>
                                    </div>
                                    {detailModal.notes && (
                                        <div className="col-span-2">
                                            <p className="text-xs text-gray-400">Catatan</p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{detailModal.notes}</p>
                                        </div>
                                    )}
                                    {detailModal.rejectReason && (
                                        <div className="col-span-2">
                                            <p className="text-xs text-red-400">Alasan Penolakan</p>
                                            <p className="text-sm text-red-600 dark:text-red-400">{detailModal.rejectReason}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Proof */}
                            {detailModal.proofFileUrl && (
                                <div className="bg-gray-50 rounded-lg p-4 dark:bg-gray-750">
                                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Bukti Transfer</h3>
                                    <button
                                        onClick={() => setProofModal(detailModal)}
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Lihat Bukti Transfer
                                        <ExternalLink className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            {/* Actions */}
                            {detailModal.status === 'PENDING' && (
                                <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        onClick={() => { setApproveModal(detailModal); setDetailModal(null) }}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition"
                                    >
                                        <Check className="w-4 h-4" />
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => { setRejectModal(detailModal); setRejectReason(''); setDetailModal(null) }}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition"
                                    >
                                        <X className="w-4 h-4" />
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* APPROVE CONFIRMATION MODAL */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {approveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setApproveModal(null)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-800 p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Approve Pembayaran</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Konfirmasi verifikasi pembayaran</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 mb-4 dark:bg-gray-750">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Tenant</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{approveModal.tenant.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Paket</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{approveModal.subscription.plan.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Jumlah</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(Number(approveModal.amount))}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 dark:bg-yellow-900/20 dark:border-yellow-800">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    Setelah disetujui, langganan tenant akan diaktifkan dan status berubah menjadi ACTIVE.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 justify-end">
                            <button
                                onClick={() => setApproveModal(null)}
                                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => handleApprove(approveModal)}
                                disabled={processingId === approveModal.id}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
                            >
                                {processingId === approveModal.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                Ya, Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* REJECT MODAL */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {rejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setRejectModal(null)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-800 p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                                <X className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tolak Pembayaran</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Berikan alasan penolakan</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 mb-4 dark:bg-gray-750">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Tenant</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{rejectModal.tenant.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Jumlah</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(Number(rejectModal.amount))}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Alasan Penolakan <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={3}
                                placeholder="Masukkan alasan penolakan..."
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
                            />
                        </div>

                        <div className="flex items-center gap-3 justify-end">
                            <button
                                onClick={() => setRejectModal(null)}
                                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => handleReject(rejectModal)}
                                disabled={processingId === rejectModal.id || !rejectReason.trim()}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition"
                            >
                                {processingId === rejectModal.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <X className="w-4 h-4" />
                                )}
                                Tolak Pembayaran
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* PROOF VIEWER MODAL */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {proofModal && proofModal.proofFileUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setProofModal(null)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:bg-gray-800 dark:border-gray-700">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bukti Transfer</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{proofModal.proofFileName || 'bukti-transfer'}</p>
                            </div>
                            <button
                                onClick={() => setProofModal(null)}
                                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            {proofModal.proofFileUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                                <img
                                    src={getProofUrl(proofModal.proofFileUrl) || ''}
                                    alt="Bukti Transfer"
                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-600"
                                />
                            ) : proofModal.proofFileUrl.match(/\.pdf$/i) ? (
                                <div className="text-center py-8">
                                    <a
                                        href={getProofUrl(proofModal.proofFileUrl) || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Buka PDF
                                    </a>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <Eye className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                    <p>Preview tidak tersedia untuk tipe file ini</p>
                                    <a
                                        href={getProofUrl(proofModal.proofFileUrl) || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 mt-2 text-blue-600 hover:underline"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Download File
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.message}
                </div>
            )}
        </div>
    )
}
