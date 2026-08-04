'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

type Product = {
    id: string
    sku: string
    name: string
    description: string
    category: string
    unitPrice: number
    costPrice: number
    currency: string
    stock: number
    minStock: number
    unit: string
    status: string
    createdAt: string
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterCategory, setFilterCategory] = useState('all')
    const [filterStatus, setFilterStatus] = useState('all')

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/inventory/products')
            const data = await response.json()
            if (data.success) {
                setProducts(data.data)
            } else {
                setError('Gagal memuat data produk')
            }
        } catch {
            setError('Terjadi kesalahan saat memuat data')
        } finally {
            setLoading(false)
        }
    }

    const categories = ['all', ...Array.from(new Set(products.map((p) => p.category)))]

    const filtered = products.filter((p) => {
        const matchCat = filterCategory === 'all' || p.category === filterCategory
        const matchStatus = filterStatus === 'all' || p.status === filterStatus
        const matchSearch = searchQuery === '' ||
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchQuery.toLowerCase())
        return matchCat && matchStatus && matchSearch
    })

    const stats = {
        total: products.length,
        active: products.filter(p => p.status === 'active').length,
        lowStock: products.filter(p => p.stock <= p.minStock && p.stock > 0).length,
        outOfStock: products.filter(p => p.stock === 0).length,
        totalValue: products.reduce((sum, p) => sum + (p.unitPrice * p.stock), 0),
    }

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        {[1, 2, 3, 4, 5].map(i => (
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
                        onClick={fetchProducts}
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
                    <h1 className="text-2xl font-bold text-gray-900">Produk</h1>
                    <p className="text-gray-500">{stats.total} produk terdaftar</p>
                </div>
                <div className="flex gap-2">
                    <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">📥 Import</button>
                    <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">＋ Produk Baru</button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total Produk</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Aktif</p>
                    <p className="mt-1 text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Stok Menipis</p>
                    <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Stok Habis</p>
                    <p className="mt-1 text-2xl font-bold text-red-600">{stats.outOfStock}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Nilai Stok</p>
                    <p className="mt-1 text-xl font-bold text-blue-600">{formatCurrency(stats.totalValue)}</p>
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
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                    {categories.map((c) => (
                        <option key={c} value={c}>{c === 'all' ? 'Semua Kategori' : c}</option>
                    ))}
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                    <option value="all">Semua Status</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                </select>
            </div>

            {/* Products Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 font-medium text-gray-600">SKU</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Nama Produk</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Kategori</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Harga Jual</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Harga Beli</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Stok</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Min Stok</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                                        Tidak ada produk ditemukan
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{product.sku}</td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <Link href={`/dashboard/inventory/products/${product.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                                                    {product.name}
                                                </Link>
                                                <p className="text-xs text-gray-500 truncate max-w-[200px]">{product.description}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                                                {product.category}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(product.unitPrice)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-gray-500">{formatCurrency(product.costPrice)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <span className={`font-medium ${product.stock <= product.minStock ? (product.stock === 0 ? 'text-red-600' : 'text-yellow-600') : 'text-gray-900'}`}>
                                                {product.stock}
                                            </span>
                                            <span className="text-gray-500 ml-1">{product.unit}</span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-gray-500">{product.minStock}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {product.status === 'active' ? 'Aktif' : 'Nonaktif'}
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
