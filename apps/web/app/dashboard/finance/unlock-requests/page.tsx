'use client'
import { usePermission } from '@/lib/use-permission'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { logger } from '@/lib/logger'
import Link from 'next/link'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
    Clock,
    CheckCircle,
    XCircle,
    TimerOff,
    Unlock,
    Plus,
    ChevronRight,
    X,
    ShieldAlert,
    Loader2,
    FileText,
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

type UnlockRequestItem = {
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
}

type PeriodOption = {
    id: string
    name: string
    startDate: string
    endDate: string
    status: string
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

export default function UnlockRequestsPage() {
    const { t } = useTranslation()
    const { canApprove: canApproveFn, isAdmin: isAdminFn, role } = usePermission()
    const canApprove = canApproveFn('finance') || isAdminFn()

    const [requests, setRequests] = useState<UnlockRequestItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Create form state
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [createLevel, setCreateLevel] = useState('MONTH')
    const [createPeriodId, setCreatePeriodId] = useState('')
    const [createReason, setCreateReason] = useState('')
    const [closedPeriods, setClosedPeriods] = useState<PeriodOption[]>([])
    const [creating, setCreating] = useState(false)

    // Decision modal state
    const [decisionTarget, setDecisionTarget] = useState<UnlockRequestItem | null>(null)
    const [decisionKind, setDecisionKind] = useState<'APPROVED' | 'REJECTED'>('APPROVED')
    const [decisionComments, setDecisionComments] = useState('')
    const [deciding, setDeciding] = useState(false)
    const [showDecisionModal, setShowDecisionModal] = useState(false)

    // Confirm dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [confirmMessage, setConfirmMessage] = useState('')

    useEffect(() => {
        fetchRequests()
    }, [statusFilter, page])

    // Auto-hide toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchRequests = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            if (statusFilter !== 'all') params.set('status', statusFilter)
            params.set('page', String(page))
            params.set('limit', '20')
            const res = await fetch(`/api/finance/locks/unlock-requests?${params.toString()}`)
            const data = await res.json()
            if (data.success) {
                setRequests(data.data || [])
                setTotalPages(data.totalPages || 1)
            } else {
                setError(data.error?.message || t('finance.unlockRequests.loadError') || 'Gagal memuat permintaan unlock')
            }
        } catch (err) {
            logger.error('Failed to fetch unlock requests:', err)
            setError(t('finance.unlockRequests.loadError') || 'Gagal memuat permintaan unlock')
        } finally {
            setLoading(false)
        }
    }, [statusFilter, page, t])

    const fetchClosedPeriods = useCallback(async () => {
        try {
            const res = await fetch('/api/finance/periods')
            const data = await res.json()
            if (data.success) {
                const closed = (data.data || []).filter((p: { status: string }) => p.status === 'CLOSED')
                setClosedPeriods(closed)
            }
        } catch (err) {
            logger.error('Failed to fetch closed periods:', err)
        }
    }, [])

    // ============================================
    // Handlers
    // ============================================

    const handleOpenCreate = () => {
        setCreateLevel('MONTH')
        setCreatePeriodId('')
        setCreateReason('')
        setShowCreateForm(true)
        fetchClosedPeriods()
    }

    const handleCreate = async () => {
        const reason = createReason.trim()
        if (reason.length < 20) {
            setToast({ message: t('finance.unlockRequests.reasonTooShort') || 'Alasan minimal 20 karakter', type: 'error' })
            return
        }
        if (createLevel === 'SPECIFIC' && !createPeriodId) {
            setToast({ message: t('finance.unlockRequests.periodRequired') || 'Pilih periode yang akan dibuka', type: 'error' })
            return
        }
        setCreating(true)
        try {
            const body: { level: string; reason: string; periodId?: string } = { level: createLevel, reason }
            if (createLevel === 'SPECIFIC') body.periodId = createPeriodId
            const res = await fetch('/api/finance/locks/unlock-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const data = await res.json()
            if (data.success) {
                setShowCreateForm(false)
                setToast({
                    message: data.message || t('finance.unlockRequests.created') || 'Permintaan unlock dibuat',
                    type: 'success',
                })
                setPage(1)
                fetchRequests()
            } else {
                setToast({
                    message: data.error?.message || t('finance.unlockRequests.createError') || 'Gagal membuat permintaan unlock',
                    type: 'error',
                })
            }
        } catch (err) {
            logger.error('Failed to create unlock request:', err)
            setToast({ message: t('finance.unlockRequests.createError') || 'Gagal membuat permintaan unlock', type: 'error' })
        } finally {
            setCreating(false)
        }
    }

    const openDecision = (request: UnlockRequestItem, kind: 'APPROVED' | 'REJECTED') => {
        setDecisionTarget(request)
        setDecisionKind(kind)
        setDecisionComments('')
        setShowDecisionModal(true)
    }

    const handleDecide = async () => {
        if (!decisionTarget) return
        if (decisionKind === 'REJECTED' && decisionComments.trim().length < 5) {
            setToast({ message: t('finance.unlockRequests.rejectReasonRequired') || 'Alasan penolakan wajib diisi', type: 'error' })
            return
        }
        setDeciding(true)
        try {
            const endpoint = decisionKind === 'APPROVED' ? 'approve' : 'reject'
            const res = await fetch(`/api/finance/locks/unlock-requests/${decisionTarget.id}/${endpoint}`, {
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
                fetchRequests()
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

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t('finance.unlockRequests.title') || 'Permintaan Buka Periode'}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('finance.unlockRequests.subtitle') || 'Ajukan pembukaan sementara periode yang sudah ditutup melalui prosedur approval'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href="/dashboard/finance/periods"
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <FileText className="h-4 w-4" />
                        {t('finance.unlockRequests.backToPeriods') || 'Periode Akuntansi'}
                    </Link>
                    {role !== 'VIEWER' && (
                        <button
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                        >
                            <Plus className="h-4 w-4" />
                            {t('finance.unlockRequests.newRequest') || 'Buat Permintaan'}
                        </button>
                    )}
                </div>
            </div>

            {/* Create Form */}
            {showCreateForm && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300">
                            {t('finance.unlockRequests.createTitle') || 'Permintaan Buka Periode Baru'}
                        </h3>
                        <button
                            onClick={() => setShowCreateForm(false)}
                            className="rounded-lg p-1 text-purple-600 hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-900/40"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-purple-600 dark:text-purple-400">
                                {t('finance.unlockRequests.level') || 'Level Pembukaan'}
                            </label>
                            <select
                                value={createLevel}
                                onChange={(e) => setCreateLevel(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm dark:border-purple-700 dark:bg-gray-800 dark:text-gray-200"
                            >
                                <option value="DAY">{levelConfig.DAY}</option>
                                <option value="MONTH">{levelConfig.MONTH}</option>
                                <option value="QUARTER">{levelConfig.QUARTER}</option>
                                <option value="YEAR">{levelConfig.YEAR}</option>
                                <option value="SPECIFIC">{levelConfig.SPECIFIC}</option>
                            </select>
                        </div>
                        {createLevel === 'SPECIFIC' && (
                            <div>
                                <label className="block text-xs text-purple-600 dark:text-purple-400">
                                    {t('finance.unlockRequests.targetPeriod') || 'Periode Target'}
                                </label>
                                <select
                                    value={createPeriodId}
                                    onChange={(e) => setCreatePeriodId(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm dark:border-purple-700 dark:bg-gray-800 dark:text-gray-200"
                                >
                                    <option value="">{t('finance.unlockRequests.selectPeriod') || '-- Pilih periode yang ditutup --'}</option>
                                    {closedPeriods.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({formatDate(p.startDate)} - {formatDate(p.endDate)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <div className="flex items-center justify-between">
                                <label className="block text-xs text-purple-600 dark:text-purple-400">
                                    {t('finance.unlockRequests.reason') || 'Alasan Pembukaan'}
                                </label>
                                <span className={`text-xs ${createReason.trim().length < 20 ? 'text-red-500' : 'text-purple-400'}`}>
                                    {createReason.trim().length}/1000 (min. 20)
                                </span>
                            </div>
                            <textarea
                                value={createReason}
                                onChange={(e) => setCreateReason(e.target.value.slice(0, 1000))}
                                rows={3}
                                placeholder={t('finance.unlockRequests.reasonPlaceholder') || 'Jelaskan alasan pembukaan periode (misal: koreksi jurnal tertutup yang berdampak pada laporan)...'}
                                className="mt-1 w-full rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm dark:border-purple-700 dark:bg-gray-800 dark:text-gray-200"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleCreate}
                                disabled={creating}
                                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                            >
                                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                                {t('finance.unlockRequests.submit') || 'Ajukan Permintaan'}
                            </button>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="rounded-lg border border-purple-300 bg-white px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:bg-gray-800 dark:text-purple-300 dark:hover:bg-gray-700"
                            >
                                {t('common.cancel') || 'Batal'}
                            </button>
                        </div>
                        <p className="text-xs text-purple-500 dark:text-purple-400">
                            {t('finance.unlockRequests.approvalNote') || 'Permintaan akan diajukan ke approver yang berwenang. Jika disetujui, periode akan dibuka sementara dan terkunci kembali otomatis setelah waktu yang ditentukan.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Decision Modal */}
            {showDecisionModal && decisionTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-gray-800">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {decisionKind === 'APPROVED'
                                    ? t('finance.unlockRequests.approveTitle') || 'Setujui Permintaan Unlock'
                                    : t('finance.unlockRequests.rejectTitle') || 'Tolak Permintaan Unlock'}
                            </h3>
                            <button
                                onClick={() => setShowDecisionModal(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="space-y-4 px-6 py-4">
                            <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900/50">
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {levelConfig[decisionTarget.level] || decisionTarget.level} — {decisionTarget.targetPeriods.map((p) => p.name).join(', ') || '-'}
                                </p>
                                <p className="mt-1 text-gray-500 dark:text-gray-400">
                                    {t('finance.unlockRequests.requestedBy') || 'Diajukan oleh'}: {decisionTarget.requestedByName || decisionTarget.requestedBy} · {formatDateTime(decisionTarget.requestedAt)}
                                </p>
                                <p className="mt-1 text-gray-500 dark:text-gray-400">"{decisionTarget.reason}"</p>
                                {decisionKind === 'APPROVED' && (
                                    <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                                        {t('finance.unlockRequests.unlockDurationNote',) || 'Durasi unlock mengikuti konfigurasi kebijakan (temporaryUnlockDurationHours)'}
                                    </p>
                                )}
                            </div>
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
                                {deciding ? <Loader2 className="h-4 w-4 animate-spin" /> : decisionKind === 'APPROVED' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                {decisionKind === 'APPROVED'
                                    ? (t('finance.unlockRequests.approve') || 'Setujui')
                                    : (t('finance.unlockRequests.reject') || 'Tolak')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2">
                {['all', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'].map((status) => (
                    <button
                        key={status}
                        onClick={() => {
                            setStatusFilter(status)
                            setPage(1)
                        }}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${statusFilter === status
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                            }`}
                    >
                        {status === 'all'
                            ? (t('common.all') || 'Semua')
                            : (statusConfig[status]?.label || status)}
                    </button>
                ))}
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

            {/* Empty State */}
            {!loading && !error && requests.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-800">
                    <Unlock className="h-12 w-12 text-gray-300" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                        {t('finance.unlockRequests.emptyTitle') || 'Belum ada permintaan unlock'}
                    </h3>
                    <p className="mt-2 max-w-sm text-sm text-gray-500">
                        {t('finance.unlockRequests.emptyDescription') || 'Permintaan pembukaan periode yang sudah ditutup akan muncul di sini.'}
                    </p>
                </div>
            )}

            {/* List — Dual Layout */}
            {!loading && requests.length > 0 && (
                <>
                    {/* Desktop Table */}
                    <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 md:block">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        {t('finance.unlockRequests.table.level') || 'Level'}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        {t('finance.unlockRequests.table.periods') || 'Periode Target'}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        {t('finance.unlockRequests.table.requestedBy') || 'Diajukan Oleh'}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        {t('finance.unlockRequests.table.status') || 'Status'}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        {t('finance.unlockRequests.table.requestedAt') || 'Tanggal Pengajuan'}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        {t('finance.unlockRequests.table.temporaryUnlock') || 'Unlock Sementara'}
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                        {t('common.actions') || 'Aksi'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {requests.map((req) => {
                                    const cfg = statusConfig[req.status] || statusConfig.PENDING
                                    const StatusIcon = cfg.icon
                                    return (
                                        <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                                                    <ShieldAlert className="h-3 w-3" />
                                                    {levelConfig[req.level] || req.level}
                                                </span>
                                            </td>
                                            <td className="max-w-[220px] px-6 py-4 text-sm text-gray-500">
                                                {req.targetPeriods.length > 0
                                                    ? req.targetPeriods.map((p) => p.name).join(', ')
                                                    : '-'}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                {req.requestedByName || req.requestedBy}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                {formatDateTime(req.requestedAt)}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                                {req.status === 'APPROVED' && req.temporaryUnlockActive ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                                                        <TimerOff className="h-3 w-3" />
                                                        {formatRemaining(req.minutesRemaining)}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {req.status === 'PENDING' && canApprove && (
                                                        <>
                                                            <button
                                                                onClick={() => openDecision(req, 'APPROVED')}
                                                                className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                                                            >
                                                                <CheckCircle className="h-3 w-3" />
                                                                {t('finance.unlockRequests.approve') || 'Setujui'}
                                                            </button>
                                                            <button
                                                                onClick={() => openDecision(req, 'REJECTED')}
                                                                className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                                                            >
                                                                <XCircle className="h-3 w-3" />
                                                                {t('finance.unlockRequests.reject') || 'Tolak'}
                                                            </button>
                                                        </>
                                                    )}
                                                    <Link
                                                        href={`/dashboard/finance/unlock-requests/${req.id}`}
                                                        className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                                    >
                                                        {t('common.detail') || 'Detail'}
                                                        <ChevronRight className="h-3 w-3" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="space-y-3 md:hidden">
                        {requests.map((req) => {
                            const cfg = statusConfig[req.status] || statusConfig.PENDING
                            const StatusIcon = cfg.icon
                            return (
                                <div key={req.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ShieldAlert className="h-4 w-4 text-purple-400" />
                                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                                {levelConfig[req.level] || req.level}
                                            </span>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                                            <StatusIcon className="h-3 w-3" />
                                            {cfg.label}
                                        </span>
                                    </div>
                                    <div className="mt-2 space-y-1 text-sm text-gray-500">
                                        <div>
                                            <span className="text-xs text-gray-400">{t('finance.unlockRequests.table.periods') || 'Periode'}:</span>{' '}
                                            {req.targetPeriods.length > 0 ? req.targetPeriods.map((p) => p.name).join(', ') : '-'}
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-400">{t('finance.unlockRequests.table.requestedBy') || 'Oleh'}:</span>{' '}
                                            {req.requestedByName || req.requestedBy}
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-400">{t('finance.unlockRequests.table.requestedAt') || 'Tanggal'}:</span>{' '}
                                            {formatDateTime(req.requestedAt)}
                                        </div>
                                        {req.status === 'APPROVED' && req.temporaryUnlockActive && (
                                            <div>
                                                <span className="text-xs text-gray-400">{t('finance.unlockRequests.table.temporaryUnlock') || 'Unlock'}:</span>{' '}
                                                <span className="font-medium text-green-600">{formatRemaining(req.minutesRemaining)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-2 line-clamp-2 text-xs text-gray-400">{req.reason}</p>
                                    <div className="mt-3 flex gap-2">
                                        {req.status === 'PENDING' && canApprove && (
                                            <>
                                                <button
                                                    onClick={() => openDecision(req, 'APPROVED')}
                                                    className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                                                >
                                                    <CheckCircle className="h-3 w-3" />
                                                    {t('finance.unlockRequests.approve') || 'Setujui'}
                                                </button>
                                                <button
                                                    onClick={() => openDecision(req, 'REJECTED')}
                                                    className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                                                >
                                                    <XCircle className="h-3 w-3" />
                                                    {t('finance.unlockRequests.reject') || 'Tolak'}
                                                </button>
                                            </>
                                        )}
                                        <Link
                                            href={`/dashboard/finance/unlock-requests/${req.id}`}
                                            className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300"
                                        >
                                            {t('common.detail') || 'Detail'}
                                            <ChevronRight className="h-3 w-3" />
                                        </Link>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                {t('finance.unlockRequests.page') || 'Halaman'} {page} / {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
                                >
                                    {t('common.previous') || 'Sebelumnya'}
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
                                >
                                    {t('common.next') || 'Berikutnya'}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
