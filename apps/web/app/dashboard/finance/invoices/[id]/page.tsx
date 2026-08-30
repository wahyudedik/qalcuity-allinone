'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { ArrowLeft, Printer, Send, CheckCircle, RotateCcw, FileText, XCircle, CreditCard, Smartphone, QrCode, Building2 } from 'lucide-react'

interface InvoiceDetail {
    id: string
    invoiceNumber: string
    customerName: string
    customerAddress: string
    customerEmail: string
    customerPhone: string
    items: Array<{ name: string; description: string; quantity: number; unitPrice: number; total: number }>
    subtotal: number
    tax: number
    total: number
    currency: string
    status: string
    dueDate: string
    createdAt: string
    notes: string
}

const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
    sent: { label: 'Terkirim', color: 'bg-blue-100 text-blue-700' },
    paid: { label: 'Lunas', color: 'bg-green-100 text-green-700' },
    overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700' },
}

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
    const { t } = useTranslation()
    const [showSendModal, setShowSendModal] = useState(false)
    const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                setLoading(true)
                const res = await fetch(`/api/finance/invoices/${params.id}`)
                const data = await res.json()
                if (data.success) {
                    setInvoice(data.data)
                } else {
                    setError(t('finance.invoiceDetail.error'))
                }
            } catch {
                setError(t('finance.invoiceDetail.errorLoad'))
            } finally {
                setLoading(false)
            }
        }
        fetchInvoice()
    }, [params.id, t])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
                <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
            </div>
        )
    }

    if (error || !invoice) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500">{error || t('finance.invoiceDetail.error')}</p>
                <Link href="/dashboard/finance/invoices" className="mt-4 text-blue-600 hover:underline">
                    {t('finance.invoiceDetail.backToInvoices')}
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/finance/invoices" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">{invoice.id}</h1>
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[invoice.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                                {statusConfig[invoice.status]?.label || invoice.status}
                            </span>
                        </div>
                        <p className="text-gray-600 mt-1">{t('finance.invoiceDetail.createdOn')} {invoice.createdAt}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                        <Printer className="h-4 w-4" />
                        {t('finance.invoiceDetail.print')}
                    </button>
                    <button
                        onClick={() => setShowSendModal(true)}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <Send className="h-4 w-4" />
                        {t('finance.invoiceDetail.sendInvoice')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Invoice Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Invoice Header */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                                        <span className="text-white font-bold text-xl">Q</span>
                                    </div>
                                    <span className="text-xl font-bold text-gray-900">Qalcuity</span>
                                </div>
                                <div className="text-sm text-gray-600">
                                    <p>PT Qalcuity</p>
                                    <p>Jl. Teknologi No. 123</p>
                                    <p>Jakarta Selatan, 12190</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('finance.invoiceDetail.invoice')}</h2>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p><span className="font-medium">{t('finance.invoiceDetail.number')}:</span> {invoice.id}</p>
                                    <p><span className="font-medium">{t('finance.invoiceDetail.date')}:</span> {invoice.createdAt}</p>
                                    <p><span className="font-medium">{t('finance.invoiceDetail.dueDate')}:</span> {invoice.dueDate}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bill To */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">{t('finance.invoiceDetail.billTo')}</h3>
                        <div className="text-gray-900">
                            <Link href="/dashboard/crm/contacts" className="font-semibold text-blue-600 hover:underline">{invoice.customerName}</Link>
                            <p className="text-sm text-gray-600">{invoice.customerEmail}</p>
                            <p className="text-sm text-gray-600">{invoice.customerPhone}</p>
                            <p className="text-sm text-gray-600">{invoice.customerAddress}</p>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">{t('finance.invoiceDetail.description')}</th>
                                        <th className="text-center py-3 px-6 text-sm font-medium text-gray-600">{t('finance.invoiceDetail.qty')}</th>
                                        <th className="text-right py-3 px-6 text-sm font-medium text-gray-600">{t('finance.invoiceDetail.price')}</th>
                                        <th className="text-right py-3 px-6 text-sm font-medium text-gray-600">{t('finance.invoiceDetail.total')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {invoice.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="py-4 px-6 text-sm text-gray-900">{item.name} - {item.description}</td>
                                            <td className="py-4 px-6 text-sm text-gray-600 text-center">{item.quantity}</td>
                                            <td className="py-4 px-6 text-sm text-gray-600 text-right">{formatCurrency(Number(item.unitPrice))}</td>
                                            <td className="py-4 px-6 text-sm text-gray-900 text-right font-medium">{formatCurrency(Number(item.total))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                            <div className="flex justify-end">
                                <div className="w-64 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">{t('finance.invoiceDetail.subtotal')}</span>
                                        <span className="text-gray-900">{formatCurrency(Number(invoice.subtotal))}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">{t('finance.invoiceDetail.tax')}</span>
                                        <span className="text-gray-900">{formatCurrency(Number(invoice.tax))}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                                        <span className="text-gray-900">{t('finance.invoiceDetail.grandTotal')}</span>
                                        <span className="text-blue-600">{formatCurrency(Number(invoice.total))}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-medium text-gray-900 mb-4">Metode Pembayaran Tersedia</h3>
                        <p className="text-sm text-gray-500 mb-4">Customer dapat membayar invoice ini menggunakan metode berikut:</p>

                        {/* Virtual Account */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Building2 className="h-4 w-4 text-blue-600" />
                                <h4 className="text-sm font-medium text-gray-900">Virtual Account</h4>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {['BCA', 'Mandiri', 'BNI', 'BRI'].map((bank) => (
                                    <div key={bank} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                        <CreditCard className="h-4 w-4 text-gray-500" />
                                        <span className="text-sm text-gray-700">{bank}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Credit Card */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <CreditCard className="h-4 w-4 text-purple-600" />
                                <h4 className="text-sm font-medium text-gray-900">Kartu Kredit / Debit</h4>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                <span className="text-sm text-gray-700">Visa, Mastercard, JCB — via Midtrans/Xendit</span>
                            </div>
                        </div>

                        {/* E-Wallet */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Smartphone className="h-4 w-4 text-green-600" />
                                <h4 className="text-sm font-medium text-gray-900">E-Wallet</h4>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {['GoPay', 'OVO', 'Dana', 'ShopeePay'].map((wallet) => (
                                    <div key={wallet} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                        <Smartphone className="h-4 w-4 text-gray-500" />
                                        <span className="text-sm text-gray-700">{wallet}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* QRIS */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <QrCode className="h-4 w-4 text-indigo-600" />
                                <h4 className="text-sm font-medium text-gray-900">QRIS</h4>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                <QrCode className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-700">Scan QRIS dari semua bank & e-wallet Indonesia</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes & Terms */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="font-medium text-gray-900 mb-2">{t('finance.invoiceDetail.notes')}</h3>
                            <p className="text-sm text-gray-600">{invoice.notes}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="font-medium text-gray-900 mb-2">{t('finance.invoiceDetail.additionalInfo')}</h3>
                            <p className="text-sm text-gray-600">{t('finance.invoiceDetail.invoiceNumber')}: {invoice.invoiceNumber}</p>
                            <p className="text-sm text-gray-600">{t('finance.invoiceDetail.currency')}: {invoice.currency}</p>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Status */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-medium text-gray-900 mb-4">{t('finance.invoiceDetail.statusInvoice')}</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-900">{t('finance.invoiceDetail.created')}</div>
                                    <div className="text-xs text-gray-500">3 Agustus 2026, 09:30</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Send className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-900">{t('finance.invoiceDetail.sent')}</div>
                                    <div className="text-xs text-gray-500">3 Agustus 2026, 09:35</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                    <div className="w-3 h-3 bg-gray-300 rounded-full" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-400">{t('finance.invoiceDetail.paid')}</div>
                                    <div className="text-xs text-gray-400">{t('finance.invoiceDetail.waitingPayment')}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-medium text-gray-900 mb-4">Aksi</h3>
                        <div className="space-y-2">
                            <button className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                {t('finance.invoiceDetail.recordPayment')}
                            </button>
                            <button className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                                <RotateCcw className="h-4 w-4" />
                                {t('finance.invoiceDetail.resend')}
                            </button>
                            <button className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                                <FileText className="h-4 w-4" />
                                {t('finance.invoiceDetail.downloadPDF')}
                            </button>
                            <button className="w-full px-4 py-2.5 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                                <XCircle className="h-4 w-4" />
                                {t('finance.invoiceDetail.cancelInvoice')}
                            </button>
                        </div>
                    </div>

                    {/* Activity */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-medium text-gray-900 mb-4">{t('finance.invoiceDetail.activity')}</h3>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                                <div>
                                    <div className="text-sm text-gray-900">{t('finance.invoiceDetail.activitySent')} finance@majubersama.com</div>
                                    <div className="text-xs text-gray-500">3 Agustus 2026, 09:35</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                                <div>
                                    <div className="text-sm text-gray-900">{t('finance.invoiceDetail.activityCreated')} Budi Santoso</div>
                                    <div className="text-xs text-gray-500">3 Agustus 2026, 09:30</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Send Modal */}
            {showSendModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowSendModal(false)} />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('finance.invoiceDetail.sendModalTitle')}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('finance.invoiceDetail.emailLabel')}</label>
                                <input
                                    type="email"
                                    defaultValue="finance@majubersama.com"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('finance.invoiceDetail.messageLabel')}</label>
                                <textarea
                                    rows={3}
                                    placeholder={t('finance.invoiceDetail.messagePlaceholder')}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowSendModal(false)}
                                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    {t('finance.invoiceDetail.cancel')}
                                </button>
                                <button className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                                    {t('finance.invoiceDetail.send')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
