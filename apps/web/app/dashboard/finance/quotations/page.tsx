'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { QuotationForm } from '@/components/finance/quotation-form'
import { useTranslation } from '@/lib/i18n'
import { Search, Plus, ChevronRight, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'

type Quotation = {
    id: string
    quotationNumber: string
    customerName: string
    subtotal: number
    tax: number
    total: number
    currency: string
    status: string
    validUntil: string
    items?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>
    createdAt: string
}

const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
    sent: { label: 'Terkirim', color: 'bg-blue-100 text-blue-700' },
    accepted: { label: 'Diterima', color: 'bg-green-100 text-green-700' },
    rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700' },
    expired: { label: 'Kedaluwarsa', color: 'bg-gray-100 text-gray-500' },
}

export default function QuotationsPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const [quotations, setQuotations] = useState<Quotation[]>([])
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
        fetchQuotations()
    }, [])

    const fetchQuotations = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/finance/quotations')
            const data = await response.json()
            if (data.success) {
                setQuotations(data.data)
            } else {
                setError(t('finance.quotations.error'))
            }
        } catch {
            setError(t('finance.quotations.errorGeneric'))
        } finally {
            setLoading(false)
        }
    }

    const filteredQuotations = quotations.filter(q => {
        const matchesStatus = statusFilter === 'all' || q.status === statusFilter
        const matchesSearch = search === '' ||
            q.quotationNumber.toLowerCase().includes(search.toLowerCase()) ||
            q.customerName.toLowerCase().includes(search.toLowerCase())
        return matchesStatus && matchesSearch
    })

    const stats = {
        total: quotations.reduce((sum, q) => sum + q.total, 0),
        draft: quotations.filter(q => q.status === 'draft').length,
        sent: quotations.filter(q => q.status === 'sent').length,
        accepted: quotations.filter(q => q.status === 'accepted').length,
    }

    const handleCreateQuotation = async (data: unknown) => {
        try {
            const response = await fetch('/api/finance/quotations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            const result = await response.json()
            if (result.success) {
                setShowCreateModal(false)
                fetchQuotations()
                setToast({ message: 'Quotation berhasil dibuat', type: 'success' })
            } else {
                setToast({ message: `${t('finance.quotations.createError')}: ${result.error}`, type: 'error' })
            }
        } catch {
            setToast({ message: t('finance.quotations.createErrorGeneric'), type: 'error' })
        }
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus quotation ini?')) return
        try {
            const response = await fetch(`/api/finance/quotations/${id}`, { method: 'DELETE' })
            const result = await response.json()
            if (result.success) {
                fetchQuotations()
                setToast({ message: 'Quotation berhasil dihapus', type: 'success' })
            } else {
                setToast({ message: `Gagal menghapus: ${result.error}`, type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menghapus quotation', type: 'error' })
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
                        onClick={fetchQuotations}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        {t('finance.quotations.retry')}
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
                    <h1 className="text-2xl font-bold text-gray-900">{t('finance.quotations.title')}</h1>
                    <p className="text-gray-500">{t('finance.quotations.subtitle')}</p>
                </div>
                {canMutate && (
                    <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                    <Plus className="h-4 w-4" />
                    {t('finance.quotations.createQuotation')}
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('finance.quotations.stats.totalValue')}</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total)}</p>
                    <p className="text-xs text-gray-400 mt-1">{quotations.length} quotation</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('finance.quotations.stats.draft')}</p>
                    <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
                    <p className="text-xs text-gray-400 mt-1">{t('finance.quotations.stats.notSent')}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('finance.quotations.stats.sent')}</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
                    <p className="text-xs text-gray-400 mt-1">{t('finance.quotations.stats.waitingResponse')}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('finance.quotations.stats.accepted')}</p>
                    <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
                    <p className="text-xs text-gray-400 mt-1">{t('finance.quotations.stats.convertToDeal')}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('finance.quotations.searchPlaceholder')}
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
                    <option value="all">{t('finance.quotations.filter.allStatus')}</option>
                    <option value="draft">{t('finance.quotations.filter.draft')}</option>
                    <option value="sent">{t('finance.quotations.filter.sent')}</option>
                    <option value="accepted">{t('finance.quotations.filter.accepted')}</option>
                    <option value="rejected">{t('finance.quotations.filter.rejected')}</option>
                    <option value="expired">{t('finance.quotations.filter.expired')}</option>
                </select>
            </div>

            {/* Kartu Quotation untuk tampilan mobile */}
            <div className="md:hidden space-y-3">
                {filteredQuotations.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                        {t('finance.quotations.empty')}
                    </div>
                ) : (
                    filteredQuotations.map((quotation) => (
                        <div key={quotation.id} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <Link href={`/dashboard/finance/quotations/${quotation.id}`} className="font-medium text-blue-600 hover:underline">
                                        {quotation.quotationNumber}
                                    </Link>
                                    <p className="text-sm text-gray-500">{quotation.customerName}</p>
                                </div>
                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusConfig[quotation.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                                    {statusConfig[quotation.status]?.label || quotation.status}
                                </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500">{t('finance.quotations.table.amount')}:</span>
                                    <span className="ml-1 font-medium">{formatCurrency(quotation.total)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('finance.quotations.table.items')}:</span>
                                    <span className="ml-1">{quotation.items?.length || 0} item</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('finance.quotations.table.validUntil')}:</span>
                                    <span className="ml-1">{formatDate(quotation.validUntil)}</span>
                                </div>
                            </div>
                            <div className="mt-3 flex justify-end gap-3">
                                <Link href={`/dashboard/finance/quotations/${quotation.id}`} className="text-sm text-blue-600 hover:text-blue-800">
                                    {t('common.view') || 'Lihat'}
                                </Link>
                                <button
                                    onClick={() => handleDelete(quotation.id)}
                                    className="text-sm text-red-500 hover:text-red-700"
                                >
                                    {t('common.delete') || 'Hapus'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Tabel Quotation untuk tampilan desktop */}
            <div className="hidden md:block rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.quotations.table.number')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.quotations.table.customer')}</th>
                                <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.quotations.table.items')}</th>
                                <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.quotations.table.validUntil')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.quotations.table.amount')}</th>
                                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.quotations.table.status')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.quotations.table.action')}</th>
                                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredQuotations.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        {t('finance.quotations.empty')}
                                    </td>
                                </tr>
                            ) : (
                                filteredQuotations.map((quotation) => (
                                    <tr key={quotation.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <Link href={`/dashboard/finance/quotations/${quotation.id}`} className="font-medium text-blue-600 hover:underline">
                                                {quotation.quotationNumber}
                                            </Link>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-gray-900">{quotation.customerName}</td>
                                        <td className="hidden lg:table-cell whitespace-nowrap px-6 py-4 text-gray-500">{quotation.items?.length || 0} item</td>
                                        <td className="hidden lg:table-cell whitespace-nowrap px-6 py-4 text-gray-500">{formatDate(quotation.validUntil)}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right font-medium">{formatCurrency(quotation.total)}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusConfig[quotation.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                                                {statusConfig[quotation.status]?.label || quotation.status}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right">
                                            <Link href={`/dashboard/finance/quotations/${quotation.id}`} className="text-blue-600 hover:text-blue-800">
                                                <ChevronRight className="h-4 w-4 inline" />
                                            </Link>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            {canMutate && (
                                                <button
                                                onClick={() => handleDelete(quotation.id)}
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
            <QuotationForm
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateQuotation}
            />
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                    {toast.type === 'success' ? '✓' : '✕'} {toast.message}
                </div>
            )}
        </div>
    )
}
