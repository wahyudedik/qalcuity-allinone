'use client'

import { useCallback, useState } from 'react'
import { BarChart3, Download, FileText, PiggyBank, TrendingUp } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatCurrencyIDR, exportToCSV } from '@/lib/export'

interface DuesByTypeRow {
    duesTypeId: string
    code: string
    name: string
    billed: number
    collected: number
}

interface CashByCategoryRow {
    type: string
    category: string
    amount: number
}

interface ArrearsRow {
    member: { id: string; code: string; fullName: string; phone: string | null } | null
    outstanding: number
}

interface ReportData {
    period: string
    dues: {
        billed: number
        collected: number
        outstanding: number
        collectionRate: number
        byType: DuesByTypeRow[]
    }
    cash: {
        openingBalance: number
        income: number
        expense: number
        closingBalance: number
        byCategory: CashByCategoryRow[]
    }
    topArrears: ArrearsRow[]
}

const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'

function currentMonth(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: 'green' | 'red' | 'blue' }) {
    const accentClass =
        accent === 'green'
            ? 'text-green-600 dark:text-green-400'
            : accent === 'red'
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-900 dark:text-gray-100'
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`mt-1 text-lg font-bold ${accentClass}`}>{value}</p>
        </div>
    )
}

export default function CommunityReportsPage() {
    const { t } = useTranslation()
    const { addToast } = useToast()

    const [period, setPeriod] = useState(currentMonth())
    const [data, setData] = useState<ReportData | null>(null)
    const [loading, setLoading] = useState(false)

    const fetchReport = useCallback(async () => {
        if (!/^\d{4}-\d{2}$/.test(period)) {
            addToast(t('community.reports.invalidPeriod'), 'error')
            return
        }
        setLoading(true)
        try {
            const res = await fetch(`/api/community/reports/monthly?period=${encodeURIComponent(period)}`)
            if (!res.ok) {
                const err = await res.json().catch(() => null)
                addToast(err?.error || t('common.error.load'), 'error')
                return
            }
            const json = await res.json()
            setData(json.data)
        } catch {
            addToast(t('common.error.load'), 'error')
        } finally {
            setLoading(false)
        }
    }, [period, addToast, t])

    const handleExport = () => {
        if (!data) return
        const rows: Record<string, unknown>[] = [
            { section: t('community.reports.dues.title'), item: t('community.reports.dues.billed'), value: data.dues.billed },
            { section: t('community.reports.dues.title'), item: t('community.reports.dues.collected'), value: data.dues.collected },
            { section: t('community.reports.dues.title'), item: t('community.reports.dues.outstanding'), value: data.dues.outstanding },
            { section: t('community.reports.dues.title'), item: t('community.reports.dues.collectionRate'), value: `${data.dues.collectionRate}%` },
            ...data.dues.byType.map((r) => ({
                section: t('community.reports.dues.byType'),
                item: `${r.code} - ${r.name}`,
                value: `${t('community.reports.dues.billed')}: ${r.billed}; ${t('community.reports.dues.collected')}: ${r.collected}`,
            })),
            { section: t('community.reports.cash.title'), item: t('community.reports.cash.openingBalance'), value: data.cash.openingBalance },
            { section: t('community.reports.cash.title'), item: t('community.reports.cash.income'), value: data.cash.income },
            { section: t('community.reports.cash.title'), item: t('community.reports.cash.expense'), value: data.cash.expense },
            { section: t('community.reports.cash.title'), item: t('community.reports.cash.closingBalance'), value: data.cash.closingBalance },
            ...data.cash.byCategory.map((r) => ({
                section: t('community.reports.cash.byCategory'),
                item: `${r.type} - ${r.category}`,
                value: r.amount,
            })),
            ...data.topArrears.map((a) => ({
                section: t('community.reports.topArrears.title'),
                item: `${a.member?.code ?? ''} - ${a.member?.fullName ?? ''}`,
                value: a.outstanding,
            })),
        ]
        exportToCSV(rows, `laporan-kas-iuran-${data.period}`, {
            section: 'Bagian',
            item: 'Item',
            value: 'Nilai',
        })
        addToast(t('community.common.exportCsv'), 'info')
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                    {t('community.reports.title')}
                </h1>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-end">
                <div className="sm:w-56">
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('community.reports.periodLabel')}
                    </label>
                    <input
                        type="month"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className={inputClass}
                    />
                </div>
                <button
                    onClick={fetchReport}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? t('common.loading') : t('community.reports.generate')}
                </button>
                {data && (
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <Download className="h-4 w-4" />
                        {t('community.reports.exportCsv')}
                    </button>
                )}
            </div>

            {!data && !loading && (
                <EmptyState
                    icon={FileText}
                    title={t('community.reports.empty')}
                    description=""
                />
            )}

            {loading && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                        ))}
                    </div>
                    <div className="h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                </div>
            )}

            {data && !loading && (
                <div className="space-y-6">
                    {/* Rekap Iuran */}
                    <section className="space-y-3">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            {t('community.reports.dues.title')} — {data.period}
                        </h2>
                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                            <StatCard label={t('community.reports.dues.billed')} value={formatCurrencyIDR(data.dues.billed)} />
                            <StatCard label={t('community.reports.dues.collected')} value={formatCurrencyIDR(data.dues.collected)} accent="green" />
                            <StatCard label={t('community.reports.dues.outstanding')} value={formatCurrencyIDR(data.dues.outstanding)} accent="red" />
                            <StatCard label={t('community.reports.dues.collectionRate')} value={`${data.dues.collectionRate}%`} accent="blue" />
                        </div>
                        {data.dues.byType.length > 0 && (
                            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.duesTypes.table.name')}</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.reports.dues.billed')}</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.reports.dues.collected')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {data.dues.byType.map((row) => (
                                            <tr key={row.duesTypeId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{row.code}</span>{' '}
                                                    {row.name}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">{formatCurrencyIDR(row.billed)}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">{formatCurrencyIDR(row.collected)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Kas */}
                    <section className="space-y-3">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            <PiggyBank className="h-5 w-5 text-green-600" />
                            {t('community.reports.cash.title')}
                        </h2>
                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                            <StatCard label={t('community.reports.cash.openingBalance')} value={formatCurrencyIDR(data.cash.openingBalance)} />
                            <StatCard label={t('community.reports.cash.income')} value={formatCurrencyIDR(data.cash.income)} accent="green" />
                            <StatCard label={t('community.reports.cash.expense')} value={formatCurrencyIDR(data.cash.expense)} accent="red" />
                            <StatCard label={t('community.reports.cash.closingBalance')} value={formatCurrencyIDR(data.cash.closingBalance)} accent="blue" />
                        </div>
                        {data.cash.byCategory.length > 0 && (
                            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.cash.form.category')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.cash.form.type')}</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.cash.form.amount')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {data.cash.byCategory.map((row, idx) => (
                                            <tr key={`${row.type}-${row.category}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.category || '—'}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm">
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.type === 'INCOME' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                        {row.type === 'INCOME' ? t('community.cash.type.income') : t('community.cash.type.expense')}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">{formatCurrencyIDR(row.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Tunggakan */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {t('community.reports.topArrears.title')}
                        </h2>
                        {data.topArrears.length === 0 ? (
                            <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                                {t('community.reports.topArrears.empty')}
                            </p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.reports.topArrears.member')}</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.reports.topArrears.outstanding')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {data.topArrears.map((row) => (
                                            <tr key={row.member?.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-4 py-3 text-sm">
                                                    <span className="font-medium text-gray-900 dark:text-gray-100">{row.member?.fullName}</span>
                                                    <span className="ml-2 font-mono text-xs text-gray-500 dark:text-gray-400">{row.member?.code}</span>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-red-600 dark:text-red-400">
                                                    {formatCurrencyIDR(row.outstanding)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    )
}
