'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface PODetail {
    id: string
    poNumber: string
    supplierName: string
    supplierAddress: string
    supplierEmail: string
    items: Array<{ name: string; description: string; quantity: number; unitPrice: number; total: number }>
    subtotal: number
    tax: number
    total: number
    currency: string
    status: string
    expectedDelivery: string
    createdAt: string
    notes: string
}

const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
    sent: { label: 'Terkirim', color: 'bg-blue-100 text-blue-700' },
    confirmed: { label: 'Dikonfirmasi', color: 'bg-green-100 text-green-700' },
    received: { label: 'Diterima', color: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
}

export default function PurchaseOrderDetailPage({ params }: { params: { id: string } }) {
    const [po, setPO] = useState<PODetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchPO = async () => {
            try {
                setLoading(true)
                const res = await fetch(`/api/finance/purchase-orders/${params.id}`)
                const data = await res.json()
                if (data.success) {
                    setPO(data.data)
                } else {
                    setError('Purchase Order tidak ditemukan')
                }
            } catch {
                setError('Gagal memuat data purchase order')
            } finally {
                setLoading(false)
            }
        }
        fetchPO()
    }, [params.id])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
                <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
            </div>
        )
    }

    if (error || !po) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500">{error || 'Purchase Order tidak ditemukan'}</p>
                <Link href="/dashboard/finance/purchase-orders" className="mt-4 text-blue-600 hover:underline">
                    Kembali ke Purchase Orders
                </Link>
            </div>
        )
    }
    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link href="/dashboard/finance/purchase-orders" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Kembali ke Purchase Orders
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Purchase Order {po.poNumber}</h1>
                    <p className="text-gray-500 mt-1">Dibuat pada {po.createdAt}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusConfig[po.status].color}`}>
                        {statusConfig[po.status].label}
                    </span>
                    <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Print
                    </button>
                    <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                        Konfirmasi Penerimaan
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Supplier Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Supplier</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Nama Supplier</p>
                                <p className="font-medium text-gray-900">{po.supplierName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium text-gray-900">{po.supplierEmail}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Tanggal Dibuat</p>
                                <p className="font-medium text-gray-900">{po.createdAt}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Estimasi Pengiriman</p>
                                <p className="font-medium text-gray-900">{po.expectedDelivery}</p>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Item yang Dipesan</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-y border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Harga Satuan</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {po.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 text-center">{item.quantity}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 text-right">{formatCurrency(item.unitPrice)}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">{formatCurrency(item.quantity * item.unitPrice)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Totals */}
                        <div className="border-t border-gray-200 bg-gray-50 p-6">
                            <div className="ml-auto w-72 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span className="font-medium">{formatCurrency(po.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">PPN (11%)</span>
                                    <span className="font-medium">{formatCurrency(po.tax)}</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-300 pt-2">
                                    <span className="font-semibold text-gray-900">Total</span>
                                    <span className="text-lg font-bold text-gray-900">{formatCurrency(po.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Notes */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Catatan</h3>
                        <p className="text-sm text-gray-600">{po.notes}</p>
                    </div>

                    {/* Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Aksi</h3>
                        <div className="space-y-2">
                            <button className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Edit PO
                            </button>
                            <button className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Kirim ke Supplier
                            </button>
                            <button className="w-full rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50">
                                Batalkan PO
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
