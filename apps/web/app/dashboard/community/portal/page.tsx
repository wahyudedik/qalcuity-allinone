'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BellRing, Banknote, CalendarDays, FileText, Home, Megaphone, Package, PiggyBank, UserX } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatCurrencyIDR, formatDateID } from '@/lib/export'

interface OverviewData {
    member: { code: string; fullName: string } | null
    billsThisPeriod: {
        total: number
        paid: number
        partial: number
        unpaid: number
        amountDue: number
        amountPaid: number
    }
    cashThisMonth: { income: number; expense: number; balance: number }
    latestAnnouncements: {
        id: string
        title: string
        category: string
        priority: string
        publishedAt: string | null
    }[]
}

function priorityBadge(priority: string) {
    if (priority === 'URGENT') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    if (priority === 'HIGH') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    if (priority === 'NORMAL') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

function categoryLabel(t: (k: string) => string, category: string) {
    const key = `community.announcements.category.${category.toLowerCase()}`
    const label = t(key)
    return label === key ? category : label
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                {icon}
                <p className="text-xs font-medium uppercase tracking-wider">{label}</p>
            </div>
            <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
    )
}

export default function CommunityPortalPage() {
    const { t } = useTranslation()
    const { addToast } = useToast()
    const [data, setData] = useState<OverviewData | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/community/portal/overview')
            if (!res.ok) throw new Error()
            const json = await res.json()
            setData(json.data)
        } catch {
            addToast(t('common.error.load'), 'error')
        } finally {
            setLoading(false)
        }
    }, [addToast, t])

    useEffect(() => {
        void fetchData()
    }, [fetchData])

    if (loading) {
        return (
            <div className="space-y-4 p-6">
                <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                    ))}
                </div>
                <div className="h-48 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
            </div>
        )
    }

    if (data && !data.member) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={UserX}
                    title={t('community.portal.notRegistered')}
                    description={t('community.portal.notRegisteredDesc')}
                />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={Home}
                    title={t('common.error.load')}
                    description=""
                />
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {t('community.portal.welcome')}, {data.member?.fullName}
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('community.portal.memberCode')}: <span className="font-mono">{data.member?.code}</span>
                </p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{t('community.portal.readInfo')}</p>
            </div>

            {/* Quick links: Surat, Kegiatan & Aset */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Link
                    href="/dashboard/community/portal/letters"
                    className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-purple-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-purple-700"
                >
                    <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-purple-100 p-2 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                            <FileText className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="font-medium text-gray-900 group-hover:text-purple-600 dark:text-gray-100 dark:group-hover:text-purple-400">
                                {t('community.portal.myLetters.title')}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('community.portal.myLetters.quickDesc')}</p>
                        </div>
                    </div>
                </Link>
                <Link
                    href="/dashboard/community/portal/events"
                    className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-teal-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-teal-700"
                >
                    <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-teal-100 p-2 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
                            <CalendarDays className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="font-medium text-gray-900 group-hover:text-teal-600 dark:text-gray-100 dark:group-hover:text-teal-400">
                                {t('community.portal.myEvents.title')}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('community.portal.myEvents.quickDesc')}</p>
                        </div>
                    </div>
                </Link>
                <Link
                    href="/dashboard/community/portal/assets"
                    className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-orange-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-orange-700"
                >
                    <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-orange-100 p-2 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                            <Package className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="font-medium text-gray-900 group-hover:text-orange-600 dark:text-gray-100 dark:group-hover:text-orange-400">
                                {t('community.portal.assets.title')}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('community.portal.assets.quickDesc')}</p>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Bills this period */}
            <section className="space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    <Banknote className="h-5 w-5 text-blue-600" />
                    {t('community.portal.myBills.title')}
                </h2>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        label={t('community.portal.myBills.amountDue')}
                        value={formatCurrencyIDR(data.billsThisPeriod.amountDue)}
                        icon={<Banknote className="h-4 w-4" />}
                    />
                    <StatCard
                        label={t('community.portal.myBills.amountPaid')}
                        value={formatCurrencyIDR(data.billsThisPeriod.amountPaid)}
                        icon={<Banknote className="h-4 w-4" />}
                    />
                    <StatCard
                        label={t('community.portal.billsStatus.paid')}
                        value={String(data.billsThisPeriod.paid)}
                        icon={<Banknote className="h-4 w-4" />}
                    />
                    <StatCard
                        label={t('community.portal.billsStatus.unpaid')}
                        value={String(data.billsThisPeriod.unpaid)}
                        icon={<Banknote className="h-4 w-4" />}
                    />
                </div>
                <Link
                    href="/dashboard/community/portal/bills"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                >
                    {t('community.portal.myBills.title')} →
                </Link>
            </section>

            {/* Cash this month */}
            <section className="space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    <PiggyBank className="h-5 w-5 text-green-600" />
                    {t('community.portal.cash.title')}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatCard
                        label={t('community.portal.cash.income')}
                        value={formatCurrencyIDR(data.cashThisMonth.income)}
                        icon={<PiggyBank className="h-4 w-4" />}
                    />
                    <StatCard
                        label={t('community.portal.cash.expense')}
                        value={formatCurrencyIDR(data.cashThisMonth.expense)}
                        icon={<PiggyBank className="h-4 w-4" />}
                    />
                    <StatCard
                        label={t('community.portal.cash.balance')}
                        value={formatCurrencyIDR(data.cashThisMonth.balance)}
                        icon={<PiggyBank className="h-4 w-4" />}
                    />
                </div>
            </section>

            {/* Latest announcements */}
            <section className="space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    <Megaphone className="h-5 w-5 text-blue-600" />
                    {t('community.portal.announcements.title')}
                </h2>
                {data.latestAnnouncements.length === 0 ? (
                    <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        {t('community.portal.announcements.empty')}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {data.latestAnnouncements.map((ann) => (
                            <div key={ann.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <BellRing className="h-4 w-4 shrink-0 text-blue-600" />
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{ann.title}</p>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadge(ann.priority)}`}>
                                        {ann.priority}
                                    </span>
                                </div>
                                <p className="mt-1 pl-6 text-xs text-gray-500 dark:text-gray-400">
                                    {categoryLabel(t, ann.category)}
                                    {ann.publishedAt ? ` · ${formatDateID(ann.publishedAt)}` : ''}
                                </p>
                            </div>
                        ))}
                        <Link
                            href="/dashboard/community/portal/announcements"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                        >
                            {t('community.portal.announcements.title')} →
                        </Link>
                    </div>
                )}
            </section>
        </div>
    )
}
