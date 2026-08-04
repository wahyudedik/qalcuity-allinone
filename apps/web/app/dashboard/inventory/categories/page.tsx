'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

type Category = {
    id: string
    name: string
    description: string
    productCount: number
    totalValue: number
}

const MOCK_CATEGORIES: Category[] = [
    { id: '1', name: 'Electronics', description: 'Produk elektronik dan komponen digital', productCount: 45, totalValue: 125000000 },
    { id: '2', name: 'Spare Parts', description: 'Suku cadang dan komponen mekanik', productCount: 68, totalValue: 85000000 },
    { id: '3', name: 'Materials', description: 'Bahan baku dan material produksi', productCount: 32, totalValue: 45000000 },
    { id: '4', name: 'Bundle', description: 'Paket produk dan bundling', productCount: 18, totalValue: 35000000 },
    { id: '5', name: 'Services', description: 'Layanan dan jasa', productCount: 12, totalValue: 75000000 },
    { id: '6', name: 'Packaging', description: 'Kemasan dan packaging materials', productCount: 25, totalValue: 15000000 },
    { id: '7', name: 'Accessories', description: 'Aksesoris pelengkap', productCount: 35, totalValue: 28000000 },
    { id: '8', name: 'Consumables', description: 'Barang habis pakai', productCount: 22, totalValue: 18000000 },
]

export default function CategoriesPage() {
    const [categories] = useState<Category[]>(MOCK_CATEGORIES)
    const [searchQuery, setSearchQuery] = useState('')

    const filtered = categories.filter((c) =>
        searchQuery === '' || c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const totalProducts = categories.reduce((s, c) => s + c.productCount, 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Kategori Produk</h1>
                    <p className="text-gray-500">{categories.length} kategori · {totalProducts} produk</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">＋ Kategori Baru</button>
            </div>

            {/* Search */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
                <input type="text" placeholder="Cari kategori..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((cat) => (
                    <div key={cat.id} className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                                <p className="mt-1 text-xs text-gray-500">{cat.description}</p>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600">⋯</button>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                            <div>
                                <p className="text-sm font-semibold text-gray-900">{cat.productCount} produk</p>
                                <p className="text-xs text-gray-500">{formatCurrency(cat.totalValue)}</p>
                            </div>
                            <button className="text-xs text-blue-600 hover:underline">Lihat →</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
