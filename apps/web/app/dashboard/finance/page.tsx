'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
    FileText,
    CheckCircle,
    Clock,
    AlertTriangle,
    ClipboardList,
    Banknote,
    ShoppingCart,
    Loader2,
    AlertCircle,
    Inbox,
} from 'lucide-react'

interface Invoice {
    id: string
    invoiceNumber: string
    customerName: string
    total: number
    status: string
    dueDate: string
    createdAt: string
    paidAmount: number
}

interface Payment {
    id: string
    paymentNumber: string
    invoiceNumber: string
    customerName: string
    amount: number
    method: string
    status: string
    type: string
    date: string
    reference: string
    notes: string
}

export default function FinancePage() {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [payments, setPayments] = useState<Payment[]>([])
    const [invoiceTotal, setInvoiceTotal] = useState(0)

    useEffect(() => {
        async function fetchData() {
            try {
                const [invoicesRes, paymentsRes] = await Promise.all([
                    fetch('/api/finance/invoices?limit=100'),
                    fetch('/api/finance/payments?limit=100'),
                ])

                if (!invoicesRes.ok || !paymentsRes.ok) {
                    throw new Error('Gagal memuat data keuangan')
                }

                const invoicesJson = await invoicesRes.json()
                const paymentsJson = await paymentsRes.json()

                setInvoices(
                    invoicesJson.success && Array.isArray(invoicesJson.data)
                        ? invoicesJson.data
                        : []
                )
                setInvoiceTotal(invoicesJson.total || 0)
                setPayments(
                    paymentsJson.success && Array.isArray(paymentsJson.data)
                        ? paymentsJson.data
                        : []
                )
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : 'Gagal memuat data'
                )
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // Hitung summary dari data real
    const totalRevenue = payments
        .filter((p) => p.type === 'INCOME' && p.status === 'completed')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    const paidInvoices = invoices.filter((i) => i.status === 'paid')
    const totalPaid = paidInvoices.reduce(
        (sum, i) => sum + (Number(i.total) || 0),
        0
    )

    const outstandingInvoices = invoices.filter(
        (i) => i.status === 'pending' || i.status === 'overdue'
    )
    const totalOutstanding = outstandingInvoices.reduce(
        (sum, i) => sum + (Number(i.total) || 0) - (Number(i.paidAmount) || 0),
        0
    )

    const overdueInvoices = invoices.filter((i) => i.status === 'overdue')
    const totalOverdue = overdueInvoices.reduce(
        (sum, i) => sum + (Number(i.total) || 0) - (Number(i.paidAmount) || 0),
        0
    )

    // Cash flow dari payments
    const totalIncome = payments
        .filter((p) => p.type === 'INCOME' && p.status === 'completed')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    const totalExpense = payments
        .filter((p) => p.type === 'EXPENSE' && p.status === 'completed')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    const netCashFlow = totalIncome - totalExpense

    // Recent invoices (5 terbaru)
    const recentInvoices = invoices.slice(0, 5)

    // Recent payments (5 terbaru)
    const recentPayments = payments.slice(0, 5)

    const summaryCards = [
        {
            title: t('finance.overview.totalInvoice'),
            value: formatCurrency(invoiceTotal > 0 ? totalPaid + totalOutstanding : 0),
            icon: FileText,
            href: '/dashboard/finance/invoices',
        },
        {
            title: t('finance.overview.invoiceDibayar'),
            value: formatCurrency(totalPaid),
            icon: CheckCircle,
            href: '/dashboard/finance/invoices',
        },
        {
            title: t('finance.overview.outstanding'),
            value: formatCurrency(totalOutstanding),
            icon: Clock,
            href: '/dashboard/finance/invoices',
        },
        {
            title: t('finance.overview.overdue'),
            value: formatCurrency(totalOverdue),
            icon: AlertTriangle,
            href: '/dashboard/finance/invoices',
        },
    ]

    const quickActions = [
        { label: t('finance.overview.createInvoice'), icon: FileText, href: '/dashboard/finance/invoices', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400' },
        { label: t('finance.overview.createQuotation'), icon: ClipboardList, href: '/dashboard/finance/quotations', color: 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400' },
        { label: t('finance.overview.recordPayment'), icon: Banknote, href: '/dashboard/finance/payments', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400' },
        { label: t('finance.overview.createPO'), icon: ShoppingCart, href: '/dashboard/finance/purchase-orders', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400' },
    ]

    const statusStyles: Record<string, string> = {
        paid: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        overdue: 'bg-red-100 text-red-800',
        draft: 'bg-gray-100 text-gray-800',
    }

    const statusLabels: Record<string, string> = {
        paid: t('finance.overview.statusPaid'),
        pending: t('finance.overview.statusPending'),
        overdue: t('finance.overview.statusOverdue'),
        draft: 'Draft',
    }

    // Loading state
    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                            <div className="h-7 w-32 bg-gray-200 rounded animate-pulse mt-2" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                            <div className="p-4">
                                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-4" />
                                {Array.from({ length: 5 }).map((_, j) => (
                                    <div key={j} className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('finance.overview.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t('finance.overview.subtitle')}</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('finance.overview.title')}</h1>
                <p className="text-gray-500 dark:text-gray-400">{t('finance.overview.subtitle')}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {summaryCards.map((card) => {
                    const Icon = card.icon
                    return (
                        <Link
                            key={card.title}
                            href={card.href}
                            className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{card.title}</span>
                                <Icon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                            </div>
                            <p className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
                        </Link>
                    )
                })}
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('finance.overview.quickActions')}</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {quickActions.map((action) => {
                        const Icon = action.icon
                        return (
                            <Link
                                key={action.label}
                                href={action.href}
                                className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${action.color}`}
                            >
                                <Icon className="h-5 w-5" />
                                {action.label}
                            </Link>
                        )
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Recent Invoices */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('finance.overview.recentInvoices')}</h2>
                        <Link href="/dashboard/finance/invoices" className="text-sm text-blue-600 hover:underline">
                            {t('finance.overview.viewAll')}
                        </Link>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {recentInvoices.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                                <Inbox className="h-8 w-8 mb-2" />
                                <p className="text-sm">Belum ada invoice</p>
                            </div>
                        ) : (
                            recentInvoices.map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{inv.invoiceNumber}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{inv.customerName} · {formatDate(inv.createdAt)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(Number(inv.total))}</p>
                                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[inv.status] || 'bg-gray-100 text-gray-800'}`}>
                                            {statusLabels[inv.status] || inv.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Payments */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('finance.overview.recentPayments')}</h2>
                        <Link href="/dashboard/finance/payments" className="text-sm text-blue-600 hover:underline">
                            {t('finance.overview.viewAll')}
                        </Link>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {recentPayments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                                <Inbox className="h-8 w-8 mb-2" />
                                <p className="text-sm">Belum ada pembayaran</p>
                            </div>
                        ) : (
                            recentPayments.map((pay) => (
                                <div key={pay.id} className="flex items-center justify-between px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {pay.invoiceNumber !== '-' ? `Pembayaran ${pay.invoiceNumber}` : pay.reference || pay.paymentNumber}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{pay.customerName} · {formatDate(pay.date)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-semibold ${pay.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                            {pay.type === 'INCOME' ? '+' : '-'} {formatCurrency(Number(pay.amount))}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Cash Flow Summary */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">{t('finance.overview.cashFlowSummary')}</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                        <p className="text-sm text-green-700 dark:text-green-400">{t('finance.overview.totalIncome')}</p>
                        <p className="mt-1 text-2xl font-bold text-green-800 dark:text-green-300">{formatCurrency(totalIncome)}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                        <p className="text-sm text-red-700 dark:text-red-400">{t('finance.overview.totalExpense')}</p>
                        <p className="mt-1 text-2xl font-bold text-red-800 dark:text-red-300">{formatCurrency(totalExpense)}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                        <p className="text-sm text-blue-700 dark:text-blue-400">{t('finance.overview.netCashFlow')}</p>
                        <p className={`mt-1 text-2xl font-bold ${netCashFlow >= 0 ? 'text-blue-800 dark:text-blue-300' : 'text-red-800 dark:text-red-300'}`}>
                            {formatCurrency(netCashFlow)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
