'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { InvoiceForm } from '@/components/finance/invoice-form'

type Invoice = {
    id: string
    invoiceNumber: string
    customerName: string
    subtotal: number
    tax: number
    total: number
    currency: string
    status: string
    dueDate: string
    createdAt: string
}

const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
    sent: { label: 'Terkirim', color: 'bg-blue-100 text-blue-700' },
    paid: { label: 'Lunas', color: 'bg-green-100 text-green-700' },
    overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700' },
    partially_paid: { label: 'Bayar Sebagian', color: 'bg-yellow-100 text-yellow-700' },
    cancelled: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-500' },
}

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)

    useEffect(() => {
        fetchInvoices()
    }, [])

    const fetchInvoices = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/finance/invoices')
            const data = await response.json()
            if (data.success) {
                setInvoices(data.data)
            } else {
                setError('Gagal memuat data invoice')
            }
        } catch (err) {
            setError('Terjadi kesalahan saat memuat data')
        } finally {
            setLoading(false)
        }
    }

    const filteredInvoices = invoices.filter(invoice => {
        const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
        const matchesSearch = search === '' ||
            invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
            invoice.customerName.toLowerCase().includes(search.toLowerCase())
        return matchesStatus && matchesSearch
    })

    const stats = {
        total: invoices.reduce((sum, inv) => sum + inv.total, 0),
        paid: invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.total, 0),
        outstanding: invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled' && i.status !== 'draft').reduce((sum, inv) => sum + inv.total, 0),
        draft: invoices.filter(i => i.status === 'draft').length,
    }

    const handleCreateInvoice = async (data: unknown) => {
        try {
            const response = await fetch('/api/finance/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            const result = await response.json()
            if (result.success) {
                setShowCreateModal(false)
                fetchInvoices() // Refresh data
            } else {
                alert('Gagal membuat invoice: ' + result.error)
            }
        } catch {
            alert('Terjadi kesalahan saat membuat invoice')
        }
    }

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
                        ))}
                    </div>
                    <div className="h-96 bg-gray-200 rounded-xl"></div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={fetchInvoices}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Invoice</h1>
                    <p className="text-gray-500">Kelola invoice dan tagihan Anda</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Buat Invoice
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total Invoice</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total)}</p>
                    <p className="text-xs text-gray-400 mt-1">{invoices.length} invoice</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Sudah Dibayar</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paid)}</p>
                    <p className="text-xs text-gray-400 mt-1">{invoices.filter(i => i.status === 'paid').length} invoice</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Belum Dibayar</p>
                    <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.outstanding)}</p>
                    <p className="text-xs text-gray-400 mt-1">{invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled' && i.status !== 'draft').length} invoice</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Draft</p>
                    <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
                    <p className="text-xs text-gray-400 mt-1">Belum dikirim</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Cari invoice..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                    <option value="all">Semua Status</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Terkirim</option>
                    <option value="paid">Lunas</option>
                    <option value="overdue">Overdue</option>
                    <option value="partially_paid">Bayar Sebagian</option>
                    <option value="cancelled">Dibatalkan</option>
                </select>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Nomor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tanggal</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Jatuh Tempo</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Jumlah</th>
                                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        Tidak ada invoice ditemukan
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <Link href={`/dashboard/finance/invoices/${invoice.id}`} className="font-medium text-blue-600 hover:underline">
                                                {invoice.invoiceNumber}
                                            </Link>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-gray-900">{invoice.customerName}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-gray-500">{formatDate(invoice.createdAt)}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-gray-500">{formatDate(invoice.dueDate)}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right font-medium">{formatCurrency(invoice.total)}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusConfig[invoice.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                                                {statusConfig[invoice.status]?.label || invoice.status}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right">
                                            <Link href={`/dashboard/finance/invoices/${invoice.id}`} className="text-blue-600 hover:text-blue-800">
                                                <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            <InvoiceForm
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateInvoice}
            />
        </div>
    )
}
