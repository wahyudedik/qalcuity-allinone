'use client'

import { usePermission } from '@/lib/use-permission'
import { useState, useEffect, useMemo } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { Search, Plus, Wallet, Trash2, Check, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'

type Expense = {
    id: string
    expenseNumber: string
    category: string
    description: string
    amount: number
    taxAmount: number
    totalAmount: number
    expenseDate: string
    paymentMethod: string
    receiptUrl: string | null
    status: string
    createdBy: string
    createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending_approval: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
}

const CATEGORY_COLORS: Record<string, string> = {
    OFFICE: 'bg-blue-100 text-blue-700',
    TRAVEL: 'bg-purple-100 text-purple-700',
    UTILITIES: 'bg-yellow-100 text-yellow-700',
    MARKETING: 'bg-pink-100 text-pink-700',
    SALARIES: 'bg-green-100 text-green-700',
    MAINTENANCE: 'bg-orange-100 text-orange-700',
    OTHER: 'bg-gray-100 text-gray-700',
}

export default function ExpensesPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const { canMutate: canMutateFn } = usePermission()
    const canMutate = canMutateFn('finance')
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState('all')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null)
    const [confirmTitle, setConfirmTitle] = useState('')
    const [confirmMessage, setConfirmMessage] = useState('')

    // Create form state
    const [createForm, setCreateForm] = useState({
        category: 'OTHER',
        description: '',
        amount: '',
        taxAmount: '0',
        totalAmount: '',
        expenseDate: '',
        paymentMethod: 'CASH',
    })

    const statusConfig: Record<string, { label: string; color: string }> = useMemo(() => ({
        draft: { label: t('finance.expenses.statusLabels.draft'), color: STATUS_COLORS.draft },
        pending_approval: { label: t('finance.expenses.statusLabels.pendingApproval'), color: STATUS_COLORS.pending_approval },
        approved: { label: t('finance.expenses.statusLabels.approved'), color: STATUS_COLORS.approved },
        rejected: { label: t('finance.expenses.statusLabels.rejected'), color: STATUS_COLORS.rejected },
    }), [t])

    const categoryConfig: Record<string, { label: string; color: string }> = useMemo(() => ({
        OFFICE: { label: t('finance.expenses.categories.OFFICE'), color: CATEGORY_COLORS.OFFICE },
        TRAVEL: { label: t('finance.expenses.categories.TRAVEL'), color: CATEGORY_COLORS.TRAVEL },
        UTILITIES: { label: t('finance.expenses.categories.UTILITIES'), color: CATEGORY_COLORS.UTILITIES },
        MARKETING: { label: t('finance.expenses.categories.MARKETING'), color: CATEGORY_COLORS.MARKETING },
        SALARIES: { label: t('finance.expenses.categories.SALARIES'), color: CATEGORY_COLORS.SALARIES },
        MAINTENANCE: { label: t('finance.expenses.categories.MAINTENANCE'), color: CATEGORY_COLORS.MAINTENANCE },
        OTHER: { label: t('finance.expenses.categories.OTHER'), color: CATEGORY_COLORS.OTHER },
    }), [t])

    const paymentMethodLabels = useMemo(() => ({
        CASH: t('finance.expenses.paymentMethods.CASH'),
        BANK_TRANSFER: t('finance.expenses.paymentMethods.BANK_TRANSFER'),
        QRIS: t('finance.expenses.paymentMethods.QRIS'),
        CREDIT_CARD: t('finance.expenses.paymentMethods.CREDIT_CARD'),
    }), [t])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    useEffect(() => {
        fetchExpenses()
    }, [])

    const fetchExpenses = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/finance/expenses')
            const data = await response.json()
            if (data.success) {
                setExpenses(data.data)
            } else {
                setError(t('finance.expenses.errorLoad'))
            }
        } catch {
            setError(t('finance.expenses.errorLoadGeneric'))
        } finally {
            setLoading(false)
        }
    }

    const filteredExpenses = expenses.filter(expense => {
        const matchesStatus = statusFilter === 'all' || expense.status === statusFilter
        const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter
        const matchesSearch = search === '' ||
            expense.expenseNumber.toLowerCase().includes(search.toLowerCase()) ||
            expense.description.toLowerCase().includes(search.toLowerCase())
        return matchesStatus && matchesCategory && matchesSearch
    })

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const stats = {
        total: expenses.reduce((sum, e) => sum + e.totalAmount, 0),
        thisMonth: expenses.filter(e => new Date(e.expenseDate) >= thisMonthStart).reduce((sum, e) => sum + e.totalAmount, 0),
        pendingApproval: expenses.filter(e => e.status === 'pending_approval').reduce((sum, e) => sum + e.totalAmount, 0),
        count: expenses.length,
    }

    const handleCreateExpense = async () => {
        try {
            const amount = parseFloat(createForm.amount) || 0
            const taxAmount = parseFloat(createForm.taxAmount) || 0
            const totalAmount = parseFloat(createForm.totalAmount) || amount + taxAmount

            const response = await fetch('/api/finance/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: createForm.category,
                    description: createForm.description,
                    amount,
                    taxAmount,
                    totalAmount,
                    expenseDate: createForm.expenseDate || undefined,
                    paymentMethod: createForm.paymentMethod,
                }),
            })
            const result = await response.json()
            if (result.success) {
                setShowCreateModal(false)
                setCreateForm({ category: 'OTHER', description: '', amount: '', taxAmount: '0', totalAmount: '', expenseDate: '', paymentMethod: 'CASH' })
                fetchExpenses()
                setToast({ message: t('finance.expenses.create.success'), type: 'success' })
            } else {
                setToast({ message: `${t('finance.expenses.create.error')}: ${result.error}`, type: 'error' })
            }
        } catch {
            setToast({ message: t('finance.expenses.create.errorGeneric'), type: 'error' })
        }
    }

    const handleDelete = async (id: string) => {
        setConfirmTitle(t('finance.expenses.delete.title'))
        setConfirmMessage(t('finance.expenses.delete.message'))
        setConfirmAction(() => async () => {
            try {
                const response = await fetch(`/api/finance/expenses/${id}`, { method: 'DELETE' })
                const result = await response.json()
                if (result.success) {
                    fetchExpenses()
                    setToast({ message: t('finance.expenses.delete.success'), type: 'success' })
                } else {
                    setToast({ message: `${t('finance.expenses.delete.error')}: ${result.error}`, type: 'error' })
                }
            } catch {
                setToast({ message: t('finance.expenses.delete.errorGeneric'), type: 'error' })
            }
        })
        setShowConfirmDialog(true)
    }

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {[1, 2, 3].map(i => (
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
                        onClick={fetchExpenses}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        {t('finance.expenses.retry')}
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
                    <h1 className="text-2xl font-bold text-gray-900">{t('finance.expenses.title')}</h1>
                    <p className="text-gray-500">{t('finance.expenses.subtitle')}</p>
                </div>
                {canMutate && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        {t('finance.expenses.createButton')}
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('finance.expenses.stats.totalExpenses')}</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total)}</p>
                    <p className="text-xs text-gray-400 mt-1">{stats.count} {t('finance.expenses.transactionsCount')}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('finance.expenses.stats.thisMonth')}</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.thisMonth)}</p>
                    <p className="text-xs text-gray-400 mt-1">{expenses.filter(e => new Date(e.expenseDate) >= thisMonthStart).length} {t('finance.expenses.transactionsCount')}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('finance.expenses.stats.pendingApproval')}</p>
                    <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingApproval)}</p>
                    <p className="text-xs text-gray-400 mt-1">{expenses.filter(e => e.status === 'pending_approval').length} {t('finance.expenses.transactionsCount')}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('finance.expenses.searchPlaceholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                </div>
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                    <option value="all">{t('finance.expenses.filter.allCategories')}</option>
                    {Object.entries(categoryConfig).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                    <option value="all">{t('finance.expenses.filter.allStatus')}</option>
                    <option value="draft">{t('finance.expenses.filter.draft')}</option>
                    <option value="pending_approval">{t('finance.expenses.filter.pendingApproval')}</option>
                    <option value="approved">{t('finance.expenses.filter.approved')}</option>
                    <option value="rejected">{t('finance.expenses.filter.rejected')}</option>
                </select>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
                {filteredExpenses.length === 0 ? (
                    <EmptyState
                        icon={Wallet}
                        title={t('finance.expenses.empty.title')}
                        description={t('finance.expenses.empty.description')}
                    />
                ) : (
                    filteredExpenses.map((expense) => (
                        <div key={expense.id} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium text-blue-600">{expense.expenseNumber}</p>
                                    <p className="text-sm text-gray-500">{expense.description}</p>
                                </div>
                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusConfig[expense.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                                    {statusConfig[expense.status]?.label || expense.status}
                                </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${categoryConfig[expense.category]?.color || 'bg-gray-100 text-gray-700'}`}>
                                    {categoryConfig[expense.category]?.label || expense.category}
                                </span>
                                <span className="text-xs text-gray-500">{paymentMethodLabels[expense.paymentMethod as keyof typeof paymentMethodLabels] || expense.paymentMethod}</span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500">{t('finance.expenses.card.amount')}</span>
                                    <span className="ml-1 font-medium">{formatCurrency(expense.totalAmount)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('finance.expenses.card.date')}</span>
                                    <span className="ml-1">{formatDate(expense.expenseDate)}</span>
                                </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                                {canMutate && expense.status === 'draft' && (
                                    <button
                                        onClick={() => handleDelete(expense.id)}
                                        className="text-sm text-red-600 hover:text-red-800"
                                    >
                                        {t('finance.expenses.card.delete')}
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
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.expenses.table.number')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.expenses.table.description')}</th>
                                <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.expenses.table.category')}</th>
                                <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.expenses.table.date')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.expenses.table.amount')}</th>
                                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.expenses.table.status')}</th>
                                <th className="hidden md:table-cell px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">{t('finance.expenses.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12">
                                        <EmptyState
                                            icon={Wallet}
                                            title={t('finance.expenses.empty.title')}
                                            description={t('finance.expenses.empty.description')}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredExpenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-6 py-4 font-medium text-blue-600">
                                            {expense.expenseNumber}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-gray-900 max-w-[200px] truncate">{expense.description}</td>
                                        <td className="hidden lg:table-cell whitespace-nowrap px-6 py-4">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${categoryConfig[expense.category]?.color || 'bg-gray-100 text-gray-700'}`}>
                                                {categoryConfig[expense.category]?.label || expense.category}
                                            </span>
                                        </td>
                                        <td className="hidden lg:table-cell whitespace-nowrap px-6 py-4 text-gray-500">{formatDate(expense.expenseDate)}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right font-medium">{formatCurrency(expense.totalAmount)}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusConfig[expense.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                                                {statusConfig[expense.status]?.label || expense.status}
                                            </span>
                                        </td>
                                        <td className="hidden md:table-cell whitespace-nowrap px-6 py-4 text-right">
                                            {canMutate && expense.status === 'draft' && (
                                                <button
                                                    onClick={() => handleDelete(expense.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                    title={t('finance.expenses.card.delete')}
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
                            <h2 className="text-lg font-bold">{t('finance.expenses.create.title')}</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.expenses.create.category')}</label>
                                    <select
                                        value={createForm.category}
                                        onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    >
                                        {Object.entries(categoryConfig).map(([key, config]) => (
                                            <option key={key} value={key}>{config.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.expenses.create.paymentMethod')}</label>
                                    <select
                                        value={createForm.paymentMethod}
                                        onChange={(e) => setCreateForm({ ...createForm, paymentMethod: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="CASH">{t('finance.expenses.paymentMethods.CASH')}</option>
                                        <option value="BANK_TRANSFER">{t('finance.expenses.paymentMethods.BANK_TRANSFER')}</option>
                                        <option value="QRIS">{t('finance.expenses.paymentMethods.QRIS')}</option>
                                        <option value="CREDIT_CARD">{t('finance.expenses.paymentMethods.CREDIT_CARD')}</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.expenses.create.description')}</label>
                                <input
                                    type="text"
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder={t('finance.expenses.create.descriptionPlaceholder')}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.expenses.create.amount')}</label>
                                    <input
                                        type="number"
                                        value={createForm.amount}
                                        onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.expenses.create.tax')}</label>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.expenses.create.total')}</label>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.expenses.create.expenseDate')}</label>
                                <input
                                    type="date"
                                    value={createForm.expenseDate}
                                    onChange={(e) => setCreateForm({ ...createForm, expenseDate: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                {t('finance.expenses.create.cancel')}
                            </button>
                            <button
                                onClick={handleCreateExpense}
                                disabled={!createForm.description || !createForm.amount}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('finance.expenses.create.submit')}
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
                confirmText={t('finance.expenses.delete.confirm')}
                cancelText={t('finance.expenses.delete.cancel')}
                variant="danger"
            />
        </div>
    )
}
