'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface PaymentDetail {
    id: string
    paymentNumber: string
    invoiceNumber: string
    customerName: string
    amount: number
    method: string
    bank: string
    accountNumber: string
    status: string
    paymentDate: string
    reference: string
    notes: string
}

const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700' },
    completed: { label: 'Selesai', color: 'bg-green-100 text-green-700' },
    failed: { label: 'Gagal', color: 'bg-red-100 text-red-700' },
    refunded: { label: 'Dikembalikan', color: 'bg-gray-100 text-gray-700' },
}

export default function PaymentDetailPage({ params }: { params: { id: string } }) {
    const [payment, setPayment] = useState<PaymentDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchPayment = async () => {
            try {
                setLoading(true)
                const res = await fetch(`/api/finance/payments/${params.id}`)
                const data = await res.json()
                if (data.success) {
                    setPayment(data.data)
                } else {
                    setError('Payment tidak ditemukan')
                }
            } catch {
                setError('Gagal memuat data payment')
            } finally {
                setLoading(false)
            }
        }
        fetchPayment()
    }, [params.id])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
                <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
            </div>
        )
    }

    if (error || !payment) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500">{error || 'Payment tidak ditemukan'}</p>
                <Link href="/dashboard/finance/payments" className="mt-4 text-blue-600 hover:underline">
                    Kembali ke Payments
                </Link>
            </div>
        )
    }
    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link href="/dashboard/finance/payments" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Kembali ke Payments
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payment {payment.id}</h1>
                    <p className="text-gray-500 mt-1">{payment.paymentDate}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusConfig[payment.status].color}`}>
                        {statusConfig[payment.status].label}
                    </span>
                    <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Print Receipt
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Payment Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detail Pembayaran</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">ID Pembayaran</p>
                                <p className="font-medium text-gray-900">{payment.id}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Invoice</p>
                                <Link href={`/dashboard/finance/invoices/${payment.invoiceNumber}`} className="font-medium text-blue-600 hover:underline">
                                    {payment.invoiceNumber}
                                </Link>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Customer</p>
                                <p className="font-medium text-gray-900">{payment.customerName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Jumlah</p>
                                <p className="text-xl font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Metode Pembayaran</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Metode</p>
                                <p className="font-medium text-gray-900">{payment.method}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Bank</p>
                                <p className="font-medium text-gray-900">{payment.bank}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Nomor Rekening</p>
                                <p className="font-medium text-gray-900 font-mono">{payment.accountNumber}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Notes */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Catatan</h3>
                        <p className="text-sm text-gray-600">{payment.notes}</p>
                    </div>

                    {/* Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Aksi</h3>
                        <div className="space-y-2">
                            <button className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Download Receipt
                            </button>
                            <button className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Kirim ke Customer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
