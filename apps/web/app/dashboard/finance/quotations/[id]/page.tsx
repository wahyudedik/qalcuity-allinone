'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Printer, Send, FileText, Copy, ArrowRight, Loader2 } from 'lucide-react'

interface QuotationDetail {
    id: string
    quotationNumber: string
    customerName: string
    customerAddress: string
    customerEmail: string
    items: Array<{ name: string; description: string; quantity: number; unitPrice: number; total: number }>
    subtotal: number
    tax: number
    total: number
    currency: string
    status: string
    validUntil: string
    createdAt: string
    notes: string
}

const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    expired: 'bg-gray-100 text-gray-500',
}

export default function QuotationDetailPage({ params }: { params: { id: string } }) {
    const { t } = useTranslation()
    const router = useRouter()
    const [quotation, setQuotation] = useState<QuotationDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showSendModal, setShowSendModal] = useState(false)
    const [showConvertConfirm, setShowConvertConfirm] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        const fetchQuotation = async () => {
            try {
                setLoading(true)
                const res = await fetch(`/api/finance/quotations/${params.id}`)
                const data = await res.json()
                if (data.success) {
                    setQuotation(data.data)
                } else {
                    setError(t('finance.quotationsDetail.error'))
                }
            } catch {
                setError(t('finance.quotationsDetail.errorLoad'))
            } finally {
                setLoading(false)
            }
        }
        fetchQuotation()
    }, [params.id, t])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const handlePrint = () => {
        window.print()
    }

    const handleEdit = () => {
        router.push(`/dashboard/finance/quotations/${params.id}/edit`)
    }

    const handleSendToCustomer = async () => {
        try {
            setProcessing(true)
            const res = await fetch(`/api/finance/quotations/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'sent' }),
            })
            const data = await res.json()
            if (data.success) {
                setQuotation(prev => prev ? { ...prev, status: 'sent' } : prev)
                setToast({ message: t('finance.quotationsDetail.toastSent'), type: 'success' })
                setShowSendModal(false)
            } else {
                setToast({ message: data.error || t('finance.quotationsDetail.toastSendFailed'), type: 'error' })
            }
        } catch {
            setToast({ message: t('finance.quotationsDetail.toastSendFailed'), type: 'error' })
        } finally {
            setProcessing(false)
        }
    }

    const handleDuplicate = async () => {
        try {
            setProcessing(true)
            const res = await fetch(`/api/finance/quotations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...quotation,
                    status: 'draft',
                    id: undefined,
                    quotationNumber: undefined,
                }),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: t('finance.quotationsDetail.toastDuplicated'), type: 'success' })
                router.push(`/dashboard/finance/quotations/${data.data.id}`)
            } else {
                setToast({ message: data.error || t('finance.quotationsDetail.toastDuplicateFailed'), type: 'error' })
            }
        } catch {
            setToast({ message: t('finance.quotationsDetail.toastDuplicateFailed'), type: 'error' })
        } finally {
            setProcessing(false)
        }
    }

    const handleConvertToInvoice = async () => {
        try {
            setProcessing(true)
            const res = await fetch(`/api/finance/quotations/${params.id}/convert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: t('finance.quotationsDetail.toastConverted'), type: 'success' })
                setShowConvertConfirm(false)
                router.push(`/dashboard/finance/invoices/${data.data.invoiceId}`)
            } else {
                setToast({ message: data.error || t('finance.quotationsDetail.toastConvertFailed'), type: 'error' })
            }
        } catch {
            setToast({ message: t('finance.quotationsDetail.toastConvertFailed'), type: 'error' })
        } finally {
            setProcessing(false)
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
                <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
            </div>
        )
    }

    if (error || !quotation) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500">{error || t('finance.quotationsDetail.error')}</p>
                <Link href="/dashboard/finance/quotations" className="mt-4 text-blue-600 hover:underline">
                    {t('finance.quotationsDetail.backToQuotations')}
                </Link>
            </div>
        )
    }

    const getStatusLabel = (status: string) => {
        return t(`finance.quotations.filter.${status}`)
    }

    const canEdit = quotation.status === 'draft'
    const canSend = quotation.status === 'draft'
    const canConvert = quotation.status === 'accepted' || quotation.status === 'sent'

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                    {toast.message}
                </div>
            )}

            {/* Back Button */}
            <Link href="/dashboard/finance/quotations" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4" />
                {t('finance.quotationsDetail.backToQuotations')}
            </Link>

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('finance.quotationsDetail.title')} {quotation.id}</h1>
                    <p className="text-gray-500 mt-1">{t('finance.quotationsDetail.createdAt')} {quotation.createdAt}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusColors[quotation.status] || 'bg-gray-100 text-gray-700'}`}>
                        {getStatusLabel(quotation.status)}
                    </span>
                    <button
                        onClick={handlePrint}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <Printer className="h-4 w-4" />
                        {t('finance.quotationsDetail.print')}
                    </button>
                    {canSend && (
                        <button
                            onClick={() => setShowSendModal(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Send className="h-4 w-4" />
                            {t('finance.quotationsDetail.sendToCustomer')}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Customer Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('finance.quotationsDetail.customerInfo')}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">{t('finance.quotationsDetail.companyName')}</p>
                                <Link href="/dashboard/crm/contacts" className="font-medium text-blue-600 hover:underline">{quotation.customerName}</Link>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('finance.quotationsDetail.email')}</p>
                                <p className="font-medium text-gray-900">{quotation.customerEmail}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('finance.quotationsDetail.createdDate')}</p>
                                <p className="font-medium text-gray-900">{quotation.createdAt}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('finance.quotationsDetail.validUntil')}</p>
                                <p className="font-medium text-gray-900">{quotation.validUntil}</p>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('finance.quotationsDetail.quotationItems')}</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-y border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('finance.quotationsDetail.description')}</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('finance.quotationsDetail.qty')}</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('finance.quotationsDetail.unitPrice')}</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('finance.quotationsDetail.total')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {quotation.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 text-center">{item.quantity}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 text-right">{formatCurrency(Number(item.unitPrice))}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">{formatCurrency(Number(item.quantity) * Number(item.unitPrice))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Totals */}
                        <div className="border-t border-gray-200 bg-gray-50 p-6">
                            <div className="ml-auto w-72 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">{t('finance.quotationsDetail.subtotal')}</span>
                                    <span className="font-medium">{formatCurrency(Number(quotation.subtotal))}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">{t('finance.quotationsDetail.tax')}</span>
                                    <span className="font-medium">{formatCurrency(Number(quotation.tax))}</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-300 pt-2">
                                    <span className="font-semibold text-gray-900">{t('finance.quotationsDetail.total')}</span>
                                    <span className="text-lg font-bold text-gray-900">{formatCurrency(Number(quotation.total))}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Notes */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('finance.quotationsDetail.notes')}</h3>
                        <p className="text-sm text-gray-600">{quotation.notes}</p>
                    </div>

                    {/* Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('finance.quotationsDetail.actions')}</h3>
                        <div className="space-y-2">
                            {canEdit && (
                                <button
                                    onClick={handleEdit}
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    <FileText className="h-4 w-4" />
                                    {t('finance.quotationsDetail.editQuotation')}
                                </button>
                            )}
                            <button
                                onClick={handleDuplicate}
                                disabled={processing}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                                {t('finance.quotationsDetail.duplicate')}
                            </button>
                            {canConvert && (
                                <button
                                    onClick={() => setShowConvertConfirm(true)}
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
                                >
                                    <ArrowRight className="h-4 w-4" />
                                    {t('finance.quotationsDetail.convertToInvoice')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Send Modal */}
            {showSendModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowSendModal(false)} />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('finance.quotationsDetail.sendConfirmTitle')}</h3>
                        <p className="text-sm text-gray-600 mb-6">{t('finance.quotationsDetail.sendConfirmMessage')}</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowSendModal(false)}
                                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleSendToCustomer}
                                disabled={processing}
                                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                                {t('common.send')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Convert Confirmation Modal */}
            {showConvertConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowConvertConfirm(false)} />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('finance.quotationsDetail.convertConfirmTitle')}</h3>
                        <p className="text-sm text-gray-600 mb-6">{t('finance.quotationsDetail.convertConfirmMessage')}</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConvertConfirm(false)}
                                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleConvertToInvoice}
                                disabled={processing}
                                className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                                {t('common.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
