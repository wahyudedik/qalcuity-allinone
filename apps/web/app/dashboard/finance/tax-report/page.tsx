'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    Calculator,
    Receipt,
    Calendar,
    Download,
    ChevronDown,
    ChevronUp,
    Inbox,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface InvoiceDetail {
    id: string
    number: string
    date: string
    contactName: string
    subtotal: number
    taxRate: number
    taxAmount: number
    total: number
    status: string
}

interface PurchaseOrderDetail {
    id: string
    number: string
    date: string
    supplierName: string
    subtotal: number
    taxRate: number
    taxAmount: number
    total: number
    status: string
}

interface TaxReportData {
    period: { startDate: string; endDate: string }
    ppn: {
        ppnOut: number
        ppnIn: number
        ppnPayable: number
        invoiceCount: number
        poCount: number
    }
    pph: {
        pph21Total: number
        pph23Total: number
        totalWithholding: number
    }
    details: {
        invoices: InvoiceDetail[]
        purchaseOrders: PurchaseOrderDetail[]
    }
    totalTaxCollected: number
    totalTaxPaid: number
    netTaxPosition: number
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

function toISODate(date: Date): string {
    return date.toISOString().split('T')[0]
}

function getStatusBadge(status: string): { label: string; className: string } {
    switch (status) {
        case 'PAID':
            return { label: 'Dibayar', className: 'bg-green-100 text-green-700' }
        case 'SENT':
            return { label: 'Dikirim', className: 'bg-blue-100 text-blue-700' }
        case 'RECEIVED':
            return { label: 'Diterima', className: 'bg-purple-100 text-purple-700' }
        case 'DRAFT':
            return { label: 'Draft', className: 'bg-gray-100 text-gray-600' }
        case 'OVERDUE':
            return { label: 'Jatuh Tempo', className: 'bg-red-100 text-red-700' }
        case 'CANCELLED':
            return { label: 'Dibatalkan', className: 'bg-red-100 text-red-700' }
        default:
            return { label: status, className: 'bg-gray-100 text-gray-600' }
    }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TaxReportPage() {
    const { data: session } = useSession()

    // Date range state — default: awal bulan ini sampai hari ini
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const [startDate, setStartDate] = useState(toISODate(firstDay))
    const [endDate, setEndDate] = useState(toISODate(now))

    const [data, setData] = useState<TaxReportData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Collapsible sections
    const [showInvoices, setShowInvoices] = useState(true)
    const [showPOs, setShowPOs] = useState(true)

    const fetchReport = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams({ startDate, endDate })
            const res = await fetch(`/api/finance/tax-report?${params.toString()}`)
            const json = await res.json()
            if (json.success) {
                setData(json.data)
            } else {
                setError(json.error || 'Gagal memuat laporan pajak')
            }
        } catch {
            setError('Gagal memuat laporan pajak')
        } finally {
            setLoading(false)
        }
    }, [startDate, endDate])

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
                <div className="animate-pulse space-y-4">
                    <div className="h-8 w-48 rounded bg-gray-200" />
                    <div className="h-10 w-64 rounded bg-gray-200" />
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
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
                <FileText className="mb-4 h-12 w-12 text-red-400" />
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Gagal Memuat Laporan</h3>
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

    if (!data || (data.details.invoices.length === 0 && data.details.purchaseOrders.length === 0)) {
        return (
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Laporan Pajak</h1>
                        <p className="mt-1 text-sm text-gray-500">Ringkasan PPN masuk/keluar dan PPh</p>
                    </div>
                </div>

                {/* Date Range */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center no-print">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <label className="text-sm text-gray-600">Dari:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Sampai:</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Empty State */}
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
                    <Inbox className="mb-4 h-12 w-12 text-gray-300" />
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">Tidak Ada Data Pajak</h3>
                    <p className="mb-4 max-w-md text-sm text-gray-500">
                        Belum ada transaksi Invoice atau Purchase Order dalam periode yang dipilih.
                        Data pajak akan muncul setelah ada transaksi dengan status yang sesuai.
                    </p>
                    <div className="rounded-lg bg-gray-50 p-4 text-left text-sm text-gray-600">
                        <p className="font-medium text-gray-700">Catatan:</p>
                        <ul className="mt-2 space-y-1">
                            <li>• PPN Keluar: Invoice dengan status <span className="font-medium">Dibayar</span> atau <span className="font-medium">Dikirim</span></li>
                            <li>• PPN Masuk: Purchase Order dengan status <span className="font-medium">Diterima</span></li>
                        </ul>
                    </div>
                </div>
            </div>
        )
    }

    // ─── Main Render ────────────────────────────────────────────────────

    const { ppn, pph, details } = data

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Laporan Pajak</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Periode: {formatDate(data.period.startDate)} — {formatDate(data.period.endDate)}
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

            {/* Date Range Picker */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center no-print">
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <label className="text-sm text-gray-600">Dari:</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Sampai:</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <button
                    onClick={fetchReport}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    Tampilkan
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {/* PPN Keluar */}
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-blue-500" />
                        <p className="text-sm text-gray-500">PPN Keluar</p>
                    </div>
                    <p className="mt-1 text-xl font-bold text-blue-600">{formatIDR(ppn.ppnOut)}</p>
                    <p className="mt-1 text-xs text-gray-400">{ppn.invoiceCount} invoice</p>
                </div>

                {/* PPN Masuk */}
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-center gap-2">
                        <ArrowDownRight className="h-4 w-4 text-purple-500" />
                        <p className="text-sm text-gray-500">PPN Masuk</p>
                    </div>
                    <p className="mt-1 text-xl font-bold text-purple-600">{formatIDR(ppn.ppnIn)}</p>
                    <p className="mt-1 text-xs text-gray-400">{ppn.poCount} PO</p>
                </div>

                {/* PPN Terutang */}
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-orange-500" />
                        <p className="text-sm text-gray-500">PPN Terutang</p>
                    </div>
                    <p className={`mt-1 text-xl font-bold ${ppn.ppnPayable >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {formatIDR(ppn.ppnPayable)}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">PPN Keluar − PPN Masuk</p>
                </div>

                {/* Total PPh */}
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-red-500" />
                        <p className="text-sm text-gray-500">Total PPh</p>
                    </div>
                    <p className="mt-1 text-xl font-bold text-red-600">{formatIDR(pph.totalWithholding)}</p>
                    <p className="mt-1 text-xs text-gray-400">
                        PPh 21: {formatIDR(pph.pph21Total)} · PPh 23: {formatIDR(pph.pph23Total)}
                    </p>
                </div>
            </div>

            {/* Net Tax Position Summary */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Posisi Pajak Bersih</h3>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{formatIDR(data.netTaxPosition)}</p>
                        <p className="mt-1 text-xs text-gray-400">
                            PPN Dikumpulkan: {formatIDR(data.totalTaxCollected)} · PPN Dibayar: {formatIDR(data.totalTaxPaid)}
                        </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>PPN Terutang: <span className="font-medium text-orange-600">{formatIDR(ppn.ppnPayable)}</span></span>
                        <span>PPh Dipotong: <span className="font-medium text-red-600">{formatIDR(pph.totalWithholding)}</span></span>
                    </div>
                </div>
            </div>

            {/* Detail Invoice Section */}
            <div className="rounded-lg border border-gray-200 bg-white">
                <button
                    onClick={() => setShowInvoices(!showInvoices)}
                    className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Detail Invoice (PPN Keluar)</h3>
                        <p className="text-sm text-gray-500">{details.invoices.length} invoice dengan PPN</p>
                    </div>
                    {showInvoices ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                </button>

                {showInvoices && details.invoices.length > 0 && (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-t border-gray-200 bg-gray-50">
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">No. Invoice</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Tanggal</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600">Subtotal</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600">Tarif PPN</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600">PPN</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {details.invoices.map((inv) => {
                                        const badge = getStatusBadge(inv.status)
                                        return (
                                            <tr key={inv.id} className="border-t border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">{inv.number}</td>
                                                <td className="px-4 py-3 text-gray-600">{formatDate(inv.date)}</td>
                                                <td className="px-4 py-3 text-gray-600">{inv.contactName}</td>
                                                <td className="px-4 py-3 text-right text-gray-600">{formatIDR(inv.subtotal)}</td>
                                                <td className="px-4 py-3 text-right text-gray-600">{inv.taxRate}%</td>
                                                <td className="px-4 py-3 text-right font-medium text-blue-600">{formatIDR(inv.taxAmount)}</td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-900">{formatIDR(inv.total)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${badge.className}`}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="space-y-3 p-4 md:hidden">
                            {details.invoices.map((inv) => {
                                const badge = getStatusBadge(inv.status)
                                return (
                                    <div key={inv.id} className="rounded-lg border border-gray-200 p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-gray-900">{inv.number}</span>
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${badge.className}`}>
                                                {badge.label}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-gray-500">{inv.contactName} · {formatDate(inv.date)}</p>
                                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-gray-500">Subtotal:</span>
                                                <span className="ml-1 text-gray-700">{formatIDR(inv.subtotal)}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">PPN ({inv.taxRate}%):</span>
                                                <span className="ml-1 font-medium text-blue-600">{formatIDR(inv.taxAmount)}</span>
                                            </div>
                                        </div>
                                        <div className="mt-2 border-t border-gray-100 pt-2 text-right">
                                            <span className="text-sm text-gray-500">Total:</span>
                                            <span className="ml-1 font-semibold text-gray-900">{formatIDR(inv.total)}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Invoice Total */}
                        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Total PPN Keluar:</span>
                                <span className="font-semibold text-blue-600">{formatIDR(ppn.ppnOut)}</span>
                            </div>
                        </div>
                    </>
                )}

                {showInvoices && details.invoices.length === 0 && (
                    <div className="border-t border-gray-100 p-8 text-center text-sm text-gray-500">
                        Tidak ada invoice dalam periode ini
                    </div>
                )}
            </div>

            {/* Detail Purchase Order Section */}
            <div className="rounded-lg border border-gray-200 bg-white">
                <button
                    onClick={() => setShowPOs(!showPOs)}
                    className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Detail Purchase Order (PPN Masuk)</h3>
                        <p className="text-sm text-gray-500">{details.purchaseOrders.length} PO dengan PPN</p>
                    </div>
                    {showPOs ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                </button>

                {showPOs && details.purchaseOrders.length > 0 && (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-t border-gray-200 bg-gray-50">
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">No. PO</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Tanggal</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Supplier</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600">Subtotal</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600">Tarif PPN</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600">PPN</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {details.purchaseOrders.map((po) => {
                                        const badge = getStatusBadge(po.status)
                                        return (
                                            <tr key={po.id} className="border-t border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">{po.number}</td>
                                                <td className="px-4 py-3 text-gray-600">{formatDate(po.date)}</td>
                                                <td className="px-4 py-3 text-gray-600">{po.supplierName}</td>
                                                <td className="px-4 py-3 text-right text-gray-600">{formatIDR(po.subtotal)}</td>
                                                <td className="px-4 py-3 text-right text-gray-600">{po.taxRate}%</td>
                                                <td className="px-4 py-3 text-right font-medium text-purple-600">{formatIDR(po.taxAmount)}</td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-900">{formatIDR(po.total)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${badge.className}`}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="space-y-3 p-4 md:hidden">
                            {details.purchaseOrders.map((po) => {
                                const badge = getStatusBadge(po.status)
                                return (
                                    <div key={po.id} className="rounded-lg border border-gray-200 p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-gray-900">{po.number}</span>
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${badge.className}`}>
                                                {badge.label}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-gray-500">{po.supplierName} · {formatDate(po.date)}</p>
                                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-gray-500">Subtotal:</span>
                                                <span className="ml-1 text-gray-700">{formatIDR(po.subtotal)}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">PPN ({po.taxRate}%):</span>
                                                <span className="ml-1 font-medium text-purple-600">{formatIDR(po.taxAmount)}</span>
                                            </div>
                                        </div>
                                        <div className="mt-2 border-t border-gray-100 pt-2 text-right">
                                            <span className="text-sm text-gray-500">Total:</span>
                                            <span className="ml-1 font-semibold text-gray-900">{formatIDR(po.total)}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* PO Total */}
                        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Total PPN Masuk:</span>
                                <span className="font-semibold text-purple-600">{formatIDR(ppn.ppnIn)}</span>
                            </div>
                        </div>
                    </>
                )}

                {showPOs && details.purchaseOrders.length === 0 && (
                    <div className="border-t border-gray-100 p-8 text-center text-sm text-gray-500">
                        Tidak ada purchase order dalam periode ini
                    </div>
                )}
            </div>

            {/* Print-only footer */}
            <div className="hidden print:block border-t border-gray-300 pt-4 text-xs text-gray-500">
                <p>Dicetak pada: {new Date().toLocaleString('id-ID')} · Periode: {formatDate(data.period.startDate)} — {formatDate(data.period.endDate)}</p>
            </div>
        </div>
    )
}
