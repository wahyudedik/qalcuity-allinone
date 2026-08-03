'use client'

import { useState } from 'react'
import Link from 'next/link'

const quotations = [
    {
        id: 'QUO-2026-0045',
        customer: 'PT Maju Bersama',
        amount: 25000000,
        status: 'sent',
        validUntil: '2026-08-31',
        createdAt: '2026-08-01',
        items: 5,
    },
    {
        id: 'QUO-2026-0044',
        customer: 'CV Berkah Jaya',
        amount: 12500000,
        status: 'accepted',
        validUntil: '2026-08-20',
        createdAt: '2026-07-28',
        items: 3,
    },
    {
        id: 'QUO-2026-0043',
        customer: 'PT Digital Nusantara',
        amount: 45000000,
        status: 'draft',
        validUntil: '2026-09-15',
        createdAt: '2026-08-02',
        items: 8,
    },
    {
        id: 'QUO-2026-0042',
        customer: 'PT Sejahtera Abadi',
        amount: 8750000,
        status: 'rejected',
        validUntil: '2026-07-30',
        createdAt: '2026-07-15',
        items: 2,
    },
    {
        id: 'QUO-2026-0041',
        customer: 'UD Makmur Sentosa',
        amount: 18000000,
        status: 'accepted',
        validUntil: '2026-08-25',
        createdAt: '2026-07-20',
        items: 4,
    },
]

const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
    sent: { label: 'Terkirim', color: 'bg-blue-100 text-blue-700' },
    accepted: { label: 'Diterima', color: 'bg-green-100 text-green-700' },
    rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700' },
    expired: { label: 'Kedaluwarsa', color: 'bg-gray-100 text-gray-500' },
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount)
}

export default function QuotationsPage() {
    const [statusFilter, setStatusFilter] = useState('all')
    const [search, setSearch] = useState('')

    const filteredQuotations = quotations.filter(q => {
        const matchesStatus = statusFilter === 'all' || q.status === statusFilter
        const matchesSearch = search === '' ||
            q.id.toLowerCase().includes(search.toLowerCase()) ||
            q.customer.toLowerCase().includes(search.toLowerCase())
        return matchesStatus && matchesSearch
    })

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Penawaran (Quotation)</h1>
                    <p className="text-gray-600 mt-1">Kelola penawaran harga untuk customer</p>
                </div>
                <Link
                    href="/dashboard/finance/quotations/new"
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Buat Penawaran
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">Total Penawaran</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{quotations.length}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">Menunggu Respon</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">
                        {quotations.filter(q => q.status === 'sent').length}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">Diterima</div>
                    <div className="text-2xl font-bold text-green-600 mt-1">
                        {quotations.filter(q => q.status === 'accepted').length}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">Nilai Pipeline</div>
                    <div className="text-xl font-bold text-gray-900 mt-1">
                        {formatCurrency(quotations.filter(q => q.status !== 'rejected' && q.status !== 'accepted').reduce((sum, q) => sum + q.amount, 0))}
                    </div>
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
                            placeholder="Cari penawaran atau customer..."
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
                        <option value="accepted">Diterima</option>
                        <option value="rejected">Ditolak</option>
                    </select>
                </div>
            </div>

            {/* Quotation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredQuotations.map((quotation) => (
                    <Link
                        key={quotation.id}
                        href={`/dashboard/finance/quotations/${quotation.id}`}
                        className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <div className="font-medium text-blue-600">{quotation.id}</div>
                                <div className="text-sm text-gray-900 mt-1">{quotation.customer}</div>
                            </div>
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[quotation.status].color}`}>
                                {statusConfig[quotation.status].label}
                            </span>
                        </div>

                        <div className="text-2xl font-bold text-gray-900 mb-3">
                            {formatCurrency(quotation.amount)}
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                            <span>{quotation.items} item</span>
                            <span>Berlaku hingga {quotation.validUntil}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
