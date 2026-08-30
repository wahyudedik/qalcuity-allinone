'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency as fmtCurrency, formatDate as fmtDate } from '@/lib/utils'
import {
    ArrowUpDown,
    CheckCircle,
    XCircle,
    Upload,
    FileText,
    RefreshCw,
    Filter,
    Search,
    AlertTriangle,
    Building2,
    ChevronDown,
    Download,
    Eye,
    Link as LinkIcon,
    Unlink,
    Loader2,
} from 'lucide-react'

interface BankTransaction {
    id: string
    date: string
    description: string
    amount: number
    type: 'credit' | 'debit'
    status: 'matched' | 'unmatched' | 'discrepancy'
    bookTransactionId?: string
    bankReference?: string
}

interface BookTransaction {
    id: string
    date: string
    description: string
    amount: number
    type: 'income' | 'expense'
    reference: string
    category: string
}

interface ReconciliationSummary {
    bookBalance: number
    bankBalance: number
    difference: number
    matchedCount: number
    unmatchedCount: number
    discrepancyCount: number
    lastReconciliation?: string
}

interface BankAccount {
    id: string
    name: string
    number: string
    bank: string
}

function formatCurrencyFull(amount: number): string {
    return `Rp ${Math.abs(amount).toLocaleString('id-ID')}`
}

export default function ReconciliationPage() {
    const { t } = useTranslation()
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
    const [selectedAccount, setSelectedAccount] = useState<string>('1')
    const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([])
    const [bookTransactions, setBookTransactions] = useState<BookTransaction[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [summary, setSummary] = useState<ReconciliationSummary>({
        bookBalance: 0,
        bankBalance: 0,
        difference: 0,
        matchedCount: 0,
        unmatchedCount: 0,
        discrepancyCount: 0,
    })
    const [activeTab, setActiveTab] = useState<'unmatched' | 'matched' | 'discrepancy'>('unmatched')
    const [searchQuery, setSearchQuery] = useState('')
    const [showMatchModal, setShowMatchModal] = useState(false)
    const [selectedBankTx, setSelectedBankTx] = useState<BankTransaction | null>(null)
    const [matchFilter, setMatchFilter] = useState<string>('all')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    // Helper untuk format currency singkat (Rp X Miliar/Jt)
    const fmtCurrencyShort = (amount: number): string => {
        const abs = Math.abs(amount)
        if (abs >= 1000000000) return `Rp ${(abs / 1000000000).toFixed(1).replace('.', ',')} Miliar`
        if (abs >= 1000000) return `Rp ${(abs / 1000000).toFixed(1).replace('.', ',')} Jt`
        return `Rp ${abs.toLocaleString('id-ID')}`
    }

    // ─── Fetch reconciliation data from API ─────────────
    const fetchData = useCallback(async (showRefresh = false) => {
        try {
            if (showRefresh) setRefreshing(true)
            else setLoading(true)
            setError(null)

            const res = await fetch(`/api/finance/reconciliation?accountId=${selectedAccount}&type=all`)
            const json = await res.json()

            if (!json.success) {
                throw new Error(json.message || t('finance.reconciliation.errorLoad'))
            }

            setBankAccounts(json.data.bankAccounts || [])
            setBankTransactions(json.data.bankTransactions || [])
            setBookTransactions(json.data.bookTransactions || [])
            setSummary(json.data.summary || {
                bookBalance: 0,
                bankBalance: 0,
                difference: 0,
                matchedCount: 0,
                unmatchedCount: 0,
                discrepancyCount: 0,
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : t('finance.reconciliation.errorGeneric'))
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [selectedAccount])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Filter transactions
    const filteredTransactions = bankTransactions.filter(t => {
        const matchesTab = t.status === activeTab
        const matchesSearch = searchQuery === '' ||
            t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.bankReference?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesFilter = matchFilter === 'all' || t.type === matchFilter
        return matchesTab && matchesSearch && matchesFilter
    })

    // ─── Match via API ─────────────
    const handleMatch = async (bankTxId: string, bookTxId: string) => {
        try {
            const res = await fetch('/api/finance/reconciliation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bankTransactionId: bankTxId, bookTransactionId: bookTxId }),
            })
            const json = await res.json()
            if (!json.success) {
                setToast({ message: json.message || t('finance.reconciliation.errorMatch'), type: 'error' })
                return
            }
            // Update local state
            setBankTransactions(prev =>
                prev.map(t =>
                    t.id === bankTxId ? { ...t, status: 'matched' as const, bookTransactionId: bookTxId } : t
                )
            )
            setShowMatchModal(false)
            setSelectedBankTx(null)
        } catch {
            setToast({ message: t('finance.reconciliation.errorMatchGeneric'), type: 'error' })
        }
    }

    // ─── Mark as Discrepancy via API ─────────────
    const handleMarkAsDiscrepancy = async (bankTxId: string) => {
        try {
            const res = await fetch('/api/finance/reconciliation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bankTransactionId: bankTxId, action: 'discrepancy' }),
            })
            const json = await res.json()
            if (!json.success) {
                setToast({ message: json.message || t('finance.reconciliation.errorMark'), type: 'error' })
                return
            }
            setBankTransactions(prev =>
                prev.map(t =>
                    t.id === bankTxId ? { ...t, status: 'discrepancy' as const } : t
                )
            )
        } catch {
            setToast({ message: t('finance.reconciliation.errorGeneric'), type: 'error' })
        }
    }

    // ─── Unmatch via API ─────────────
    const handleUnmatch = async (bankTxId: string) => {
        try {
            const res = await fetch('/api/finance/reconciliation', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bankTransactionId: bankTxId }),
            })
            const json = await res.json()
            if (!json.success) {
                setToast({ message: json.message || t('finance.reconciliation.errorUnmatch'), type: 'error' })
                return
            }
            setBankTransactions(prev =>
                prev.map(t =>
                    t.id === bankTxId ? { ...t, status: 'unmatched' as const, bookTransactionId: undefined } : t
                )
            )
        } catch {
            setToast({ message: t('finance.reconciliation.errorGeneric'), type: 'error' })
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'matched':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        {t('finance.reconciliation.matched')}
                    </span>
                )
            case 'unmatched':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <AlertTriangle className="h-3 w-3" />
                        {t('finance.reconciliation.unmatched')}
                    </span>
                )
            case 'discrepancy':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <XCircle className="h-3 w-3" />
                        {t('finance.reconciliation.discrepancy')}
                    </span>
                )
            default:
                return null
        }
    }

    // Recalculate summary counts from current state
    const currentSummary: ReconciliationSummary = {
        ...summary,
        matchedCount: bankTransactions.filter(t => t.status === 'matched').length,
        unmatchedCount: bankTransactions.filter(t => t.status === 'unmatched').length,
        discrepancyCount: bankTransactions.filter(t => t.status === 'discrepancy').length,
    }

    // ─── Loading state ─────────────
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                            <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="mt-2 h-8 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-3 text-sm text-gray-500">{t('finance.reconciliation.loading')}</span>
                </div>
            </div>
        )
    }

    // ─── Error state ─────────────
    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('finance.reconciliation.title')}</h1>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-16 dark:border-red-800 dark:bg-red-900/20">
                    <AlertTriangle className="mb-3 h-12 w-12 text-red-400" />
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
                    <button
                        onClick={() => fetchData()}
                        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                        {t('finance.reconciliation.retry')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t('finance.reconciliation.title')}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('finance.reconciliation.subtitle')}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                        <Download className="h-4 w-4" />
                        {t('finance.reconciliation.export')}
                    </button>
                    <button
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        {t('finance.reconciliation.refresh')}
                    </button>
                </div>
            </div>

            {/* Bank Account Selection */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                        <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('finance.reconciliation.selectAccount')}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('finance.reconciliation.selectAccountDesc')}</p>
                    </div>
                </div>
                <div className="relative">
                    <select
                        value={selectedAccount}
                        onChange={(e) => setSelectedAccount(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    >
                        {bankAccounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                                {acc.name} - {acc.number}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('finance.reconciliation.bookBalance')}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrencyFull(currentSummary.bookBalance)}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{t('finance.reconciliation.bookBalanceDesc')}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('finance.reconciliation.bankBalance')}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrencyFull(currentSummary.bankBalance)}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{t('finance.reconciliation.bankBalanceDesc')}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800 sm:col-span-2 lg:col-span-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('finance.reconciliation.difference')}</p>
                    <p className={`mt-2 text-2xl font-bold ${currentSummary.difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {currentSummary.difference >= 0 ? '+' : '-'} {formatCurrencyFull(currentSummary.difference)}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{t('finance.reconciliation.differenceDesc')}</p>
                </div>
            </div>

            {/* Status Overview */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">{t('finance.reconciliation.matched')}</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-green-700 dark:text-green-400">{currentSummary.matchedCount}</p>
                </div>
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">{t('finance.reconciliation.unmatched')}</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-yellow-700 dark:text-yellow-400">{currentSummary.unmatchedCount}</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-medium text-red-700 dark:text-red-400">{t('finance.reconciliation.discrepancy')}</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-red-700 dark:text-red-400">{currentSummary.discrepancyCount}</p>
                </div>
            </div>

            {/* Transaction Matching */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex overflow-x-auto" aria-label="Reconciliation tabs">
                        {([
                            { key: 'unmatched' as const, label: t('finance.reconciliation.unmatched'), count: currentSummary.unmatchedCount, color: 'yellow' },
                            { key: 'matched' as const, label: t('finance.reconciliation.matched'), count: currentSummary.matchedCount, color: 'green' },
                            { key: 'discrepancy' as const, label: t('finance.reconciliation.discrepancy'), count: currentSummary.discrepancyCount, color: 'red' },
                        ]).map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === tab.key
                                    ? `border-blue-600 text-blue-600`
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                            >
                                {tab.label}
                                <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${activeTab === tab.key
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                    }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center dark:border-gray-700">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('finance.reconciliation.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        />
                    </div>
                    <div className="relative">
                        <select
                            value={matchFilter}
                            onChange={(e) => setMatchFilter(e.target.value)}
                            className="appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-8 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        >
                            <option value="all">{t('finance.reconciliation.allTypes')}</option>
                            <option value="credit">{t('finance.reconciliation.income')}</option>
                            <option value="debit">{t('finance.reconciliation.expense')}</option>
                        </select>
                        <Filter className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    </div>
                </div>

                {/* Kartu Transaksi untuk tampilan mobile */}
                <div className="md:hidden space-y-3 px-4 py-4">
                    {filteredTransactions.length === 0 ? (
                        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800">
                            <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                            <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                                {t('finance.reconciliation.noTransactions')}
                            </p>
                        </div>
                    ) : (
                        filteredTransactions.map((tx) => (
                            <div key={tx.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{tx.description}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(tx.date)}</div>
                                    </div>
                                    {getStatusBadge(tx.status)}
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('finance.reconciliation.amount')}:</span>
                                        <span className={`ml-1 font-semibold ${tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {tx.amount >= 0 ? '+' : ''}{formatCurrencyFull(tx.amount)}
                                        </span>
                                    </div>
                                    {tx.bankReference && (
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">{t('finance.reconciliation.reference')}:</span>
                                            <span className="ml-1 text-xs">{tx.bankReference}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3 flex flex-wrap justify-end gap-2">
                                    {tx.status === 'unmatched' && (
                                        <>
                                            <button
                                                onClick={() => { setSelectedBankTx(tx); setShowMatchModal(true); }}
                                                className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                                            >
                                                <LinkIcon className="h-3 w-3" />
                                                {t('finance.reconciliation.match')}
                                            </button>
                                            <button
                                                onClick={() => handleMarkAsDiscrepancy(tx.id)}
                                                className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                                            >
                                                <XCircle className="h-3 w-3" />
                                                {t('finance.reconciliation.markDiscrepancy')}
                                            </button>
                                        </>
                                    )}
                                    {tx.status === 'matched' && (
                                        <button
                                            onClick={() => handleUnmatch(tx.id)}
                                            className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300"
                                        >
                                            <Unlink className="h-3 w-3" />
                                            {t('finance.reconciliation.unmatch')}
                                        </button>
                                    )}
                                    {tx.status === 'discrepancy' && (
                                        <>
                                            <button
                                                onClick={() => { setSelectedBankTx(tx); setShowMatchModal(true); }}
                                                className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                                            >
                                                <LinkIcon className="h-3 w-3" />
                                                {t('finance.reconciliation.match')}
                                            </button>
                                            <button className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300">
                                                <Eye className="h-3 w-3" />
                                                {t('finance.reconciliation.detail')}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Tabel Transaksi untuk tampilan desktop */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    {t('finance.reconciliation.date')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    {t('finance.reconciliation.description')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    {t('finance.reconciliation.reference')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    {t('finance.reconciliation.amount')}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    {t('finance.reconciliation.status')}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    {t('finance.reconciliation.action')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center">
                                            <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                                            <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                                                {t('finance.reconciliation.noTransactions')}
                                            </p>
                                            <p className="mt-1 text-xs text-gray-400">
                                                {activeTab === 'unmatched' ? t('finance.reconciliation.noDataAllMatched') : t('finance.reconciliation.noDataForFilter')}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                            {fmtDate(tx.date)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{tx.description}</p>
                                            {tx.bankReference && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{tx.bankReference}</p>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {tx.bankReference || '-'}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right">
                                            <span className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {tx.amount >= 0 ? '+' : ''}{formatCurrencyFull(tx.amount)}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            {getStatusBadge(tx.status)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {tx.status === 'unmatched' && (
                                                    <>
                                                        <button
                                                            onClick={() => { setSelectedBankTx(tx); setShowMatchModal(true); }}
                                                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                                                        >
                                                            <LinkIcon className="h-3 w-3" />
                                                            {t('finance.reconciliation.match')}
                                                        </button>
                                                        <button
                                                            onClick={() => handleMarkAsDiscrepancy(tx.id)}
                                                            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                                                        >
                                                            <XCircle className="h-3 w-3" />
                                                            {t('finance.reconciliation.markDiscrepancy')}
                                                        </button>
                                                    </>
                                                )}
                                                {tx.status === 'matched' && (
                                                    <button
                                                        onClick={() => handleUnmatch(tx.id)}
                                                        className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300"
                                                    >
                                                        <Unlink className="h-3 w-3" />
                                                        {t('finance.reconciliation.unmatch')}
                                                    </button>
                                                )}
                                                {tx.status === 'discrepancy' && (
                                                    <>
                                                        <button
                                                            onClick={() => { setSelectedBankTx(tx); setShowMatchModal(true); }}
                                                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                                                        >
                                                            <LinkIcon className="h-3 w-3" />
                                                            {t('finance.reconciliation.match')}
                                                        </button>
                                                        <button className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300">
                                                            <Eye className="h-3 w-3" />
                                                            {t('finance.reconciliation.detail')}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer */}
                <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('finance.reconciliation.showing')} {filteredTransactions.length} {t('finance.reconciliation.of')} {bankTransactions.filter(bt => bt.status === activeTab).length} {t('finance.reconciliation.transactions')}
                    </p>
                </div>
            </div>

            {/* Upload Bank Statement */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
                        <Upload className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('finance.reconciliation.uploadTitle')}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('finance.reconciliation.uploadDesc')}</p>
                    </div>
                </div>
                <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/50 dark:border-gray-600 dark:hover:border-blue-500">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                    <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('finance.reconciliation.dragDrop')}{' '}
                        <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400">{t('finance.reconciliation.browse')}</button>
                    </p>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {t('finance.reconciliation.uploadFormats')}
                    </p>
                </div>
            </div>

            {/* Match Modal */}
            {showMatchModal && selectedBankTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('finance.reconciliation.matchTitle')}</h3>
                            <button
                                onClick={() => { setShowMatchModal(false); setSelectedBankTx(null); }}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Selected Bank Transaction */}
                        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-900">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('finance.reconciliation.bankTransactions')}</p>
                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">{selectedBankTx.description}</p>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-xs text-gray-500">{fmtDate(selectedBankTx.date)}</span>
                                <span className={`text-sm font-semibold ${selectedBankTx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {selectedBankTx.amount >= 0 ? '+' : ''}{formatCurrencyFull(selectedBankTx.amount)}
                                </span>
                            </div>
                        </div>

                        {/* Book Transactions to Match */}
                        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t('finance.reconciliation.selectBookTxHint')}</p>
                        <div className="max-h-64 space-y-2 overflow-y-auto">
                            {bookTransactions.map((bookTx) => (
                                <button
                                    key={bookTx.id}
                                    onClick={() => handleMatch(selectedBankTx.id, bookTx.id)}
                                    className="w-full rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{bookTx.description}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{bookTx.reference} · {fmtDate(bookTx.date)}</p>
                                        </div>
                                        <span className={`text-sm font-semibold ${bookTx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrencyFull(bookTx.amount)}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => { setShowMatchModal(false); setSelectedBankTx(null); }}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            >
                                {t('finance.reconciliation.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.message}
                </div>
            )}
        </div>
    )
}
