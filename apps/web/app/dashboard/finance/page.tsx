'use client'

import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import {
    FileText,
    CheckCircle,
    Clock,
    AlertTriangle,
    ClipboardList,
    Banknote,
    ShoppingCart,
    type LucideIcon,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function FinancePage() {
    const { t } = useTranslation()

    const summaryCards = [
        {
            title: t('finance.overview.totalInvoice'),
            value: 'Rp 856.750.000',
            change: '+12.5%',
            changeType: 'positive',
            icon: FileText,
            href: '/dashboard/finance/invoices',
        },
        {
            title: t('finance.overview.invoiceDibayar'),
            value: 'Rp 625.000.000',
            change: '+8.3%',
            changeType: 'positive',
            icon: CheckCircle,
            href: '/dashboard/finance/invoices',
        },
        {
            title: t('finance.overview.outstanding'),
            value: 'Rp 231.750.000',
            change: '+22.1%',
            changeType: 'negative',
            icon: Clock,
            href: '/dashboard/finance/invoices',
        },
        {
            title: t('finance.overview.overdue'),
            value: 'Rp 47.000.000',
            change: '+15.0%',
            changeType: 'negative',
            icon: AlertTriangle,
            href: '/dashboard/finance/invoices',
        },
    ]

    const recentInvoices = [
        { id: 'INV-2026-001', customer: 'PT Maju Jaya', amount: 15500000, status: 'paid', date: '3 Agt 2026' },
        { id: 'INV-2026-002', customer: 'CV Berkah', amount: 8250000, status: 'paid', date: '2 Agt 2026' },
        { id: 'INV-2026-003', customer: 'PT Sejahtera', amount: 23000000, status: 'overdue', date: '1 Agt 2026' },
        { id: 'INV-2026-004', customer: 'PT Abadi Sentosa', amount: 7500000, status: 'pending', date: '31 Jul 2026' },
        { id: 'INV-2026-005', customer: 'CV Berkah Jaya', amount: 32000000, status: 'paid', date: '29 Jul 2026' },
    ]

    const recentPayments = [
        { id: 'PAY-001', description: 'Pembayaran dari PT Maju Jaya', amount: 15500000, type: 'income', date: '3 Agt 2026' },
        { id: 'PAY-002', description: 'Pembayaran dari CV Berkah', amount: 8250000, type: 'income', date: '2 Agt 2026' },
        { id: 'PAY-003', description: 'Pembayaran ke PT Supplier ABC', amount: 25000000, type: 'expense', date: '1 Agt 2026' },
        { id: 'PAY-004', description: 'Pembayaran dari PT Sejahtera', amount: 5000000, type: 'income', date: '31 Jul 2026' },
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
    }

    const statusLabels: Record<string, string> = {
        paid: t('finance.overview.statusPaid'),
        pending: t('finance.overview.statusPending'),
        overdue: t('finance.overview.statusOverdue'),
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
                            <p className={`mt-1 text-sm font-medium ${card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                                {card.change} {t('finance.overview.fromLastMonth')}
                            </p>
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
                        {recentInvoices.map((inv) => (
                            <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{inv.id}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{inv.customer} · {inv.date}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(inv.amount)}</p>
                                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[inv.status]}`}>
                                        {statusLabels[inv.status]}
                                    </span>
                                </div>
                            </div>
                        ))}
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
                        {recentPayments.map((pay) => (
                            <div key={pay.id} className="flex items-center justify-between px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{pay.description}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{pay.id} · {pay.date}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-semibold ${pay.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {pay.type === 'income' ? '+' : '-'} {formatCurrency(pay.amount)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Cash Flow Summary */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">{t('finance.overview.cashFlowSummary')}</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                        <p className="text-sm text-green-700 dark:text-green-400">{t('finance.overview.totalIncome')}</p>
                        <p className="mt-1 text-2xl font-bold text-green-800 dark:text-green-300">Rp 72.750.000</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                        <p className="text-sm text-red-700 dark:text-red-400">{t('finance.overview.totalExpense')}</p>
                        <p className="mt-1 text-2xl font-bold text-red-800 dark:text-red-300">Rp 45.500.000</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                        <p className="text-sm text-blue-700 dark:text-blue-400">{t('finance.overview.netCashFlow')}</p>
                        <p className="mt-1 text-2xl font-bold text-blue-800 dark:text-blue-300">Rp 27.250.000</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
