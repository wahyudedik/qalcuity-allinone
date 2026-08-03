'use client'

import { useState } from 'react'

type Payment = {
    id: string
    date: string
    contact: string
    contactType: 'customer' | 'supplier'
    method: string
    reference: string
    invoiceRef: string
    amount: number
    status: 'completed' | 'pending' | 'failed'
    notes: string
}

const MOCK_PAYMENTS: Payment[] = [
    {
        id: 'PAY-001',
        date: '2026-08-03',
        contact: 'PT Maju Jaya',
        contactType: 'customer',
        method: 'Transfer Bank (BCA)',
        reference: 'TRF-20260803-001',
        invoiceRef: 'INV-2026-001',
        amount: 15500000,
        status: 'completed',
        notes: 'Pembayaran invoice INV-2026-001',
    },
    {
        id: 'PAY-002',
        date: '2026-08-02',
        contact: 'CV Berkah',
        contactType: 'customer',
        method: 'Transfer Bank (Mandiri)',
        reference: 'TRF-20260802-001',
        invoiceRef: 'INV-2026-003',
        amount: 8250000,
        status: 'completed',
        notes: 'Pembayaran sebagian invoice INV-2026-003',
    },
    {
        id: 'PAY-003',
        date: '2026-08-01',
        contact: 'PT Supplier ABC',
        contactType: 'supplier',
        method: 'Transfer Bank (BNI)',
        reference: 'TRF-20260801-001',
        invoiceRef: 'PO-2026-012',
        amount: 25000000,
        status: 'completed',
        notes: 'Pembayaran PO-2026-012',
    },
    {
        id: 'PAY-004',
        date: '2026-07-31',
        contact: 'PT Sejahtera',
        contactType: 'customer',
        method: 'QRIS',
        reference: 'QRIS-20260731-001',
        invoiceRef: 'INV-2026-005',
        amount: 5000000,
        status: 'pending',
        notes: 'Menunggu konfirmasi bank',
    },
    {
        id: 'PAY-005',
        date: '2026-07-30',
        contact: 'CV Supplier XYZ',
        contactType: 'supplier',
        method: 'Transfer Bank (BSI)',
        reference: 'TRF-20260730-001',
        invoiceRef: 'PO-2026-010',
        amount: 12000000,
        status: 'failed',
        notes: 'Saldo tidak mencukupi',
    },
    {
        id: 'PAY-006',
        date: '2026-07-29',
        contact: 'PT Berkah Jaya',
        contactType: 'customer',
        method: 'Transfer Bank (BCA)',
        reference: 'TRF-20260729-001',
        invoiceRef: 'INV-2026-008',
        amount: 32000000,
        status: 'completed',
        notes: 'Pembayaran lunas',
    },
    {
        id: 'PAY-007',
        date: '2026-07-28',
        contact: 'PT Abadi Sentosa',
        contactType: 'customer',
        method: 'Transfer Bank (Mandiri)',
        reference: 'TRF-20260728-001',
        invoiceRef: 'INV-2026-009',
        amount: 7500000,
        status: 'completed',
        notes: 'Pembayaran partial',
    },
]

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)

const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr))

export default function PaymentsPage() {
    const [payments] = useState<Payment[]>(MOCK_PAYMENTS)
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
    const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending' | 'failed'>('all')
    const [searchQuery, setSearchQuery] = useState('')

    const filteredPayments = payments.filter((p) => {
        const matchType = filterType === 'all' || (filterType === 'income' && p.contactType === 'customer') || (filterType === 'expense' && p.contactType === 'supplier')
        const matchStatus = filterStatus === 'all' || p.status === filterStatus
        const matchSearch = searchQuery === '' || p.contact.toLowerCase().includes(searchQuery.toLowerCase()) || p.reference.toLowerCase().includes(searchQuery.toLowerCase()) || p.invoiceRef.toLowerCase().includes(searchQuery.toLowerCase())
        return matchType && matchStatus && matchSearch
    })

    const totalIncome = payments.filter((p) => p.contactType === 'customer' && p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)
    const totalExpense = payments.filter((p) => p.contactType === 'supplier' && p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)
    const pendingAmount = payments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
    const failedAmount = payments.filter((p) => p.status === 'failed').reduce((sum, p) => sum + p.amount, 0)

    const stats = [
        { label: 'Total Pemasukan', value: formatCurrency(totalIncome), icon: '💰', color: 'text-green-600' },
        { label: 'Total Pengeluaran', value: formatCurrency(totalExpense), icon: '📤', color: 'text-blue-600' },
        { label: 'Menunggu Konfirmasi', value: formatCurrency(pendingAmount), icon: '⏳', color: 'text-yellow-600' },
        { label: 'Gagal', value: formatCurrency(failedAmount), icon: '❌', color: 'text-red-600' },
    ]

    const statusStyles: Record<string, string> = {
        completed: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        failed: 'bg-red-100 text-red-800',
    }

    const statusLabels: Record<string, string> = {
        completed: 'Selesai',
        pending: 'Menunggu',
        failed: 'Gagal',
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pembayaran</h1>
                    <p className="text-gray-500">Kelola semua transaksi masuk dan keluar</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                    <span>＋</span>
                    Catat Pembayaran
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">{stat.label}</span>
                            <span className="text-2xl">{stat.icon}</span>
                        </div>
                        <p className={`mt-1 text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Cari berdasarkan nama, referensi, atau invoice..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                    <option value="all">Semua Jenis</option>
                    <option value="income">Pemasukan</option>
                    <option value="expense">Pengeluaran</option>
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                    <option value="all">Semua Status</option>
                    <option value="completed">Selesai</option>
                    <option value="pending">Menunggu</option>
                    <option value="failed">Gagal</option>
                </select>
            </div>

            {/* Payments Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 font-medium text-gray-600">ID</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Tanggal</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Kontak</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Metode</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Referensi</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Invoice/PO</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Jumlah</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Catatan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-4xl">💸</span>
                                            <p>Belum ada data pembayaran</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">{payment.id}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatDate(payment.date)}</td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium text-gray-900">{payment.contact}</p>
                                                <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${payment.contactType === 'customer' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                    {payment.contactType === 'customer' ? 'Customer' : 'Supplier'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">{payment.method}</td>
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">{payment.reference}</td>
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-blue-600">{payment.invoiceRef}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <span className={`font-semibold ${payment.contactType === 'customer' ? 'text-green-600' : 'text-red-600'}`}>
                                                {payment.contactType === 'customer' ? '+' : '-'} {formatCurrency(payment.amount)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[payment.status]}`}>
                                                {statusLabels[payment.status]}
                                            </span>
                                        </td>
                                        <td className="max-w-[200px] truncate px-4 py-3 text-gray-500">{payment.notes}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-sm text-gray-500">
                        Menampilkan {filteredPayments.length} dari {payments.length} pembayaran
                    </p>
                    <div className="flex gap-1">
                        <button className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-100">&laquo; Prev</button>
                        <button className="rounded border border-blue-600 bg-blue-600 px-3 py-1 text-sm text-white">1</button>
                        <button className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-100">2</button>
                        <button className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-100">Next &raquo;</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
