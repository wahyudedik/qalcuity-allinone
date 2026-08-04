'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'

type StockItem = {
    id: string
    sku: string
    name: string
    stock: number
    minStock: number
    unit: string
    unitPrice: number
    category: string
    status: string
}

type Product = {
    id: string
    sku: string
    name: string
    category: string
    unitPrice: number
    stock: number
    minStock: number
    unit: string
    status: string
}

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
    const [stock, setStock] = useState<StockItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchStock()
    }, [])

    const fetchStock = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/inventory/products')
            const data = await response.json()
            if (data.success) {
                // Map products to stock items
                const stockItems: StockItem[] = data.data.map((product: Product) => ({
                    id: product.id,
                    sku: product.sku,
                    name: product.name,
                    stock: product.stock,
                    minStock: product.minStock,
                    unit: product.unit,
                    unitPrice: product.unitPrice,
                    category: product.category,
                    status: product.stock === 0 ? 'out' : product.stock <= product.minStock ? 'low' : 'ok',
                }))
                setStock(stockItems)
            } else {
                setError('Gagal memuat data stok')
            }
        } catch {
            setError('Terjadi kesalahan saat memuat data')
        } finally {
            setLoading(false)
        }
    }

    const filtered = stock.filter((s) => {
        const matchStatus = filterStatus === 'all' || s.status === filterStatus
        const matchSearch = searchQuery === '' ||
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.sku.toLowerCase().includes(searchQuery.toLowerCase())
        return matchStatus && matchSearch
    })

    const stats = {
        total: stock.length,
        ok: stock.filter(s => s.status === 'ok').length,
        low: stock.filter(s => s.status === 'low').length,
        out: stock.filter(s => s.status === 'out').length,
        totalValue: stock.reduce((sum, s) => sum + (s.unitPrice * s.stock), 0),
    }

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
                        onClick={fetchStock}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manajemen Stok</h1>
                    <p className="text-gray-500">Monitor dan kelola stok produk</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">＋ Adjust Stok</button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total Item</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Aman</p>
                    <p className="mt-1 text-2xl font-bold text-green-600">{stats.ok}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Menipis</p>
                    <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.low}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Habis</p>
                    <p className="mt-1 text-2xl font-bold text-red-600">{stats.out}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Cari SKU atau nama produk..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {['all', 'ok', 'low', 'out'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === s
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {s === 'all' ? 'Semua' : statusLabels[s] || s}
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
                                <th className="px-4 py-3 font-medium text-gray-600">Nama Produk</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Kategori</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Stok Saat Ini</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Min Stok</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Nilai Stok</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                                        Tidak ada data stok ditemukan
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{item.sku}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <span className={`font-bold ${item.status === 'out' ? 'text-red-600' : item.status === 'low' ? 'text-yellow-600' : 'text-gray-900'}`}>
                                                {item.stock}
                                            </span>
                                            <span className="text-gray-500 ml-1">{item.unit}</span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-gray-500">{item.minStock} {item.unit}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatCurrency(item.unitPrice * item.stock)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[item.status] || 'bg-gray-100 text-gray-700'}`}>
                                                {statusLabels[item.status] || item.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
