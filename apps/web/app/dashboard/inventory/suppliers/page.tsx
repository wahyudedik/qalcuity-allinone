'use client'

import { useState } from 'react'

type Supplier = {
    id: string
    name: string
    contact: string
    email: string
    phone: string
    address: string
    rating: number
    totalOrders: number
    totalSpent: number
    status: 'active' | 'inactive'
}

const MOCK_SUPPLIERS: Supplier[] = [
    { id: 'S-001', name: 'PT Supplier ABC', contact: 'Dedi Kurniawan', email: 'dedi@supplier-abc.co.id', phone: '021-5551234', address: 'Jakarta Selatan', rating: 4.5, totalOrders: 24, totalSpent: 250000000, status: 'active' },
    { id: 'S-002', name: 'CV Supplier XYZ', contact: 'Eko Prasetyo', email: 'eko@supplier-xyz.co.id', phone: '021-5555678', address: 'Jakarta Barat', rating: 4.2, totalOrders: 18, totalSpent: 180000000, status: 'active' },
    { id: 'S-003', name: 'PT Material Jaya', contact: 'Fajar Nugroho', email: 'fajar@material-jaya.co.id', phone: '021-5559012', address: 'Tangerang', rating: 3.8, totalOrders: 12, totalSpent: 95000000, status: 'active' },
    { id: 'S-004', name: 'CV Berkah Supply', contact: 'Gilang Ramadhan', email: 'gilang@berkah-supply.co.id', phone: '021-5553456', address: 'Bekasi', rating: 4.0, totalOrders: 8, totalSpent: 65000000, status: 'active' },
    { id: 'S-005', name: 'PT Mitra Sejahtera', contact: 'Hadi Susanto', email: 'hadi@mitra-sejahtera.co.id', phone: '021-5557890', address: 'Depok', rating: 3.5, totalOrders: 5, totalSpent: 40000000, status: 'inactive' },
]

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)

export default function SuppliersPage() {
    const [suppliers] = useState<Supplier[]>(MOCK_SUPPLIERS)
    const [searchQuery, setSearchQuery] = useState('')

    const filtered = suppliers.filter((s) =>
        searchQuery === '' || s.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Supplier</h1>
                    <p className="text-gray-500">{suppliers.length} supplier terdaftar</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">＋ Supplier Baru</button>
            </div>

            {/* Search */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
                <input type="text" placeholder="Cari supplier..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>

            {/* Suppliers Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 font-medium text-gray-600">Supplier</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Kontak</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Rating</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Total Order</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Total Belanja</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((supplier) => (
                                <tr key={supplier.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-gray-900">{supplier.name}</p>
                                        <p className="text-xs text-gray-500">{supplier.address}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-sm text-gray-700">{supplier.contact}</p>
                                        <p className="text-xs text-gray-500">{supplier.email}</p>
                                        <p className="text-xs text-gray-500">{supplier.phone}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <span className="text-yellow-500">★</span>
                                            <span className="text-sm font-medium text-gray-700">{supplier.rating}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-700">{supplier.totalOrders} order</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(supplier.totalSpent)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${supplier.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                                            {supplier.status === 'active' ? 'Aktif' : 'Nonaktif'}
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
            </div>
        </div>
    )
}
