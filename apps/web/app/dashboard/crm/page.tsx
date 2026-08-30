'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Target,
    Handshake,
    DollarSign,
    Trophy,
    Phone,
    Mail,
    CalendarCheck,
    StickyNote,
    TrendingUp,
    Users,
    Loader2,
    AlertCircle,
    type LucideIcon,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'

interface LeadData {
    id: string
    name: string
    email: string | null
    phone: string | null
    company: string | null
    source: string | null
    status: string
    value: number | string | null
    notes: string | null
    contactId: string | null
    contactName: string | null
    createdAt: string
}

interface DealData {
    id: string
    title: string
    name: string
    value: number | string | null
    stage: string
    probability: number
    closeDate: string | null
    expectedCloseDate: string | null
    notes: string | null
    contactId: string | null
    contactName: string | null
    company: string | null
    leadId: string | null
    leadCompany: string | null
    assignedTo: string | null
    createdAt: string
}

interface ContactData {
    id: string
    name: string
    email: string | null
    phone: string | null
    type: string
    address: string | null
    totalDeals: number
    totalInvoices: number
    createdAt: string
}

interface ActivityItem {
    type: 'lead' | 'deal'
    text: string
    time: string
    createdAt: string
    user: string
}

const activityIconMap: Record<string, LucideIcon> = {
    lead: Target,
    deal: Handshake,
}

export default function CrmPage() {
    const { t } = useTranslation()
    const [leads, setLeads] = useState<LeadData[]>([])
    const [deals, setDeals] = useState<DealData[]>([])
    const [contacts, setContacts] = useState<ContactData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                setError(null)

                const [leadsRes, dealsRes, contactsRes] = await Promise.all([
                    fetch('/api/crm/leads?limit=1000'),
                    fetch('/api/crm/deals?limit=1000'),
                    fetch('/api/crm/contacts?limit=1000'),
                ])

                const [leadsJson, dealsJson, contactsJson] = await Promise.all([
                    leadsRes.json(),
                    dealsRes.json(),
                    contactsRes.json(),
                ])

                if (leadsJson.success) setLeads(leadsJson.data)
                if (dealsJson.success) setDeals(dealsJson.data)
                if (contactsJson.success) setContacts(contactsJson.data)
            } catch {
                setError(t('dashboard.failedToLoad') || 'Gagal memuat data')
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="mt-2 h-4 w-72 animate-pulse rounded bg-gray-100 dark:bg-gray-600" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="mt-3 h-8 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-600" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
                    <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
                    <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                    >
                        {t('common.refresh') || 'Muat Ulang'}
                    </button>
                </div>
            </div>
        )
    }

    // Compute summary from real data
    const totalLeads = leads.length
    const activeDeals = deals.filter((d) => !['CLOSED_WON', 'CLOSED_LOST'].includes(d.stage))
    const wonDeals = deals.filter((d) => d.stage === 'CLOSED_WON')
    const totalRevenue = wonDeals.reduce((sum, d) => sum + Number(d.value || 0), 0)
    const totalContacts = contacts.length
    const winRate = deals.length > 0 ? ((wonDeals.length / deals.length) * 100).toFixed(1) : '0.0'

    const summaryCards = [
        { title: t('crm.overview.totalLeads'), value: totalLeads.toString(), change: `+${leads.filter((l) => { const d = new Date(l.createdAt); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() }).length}`, icon: Target, color: 'text-blue-600', href: '/dashboard/crm/leads' },
        { title: t('crm.overview.activeDeals'), value: activeDeals.length.toString(), change: `+${activeDeals.filter((d) => { const d2 = new Date(d.createdAt); const now = new Date(); return d2.getMonth() === now.getMonth() && d2.getFullYear() === now.getFullYear() }).length}`, icon: Handshake, color: 'text-green-600', href: '/dashboard/crm/deals' },
        { title: t('crm.overview.pipelineValue'), value: formatCurrency(totalRevenue), change: `${wonDeals.length} won`, icon: DollarSign, color: 'text-purple-600', href: '/dashboard/crm/pipeline' },
        { title: t('crm.overview.winRate'), value: `${winRate}%`, change: `${wonDeals.length}/${deals.length}`, icon: Trophy, color: 'text-yellow-600', href: '/dashboard/crm/deals' },
    ]

    // Top 5 deals by value (active stages only)
    const topDeals = [...deals]
        .filter((d) => !['CLOSED_WON', 'CLOSED_LOST'].includes(d.stage))
        .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
        .slice(0, 5)

    // Recent Activities: merge leads + deals, sort by createdAt desc
    const recentActivities: ActivityItem[] = [
        ...leads.map((l) => ({
            type: 'lead' as const,
            text: `${l.company ? l.company + ' — ' : ''}${l.name}`,
            time: l.createdAt,
            createdAt: l.createdAt,
            user: l.contactName || 'User',
        })),
        ...deals.map((d) => ({
            type: 'deal' as const,
            text: `${d.title} (${formatCurrency(Number(d.value || 0))})`,
            time: d.createdAt,
            createdAt: d.createdAt,
            user: d.contactName || 'User',
        })),
    ]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)

    // Pipeline Summary: group deals by stage
    const pipelineStages = ['DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'CLOSING'].map((stage) => {
        const stageDeals = deals.filter((d) => d.stage === stage)
        const stageValue = stageDeals.reduce((sum, d) => sum + Number(d.value || 0), 0)
        return {
            stage,
            count: stageDeals.length,
            value: formatCurrency(stageValue),
        }
    })

    const stageColors: Record<string, string> = {
        DISCOVERY: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        PROPOSAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        NEGOTIATION: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        CLOSING: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    }

    const stageBorderColors: Record<string, string> = {
        DISCOVERY: 'border-blue-400',
        PROPOSAL: 'border-yellow-400',
        NEGOTIATION: 'border-orange-400',
        CLOSING: 'border-green-400',
    }

    const getStageLabel = (stage: string) => t(`crm.deals.stages.${stage}`)

    function timeAgo(dateStr: string): string {
        const now = new Date()
        const date = new Date(dateStr)
        const diffMs = now.getTime() - date.getTime()
        const diffMin = Math.floor(diffMs / 60000)
        if (diffMin < 60) return `${diffMin} menit lalu`
        const diffHour = Math.floor(diffMin / 60)
        if (diffHour < 24) return `${diffHour} jam lalu`
        const diffDay = Math.floor(diffHour / 24)
        if (diffDay === 1) return 'Kemarin'
        if (diffDay < 7) return `${diffDay} hari lalu`
        return date.toLocaleDateString('id-ID')
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('crm.overview.title')}</h1>
                <p className="text-gray-500 dark:text-gray-400">{t('crm.overview.subtitle')}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {summaryCards.map((card) => {
                    const Icon = card.icon
                    return (
                        <Link key={card.title} href={card.href} className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{card.title}</span>
                                <Icon className={`h-6 w-6 ${card.color}`} />
                            </div>
                            <p className={`mt-2 text-xl font-bold ${card.color}`}>{card.value}</p>
                            <p className="text-sm text-green-600">{card.change} {t('crm.overview.thisMonth')}</p>
                        </Link>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Top Deals */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('crm.overview.topDeals')}</h2>
                        <Link href="/dashboard/crm/deals" className="text-sm text-blue-600 hover:underline">{t('crm.overview.viewAll')} →</Link>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {topDeals.length > 0 ? topDeals.map((deal) => (
                            <div key={deal.id} className="px-4 py-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{deal.title}</p>
                                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${stageColors[deal.stage] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>
                                            {getStageLabel(deal.stage)}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(Number(deal.value || 0))}</p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <div className="h-1.5 w-16 rounded-full bg-gray-200 dark:bg-gray-600">
                                                <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${deal.probability}%` }} />
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{deal.probability}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="px-4 py-8 text-center">
                                <Handshake className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('common.noData') || 'Belum ada deal aktif'}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activities */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('crm.overview.recentActivities')}</h2>
                        <Link href="/dashboard/audit" className="text-sm text-blue-600 hover:underline">{t('crm.overview.viewAll')} →</Link>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {recentActivities.length > 0 ? recentActivities.map((activity, i) => {
                            const ActivityIcon = activityIconMap[activity.type] || StickyNote
                            return (
                                <div key={i} className="flex items-start gap-3 px-4 py-3">
                                    <ActivityIcon className="mt-0.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-900 dark:text-gray-100">{activity.text}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{activity.user} · {timeAgo(activity.time)}</p>
                                    </div>
                                </div>
                            )
                        }) : (
                            <div className="px-4 py-8 text-center">
                                <StickyNote className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('common.noActivity') || 'Belum ada aktivitas'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Pipeline Summary */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('crm.overview.pipelineSummary')}</h2>
                    <Link href="/dashboard/crm/pipeline" className="text-sm text-blue-600 hover:underline">{t('crm.overview.viewPipeline')} →</Link>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {pipelineStages.map((s) => (
                        <div key={s.stage} className={`rounded-lg border-l-4 ${stageBorderColors[s.stage] || 'border-gray-400'} bg-gray-50 p-3 dark:bg-gray-700/50`}>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{getStageLabel(s.stage)}</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{s.count}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{s.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
