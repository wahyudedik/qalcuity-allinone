'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
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

function getBucketColor(bucket: string): string {
    switch (bucket) {
        case 'current':
            return 'bg-green-50 border-green-200 text-green-800'
        case '31-60':
            return 'bg-yellow-50 border-yellow-200 text-yellow-800'
        case '61-90':
            return 'bg-orange-50 border-orange-200 text-orange-800'
        case '90+':
            return 'bg-red-50 border-red-200 text-red-800'
        default:
            return 'bg-gray-50 border-gray-200 text-gray-800'
    }
}

function getBucketDotColor(bucket: string): string {
    switch (bucket) {
        case 'current':
            return 'bg-green-500'
        case '31-60':
            return 'bg-yellow-500'
        case '61-90':
            return 'bg-orange-500'
        case '90+':
            return 'bg-red-500'
        default:
            return 'bg-gray-500'
    }
}

function getBucketTextColor(bucket: string): string {
    switch (bucket) {
        case 'current':
            return 'text-green-600'
        case '31-60':
            return 'text-yellow-600'
        case '61-90':
            return 'text-orange-600'
        case '90+':
            return 'text-red-600'
        default:
            return 'text-gray-600'
    }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AgingReportPage() {
    const { data: session } = useSession()

    const [data, setData] = useState<AgingReportData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Collapsible sections
    const [showAR, setShowAR] = useState(true)
    const [showAP, setShowAP] = useState(true)

    const fetchReport = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/finance/aging-report')
            const json = await res.json()
            if (json.success) {
                setData(json.data)
            } else {
                setError(json.error || 'Gagal memuat laporan umur piutang & utang')
            }
        } catch {
            setError('Gagal memuat laporan umur piutang & utang')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (session) {
            fetchReport()
        }
    }, [session, fetchReport])

    const handlePrint = () => {
        window.print()
    }

    // ─── Loading State ──────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-72 rounded bg-gray-200" />
                    <div className="mt-2 h-4 w-48 rounded bg-gray-100" />
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-24 rounded-lg bg-gray-100" />
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-24 rounded-lg bg-gray-100" />
                        ))}
                    </div>
                    <div className="h-64 rounded-lg bg-gray-100" />
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
                    Gagal Memuat Laporan
                </h3>
                <p className="mb-4 text-sm text-gray-500">{error}</p>
                <button
                    onClick={fetchReport}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    Coba Lagi
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
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Laporan Umur Piutang & Utang
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Ringkasan umur piutang (AR) dan utang (AP) berdasarkan jatuh tempo
                        </p>
                    </div>
                </div>

                {/* Empty State */}
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
                    <Inbox className="mb-4 h-12 w-12 text-gray-300" />
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                        Tidak Ada Data Aging
                    </h3>
                    <p className="mb-4 max-w-md text-sm text-gray-500">
                        Belum ada Invoice yang belum lunas atau Purchase Order yang belum
                        dibayar. Data aging akan muncul setelah ada transaksi dengan status
                        yang sesuai.
                    </p>
                    <div className="rounded-lg bg-gray-50 p-4 text-left text-sm text-gray-600">
                        <p className="font-medium text-gray-700">Catatan:</p>
                        <ul className="mt-2 space-y-1">
                            <li>
                                • Piutang (AR): Invoice dengan status{' '}
                                <span className="font-medium">Dikirim</span> atau{' '}
                                <span className="font-medium">Jatuh Tempo</span>
                            </li>
                            <li>
                                • Utang (AP): Purchase Order dengan status{' '}
                                <span className="font-medium">Dikirim</span> atau{' '}
                                <span className="font-medium">Diterima</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        )
    }

    // ─── Helper: Render Summary Cards ────────────────────────────────────

    function renderSummaryCards(
        summary: AgingSummary,
        type: 'AR' | 'AP'
    ) {
        const buckets = [
            { key: 'current', label: 'Current (0-30)', data: summary.current },
            { key: '31-60', label: '31-60 Hari', data: summary.days31_60 },
            { key: '61-90', label: '61-90 Hari', data: summary.days61_90 },
            { key: '90+', label: '90+ Hari', data: summary.days90plus },
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
                    <span className="text-xs font-medium text-gray-500">Total</span>
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
                    <p className="text-sm text-gray-500">Tidak ada data</p>
                </div>
            )
        }

        return (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Nomor
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                {type === 'AR' ? 'Customer' : 'Supplier'}
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                Total
                            </th>
                            {type === 'AR' && (
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Dibayar
                                </th>
                            )}
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                Saldo
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Tgl Jatuh Tempo
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                Umur (Hari)
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                Bucket
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
                    <p className="text-sm text-gray-500">Tidak ada data</p>
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
                                <p className="text-xs text-gray-500">Saldo</p>
                                <p className="font-medium text-gray-900">
                                    {formatIDR(detail.balance)}
                                </p>
                            </div>
                            {type === 'AR' && (
                                <div>
                                    <p className="text-xs text-gray-500">Dibayar</p>
                                    <p className="text-gray-700">{formatIDR(detail.paid)}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs text-gray-500">Jatuh Tempo</p>
                                <p className="text-gray-700">
                                    {formatDate(detail.referenceDate)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Umur</p>
                                <p className={getBucketTextColor(detail.bucket)}>
                                    {detail.ageDays} hari
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    // ─── Main Render ────────────────────────────────────────────────────

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Laporan Umur Piutang & Utang
                    </h1>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        Per per: {formatDate(data.asOf)}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrint}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <Download className="h-4 w-4" />
                        Cetak / Export
                    </button>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                ACCOUNTS RECEIVABLE (AR)
            ═══════════════════════════════════════════════════════════════ */}
            <div className="rounded-xl border border-gray-200 bg-white">
                {/* Section Header */}
                <button
                    onClick={() => setShowAR(!showAR)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                            <ArrowUpRight className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Piutang (Accounts Receivable)
                            </h2>
                            <p className="text-sm text-gray-500">
                                {data.accountsReceivable.summary.total.count} invoice
                                belum lunas — {formatIDR(data.accountsReceivable.summary.total.total)}
                            </p>
                        </div>
                    </div>
                    {showAR ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                </button>

                {showAR && (
                    <div className="space-y-4 border-t border-gray-100 px-6 pb-6 pt-4">
                        {/* Warning banner if 90+ exists */}
                        {data.accountsReceivable.summary.days90plus.count > 0 && (
                            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                <span>
                                    {data.accountsReceivable.summary.days90plus.count} invoice
                                    telah melewati 90 hari — perhatian segera diperlukan.
                                </span>
                            </div>
                        )}

                        {/* Summary Cards */}
                        {renderSummaryCards(data.accountsReceivable.summary, 'AR')}

                        {/* Detail Table — Desktop */}
                        <div className="hidden md:block">
                            {renderDesktopTable(data.accountsReceivable.details, 'AR')}
                        </div>

                        {/* Detail Cards — Mobile */}
                        <div className="md:hidden">
                            {renderMobileCards(data.accountsReceivable.details, 'AR')}
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                ACCOUNTS PAYABLE (AP)
            ═══════════════════════════════════════════════════════════════ */}
            <div className="rounded-xl border border-gray-200 bg-white">
                {/* Section Header */}
                <button
                    onClick={() => setShowAP(!showAP)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                            <ArrowDownRight className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Utang (Accounts Payable)
                            </h2>
                            <p className="text-sm text-gray-500">
                                {data.accountsPayable.summary.total.count} PO belum
                                dibayar —{' '}
                                {formatIDR(data.accountsPayable.summary.total.total)}
                            </p>
                        </div>
                    </div>
                    {showAP ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                </button>

                {showAP && (
                    <div className="space-y-4 border-t border-gray-100 px-6 pb-6 pt-4">
                        {/* Warning banner if 90+ exists */}
                        {data.accountsPayable.summary.days90plus.count > 0 && (
                            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                <span>
                                    {data.accountsPayable.summary.days90plus.count} PO
                                    telah melewati 90 hari — segera lakukan pembayaran.
                                </span>
                            </div>
                        )}

                        {/* Summary Cards */}
                        {renderSummaryCards(data.accountsPayable.summary, 'AP')}

                        {/* Detail Table — Desktop */}
                        <div className="hidden md:block">
                            {renderDesktopTable(data.accountsPayable.details, 'AP')}
                        </div>

                        {/* Detail Cards — Mobile */}
                        <div className="md:hidden">
                            {renderMobileCards(data.accountsPayable.details, 'AP')}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
