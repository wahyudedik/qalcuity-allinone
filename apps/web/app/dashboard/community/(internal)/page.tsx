'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
    AlarmClock,
    ArrowDownRight,
    ArrowUpRight,
    Banknote,
    Receipt,
    Users,
    Users2,
    Wallet,
    Wallet2,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { formatCurrencyIDR, formatDateID } from '@/lib/export'

interface OverviewData {
    memberActive: number
    memberInactive: number
    memberTotal: number
    billsThisPeriod: {
        total: number
        paid: number
        partial: number
        unpaid: number
        amountDue: number
        amountPaid: number
    }
    cashThisMonth: {
        income: number
        expense: number
        balance: number
    }
    pendingApprovals: number
}

interface CashRow {
    id: string
    txNumber: string
    txDate: string
    type: string
    category: string | null
    amount: number
    description: string
    status: string
}

function StatCard({
    icon: Icon,
    label,
    value,
    accent,
}: {
    icon: React.ElementType
    label: string
    value: string | number
    accent?: string
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent || 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value}</p>
                </div>
            </div>
        </div>
    )
}

export default function CommunityOverviewPage() {
    const { t } = useTranslation()
    const [overview, setOverview] = useState<OverviewData | null>(null)
    const [recentCash, setRecentCash] = useState<CashRow[]>([])
    const [loading, setLoading] = useState(true)

    const fetchAll = useCallback(async () => {
        setLoading(true)
        try {
            const [ovRes, cashRes] = await Promise.all([
                fetch('/api/community/overview'),
                fetch('/api/community/cash-transactions?limit=5'),
            ])
            if (ovRes.ok) {
                const ovJson = await ovRes.json()
                setOverview(ovJson.data ?? null)
            }
            if (cashRes.ok) {
                const cashJson = await cashRes.json()
                setRecentCash(Array.isArray(cashJson.data) ? cashJson.data : [])
            }
        } catch {
            // swallow — UI shows empty states
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchAll()
    }, [fetchAll])

    if (loading && !overview) {
        return (
            <div className="space-y-6 p-6">
                <div className="h-8 w-56 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-24 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
                    ))}
                </div>
            </div>
        )
    }

    const bills = overview?.billsThisPeriod
    const cash = overview?.cashThisMonth

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {t('community.overview.title')}
                </h1>
            </div>

            {/* Kartu warga */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard icon={Users} label={t('community.overview.memberActive')} value={overview?.memberActive ?? 0} accent="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
                <StatCard icon={Users2} label={t('community.overview.memberInactive')} value={overview?.memberInactive ?? 0} accent="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" />
                <StatCard icon={Users} label={t('community.overview.memberTotal')} value={overview?.memberTotal ?? 0} />
            </div>

            {/* Kartu tagihan */}
            <div>
                <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('community.overview.billsThisPeriod')}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard icon={Receipt} label={t('community.overview.billsTotal')} value={bills?.total ?? 0} />
                    <StatCard icon={Banknote} label={t('community.overview.amountDue')} value={formatCurrencyIDR(bills?.amountDue ?? 0)} accent="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
                    <StatCard icon={Banknote} label={t('community.overview.amountPaid')} value={formatCurrencyIDR(bills?.amountPaid ?? 0)} accent="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
                    <StatCard icon={Receipt} label={`${t('community.overview.billsPaid')} / ${t('community.overview.billsUnpaid')}`} value={`${bills?.paid ?? 0} / ${bills?.unpaid ?? 0}`} accent="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" />
                </div>
            </div>

            {/* Kartu kas + approval */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={ArrowUpRight} label={t('community.overview.income')} value={formatCurrencyIDR(cash?.income ?? 0)} accent="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
                <StatCard icon={ArrowDownRight} label={t('community.overview.expense')} value={formatCurrencyIDR(cash?.expense ?? 0)} accent="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
                <StatCard icon={Wallet} label={t('community.overview.balance')} value={formatCurrencyIDR(cash?.balance ?? 0)} accent="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
                <StatCard icon={AlarmClock} label={t('community.overview.pendingApprovals')} value={overview?.pendingApprovals ?? 0} accent="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
            </div>

            {/* Kas terbaru */}
            <div>
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {t('community.overview.recentCash')}
                    </h2>
                    <Link
                        href="/dashboard/community/cash"
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                        {t('community.layout.tabs.cash')}
                    </Link>
                </div>
                {recentCash.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        {t('community.overview.empty')}
                    </div>
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="space-y-3 md:hidden">
                            {recentCash.map((row) => (
                                <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.txNumber}</span>
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${row.type === 'INCOME'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}
                                        >
                                            {row.type === 'INCOME'
                                                ? t('community.cash.type.income')
                                                : t('community.cash.type.expense')}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{row.description}</p>
                                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                        <span>{formatDateID(row.txDate)}</span>
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                                            {formatCurrencyIDR(row.amount)}
                                        </span>
                                    </div>
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
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.cash.table.description')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.cash.table.status')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.cash.table.amount')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {recentCash.map((row) => (
                                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{row.txNumber}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDateID(row.txDate)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.description}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${row.status === 'APPROVED'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : row.status === 'PENDING'
                                                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}
                                                >
                                                    {row.status === 'APPROVED'
                                                        ? t('community.cash.status.approved')
                                                        : row.status === 'PENDING'
                                                            ? t('community.cash.status.pending')
                                                            : t('community.cash.status.rejected')}
                                                </span>
                                            </td>
                                            <td className={`whitespace-nowrap px-4 py-3 text-right text-sm font-semibold ${row.type === 'INCOME' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {row.type === 'INCOME' ? '+' : '-'} {formatCurrencyIDR(row.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
