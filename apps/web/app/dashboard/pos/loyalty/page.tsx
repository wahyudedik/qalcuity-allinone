'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import {
    Users, Star, TrendingUp, Gift, Award,
    Loader2,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

type Member = {
    id: string
    memberCode: string
    name: string
    tier: string
    points: number
    totalSpent: number
    createdAt: string
}

type Reward = {
    id: string
    name: string
    pointsCost: number
    rewardType: string
    rewardValue: number
    isActive: boolean
    stock: number
}

type Transaction = {
    id: string
    type: string
    points: number
    description: string
    createdAt: string
    memberName?: string
    memberCode?: string
}

const TIER_COLORS: Record<string, string> = {
    BRONZE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    SILVER: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    GOLD: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    PLATINUM: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const TYPE_LABELS: Record<string, string> = {
    EARN: 'Earned',
    REDEEM: 'Redeemed',
    ADJUST: 'Adjusted',
    EXPIRE: 'Expired',
}

export default function LoyaltyDashboardPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()

    const [members, setMembers] = useState<Member[]>([])
    const [rewards, setRewards] = useState<Reward[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const [membersRes, rewardsRes] = await Promise.all([
                fetch('/api/pos/loyalty/members?limit=50'),
                fetch('/api/pos/loyalty/rewards?showAll=true'),
            ])
            const membersData = await membersRes.json()
            const rewardsData = await rewardsRes.json()

            if (membersData.success) setMembers(membersData.data)
            if (rewardsData.success) setRewards(rewardsData.data)
        } catch {
            setError('Gagal memuat data loyalty')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Stats
    const totalMembers = members.length
    const tierDistribution = {
        BRONZE: members.filter((m) => m.tier === 'BRONZE').length,
        SILVER: members.filter((m) => m.tier === 'SILVER').length,
        GOLD: members.filter((m) => m.tier === 'GOLD').length,
        PLATINUM: members.filter((m) => m.tier === 'PLATINUM').length,
    }
    const totalPoints = members.reduce((sum, m) => sum + m.points, 0)
    const totalSpent = members.reduce((sum, m) => sum + m.totalSpent, 0)
    const activeRewards = rewards.filter((r) => r.isActive).length

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
                <button onClick={fetchData} className="mt-3 text-sm font-medium text-red-600 hover:underline">
                    {t('common.refresh')}
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('pos.loyalty.totalMembers')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalMembers}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                            <Star className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('pos.loyalty.totalPoints')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalPoints.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('pos.loyalty.totalSpent')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalSpent)}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                            <Gift className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('pos.loyalty.activeRewards')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activeRewards}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tier Distribution + Top Members */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Tier Distribution */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        <Award className="h-5 w-5" />
                        {t('pos.loyalty.tierDistribution')}
                    </h3>
                    <div className="mt-4 space-y-3">
                        {Object.entries(tierDistribution).map(([tier, count]) => {
                            const maxCount = Math.max(...Object.values(tierDistribution), 1)
                            const percentage = totalMembers > 0 ? (count / totalMembers) * 100 : 0
                            return (
                                <div key={tier}>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TIER_COLORS[tier]}`}>
                                            {tier}
                                        </span>
                                        <span className="text-gray-600 dark:text-gray-400">{count} members ({percentage.toFixed(0)}%)</span>
                                    </div>
                                    <div className="mt-1 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                                        <div
                                            className="h-2 rounded-full bg-blue-500 transition-all"
                                            style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Top Members */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        <Star className="h-5 w-5" />
                        {t('pos.loyalty.topMembers')}
                    </h3>
                    {members.length === 0 ? (
                        <div className="mt-4">
                            <EmptyState
                                icon={Users}
                                title={t('pos.loyalty.noMembers')}
                                description={t('pos.loyalty.noMembersDesc')}
                            />
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {members
                                .sort((a, b) => b.points - a.points)
                                .slice(0, 5)
                                .map((member) => (
                                    <div key={member.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{member.memberCode}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TIER_COLORS[member.tier]}`}>
                                                {member.tier}
                                            </span>
                                            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{member.points.toLocaleString()} pts</p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
