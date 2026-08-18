'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, Pencil, Package, ClipboardList, AlertTriangle } from 'lucide-react'

interface ProductDetail {
    id: string
    sku: string
    name: string
    description: string
    category: string
    price: number
    cost: number
    stock: number
    minStock: number
    unit: string
    supplier: string
    status: string
    createdAt: string
}

const statusConfig: Record<string, { label: string; color: string }> = {
    active: { label: 'Aktif', color: 'bg-green-100 text-green-800' },
    inactive: { label: 'Tidak Aktif', color: 'bg-red-100 text-red-800' },
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
    const [product, setProduct] = useState<ProductDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await fetch(`/api/inventory/products/${params.id}`)
                const data = await response.json()
                if (data.success) {
                    setProduct(data.data)
                } else {
                    setError('Produk tidak ditemukan')
                }
            } catch {
                setError('Gagal memuat data produk')
            } finally {
                setLoading(false)
            }
        }
        fetchProduct()
    }, [params.id])

    if (loading) {
        return (
            <div className="p-6">
                <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
                <div className="mt-4 h-48 animate-pulse rounded-xl bg-gray-100" />
            </div>
        )
    }

    if (error || !product) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <p className="text-lg text-gray-600">{error || 'Data tidak tersedia'}</p>
                    <Link href="/dashboard/inventory/products" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
                        ← Kembali ke Produk
                    </Link>
                </div>
            </div>
        )
    }

    const statusInfo = statusConfig[product.status] || { label: product.status, color: 'bg-gray-100 text-gray-800' }
    const stockStatus = product.stock <= 0
        ? { label: 'Habis', color: 'text-red-600', bg: 'bg-red-50' }
        : product.stock <= product.minStock
            ? { label: 'Menipis', color: 'text-yellow-600', bg: 'bg-yellow-50' }
            : { label: 'Aman', color: 'text-green-600', bg: 'bg-green-50' }
    const margin = product.price > 0 ? ((product.price - product.cost) / product.price * 100).toFixed(1) : '0'

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div>
                <Link href="/dashboard/inventory/products" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke Produk
                </Link>
                <div className="mt-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                        <p className="text-sm text-gray-500">SKU: {product.sku} • {product.category}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Product Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Informasi Produk</h3>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm text-gray-500">SKU</p>
                                <p className="font-mono font-medium text-gray-900">{product.sku}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Kategori</p>
                                <p className="font-medium text-gray-900">{product.category}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Satuan</p>
                                <p className="font-medium text-gray-900">{product.unit}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Supplier</p>
                                <p className="font-medium text-gray-900">{product.supplier}</p>
                            </div>
                        </div>
                        {product.description && (
                            <div className="mt-4">
                                <p className="text-sm text-gray-500">Deskripsi</p>
                                <p className="mt-1 text-sm text-gray-700">{product.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Pricing */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Harga & Biaya</h3>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="rounded-lg bg-green-50 p-4">
                                <p className="text-sm text-green-600">Harga Jual</p>
                                <p className="text-xl font-bold text-green-700">{formatCurrency(product.price)}</p>
                            </div>
                            <div className="rounded-lg bg-blue-50 p-4">
                                <p className="text-sm text-blue-600">Harga Beli</p>
                                <p className="text-xl font-bold text-blue-700">{formatCurrency(product.cost)}</p>
                            </div>
                            <div className="rounded-lg bg-purple-50 p-4">
                                <p className="text-sm text-purple-600">Margin</p>
                                <p className="text-xl font-bold text-purple-700">{margin}%</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Stock Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Status Stok</h3>
                        <div className="mt-4">
                            <div className={`rounded-lg p-4 ${stockStatus.bg}`}>
                                <p className={`text-sm ${stockStatus.color}`}>{stockStatus.label}</p>
                                <p className="text-3xl font-bold text-gray-900">{product.stock}</p>
                                <p className="text-sm text-gray-500">{product.unit} tersedia</p>
                            </div>
                            <div className="mt-4 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Minimum Stok</span>
                                    <span className="font-medium text-gray-900">{product.minStock} {product.unit}</span>
                                </div>
                                <div className="w-full rounded-full bg-gray-200 h-2">
                                    <div
                                        className={`h-2 rounded-full ${product.stock <= 0 ? 'bg-red-500' : product.stock <= product.minStock ? 'bg-yellow-500' : 'bg-green-500'
                                            }`}
                                        style={{ width: `${Math.min(100, (product.stock / (product.minStock * 3)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Detail</h3>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">ID Produk</span>
                                <span className="font-mono text-sm text-gray-900">{product.id}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Tanggal Dibuat</span>
                                <span className="text-sm text-gray-900">{formatDate(product.createdAt)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Aksi</h3>
                        <div className="mt-4 space-y-3">
                            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                                <Pencil className="h-4 w-4" />
                                Edit Produk
                            </button>
                            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                <Package className="h-4 w-4" />
                                Restok
                            </button>
                            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                <ClipboardList className="h-4 w-4" />
                                Riwayat Stok
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
