'use client'

import { useState } from 'react'

type StockItem = {
    id: string
    sku: string
    name: string
    currentStock: number
    minStock: number
    maxStock: number
    unit: string
    lastRestock: string
    location: string
    status: 'ok' | 'low' | 'out'
}

const MOCK_STOCK: StockItem[] = [
    { id: '1', sku: 'SKU-001', name: 'Widget A', currentStock: 15, minStock: 50, maxStock: 200, unit: 'pcs', lastRestock: '2026-08-03', location: 'Gudang A-01', status: 'low' },
    { id: '2', sku: 'SKU-023', name: 'Component B', currentStock: 8, minStock: 30, maxStock: 150, unit: 'pcs', lastRestock: '2026-07-28', location: 'Gudang A-02', status: 'low' },
    { id: '3', sku: 'SKU-045', name: 'Part C', currentStock: 200, minStock: 100, maxStock: 500, unit: 'pcs', lastRestock: '2026-08-02', location: 'Gudang B-01', status: 'ok' },
    { id: '4', sku: 'SKU-067', name: 'Module D', currentStock: 30, minStock: 40, maxStock: 100, unit: 'pcs', lastRestock: '2026-07-25', location: 'Gudang A-03', status: 'low' },
    { id: '5', sku: 'SKU-089', name: 'Kit E', currentStock: 45, minStock: 50, maxStock: 100, unit: 'set', lastRestock: '2026-08-01', location: 'Gudang B-02', status: 'low' },
    { id: '6', sku: 'SKU-101', name: 'Raw Material F', currentStock: 500, minStock: 200, maxStock: 1000, unit: 'kg', lastRestock: '2026-08-02', location: 'Gudang C-01', status: 'ok' },
    { id: '7', sku: 'SKU-145', name: 'Packaging H', currentStock: 0, minStock: 100, maxStock: 500, unit: 'pcs', lastRestock: '2026-07-20', location: 'Gudang D-01', status: 'out' },
]

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)

const statusStyles: Record<string, string> = {
    ok: 'bg-green-100 text-green-800',
    low: 'bg-yellow-100 text-yellow-800',
    out: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
    ok: 'Aman',
    low: 'Menipis',
    out: 'Habis',
}

export default function StockPage() {
    const [stock] = useState<StockItem[]>(MOCK_STOCK)
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')

    const filtered = stock.filter((s) => {
        const matchStatus = filterStatus === 'all' || s.status === filterStatus
        const matchSearch = searchQuery === '' || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.sku.toLowerCase().includes(searchQuery.toLowerCase())
        return matchStatus && matchSearch
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manajemen Stok</h1>
                    <p className="text-gray-500">Monitor dan kelola stok produk</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">＋ Adjust Stok</button>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <input type="text" placeholder="Cari stok..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="flex gap-2">
                    {['all', 'ok', 'low', 'out'].map((s) => (
                        <button key={s} onClick={() => setFilterStatus(s)} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                            {s === 'all' ? 'Semua' : statusLabels[s]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stock Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 font-medium text-gray-600">SKU</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Produk</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Stok Saat Ini</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Min Stok</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Max Stok</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Level</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Lokasi</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Terakhir Restock</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((item) => {
                                const stockPercent = item.maxStock > 0 ? Math.round((item.currentStock / item.maxStock) * 100) : 0
                                return (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-gray-900">{item.sku}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{item.currentStock} {item.unit}</td>
                                        <td className="px-4 py-3 text-right text-gray-500">{item.minStock}</td>
                                        <td className="px-4 py-3 text-right text-gray-500">{item.maxStock}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-20 rounded-full bg-gray-200">
                                                    <div className={`h-2 rounded-full ${item.status === 'ok' ? 'bg-green-500' : item.status === 'low' ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(stockPercent, 100)}%` }} />
                                                </div>
                                                <span className="text-xs text-gray-500">{stockPercent}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{item.location}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-500">{item.lastRestock}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[item.status]}`}>
                                                {statusLabels[item.status]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button className="text-sm text-blue-600 hover:underline">Adjust</button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
