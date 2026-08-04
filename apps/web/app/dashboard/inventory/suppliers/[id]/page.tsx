'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

interface SupplierDetail {
    id: string
    name: string
    contactPerson: string
    email: string
    phone: string
    address: string
    category: string
    rating: number
    status: string
    totalOrders: number
    lastOrder: string
    createdAt: string
    products: Array<{ name: string; price: number; leadTime: string }>
}

const statusConfig: Record<string, { label: string; color: string }> = {
    active: { label: 'Aktif', color: 'bg-green-100 text-green-800' },
    inactive: { label: 'Tidak Aktif', color: 'bg-red-100 text-red-800' },
}

export default function SupplierDetailPage({ params }: { params: { id: string } }) {
    const [supplier, setSupplier] = useState<SupplierDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchSupplier = async () => {
            try {
                const response = await fetch(`/api/inventory/suppliers/${params.id}`)
                const data = await response.json()
                if (data.success) {
                    setSupplier(data.data)
                } else {
                    setError('Supplier tidak ditemukan')
                }
            } catch {
                setError('Gagal memuat data supplier')
            } finally {
                setLoading(false)
            }
        }
        fetchSupplier()
    }, [params.id])

    if (loading) {
        return (
            <div className="p-6">
                <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
                <div className="mt-4 h-48 animate-pulse rounded-xl bg-gray-100" />
            </div>
        )
    }

    if (error || !supplier) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <p className="text-lg text-gray-600">{error || 'Data tidak tersedia'}</p>
                    <Link href="/dashboard/inventory/suppliers" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
                        ← Kembali ke Suppliers
                    </Link>
                </div>
            </div>
        )
    }

    const statusInfo = statusConfig[supplier.status] || { label: supplier.status, color: 'bg-gray-100 text-gray-800' }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div>
                <Link href="/dashboard/inventory/suppliers" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                    ← Kembali ke Suppliers
                </Link>
                <div className="mt-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
                        <p className="text-sm text-gray-500">{supplier.category} • {supplier.contactPerson}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                        </span>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Rating</p>
                            <p className="text-lg font-bold text-yellow-500">
                                {'⭐'.repeat(Math.round(supplier.rating))} {supplier.rating}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Contact Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Informasi Kontak</h3>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm text-gray-500">Kontak Person</p>
                                <p className="font-medium text-gray-900">{supplier.contactPerson}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium text-gray-900">{supplier.email}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Telepon</p>
                                <p className="font-medium text-gray-900">{supplier.phone}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Kategori</p>
                                <p className="font-medium text-gray-900">{supplier.category}</p>
                            </div>
                            <div className="sm:col-span-2">
                                <p className="text-sm text-gray-500">Alamat</p>
                                <p className="font-medium text-gray-900">{supplier.address}</p>
                            </div>
                        </div>
                    </div>

                    {/* Products */}
                    {supplier.products.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h3 className="text-lg font-semibold text-gray-900">Produk yang disupply</h3>
                            <div className="mt-4 overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-gray-200 bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-gray-600">Produk</th>
                                            <th className="px-4 py-3 text-right font-medium text-gray-600">Harga</th>
                                            <th className="px-4 py-3 text-center font-medium text-gray-600">Lead Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {supplier.products.map((product, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                                                <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(product.price)}</td>
                                                <td className="px-4 py-3 text-center text-gray-600">{product.leadTime}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Order Stats */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Statistik Pesanan</h3>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Total Pesanan</span>
                                <span className="text-lg font-bold text-gray-900">{supplier.totalOrders}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Pesanan Terakhir</span>
                                <span className="text-sm text-gray-900">{formatDate(supplier.lastOrder)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Rating</span>
                                <span className="text-sm font-medium text-yellow-500">
                                    {'⭐'.repeat(Math.round(supplier.rating))} {supplier.rating}/5
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Detail</h3>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">ID Supplier</span>
                                <span className="font-mono text-sm text-gray-900">{supplier.id}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Tanggal Dibuat</span>
                                <span className="text-sm text-gray-900">{formatDate(supplier.createdAt)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Aksi</h3>
                        <div className="mt-4 space-y-3">
                            <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                                ✏️ Edit Supplier
                            </button>
                            <button className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                📦 Buat PO
                            </button>
                            <button className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                📋 Riwayat Pesanan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
