'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ArrowDownRight, ArrowUpRight, Check, Pencil, Plus, Trash2, Wallet, X } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { usePermission } from '@/lib/use-permission'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrencyIDR, formatDateID } from '@/lib/export'

interface CashRow {
    id: string
    txNumber: string
    txDate: string
    type: string
    category: string | null
    amount: number
    description: string
    status: string
    eventId: string | null
    createdBy: string | null
    rejectReason: string | null
}

interface EventOption {
    id: string
    eventNumber: string
    title: string
}

const EMPTY_FORM = {
    type: 'INCOME',
    category: '',
    amount: '',
    description: '',
    txDate: '',
    eventId: '',
}

type FormState = typeof EMPTY_FORM

export default function CommunityCashPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const { addToast } = useToast()
    const { hasPermission } = usePermission()
    const canFinance = hasPermission('community:finance')
    const canApprove = hasPermission('community:approve')

    const currentUserId = (session?.user as { id?: string } | undefined)?.id ?? null

    const [rows, setRows] = useState<CashRow[]>([])
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<CashRow | null>(null)
    const [form, setForm] = useState<FormState>(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<CashRow | null>(null)
    const [deleting, setDeleting] = useState(false)

    const [approveTarget, setApproveTarget] = useState<CashRow | null>(null)
    const [approving, setApproving] = useState(false)
    const [rejectTarget, setRejectTarget] = useState<CashRow | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [rejecting, setRejecting] = useState(false)

    const [eventOptions, setEventOptions] = useState<EventOption[]>([])

    const fetchRows = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' })
            if (period) params.set('period', period)
            if (typeFilter) params.set('type', typeFilter)
            if (statusFilter) params.set('status', statusFilter)
            const res = await fetch(`/api/community/cash-transactions?${params.toString()}`)
            const json = await res.json().catch(() => ({}))
            if (res.ok) {
                setRows(Array.isArray(json.data) ? json.data : [])
                setTotalPages(json.totalPages ?? 1)
                setTotal(json.total ?? 0)
            }
        } catch {
            // ignore
        } finally {
            setLoading(false)
        }
    }, [page, period, typeFilter, statusFilter])

    useEffect(() => {
        fetchRows()
    }, [fetchRows])

    useEffect(() => {
        setPage(1)
    }, [period, typeFilter, statusFilter])

    // Fetch daftar kegiatan untuk select "Kegiatan terkait" (opsional).
    const fetchEventOptions = useCallback(async () => {
        try {
            const res = await fetch('/api/community/events?limit=100')
            if (!res.ok) return
            const json = await res.json().catch(() => ({}))
            if (Array.isArray(json.data)) setEventOptions(json.data)
        } catch {
            // ignore — select tetap kosong
        }
    }, [])

    const openCreate = () => {
        setEditing(null)
        setForm({ ...EMPTY_FORM, txDate: new Date().toISOString().slice(0, 10) })
        setModalOpen(true)
        void fetchEventOptions()
    }

    const openEdit = (row: CashRow) => {
        setEditing(row)
        setForm({
            type: row.type,
            category: row.category ?? '',
            amount: String(row.amount),
            description: row.description,
            txDate: row.txDate ? new Date(row.txDate).toISOString().slice(0, 10) : '',
            eventId: row.eventId ?? '',
        })
        setModalOpen(true)
        void fetchEventOptions()
    }

    const setField = (key: keyof FormState, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    const handleSave = async () => {
        const amountNum = Number(form.amount)
        if (!amountNum || amountNum <= 0) {
            addToast(t('community.common.requiredField'), 'error')
            return
        }
        if (!form.description.trim()) {
            addToast(t('community.common.requiredField'), 'error')
            return
        }
        setSaving(true)
        try {
            const payload: Record<string, unknown> = {
                type: form.type,
                amount: amountNum,
                description: form.description.trim(),
            }
            if (form.category.trim()) payload.category = form.category.trim()
            if (form.txDate) payload.txDate = form.txDate
            // POST: null aman (absent = null di backend). PUT: null = unlink eventId.
            payload.eventId = form.eventId || null

            const res = await fetch(
                editing ? `/api/community/cash-transactions/${editing.id}` : '/api/community/cash-transactions',
                {
                    method: editing ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }
            )
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                addToast(json?.error?.message || json?.message || 'Error', 'error')
                return
            }
            addToast(editing ? t('community.cash.toast.updated') : t('community.cash.toast.created'), 'success')
            setModalOpen(false)
            fetchRows()
        } catch {
            addToast('Error', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/community/cash-transactions/${deleteTarget.id}`, { method: 'DELETE' })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                addToast(json?.error?.message || json?.message || 'Error', 'error')
                return
            }
            addToast(t('community.cash.toast.deleted'), 'success')
            setDeleteTarget(null)
            fetchRows()
        } catch {
            addToast('Error', 'error')
        } finally {
            setDeleting(false)
        }
    }

    const handleApprove = async () => {
        if (!approveTarget) return
        setApproving(true)
        try {
            const res = await fetch(`/api/community/cash-transactions/${approveTarget.id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                addToast(json?.error?.message || json?.message || 'Error', 'error')
                return
            }
            addToast(t('community.cash.toast.approved'), 'success')
            setApproveTarget(null)
            fetchRows()
        } catch {
            addToast('Error', 'error')
        } finally {
            setApproving(false)
        }
    }

    const handleReject = async () => {
        if (!rejectTarget) return
        if (rejectReason.trim().length < 3) {
            addToast(t('community.common.requiredField'), 'error')
            return
        }
        setRejecting(true)
        try {
            const res = await fetch(`/api/community/cash-transactions/${rejectTarget.id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: rejectReason.trim() }),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                addToast(json?.error?.message || json?.message || 'Error', 'error')
                return
            }
            addToast(t('community.cash.rejectForm.success'), 'success')
            setRejectTarget(null)
            setRejectReason('')
            fetchRows()
        } catch {
            addToast('Error', 'error')
        } finally {
            setRejecting(false)
        }
    }

    const statusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            case 'REJECTED':
                return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            default:
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        }
    }

    const statusLabel = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return t('community.cash.status.approved')
            case 'REJECTED':
                return t('community.cash.status.rejected')
            default:
                return t('community.cash.status.pending')
        }
    }

    const typeLabel = (type: string) =>
        type === 'INCOME' ? t('community.cash.type.income') : t('community.cash.type.expense')

    const pendingCount = useMemo(() => rows.filter((r) => r.status === 'PENDING').length, [rows])

    const inputClass =
        'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('community.cash.title')}</h1>
                {canFinance && (
                    <button
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        {t('community.cash.add')}
                    </button>
                )}
            </div>

            {canApprove && pendingCount > 0 && (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                    {pendingCount} {t('community.cash.pendingBadge')}
                </div>
            )}

            {/* Filter bar */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-end">
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('community.common.period')}</label>
                    <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className={`${inputClass} sm:w-44`} />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('community.cash.filterType')}</label>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={`${inputClass} sm:w-40`}>
                        <option value="">{t('community.common.filterAll')}</option>
                        <option value="INCOME">{t('community.cash.type.income')}</option>
                        <option value="EXPENSE">{t('community.cash.type.expense')}</option>
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('community.cash.filterStatus')}</label>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputClass} sm:w-40`}>
                        <option value="">{t('community.common.filterAll')}</option>
                        <option value="PENDING">{t('community.cash.status.pending')}</option>
                        <option value="APPROVED">{t('community.cash.status.approved')}</option>
                        <option value="REJECTED">{t('community.cash.status.rejected')}</option>
                    </select>
                </div>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">{total} data</p>

            {loading ? (
                <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-20 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <EmptyState
                    icon={Wallet}
                    title={t('community.cash.empty')}
                    description={t('community.cash.emptyDesc')}
                    actionLabel={canFinance ? t('community.cash.add') : undefined}
                    onAction={canFinance ? openCreate : undefined}
                />
            ) : (
                <>
                    {/* Mobile cards */}
                    <div className="space-y-3 md:hidden">
                        {rows.map((row) => (
                            <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${row.type === 'INCOME'
                                                ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                                                : 'bg-red-100 text-red-600 dark:bg-red-900/30'
                                                }`}
                                        >
                                            {row.type === 'INCOME' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                        </span>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                {row.type === 'INCOME' ? '+' : '-'}
                                                {formatCurrencyIDR(row.amount)}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{row.txNumber}</p>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(row.status)}`}>
                                        {statusLabel(row.status)}
                                    </span>
                                </div>
                                <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                                    <p>{row.description}</p>
                                    <p>
                                        {formatDateID(row.txDate)}
                                        {row.category ? ` · ${row.category}` : ''}
                                    </p>
                                    {row.status === 'REJECTED' && row.rejectReason && (
                                        <p className="text-red-600 dark:text-red-400">{row.rejectReason}</p>
                                    )}
                                </div>
                                {(canApprove || canFinance) && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {canApprove && row.status === 'PENDING' && currentUserId !== row.createdBy && (
                                            <>
                                                <button
                                                    onClick={() => setApproveTarget(row)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                                                >
                                                    <Check className="h-3.5 w-3.5" /> {t('community.cash.approve')}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setRejectTarget(row)
                                                        setRejectReason('')
                                                    }}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                                >
                                                    <X className="h-3.5 w-3.5" /> {t('community.cash.reject')}
                                                </button>
                                            </>
                                        )}
                                        {canFinance && row.status === 'PENDING' && (
                                            <>
                                                <button
                                                    onClick={() => openEdit(row)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" /> {t('community.cash.edit')}
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(row)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" /> {t('common.delete')}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 md:block">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.cash.table.txNumber')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.cash.table.txDate')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.cash.table.type')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.cash.table.category')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.cash.table.amount')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.cash.table.description')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.cash.table.status')}</th>
                                    {(canApprove || canFinance) && (
                                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.cash.table.actions')}</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{row.txNumber}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDateID(row.txDate)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                                            <span
                                                className={`inline-flex items-center gap-1 text-xs font-medium ${row.type === 'INCOME' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                                    }`}
                                            >
                                                {row.type === 'INCOME' ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                                                {typeLabel(row.type)}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.category || '-'}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrencyIDR(row.amount)}</td>
                                        <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.description}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(row.status)}`}>
                                                {statusLabel(row.status)}
                                            </span>
                                            {row.status === 'REJECTED' && row.rejectReason && (
                                                <p className="mt-1 max-w-[200px] truncate text-xs text-red-600 dark:text-red-400" title={row.rejectReason}>
                                                    {row.rejectReason}
                                                </p>
                                            )}
                                        </td>
                                        {(canApprove || canFinance) && (
                                            <td className="whitespace-nowrap px-4 py-3 text-right">
                                                <div className="inline-flex gap-1.5">
                                                    {canApprove && row.status === 'PENDING' && currentUserId !== row.createdBy && (
                                                        <>
                                                            <button
                                                                onClick={() => setApproveTarget(row)}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-green-300 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                                                            >
                                                                <Check className="h-3.5 w-3.5" /> {t('community.cash.approve')}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setRejectTarget(row)
                                                                    setRejectReason('')
                                                                }}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                                            >
                                                                <X className="h-3.5 w-3.5" /> {t('community.cash.reject')}
                                                            </button>
                                                        </>
                                                    )}
                                                    {canFinance && row.status === 'PENDING' && (
                                                        <>
                                                            <button
                                                                onClick={() => openEdit(row)}
                                                                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700"
                                                                title={t('community.cash.edit')}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteTarget(row)}
                                                                className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                                                title={t('common.delete')}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Halaman {page} / {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600"
                                >
                                    ←
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600"
                                >
                                    →
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal create/edit */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
                    <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 dark:bg-gray-800">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {editing ? t('community.cash.edit') : t('community.cash.add')}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.cash.form.type')} *</label>
                                <select value={form.type} onChange={(e) => setField('type', e.target.value)} className={inputClass}>
                                    <option value="INCOME">{t('community.cash.type.income')}</option>
                                    <option value="EXPENSE">{t('community.cash.type.expense')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.cash.form.amount')} *</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={form.amount}
                                    onChange={(e) => setField('amount', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.cash.form.description')} *</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setField('description', e.target.value)}
                                    rows={2}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.cash.form.category')}</label>
                                <input
                                    type="text"
                                    value={form.category}
                                    onChange={(e) => setField('category', e.target.value)}
                                    placeholder={t('community.cash.form.categoryPlaceholder')}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.cash.form.txDate')} *</label>
                                <input type="date" value={form.txDate} onChange={(e) => setField('txDate', e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.cash.form.event')}</label>
                                <select value={form.eventId} onChange={(e) => setField('eventId', e.target.value)} className={inputClass}>
                                    <option value="">{t('community.cash.form.eventNone')}</option>
                                    {eventOptions.map((ev) => (
                                        <option key={ev.id} value={ev.id}>
                                            {ev.eventNumber} — {ev.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {!editing && (
                                <p className="rounded-lg bg-yellow-50 p-2 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                                    {t('community.cash.pendingBadge')}
                                </p>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t('community.common.cancel')}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? t('community.common.loading') : t('community.cash.form.submit')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Reject */}
            {rejectTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-gray-800">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{t('community.cash.rejectForm.title')}</h2>
                        <div className="mb-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
                            <p className="font-medium text-gray-900 dark:text-gray-100">{rejectTarget.txNumber}</p>
                            <p className="text-xs">
                                {formatCurrencyIDR(rejectTarget.amount)} · {rejectTarget.description}
                            </p>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.cash.rejectForm.reason')} *</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={3}
                                className={inputClass}
                            />
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setRejectTarget(null)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t('community.common.cancel')}
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={rejecting}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {rejecting ? t('community.common.loading') : t('community.cash.rejectForm.submit')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!approveTarget}
                onClose={() => setApproveTarget(null)}
                onConfirm={handleApprove}
                title={t('community.cash.approveConfirm.title')}
                message={t('community.cash.approveConfirm.desc')}
                confirmText={t('community.cash.approve')}
                cancelText={t('community.common.cancel')}
                variant="info"
                isLoading={approving}
            />

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title={t('community.common.confirmDeleteTitle')}
                message={t('community.common.confirmDeleteDesc')}
                confirmText={t('common.delete')}
                cancelText={t('community.common.cancel')}
                variant="danger"
                isLoading={deleting}
            />
        </div>
    )
}
