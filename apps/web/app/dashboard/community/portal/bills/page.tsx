'use client'

import { useCallback, useEffect, useState } from 'react'
import { Banknote, UserX } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatCurrencyIDR, formatDateID } from '@/lib/export'

interface PortalBillRow {
    id: string
    billNumber: string
    period: string
    amountDue: number
    amountPaid: number
    status: string
    dueDate: string | null
    paidAt: string | null
    duesType: { code: string; name: string }
}

const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'

function billStatusBadge(t: (k: string) => string, status: string) {
    if (status === 'PAID') return { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: t('community.portal.billsStatus.paid') }
    if (status === 'PARTIAL') return { cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: t('community.portal.billsStatus.partial') }
    return { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: t('community.portal.billsStatus.unpaid') }
}

export default function CommunityPortalBillsPage() {
    const { t } = useTranslation()
    const { addToast } = useToast()

    const [rows, setRows] = useState<PortalBillRow[]>([])
    const [loading, setLoading] = useState(true)
    const [notRegistered, setNotRegistered] = useState(false)
    const [period, setPeriod] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    const fetchRows = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(page), limit: '10' })
            if (/^\d{4}-\d{2}$/.test(period)) params.set('period', period)
            const res = await fetch(`/api/community/portal/bills?${params.toString()}`)
            if (res.status === 404) {
                setNotRegistered(true)
                setRows([])
                return
            }
            if (!res.ok) throw new Error()
            const json = await res.json()
            setNotRegistered(false)
            setRows(json.data ?? [])
            setTotal(json.total ?? 0)
            setTotalPages(json.totalPages ?? 1)
        } catch {
            addToast(t('common.error.load'), 'error')
        } finally {
            setLoading(false)
        }
    }, [page, period, addToast, t])

    useEffect(() => {
        void fetchRows()
    }, [fetchRows])

    if (notRegistered) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={UserX}
                    title={t('community.portal.notRegistered')}
                    description={t('community.portal.notRegisteredDesc')}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                    <Banknote className="h-6 w-6 text-blue-600" />
                    {t('community.portal.myBills.title')}
                </h1>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{t('community.portal.readInfo')}</p>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center">
                <div className="sm:w-56">
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('community.portal.myBills.period')}
                    </label>
                    <input
                        type="month"
                        value={period}
                        onChange={(e) => { setPeriod(e.target.value); setPage(1) }}
                        className={inputClass}
                    />
                </div>
                {period && (
                    <button
                        onClick={() => { setPeriod(''); setPage(1) }}
                        className="self-end rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        {t('community.common.filterAll')}
                    </button>
                )}
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <EmptyState
                    icon={Banknote}
                    title={t('community.portal.myBills.empty')}
                    description=""
                />
            ) : (
                <>
                    {/* Mobile cards */}
                    <div className="space-y-2 md:hidden">
                        {rows.map((row) => {
                            const badge = billStatusBadge(t, row.status)
                            return (
                                <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{row.billNumber}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{row.duesType?.name}</p>
                                        </div>
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                                    </div>
                                    <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-600 dark:text-gray-300">
                                        <div><dt className="text-gray-400">{t('community.portal.myBills.period')}</dt><dd>{row.period}</dd></div>
                                        <div><dt className="text-gray-400">{t('community.portal.myBills.dueDate')}</dt><dd>{row.dueDate ? formatDateID(row.dueDate) : '—'}</dd></div>
                                        <div><dt className="text-gray-400">{t('community.portal.myBills.amountDue')}</dt><dd>{formatCurrencyIDR(row.amountDue)}</dd></div>
                                        <div><dt className="text-gray-400">{t('community.portal.myBills.amountPaid')}</dt><dd>{formatCurrencyIDR(row.amountPaid)}</dd></div>
                                    </dl>
                                </div>
                            )
                        })}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 md:block">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.portal.myBills.billNumber')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.portal.myBills.duesType')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.portal.myBills.period')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.portal.myBills.amountDue')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.portal.myBills.amountPaid')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.portal.myBills.outstanding')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.portal.myBills.status')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.portal.myBills.dueDate')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {rows.map((row) => {
                                    const badge = billStatusBadge(t, row.status)
                                    return (
                                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-gray-900 dark:text-gray-100">{row.billNumber}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.duesType?.name}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.period}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">{formatCurrencyIDR(row.amountDue)}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">{formatCurrencyIDR(row.amountPaid)}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrencyIDR(row.amountDue - row.amountPaid)}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.dueDate ? formatDateID(row.dueDate) : '—'}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                            <span>{total} data</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-600"
                                >
                                    {t('common.previous')}
                                </button>
                                <span>{page} / {totalPages}</span>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-600"
                                >
                                    {t('common.next')}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
