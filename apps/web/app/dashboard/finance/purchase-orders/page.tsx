'use client'

import { useState } from 'react'

type PurchaseOrder = {
    id: string
    date: string
    supplier: string
    items: { name: string; qty: number; price: number }[]
    total: number
    status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled'
    expectedDelivery: string
}

const MOCK_PO: PurchaseOrder[] = [
    {
        id: 'PO-2026-001',
        date: '2026-08-01',
        supplier: 'PT Supplier ABC',
        items: [
            { name: 'Widget A', qty: 100, price: 50000 },
            { name: 'Component B', qty: 50, price: 125000 },
        ],
        total: 11250000,
        status: 'received',
        expectedDelivery: '2026-08-03',
    },
    {
        id: 'PO-2026-002',
        date: '2026-08-02',
        supplier: 'CV Supplier XYZ',
        items: [
            { name: 'Part C', qty: 200, price: 25000 },
            { name: 'Module D', qty: 30, price: 200000 },
        ],
        total: 11000000,
        status: 'confirmed',
        expectedDelivery: '2026-08-06',
    },
    {
        id: 'PO-2026-003',
        date: '2026-08-03',
        supplier: 'PT Material Jaya',
        items: [
            { name: 'Raw Material E', qty: 500, price: 15000 },
        ],
        total: 7500000,
        status: 'sent',
        expectedDelivery: '2026-08-10',
    },
    {
        id: 'PO-2026-004',
        date: '2026-07-30',
        supplier: 'PT Supplier ABC',
        items: [
            { name: 'Widget A', qty: 200, price: 50000 },
            { name: 'Part C', qty: 100, price: 25000 },
        ],
        total: 12500000,
        status: 'received',
        expectedDelivery: '2026-08-02',
    },
    {
        id: 'PO-2026-005',
        date: '2026-07-28',
        supplier: 'CV Berkah Supply',
        items: [
            { name: 'Packaging F', qty: 1000, price: 5000 },
        ],
        total: 5000000,
        status: 'cancelled',
        expectedDelivery: '2026-08-05',
    },
]

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)

const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr))

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
    const [orders] = useState<PurchaseOrder[]>(MOCK_PO)
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')

    const filtered = orders.filter((o) => {
        const matchStatus = filterStatus === 'all' || o.status === filterStatus
        const matchSearch = searchQuery === '' || o.supplier.toLowerCase().includes(searchQuery.toLowerCase()) || o.id.toLowerCase().includes(searchQuery.toLowerCase())
        return matchStatus && matchSearch
    })

    const totalPO = orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0)
    const receivedPO = orders.filter((o) => o.status === 'received')
    const pendingPO = orders.filter((o) => ['sent', 'confirmed'].includes(o.status))

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
                    <p className="text-gray-500">Kelola order pembelian ke supplier</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                    ＋ Buat PO Baru
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total PO (Aktif)</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(totalPO)}</p>
                    <p className="text-xs text-gray-400">{orders.length} PO</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Sudah Diterima</p>
                    <p className="mt-1 text-xl font-bold text-green-600">{receivedPO.length} PO</p>
                    <p className="text-xs text-gray-400">{formatCurrency(receivedPO.reduce((s, o) => s + o.total, 0))}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Dalam Proses</p>
                    <p className="mt-1 text-xl font-bold text-yellow-600">{pendingPO.length} PO</p>
                    <p className="text-xs text-gray-400">{formatCurrency(pendingPO.reduce((s, o) => s + o.total, 0))}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Cari berdasarkan ID PO atau supplier..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'draft', 'sent', 'confirmed', 'received', 'cancelled'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${filterStatus === status ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {status === 'all' ? 'Semua' : statusLabels[status]}
                        </button>
                    ))}
                </div>
            </div>

            {/* PO Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 font-medium text-gray-600">ID PO</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Tanggal</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Supplier</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Items</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Estimasi</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-4xl">📦</span>
                                            <p>Belum ada data purchase order</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((po) => (
                                    <tr key={po.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-gray-900">{po.id}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatDate(po.date)}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{po.supplier}</td>
                                        <td className="px-4 py-3">
                                            <div className="text-xs text-gray-600">
                                                {po.items.map((item, i) => (
                                                    <div key={i}>{item.name} (x{item.qty})</div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(po.total)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDate(po.expectedDelivery)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[po.status]}`}>
                                                {statusLabels[po.status]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button className="text-sm text-blue-600 hover:underline">Detail</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-sm text-gray-500">
                        Menampilkan {filtered.length} dari {orders.length} purchase order
                    </p>
                    <div className="flex gap-1">
                        <button className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-100">&laquo; Prev</button>
                        <button className="rounded border border-blue-600 bg-blue-600 px-3 py-1 text-sm text-white">1</button>
                        <button className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-100">Next &raquo;</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
