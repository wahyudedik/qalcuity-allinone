'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslation } from '@/lib/i18n'
import {
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Download,
    ChevronDown,
    ChevronUp,
    Inbox,
    AlertTriangle,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface AgingBucket {
    count: number
    total: number
}

interface AgingSummary {
    current: AgingBucket
    days31_60: AgingBucket
    days61_90: AgingBucket
    days90plus: AgingBucket
    total: AgingBucket
}

interface AgingDetail {
    id: string
    number: string
    contactName: string
    total: number
    paid: number
    balance: number
    referenceDate: string
    ageDays: number
    bucket: 'Current' | '31-60' | '61-90' | '90+'
}

interface AgingReportData {
    asOf: string
    accountsReceivable: {
        summary: AgingSummary
        details: AgingDetail[]
    }
    accountsPayable: {
        summary: AgingSummary
        details: AgingDetail[]
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatIDR(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
}

function getBucketKey(bucket: string): string {
    return bucket.toLowerCase().replace('+', 'plus').replace('-', '_')
}

function getBucketColor(bucket: string): string {
    const key = getBucketKey(bucket)
    if (key === 'current') return 'bg-green-50 border-green-200 text-green-800'
    if (key === '31_60') return 'bg-yellow-50 border-yellow-200 text-yellow-800'
    if (key === '61_90') return 'bg-orange-50 border-orange-200 text-orange-800'
    if (key === '90plus') return 'bg-red-50 border-red-200 text-red-800'
    return 'bg-gray-50 border-gray-200 text-gray-800'
}

function getBucketDotColor(bucket: string): string {
    const key = getBucketKey(bucket)
    if (key === 'current') return 'bg-green-500'
    if (key === '31_60') return 'bg-yellow-500'
    if (key === '61_90') return 'bg-orange-500'
    if (key === '90plus') return 'bg-red-500'
    return 'bg-gray-500'
}

function getBucketTextColor(bucket: string): string {
    const key = getBucketKey(bucket)
    if (key === 'current') return 'text-green-600'
    if (key === '31_60') return 'text-yellow-600'
    if (key === '61_90') return 'text-orange-600'
    if (key === '90plus') return 'text-red-600'
    return 'text-gray-600'
}

function exportToCsv(details: AgingDetail[], type: 'AR' | 'AP', t: (key: string) => string): void {
    const headers = [
        t('finance.reports.aging.invoiceNumber'),
        type === 'AR' ? t('finance.reports.aging.customer') : t('finance.reports.aging.vendor'),
        t('finance.reports.aging.total'),
        type === 'AR' ? t('finance.reports.aging.paid') : '',
        t('finance.reports.aging.balance'),
        t('finance.reports.aging.dueDate'),
        t('finance.reports.aging.daysOverdue'),
        t('finance.reports.aging.bucket'),
    ].filter(Boolean)

    const rows = details.map((d) => [
        d.number,
        d.contactName,
        d.total,
        type === 'AR' ? d.paid : '',
        d.balance,
        d.referenceDate,
        d.ageDays,
        d.bucket,
    ])

    const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `aging-report-${type.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AgingReportPage() {
    const { data: session } = useSession()
    const { t } = useTranslation()

    const [data, setData] = useState<AgingReportData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Tab state
    const [activeTab, setActiveTab] = useState<'receivables' | 'payables'>('receivables')

    const fetchReport = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/finance/aging-report')
            const json = await res.json()
            if (json.success) {
                setData(json.data)
            } else {
                setError(json.error || t('finance.reports.aging.fetchError'))
            }
        } catch {
            setError(t('finance.reports.aging.fetchError'))
        } finally {
            setLoading(false)
        }
    }, [t])

    useEffect(() => {
        if (session) {
            fetchReport()
        }
    }, [session, fetchReport])

    const handleExportCsv = useCallback(() => {
        if (!data) return
        if (activeTab === 'receivables') {
            exportToCsv(data.accountsReceivable.details, 'AR', t)
        } else {
            exportToCsv(data.accountsPayable.details, 'AP', t)
        }
    }, [data, activeTab, t])

    // ─── Loading State ──────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-72 rounded bg-gray-200" />
                    <div className="mt-2 h-4 w-48 rounded bg-gray-100" />
                    <div className="flex gap-2">
                        <div className="h-10 w-32 rounded bg-gray-200" />
                        <div className="h-10 w-32 rounded bg-gray-200" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-24 rounded-lg bg-gray-100" />
                        ))}
                    </div>
                    <div className="h-64 rounded-lg bg-gray-100" />
                </div>
            </div>
        )
    }

    // ─── Error State ────────────────────────────────────────────────────

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <Clock className="mb-4 h-12 w-12 text-red-400" />
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                    {t('finance.reports.aging.loadError')}
                </h3>
                <p className="mb-4 text-sm text-gray-500">{error}</p>
                <button
                    onClick={fetchReport}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    {t('common.tryAgain')}
                </button>
            </div>
        )
    }

    // ─── Empty State ────────────────────────────────────────────────────

    if (
        !data ||
        (data.accountsReceivable.details.length === 0 &&
            data.accountsPayable.details.length === 0)
    ) {
        return (
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {t('finance.reports.aging.title')}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            {t('finance.reports.aging.description')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
                    <Inbox className="mb-4 h-12 w-12 text-gray-300" />
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                        {t('finance.reports.aging.noData')}
                    </h3>
                    <p className="mb-4 max-w-md text-sm text-gray-500">
                        {t('finance.reports.aging.noDataDescription')}
                    </p>
                </div>
            </div>
        )
    }

    // ─── Helper: Render Summary Cards ────────────────────────────────────

    function renderSummaryCards(summary: AgingSummary) {
        const buckets = [
            { key: 'Current', label: t('finance.reports.aging.current'), data: summary.current },
            { key: '31-60', label: t('finance.reports.aging.days31to60'), data: summary.days31_60 },
            { key: '61-90', label: t('finance.reports.aging.days61to90'), data: summary.days61_90 },
            { key: '90+', label: t('finance.reports.aging.over90'), data: summary.days90plus },
        ]

        return (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {buckets.map((bucket) => (
                    <div
                        key={bucket.key}
                        className={`rounded-lg border p-4 ${getBucketColor(bucket.key)}`}
                    >
                        <div className="flex items-center gap-2">
                            <div
                                className={`h-2.5 w-2.5 rounded-full ${getBucketDotColor(bucket.key)}`}
                            />
                            <span className="text-xs font-medium opacity-75">
                                {bucket.label}
                            </span>
                        </div>
                        <p className="mt-2 text-lg font-bold">
                            {formatIDR(bucket.data.total)}
                        </p>
                        <p className="text-xs opacity-75">{bucket.data.count} item</p>
                    </div>
                ))}
                {/* Total */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <span className="text-xs font-medium text-gray-500">{t('finance.reports.aging.total')}</span>
                    <p className="mt-2 text-lg font-bold text-gray-900">
                        {formatIDR(summary.total.total)}
                    </p>
                    <p className="text-xs text-gray-500">
                        {summary.total.count} item
                    </p>
                </div>
            </div>
        )
    }

    // ─── Helper: Render Detail Table (Desktop) ───────────────────────────

    function renderDesktopTable(details: AgingDetail[], type: 'AR' | 'AP') {
        if (details.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
                    <Inbox className="mb-3 h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500">{t('finance.reports.aging.noData')}</p>
                </div>
            )
        }

        return (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                {type === 'AR' ? t('finance.reports.aging.invoiceNumber') : t('finance.reports.aging.billNumber')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                {type === 'AR' ? t('finance.reports.aging.customer') : t('finance.reports.aging.vendor')}
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                {t('finance.reports.aging.total')}
                            </th>
                            {type === 'AR' && (
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                    {t('finance.reports.aging.paid')}
                                </th>
                            )}
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                {t('finance.reports.aging.balance')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                {t('finance.reports.aging.dueDate')}
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                {t('finance.reports.aging.daysOverdue')}
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                {t('finance.reports.aging.bucket')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {details.map((detail) => (
                            <tr key={detail.id} className="hover:bg-gray-50">
                                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-blue-600">
                                    {detail.number}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                                    {detail.contactName}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                                    {formatIDR(detail.total)}
                                </td>
                                {type === 'AR' && (
                                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                                        {formatIDR(detail.paid)}
                                    </td>
                                )}
                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">
                                    {formatIDR(detail.balance)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                                    {formatDate(detail.referenceDate)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                                    <span className={getBucketTextColor(detail.bucket)}>
                                        {detail.ageDays}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-center">
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getBucketColor(detail.bucket)}`}
                                    >
                                        {detail.bucket}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }

    // ─── Helper: Render Detail Cards (Mobile) ────────────────────────────

    function renderMobileCards(details: AgingDetail[], type: 'AR' | 'AP') {
        if (details.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
                    <Inbox className="mb-3 h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500">{t('finance.reports.aging.noData')}</p>
                </div>
            )
        }

        return (
            <div className="space-y-3">
                {details.map((detail) => (
                    <div
                        key={detail.id}
                        className="rounded-lg border border-gray-200 bg-white p-4"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600">
                                    {detail.number}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {detail.contactName}
                                </p>
                            </div>
                            <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getBucketColor(detail.bucket)}`}
                            >
                                {detail.bucket}
                            </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <p className="text-xs text-gray-500">{t('finance.reports.aging.balance')}</p>
                                <p className="font-medium text-gray-900">
                                    {formatIDR(detail.balance)}
                                </p>
                            </div>
                            {type === 'AR' && (
                                <div>
                                    <p className="text-xs text-gray-500">{t('finance.reports.aging.paid')}</p>
                                    <p className="text-gray-700">{formatIDR(detail.paid)}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs text-gray-500">{t('finance.reports.aging.dueDate')}</p>
                                <p className="text-gray-700">
                                    {formatDate(detail.referenceDate)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{t('finance.reports.aging.daysOverdue')}</p>
                                <p className={getBucketTextColor(detail.bucket)}>
                                    {detail.ageDays} {t('finance.reports.aging.days')}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    // ─── Main Render ────────────────────────────────────────────────────

    const arData = data.accountsReceivable
    const apData = data.accountsPayable
    const currentData = activeTab === 'receivables' ? arData : apData

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {t('finance.reports.aging.title')}
                    </h1>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {t('finance.reports.aging.asOf')} {formatDate(data.asOf)}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportCsv}
                        disabled={currentData.details.length === 0}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Download className="h-4 w-4" />
                        {t('finance.reports.aging.exportCsv')}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-1" aria-label="Aging report tabs">
                    <button
                        onClick={() => setActiveTab('receivables')}
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'receivables'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            }`}
                    >
                        <ArrowUpRight className="h-4 w-4" />
                        {t('finance.reports.aging.receivables')}
                        <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                            {arData.summary.total.count}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('payables')}
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'payables'
                            ? 'border-purple-600 text-purple-600'
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            }`}
                    >
                        <ArrowDownRight className="h-4 w-4" />
                        {t('finance.reports.aging.payables')}
                        <span className="ml-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                            {apData.summary.total.count}
                        </span>
                    </button>
                </nav>
            </div>

            {/* Warning banner if 90+ exists */}
            {currentData.summary.days90plus.count > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>
                        {currentData.summary.days90plus.count} {activeTab === 'receivables' ? 'invoice' : 'PO'}{' '}
                        {t('finance.reports.aging.overdueWarning')}
                    </span>
                </div>
            )}

            {/* Summary Cards */}
            {renderSummaryCards(currentData.summary)}

            {/* Detail Table — Desktop */}
            <div className="hidden md:block">
                {renderDesktopTable(
                    currentData.details,
                    activeTab === 'receivables' ? 'AR' : 'AP'
                )}
            </div>

            {/* Detail Cards — Mobile */}
            <div className="md:hidden">
                {renderMobileCards(
                    currentData.details,
                    activeTab === 'receivables' ? 'AR' : 'AP'
                )}
            </div>
        </div>
    )
}
