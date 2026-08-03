'use client'

import { useState } from 'react'

type Product = {
    id: string
    sku: string
    name: string
    category: string
    price: number
    cost: number
    stock: number
    minStock: number
    unit: string
    status: 'active' | 'inactive'
}

const MOCK_PRODUCTS: Product[] = [
    { id: '1', sku: 'SKU-001', name: 'Widget A', category: 'Electronics', price: 100000, cost: 50000, stock: 15, minStock: 50, unit: 'pcs', status: 'active' },
    { id: '2', sku: 'SKU-023', name: 'Component B', category: 'Spare Parts', price: 250000, cost: 125000, stock: 8, minStock: 30, unit: 'pcs', status: 'active' },
    { id: '3', sku: 'SKU-045', name: 'Part C', category: 'Spare Parts', price: 50000, cost: 25000, stock: 200, minStock: 100, unit: 'pcs', status: 'active' },
    { id: '4', sku: 'SKU-067', name: 'Module D', category: 'Electronics', price: 400000, cost: 200000, stock: 30, minStock: 40, unit: 'pcs', status: 'active' },
    { id: '5', sku: 'SKU-089', name: 'Kit E', category: 'Bundle', price: 150000, cost: 75000, stock: 45, minStock: 50, unit: 'set', status: 'active' },
    { id: '6', sku: 'SKU-101', name: 'Raw Material F', category: 'Materials', price: 15000, cost: 8000, stock: 500, minStock: 200, unit: 'kg', status: 'active' },
    { id: '7', sku: 'SKU-123', name: 'Service G', category: 'Services', price: 5000000, cost: 2500000, stock: 999, minStock: 0, unit: 'job', status: 'active' },
    { id: '8', sku: 'SKU-145', name: 'Packaging H', category: 'Packaging', price: 5000, cost: 2500, stock: 0, minStock: 100, unit: 'pcs', status: 'active' },
]

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)

export default function ProductsPage() {
    const [products] = useState<Product[]>(MOCK_PRODUCTS)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterCategory, setFilterCategory] = useState('all')

    const categories = ['all', ...Array.from(new Set(products.map((p) => p.category)))]

    const filtered = products.filter((p) => {
        const matchCat = filterCategory === 'all' || p.category === filterCategory
        const matchSearch = searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase())
        return matchCat && matchSearch
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Produk</h1>
                    <p className="text-gray-500">{products.length} produk terdaftar</p>
                </div>
                <div className="flex gap-2">
                    <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">📥 Import</button>
                    <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">＋ Produk Baru</button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <input type="text" placeholder="Cari SKU atau nama produk..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                    {categories.map((c) => (
                        <option key={c} value={c}>{c === 'all' ? 'Semua Kategori' : c}</option>
                    ))}
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
                                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((product) => (
                                <tr key={product.id} className="hover:bg-gray-50">
                                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-gray-900">{product.sku}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                                    <td className="px-4 py-3 text-gray-500">{product.category}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-900">{formatCurrency(product.price)}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-500">{formatCurrency(product.cost)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`font-semibold ${product.stock <= product.minStock ? 'text-red-600' : 'text-green-600'}`}>
                                            {product.stock} {product.unit}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-500">{product.minStock}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                                            {product.status === 'active' ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button className="text-sm text-blue-600 hover:underline">Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-sm text-gray-500">Menampilkan {filtered.length} dari {products.length} produk</p>
                    <div className="flex gap-1">
                        <button className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-100">&laquo;</button>
                        <button className="rounded border border-blue-600 bg-blue-600 px-3 py-1 text-sm text-white">1</button>
                        <button className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-100">&raquo;</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
