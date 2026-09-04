'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, Loader2, Award, Star, CreditCard,
    ChevronLeft, ChevronRight, Plus, Minus,
} from 'lucide-react'

type MemberDetail = {
    id: string
    memberCode: string
    name: string
    email: string | null
    phone: string | null
    contactId: string | null
    tier: string
    points: number
    totalSpent: number
    createdAt: string
    updatedAt: string
    transactions: Transaction[]
}

type Transaction = {
    id: string
    type: string
    points: number
    description: string | null
    transactionId: string | null
    createdAt: string
}

const TIER_COLORS: Record<string, string> = {
    BRONZE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    SILVER: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    GOLD: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    PLATINUM: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const TYPE_COLORS: Record<string, string> = {
    EARN: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    REDEEM: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    ADJUST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    EXPIRE: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

export default function LoyaltyMemberDetailPage({ params }: { params: { id: string } }) {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const router = useRouter()
    const canAdjust = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN'

    const [member, setMember] = useState<MemberDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Adjust points modal
    const [showAdjustModal, setShowAdjustModal] = useState(false)
    const [adjustForm, setAdjustForm] = useState({ type: 'EARN' as 'EARN' | 'ADJUST', points: 0, description: '' })
    const [adjusting, setAdjusting] = useState(false)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchMember = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await fetch(`/api/pos/loyalty/members/${params.id}`)
            const data = await response.json()
            if (data.success) {
                setMember(data.data)
            } else {
                setError(data.error || 'Gagal memuat data member')
            }
        } catch {
            setError('Gagal memuat data member')
        } finally {
            setLoading(false)
        }
    }, [params.id])

    useEffect(() => {
        fetchMember()
    }, [fetchMember])

    const handleAdjustPoints = async () => {
        if (adjustForm.points <= 0) return
        try {
            setAdjusting(true)
            const response = await fetch(`/api/pos/loyalty/members/${params.id}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: adjustForm.type,
                    points: adjustForm.type === 'EARN' ? adjustForm.points : -adjustForm.points,
                    description: adjustForm.description || `Manual ${adjustForm.type === 'EARN' ? 'earn' : 'adjust'}`,
                }),
            })
            const data = await response.json()
            if (data.success) {
                setToast({ message: 'Poin berhasil disesuaikan', type: 'success' })
                setShowAdjustModal(false)
                setAdjustForm({ type: 'EARN', points: 0, description: '' })
                fetchMember()
            } else {
                setToast({ message: data.error || 'Gagal menyesuaikan poin', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menyesuaikan poin', type: 'error' })
        } finally {
            setAdjusting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (error || !member) {
        return (
            <div className="space-y-4">
                <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
                    <ArrowLeft className="h-4 w-4" /> {t('common.back')}
                </button>
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
                    <p className="text-sm text-red-600 dark:text-red-400">{error || 'Member tidak ditemukan'}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
                    toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                }`}>
                    {toast.message}
                </div>
            )}

            {/* Back Button */}
            <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <ArrowLeft className="h-4 w-4" /> {t('common.back')}
            </button>

            {/* Member Info Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{member.name}</h1>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TIER_COLORS[member.tier]}`}>
                                    <Award className="mr-1 h-3 w-3" />
                                    {member.tier}
                                </span>
                            </div>
                            <p className="mt-0.5 font-mono text-sm text-blue-600 dark:text-blue-400">{member.memberCode}</p>
                            {member.email && <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>}
                            {member.phone && <p className="text-sm text-gray-500 dark:text-gray-400">{member.phone}</p>}
                        </div>
                    </div>
                    {canAdjust && (
                        <button
                            onClick={() => setShowAdjustModal(true)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        >
                            <CreditCard className="h-4 w-4" />
                            {t('pos.loyalty.adjustPoints')}
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('pos.loyalty.points')}</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{member.points.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('pos.loyalty.totalSpent')}</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(member.totalSpent)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('pos.loyalty.memberSince')}</p>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">{formatDateTime(member.createdAt)}</p>
                    </div>
                </div>
            </div>

            {/* Points History */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('pos.loyalty.pointsHistory')}</h2>
                </div>
                {member.transactions.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('pos.loyalty.noTransactions')}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('common.date')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('pos.loyalty.type')}</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('pos.loyalty.points')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('common.description')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {member.transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDateTime(tx.createdAt)}</td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[tx.type] || TYPE_COLORS.ADJUST}`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-right text-sm font-semibold ${tx.points >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {tx.points >= 0 ? '+' : ''}{tx.points.toLocaleString()}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{tx.description || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Adjust Points Modal */}
            {showAdjustModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('pos.loyalty.adjustPoints')}</h3>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('pos.loyalty.type')}</label>
                                <select
                                    value={adjustForm.type}
                                    onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value as 'EARN' | 'ADJUST' })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                >
                                    <option value="EARN">EARN (+)</option>
                                    <option value="ADJUST">ADJUST (-)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('pos.loyalty.points')}</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={adjustForm.points || ''}
                                    onChange={(e) => setAdjustForm({ ...adjustForm, points: parseInt(e.target.value) || 0 })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                    placeholder="Jumlah poin"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.description')}</label>
                                <input
                                    type="text"
                                    value={adjustForm.description}
                                    onChange={(e) => setAdjustForm({ ...adjustForm, description: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                    placeholder="Alasan penyesuaian"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowAdjustModal(false)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleAdjustPoints}
                                disabled={adjustForm.points <= 0 || adjusting}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {adjusting && <Loader2 className="h-4 w-4 animate-spin" />}
                                {t('common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
