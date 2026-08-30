'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Printer, DollarSign, FileText, Download, Send } from 'lucide-react'

interface PaymentDetail {
    id: string
    paymentNumber: string
    invoiceNumber: string
    invoiceId: string
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

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    refunded: 'bg-gray-100 text-gray-700',
}

export default function PaymentDetailPage({ params }: { params: { id: string } }) {
    const { t } = useTranslation()
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
                    setError(t('finance.paymentDetail.notFound'))
                }
            } catch {
                setError(t('finance.paymentDetail.loadError'))
            } finally {
                setLoading(false)
            }
        }
        fetchPayment()
    }, [params.id, t])

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
                <p className="text-gray-500">{error || t('finance.paymentDetail.notFound')}</p>
                <Link href="/dashboard/finance/payments" className="mt-4 text-blue-600 hover:underline">
                    {t('finance.paymentDetail.backToPayments')}
                </Link>
            </div>
        )
    }

    const getStatusLabel = (status: string) => {
        const key = `finance.payments.status${status.charAt(0).toUpperCase() + status.slice(1)}`
        return t(key)
    }

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link href="/dashboard/finance/payments" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4" />
                {t('finance.paymentDetail.backToPayments')}
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('finance.paymentDetail.title')} {payment.id}</h1>
                    <p className="text-gray-500 mt-1">{payment.paymentDate}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusColors[payment.status] || 'bg-gray-100 text-gray-700'}`}>
                        {getStatusLabel(payment.status)}
                    </span>
                    <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        <Printer className="h-4 w-4" />
                        {t('finance.paymentDetail.printReceipt')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Payment Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('finance.paymentDetail.paymentInfo')}</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">{t('finance.paymentDetail.paymentId')}</p>
                                <p className="font-medium text-gray-900">{payment.id}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('finance.paymentDetail.invoice')}</p>
                                <Link href={`/dashboard/finance/invoices/${payment.invoiceId}`} className="font-medium text-blue-600 hover:underline">
                                    {payment.invoiceNumber}
                                </Link>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('finance.paymentDetail.customer')}</p>
                                <p className="font-medium text-gray-900">{payment.customerName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('finance.paymentDetail.amount')}</p>
                                <p className="text-xl font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('finance.paymentDetail.paymentMethod')}</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">{t('finance.paymentDetail.method')}</p>
                                <p className="font-medium text-gray-900">{payment.method}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('finance.paymentDetail.bank')}</p>
                                <p className="font-medium text-gray-900">{payment.bank}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('finance.paymentDetail.accountNumber')}</p>
                                <p className="font-medium text-gray-900 font-mono">{payment.accountNumber}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Notes */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('finance.paymentDetail.notes')}</h3>
                        <p className="text-sm text-gray-600">{payment.notes}</p>
                    </div>

                    {/* Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('finance.paymentDetail.actions')}</h3>
                        <div className="space-y-2">
                            <button className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                <Download className="h-4 w-4" />
                                {t('finance.paymentDetail.downloadReceipt')}
                            </button>
                            <button className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                <Send className="h-4 w-4" />
                                {t('finance.paymentDetail.sendToCustomer')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
