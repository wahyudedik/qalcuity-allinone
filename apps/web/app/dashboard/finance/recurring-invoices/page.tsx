'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { Plus, RefreshCw, Pause, Play, XCircle, Clock, FileText, Users, Loader2, AlertCircle } from 'lucide-react'

interface RecurringInvoiceItem {
    id: string
    description: string
    quantity: number
    unitPrice: number
    productId: string | null
}

interface RecurringInvoice {
    id: string
    contactId: string
    contact: { id: string; name: string; email: string | null } | null
    frequency: string
    dayOfMonth: number | null
    dayOfWeek: number | null
    startDate: string
    endDate: string | null
    nextRunDate: string
    lastRunDate: string | null
    status: string
    notes: string | null
    taxRate: number | null
    items: RecurringInvoiceItem[]
    _count: { generatedInvoices: number }
    createdAt: string
}

const frequencyLabels: Record<string, string> = {
    WEEKLY: 'Weekly',
    BIWEEKLY: 'Biweekly',
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    YEARLY: 'Yearly',
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-700', icon: Play },
    PAUSED: { label: 'Paused', color: 'bg-yellow-100 text-yellow-700', icon: Pause },
    COMPLETED: { label: 'Completed', color: 'bg-blue-100 text-blue-700', icon: FileText },
    CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500', icon: XCircle },
}

export default function RecurringInvoicesPage() {
    const { t } = useTranslation()
    const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        fetchRecurringInvoices()
    }, [statusFilter])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchRecurringInvoices = async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (statusFilter) params.set('status', statusFilter)
            const res = await fetch(`/api/finance/recurring-invoices?${params}`)
            const data = await res.json()
            if (data.success) {
                setRecurringInvoices(data.data)
            } else {
                setError(data.error || 'Failed to load recurring invoices')
            }
        } catch {
            setError('Failed to connect to server')
        } finally {
            setLoading(false)
        }
    }

    const handleStatusToggle = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
        try {
            const res = await fetch(`/api/finance/recurring-invoices/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: `Recurring invoice ${newStatus === 'ACTIVE' ? 'resumed' : 'paused'}`, type: 'success' })
                fetchRecurringInvoices()
            } else {
                setToast({ message: data.error || 'Failed to update', type: 'error' })
            }
        } catch {
            setToast({ message: 'Failed to connect to server', type: 'error' })
        }
    }

    const handleCancel = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this recurring invoice?')) return
        try {
            const res = await fetch(`/api/finance/recurring-invoices/${id}`, {
                method: 'DELETE',
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: 'Recurring invoice cancelled', type: 'success' })
                fetchRecurringInvoices()
            } else {
                setToast({ message: data.error || 'Failed to cancel', type: 'error' })
            }
        } catch {
            setToast({ message: 'Failed to connect to server', type: 'error' })
        }
    }

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recurring Invoices</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage automated invoice generation schedules</p>
                </div>
                <Link
                    href="/dashboard/finance/recurring-invoices/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    <Plus className="h-4 w-4" />
                    Create Recurring Invoice
                </Link>
            </div>

            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
                {['', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${statusFilter === status
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                    >
                        {status ? statusConfig[status]?.label : 'All'}
                    </button>
                ))}
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && recurringInvoices.length === 0 && (
                <div className="text-center py-12">
                    <RefreshCw className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg">No recurring invoices found</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Create your first recurring invoice to automate billing</p>
                </div>
            )}

            {/* Desktop Table */}
            {!loading && !error && recurringInvoices.length > 0 && (
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contact</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Frequency</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Next Run</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Run</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Generated</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {recurringInvoices.map((ri) => {
                                const sc = statusConfig[ri.status] || statusConfig.ACTIVE
                                const StatusIcon = sc.icon
                                return (
                                    <tr key={ri.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{ri.contact?.name || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{frequencyLabels[ri.frequency] || ri.frequency}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(ri.nextRunDate).toLocaleDateString('id-ID')}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{ri.lastRunDate ? new Date(ri.lastRunDate).toLocaleDateString('id-ID') : '-'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{ri._count.generatedInvoices}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                                                <StatusIcon className="h-3 w-3" />
                                                {sc.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link
                                                    href={`/dashboard/finance/recurring-invoices/${ri.id}`}
                                                    className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                                >
                                                    View
                                                </Link>
                                                {ri.status === 'ACTIVE' && (
                                                    <button
                                                        onClick={() => handleStatusToggle(ri.id, ri.status)}
                                                        className="px-2 py-1 text-xs text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded"
                                                    >
                                                        Pause
                                                    </button>
                                                )}
                                                {ri.status === 'PAUSED' && (
                                                    <button
                                                        onClick={() => handleStatusToggle(ri.id, ri.status)}
                                                        className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                                    >
                                                        Resume
                                                    </button>
                                                )}
                                                {ri.status !== 'CANCELLED' && ri.status !== 'COMPLETED' && (
                                                    <button
                                                        onClick={() => handleCancel(ri.id)}
                                                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Mobile Cards */}
            {!loading && !error && recurringInvoices.length > 0 && (
                <div className="md:hidden space-y-3">
                    {recurringInvoices.map((ri) => {
                        const sc = statusConfig[ri.status] || statusConfig.ACTIVE
                        const StatusIcon = sc.icon
                        return (
                            <div key={ri.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{ri.contact?.name || '-'}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{frequencyLabels[ri.frequency] || ri.frequency}</p>
                                    </div>
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                                        <StatusIcon className="h-3 w-3" />
                                        {sc.label}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Next Run:</span>
                                        <span className="ml-1 text-gray-900 dark:text-white">{new Date(ri.nextRunDate).toLocaleDateString('id-ID')}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Generated:</span>
                                        <span className="ml-1 text-gray-900 dark:text-white">{ri._count.generatedInvoices} invoices</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                    <Link
                                        href={`/dashboard/finance/recurring-invoices/${ri.id}`}
                                        className="flex-1 text-center px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg"
                                    >
                                        View
                                    </Link>
                                    {ri.status === 'ACTIVE' && (
                                        <button
                                            onClick={() => handleStatusToggle(ri.id, ri.status)}
                                            className="flex-1 px-3 py-1.5 text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 rounded-lg"
                                        >
                                            Pause
                                        </button>
                                    )}
                                    {ri.status === 'PAUSED' && (
                                        <button
                                            onClick={() => handleStatusToggle(ri.id, ri.status)}
                                            className="flex-1 px-3 py-1.5 text-xs bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg"
                                        >
                                            Resume
                                        </button>
                                    )}
                                    {ri.status !== 'CANCELLED' && ri.status !== 'COMPLETED' && (
                                        <button
                                            onClick={() => handleCancel(ri.id)}
                                            className="flex-1 px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}