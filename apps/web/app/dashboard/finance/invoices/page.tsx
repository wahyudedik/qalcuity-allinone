'use client'

import { useState } from 'react'
import Link from 'next/link'

const invoices = [
    {
        id: 'INV-2026-0092',
        customer: 'PT Maju Bersama',
        amount: 15500000,
        status: 'sent',
        dueDate: '2026-08-18',
        createdAt: '2026-08-03',
    },
    {
        id: 'INV-2026-0091',
        customer: 'CV Berkah Jaya',
        amount: 8250000,
        status: 'paid',
        dueDate: '2026-08-01',
        createdAt: '2026-08-01',
    },
    {
        id: 'INV-2026-0090',
        customer: 'PT Sejahtera Abadi',
        amount: 23000000,
        status: 'overdue',
        dueDate: '2026-07-15',
        createdAt: '2026-07-01',
    },
    {
        id: 'INV-2026-0089',
        customer: 'PT Digital Nusantara',
        amount: 5750000,
        status: 'draft',
        dueDate: '2026-08-20',
        createdAt: '2026-08-02',
    },
    {
        id: 'INV-2026-0088',
        customer: 'UD Makmur Sentosa',
        amount: 12000000,
        status: 'paid',
        dueDate: '2026-07-28',
        createdAt: '2026-07-15',
    },
    {
        id: 'INV-2026-0087',
        customer: 'PT ABC Corporation',
        amount: 45000000,
        status: 'partially_paid',
        dueDate: '2026-08-10',
        createdAt: '2026-07-25',
    },
    {
        id: 'INV-2026-0086',
        customer: 'CV Maju Jaya',
        amount: 3250000,
        status: 'paid',
        dueDate: '2026-07-20',
        createdAt: '2026-07-10',
    },
    {
        id: 'INV-2026-0085',
        customer: 'PT Teknologi Maju',
        amount: 18750000,
        status: 'overdue',
        dueDate: '2026-07-10',
        createdAt: '2026-06-25',
    },
]

const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
    sent: { label: 'Terkirim', color: 'bg-blue-100 text-blue-700' },
    paid: { label: 'Lunas', color: 'bg-green-100 text-green-700' },
    overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700' },
    partially_paid: { label: 'Bayar Sebagian', color: 'bg-yellow-100 text-yellow-700' },
    cancelled: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-500' },
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount)
}

export default function InvoicesPage() {
    const [statusFilter, setStatusFilter] = useState('all')
    const [search, setSearch] = useState('')

    const filteredInvoices = invoices.filter(invoice => {
        const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
        const matchesSearch = search === '' ||
            invoice.id.toLowerCase().includes(search.toLowerCase()) ||
            invoice.customer.toLowerCase().includes(search.toLowerCase())
        return matchesStatus && matchesSearch
    })

    const stats = {
        total: invoices.reduce((sum, inv) => sum + inv.amount, 0),
        paid: invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0),
        outstanding: invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled' && i.status !== 'draft').reduce((sum, inv) => sum + inv.amount, 0),
        overdue: invoices.filter(i => i.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0),
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Invoice</h1>
                    <p className="text-gray-600 mt-1">Kelola invoice dan tagihan Anda</p>
                </div>
                <Link
                    href="/dashboard/finance/invoices/new"
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Buat Invoice
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">Total Invoice</div>
                    <div className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(stats.total)}</div>
                    <div className="text-xs text-gray-500 mt-1">{invoices.length} invoice</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">Lunas</div>
                    <div className="text-xl font-bold text-green-600 mt-1">{formatCurrency(stats.paid)}</div>
                    <div className="text-xs text-gray-500 mt-1">{invoices.filter(i => i.status === 'paid').length} invoice</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">Outstanding</div>
                    <div className="text-xl font-bold text-yellow-600 mt-1">{formatCurrency(stats.outstanding)}</div>
                    <div className="text-xs text-gray-500 mt-1">{invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled' && i.status !== 'draft').length} invoice</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">Overdue</div>
                    <div className="text-xl font-bold text-red-600 mt-1">{formatCurrency(stats.overdue)}</div>
                    <div className="text-xs text-gray-500 mt-1">{invoices.filter(i => i.status === 'overdue').length} invoice</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Cari invoice atau customer..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                    >
                        <option value="all">Semua Status</option>
                        <option value="draft">Draft</option>
                        <option value="sent">Terkirim</option>
                        <option value="paid">Lunas</option>
                        <option value="overdue">Overdue</option>
                        <option value="partially_paid">Bayar Sebagian</option>
                    </select>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export
                    </button>
                </div>
            </div>

            {/* Invoice Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">
                                    <input type="checkbox" className="rounded border-gray-300" />
                                </th>
                                <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Invoice</th>
                                <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Customer</th>
                                <th className="text-right py-3 px-6 text-sm font-medium text-gray-600">Jumlah</th>
                                <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Status</th>
                                <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Jatuh Tempo</th>
                                <th className="text-right py-3 px-6 text-sm font-medium text-gray-600">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredInvoices.map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-gray-50">
                                    <td className="py-4 px-6">
                                        <input type="checkbox" className="rounded border-gray-300" />
                                    </td>
                                    <td className="py-4 px-6">
                                        <Link href={`/dashboard/finance/invoices/${invoice.id}`} className="font-medium text-blue-600 hover:text-blue-700">
                                            {invoice.id}
                                        </Link>
                                        <div className="text-xs text-gray-500 mt-0.5">{invoice.createdAt}</div>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-gray-900">{invoice.customer}</td>
                                    <td className="py-4 px-6 text-sm text-gray-900 text-right font-medium">
                                        {formatCurrency(invoice.amount)}
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[invoice.status].color}`}>
                                            {statusConfig[invoice.status].label}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-gray-600">{invoice.dueDate}</td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/dashboard/finance/invoices/${invoice.id}`}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </Link>
                                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        Menampilkan {filteredInvoices.length} dari {invoices.length} invoice
                    </div>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50" disabled>
                            Sebelumnya
                        </button>
                        <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium">1</button>
                        <button className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">
                            Selanjutnya
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
