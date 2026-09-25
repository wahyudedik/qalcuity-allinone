'use client'

import { usePermission } from '@/lib/use-permission'
import { useState, useEffect, useMemo } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { Search, Plus, Download, Receipt, Trash2, Check, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { exportToCSV } from '@/lib/export'

type Bill = {
    id: string
    billNumber: string
    vendorName: string
    invoiceNumber: string | null
    subtotal: number
    taxAmount: number
    totalAmount: number
    paidAmount: number
    dueDate: string | null
    status: string
    notes: string | null
    createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending_approval: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
}

export default function BillsPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const { canMutate: canMutateFn } = usePermission()
    const canMutate = canMutateFn('finance')
    const [bills, setBills] = useState<Bill[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null)
    const [confirmTitle, setConfirmTitle] = useState('')
    const [confirmMessage, setConfirmMessage] = useState('')

    // Create form state
    const [createForm, setCreateForm] = useState({
        vendorName: '',
        invoiceNumber: '',
        subtotal: '',
        taxAmount: '0',
        totalAmount: '',
        dueDate: '',
        notes: '',
    })

    const statusConfig: Record<string, { label: string; color: string }> = useMemo(() => ({
        draft: { label: t('finance.bills.statusLabels.draft'), color: STATUS_COLORS.draft },
        pending_approval: { label: t('finance.bills.statusLabels.pendingApproval'), color: STATUS_COLORS.pending_approval },
        approved: { label: t('finance.bills.statusLabels.approved'), color: STATUS_COLORS.approved },
        paid: { label: t('finance.bills.statusLabels.paid'), color: STATUS_COLORS.paid },
        cancelled: { label: t('finance.bills.statusLabels.cancelled'), color: STATUS_COLORS.cancelled },
    }), [t])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    useEffect(() => {
        fetchBills()
    }, [])

    const fetchBills = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/finance/bills')
            const data = await response.json()
            if (data.success) {
                setBills(data.data)
            } else {
                setError(t('finance.bills.errorLoad'))
            }
        } catch {
            setError(t('finance.bills.errorLoadGeneric'))
        } finally {
            setLoading(false)
        }
    }

    const handleExportCSV = () => {
        if (filteredBills.length === 0) {
            setToast({ message: 'Tidak ada data untuk diekspor', type: 'error' })
            return
        }
        const csvData = filteredBills.map(b => ({
            billNumber: b.billNumber,
            vendorName: b.vendorName,
            invoiceNumber: b.invoiceNumber || '',
            subtotal: b.subtotal,
            taxAmount: b.taxAmount,
            totalAmount: b.totalAmount,
            paidAmount: b.paidAmount,
            dueDate: b.dueDate || '',
            status: b.status,
            notes: b.notes || '',
        }))
        exportToCSV(csvData, 'bills', {
            billNumber: 'No. Tagihan',
            vendorName: 'Vendor',
            invoiceNumber: 'No. Invoice',
            subtotal: 'Subtotal',
            taxAmount: 'Pajak',
            totalAmount: 'Total',
            paidAmount: 'Dibayar',
            dueDate: 'Jatuh Tempo',
            status: 'Status',
            notes: 'Catatan',
        })
        setToast({ message: 'Berhasil mengekspor data tagihan', type: 'success' })
    }

    const filteredBills = bills.filter(bill => {
        const matchesStatus = statusFilter === 'all' || bill.status === statusFilter
        const matchesSearch = search === '' ||
            bill.billNumber.toLowerCase().includes(search.toLowerCase()) ||
            bill.vendorName.toLowerCase().includes(search.toLowerCase())
        return matchesStatus && matchesSearch
    })

    const stats = {
        total: bills.reduce((sum, b) => sum + b.totalAmount, 0),
        pending: bills.filter(b => b.status === 'pending_approval').reduce((sum, b) => sum + b.totalAmount, 0),
        overdue: bills.filter(b => b.status !== 'paid' && b.status !== 'cancelled' && b.dueDate && new Date(b.dueDate) < new Date()).reduce((sum, b) => sum + b.totalAmount, 0),
        paid: bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.totalAmount, 0),
    }

    const handleCreateBill = async () => {
        try {
            const subtotal = parseFloat(createForm.subtotal) || 0
            const taxAmount = parseFloat(createForm.taxAmount) || 0
            const totalAmount = parseFloat(createForm.totalAmount) || subtotal + taxAmount

            const response = await fetch('/api/finance/bills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vendorName: createForm.vendorName,
                    invoiceNumber: createForm.invoiceNumber || undefined,
                    subtotal,
                    taxAmount,
                    totalAmount,
                    dueDate: createForm.dueDate || undefined,
                    notes: createForm.notes || undefined,
                }),
            })
            const result = await response.json()
            if (result.success) {
                setShowCreateModal(false)
                setCreateForm({ vendorName: '', invoiceNumber: '', subtotal: '', taxAmount: '0', totalAmount: '', dueDate: '', notes: '' })
                fetchBills()
                setToast({ message: t('finance.bills.create.success'), type: 'success' })
            } else {
                setToast({ message: `${t('finance.bills.create.error')}: ${result.error}`, type: 'error' })
            }
        } catch {
            setToast({ message: t('finance.bills.create.errorGeneric'), type: 'error' })
        }
    }

    const handleDelete = async (id: string) => {
        setConfirmTitle(t('finance.bills.delete.title'))
        setConfirmMessage(t('finance.bills.delete.message'))
        setConfirmAction(() => async () => {
            try {
                const response = await fetch(`/api/finance/bills/${id}`, { method: 'DELETE' })
                const result = await response.json()
                if (result.success) {
                    fetchBills()
                    setToast({ message: t('finance.bills.delete.success'), type: 'success' })
                } else {
                    setToast({ message: `${t('finance.bills.delete.error')}: ${result.error}`, type: 'error' })
                }
            } catch {
                setToast({ message: t('finance.bills.delete.errorGeneric'), type: 'error' })
            }
        })
        setShowConfirmDialog(true)
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
                        onClick={fetchBills}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        {t('finance.bills.retry')}
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
                    <h1 className="text-2xl font-bold text-gray-900">{t('finance.bills.title')}</h1>
                    <p className="text-gray-500">{t('finance.bills.subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                    {canMutate && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" />
                            {t('finance.bills.createButton')}
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('finance.bills.stats.totalBills')}</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total)}</p>
                    <p className="text-xs text-gray-400 mt-1">{bills.length} {t('finance.bills.billsCount')}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('finance.bills.stats.pendingApproval')}</p>
                    <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pending)}</p>
                    <p className="text-xs text-gray-400 mt-1">{bills.filter(b => b.status === 'pending_approval').length} {t('finance.bills.billsCount')}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('finance.bills.stats.overdue')}</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.overdue)}</p>
                    <p className="text-xs text-gray-400 mt-1">{bills.filter(b => b.status !== 'paid' && b.status !== 'cancelled' && b.dueDate && new Date(b.dueDate) < new Date()).length} {t('finance.bills.billsCount')}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('finance.bills.stats.paid')}</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paid)}</p>
                    <p className="text-xs text-gray-400 mt-1">{bills.filter(b => b.status === 'paid').length} {t('finance.bills.billsCount')}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('finance.bills.searchPlaceholder')}
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
                    <option value="all">{t('finance.bills.filter.allStatus')}</option>
                    <option value="draft">{t('finance.bills.filter.draft')}</option>
                    <option value="pending_approval">{t('finance.bills.filter.pendingApproval')}</option>
                    <option value="approved">{t('finance.bills.filter.approved')}</option>
                    <option value="paid">{t('finance.bills.filter.paid')}</option>
                    <option value="cancelled">{t('finance.bills.filter.cancelled')}</option>
                </select>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
                {filteredBills.length === 0 ? (
                    <EmptyState
                        icon={Receipt}
                        title={t('finance.bills.empty.title')}
                        description={t('finance.bills.empty.description')}
                    />
                ) : (
                    filteredBills.map((bill) => (
                        <div key={bill.id} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium text-blue-600">{bill.billNumber}</p>
                                    <p className="text-sm text-gray-500">{bill.vendorName}</p>
                                </div>
                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusConfig[bill.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                                    {statusConfig[bill.status]?.label || bill.status}
                                </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500">{t('finance.bills.card.amount')}</span>
                                    <span className="ml-1 font-medium">{formatCurrency(bill.totalAmount)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('finance.bills.card.dueDate')}</span>
                                    <span className="ml-1">{bill.dueDate ? formatDate(bill.dueDate) : '-'}</span>
                                </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                                {canMutate && bill.status === 'draft' && (
                                    <button
                                        onClick={() => handleDelete(bill.id)}
                                        className="text-sm text-red-600 hover:text-red-800"
                                    >
                                        {t('finance.bills.card.delete')}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.bills.table.number')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.bills.table.vendor')}</th>
                                <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.bills.table.invoiceNumber')}</th>
                                <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.bills.table.dueDate')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.bills.table.amount')}</th>
                                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.bills.table.status')}</th>
                                <th className="hidden md:table-cell px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.bills.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredBills.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12">
                                        <EmptyState
                                            icon={Receipt}
                                            title={t('finance.bills.empty.title')}
                                            description={t('finance.bills.empty.description')}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredBills.map((bill) => (
                                    <tr key={bill.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-6 py-4 font-medium text-blue-600">
                                            {bill.billNumber}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-gray-900">{bill.vendorName}</td>
                                        <td className="hidden lg:table-cell whitespace-nowrap px-6 py-4 text-gray-500">{bill.invoiceNumber || '-'}</td>
                                        <td className="hidden lg:table-cell whitespace-nowrap px-6 py-4 text-gray-500">{bill.dueDate ? formatDate(bill.dueDate) : '-'}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right font-medium">{formatCurrency(bill.totalAmount)}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusConfig[bill.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                                                {statusConfig[bill.status]?.label || bill.status}
                                            </span>
                                        </td>
                                        <td className="hidden md:table-cell whitespace-nowrap px-6 py-4 text-right">
                                            {canMutate && bill.status === 'draft' && (
                                                <button
                                                    onClick={() => handleDelete(bill.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                    title={t('finance.bills.card.delete')}
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
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">{t('finance.bills.create.title')}</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.bills.create.vendorName')}</label>
                                <input
                                    type="text"
                                    value={createForm.vendorName}
                                    onChange={(e) => setCreateForm({ ...createForm, vendorName: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder={t('finance.bills.create.vendorNamePlaceholder')}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.bills.create.invoiceNumber')}</label>
                                <input
                                    type="text"
                                    value={createForm.invoiceNumber}
                                    onChange={(e) => setCreateForm({ ...createForm, invoiceNumber: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder={t('finance.bills.create.invoiceNumberPlaceholder')}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.bills.create.subtotal')}</label>
                                    <input
                                        type="number"
                                        value={createForm.subtotal}
                                        onChange={(e) => setCreateForm({ ...createForm, subtotal: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.bills.create.tax')}</label>
                                    <input
                                        type="number"
                                        value={createForm.taxAmount}
                                        onChange={(e) => setCreateForm({ ...createForm, taxAmount: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.bills.create.total')}</label>
                                <input
                                    type="number"
                                    value={createForm.totalAmount}
                                    onChange={(e) => setCreateForm({ ...createForm, totalAmount: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="0"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.bills.create.dueDate')}</label>
                                <input
                                    type="date"
                                    value={createForm.dueDate}
                                    onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.bills.create.notes')}</label>
                                <textarea
                                    value={createForm.notes}
                                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    rows={3}
                                    placeholder={t('finance.bills.create.notesPlaceholder')}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                {t('finance.bills.create.cancel')}
                            </button>
                            <button
                                onClick={handleCreateBill}
                                disabled={!createForm.vendorName || !createForm.subtotal}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('finance.bills.create.submit')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    <span className="inline-flex items-center gap-1.5">
                        {toast.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        {toast.message}
                    </span>
                </div>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={showConfirmDialog}
                onClose={() => { setShowConfirmDialog(false); setConfirmAction(null) }}
                onConfirm={async () => { if (confirmAction) await confirmAction(); setShowConfirmDialog(false); setConfirmAction(null) }}
                title={confirmTitle}
                message={confirmMessage}
                confirmText={t('finance.bills.delete.confirm')}
                cancelText={t('finance.bills.delete.cancel')}
                variant="danger"
            />
        </div>
    )
}
