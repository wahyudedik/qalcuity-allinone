'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslation } from '@/lib/i18n'
import { FileText, Plus, Loader2, X, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'

type ExceptionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'

type SoDExceptionRow = {
    id: string
    ruleId: string
    ruleName: string | null
    userId: string
    userName: string | null
    userEmail: string | null
    reason: string
    approverId: string | null
    approverName: string | null
    status: ExceptionStatus
    decision: string | null
    expiresAt: string
    decidedAt: string | null
    createdAt: string
    updatedAt: string
}

type RuleOption = { id: string; name: string; role1: string; role2: string; module: string; action: string | null }

type TeamMember = { id: string; name: string; email: string; role: string; status: string; isCurrentUser?: boolean }

type DecideForm = { decision: 'APPROVED' | 'REJECTED'; comments: string }

/** Extract human-readable error from API response (string or { code, message } shape). */
function extractError(data: { error?: unknown } | null | undefined, fallback: string): string {
    if (!data || data.error === undefined || data.error === null) return fallback
    if (typeof data.error === 'string' && data.error) return data.error
    if (typeof data.error === 'object' && 'message' in data.error) {
        const msg = (data.error as { message?: unknown }).message
        if (typeof msg === 'string' && msg) return msg
    }
    return fallback
}

/** Effective status — PENDING past expiry shows as EXPIRED until cron runs (daily 01:00). */
function effectiveStatus(e: SoDExceptionRow): ExceptionStatus {
    if (e.status === 'PENDING' && new Date(e.expiresAt).getTime() <= Date.now()) return 'EXPIRED'
    return e.status
}

const STATUS_STYLES: Record<ExceptionStatus, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-gray-100 text-gray-600',
}

export default function SoDExceptionsTab({ onToast }: { onToast: (message: string, type: 'success' | 'error') => void }) {
    const { data: session } = useSession()
    const { t } = useTranslation()
    const currentUserId = session?.user?.id ?? ''
    const currentUserRole = session?.user?.role ?? ''
    const isAdmin = currentUserRole === 'ADMIN' || currentUserRole === 'SUPERADMIN'

    const [exceptions, setExceptions] = useState<SoDExceptionRow[]>([])
    const [rules, setRules] = useState<RuleOption[]>([])
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState('')

    // Request modal
    const [requestModalOpen, setRequestModalOpen] = useState(false)
    const [requestForm, setRequestForm] = useState({ ruleId: '', userId: '', reason: '', durationDays: 30 })
    const [requesting, setRequesting] = useState(false)

    // Decide modal
    const [decideTarget, setDecideTarget] = useState<SoDExceptionRow | null>(null)
    const [decideForm, setDecideForm] = useState<DecideForm>({ decision: 'APPROVED', comments: '' })
    const [decideSaving, setDecideSaving] = useState(false)

    const fetchExceptions = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const qs = filterStatus ? `?status=${filterStatus}` : ''
            const res = await fetch(`/api/finance/sod-exceptions${qs}`)
            const data = await res.json()
            if (data.success) {
                setExceptions(Array.isArray(data.data) ? data.data : [])
            } else {
                setError(extractError(data, t('settings.sod.exceptions.loadFailed')))
            }
        } catch {
            setError(t('settings.sod.exceptions.connectFailed'))
        } finally {
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterStatus])

    useEffect(() => {
        fetchExceptions()
    }, [fetchExceptions])

    // Load enabled rules + team members for request modal (once)
    useEffect(() => {
        let cancelled = false
        const loadOptions = async () => {
            try {
                const [rulesRes, teamRes] = await Promise.all([
                    fetch('/api/finance/sod-rules?enabled=true'),
                    fetch('/api/settings/team'),
                ])
                const rulesData = await rulesRes.json()
                const teamData = await teamRes.json()
                if (cancelled) return
                if (rulesData.success && Array.isArray(rulesData.data)) setRules(rulesData.data)
                if (teamData.success && Array.isArray(teamData.data)) setTeamMembers(teamData.data)
            } catch {
                // silent — modal selects will simply be empty; error surfaces on submit
            }
        }
        loadOptions()
        return () => {
            cancelled = true
        }
    }, [])

    const openRequestModal = () => {
        setRequestForm({ ruleId: '', userId: '', reason: '', durationDays: 30 })
        setRequestModalOpen(true)
    }

    const handleSubmitRequest = async () => {
        if (!requestForm.ruleId) {
            onToast(t('settings.sod.exceptions.ruleRequired'), 'error')
            return
        }
        if (requestForm.reason.trim().length < 10) {
            onToast(t('settings.sod.exceptions.reasonTooShort'), 'error')
            return
        }
        const days = Number(requestForm.durationDays)
        if (!Number.isInteger(days) || days < 1 || days > 90) {
            onToast(t('settings.sod.exceptions.durationInvalid'), 'error')
            return
        }

        setRequesting(true)
        try {
            const body: Record<string, unknown> = {
                ruleId: requestForm.ruleId,
                reason: requestForm.reason.trim(),
                durationDays: days,
            }
            // Admin on-behalf: only send userId when admin picked another user
            if (isAdmin && requestForm.userId && requestForm.userId !== currentUserId) {
                body.userId = requestForm.userId
            }
            const res = await fetch('/api/finance/sod-exceptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const data = await res.json()
            if (data.success) {
                onToast(t('settings.sod.exceptions.requestSuccess'), 'success')
                setRequestModalOpen(false)
                fetchExceptions()
            } else {
                onToast(extractError(data, t('settings.sod.exceptions.requestFailed')), 'error')
            }
        } catch {
            onToast(t('settings.sod.exceptions.connectFailed'), 'error')
        } finally {
            setRequesting(false)
        }
    }

    const openDecide = (exception: SoDExceptionRow, decision: 'APPROVED' | 'REJECTED') => {
        setDecideTarget(exception)
        setDecideForm({ decision, comments: '' })
    }

    const handleDecide = async () => {
        if (!decideTarget) return
        setDecideSaving(true)
        try {
            const res = await fetch(`/api/finance/sod-exceptions/${decideTarget.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    decision: decideForm.decision,
                    comments: decideForm.comments.trim() || undefined,
                }),
            })
            const data = await res.json()
            if (data.success) {
                onToast(t('settings.sod.exceptions.decideSuccess'), 'success')
                setDecideTarget(null)
                fetchExceptions()
            } else {
                onToast(extractError(data, t('settings.sod.exceptions.decideFailed')), 'error')
            }
        } catch {
            onToast(t('settings.sod.exceptions.connectFailed'), 'error')
        } finally {
            setDecideSaving(false)
        }
    }

    const statusLabel = (s: ExceptionStatus) => {
        switch (s) {
            case 'PENDING': return t('settings.sod.exceptions.statusPending')
            case 'APPROVED': return t('settings.sod.exceptions.statusApproved')
            case 'REJECTED': return t('settings.sod.exceptions.statusRejected')
            case 'EXPIRED': return t('settings.sod.exceptions.statusExpired')
        }
    }

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        } catch {
            return iso
        }
    }

    const ruleNameOf = (e: SoDExceptionRow) => e.ruleName ?? t('settings.sod.exceptions.deletedRule')
    const userNameOf = (e: SoDExceptionRow) => e.userName ?? e.userEmail ?? t('settings.sod.exceptions.unknownUser')

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-gray-200 rounded"></div>
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8">
                <div className="flex flex-col items-center text-center">
                    <FileText className="h-12 w-12 text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('settings.sod.exceptions.loadError')}</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button onClick={fetchExceptions} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        {t('settings.retry')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">{t('settings.sod.exceptions.filterStatus')}</span>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">{t('settings.sod.exceptions.allStatus')}</option>
                            <option value="PENDING">{t('settings.sod.exceptions.statusPending')}</option>
                            <option value="APPROVED">{t('settings.sod.exceptions.statusApproved')}</option>
                            <option value="REJECTED">{t('settings.sod.exceptions.statusRejected')}</option>
                            <option value="EXPIRED">{t('settings.sod.exceptions.statusExpired')}</option>
                        </select>
                    </div>
                    <button
                        onClick={openRequestModal}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                        <Plus className="h-4 w-4" />
                        {t('settings.sod.exceptions.requestException')}
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {t('settings.sod.exceptions.autoExpireNote')}
                </p>
            </div>

            {/* Empty state */}
            {exceptions.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('settings.sod.exceptions.emptyTitle')}</h3>
                    <p className="text-gray-600 mb-4">{t('settings.sod.exceptions.emptyDesc')}</p>
                    <button
                        onClick={openRequestModal}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-4 w-4 inline mr-1" />
                        {t('settings.sod.exceptions.requestException')}
                    </button>
                </div>
            ) : (
                <>
                    {/* Desktop: table */}
                    <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase">
                                    <th className="px-4 py-3">{t('settings.sod.exceptions.colRule')}</th>
                                    <th className="px-4 py-3">{t('settings.sod.exceptions.colUser')}</th>
                                    <th className="px-4 py-3">{t('settings.sod.exceptions.colReason')}</th>
                                    <th className="px-4 py-3">{t('settings.sod.exceptions.colStatus')}</th>
                                    <th className="px-4 py-3">{t('settings.sod.exceptions.colExpires')}</th>
                                    <th className="px-4 py-3">{t('settings.sod.exceptions.colApprover')}</th>
                                    <th className="px-4 py-3 text-right">{t('settings.sod.rules.colActions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {exceptions.map((e) => {
                                    const eff = effectiveStatus(e)
                                    const canDecide = eff === 'PENDING' && e.userId !== currentUserId
                                    return (
                                        <tr key={e.id} className="hover:bg-gray-50 align-top">
                                            <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">{ruleNameOf(e)}</td>
                                            <td className="px-4 py-3">
                                                <div className="text-gray-900">{userNameOf(e)}</div>
                                                {e.userEmail && <div className="text-xs text-gray-500">{e.userEmail}</div>}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 max-w-[240px]">
                                                <span className="line-clamp-2" title={e.reason}>{e.reason}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_STYLES[eff]}`}>
                                                    {statusLabel(eff)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(e.expiresAt)}</td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {e.approverName ? (
                                                    <>
                                                        <div>{e.approverName}</div>
                                                        {e.decidedAt && <div className="text-xs text-gray-500">{formatDate(e.decidedAt)}</div>}
                                                    </>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {canDecide ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => openDecide(e, 'APPROVED')}
                                                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                                        >
                                                            <CheckCircle className="h-3.5 w-3.5" />
                                                            {t('settings.sod.exceptions.approveBtn')}
                                                        </button>
                                                        <button
                                                            onClick={() => openDecide(e, 'REJECTED')}
                                                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                        >
                                                            <XCircle className="h-3.5 w-3.5" />
                                                            {t('settings.sod.exceptions.rejectBtn')}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="block text-right text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile: cards */}
                    <div className="md:hidden space-y-3">
                        {exceptions.map((e) => {
                            const eff = effectiveStatus(e)
                            const canDecide = eff === 'PENDING' && e.userId !== currentUserId
                            return (
                                <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 truncate">{ruleNameOf(e)}</div>
                                            <div className="text-sm text-gray-600 mt-0.5">{userNameOf(e)}</div>
                                        </div>
                                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${STATUS_STYLES[eff]}`}>
                                            {statusLabel(eff)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">{e.reason}</p>
                                    <div className="text-xs text-gray-500 mt-2">
                                        {t('settings.sod.exceptions.colExpires')}: {formatDate(e.expiresAt)}
                                        {e.approverName && ` • ${t('settings.sod.exceptions.colApprover')}: ${e.approverName}`}
                                    </div>
                                    {canDecide && (
                                        <div className="flex items-center justify-end gap-2 mt-3">
                                            <button
                                                onClick={() => openDecide(e, 'APPROVED')}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                            >
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                {t('settings.sod.exceptions.approveBtn')}
                                            </button>
                                            <button
                                                onClick={() => openDecide(e, 'REJECTED')}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                            >
                                                <XCircle className="h-3.5 w-3.5" />
                                                {t('settings.sod.exceptions.rejectBtn')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </>
            )}

            {/* Request Modal */}
            {requestModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">{t('settings.sod.exceptions.requestModalTitle')}</h3>
                            <button onClick={() => setRequestModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                            {/* Rule */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.sod.exceptions.ruleLabel')}</label>
                                <select
                                    value={requestForm.ruleId}
                                    onChange={(e) => setRequestForm((prev) => ({ ...prev, ruleId: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">{t('settings.sod.exceptions.selectRule')}</option>
                                    {rules.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                                {rules.length === 0 && (
                                    <p className="text-xs text-amber-600 mt-1">{t('settings.sod.exceptions.noEnabledRules')}</p>
                                )}
                            </div>

                            {/* User (admin on-behalf) */}
                            {isAdmin && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.sod.exceptions.userLabel')}</label>
                                    <select
                                        value={requestForm.userId}
                                        onChange={(e) => setRequestForm((prev) => ({ ...prev, userId: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">{t('settings.sod.exceptions.userSelfLabel')}</option>
                                        {teamMembers
                                            .filter((m) => m.status === 'active' && m.id !== currentUserId)
                                            .map((m) => (
                                                <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                                            ))}
                                    </select>
                                </div>
                            )}

                            {/* Reason */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.sod.exceptions.reasonLabel')}</label>
                                <textarea
                                    value={requestForm.reason}
                                    onChange={(e) => setRequestForm((prev) => ({ ...prev, reason: e.target.value }))}
                                    rows={3}
                                    maxLength={1000}
                                    placeholder={t('settings.sod.exceptions.reasonPlaceholder')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-400 mt-1">{requestForm.reason.trim().length}/1000</p>
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.sod.exceptions.durationLabel')}</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={90}
                                    value={requestForm.durationDays}
                                    onChange={(e) => setRequestForm((prev) => ({ ...prev, durationDays: Number(e.target.value) }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-400 mt-1">{t('settings.sod.exceptions.durationHint')}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                            <button
                                onClick={() => setRequestModalOpen(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                {t('settings.sod.exceptions.cancel')}
                            </button>
                            <button
                                onClick={handleSubmitRequest}
                                disabled={requesting || !requestForm.ruleId || requestForm.reason.trim().length < 10}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {requesting && <Loader2 className="h-4 w-4 animate-spin" />}
                                {t('settings.sod.exceptions.submitBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Decide Modal */}
            {decideTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">{t('settings.sod.exceptions.decideTitle')}</h3>
                            <button onClick={() => setDecideTarget(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4 text-sm">
                                <div className="font-medium text-gray-900">{ruleNameOf(decideTarget)}</div>
                                <div className="text-gray-600 mt-0.5">{userNameOf(decideTarget)}</div>
                                <p className="text-gray-600 mt-2 text-xs line-clamp-3">{decideTarget.reason}</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setDecideForm((prev) => ({ ...prev, decision: 'APPROVED' }))}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${decideForm.decision === 'APPROVED'
                                        ? 'border-green-500 bg-green-50 text-green-700'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    <CheckCircle className="h-4 w-4" />
                                    {t('settings.sod.exceptions.approveBtn')}
                                </button>
                                <button
                                    onClick={() => setDecideForm((prev) => ({ ...prev, decision: 'REJECTED' }))}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${decideForm.decision === 'REJECTED'
                                        ? 'border-red-500 bg-red-50 text-red-700'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    <XCircle className="h-4 w-4" />
                                    {t('settings.sod.exceptions.rejectBtn')}
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.sod.exceptions.commentsLabel')}</label>
                                <textarea
                                    value={decideForm.comments}
                                    onChange={(e) => setDecideForm((prev) => ({ ...prev, comments: e.target.value }))}
                                    rows={3}
                                    maxLength={1000}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <p className="flex items-start gap-2 text-xs text-gray-500">
                                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                                {t('settings.sod.exceptions.decideNote')}
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                            <button
                                onClick={() => setDecideTarget(null)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                {t('settings.sod.exceptions.cancel')}
                            </button>
                            <button
                                onClick={handleDecide}
                                disabled={decideSaving}
                                className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${decideForm.decision === 'APPROVED'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                {decideSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {decideForm.decision === 'APPROVED'
                                    ? t('settings.sod.exceptions.confirmApprove')
                                    : t('settings.sod.exceptions.confirmReject')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
