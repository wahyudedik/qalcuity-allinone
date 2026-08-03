'use client'

import { useState } from 'react'
import Link from 'next/link'

const invoiceData = {
    id: 'INV-2026-0092',
    status: 'sent',
    customer: {
        name: 'PT Maju Bersama',
        email: 'finance@majubersama.com',
        phone: '+62 21-5555-1234',
        address: 'Jl. Gatot Subroto No. 45, Jakarta Selatan',
    },
    items: [
        { description: 'Widget Pro x50', qty: 50, price: 100000, total: 5000000 },
        { description: 'Component B x20', qty: 20, price: 250000, total: 5000000 },
        { description: 'Service Installasi', qty: 1, price: 5500000, total: 5500000 },
    ],
    subtotal: 15500000,
    tax: 0,
    total: 15500000,
    dueDate: '2026-08-18',
    createdAt: '2026-08-03',
    notes: 'Pembayaran dapat ditransfer ke rekening BCA 1234567890 a.n PT Qalcuity',
    terms: 'Pembayaran jatuh tempo dalam 15 hari.',
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount)
}

const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
    sent: { label: 'Terkirim', color: 'bg-blue-100 text-blue-700' },
    paid: { label: 'Lunas', color: 'bg-green-100 text-green-700' },
    overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700' },
}

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
    const [showSendModal, setShowSendModal] = useState(false)
    const invoice = invoiceData

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/finance/invoices" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">{invoice.id}</h1>
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[invoice.status].color}`}>
                                {statusConfig[invoice.status].label}
                            </span>
                        </div>
                        <p className="text-gray-600 mt-1">Dibuat pada {invoice.createdAt}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print
                    </button>
                    <button
                        onClick={() => setShowSendModal(true)}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Kirim Invoice
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
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h2>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p><span className="font-medium">Nomor:</span> {invoice.id}</p>
                                    <p><span className="font-medium">Tanggal:</span> {invoice.createdAt}</p>
                                    <p><span className="font-medium">Jatuh Tempo:</span> {invoice.dueDate}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bill To */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Tagih Ke:</h3>
                        <div className="text-gray-900">
                            <p className="font-semibold">{invoice.customer.name}</p>
                            <p className="text-sm text-gray-600">{invoice.customer.email}</p>
                            <p className="text-sm text-gray-600">{invoice.customer.phone}</p>
                            <p className="text-sm text-gray-600">{invoice.customer.address}</p>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Deskripsi</th>
                                    <th className="text-center py-3 px-6 text-sm font-medium text-gray-600">Qty</th>
                                    <th className="text-right py-3 px-6 text-sm font-medium text-gray-600">Harga</th>
                                    <th className="text-right py-3 px-6 text-sm font-medium text-gray-600">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {invoice.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="py-4 px-6 text-sm text-gray-900">{item.description}</td>
                                        <td className="py-4 px-6 text-sm text-gray-600 text-center">{item.qty}</td>
                                        <td className="py-4 px-6 text-sm text-gray-600 text-right">{formatCurrency(item.price)}</td>
                                        <td className="py-4 px-6 text-sm text-gray-900 text-right font-medium">{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                            <div className="flex justify-end">
                                <div className="w-64 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Subtotal</span>
                                        <span className="text-gray-900">{formatCurrency(invoice.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Pajak (PPN 0%)</span>
                                        <span className="text-gray-900">{formatCurrency(invoice.tax)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                                        <span className="text-gray-900">Total</span>
                                        <span className="text-blue-600">{formatCurrency(invoice.total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes & Terms */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="font-medium text-gray-900 mb-2">Catatan</h3>
                            <p className="text-sm text-gray-600">{invoice.notes}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="font-medium text-gray-900 mb-2">Syarat & Ketentuan</h3>
                            <p className="text-sm text-gray-600">{invoice.terms}</p>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Status */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-medium text-gray-900 mb-4">Status Invoice</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-900">Dibuat</div>
                                    <div className="text-xs text-gray-500">3 Agustus 2026, 09:30</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-900">Dikirim</div>
                                    <div className="text-xs text-gray-500">3 Agustus 2026, 09:35</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                    <div className="w-3 h-3 bg-gray-300 rounded-full" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-400">Dibayar</div>
                                    <div className="text-xs text-gray-400">Menunggu pembayaran</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-medium text-gray-900 mb-4">Aksi</h3>
                        <div className="space-y-2">
                            <button className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Catat Pembayaran
                            </button>
                            <button className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Kirim Ulang
                            </button>
                            <button className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Download PDF
                            </button>
                            <button className="w-full px-4 py-2.5 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Batalkan Invoice
                            </button>
                        </div>
                    </div>

                    {/* Activity */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-medium text-gray-900 mb-4">Aktivitas</h3>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                                <div>
                                    <div className="text-sm text-gray-900">Invoice dikirim ke finance@majubersama.com</div>
                                    <div className="text-xs text-gray-500">3 Agustus 2026, 09:35</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                                <div>
                                    <div className="text-sm text-gray-900">Invoice dibuat oleh Budi Santoso</div>
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
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Kirim Invoice</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Tujuan</label>
                                <input
                                    type="email"
                                    defaultValue="finance@majubersama.com"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Pesan (opsional)</label>
                                <textarea
                                    rows={3}
                                    placeholder="Tambahkan pesan untuk customer..."
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowSendModal(false)}
                                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                                    Kirim
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
