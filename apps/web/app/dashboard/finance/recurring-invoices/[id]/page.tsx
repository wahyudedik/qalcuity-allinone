'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Pause, Play, XCircle, FileText, Calendar, Clock, Hash, Eye } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface RecurringInvoiceDetail {
    id: string
    invoiceNumber: string | null
    notes: string | null
    taxRate: number | null
    frequency: string
    dayOfMonth: number | null
    dayOfWeek: number | null
    startDate: string
    endDate: string | null
    nextRunDate: string | null
    lastRunDate: string | null
    status: string
    createdAt: string
    contact: { id: string; name: string | null; email: string | null }
    items: Array<{ description: string; quantity: number; unitPrice: number }>
    generatedInvoices: Array<{ id: string; invoiceNumber: string; status: string; total: number; createdAt: string }>
    _count: { generatedInvoices: number }
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: 'Aktif', color: 'bg-green-100 text-green-700' },
    PAUSED: { label: 'Dijeda', color: 'bg-yellow-100 text-yellow-700' },
    COMPLETED: { label: 'Selesai', color: 'bg-blue-100 text-blue-700' },
    CANCELLED: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-600' },
}

const FREQUENCY_LABELS: Record<string, string> = {
    WEEKLY: 'Mingguan',
    BIWEEKLY: '2 Mingguan',
    MONTHLY: 'Bulanan',
    QUARTERLY: 'Quarterly',
    YEARLY: 'Tahunan',
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export default function RecurringInvoiceDetailPage({ params }: { params: { id: string } }) {
    const { t } = useTranslation()
    const router = useRouter()
    const [data, setData] = useState<RecurringInvoiceDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        fetchData()
    }, [params.id])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchData = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/finance/recurring-invoices/${params.id}`)
            const json = await res.json()
            if (json.success) {
                setData(json.data)
            } else {
                setToast({ message: 'Gagal memuat data', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal memuat data', type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = async (newStatus: string) => {
        try {
            setActionLoading(true)
            const res = await fetch(`/api/finance/recurring-invoices/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })
            const json = await res.json()
            if (json.success) {
                setData(prev => prev ? { ...prev, status: newStatus } : prev)
                setToast({ message: `Status berhasil diubah ke ${STATUS_CONFIG[newStatus]?.label || newStatus}`, type: 'success' })
            } else {
                setToast({ message: json.error || 'Gagal mengubah status', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal mengubah status', type: 'error' })
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
                <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500">Data tidak ditemukan</p>
                <Link href="/dashboard/finance/recurring-invoices" className="mt-4 text-blue-600 hover:underline">
                    Kembali ke Daftar
                </Link>
            </div>
        )
    }

    const subtotal = data.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0)
    const taxAmount = subtotal * (Number(data.taxRate || 0) / 100)
    const total = subtotal + taxAmount

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/finance/recurring-invoices" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Template Invoice Berulang</h1>
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[data.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                                {STATUS_CONFIG[data.status]?.label || data.status}
                            </span>
                        </div>
                        <p className="text-gray-600 mt-1">{data.contact.name || 'N/A'} — {FREQUENCY_LABELS[data.frequency] || data.frequency}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {data.status === 'ACTIVE' && (
                        <button
                            onClick={() => handleStatusChange('PAUSED')}
                            disabled={actionLoading}
                            className="px-4 py-2.5 border border-yellow-300 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <Pause className="h-4 w-4" />
                            Jeda
                        </button>
                    )}
                    {data.status === 'PAUSED' && (
                        <button
                            onClick={() => handleStatusChange('ACTIVE')}
                            disabled={actionLoading}
                            className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <Play className="h-4 w-4" />
                            Aktifkan
                        </button>
                    )}
                    {data.status !== 'CANCELLED' && data.status !== 'COMPLETED' && (
                        <button
                            onClick={() => handleStatusChange('CANCELLED')}
                            disabled={actionLoading}
                            className="px-4 py-2.5 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <XCircle className="h-4 w-4" />
                            Batalkan
                        </button>
                    )}
                    {actionLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Schedule Info */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            Jadwal
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-gray-500">Frekuensi</p>
                                <p className="text-sm font-medium text-gray-900">{FREQUENCY_LABELS[data.frequency] || data.frequency}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Tanggal Mulai</p>
                                <p className="text-sm font-medium text-gray-900">{new Date(data.startDate).toLocaleDateString('id-ID')}</p>
                            </div>
                            {data.endDate && (
                                <div>
                                    <p className="text-xs text-gray-500">Tanggal Berakhir</p>
                                    <p className="text-sm font-medium text-gray-900">{new Date(data.endDate).toLocaleDateString('id-ID')}</p>
                                </div>
                            )}
                            {data.nextRunDate && (
                                <div>
                                    <p className="text-xs text-gray-500">Jalankan Berikutnya</p>
                                    <p className="text-sm font-medium text-blue-600">{new Date(data.nextRunDate).toLocaleDateString('id-ID')}</p>
                                </div>
                            )}
                            {data.lastRunDate && (
                                <div>
                                    <p className="text-xs text-gray-500">Terakhir Dijalankan</p>
                                    <p className="text-sm font-medium text-gray-900">{new Date(data.lastRunDate).toLocaleDateString('id-ID')}</p>
                                </div>
                            )}
                            {['WEEKLY', 'BIWEEKLY'].includes(data.frequency) && data.dayOfWeek !== null && (
                                <div>
                                    <p className="text-xs text-gray-500">Hari</p>
                                    <p className="text-sm font-medium text-gray-900">{DAY_NAMES[data.dayOfWeek]}</p>
                                </div>
                            )}
                            {['MONTHLY', 'QUARTERLY', 'YEARLY'].includes(data.frequency) && data.dayOfMonth !== null && (
                                <div>
                                    <p className="text-xs text-gray-500">Tanggal</p>
                                    <p className="text-sm font-medium text-gray-900">{data.dayOfMonth} per periode</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                <Hash className="h-4 w-4 text-blue-600" />
                                Item Invoice
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Deskripsi</th>
                                        <th className="text-center py-3 px-6 text-sm font-medium text-gray-600">Qty</th>
                                        <th className="text-right py-3 px-6 text-sm font-medium text-gray-600">Harga</th>
                                        <th className="text-right py-3 px-6 text-sm font-medium text-gray-600">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="py-3 px-6 text-sm text-gray-900">{item.description}</td>
                                            <td className="py-3 px-6 text-sm text-gray-600 text-center">{Number(item.quantity)}</td>
                                            <td className="py-3 px-6 text-sm text-gray-600 text-right">Rp {Number(item.unitPrice).toLocaleString('id-ID')}</td>
                                            <td className="py-3 px-6 text-sm text-gray-900 text-right font-medium">Rp {(Number(item.quantity) * Number(item.unitPrice)).toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                            <div className="flex justify-end">
                                <div className="w-64 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Subtotal</span>
                                        <span className="text-gray-900">Rp {subtotal.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Pajak ({Number(data.taxRate || 0)}%)</span>
                                        <span className="text-gray-900">Rp {taxAmount.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                                        <span className="text-gray-900">Total</span>
                                        <span className="text-blue-600">Rp {total.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Generated Invoices */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-600" />
                                Invoice yang Dihasilkan ({data._count.generatedInvoices})
                            </h3>
                        </div>
                        {data.generatedInvoices.length === 0 ? (
                            <div className="px-6 py-8 text-center text-sm text-gray-500">
                                Belum ada invoice yang dihasilkan
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Nomor</th>
                                            <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Status</th>
                                            <th className="text-right py-3 px-6 text-sm font-medium text-gray-600">Total</th>
                                            <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Tanggal</th>
                                            <th className="text-center py-3 px-6 text-sm font-medium text-gray-600">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {data.generatedInvoices.map((inv) => (
                                            <tr key={inv.id}>
                                                <td className="py-3 px-6 text-sm text-gray-900 font-medium">{inv.invoiceNumber}</td>
                                                <td className="py-3 px-6 text-sm">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : inv.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-6 text-sm text-gray-900 text-right">Rp {Number(inv.total).toLocaleString('id-ID')}</td>
                                                <td className="py-3 px-6 text-sm text-gray-600">{new Date(inv.createdAt).toLocaleDateString('id-ID')}</td>
                                                <td className="py-3 px-6 text-center">
                                                    <Link href={`/dashboard/finance/invoices/${inv.id}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
                                                        <Eye className="h-3.5 w-3.5" />
                                                        Lihat
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    {data.notes && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="font-medium text-gray-900 mb-2">Catatan</h3>
                            <p className="text-sm text-gray-600">{data.notes}</p>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Summary Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-medium text-gray-900 mb-4">Ringkasan</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-900">{data._count.generatedInvoices} Invoice</div>
                                    <div className="text-xs text-gray-500">Telah dihasilkan</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-900">{FREQUENCY_LABELS[data.frequency] || data.frequency}</div>
                                    <div className="text-xs text-gray-500">Frekuensi</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-medium text-gray-900 mb-3">Kontak</h3>
                        <div className="text-sm">
                            <p className="font-medium text-gray-900">{data.contact.name || 'N/A'}</p>
                            {data.contact.email && <p className="text-gray-600">{data.contact.email}</p>}
                        </div>
                    </div>

                    {/* Created */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-medium text-gray-900 mb-3">Informasi</h3>
                        <div className="space-y-2 text-sm text-gray-600">
                            <p>Dibuat: {new Date(data.createdAt).toLocaleDateString('id-ID')}</p>
                            {data.invoiceNumber && <p>Prefix: {data.invoiceNumber}</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
