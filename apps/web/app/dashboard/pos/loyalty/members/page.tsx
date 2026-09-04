'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
    Search, Users, Loader2, Plus, Eye, Edit,
    ChevronLeft, ChevronRight, X,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

type Member = {
    id: string
    memberCode: string
    name: string
    email: string | null
    phone: string | null
    tier: string
    points: number
    totalSpent: number
    transactionCount: number
    createdAt: string
}

const TIER_COLORS: Record<string, string> = {
    BRONZE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    SILVER: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    GOLD: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    PLATINUM: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

export default function LoyaltyMembersPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const router = useRouter()
    const canManage = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN'

    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterTier, setFilterTier] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Add member modal
    const [showAddModal, setShowAddModal] = useState(false)
    const [addForm, setAddForm] = useState({ name: '', email: '', phone: '' })
    const [adding, setAdding] = useState(false)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchMembers = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (searchQuery) params.set('search', searchQuery)
            if (filterTier !== 'all') params.set('tier', filterTier)
            params.set('page', String(page))
            params.set('limit', '20')
            const response = await fetch(`/api/pos/loyalty/members?${params.toString()}`)
            const data = await response.json()
            if (data.success) {
                setMembers(data.data)
                setTotalPages(data.totalPages)
            } else {
                setError(data.error || 'Gagal memuat data member')
            }
        } catch {
            setError('Gagal memuat data member. Periksa koneksi jaringan Anda.')
        } finally {
            setLoading(false)
        }
    }, [searchQuery, filterTier, page])

    useEffect(() => {
        fetchMembers()
    }, [fetchMembers])

    const handleAddMember = async () => {
        if (!addForm.name.trim()) return
        try {
            setAdding(true)
            const response = await fetch('/api/pos/loyalty/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(addForm),
            })
            const data = await response.json()
            if (data.success) {
                setToast({ message: 'Member berhasil ditambahkan', type: 'success' })
                setShowAddModal(false)
                setAddForm({ name: '', email: '', phone: '' })
                fetchMembers()
            } else {
                setToast({ message: data.error || 'Gagal menambahkan member', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menambahkan member', type: 'error' })
        } finally {
            setAdding(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
                    toast.type === 'success'
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                }`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t('pos.loyalty.members')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('pos.loyalty.membersDesc')}
                    </p>
                </div>
                {canManage && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        {t('pos.loyalty.addMember')}
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('pos.loyalty.searchMembers')}
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                </div>
                <select
                    value={filterTier}
                    onChange={(e) => { setFilterTier(e.target.value); setPage(1); }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                    <option value="all">{t('pos.loyalty.allTiers')}</option>
                    <option value="BRONZE">BRONZE</option>
                    <option value="SILVER">SILVER</option>
                    <option value="GOLD">GOLD</option>
                    <option value="PLATINUM">PLATINUM</option>
                </select>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    <button onClick={fetchMembers} className="mt-3 text-sm font-medium text-red-600 hover:underline">
                        {t('common.refresh')}
                    </button>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && members.length === 0 && (
                <EmptyState
                    icon={Users}
                    title={t('pos.loyalty.noMembers')}
                    description={t('pos.loyalty.noMembersDesc')}
                    actionLabel={canManage ? t('pos.loyalty.addMember') : undefined}
                    onAction={canManage ? () => setShowAddModal(true) : undefined}
                />
            )}

            {/* Desktop Table */}
            {!loading && !error && members.length > 0 && (
                <>
                    <div className="hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 md:block">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('pos.loyalty.code')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('common.name')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('common.phone')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('pos.loyalty.tier')}</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('pos.loyalty.points')}</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('pos.loyalty.totalSpent')}</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {members.map((member) => (
                                        <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-blue-600 dark:text-blue-400">{member.memberCode}</td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{member.name}</td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{member.phone || '-'}</td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TIER_COLORS[member.tier]}`}>
                                                    {member.tier}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">{member.points.toLocaleString()}</td>
                                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500 dark:text-gray-400">{formatCurrency(member.totalSpent)}</td>
                                            <td className="whitespace-nowrap px-6 py-4 text-right">
                                                <button
                                                    onClick={() => router.push(`/dashboard/pos/loyalty/members/${member.id}`)}
                                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Cards */}
                    <div className="space-y-3 md:hidden">
                        {members.map((member) => (
                            <div
                                key={member.id}
                                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-mono text-xs text-blue-600 dark:text-blue-400">{member.memberCode}</p>
                                        <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{member.name}</p>
                                        {member.phone && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{member.phone}</p>
                                        )}
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TIER_COLORS[member.tier]}`}>
                                        {member.tier}
                                    </span>
                                </div>
                                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('pos.loyalty.points')}</p>
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{member.points.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('pos.loyalty.totalSpent')}</p>
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(member.totalSpent)}</p>
                                    </div>
                                    <button
                                        onClick={() => router.push(`/dashboard/pos/loyalty/members/${member.id}`)}
                                        className="rounded-md p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t('common.page')} {page} / {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Add Member Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('pos.loyalty.addMember')}</h3>
                            <button onClick={() => setShowAddModal(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.name')} *</label>
                                <input
                                    type="text"
                                    value={addForm.name}
                                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                    placeholder="Nama member"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.email')}</label>
                                <input
                                    type="email"
                                    value={addForm.email}
                                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.phone')}</label>
                                <input
                                    type="tel"
                                    value={addForm.phone}
                                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                    placeholder="08xxxxxxxxxx"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleAddMember}
                                disabled={!addForm.name.trim() || adding}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {adding && <Loader2 className="h-4 w-4 animate-spin" />}
                                {t('common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
