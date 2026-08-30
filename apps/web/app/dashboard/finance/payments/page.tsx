'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { Search, Plus, DollarSign, Clock, XCircle, BarChart3 } from 'lucide-react'
import { useSession } from 'next-auth/react'

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
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
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
                setError(t('finance.payments.error'))
            }
        } catch {
            setError(t('finance.payments.errorGeneric'))
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
        { label: t('finance.payments.stats.totalPayment'), value: formatCurrency(totalIncome), icon: <DollarSign className="h-6 w-6" />, color: 'text-green-600' },
        { label: t('finance.payments.stats.pendingConfirmation'), value: formatCurrency(pendingAmount), icon: <Clock className="h-6 w-6" />, color: 'text-yellow-600' },
        { label: t('finance.payments.stats.failed'), value: formatCurrency(failedAmount), icon: <XCircle className="h-6 w-6" />, color: 'text-red-600' },
        { label: t('finance.payments.stats.totalTransactions'), value: payments.length.toString(), icon: <BarChart3 className="h-6 w-6" />, color: 'text-blue-600' },
    ]

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-green-100 text-green-700">{t('finance.payments.statusCompleted')}</span>
            case 'pending':
                return <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700">{t('finance.payments.statusPending')}</span>
            case 'failed':
                return <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-red-100 text-red-700">{t('finance.payments.statusFailed')}</span>
            default:
                return <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700">{status}</span>
        }
    }

    const getMethodLabel = (method: string) => {
        const methods: Record<string, string> = {
            bank_transfer: t('finance.payments.methods.bank_transfer'),
            credit_card: t('finance.payments.methods.credit_card'),
            ewallet: t('finance.payments.methods.ewallet'),
            cash: t('finance.payments.methods.cash'),
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
                        {t('finance.payments.retry')}
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
                    <h1 className="text-2xl font-bold text-gray-900">{t('finance.payments.title')}</h1>
                    <p className="text-gray-500">{t('finance.payments.subtitle')}</p>
                </div>
                {canMutate && (
                    <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    <Plus className="h-4 w-4" />
                    {t('finance.payments.recordPayment')}
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex items-center gap-3">
                            <span className={stat.color}>{stat.icon}</span>
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
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('finance.payments.searchPlaceholder')}
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
                    <option value="all">{t('finance.payments.filter.allTypes')}</option>
                    <option value="income">{t('finance.payments.filter.income')}</option>
                    <option value="expense">{t('finance.payments.filter.expense')}</option>
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as 'all' | 'completed' | 'pending' | 'failed')}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                    <option value="all">{t('finance.payments.filter.allStatus')}</option>
                    <option value="completed">{t('finance.payments.filter.completed')}</option>
                    <option value="pending">{t('finance.payments.filter.pending')}</option>
                    <option value="failed">{t('finance.payments.filter.failed')}</option>
                </select>
            </div>

            {/* Kartu pembayaran untuk tampilan mobile */}
            <div className="md:hidden space-y-3">
                {filteredPayments.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                        {t('finance.payments.empty')}
                    </div>
                ) : (
                    filteredPayments.map((payment) => (
                        <div key={payment.id} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Link href={`/dashboard/finance/payments/${payment.id}`} className="font-medium text-blue-600 hover:underline">
                                        {payment.paymentNumber}
                                    </Link>
                                    <p className="text-sm text-gray-500">{payment.customerName}</p>
                                </div>
                                {getStatusBadge(payment.status)}
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500">{t('finance.payments.table.amount')}:</span>
                                    <span className="ml-1 font-medium">{formatCurrency(payment.amount)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('finance.payments.table.date')}:</span>
                                    <span className="ml-1">{formatDate(payment.date)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('finance.payments.table.method')}:</span>
                                    <span className="ml-1">{getMethodLabel(payment.method)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('finance.payments.table.invoice')}:</span>
                                    <Link href={`/dashboard/finance/invoices/${payment.invoiceId}`} className="ml-1 text-blue-600 hover:underline">
                                        {payment.invoiceNumber}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Tabel pembayaran untuk tampilan desktop */}
            <div className="hidden md:block rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 font-medium text-gray-500">{t('finance.payments.table.number')}</th>
                                <th className="hidden lg:table-cell px-4 py-3 font-medium text-gray-500">{t('finance.payments.table.date')}</th>
                                <th className="hidden md:table-cell px-4 py-3 font-medium text-gray-500">{t('finance.payments.table.contact')}</th>
                                <th className="hidden md:table-cell px-4 py-3 font-medium text-gray-500">{t('finance.payments.table.method')}</th>
                                <th className="hidden lg:table-cell px-4 py-3 font-medium text-gray-500">{t('finance.payments.table.reference')}</th>
                                <th className="hidden lg:table-cell px-4 py-3 font-medium text-gray-500">{t('finance.payments.table.invoice')}</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">{t('finance.payments.table.amount')}</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-500">{t('finance.payments.table.status')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                                        {t('finance.payments.empty')}
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
                                        <td className="hidden lg:table-cell whitespace-nowrap px-4 py-3">{formatDate(payment.date)}</td>
                                        <td className="hidden md:table-cell px-4 py-3">
                                            <div>
                                                <div className="font-medium">{payment.customerName}</div>
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell whitespace-nowrap px-4 py-3">{getMethodLabel(payment.method)}</td>
                                        <td className="hidden lg:table-cell whitespace-nowrap px-4 py-3 font-mono text-xs">{payment.reference}</td>
                                        <td className="hidden lg:table-cell whitespace-nowrap px-4 py-3">
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
