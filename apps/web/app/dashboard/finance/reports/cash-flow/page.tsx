'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import {
    ArrowLeft,
    Banknote,
    Download,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Minus,
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

interface CashFlowItem {
    accountId: string
    accountCode: string
    accountName: string
    debit: number
    credit: number
}

interface CashFlowSection {
    items: CashFlowItem[]
    total: number
}

interface CashFlowData {
    operating: CashFlowSection
    investing: CashFlowSection
    financing: CashFlowSection
    netChangeInCash: number
    openingCash: number
    closingCash: number
    dateFrom: string | null
    dateTo: string | null
    generatedAt: string
}

// ============================================
// CSV EXPORT
// ============================================

function exportToCsv(data: CashFlowData, t: (key: string) => string): void {
    const headers = [
        t('finance.reports.cashFlow.code'),
        t('finance.reports.cashFlow.accountName'),
        t('finance.reports.cashFlow.debit'),
        t('finance.reports.cashFlow.credit'),
        'Section',
    ]

    const rows: string[][] = []

    for (const item of data.operating.items) {
        rows.push([item.accountCode, item.accountName, String(item.debit), String(item.credit), t('finance.reports.cashFlow.operatingActivities')])
    }
    for (const item of data.investing.items) {
        rows.push([item.accountCode, item.accountName, String(item.debit), String(item.credit), t('finance.reports.cashFlow.investingActivities')])
    }
    for (const item of data.financing.items) {
        rows.push([item.accountCode, item.accountName, String(item.debit), String(item.credit), t('finance.reports.cashFlow.financingActivities')])
    }

    rows.push(['', '', '', '', ''])
    rows.push(['', t('finance.reports.cashFlow.netCashFromOperating'), '', String(data.operating.total), ''])
    rows.push(['', t('finance.reports.cashFlow.netCashFromInvesting'), '', String(data.investing.total), ''])
    rows.push(['', t('finance.reports.cashFlow.netCashFromFinancing'), '', String(data.financing.total), ''])
    rows.push(['', t('finance.reports.cashFlow.netChangeInCash'), '', String(data.netChangeInCash), ''])
    rows.push(['', t('finance.reports.cashFlow.openingCash'), '', String(data.openingCash), ''])
    rows.push(['', t('finance.reports.cashFlow.closingCash'), '', String(data.closingCash), ''])

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
    link.download = `cash-flow-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
}

// ============================================
// COMPONENTS
// ============================================

function SectionTable({ title, section, t }: { title: string; section: CashFlowSection; t: (key: string) => string }) {
    return (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
            </div>
            <div className="p-4">
                {section.items.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">—</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="py-2 px-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('finance.reports.cashFlow.code')}</th>
                                <th className="py-2 px-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('finance.reports.cashFlow.accountName')}</th>
                                <th className="py-2 px-3 text-right font-medium text-gray-500 dark:text-gray-400">{t('finance.reports.cashFlow.debit')}</th>
                                <th className="py-2 px-3 text-right font-medium text-gray-500 dark:text-gray-400">{t('finance.reports.cashFlow.credit')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {section.items.map((item) => (
                                <tr key={item.accountId} className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="py-2 px-3 text-gray-600 dark:text-gray-300 font-mono text-xs">{item.accountCode}</td>
                                    <td className="py-2 px-3 text-gray-900 dark:text-white">{item.accountName}</td>
                                    <td className="py-2 px-3 text-right text-gray-900 dark:text-white font-mono">{formatCurrency(item.debit)}</td>
                                    <td className="py-2 px-3 text-right text-gray-900 dark:text-white font-mono">{formatCurrency(item.credit)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('finance.reports.cashFlow.total')}</span>
                    <span className={`text-sm font-bold font-mono ${section.total >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        {formatCurrency(section.total)}
                    </span>
                </div>
            </div>
        </div>
    )
}

// ============================================
// PAGE
// ============================================

export default function CashFlowPage() {
    const { t } = useTranslation()
    const [data, setData] = useState<CashFlowData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/finance/reports/cash-flow')
            if (!res.ok) throw new Error(t('finance.reports.cashFlow.failedToLoad'))
            const json = await res.json()
            if (json.success && json.data) {
                setData(json.data)
            } else {
                throw new Error(json.error || t('finance.reports.cashFlow.errorOccurred'))
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t('finance.reports.cashFlow.errorOccurred'))
        } finally {
            setLoading(false)
        }
    }, [t])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
                {Array.from({ length: 3 }).map((_, i) => (
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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('finance.reports.cashFlow.title')}</h1>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <div>
                            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
                            <button onClick={fetchData} className="mt-2 text-sm text-red-600 hover:text-red-800 underline dark:text-red-400">
                                {t('finance.reports.cashFlow.retry')}
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
                            <Banknote className="h-6 w-6" />
                            {t('finance.reports.cashFlow.title')}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{dateRangeLabel}</p>
                    </div>
                </div>
                <button
                    onClick={() => exportToCsv(data, t)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                    <Download className="h-3.5 w-3.5" />
                    {t('finance.reports.cashFlow.exportCsv')}
                </button>
            </div>

            {/* Cash Flow Sections */}
            <SectionTable title={t('finance.reports.cashFlow.operatingActivities')} section={data.operating} t={t} />
            <SectionTable title={t('finance.reports.cashFlow.investingActivities')} section={data.investing} t={t} />
            <SectionTable title={t('finance.reports.cashFlow.financingActivities')} section={data.financing} t={t} />

            {/* Summary */}
            <div className="rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-6">
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('finance.reports.cashFlow.netCashFromOperating')}</span>
                        <span className={`text-sm font-bold font-mono ${data.operating.total >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                            {formatCurrency(data.operating.total)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('finance.reports.cashFlow.netCashFromInvesting')}</span>
                        <span className={`text-sm font-bold font-mono ${data.investing.total >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                            {formatCurrency(data.investing.total)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('finance.reports.cashFlow.netCashFromFinancing')}</span>
                        <span className={`text-sm font-bold font-mono ${data.financing.total >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                            {formatCurrency(data.financing.total)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-300 dark:border-gray-600">
                        <span className="text-base font-bold text-gray-900 dark:text-white">{t('finance.reports.cashFlow.netChangeInCash')}</span>
                        <span className={`text-lg font-bold font-mono ${data.netChangeInCash >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                            {data.netChangeInCash >= 0 ? <TrendingUp className="inline h-4 w-4 mr-1" /> : <TrendingDown className="inline h-4 w-4 mr-1" />}
                            {formatCurrency(data.netChangeInCash)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('finance.reports.cashFlow.openingCash')}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">{formatCurrency(data.openingCash)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-300 dark:border-gray-600">
                        <span className="text-base font-bold text-gray-900 dark:text-white">{t('finance.reports.cashFlow.closingCash')}</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white font-mono">{formatCurrency(data.closingCash)}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
                {t('finance.reports.cashFlow.generatedAt')} {new Date(data.generatedAt).toLocaleString('id-ID')}
            </p>
        </div>
    )
}
