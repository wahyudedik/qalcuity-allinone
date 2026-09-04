'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import {
    Search,
    Plus,
    ChevronRight,
    BookOpen,
    Trash2,
    Check,
    X,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// ============================================
// TYPES
// ============================================

type JournalEntryItem = {
    id: string
    accountId: string
    debit: number
    credit: number
    description: string | null
    account: {
        id: string
        code: string
        name: string
        type: string
    }
}

type JournalEntry = {
    id: string
    entryNumber: string
    date: string
    description: string
    reference: string | null
    sourceType: string
    sourceId: string | null
    status: string
    totalDebit: number
    totalCredit: number
    createdBy: string
    items: JournalEntryItem[]
}

// ============================================
// STATUS CONFIG
// ============================================

const statusConfig: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
    POSTED: { label: 'Posted', color: 'bg-green-100 text-green-700' },
    VOID: { label: 'Void', color: 'bg-red-100 text-red-700' },
}

const sourceTypeLabels: Record<string, string> = {
    manual: 'Manual',
    invoice: 'Invoice',
    payment: 'Pembayaran',
    purchase_order: 'Purchase Order',
    payroll: 'Payroll',
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function JournalEntriesPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'

    // State
    const [entries, setEntries] = useState<JournalEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null)
    const [confirmTitle, setConfirmTitle] = useState('')
    const [confirmMessage, setConfirmMessage] = useState('')

    // Create modal state
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [createForm, setCreateForm] = useState({
        description: '',
        reference: '',
        date: new Date().toISOString().slice(0, 10),
        sourceType: 'manual',
        items: [
            { accountId: '', debit: 0, credit: 0, description: '' },
            { accountId: '', debit: 0, credit: 0, description: '' },
        ],
    })
    const [accounts, setAccounts] = useState<Array<{ id: string; code: string; name: string; type: string }>>([])
    const [submitting, setSubmitting] = useState(false)

    // ============================================
    // EFFECTS
    // ============================================

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    useEffect(() => {
        fetchEntries()
        fetchAccounts()
    }, [])

    // ============================================
    // DATA FETCHING
    // ============================================

    const fetchEntries = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await fetch('/api/finance/journal-entries')
            const data = await response.json()
            if (data.success) {
                setEntries(data.data)
            } else {
                setError(t('finance.journalEntries.error'))
            }
        } catch {
            setError(t('finance.journalEntries.errorGeneric'))
        } finally {
            setLoading(false)
        }
    }

    const fetchAccounts = async () => {
        try {
            const response = await fetch('/api/finance/accounts')
            const data = await response.json()
            if (data.success) {
                setAccounts(data.data || [])
            }
        } catch (error) {
            console.error('Failed to fetch accounts:', error);
        }
    }

    // ============================================
    // FILTERS
    // ============================================

    const filteredEntries = entries.filter((entry) => {
        const matchesStatus = statusFilter === 'all' || entry.status === statusFilter
        const matchesSearch =
            search === '' ||
            entry.entryNumber.toLowerCase().includes(search.toLowerCase()) ||
            entry.description.toLowerCase().includes(search.toLowerCase()) ||
            (entry.reference && entry.reference.toLowerCase().includes(search.toLowerCase()))
        return matchesStatus && matchesSearch
    })

    // ============================================
    // STATS
    // ============================================

    const stats = {
        total: entries.length,
        draft: entries.filter((e) => e.status === 'DRAFT').length,
        posted: entries.filter((e) => e.status === 'POSTED').length,
        totalDebit: entries.reduce((sum, e) => sum + Number(e.totalDebit), 0),
    }

    // ============================================
    // HANDLERS
    // ============================================

    const handleCreateEntry = async () => {
        if (!createForm.description.trim()) {
            setToast({ message: 'Deskripsi wajib diisi', type: 'error' })
            return
        }

        // Validate items
        const validItems = createForm.items.filter(
            (item) => item.accountId && (item.debit > 0 || item.credit > 0)
        )
        if (validItems.length < 2) {
            setToast({ message: 'Minimal 2 item jurnal diperlukan', type: 'error' })
            return
        }

        const totalDebit = validItems.reduce((sum, item) => sum + item.debit, 0)
        const totalCredit = validItems.reduce((sum, item) => sum + item.credit, 0)
        if (Math.abs(totalDebit - totalCredit) >= 0.01) {
            setToast({
                message: `Total debit (${formatCurrency(totalDebit)}) harus sama dengan total credit (${formatCurrency(totalCredit)})`,
                type: 'error',
            })
            return
        }

        try {
            setSubmitting(true)
            const response = await fetch('/api/finance/journal-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: createForm.description,
                    reference: createForm.reference || null,
                    date: createForm.date,
                    sourceType: createForm.sourceType,
                    items: validItems.map((item) => ({
                        accountId: item.accountId,
                        debit: item.debit || 0,
                        credit: item.credit || 0,
                        description: item.description || null,
                    })),
                }),
            })
            const result = await response.json()
            if (result.success) {
                setShowCreateModal(false)
                setCreateForm({
                    description: '',
                    reference: '',
                    date: new Date().toISOString().slice(0, 10),
                    sourceType: 'manual',
                    items: [
                        { accountId: '', debit: 0, credit: 0, description: '' },
                        { accountId: '', debit: 0, credit: 0, description: '' },
                    ],
                })
                fetchEntries()
                setToast({ message: 'Journal entry berhasil dibuat', type: 'success' })
            } else {
                setToast({ message: `Gagal membuat: ${result.error}`, type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal membuat journal entry', type: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        setConfirmTitle('Konfirmasi Hapus')
        setConfirmMessage('Apakah Anda yakin ingin menghapus journal entry ini?')
        setConfirmAction(() => async () => {
            try {
                const response = await fetch(`/api/finance/journal-entries/${id}`, {
                    method: 'DELETE',
                })
                const result = await response.json()
                if (result.success) {
                    fetchEntries()
                    setToast({ message: 'Journal entry berhasil dihapus', type: 'success' })
                } else {
                    setToast({ message: `Gagal menghapus: ${result.error}`, type: 'error' })
                }
            } catch {
                setToast({ message: 'Gagal menghapus journal entry', type: 'error' })
            }
        })
        setShowConfirmDialog(true)
    }

    const addItem = () => {
        setCreateForm((prev) => ({
            ...prev,
            items: [...prev.items, { accountId: '', debit: 0, credit: 0, description: '' }],
        }))
    }

    const removeItem = (index: number) => {
        if (createForm.items.length <= 2) return
        setCreateForm((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }))
    }

    const updateItem = (index: number, field: string, value: string | number) => {
        setCreateForm((prev) => ({
            ...prev,
            items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
        }))
    }

    // ============================================
    // COMPUTED VALUES
    // ============================================

    const totalDebit = createForm.items.reduce((sum, item) => sum + (item.debit || 0), 0)
    const totalCredit = createForm.items.reduce((sum, item) => sum + (item.credit || 0), 0)
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0

    // ============================================
    // RENDER: LOADING
    // ============================================

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
                        ))}
                    </div>
                    <div className="h-96 bg-gray-200 rounded-xl"></div>
                </div>
            </div>
        )
    }

    // ============================================
    // RENDER: ERROR
    // ============================================

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={fetchEntries}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        {t('common.tryAgain')}
                    </button>
                </div>
            </div>
        )
    }

    // ============================================
    // RENDER: MAIN
    // ============================================

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {t('finance.journalEntries.title')}
                    </h1>
                    <p className="text-gray-500">{t('finance.journalEntries.subtitle')}</p>
                </div>
                {canMutate && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        {t('finance.journalEntries.createEntry')}
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('finance.journalEntries.stats.totalEntries')}</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('finance.journalEntries.stats.draft')}</p>
                    <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('finance.journalEntries.stats.posted')}</p>
                    <p className="text-2xl font-bold text-green-600">{stats.posted}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('finance.journalEntries.stats.totalDebit')}</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalDebit)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('finance.journalEntries.searchPlaceholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                        <option value="all">{t('finance.journalEntries.filter.allStatus')}</option>
                        <option value="DRAFT">{t('finance.journalEntries.filter.draft')}</option>
                        <option value="POSTED">{t('finance.journalEntries.filter.posted')}</option>
                        <option value="VOID">{t('finance.journalEntries.filter.void')}</option>
                    </select>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {filteredEntries.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                        <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p>{t('finance.journalEntries.empty')}</p>
                    </div>
                ) : (
                    filteredEntries.map((entry) => (
                        <div key={entry.id} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Link
                                        href={`/dashboard/finance/journal-entries/${entry.id}`}
                                        className="font-medium text-blue-600 hover:underline"
                                    >
                                        {entry.entryNumber}
                                    </Link>
                                    <p className="text-sm text-gray-500 mt-1">{entry.description}</p>
                                </div>
                                <span
                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusConfig[entry.status]?.color || 'bg-gray-100 text-gray-700'}`}
                                >
                                    {statusConfig[entry.status]?.label || entry.status}
                                </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500">{t('finance.journalEntries.table.date')}:</span>
                                    <span className="ml-1">{formatDate(entry.date)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('finance.journalEntries.table.debit')}:</span>
                                    <span className="ml-1 font-medium">{formatCurrency(entry.totalDebit)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('finance.journalEntries.table.credit')}:</span>
                                    <span className="ml-1 font-medium">{formatCurrency(entry.totalCredit)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('finance.journalEntries.table.source')}:</span>
                                    <span className="ml-1">{sourceTypeLabels[entry.sourceType] || entry.sourceType}</span>
                                </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                                <Link
                                    href={`/dashboard/finance/journal-entries/${entry.id}`}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    {t('common.view')}
                                </Link>
                                {canMutate && entry.status === 'DRAFT' && (
                                    <button
                                        onClick={() => handleDelete(entry.id)}
                                        className="text-sm text-red-600 hover:text-red-800"
                                    >
                                        {t('common.delete')}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    {t('finance.journalEntries.table.entryNumber')}
                                </th>
                                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    {t('finance.journalEntries.table.date')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    {t('finance.journalEntries.table.description')}
                                </th>
                                <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    {t('finance.journalEntries.table.source')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                    {t('finance.journalEntries.table.debit')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                    {t('finance.journalEntries.table.credit')}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                    {t('finance.journalEntries.table.status')}
                                </th>
                                <th className="hidden md:table-cell px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"></th>
                                <th className="hidden md:table-cell px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                        <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                        <p>{t('finance.journalEntries.empty')}</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredEntries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <Link
                                                href={`/dashboard/finance/journal-entries/${entry.id}`}
                                                className="font-medium text-blue-600 hover:underline"
                                            >
                                                {entry.entryNumber}
                                            </Link>
                                        </td>
                                        <td className="hidden md:table-cell whitespace-nowrap px-6 py-4 text-gray-500">
                                            {formatDate(entry.date)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 max-w-xs truncate">{entry.description}</td>
                                        <td className="hidden lg:table-cell whitespace-nowrap px-6 py-4 text-gray-500">
                                            {sourceTypeLabels[entry.sourceType] || entry.sourceType}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right">
                                            <span className="inline-flex items-center gap-1 font-medium text-gray-900">
                                                <ArrowUpRight className="h-3 w-3 text-red-500" />
                                                {formatCurrency(entry.totalDebit)}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right">
                                            <span className="inline-flex items-center gap-1 font-medium text-gray-900">
                                                <ArrowDownRight className="h-3 w-3 text-green-500" />
                                                {formatCurrency(entry.totalCredit)}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            <span
                                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusConfig[entry.status]?.color || 'bg-gray-100 text-gray-700'}`}
                                            >
                                                {statusConfig[entry.status]?.label || entry.status}
                                            </span>
                                        </td>
                                        <td className="hidden md:table-cell whitespace-nowrap px-6 py-4 text-right">
                                            <Link
                                                href={`/dashboard/finance/journal-entries/${entry.id}`}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                <ChevronRight className="h-4 w-4 inline" />
                                            </Link>
                                        </td>
                                        <td className="hidden md:table-cell whitespace-nowrap px-6 py-4 text-right">
                                            {canMutate && entry.status === 'DRAFT' && (
                                                <button
                                                    onClick={() => handleDelete(entry.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                    title={t('common.delete')}
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
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {t('finance.journalEntries.createEntry')}
                            </h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="px-6 py-4 space-y-4">
                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('finance.journalEntries.form.description')} *
                                </label>
                                <input
                                    type="text"
                                    value={createForm.description}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({ ...prev, description: e.target.value }))
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="Masukkan deskripsi jurnal"
                                />
                            </div>

                            {/* Date & Source Type */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('finance.journalEntries.form.date')}
                                    </label>
                                    <input
                                        type="date"
                                        value={createForm.date}
                                        onChange={(e) =>
                                            setCreateForm((prev) => ({ ...prev, date: e.target.value }))
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('finance.journalEntries.form.sourceType')}
                                    </label>
                                    <select
                                        value={createForm.sourceType}
                                        onChange={(e) =>
                                            setCreateForm((prev) => ({ ...prev, sourceType: e.target.value }))
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="manual">{t('finance.journalEntries.sourceTypes.manual')}</option>
                                        <option value="invoice">{t('finance.journalEntries.sourceTypes.invoice')}</option>
                                        <option value="payment">{t('finance.journalEntries.sourceTypes.payment')}</option>
                                        <option value="purchase_order">{t('finance.journalEntries.sourceTypes.purchaseOrder')}</option>
                                        <option value="payroll">{t('finance.journalEntries.sourceTypes.payroll')}</option>
                                    </select>
                                </div>
                            </div>

                            {/* Reference */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('finance.journalEntries.form.reference')} ({t('common.optional')})
                                </label>
                                <input
                                    type="text"
                                    value={createForm.reference}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({ ...prev, reference: e.target.value }))
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="Nomor referensi"
                                />
                            </div>

                            {/* Items */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        {t('finance.journalEntries.form.items')} *
                                    </label>
                                    {canMutate && (
                                        <button
                                            onClick={addItem}
                                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            <Plus className="h-3 w-3" />
                                            {t('finance.journalEntries.form.addItem')}
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {createForm.items.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2 rounded-lg border border-gray-200 p-3">
                                            <select
                                                value={item.accountId}
                                                onChange={(e) => updateItem(index, 'accountId', e.target.value)}
                                                className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                                            >
                                                <option value="">Pilih Akun</option>
                                                {accounts.map((acc) => (
                                                    <option key={acc.id} value={acc.id}>
                                                        {acc.code} - {acc.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="w-32">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.debit || ''}
                                                    onChange={(e) =>
                                                        updateItem(index, 'debit', parseFloat(e.target.value) || 0)
                                                    }
                                                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                                                    placeholder="Debit"
                                                />
                                            </div>
                                            <div className="w-32">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.credit || ''}
                                                    onChange={(e) =>
                                                        updateItem(index, 'credit', parseFloat(e.target.value) || 0)
                                                    }
                                                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                                                    placeholder="Credit"
                                                />
                                            </div>
                                            {createForm.items.length > 2 && (
                                                <button
                                                    onClick={() => removeItem(index)}
                                                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {/* Balance indicator */}
                                <div className="mt-2 flex items-center justify-between text-sm">
                                    <span className="text-gray-500">
                                        {t('finance.journalEntries.form.total')}: Debit {formatCurrency(totalDebit)} | Credit{' '}
                                        {formatCurrency(totalCredit)}
                                    </span>
                                    <span
                                        className={`font-medium ${isBalanced ? 'text-green-600' : 'text-red-600'}`}
                                    >
                                        {isBalanced ? 'Seimbang' : 'Tidak Seimbang'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleCreateEntry}
                                disabled={submitting || !isBalanced}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Menyimpan...' : t('common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div
                    className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                        }`}
                >
                    <span className="inline-flex items-center gap-1.5">
                        {toast.type === 'success' ? (
                            <Check className="h-4 w-4" />
                        ) : (
                            <X className="h-4 w-4" />
                        )}
                        {toast.message}
                    </span>
                </div>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={showConfirmDialog}
                onClose={() => {
                    setShowConfirmDialog(false)
                    setConfirmAction(null)
                }}
                onConfirm={async () => {
                    if (confirmAction) await confirmAction()
                    setShowConfirmDialog(false)
                    setConfirmAction(null)
                }}
                title={confirmTitle}
                message={confirmMessage}
                confirmText={t('common.delete')}
                cancelText={t('common.cancel')}
                variant="danger"
            />
        </div>
    )
}
