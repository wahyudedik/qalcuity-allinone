'use client'
import { usePermission } from '@/lib/use-permission'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { logger } from '@/lib/logger'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
    Clock,
    CheckCircle,
    XCircle,
    TimerOff,
    Unlock,
    ShieldAlert,
    ArrowLeft,
    Loader2,
    User,
    MessageSquare,
} from 'lucide-react'

// ============================================
// Types
// ============================================

type UnlockPeriodRef = {
    id: string
    name: string
    startDate: string
    endDate: string
    status: string
}

type TemporaryUnlockInfo = {
    id: string
    unlockRequestId: string
    level: string
    periodIds: string[]
    periodNames: string[]
    expiresAt: string
    approvedByName?: string | null
}

type UnlockRequestDetail = {
    id: string
    level: string
    periodId: string | null
    targetPeriods: UnlockPeriodRef[]
    reason: string
    requestedBy: string
    requestedByName: string | null
    requestedByEmail: string | null
    requestedAt: string
    status: string
    decidedBy: string | null
    decidedByName: string | null
    decidedAt: string | null
    decisionComments: string | null
    temporaryUnlockExpiresAt: string | null
    temporaryUnlockDurationHours: number | null
    temporaryUnlockActive: boolean
    minutesRemaining: number
    temporaryUnlock?: TemporaryUnlockInfo | null
}

// ============================================
// Config
// ============================================

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    PENDING: { label: 'Menunggu Persetujuan', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    APPROVED: { label: 'Disetujui', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    REJECTED: { label: 'Ditolak', color: 'bg-red-100 text-red-700', icon: XCircle },
    EXPIRED: { label: 'Kedaluwarsa', color: 'bg-gray-100 text-gray-500', icon: TimerOff },
}

const levelConfig: Record<string, string> = {
    DAY: 'Harian',
    MONTH: 'Bulanan',
    QUARTER: 'Kuartalan',
    YEAR: 'Tahunan',
    SPECIFIC: 'Periode Spesifik',
}

function formatRemaining(minutes: number): string {
    if (minutes <= 0) return 'Berakhir'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h > 0) return `${h}j ${m}m lagi`
    return `${m}m lagi`
}

function formatDate(value: string | null): string {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(value: string | null): string {
    if (!value) return '-'
    return new Date(value).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

// ============================================
// Main Component
// ============================================

export default function UnlockRequestDetailPage() {
    const { t } = useTranslation()
    const params = useParams()
    const id = params?.id as string
    const { canApprove: canApproveFn, isAdmin: isAdminFn } = usePermission()
    const canApprove = canApproveFn('finance') || isAdminFn()

    const [request, setRequest] = useState<UnlockRequestDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Decision modal state
    const [showDecisionModal, setShowDecisionModal] = useState(false)
    const [decisionKind, setDecisionKind] = useState<'APPROVED' | 'REJECTED'>('APPROVED')
    const [decisionComments, setDecisionComments] = useState('')
    const [deciding, setDeciding] = useState(false)

    const fetchDetail = useCallback(async () => {
        if (!id) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/finance/locks/unlock-requests/${id}`)
            const data = await res.json()
            if (data.success) {
                setRequest(data.data)
            } else {
                setError(data.error?.message || t('finance.unlockRequests.detailLoadError') || 'Gagal memuat detail permintaan')
            }
        } catch (err) {
            logger.error('Failed to fetch unlock request detail:', err)
            setError(t('finance.unlockRequests.detailLoadError') || 'Gagal memuat detail permintaan')
        } finally {
            setLoading(false)
        }
    }, [id, t])

    useEffect(() => {
        fetchDetail()
    }, [fetchDetail])

    // Auto-hide toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const openDecision = (kind: 'APPROVED' | 'REJECTED') => {
        setDecisionKind(kind)
        setDecisionComments('')
        setShowDecisionModal(true)
    }

    const handleDecide = async () => {
        if (!request) return
        if (decisionKind === 'REJECTED' && decisionComments.trim().length < 5) {
            setToast({ message: t('finance.unlockRequests.rejectReasonRequired') || 'Alasan penolakan wajib diisi', type: 'error' })
            return
        }
        setDeciding(true)
        try {
            const endpoint = decisionKind === 'APPROVED' ? 'approve' : 'reject'
            const res = await fetch(`/api/finance/locks/unlock-requests/${request.id}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comments: decisionComments.trim() || undefined }),
            })
            const data = await res.json()
            if (data.success) {
                setShowDecisionModal(false)
                setToast({
                    message: data.message ||
                        (decisionKind === 'APPROVED'
                            ? t('finance.unlockRequests.approved') || 'Permintaan disetujui'
                            : t('finance.unlockRequests.rejected') || 'Permintaan ditolak'),
                    type: 'success',
                })
                fetchDetail()
            } else {
                setToast({
                    message: data.error?.message || t('finance.unlockRequests.decideError') || 'Gagal memproses permintaan',
                    type: 'error',
                })
            }
        } catch (err) {
            logger.error('Failed to decide unlock request:', err)
            setToast({ message: t('finance.unlockRequests.decideError') || 'Gagal memproses permintaan', type: 'error' })
        } finally {
            setDeciding(false)
        }
    }

    // ============================================
    // Render
    // ============================================

    return (
        <div className="space-y-6 p-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {toast.message}
                </div>
            )}

            {/* Decision Modal */}
            {showDecisionModal && request && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-gray-800">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {decisionKind === 'APPROVED'
                                    ? t('finance.unlockRequests.approveTitle') || 'Setujui Permintaan Unlock'
                                    : t('finance.unlockRequests.rejectTitle') || 'Tolak Permintaan Unlock'}
                            </h3>
                        </div>
                        <div className="space-y-4 px-6 py-4">
                            {decisionKind === 'APPROVED' && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('finance.unlockRequests.approveWarning') ||
                                        'Permintaan yang disetujui akan membuka periode target secara sementara sesuai durasi kebijakan, lalu terkunci kembali otomatis.'}
                                </p>
                            )}
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400">
                                    {decisionKind === 'APPROVED'
                                        ? t('finance.unlockRequests.comments') || 'Komentar (opsional)'
                                        : t('finance.unlockRequests.rejectComments') || 'Alasan Penolakan (wajib)'}
                                </label>
                                <textarea
                                    value={decisionComments}
                                    onChange={(e) => setDecisionComments(e.target.value.slice(0, 1000))}
                                    rows={3}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                            <button
                                onClick={() => setShowDecisionModal(false)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t('common.cancel') || 'Batal'}
                            </button>
                            <button
                                onClick={handleDecide}
                                disabled={deciding}
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${decisionKind === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                {deciding ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : decisionKind === 'APPROVED' ? (
                                    <CheckCircle className="h-4 w-4" />
                                ) : (
                                    <XCircle className="h-4 w-4" />
                                )}
                                {decisionKind === 'APPROVED'
                                    ? (t('finance.unlockRequests.approve') || 'Setujui')
                                    : (t('finance.unlockRequests.reject') || 'Tolak')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/finance/unlock-requests"
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t('common.back') || 'Kembali'}
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {t('finance.unlockRequests.detailTitle') || 'Detail Permintaan Unlock'}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {request ? `${levelConfig[request.level] || request.level} · ${formatDateTime(request.requestedAt)}` : ''}
                        </p>
                    </div>
                </div>
                {request?.status === 'PENDING' && canApprove && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => openDecision('APPROVED')}
                            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                        >
                            <CheckCircle className="h-4 w-4" />
                            {t('finance.unlockRequests.approve') || 'Setujui'}
                        </button>
                        <button
                            onClick={() => openDecision('REJECTED')}
                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                        >
                            <XCircle className="h-4 w-4" />
                            {t('finance.unlockRequests.reject') || 'Tolak'}
                        </button>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
            )}

            {/* Content */}
            {!loading && request && (
                <>
                    {/* Status + Temporary Unlock Panel */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Status Card */}
                        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                {t('finance.unlockRequests.detail.status') || 'Status Permintaan'}
                            </h2>
                            <div className="mt-3 flex items-center gap-2">
                                {(() => {
                                    const cfg = statusConfig[request.status] || statusConfig.PENDING
                                    const StatusIcon = cfg.icon
                                    return (
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${cfg.color}`}>
                                            <StatusIcon className="h-4 w-4" />
                                            {cfg.label}
                                        </span>
                                    )
                                })()}
                            </div>
                            <div className="mt-4 space-y-2 text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="h-4 w-4 text-purple-400" />
                                    <span>{t('finance.unlockRequests.detail.level') || 'Level'}:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {levelConfig[request.level] || request.level}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-purple-400" />
                                    <span>{t('finance.unlockRequests.detail.requestedBy') || 'Diajukan oleh'}:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {request.requestedByName || request.requestedBy}
                                    </span>
                                </div>
                                {request.requestedByEmail && (
                                    <div className="flex items-center gap-2 pl-6 text-xs text-gray-400">
                                        {request.requestedByEmail}
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-purple-400" />
                                    <span>{t('finance.unlockRequests.detail.requestedAt') || 'Waktu Pengajuan'}:</span>
                                    <span className="text-gray-900 dark:text-gray-100">{formatDateTime(request.requestedAt)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Temporary Unlock Card */}
                        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                {t('finance.unlockRequests.detail.temporaryUnlock') || 'Unlock Sementara'}
                            </h2>
                            {request.status === 'APPROVED' && request.temporaryUnlockActive ? (
                                <div className="mt-3">
                                    <div className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 dark:bg-green-900/20">
                                        <TimerOff className="h-6 w-6 text-green-600" />
                                        <div>
                                            <p className="text-lg font-bold text-green-700 dark:text-green-400">
                                                {formatRemaining(request.minutesRemaining)}
                                            </p>
                                            <p className="text-xs text-green-600 dark:text-green-400">
                                                {t('finance.unlockRequests.detail.expiresAt') || 'Berakhir pada'}:{' '}
                                                {formatDateTime(request.temporaryUnlockExpiresAt)}
                                            </p>
                                        </div>
                                    </div>
                                    {request.temporaryUnlock && request.temporaryUnlock.periodNames.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-xs text-gray-400">
                                                {t('finance.unlockRequests.detail.unlockedPeriods') || 'Periode yang dibuka'}:
                                            </p>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {request.temporaryUnlock.periodNames.map((name) => (
                                                    <span
                                                        key={name}
                                                        className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700"
                                                    >
                                                        <Unlock className="h-3 w-3" />
                                                        {name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <p className="mt-3 text-xs text-gray-400">
                                        {t('finance.unlockRequests.detail.autoRelockNote') ||
                                            'Periode akan terkunci kembali otomatis setelah waktu unlock berakhir.'}
                                    </p>
                                </div>
                            ) : request.status === 'APPROVED' ? (
                                <p className="mt-3 text-sm text-gray-500">
                                    {t('finance.unlockRequests.detail.unlockExpired') || 'Unlock sementara sudah berakhir dan periode telah dikunci kembali.'}
                                </p>
                            ) : (
                                <p className="mt-3 text-sm text-gray-400">
                                    {t('finance.unlockRequests.detail.unlockNotActive') || 'Belum ada unlock sementara. Unlock akan aktif setelah permintaan disetujui.'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Target Periods */}
                    <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {t('finance.unlockRequests.detail.targetPeriods') || 'Periode Target'}
                        </h2>
                        {request.targetPeriods.length > 0 ? (
                            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {request.targetPeriods.map((p) => (
                                    <div
                                        key={p.id}
                                        className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/50"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                                            <p className="text-xs text-gray-400">
                                                {formatDate(p.startDate)} - {formatDate(p.endDate)}
                                            </p>
                                        </div>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                }`}
                                        >
                                            {p.status === 'OPEN' ? 'Terbuka' : 'Ditutup'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-3 text-sm text-gray-400">-</p>
                        )}
                    </div>

                    {/* Reason */}
                    <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                            <MessageSquare className="h-4 w-4" />
                            {t('finance.unlockRequests.detail.reason') || 'Alasan Pembukaan'}
                        </h2>
                        <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{request.reason}</p>
                    </div>

                    {/* Decision Info */}
                    {request.status !== 'PENDING' && (
                        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                {t('finance.unlockRequests.detail.decision') || 'Keputusan'}
                            </h2>
                            <div className="mt-3 space-y-2 text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-purple-400" />
                                    <span>{t('finance.unlockRequests.detail.decidedBy') || 'Diputuskan oleh'}:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {request.decidedByName || request.decidedBy || '-'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-purple-400" />
                                    <span>{t('finance.unlockRequests.detail.decidedAt') || 'Waktu Keputusan'}:</span>
                                    <span className="text-gray-900 dark:text-gray-100">{formatDateTime(request.decidedAt)}</span>
                                </div>
                                {request.decisionComments && (
                                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                                        <p className="text-xs text-gray-400">
                                            {t('finance.unlockRequests.detail.decisionComments') || 'Komentar Keputusan'}:
                                        </p>
                                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                                            {request.decisionComments}
                                        </p>
                                    </div>
                                )}
                                {request.temporaryUnlockDurationHours != null && request.status === 'APPROVED' && (
                                    <p className="text-xs text-gray-400">
                                        {t('finance.unlockRequests.detail.duration') || 'Durasi unlock'}: {request.temporaryUnlockDurationHours} jam
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
