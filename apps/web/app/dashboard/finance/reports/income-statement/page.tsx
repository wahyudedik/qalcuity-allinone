'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import {
    ArrowLeft,
    TrendingUp,
    Download,
    Loader2,
    AlertCircle,
} from 'lucide-react'

interface IncomeStatementAccount {
    accountId: string
    accountCode: string
    accountName: string
    amount: number
}

interface IncomeStatementSection {
    label: string
    accounts: IncomeStatementAccount[]
    total: number
}

interface IncomeStatementData {
    revenue: IncomeStatementSection
    cogs: IncomeStatementSection
    grossProfit: number
    operatingExpenses: IncomeStatementSection
    operatingIncome: number
    nonOperatingIncome: IncomeStatementSection
    nonOperatingExpenses: IncomeStatementSection
    netIncome: number
    dateFrom: string | null
    dateTo: string | null
    generatedAt: string
}

function exportToCsv(data: IncomeStatementData, t: (key: string) => string): void {
    const headers = [
        t('finance.reports.incomeStatement.code'),
        t('finance.reports.incomeStatement.accountName'),
        t('finance.reports.incomeStatement.amount'),
        'Section',
    ]

    const rows: string[][] = []

    // Revenue
    for (const acc of data.revenue.accounts) {
        rows.push([acc.accountCode, acc.accountName, String(acc.amount), data.revenue.label])
    }
    // COGS
    for (const acc of data.cogs.accounts) {
        rows.push([acc.accountCode, acc.accountName, String(acc.amount), data.cogs.label])
    }
    // Operating Expenses
    for (const acc of data.operatingExpenses.accounts) {
        rows.push([acc.accountCode, acc.accountName, String(acc.amount), data.operatingExpenses.label])
    }
    // Non-Operating Income
    for (const acc of data.nonOperatingIncome.accounts) {
        rows.push([acc.accountCode, acc.accountName, String(acc.amount), data.nonOperatingIncome.label])
    }
    // Non-Operating Expenses
    for (const acc of data.nonOperatingExpenses.accounts) {
        rows.push([acc.accountCode, acc.accountName, String(acc.amount), data.nonOperatingExpenses.label])
    }

    // Summary rows
    rows.push(['', '', '', ''])
    rows.push(['', t('finance.reports.incomeStatement.grossProfit'), String(data.grossProfit), ''])
    rows.push(['', t('finance.reports.incomeStatement.operatingIncome'), String(data.operatingIncome), ''])
    rows.push(['', t('finance.reports.incomeStatement.netIncome'), String(data.netIncome), ''])

    const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
            row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `income-statement-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
}

function AccountTable({ accounts, t }: { accounts: IncomeStatementAccount[]; t: (key: string) => string }) {
    if (accounts.length === 0) {
        return (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
                {t('finance.reports.incomeStatement.noAccounts')}
            </p>
        )
    }
    return (
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 px-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('finance.reports.incomeStatement.code')}</th>
                    <th className="py-2 px-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('finance.reports.incomeStatement.accountName')}</th>
                    <th className="py-2 px-3 text-right font-medium text-gray-500 dark:text-gray-400">{t('finance.reports.incomeStatement.amount')}</th>
                </tr>
            </thead>
            <tbody>
                {accounts.map((acc) => (
                    <tr key={acc.accountId} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 px-3 text-gray-600 dark:text-gray-300 font-mono text-xs">{acc.accountCode}</td>
                        <td className="py-2 px-3 text-gray-900 dark:text-white">{acc.accountName}</td>
                        <td className="py-2 px-3 text-right text-gray-900 dark:text-white font-mono">{formatCurrency(acc.amount)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

function SummaryRow({ label, value, bold = false, positive, bgColor }: { label: string; value: number; bold?: boolean; positive?: boolean; bgColor?: string }) {
    const textColor = positive === true
        ? 'text-green-800 dark:text-green-300'
        : positive === false
            ? 'text-red-800 dark:text-red-300'
            : 'text-gray-900 dark:text-white'

    return (
        <div className={`flex justify-between items-center ${bgColor ? `rounded-lg ${bgColor} px-4 py-3` : 'px-4 py-2'}`}>
            <span className={`text-sm ${bold ? 'font-bold' : 'font-medium'} ${textColor}`}>{label}</span>
            <span className={`text-sm ${bold ? 'font-bold' : 'font-semibold'} ${textColor} font-mono`}>{formatCurrency(value)}</span>
        </div>
    )
}

export default function IncomeStatementPage() {
    const { t } = useTranslation()
    const [data, setData] = useState<IncomeStatementData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/finance/reports/income-statement')
                if (!res.ok) throw new Error(t('finance.reports.incomeStatement.failedToLoad'))
                const json = await res.json()
                if (json.success && json.data) {
                    setData(json.data)
                } else {
                    throw new Error(json.error || t('finance.reports.incomeStatement.errorOccurred'))
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : t('finance.reports.incomeStatement.errorOccurred'))
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [t])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, j) => (
                                <div key={j} className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/finance/reports" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('finance.reports.incomeStatement.title')}</h1>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <div>
                            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
                            <button onClick={() => window.location.reload()} className="mt-2 text-sm text-red-600 hover:text-red-800 underline dark:text-red-400">
                                {t('finance.reports.incomeStatement.retry')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!data) return null

    const dateRangeLabel = data.dateFrom && data.dateTo
        ? `${new Date(data.dateFrom).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} — ${new Date(data.dateTo).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
        : t('finance.reports.incomeStatement.yearToDate')

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/finance/reports" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <TrendingUp className="h-6 w-6" />
                            {t('finance.reports.incomeStatement.title')}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{dateRangeLabel}</p>
                    </div>
                </div>
                <button
                    onClick={() => data && exportToCsv(data, t)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                    <Download className="h-3.5 w-3.5" />
                    {t('finance.reports.trialBalance.exportCsv')}
                </button>
            </div>

            {/* Income Statement Content */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
                {/* Revenue */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{data.revenue.label}</h3>
                    </div>
                    <div className="p-4">
                        <AccountTable accounts={data.revenue.accounts} t={t} />
                    </div>
                </div>

                {/* COGS */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{data.cogs.label}</h3>
                    </div>
                    <div className="p-4">
                        <AccountTable accounts={data.cogs.accounts} t={t} />
                    </div>
                </div>

                {/* Gross Profit */}
                <SummaryRow label={t('finance.reports.incomeStatement.grossProfit')} value={data.grossProfit} bold bgColor="bg-green-50 dark:bg-green-900/20" />

                {/* Operating Expenses */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{data.operatingExpenses.label}</h3>
                    </div>
                    <div className="p-4">
                        <AccountTable accounts={data.operatingExpenses.accounts} t={t} />
                    </div>
                </div>

                {/* Operating Income */}
                <SummaryRow label={t('finance.reports.incomeStatement.operatingIncome')} value={data.operatingIncome} bold bgColor="bg-blue-50 dark:bg-blue-900/20" />

                {/* Non-Operating Income */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{data.nonOperatingIncome.label}</h3>
                    </div>
                    <div className="p-4">
                        <AccountTable accounts={data.nonOperatingIncome.accounts} t={t} />
                    </div>
                </div>

                {/* Non-Operating Expenses */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{data.nonOperatingExpenses.label}</h3>
                    </div>
                    <div className="p-4">
                        <AccountTable accounts={data.nonOperatingExpenses.accounts} t={t} />
                    </div>
                </div>

                {/* Net Income */}
                <div className="border-t-2 border-gray-300 dark:border-gray-600">
                    <SummaryRow
                        label={t('finance.reports.incomeStatement.netIncome')}
                        value={data.netIncome}
                        bold
                        positive={data.netIncome >= 0}
                        bgColor={data.netIncome >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}
                    />
                </div>
            </div>

            {/* Footer */}
            <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
                {t('finance.reports.incomeStatement.generatedAt')} {new Date(data.generatedAt).toLocaleString('id-ID')}
            </p>
        </div>
    )
}
