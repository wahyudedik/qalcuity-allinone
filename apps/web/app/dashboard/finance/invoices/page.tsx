'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { InvoiceForm } from '@/components/finance/invoice-form'
import { useTranslation } from '@/lib/i18n'
import { Search, Plus, ChevronRight, FileText, Trash2, Check, X } from 'lucide-react'
import { useSession } from 'next-auth/react'

type Invoice = {
    id: string
    invoiceNumber: string
    customerName: string
    subtotal: number
    tax: number
    total: number
    currency: string
    status: string
    dueDate: string
    createdAt: string
}

const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
    sent: { label: 'Terkirim', color: 'bg-blue-100 text-blue-700' },
    paid: { label: 'Lunas', color: 'bg-green-100 text-green-700' },
    overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700' },
    partially_paid: { label: 'Bayar Sebagian', color: 'bg-yellow-100 text-yellow-700' },
    cancelled: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-500' },
}

export default function InvoicesPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    useEffect(() => {
        fetchInvoices()
    }, [])

    const fetchInvoices = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/finance/invoices')
            const data = await response.json()
            if (data.success) {
                setInvoices(data.data)
            } else {
                setError(t('finance.invoices.error'))
            }
        } catch {
            setError(t('finance.invoices.errorGeneric'))
        } finally {
            setLoading(false)
        }
    }

    const filteredInvoices = invoices.filter(invoice => {
        const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
        const matchesSearch = search === '' ||
            invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
            invoice.customerName.toLowerCase().includes(search.toLowerCase())
        return matchesStatus && matchesSearch
    })

    const stats = {
        total: invoices.reduce((sum, inv) => sum + Number(inv.total), 0),
        paid: invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + Number(inv.total), 0),
        outstanding: invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled' && i.status !== 'draft').reduce((sum, inv) => sum + Number(inv.total), 0),
        draft: invoices.filter(i => i.status === 'draft').length,
    }

    const handleCreateInvoice = async (data: unknown) => {
        try {
            const response = await fetch('/api/finance/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            const result = await response.json()
            if (result.success) {
                setShowCreateModal(false)
                fetchInvoices()
                setToast({ message: 'Invoice berhasil dibuat', type: 'success' })
            } else {
                setToast({ message: `${t('finance.invoices.createError')}: ${result.error}`, type: 'error' })
            }
        } catch {
            setToast({ message: t('finance.invoices.createErrorGeneric'), type: 'error' })
        }
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus invoice ini?')) return
        try {
            const response = await fetch(`/api/finance/invoices/${id}`, { method: 'DELETE' })
            const result = await response.json()
            if (result.success) {
                fetchInvoices()
                setToast({ message: 'Invoice berhasil dihapus', type: 'success' })
            } else {
                setToast({ message: `Gagal menghapus: ${result.error}`, type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menghapus invoice', type: 'error' })
        }
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
                        onClick={fetchInvoices}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        {t('finance.invoices.retry')}
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
                    <h1 className="text-2xl font-bold text-gray-900">{t('finance.invoices.title')}</h1>
                    <p className="text-gray-500">{t('finance.invoices.subtitle')}</p>
                </div>
                {canMutate && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        {t('finance.invoices.createInvoice')}
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('finance.invoices.stats.totalInvoice')}</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total)}</p>
                    <p className="text-xs text-gray-400 mt-1">{invoices.length} {t('finance.invoices.title').toLowerCase()}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('finance.invoices.stats.paid')}</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paid)}</p>
                    <p className="text-xs text-gray-400 mt-1">{invoices.filter(i => i.status === 'paid').length} {t('finance.invoices.title').toLowerCase()}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('finance.invoices.stats.unpaid')}</p>
                    <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.outstanding)}</p>
                    <p className="text-xs text-gray-400 mt-1">{invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled' && i.status !== 'draft').length} {t('finance.invoices.title').toLowerCase()}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('finance.invoices.stats.draft')}</p>
                    <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
                    <p className="text-xs text-gray-400 mt-1">{t('finance.invoices.stats.notSent')}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('finance.invoices.searchPlaceholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                    <option value="all">{t('finance.invoices.filter.allStatus')}</option>
                    <option value="draft">{t('finance.invoices.filter.draft')}</option>
                    <option value="sent">{t('finance.invoices.filter.sent')}</option>
                    <option value="paid">{t('finance.invoices.filter.paid')}</option>
                    <option value="overdue">{t('finance.invoices.filter.overdue')}</option>
                    <option value="partially_paid">{t('finance.invoices.filter.partiallyPaid')}</option>
                    <option value="cancelled">{t('finance.invoices.filter.cancelled')}</option>
                </select>
            </div>

            {/* Kartu invoice untuk tampilan mobile */}
            <div className="md:hidden space-y-3">
                {filteredInvoices.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                        {t('finance.invoices.empty')}
                    </div>
                ) : (
                    filteredInvoices.map((invoice) => (
                        <div key={invoice.id} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Link href={`/dashboard/finance/invoices/${invoice.id}`} className="font-medium text-blue-600 hover:underline">
                                        {invoice.invoiceNumber}
                                    </Link>
                                    <p className="text-sm text-gray-500">{invoice.customerName}</p>
                                </div>
                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusConfig[invoice.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                                    {statusConfig[invoice.status]?.label || invoice.status}
                                </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500">{t('finance.invoices.table.amount')}:</span>
                                    <span className="ml-1 font-medium">{formatCurrency(invoice.total)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('finance.invoices.table.dueDate')}:</span>
                                    <span className="ml-1">{formatDate(invoice.dueDate)}</span>
                                </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                                <Link href={`/dashboard/finance/invoices/${invoice.id}`} className="text-sm text-blue-600 hover:text-blue-800">
                                    {t('common.view') || 'Lihat'}
                                </Link>
                                <button
                                    onClick={() => handleDelete(invoice.id)}
                                    className="text-sm text-red-600 hover:text-red-800"
                                >
                                    {t('common.delete') || 'Hapus'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Tabel invoice untuk tampilan desktop */}
            <div className="hidden md:block rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.invoices.table.number')}</th>
                                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.invoices.table.customer')}</th>
                                <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.invoices.table.date')}</th>
                                <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.invoices.table.dueDate')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.invoices.table.amount')}</th>
                                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.invoices.table.status')}</th>
                                <th className="hidden md:table-cell px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.invoices.table.action')}</th>
                                <th className="hidden md:table-cell px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        {t('finance.invoices.empty')}
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <Link href={`/dashboard/finance/invoices/${invoice.id}`} className="font-medium text-blue-600 hover:underline">
                                                {invoice.invoiceNumber}
                                            </Link>
                                        </td>
                                        <td className="hidden md:table-cell whitespace-nowrap px-6 py-4 text-gray-900">{invoice.customerName}</td>
                                        <td className="hidden lg:table-cell whitespace-nowrap px-6 py-4 text-gray-500">{formatDate(invoice.createdAt)}</td>
                                        <td className="hidden lg:table-cell whitespace-nowrap px-6 py-4 text-gray-500">{formatDate(invoice.dueDate)}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right font-medium">{formatCurrency(invoice.total)}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusConfig[invoice.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                                                {statusConfig[invoice.status]?.label || invoice.status}
                                            </span>
                                        </td>
                                        <td className="hidden md:table-cell whitespace-nowrap px-6 py-4 text-right">
                                            <Link href={`/dashboard/finance/invoices/${invoice.id}`} className="text-blue-600 hover:text-blue-800">
                                                <ChevronRight className="h-4 w-4 inline" />
                                            </Link>
                                        </td>
                                        <td className="hidden md:table-cell whitespace-nowrap px-6 py-4 text-right">
                                            {canMutate && (
                                                <button
                                                    onClick={() => handleDelete(invoice.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            <InvoiceForm
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateInvoice}
            />
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                    <span className="inline-flex items-center gap-1.5">
                        {toast.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        {toast.message}
                    </span>
                </div>
            )}
        </div>
    )
}
