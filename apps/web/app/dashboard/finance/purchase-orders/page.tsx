'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PurchaseOrderForm } from '@/components/finance/purchase-order-form'

type PurchaseOrder = {
    id: string
    poNumber: string
    supplierName: string
    supplierEmail: string
    total: number
    currency: string
    status: string
    expectedDelivery: string
    actualDelivery: string | null
    items?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>
    notes: string
    createdAt: string
}

const statusStyles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-yellow-100 text-yellow-800',
    received: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
    draft: 'Draft',
    sent: 'Terkirim',
    confirmed: 'Dikonfirmasi',
    received: 'Diterima',
    cancelled: 'Dibatalkan',
}

export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/finance/purchase-orders')
            const data = await response.json()
            if (data.success) {
                setOrders(data.data)
            } else {
                setError('Gagal memuat data purchase order')
            }
        } catch {
            setError('Terjadi kesalahan saat memuat data')
        } finally {
            setLoading(false)
        }
    }

    const filtered = orders.filter((o) => {
        const matchStatus = filterStatus === 'all' || o.status === filterStatus
        const matchSearch = searchQuery === '' ||
            o.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
        return matchStatus && matchSearch
    })

    const stats = {
        total: orders.reduce((sum, o) => sum + o.total, 0),
        draft: orders.filter(o => o.status === 'draft').length,
        pending: orders.filter(o => o.status === 'sent' || o.status === 'confirmed').length,
        received: orders.filter(o => o.status === 'received').length,
    }

    const handleCreatePO = async (data: unknown) => {
        try {
            const response = await fetch('/api/finance/purchase-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            const result = await response.json()
            if (result.success) {
                setShowCreateModal(false)
                fetchOrders()
            } else {
                alert('Gagal membuat purchase order: ' + result.error)
            }
        } catch {
            alert('Terjadi kesalahan saat membuat purchase order')
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
                        onClick={fetchOrders}
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
                    <h1 className="text-2xl font-bold text-gray-900">Purchase Order</h1>
                    <p className="text-gray-500">Kelola pesanan pembelian ke supplier</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Buat PO
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total PO</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total)}</p>
                    <p className="text-xs text-gray-400 mt-1">{orders.length} PO</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Draft</p>
                    <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
                    <p className="text-xs text-gray-400 mt-1">Belum dikirim</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                    <p className="text-xs text-gray-400 mt-1">Menunggu konfirmasi</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Diterima</p>
                    <p className="text-2xl font-bold text-green-600">{stats.received}</p>
                    <p className="text-xs text-gray-400 mt-1">Selesai</p>
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
                            placeholder="Cari PO..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {['all', 'draft', 'sent', 'confirmed', 'received', 'cancelled'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === status
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {status === 'all' ? 'Semua' : statusLabels[status] || status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 font-medium text-gray-500">Nomor PO</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Supplier</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Items</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Tanggal Dibuat</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Estimasi</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Total</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-500">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                                        Tidak ada purchase order ditemukan
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((po) => (
                                    <tr key={po.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <Link href={`/dashboard/finance/purchase-orders/${po.id}`} className="font-medium text-blue-600 hover:underline">
                                                {po.poNumber}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{po.supplierName}</div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{po.items?.length || 0} item</td>
                                        <td className="whitespace-nowrap px-4 py-3">{formatDate(po.createdAt)}</td>
                                        <td className="whitespace-nowrap px-4 py-3">{formatDate(po.expectedDelivery)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatCurrency(po.total)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[po.status] || 'bg-gray-100 text-gray-700'}`}>
                                                {statusLabels[po.status] || po.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            <PurchaseOrderForm
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreatePO}
            />
        </div>
    )
}
