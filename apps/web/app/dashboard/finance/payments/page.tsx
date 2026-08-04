'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

type Payment = {
    id: string
    paymentNumber: string
    invoiceId: string
    invoiceNumber: string
    customerName: string
    amount: number
    method: string
    status: 'completed' | 'pending' | 'failed'
    date: string
    reference: string
    notes: string
    createdAt: string
}

export default function PaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
    const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending' | 'failed'>('all')
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchPayments()
    }, [])

    const fetchPayments = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/finance/payments')
            const data = await response.json()
            if (data.success) {
                setPayments(data.data)
            } else {
                setError('Gagal memuat data pembayaran')
            }
        } catch {
            setError('Terjadi kesalahan saat memuat data')
        } finally {
            setLoading(false)
        }
    }

    const filteredPayments = payments.filter((p) => {
        const matchStatus = filterStatus === 'all' || p.status === filterStatus
        const matchSearch = searchQuery === '' ||
            p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
        return matchStatus && matchSearch
    })

    const totalIncome = payments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)
    const pendingAmount = payments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
    const failedAmount = payments.filter((p) => p.status === 'failed').reduce((sum, p) => sum + p.amount, 0)

    const stats = [
        { label: 'Total Pembayaran', value: formatCurrency(totalIncome), icon: '💰', color: 'text-green-600' },
        { label: 'Menunggu Konfirmasi', value: formatCurrency(pendingAmount), icon: '⏳', color: 'text-yellow-600' },
        { label: 'Gagal', value: formatCurrency(failedAmount), icon: '❌', color: 'text-red-600' },
        { label: 'Total Transaksi', value: payments.length.toString(), icon: '📊', color: 'text-blue-600' },
    ]

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-green-100 text-green-700">Selesai</span>
            case 'pending':
                return <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700">Menunggu</span>
            case 'failed':
                return <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-red-100 text-red-700">Gagal</span>
            default:
                return <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700">{status}</span>
        }
    }

    const getMethodLabel = (method: string) => {
        const methods: Record<string, string> = {
            bank_transfer: 'Transfer Bank',
            credit_card: 'Kartu Kredit',
            ewallet: 'E-Wallet',
            cash: 'Tunai',
        }
        return methods[method] || method
    }

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                        onClick={fetchPayments}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pembayaran</h1>
                    <p className="text-gray-500">Kelola semua transaksi pembayaran</p>
                </div>
                <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Catat Pembayaran
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{stat.icon}</span>
                            <div>
                                <p className="text-sm text-gray-500">{stat.label}</p>
                                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Cari pembayaran..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                </div>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                    <option value="all">Semua Tipe</option>
                    <option value="income">Pemasukan</option>
                    <option value="expense">Pengeluaran</option>
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as 'all' | 'completed' | 'pending' | 'failed')}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                    <option value="all">Semua Status</option>
                    <option value="completed">Selesai</option>
                    <option value="pending">Menunggu</option>
                    <option value="failed">Gagal</option>
                </select>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 font-medium text-gray-500">Nomor</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Tanggal</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Kontak</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Metode</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Referensi</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Invoice</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Jumlah</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-500">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                                        Tidak ada pembayaran ditemukan
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <Link href={`/dashboard/finance/payments/${payment.id}`} className="font-medium text-blue-600 hover:underline">
                                                {payment.paymentNumber}
                                            </Link>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3">{formatDate(payment.date)}</td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <div className="font-medium">{payment.customerName}</div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3">{getMethodLabel(payment.method)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{payment.reference}</td>
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <Link href={`/dashboard/finance/invoices/${payment.invoiceId}`} className="text-blue-600 hover:underline">
                                                {payment.invoiceNumber}
                                            </Link>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatCurrency(payment.amount)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">{getStatusBadge(payment.status)}</td>
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
