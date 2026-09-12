'use client'
import { usePermission } from '@/lib/use-permission'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { parseCsv } from '@/lib/csv-parser'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import {
    Search,
    Plus,
    Download,
    ChevronRight,
    ChevronDown,
    Pencil,
    Trash2,
    X,
    Eye,
    EyeOff,
    Layers,
    FileText,
    AlertTriangle,
    Loader2,
    ArrowUp,
    ArrowDown,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { EmptyState } from '@/components/ui/empty-state'

// ============================================
// TYPES
// ============================================

interface Account {
    id: string
    code: string
    name: string
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
    parentId: string | null
    description: string
    balance: number
    isActive: boolean
    children?: Account[]
}

interface AccountFormData {
    code: string
    name: string
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
    parentId: string | null
    description: string
    balance: number
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const TYPE_COLORS: Record<Account['type'], { bgColor: string; color: string }> = {
    ASSET: { bgColor: 'bg-blue-100', color: 'text-blue-700' },
    LIABILITY: { bgColor: 'bg-red-100', color: 'text-red-700' },
    EQUITY: { bgColor: 'bg-purple-100', color: 'text-purple-700' },
    REVENUE: { bgColor: 'bg-green-100', color: 'text-green-700' },
    EXPENSE: { bgColor: 'bg-orange-100', color: 'text-orange-700' },
}

function buildTree(accounts: Account[]): Account[] {
    const map = new Map<string, Account>()
    const roots: Account[] = []

    accounts.forEach((a) => map.set(a.id, { ...a, children: [] }))

    accounts.forEach((a) => {
        const node = map.get(a.id)!
        if (a.parentId && map.has(a.parentId)) {
            map.get(a.parentId)!.children!.push(node)
        } else {
            roots.push(node)
        }
    })

    return roots
}

function flattenTree(nodes: Account[]): Account[] {
    const result: Account[] = []
    function walk(list: Account[]) {
        for (const node of list) {
            result.push(node)
            if (node.children && node.children.length > 0) {
                walk(node.children)
            }
        }
    }
    walk(nodes)
    return result
}

function sumBalanceRecursive(account: Account, allAccounts: Account[]): number {
    const children = allAccounts.filter((a) => a.parentId === account.id)
    if (children.length === 0) return Number(account.balance)
    return children.reduce((sum, child) => sum + sumBalanceRecursive(child, allAccounts), 0)
}

function getParentOptions(accounts: Account[], currentId?: string, currentType?: string): Account[] {
    return accounts.filter((a) => {
        if (currentId && a.id === currentId) return false
        if (currentType && a.type !== currentType) return false
        return a.isActive
    })
}

// ============================================
// COMPONENTS
// ============================================

function AccountNode({
    account,
    level,
    expandedIds,
    onToggle,
    onEdit,
    onDelete,
    onAddChild,
    showInactive,
    allAccounts,
    searchQuery,
    canMutate = true,
}: {
    account: Account
    level: number
    expandedIds: Set<string>
    onToggle: (id: string) => void
    onEdit: (account: Account) => void
    onDelete: (account: Account) => void
    onAddChild: (parentId: string) => void
    showInactive: boolean
    allAccounts: Account[]
    searchQuery: string
    canMutate?: boolean
}) {
    const { t } = useTranslation()
    const hasChildren = account.children && account.children.length > 0
    const isExpanded = expandedIds.has(account.id)
    const config = TYPE_COLORS[account.type]
    const typeLabels: Record<string, string> = {
        ASSET: t('finance.accounts.types.asset'),
        LIABILITY: t('finance.accounts.types.liability'),
        EQUITY: t('finance.accounts.types.equity'),
        REVENUE: t('finance.accounts.types.revenue'),
        EXPENSE: t('finance.accounts.types.expense'),
    }
    const computedBalance = sumBalanceRecursive(account, allAccounts)
    const isGroup = hasChildren && account.children!.some((c) => c.children && c.children!.length > 0) || (hasChildren && account.balance === 0 && computedBalance !== 0)

    // Filter inactive children if needed
    const visibleChildren = account.children?.filter((c) => showInactive || c.isActive) ?? []

    return (
        <div>
            {/* Row */}
            <div
                className={`group flex items-center gap-2 border-b border-gray-50 py-2.5 px-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!account.isActive ? 'opacity-50' : ''} ${isGroup ? 'font-semibold' : ''}`}
                style={{ paddingLeft: `${level * 24 + 12}px` }}
            >
                {/* Expand/collapse */}
                {visibleChildren.length > 0 ? (
                    <button
                        onClick={() => onToggle(account.id)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                        {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                    </button>
                ) : (
                    <span className="w-6 shrink-0" />
                )}

                {/* Account code */}
                <span className="w-16 shrink-0 font-mono text-sm text-gray-500 dark:text-gray-400">
                    {account.code}
                </span>

                {/* Account name */}
                <span className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-gray-100">
                    {account.name}
                </span>

                {/* Type badge */}
                <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:inline-block ${config.bgColor} ${config.color}`}>
                    {typeLabels[account.type]}
                </span>

                {/* Balance */}
                <span className={`w-36 shrink-0 text-right text-sm tabular-nums ${computedBalance >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(computedBalance)}
                </span>

                {/* Status */}
                <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:inline-block ${account.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {account.isActive ? t('finance.accounts.active') : t('finance.accounts.inactive')}
                </span>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    {canMutate && (
                        <button
                            onClick={() => onAddChild(account.id)}
                            title={t('finance.accounts.actions.addChild')}
                            className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    )}
                    {canMutate && (
                        <button
                            onClick={() => onEdit(account)}
                            title={t('finance.accounts.edit')}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                    )}
                    {canMutate && (
                        <button
                            onClick={() => onDelete(account)}
                            title={t('finance.accounts.actions.delete')}
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Children */}
            {isExpanded && visibleChildren.length > 0 && (
                <div>
                    {visibleChildren.map((child) => (
                        <AccountNode
                            key={child.id}
                            account={child}
                            level={level + 1}
                            expandedIds={expandedIds}
                            onToggle={onToggle}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onAddChild={onAddChild}
                            showInactive={showInactive}
                            allAccounts={allAccounts}
                            searchQuery={searchQuery}
                            canMutate={canMutate}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// ============================================
// MAIN PAGE
// ============================================

export default function ChartOfAccountsPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const { canMutate: canMutateFn } = usePermission()
    const canMutate = canMutateFn('finance')

    // State
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterType, setFilterType] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [showInactive, setShowInactive] = useState(false)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [sortField, setSortField] = useState<'code' | 'name' | 'type'>('code')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

    // Modal state
    const [modalOpen, setModalOpen] = useState(false)
    const [editingAccount, setEditingAccount] = useState<Account | null>(null)
    const [formParentId, setFormParentId] = useState<string | null>(null)
    const [formData, setFormData] = useState<AccountFormData>({
        code: '',
        name: '',
        type: 'ASSET',
        parentId: null,
        description: '',
        balance: 0,
    })

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)

    // Import
    const importInputRef = useRef<HTMLInputElement>(null)
    const [importing, setImporting] = useState(false)

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }, [])

    // ─── Fetch accounts from API ─────────────
    const fetchAccounts = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/finance/accounts')
            const json = await res.json()
            if (!json.success) {
                throw new Error(json.message || t('finance.accounts.fetchError'))
            }
            setAccounts(json.data)
            // Auto-expand root accounts on first load
            setExpandedIds(new Set(json.data.filter((a: Account) => a.parentId === null).map((a: Account) => a.id)))
        } catch (err) {
            setError(err instanceof Error ? err.message : t('finance.accounts.errorOccurred'))
        } finally {
            setLoading(false)
        }
    }, [t])

    useEffect(() => {
        fetchAccounts()
    }, [fetchAccounts])

    // Build tree
    const tree = useMemo(() => {
        const rootAccounts = [...accounts]
        rootAccounts.sort((a, b) => {
            let aVal: string | number, bVal: string | number
            if (sortField === 'code') { aVal = a.code; bVal = b.code }
            else if (sortField === 'name') { aVal = a.name; bVal = b.name }
            else { aVal = a.type; bVal = b.type }
            const cmp = String(aVal).localeCompare(String(bVal), 'id')
            return sortDirection === 'asc' ? cmp : -cmp
        })
        return buildTree(rootAccounts)
    }, [accounts, sortField, sortDirection])
    const flatAccounts = useMemo(() => flattenTree(tree), [tree])

    const toggleSort = (field: 'code' | 'name' | 'type') => {
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
    }

    const SortIcon = ({ field }: { field: 'code' | 'name' | 'type' }) => {
        if (sortField !== field) return null
        return sortDirection === 'asc'
            ? <ArrowUp className="ml-1 h-3 w-3 inline" />
            : <ArrowDown className="ml-1 h-3 w-3 inline" />
    }

    // Filter logic
    const filteredTree = useMemo(() => {
        function filterNodes(nodes: Account[]): Account[] {
            return nodes
                .filter((node) => {
                    // Filter by type
                    if (filterType !== 'all' && node.type !== filterType) return false
                    // Filter inactive
                    if (!showInactive && !node.isActive) return false
                    return true
                })
                .map((node) => ({
                    ...node,
                    children: node.children ? filterNodes(node.children) : [],
                }))
                .filter((node) => {
                    // After filtering children, keep node if it has matching children OR matches search itself
                    const matchSearch =
                        searchQuery === '' ||
                        node.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        node.name.toLowerCase().includes(searchQuery.toLowerCase())
                    const hasMatchingChildren = node.children && node.children.length > 0
                    return matchSearch || hasMatchingChildren
                })
        }
        return filterNodes(tree)
    }, [tree, filterType, searchQuery, showInactive])

    // Toggle expand/collapse
    const toggleExpand = useCallback((id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }, [])

    const expandAll = useCallback(() => {
        setExpandedIds(new Set(flatAccounts.map((a) => a.id)))
    }, [flatAccounts])

    const collapseAll = useCallback(() => {
        setExpandedIds(new Set())
    }, [])

    // Summary calculations
    const summary = useMemo(() => {
        const totals = { ASSET: 0, LIABILITY: 0, EQUITY: 0, REVENUE: 0, EXPENSE: 0 }
        accounts.forEach((a) => {
            // Only count leaf accounts (no children) to avoid double-counting
            const hasChildren = accounts.some((c) => c.parentId === a.id)
            if (!hasChildren) {
                totals[a.type] += Number(a.balance)
            }
        })
        return totals
    }, [accounts])

    // Open modal for create
    const openCreateModal = useCallback((parentId?: string) => {
        setEditingAccount(null)
        setFormParentId(parentId ?? null)
        const parentType = parentId ? accounts.find((a) => a.id === parentId)?.type : undefined
        setFormData({
            code: '',
            name: '',
            type: parentType ?? 'ASSET',
            parentId: parentId ?? null,
            description: '',
            balance: 0,
        })
        setModalOpen(true)
    }, [accounts])

    // Open modal for edit
    const openEditModal = useCallback((account: Account) => {
        setEditingAccount(account)
        setFormParentId(account.parentId)
        setFormData({
            code: account.code,
            name: account.name,
            type: account.type,
            parentId: account.parentId,
            description: account.description,
            balance: account.balance,
        })
        setModalOpen(true)
    }, [])

    // Save (create or update) via API
    const handleSave = useCallback(async () => {
        // Validation
        if (!formData.code.trim() || !formData.name.trim()) {
            showToast(t('finance.accounts.codeAndNameRequired'), 'error')
            return
        }

        try {
            if (editingAccount) {
                // Update via PUT
                const res = await fetch('/api/finance/accounts', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingAccount.id, ...formData }),
                })
                const json = await res.json()
                if (!json.success) {
                    showToast(json.message || t('finance.accounts.updateFailed'), 'error')
                    return
                }
                showToast(t('finance.accounts.updateSuccess'))
            } else {
                // Create via POST
                const res = await fetch('/api/finance/accounts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                })
                const json = await res.json()
                if (!json.success) {
                    showToast(json.message || t('finance.accounts.createFailed'), 'error')
                    return
                }
                showToast(t('finance.accounts.createSuccess'))
            }

            // Refresh data from API
            await fetchAccounts()
            setModalOpen(false)
            setEditingAccount(null)
        } catch {
            showToast(t('finance.accounts.saveError'), 'error')
        }
    }, [formData, editingAccount, fetchAccounts, showToast, t])

    // Delete via API
    const handleDelete = useCallback(async () => {
        if (!deleteTarget) return

        try {
            const res = await fetch(`/api/finance/accounts?id=${deleteTarget.id}`, {
                method: 'DELETE',
            })
            const json = await res.json()
            if (!json.success) {
                showToast(json.message || t('finance.accounts.deleteFailed'), 'error')
                return
            }

            // Refresh data from API
            await fetchAccounts()
            showToast(t('finance.accounts.deleteSuccess'))
            setDeleteTarget(null)
        } catch {
            showToast(t('finance.accounts.deleteError'), 'error')
        }
    }, [deleteTarget, fetchAccounts, showToast, t])

    // Toggle active status via API
    const toggleActive = useCallback(async (account: Account) => {
        try {
            const res = await fetch('/api/finance/accounts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: account.id, isActive: !account.isActive }),
            })
            const json = await res.json()
            if (!json.success) {
                showToast(json.message || t('finance.accounts.toggleFailed'), 'error')
                return
            }
            await fetchAccounts()
            showToast(`${account.name} ${account.isActive ? t('finance.accounts.inactive') : t('finance.accounts.active')}`)
        } catch {
            showToast(t('finance.accounts.toggleError'), 'error')
        }
    }, [fetchAccounts, showToast, t])

    // Parent options for form
    const parentOptions = useMemo(() => {
        return getParentOptions(accounts, editingAccount?.id, formData.type).filter(
            (a) => a.type === formData.type
        )
    }, [accounts, editingAccount, formData.type])

    // Count accounts
    const totalAccounts = accounts.length
    const activeAccounts = accounts.filter((a) => a.isActive).length

    // ─── Loading state ─────────────
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="h-8 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="mt-2 h-6 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-3 text-sm text-gray-500">{t('finance.accounts.loading')}</span>
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
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {t('finance.accounts.title')}
                        </h1>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-16 dark:border-red-800 dark:bg-red-900/20">
                    <AlertTriangle className="mb-3 h-12 w-12 text-red-400" />
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
                    <button
                        onClick={fetchAccounts}
                        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                        {t('finance.accounts.retry')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.type === 'success' ? (
                        <Layers className="h-4 w-4" />
                    ) : (
                        <AlertTriangle className="h-4 w-4" />
                    )}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t('finance.accounts.title')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('finance.accounts.subtitle')} · {totalAccounts} {t('finance.accounts.accountsCount')} ({activeAccounts} {t('finance.accounts.active')})
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => importInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <Download className="h-4 w-4" />
                        {t('finance.accounts.import')}
                    </button>
                    {canMutate && (
                        <button
                            onClick={() => openCreateModal()}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" />
                            {t('finance.accounts.addAccount')}
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('finance.accounts.summary.totalAssets')}</p>
                    <p className="mt-1 text-lg font-bold text-blue-600">{formatCurrency(summary.ASSET)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('finance.accounts.summary.totalLiabilities')}</p>
                    <p className="mt-1 text-lg font-bold text-red-600">{formatCurrency(summary.LIABILITY)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('finance.accounts.summary.totalEquity')}</p>
                    <p className="mt-1 text-lg font-bold text-purple-600">{formatCurrency(summary.EQUITY)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('finance.accounts.summary.totalRevenue')}</p>
                    <p className="mt-1 text-lg font-bold text-green-600">{formatCurrency(summary.REVENUE)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('finance.accounts.summary.totalExpenses')}</p>
                    <p className="mt-1 text-lg font-bold text-orange-600">{formatCurrency(summary.EXPENSE)}</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('finance.accounts.filter.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
                    />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {(['all', 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterType === type
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                }`}
                        >
                            {type === 'all' ? t('finance.accounts.filter.all') : t(`finance.accounts.types.${type.toLowerCase()}`)}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowInactive(!showInactive)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${showInactive
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                            }`}
                        title={showInactive ? t('finance.accounts.status.activeHidden') : t('finance.accounts.status.inactiveHidden')}
                    >
                        {showInactive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {t('finance.accounts.inactive')}
                    </button>
                    <button
                        onClick={expandAll}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                        title={t('finance.accounts.actions.expandAll')}
                    >
                        <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={collapseAll}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                        title={t('finance.accounts.actions.collapseAll')}
                    >
                        <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Tree View */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                {/* Table header */}
                <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                    <span className="w-6" />
                    <span className="w-16 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300" onClick={() => toggleSort('code')}>{t('finance.accounts.table.code')}<SortIcon field="code" /></span>
                    <span className="flex-1 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300" onClick={() => toggleSort('name')}>{t('finance.accounts.table.accountName')}<SortIcon field="name" /></span>
                    <span className="hidden w-24 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300 sm:block" onClick={() => toggleSort('type')}>{t('finance.accounts.table.type')}<SortIcon field="type" /></span>
                    <span className="w-36 text-right">{t('finance.accounts.table.balance')}</span>
                    <span className="hidden w-20 sm:block">{t('finance.accounts.table.status')}</span>
                    <span className="w-24" />
                </div>

                {/* Tree body */}
                <div className="max-h-[600px] overflow-y-auto">
                    {filteredTree.length > 0 ? (
                        filteredTree.map((account) => (
                            <AccountNode
                                key={account.id}
                                account={account}
                                level={0}
                                expandedIds={expandedIds}
                                onToggle={toggleExpand}
                                onEdit={openEditModal}
                                onDelete={(acc) => setDeleteTarget(acc)}
                                onAddChild={(parentId) => openCreateModal(parentId)}
                                showInactive={showInactive}
                                allAccounts={accounts}
                                searchQuery={searchQuery}
                                canMutate={canMutate}
                            />
                        ))
                    ) : (
                        <div className="py-8">
                            <EmptyState
                                icon={FileText}
                                title={t('finance.accounts.empty')}
                                description={t('finance.accounts.emptyDescription')}
                                actionLabel={canMutate ? t('finance.accounts.addAccount') : undefined}
                                onAction={canMutate ? () => openCreateModal() : undefined}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ─── MODAL: Create / Edit ─────────────── */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {editingAccount ? t('finance.accounts.modal.editTitle') : t('finance.accounts.modal.title')}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Code + Type */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t('finance.accounts.modal.accountCode')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
                                        placeholder={t('finance.accounts.modal.accountCodePlaceholder')}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t('finance.accounts.modal.accountType')} <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => {
                                            const newType = e.target.value as Account['type']
                                            setFormData((p) => ({ ...p, type: newType, parentId: null }))
                                        }}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    >
                                        {(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] as const).map((key) => (
                                            <option key={key} value={key}>{t(`finance.accounts.types.${key.toLowerCase()}`)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('finance.accounts.modal.accountName')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                                    placeholder={t('finance.accounts.modal.accountNamePlaceholder')}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            {/* Parent */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('finance.accounts.modal.parentLabel')} <span className="text-xs text-gray-400">{t('finance.accounts.modal.parentOptional')}</span>
                                </label>
                                <select
                                    value={formData.parentId ?? ''}
                                    onChange={(e) => setFormData((p) => ({ ...p, parentId: e.target.value || null }))}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">{t('finance.accounts.modal.noParent')}</option>
                                    {parentOptions.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.code} — {a.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('finance.accounts.modal.descriptionLabel')} <span className="text-xs text-gray-400">{t('finance.accounts.modal.parentOptional')}</span>
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                                    placeholder={t('finance.accounts.modal.descriptionPlaceholder')}
                                    rows={2}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            {/* Balance */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('finance.accounts.modal.initialBalance')}
                                </label>
                                <input
                                    type="number"
                                    value={formData.balance}
                                    onChange={(e) => setFormData((p) => ({ ...p, balance: Number(e.target.value) || 0 }))}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Modal actions */}
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleSave}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                {editingAccount ? t('finance.accounts.modal.update') : t('finance.accounts.modal.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL: Delete Confirmation ────────── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('finance.accounts.deleteConfirm.title')}</h3>
                                <p className="text-sm text-gray-500">{t('finance.accounts.deleteConfirm.irreversible')}</p>
                            </div>
                        </div>
                        <p className="mb-1 text-sm text-gray-700 dark:text-gray-300">
                            {t('finance.accounts.deleteConfirm.message')}
                        </p>
                        <div className="mb-5 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                            <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                                {deleteTarget.code} — {deleteTarget.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {t(`finance.accounts.types.${deleteTarget.type.toLowerCase()}`)} · {formatCurrency(Number(deleteTarget.balance))}
                            </p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleDelete}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                            >
                                {t('common.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden file input for import */}
            <input
                ref={importInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    e.target.value = ''

                    if (!file.name.endsWith('.csv')) {
                        showToast(t('finance.accounts.csv.onlyCsv'), 'error')
                        return
                    }

                    setImporting(true)
                    showToast(t('finance.accounts.csv.importing').replace('{name}', file.name), 'success')

                    try {
                        const text = await file.text()
                        const result = parseCsv(text)

                        if (result.rows.length === 0) {
                            showToast(t('finance.accounts.csv.empty'), 'error')
                            return
                        }

                        // Validate required columns
                        const headers = result.headers.map((h) => h.toLowerCase().trim())
                        const codeIdx = headers.findIndex((h) => h === 'code' || h === 'kode' || h === 'account_code' || h === 'kode_akun')
                        const nameIdx = headers.findIndex((h) => h === 'name' || h === 'nama' || h === 'account_name' || h === 'nama_akun')
                        const typeIdx = headers.findIndex((h) => h === 'type' || h === 'tipe' || h === 'account_type' || h === 'tipe_akun')

                        if (codeIdx === -1 || nameIdx === -1) {
                            showToast(t('finance.accounts.csv.missingColumns'), 'error')
                            return
                        }

                        // Type mapping from common labels
                        const typeMap: Record<string, Account['type']> = {
                            'ASSET': 'ASSET', 'aset': 'ASSET', 'Aset': 'ASSET',
                            'LIABILITY': 'LIABILITY', 'kewajiban': 'LIABILITY', 'Kewajiban': 'LIABILITY',
                            'EQUITY': 'EQUITY', 'ekuitas': 'EQUITY', 'Ekuitas': 'EQUITY',
                            'REVENUE': 'REVENUE', 'pendapatan': 'REVENUE', 'Pendapatan': 'REVENUE',
                            'EXPENSE': 'EXPENSE', 'beban': 'EXPENSE', 'Beban': 'EXPENSE',
                        }

                        let imported = 0
                        let skipped = 0
                        const errors: string[] = []

                        for (let i = 0; i < result.rows.length; i++) {
                            const row = result.rows[i]
                            const code = (row[result.headers[codeIdx]] || '').trim()
                            const name = (row[result.headers[nameIdx]] || '').trim()
                            const rawType = typeIdx !== -1 ? (row[result.headers[typeIdx]] || '').trim().toUpperCase() : ''

                            if (!code || !name) {
                                skipped++
                                continue
                            }

                            const type = typeMap[rawType] || 'ASSET'

                            try {
                                const res = await fetch('/api/finance/accounts', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ code, name, type, description: '', balance: 0 }),
                                })
                                const json = await res.json()
                                if (json.success) {
                                    imported++
                                } else {
                                    skipped++
                                    if (json.message && !json.message.includes('sudah digunakan')) {
                                        errors.push(t('finance.accounts.csv.rowError').replace('{row}', String(i + 1)).replace('{message}', json.message))
                                    }
                                }
                            } catch {
                                skipped++
                                errors.push(t('finance.accounts.csv.rowError').replace('{row}', String(i + 1)).replace('{message}', t('finance.accounts.csv.sendFailed')))
                            }
                        }

                        // Refresh data
                        await fetchAccounts()

                        const summary = t('finance.accounts.csv.summary').replace('{imported}', String(imported)).replace('{skipped}', String(skipped))
                        if (errors.length > 0 && errors.length <= 5) {
                            showToast(`${summary}. ${errors[0]}`, imported > 0 ? 'success' : 'error')
                        } else if (errors.length > 5) {
                            showToast(`${summary}. ${t('finance.accounts.csv.errorsOther').replace('{count}', String(errors.length))}`, imported > 0 ? 'success' : 'error')
                        } else {
                            showToast(summary, imported > 0 ? 'success' : 'error')
                        }
                    } catch {
                        showToast(t('finance.accounts.csv.readFailed'), 'error')
                    } finally {
                        setImporting(false)
                    }
                }}
            />

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-4 right-4 z-50">
                    <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                        }`}>
                        {toast.type === 'success' ? <Download className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        {toast.message}
                        <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
