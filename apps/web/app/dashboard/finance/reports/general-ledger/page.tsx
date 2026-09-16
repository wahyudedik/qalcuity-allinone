'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import {
    ArrowLeft,
    BookOpen,
    Download,
    AlertCircle,
    Filter,
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

interface GeneralLedgerItem {
    id: string
    date: string
    entryNumber: string
    description: string
    accountCode: string
    accountName: string
    accountId: string
    debit: number
    credit: number
    runningBalance: number
}

interface AccountOption {
    id: string
    code: string
    name: string
}

interface GeneralLedgerData {
    items: GeneralLedgerItem[]
    totalDebit: number
    totalCredit: number
    accounts: AccountOption[]
    dateFrom: string | null
    dateTo: string | null
    generatedAt: string
}

// ============================================
// CSV EXPORT
// ============================================

function exportToCsv(data: GeneralLedgerData, t: (key: string) => string): void {
    const headers = [
        t('finance.reports.generalLedger.date'),
        t('finance.reports.generalLedger.entryNumber'),
        t('finance.reports.generalLedger.description'),
        t('finance.reports.generalLedger.code'),
        t('finance.reports.generalLedger.accountName'),
        t('finance.reports.generalLedger.debit'),
        t('finance.reports.generalLedger.credit'),
        t('finance.reports.generalLedger.runningBalance'),
    ]

    const rows = data.items.map((item) => [
        new Date(item.date).toLocaleDateString('id-ID'),
        item.entryNumber,
        item.description,
        item.accountCode,
        item.accountName,
        String(item.debit),
        String(item.credit),
        String(item.runningBalance),
    ])

    // Add totals row
    rows.push(['', '', '', '', t('finance.reports.generalLedger.total'), String(data.totalDebit), String(data.totalCredit), ''])

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
    link.download = `general-ledger-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
}

// ============================================
// PAGE
// ============================================

export default function GeneralLedgerPage() {
    const { t } = useTranslation()
    const [data, setData] = useState<GeneralLedgerData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filters
    const [accountId, setAccountId] = useState('')
    const [status, setStatus] = useState('')

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (accountId) params.set('accountId', accountId)
            if (status) params.set('status', status)

            const res = await fetch(`/api/finance/reports/general-ledger?${params.toString()}`)
            if (!res.ok) throw new Error(t('finance.reports.generalLedger.failedToLoad'))
            const json = await res.json()
            if (json.success && json.data) {
                setData(json.data)
            } else {
                throw new Error(json.error || t('finance.reports.generalLedger.errorOccurred'))
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t('finance.reports.generalLedger.errorOccurred'))
        } finally {
            setLoading(false)
        }
    }, [t, accountId, status])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    if (loading && !data) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
                <div className="flex gap-4">
                    <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-4 w-full bg-gray-100 rounded animate-pulse" />
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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('finance.reports.generalLedger.title')}</h1>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <div>
                            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
                            <button onClick={fetchData} className="mt-2 text-sm text-red-600 hover:text-red-800 underline dark:text-red-400">
                                {t('finance.reports.generalLedger.retry')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!data) return null

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
                            <BookOpen className="h-6 w-6" />
                            {t('finance.reports.generalLedger.title')}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('finance.reports.generalLedger.description')}</p>
                    </div>
                </div>
                <button
                    onClick={() => exportToCsv(data, t)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                    <Download className="h-3.5 w-3.5" />
                    {t('finance.reports.generalLedger.exportCsv')}
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <Filter className="h-4 w-4 text-gray-400" />
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('finance.reports.generalLedger.selectAccount')}</label>
                    <select
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="">{t('finance.reports.generalLedger.allAccounts')}</option>
                        {data.accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>{acc.code} — {acc.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('finance.reports.generalLedger.statusFilter')}</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="">{t('finance.reports.generalLedger.allStatuses')}</option>
                        <option value="DRAFT">{t('finance.reports.generalLedger.draft')}</option>
                        <option value="POSTED">{t('finance.reports.generalLedger.posted')}</option>
                        <option value="VOID">{t('finance.reports.generalLedger.void')}</option>
                    </select>
                </div>
            </div>

            {/* Ledger Table */}
            {data.items.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
                    <BookOpen className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('finance.reports.generalLedger.noData')}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('finance.reports.generalLedger.noDataDescription')}</p>
                </div>
            ) : (
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('finance.reports.generalLedger.date')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('finance.reports.generalLedger.entryNumber')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('finance.reports.generalLedger.description')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('finance.reports.generalLedger.code')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('finance.reports.generalLedger.accountName')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('finance.reports.generalLedger.debit')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('finance.reports.generalLedger.credit')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('finance.reports.generalLedger.runningBalance')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                {data.items.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                            {new Date(item.date).toLocaleDateString('id-ID')}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">
                                            {item.entryNumber}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">
                                            {item.description}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-300">
                                            {item.accountCode}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-white">
                                            {item.accountName}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-mono text-gray-900 dark:text-white">
                                            {item.debit > 0 ? formatCurrency(item.debit) : '—'}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-mono text-gray-900 dark:text-white">
                                            {item.credit > 0 ? formatCurrency(item.credit) : '—'}
                                        </td>
                                        <td className={`whitespace-nowrap px-4 py-3 text-sm text-right font-mono font-semibold ${item.runningBalance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                                            {formatCurrency(item.runningBalance)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 dark:bg-gray-800/50 border-t-2 border-gray-200 dark:border-gray-600">
                                <tr>
                                    <td colSpan={5} className="px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300">{t('finance.reports.generalLedger.total')}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-mono font-bold text-gray-900 dark:text-white">{formatCurrency(data.totalDebit)}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-mono font-bold text-gray-900 dark:text-white">{formatCurrency(data.totalCredit)}</td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                        {data.items.map((item) => (
                            <div key={item.id} className="p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-mono text-gray-500 dark:text-gray-400">{item.entryNumber}</span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(item.date).toLocaleDateString('id-ID')}</span>
                                </div>
                                <p className="text-sm text-gray-900 dark:text-white">{item.description}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="font-mono">{item.accountCode}</span>
                                    <span>—</span>
                                    <span>{item.accountName}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-300">
                                        {item.debit > 0 && <span className="text-red-600 dark:text-red-400">D: {formatCurrency(item.debit)}</span>}
                                        {item.credit > 0 && <span className="text-green-600 dark:text-green-400"> C: {formatCurrency(item.credit)}</span>}
                                    </span>
                                    <span className={`font-mono font-semibold ${item.runningBalance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                                        {formatCurrency(item.runningBalance)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer */}
            <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
                {t('finance.reports.generalLedger.generatedAt')} {new Date(data.generatedAt).toLocaleString('id-ID')}
            </p>
        </div>
    )
}
