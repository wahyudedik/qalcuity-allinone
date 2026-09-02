'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import {
    ArrowLeft,
    BookOpen,
    ArrowUpRight,
    ArrowDownRight,
    Trash2,
    Check,
    X,
    FileText,
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

type JournalEntryDetail = {
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
    createdAt: string
    updatedAt: string
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

const accountTypeLabels: Record<string, { label: string; color: string }> = {
    ASSET: { label: 'Aset', color: 'text-blue-700 bg-blue-100' },
    LIABILITY: { label: 'Kewajiban', color: 'text-red-700 bg-red-100' },
    EQUITY: { label: 'Ekuitas', color: 'text-purple-700 bg-purple-100' },
    REVENUE: { label: 'Pendapatan', color: 'text-green-700 bg-green-100' },
    EXPENSE: { label: 'Beban', color: 'text-orange-700 bg-orange-100' },
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function JournalEntryDetailPage({ params }: { params: { id: string } }) {
    const { t } = useTranslation()
    const router = useRouter()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'

    const [entry, setEntry] = useState<JournalEntryDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null)
    const [confirmTitle, setConfirmTitle] = useState('')
    const [confirmMessage, setConfirmMessage] = useState('')

    // ============================================
    // EFFECTS
    // ============================================

    useEffect(() => {
        fetchEntry()
    }, [params.id])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    // ============================================
    // DATA FETCHING
    // ============================================

    const fetchEntry = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await fetch(`/api/finance/journal-entries/${params.id}`)
            const data = await response.json()
            if (data.success) {
                setEntry(data.data)
            } else {
                setError(t('finance.journalEntryDetail.error'))
            }
        } catch {
            setError(t('finance.journalEntryDetail.errorLoad'))
        } finally {
            setLoading(false)
        }
    }

    // ============================================
    // HANDLERS
    // ============================================

    const handlePost = async () => {
        setConfirmTitle('Konfirmasi Post')
        setConfirmMessage('Apakah Anda yakin ingin memposting journal entry ini? Setelah diposting, tidak dapat diubah.')
        setConfirmAction(() => async () => {
            try {
                const response = await fetch(`/api/finance/journal-entries/${params.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'POSTED' }),
                })
                const result = await response.json()
                if (result.success) {
                    setEntry((prev) => (prev ? { ...prev, status: 'POSTED' } : prev))
                    setToast({ message: 'Journal entry berhasil diposting', type: 'success' })
                } else {
                    setToast({ message: `Gagal memposting: ${result.error}`, type: 'error' })
                }
            } catch {
                setToast({ message: 'Gagal memposting journal entry', type: 'error' })
            }
        })
        setShowConfirmDialog(true)
    }

    const handleVoid = async () => {
        setConfirmTitle('Konfirmasi Void')
        setConfirmMessage('Apakah Anda yakin ingin memvoid journal entry ini?')
        setConfirmAction(() => async () => {
            try {
                const response = await fetch(`/api/finance/journal-entries/${params.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'VOID' }),
                })
                const result = await response.json()
                if (result.success) {
                    setEntry((prev) => (prev ? { ...prev, status: 'VOID' } : prev))
                    setToast({ message: 'Journal entry berhasil divoid', type: 'success' })
                } else {
                    setToast({ message: `Gagal memvoid: ${result.error}`, type: 'error' })
                }
            } catch {
                setToast({ message: 'Gagal memvoid journal entry', type: 'error' })
            }
        })
        setShowConfirmDialog(true)
    }

    const handleDelete = async () => {
        setConfirmTitle('Konfirmasi Hapus')
        setConfirmMessage('Apakah Anda yakin ingin menghapus journal entry ini?')
        setConfirmAction(() => async () => {
            try {
                const response = await fetch(`/api/finance/journal-entries/${params.id}`, {
                    method: 'DELETE',
                })
                const result = await response.json()
                if (result.success) {
                    setToast({ message: 'Journal entry berhasil dihapus', type: 'success' })
                    router.push('/dashboard/finance/journal-entries')
                } else {
                    setToast({ message: `Gagal menghapus: ${result.error}`, type: 'error' })
                }
            } catch {
                setToast({ message: 'Gagal menghapus journal entry', type: 'error' })
            }
        })
        setShowConfirmDialog(true)
    }

    // ============================================
    // RENDER: LOADING
    // ============================================

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse" />
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />
                    <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="space-y-1">
                                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4" />
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="h-4 flex-1 bg-gray-200 rounded animate-pulse" />
                                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    // ============================================
    // RENDER: ERROR
    // ============================================

    if (error || !entry) {
        return (
            <div className="p-6">
                <div className="flex flex-col items-center justify-center py-12">
                    <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">{error || t('finance.journalEntryDetail.error')}</p>
                    <Link
                        href="/dashboard/finance/journal-entries"
                        className="mt-4 text-blue-600 hover:underline"
                    >
                        {t('finance.journalEntryDetail.backToList')}
                    </Link>
                </div>
            </div>
        )
    }

    // ============================================
    // COMPUTED VALUES
    // ============================================

    const isBalanced = Math.abs(Number(entry.totalDebit) - Number(entry.totalCredit)) < 0.01
    const canEdit = entry.status === 'DRAFT' && canMutate

    // ============================================
    // RENDER: MAIN
    // ============================================

    return (
        <div className="space-y-6 p-6">
            {/* Toast */}
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}
                >
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/finance/journal-entries"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{entry.entryNumber}</h1>
                            <span
                                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[entry.status]?.color || 'bg-gray-100 text-gray-700'}`}
                            >
                                {statusConfig[entry.status]?.label || entry.status}
                            </span>
                        </div>
                        <p className="text-gray-500 mt-1">{entry.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {canEdit && entry.status === 'DRAFT' && (
                        <>
                            <button
                                onClick={handlePost}
                                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                            >
                                <Check className="h-4 w-4" />
                                {t('finance.journalEntryDetail.post')}
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                {t('common.delete')}
                            </button>
                        </>
                    )}
                    {canEdit && entry.status === 'POSTED' && (
                        <button
                            onClick={handleVoid}
                            className="flex items-center gap-2 rounded-lg border border-orange-300 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50"
                        >
                            <X className="h-4 w-4" />
                            {t('finance.journalEntryDetail.void')}
                        </button>
                    )}
                </div>
            </div>

            {/* Entry Info */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-400" />
                    {t('finance.journalEntryDetail.entryInfo')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <p className="text-sm text-gray-500">{t('finance.journalEntryDetail.entryNumber')}</p>
                        <p className="font-medium text-gray-900">{entry.entryNumber}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">{t('finance.journalEntryDetail.date')}</p>
                        <p className="font-medium text-gray-900">{formatDate(entry.date)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">{t('finance.journalEntryDetail.sourceType')}</p>
                        <p className="font-medium text-gray-900">
                            {sourceTypeLabels[entry.sourceType] || entry.sourceType}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">{t('finance.journalEntryDetail.reference')}</p>
                        <p className="font-medium text-gray-900">{entry.reference || '-'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">{t('finance.journalEntryDetail.totalDebit')}</p>
                        <p className="font-medium text-gray-900">{formatCurrency(Number(entry.totalDebit))}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">{t('finance.journalEntryDetail.totalCredit')}</p>
                        <p className="font-medium text-gray-900">{formatCurrency(Number(entry.totalCredit))}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">{t('finance.journalEntryDetail.status')}</p>
                        <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusConfig[entry.status]?.color || 'bg-gray-100 text-gray-700'}`}
                        >
                            {statusConfig[entry.status]?.label || entry.status}
                        </span>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">{t('finance.journalEntryDetail.balance')}</p>
                        <p className={`font-medium ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                            {isBalanced ? 'Seimbang' : 'Tidak Seimbang'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Journal Items */}
            <div className="rounded-xl border border-gray-200 bg-white">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-gray-400" />
                        {t('finance.journalEntryDetail.items')} ({entry.items.length})
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    {t('finance.journalEntryDetail.table.account')}
                                </th>
                                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    {t('finance.journalEntryDetail.table.type')}
                                </th>
                                <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    {t('finance.journalEntryDetail.table.description')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                    {t('finance.journalEntryDetail.table.debit')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                    {t('finance.journalEntryDetail.table.credit')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {entry.items.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-gray-900">{item.account.code}</p>
                                            <p className="text-sm text-gray-500">{item.account.name}</p>
                                        </div>
                                    </td>
                                    <td className="hidden md:table-cell px-6 py-4">
                                        <span
                                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${accountTypeLabels[item.account.type]?.color || 'bg-gray-100 text-gray-700'}`}
                                        >
                                            {accountTypeLabels[item.account.type]?.label || item.account.type}
                                        </span>
                                    </td>
                                    <td className="hidden lg:table-cell px-6 py-4 text-sm text-gray-500">
                                        {item.description || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {Number(item.debit) > 0 ? (
                                            <span className="inline-flex items-center gap-1 font-medium text-gray-900">
                                                <ArrowUpRight className="h-3 w-3 text-red-500" />
                                                {formatCurrency(Number(item.debit))}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {Number(item.credit) > 0 ? (
                                            <span className="inline-flex items-center gap-1 font-medium text-gray-900">
                                                <ArrowDownRight className="h-3 w-3 text-green-500" />
                                                {formatCurrency(Number(item.credit))}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {/* Totals row */}
                            <tr className="bg-gray-50 font-semibold">
                                <td colSpan={3} className="px-6 py-3 text-right text-sm text-gray-700">
                                    {t('finance.journalEntryDetail.table.total')}
                                </td>
                                <td className="px-6 py-3 text-right text-sm text-gray-900">
                                    {formatCurrency(Number(entry.totalDebit))}
                                </td>
                                <td className="px-6 py-3 text-right text-sm text-gray-900">
                                    {formatCurrency(Number(entry.totalCredit))}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

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
                confirmText={t('common.confirm')}
                cancelText={t('common.cancel')}
                variant="danger"
            />
        </div>
    )
}
