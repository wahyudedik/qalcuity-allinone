'use client'

import { useCallback, useEffect, useState } from 'react'
import { Banknote, CheckCircle2, Receipt, Wand2, XCircle } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { usePermission } from '@/lib/use-permission'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrencyIDR, formatDateID } from '@/lib/export'

interface BillRow {
    id: string
    billNumber: string
    period: string
    amountDue: number
    amountPaid: number
    status: string
    dueDate: string | null
    paidAt: string | null
    notes: string | null
    member: { id: string; code: string; fullName: string } | null
    duesType: { id: string; code: string; name: string } | null
}

const currentPeriodValue = () => new Date().toISOString().slice(0, 7)

export default function CommunityBillsPage() {
    const { t } = useTranslation()
    const { addToast } = useToast()
    const { hasPermission } = usePermission()
    const canFinance = hasPermission('community:finance')

    const [rows, setRows] = useState<BillRow[]>([])
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState(currentPeriodValue())
    const [statusFilter, setStatusFilter] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    const [genOpen, setGenOpen] = useState(false)
    const [genPeriod, setGenPeriod] = useState(currentPeriodValue())
    const [generating, setGenerating] = useState(false)

    const [payTarget, setPayTarget] = useState<BillRow | null>(null)
    const [payForm, setPayForm] = useState({ amount: '', method: 'CASH', paidAt: '', notes: '' })
    const [paying, setPaying] = useState(false)

    const [voidTarget, setVoidTarget] = useState<BillRow | null>(null)
    const [voiding, setVoiding] = useState(false)

    const fetchRows = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' })
            if (period) params.set('period', period)
            if (statusFilter) params.set('status', statusFilter)
            const res = await fetch(`/api/community/bills?${params.toString()}`)
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
    }, [page, period, statusFilter])

    useEffect(() => {
        fetchRows()
    }, [fetchRows])

    useEffect(() => {
        setPage(1)
    }, [period, statusFilter])

    const handleGenerate = async () => {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(genPeriod)) {
            addToast(t('community.reports.invalidPeriod'), 'error')
            return
        }
        setGenerating(true)
        try {
            const res = await fetch('/api/community/bills/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ period: genPeriod }),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                addToast(json?.error?.message || json?.message || 'Error', 'error')
                return
            }
            const created = json?.data?.created ?? 0
            if (created > 0) {
                addToast(t('community.bills.generateForm.success'), 'success')
            } else {
                addToast(t('community.bills.generateForm.noneGenerated'), 'info')
            }
            setGenOpen(false)
            setPeriod(genPeriod)
            fetchRows()
        } catch {
            addToast('Error', 'error')
        } finally {
            setGenerating(false)
        }
    }

    const openPay = (row: BillRow) => {
        setPayTarget(row)
        setPayForm({
            amount: String(row.amountDue - row.amountPaid),
            method: 'CASH',
            paidAt: new Date().toISOString().slice(0, 10),
            notes: '',
        })
    }

    const handlePay = async () => {
        if (!payTarget) return
        const amountNum = Number(payForm.amount)
        if (!amountNum || amountNum <= 0) {
            addToast(t('community.common.requiredField'), 'error')
            return
        }
        setPaying(true)
        try {
            const payload: Record<string, unknown> = {
                amount: amountNum,
                method: payForm.method,
            }
            if (payForm.paidAt) payload.paidAt = payForm.paidAt
            if (payForm.notes.trim()) payload.notes = payForm.notes.trim()

            const res = await fetch(`/api/community/bills/${payTarget.id}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                addToast(json?.error?.message || json?.message || 'Error', 'error')
                return
            }
            addToast(t('community.bills.paymentForm.success'), 'success')
            setPayTarget(null)
            fetchRows()
        } catch {
            addToast('Error', 'error')
        } finally {
            setPaying(false)
        }
    }

    const handleVoid = async () => {
        if (!voidTarget) return
        setVoiding(true)
        try {
            const res = await fetch(`/api/community/bills/${voidTarget.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'VOID' }),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                addToast(json?.error?.message || json?.message || 'Error', 'error')
                return
            }
            addToast(t('community.bills.toast.voided'), 'success')
            setVoidTarget(null)
            fetchRows()
        } catch {
            addToast('Error', 'error')
        } finally {
            setVoiding(false)
        }
    }

    const statusBadge = (status: string) => {
        switch (status) {
            case 'PAID':
                return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            case 'PARTIAL':
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            case 'VOID':
                return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            default:
                return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }
    }

    const statusLabel = (status: string) => {
        switch (status) {
            case 'PAID':
                return t('community.bills.status.paid')
            case 'PARTIAL':
                return t('community.bills.status.partial')
            case 'VOID':
                return t('community.bills.status.void')
            default:
                return t('community.bills.status.unpaid')
        }
    }

    const inputClass =
        'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('community.bills.title')}</h1>
                {canFinance && (
                    <button
                        onClick={() => {
                            setGenPeriod(period || currentPeriodValue())
                            setGenOpen(true)
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                    >
                        <Wand2 className="h-4 w-4" />
                        {t('community.bills.generate')}
                    </button>
                )}
            </div>

            {/* Filter bar */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center">
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('community.bills.filterPeriod')}</label>
                    <input
                        type="month"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className={`${inputClass} sm:w-44`}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('community.bills.filterStatus')}</label>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputClass} sm:w-44`}>
                        <option value="">{t('community.common.filterAll')}</option>
                        <option value="UNPAID">{t('community.bills.status.unpaid')}</option>
                        <option value="PARTIAL">{t('community.bills.status.partial')}</option>
                        <option value="PAID">{t('community.bills.status.paid')}</option>
                        <option value="VOID">{t('community.bills.status.void')}</option>
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
                    icon={Receipt}
                    title={t('community.bills.empty')}
                    description={t('community.bills.emptyDesc')}
                    actionLabel={canFinance ? t('community.bills.generate') : undefined}
                    onAction={canFinance ? () => setGenOpen(true) : undefined}
                />
            ) : (
                <>
                    {/* Mobile cards */}
                    <div className="space-y-3 md:hidden">
                        {rows.map((row) => (
                            <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{row.member?.fullName ?? '-'}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{row.billNumber}</p>
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(row.status)}`}>
                                        {statusLabel(row.status)}
                                    </span>
                                </div>
                                <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                                    <p>
                                        {row.duesType?.name ?? '-'} · {row.period}
                                    </p>
                                    <p>
                                        {t('community.bills.table.amountDue')}: <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrencyIDR(row.amountDue)}</span>
                                        {' · '}
                                        {t('community.bills.table.amountPaid')}: {formatCurrencyIDR(row.amountPaid)}
                                    </p>
                                    {row.dueDate && <p>{t('community.bills.table.dueDate')}: {formatDateID(row.dueDate)}</p>}
                                </div>
                                {canFinance && (row.status === 'UNPAID' || row.status === 'PARTIAL') && (
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            onClick={() => openPay(row)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                                        >
                                            <Banknote className="h-3.5 w-3.5" /> {t('community.bills.recordPayment')}
                                        </button>
                                        {row.status === 'UNPAID' && (
                                            <button
                                                onClick={() => setVoidTarget(row)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                            >
                                                <XCircle className="h-3.5 w-3.5" /> {t('community.bills.void')}
                                            </button>
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
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.bills.table.billNumber')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.bills.table.member')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.bills.table.duesType')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.bills.table.period')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.bills.table.amountDue')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.bills.table.amountPaid')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.bills.table.status')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.bills.table.dueDate')}</th>
                                    {canFinance && (
                                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.bills.table.actions')}</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{row.billNumber}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.member?.fullName ?? '-'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.duesType?.name ?? '-'}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.period}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900 dark:text-gray-100">{formatCurrencyIDR(row.amountDue)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">{formatCurrencyIDR(row.amountPaid)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(row.status)}`}>
                                                {statusLabel(row.status)}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.dueDate ? formatDateID(row.dueDate) : '-'}</td>
                                        {canFinance && (
                                            <td className="whitespace-nowrap px-4 py-3 text-right">
                                                {(row.status === 'UNPAID' || row.status === 'PARTIAL') && (
                                                    <div className="inline-flex gap-2">
                                                        <button
                                                            onClick={() => openPay(row)}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-green-300 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                                                        >
                                                            <Banknote className="h-3.5 w-3.5" /> {t('community.bills.recordPayment')}
                                                        </button>
                                                        {row.status === 'UNPAID' && (
                                                            <button
                                                                onClick={() => setVoidTarget(row)}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                                            >
                                                                <XCircle className="h-3.5 w-3.5" /> {t('community.bills.void')}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
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

            {/* Modal Generate Massal */}
            {genOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-gray-800">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{t('community.bills.generateForm.title')}</h2>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.bills.generateForm.period')} *</label>
                            <input type="month" value={genPeriod} onChange={(e) => setGenPeriod(e.target.value)} className={inputClass} />
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setGenOpen(false)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t('community.common.cancel')}
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {generating ? t('community.common.loading') : t('community.bills.generateForm.submit')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Record Payment */}
            {payTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
                    <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 dark:bg-gray-800">
                        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{t('community.bills.paymentForm.title')}</h2>
                        <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
                            <p className="font-medium text-gray-900 dark:text-gray-100">{payTarget.member?.fullName ?? '-'} · {payTarget.billNumber}</p>
                            <p className="mt-1 text-xs">
                                {t('community.bills.table.amountDue')}: {formatCurrencyIDR(payTarget.amountDue)} ·{' '}
                                {t('community.bills.table.amountPaid')}: {formatCurrencyIDR(payTarget.amountPaid)} ·{' '}
                                {t('community.bills.table.outstanding')}: {formatCurrencyIDR(payTarget.amountDue - payTarget.amountPaid)}
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.bills.paymentForm.amount')} *</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={payForm.amount}
                                    onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.bills.paymentForm.method')}</label>
                                <select
                                    value={payForm.method}
                                    onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value }))}
                                    className={inputClass}
                                >
                                    <option value="CASH">{t('community.bills.paymentForm.methodCash')}</option>
                                    <option value="TRANSFER">{t('community.bills.paymentForm.methodTransfer')}</option>
                                    <option value="QRIS">{t('community.bills.paymentForm.methodQris')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.bills.paymentForm.paidAt')}</label>
                                <input
                                    type="date"
                                    value={payForm.paidAt}
                                    onChange={(e) => setPayForm((p) => ({ ...p, paidAt: e.target.value }))}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.bills.paymentForm.notes')}</label>
                                <textarea
                                    value={payForm.notes}
                                    onChange={(e) => setPayForm((p) => ({ ...p, notes: e.target.value }))}
                                    rows={2}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setPayTarget(null)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t('community.common.cancel')}
                            </button>
                            <button
                                onClick={handlePay}
                                disabled={paying}
                                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                {paying ? t('community.common.loading') : t('community.bills.paymentForm.submit')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!voidTarget}
                onClose={() => setVoidTarget(null)}
                onConfirm={handleVoid}
                title={t('community.bills.voidConfirm.title')}
                message={t('community.bills.voidConfirm.desc')}
                confirmText={t('community.bills.void')}
                cancelText={t('community.common.cancel')}
                variant="danger"
                isLoading={voiding}
            />
        </div>
    )
}
