'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import {
    Gift, Loader2, Plus, Edit, Trash2, X,
    Tag, Percent, ShoppingBag, Ticket,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

type Reward = {
    id: string
    name: string
    description: string | null
    pointsCost: number
    rewardType: string
    rewardValue: number
    isActive: boolean
    stock: number
    createdAt: string
}

const REWARD_TYPE_LABELS: Record<string, string> = {
    DISCOUNT_PERCENT: 'Diskon %',
    DISCOUNT_FIXED: 'Diskon Rp',
    FREE_ITEM: 'Gratis Item',
    VOUCHER: 'Voucher',
}

const REWARD_TYPE_ICONS: Record<string, typeof Gift> = {
    DISCOUNT_PERCENT: Percent,
    DISCOUNT_FIXED: Tag,
    FREE_ITEM: ShoppingBag,
    VOUCHER: Ticket,
}

const REWARD_TYPE_COLORS: Record<string, string> = {
    DISCOUNT_PERCENT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    DISCOUNT_FIXED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    FREE_ITEM: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    VOUCHER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

export default function LoyaltyRewardsPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canManage = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN'

    const [rewards, setRewards] = useState<Reward[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingReward, setEditingReward] = useState<Reward | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        pointsCost: 0,
        rewardType: 'DISCOUNT_FIXED',
        rewardValue: 0,
        stock: -1,
    })
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchRewards = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await fetch('/api/pos/loyalty/rewards?showAll=true')
            const data = await response.json()
            if (data.success) {
                setRewards(data.data)
            } else {
                setError(data.error || 'Gagal memuat data reward')
            }
        } catch {
            setError('Gagal memuat data reward')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchRewards()
    }, [fetchRewards])

    const resetForm = () => {
        setFormData({ name: '', description: '', pointsCost: 0, rewardType: 'DISCOUNT_FIXED', rewardValue: 0, stock: -1 })
    }

    const handleOpenAdd = () => {
        resetForm()
        setEditingReward(null)
        setShowAddModal(true)
    }

    const handleOpenEdit = (reward: Reward) => {
        setFormData({
            name: reward.name,
            description: reward.description || '',
            pointsCost: reward.pointsCost,
            rewardType: reward.rewardType,
            rewardValue: reward.rewardValue,
            stock: reward.stock,
        })
        setEditingReward(reward)
        setShowAddModal(true)
    }

    const handleSubmit = async () => {
        if (!formData.name.trim() || formData.pointsCost <= 0) return
        try {
            setSubmitting(true)
            const url = editingReward
                ? `/api/pos/loyalty/rewards/${editingReward.id}`
                : '/api/pos/loyalty/rewards'
            const method = editingReward ? 'PUT' : 'POST'
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })
            const data = await response.json()
            if (data.success) {
                setToast({
                    message: editingReward ? 'Reward berhasil diperbarui' : 'Reward berhasil ditambahkan',
                    type: 'success',
                })
                setShowAddModal(false)
                resetForm()
                setEditingReward(null)
                fetchRewards()
            } else {
                setToast({ message: data.error || 'Gagal menyimpan reward', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menyimpan reward', type: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`/api/pos/loyalty/rewards/${id}`, { method: 'DELETE' })
            const data = await response.json()
            if (data.success) {
                setToast({ message: 'Reward berhasil dinonaktifkan', type: 'success' })
                setDeleteConfirm(null)
                fetchRewards()
            } else {
                setToast({ message: data.error || 'Gagal menghapus reward', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menghapus reward', type: 'error' })
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                <button onClick={fetchRewards} className="mt-3 text-sm font-medium text-red-600 hover:underline">
                    {t('common.refresh')}
                </button>
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

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t('pos.loyalty.rewards')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('pos.loyalty.rewardsDesc')}
                    </p>
                </div>
                {canManage && (
                    <button
                        onClick={handleOpenAdd}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        {t('pos.loyalty.addReward')}
                    </button>
                )}
            </div>

            {/* Empty State */}
            {rewards.length === 0 && (
                <EmptyState
                    icon={Gift}
                    title={t('pos.loyalty.noRewards')}
                    description={t('pos.loyalty.noRewardsDesc')}
                    actionLabel={canManage ? t('pos.loyalty.addReward') : undefined}
                    onAction={canManage ? handleOpenAdd : undefined}
                />
            )}

            {/* Rewards Grid */}
            {rewards.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {rewards.map((reward) => {
                        const Icon = REWARD_TYPE_ICONS[reward.rewardType] || Gift
                        return (
                            <div
                                key={reward.id}
                                className={`relative rounded-xl border bg-white p-5 dark:bg-gray-800 ${
                                    reward.isActive
                                        ? 'border-gray-200 dark:border-gray-700'
                                        : 'border-gray-200 opacity-60 dark:border-gray-700'
                                }`}
                            >
                                {!reward.isActive && (
                                    <span className="absolute right-3 top-3 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                        Nonaktif
                                    </span>
                                )}
                                <div className="flex items-start gap-3">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${REWARD_TYPE_COLORS[reward.rewardType] || 'bg-gray-100 text-gray-700'}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{reward.name}</h3>
                                        {reward.description && (
                                            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{reward.description}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('pos.loyalty.pointsCost')}</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{reward.pointsCost.toLocaleString()}</p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('pos.loyalty.value')}</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                            {reward.rewardType === 'DISCOUNT_PERCENT'
                                                ? `${reward.rewardValue}%`
                                                : formatCurrency(reward.rewardValue)}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${REWARD_TYPE_COLORS[reward.rewardType] || 'bg-gray-100 text-gray-700'}`}>
                                        {REWARD_TYPE_LABELS[reward.rewardType] || reward.rewardType}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {reward.stock === -1 ? 'Unlimited' : `Stok: ${reward.stock}`}
                                    </span>
                                </div>
                                {canManage && (
                                    <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                                        <button
                                            onClick={() => handleOpenEdit(reward)}
                                            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                                        >
                                            <Edit className="h-3.5 w-3.5" />
                                            {t('common.edit')}
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(reward.id)}
                                            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            {t('common.delete')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {editingReward ? t('pos.loyalty.editReward') : t('pos.loyalty.addReward')}
                            </h3>
                            <button onClick={() => { setShowAddModal(false); setEditingReward(null); }} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.name')} *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                    placeholder="Nama reward"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.description')}</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                    rows={2}
                                    placeholder="Deskripsi reward"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('pos.loyalty.pointsCost')} *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.pointsCost || ''}
                                        onChange={(e) => setFormData({ ...formData, pointsCost: parseInt(e.target.value) || 0 })}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                        placeholder="100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('pos.loyalty.type')}</label>
                                    <select
                                        value={formData.rewardType}
                                        onChange={(e) => setFormData({ ...formData, rewardType: e.target.value })}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                    >
                                        <option value="DISCOUNT_PERCENT">Diskon %</option>
                                        <option value="DISCOUNT_FIXED">Diskon Rp</option>
                                        <option value="FREE_ITEM">Gratis Item</option>
                                        <option value="VOUCHER">Voucher</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('pos.loyalty.value')} *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.rewardValue || ''}
                                        onChange={(e) => setFormData({ ...formData, rewardValue: parseFloat(e.target.value) || 0 })}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                        placeholder="10000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('pos.loyalty.stock')}</label>
                                    <input
                                        type="number"
                                        min="-1"
                                        value={formData.stock}
                                        onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || -1 })}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                        placeholder="-1 = unlimited"
                                    />
                                    <p className="mt-0.5 text-xs text-gray-400">-1 = unlimited</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => { setShowAddModal(false); setEditingReward(null); }}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!formData.name.trim() || formData.pointsCost <= 0 || submitting}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                {t('common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('common.confirm')}</h3>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {t('pos.loyalty.confirmDeleteReward')}
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
                            >
                                {t('common.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
