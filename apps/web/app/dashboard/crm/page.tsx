'use client'

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
    type LucideIcon,
} from 'lucide-react'

const summaryCards = [
    { title: 'Total Leads', value: '156', change: '+23', icon: Target, color: 'text-blue-600', href: '/dashboard/crm/leads' },
    { title: 'Deals Aktif', value: '42', change: '+8', icon: Handshake, color: 'text-green-600', href: '/dashboard/crm/deals' },
    { title: 'Pipeline Value', value: 'Rp 850 Jt', change: '+15%', icon: DollarSign, color: 'text-purple-600', href: '/dashboard/crm/pipeline' },
    { title: 'Win Rate', value: '34.2%', change: '+2.1%', icon: Trophy, color: 'text-yellow-600', href: '/dashboard/crm/deals' },
]

const topDeals = [
    { name: 'PT ABC Corp', value: 'Rp 150 Jt', stage: 'Negosiasi', winProb: 75 },
    { name: 'CV Maju Bersama', value: 'Rp 85 Jt', stage: 'Proposal', winProb: 55 },
    { name: 'PT Sejahtera', value: 'Rp 200 Jt', stage: 'Discovery', winProb: 30 },
    { name: 'CV Berkah Jaya', value: 'Rp 45 Jt', stage: 'Closing', winProb: 90 },
    { name: 'PT Abadi Sentosa', value: 'Rp 120 Jt', stage: 'Proposal', winProb: 45 },
]

const recentActivities = [
    { type: 'call', text: 'Telepon ke PT ABC Corp', time: '2 jam lalu', user: 'Budi' },
    { type: 'email', text: 'Email follow-up ke CV Maju Bersama', time: '3 jam lalu', user: 'Sari' },
    { type: 'meeting', text: 'Meeting dengan PT Sejahtera', time: 'Kemarin', user: 'Andi' },
    { type: 'note', text: 'Note: CV Berkah butuh revisi proposal', time: 'Kemarin', user: 'Budi' },
    { type: 'call', text: 'Telepon ke PT Abadi Sentosa', time: '2 hari lalu', user: 'Sari' },
]

const stageColors: Record<string, string> = {
    Discovery: 'bg-blue-100 text-blue-800',
    Proposal: 'bg-yellow-100 text-yellow-800',
    Negosiasi: 'bg-orange-100 text-orange-800',
    Closing: 'bg-green-100 text-green-800',
}

const activityIconMap: Record<string, LucideIcon> = {
    call: Phone,
    email: Mail,
    meeting: CalendarCheck,
    note: StickyNote,
}

export default function CrmPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">CRM Overview</h1>
                <p className="text-gray-500 dark:text-gray-400">Ringkasan aktivitas sales dan CRM</p>
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
                            <p className="text-sm text-green-600">{card.change} bulan ini</p>
                        </Link>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Top Deals */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Top Deals</h2>
                        <Link href="/dashboard/crm/deals" className="text-sm text-blue-600 hover:underline">Lihat Semua →</Link>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {topDeals.map((deal) => (
                            <div key={deal.name} className="px-4 py-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{deal.name}</p>
                                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${stageColors[deal.stage] || 'bg-gray-100 text-gray-800'}`}>
                                            {deal.stage}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{deal.value}</p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <div className="h-1.5 w-16 rounded-full bg-gray-200 dark:bg-gray-600">
                                                <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${deal.winProb}%` }} />
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{deal.winProb}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activities */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Aktivitas Terbaru</h2>
                        <Link href="/dashboard/audit" className="text-sm text-blue-600 hover:underline">Lihat Semua →</Link>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {recentActivities.map((activity, i) => {
                            const ActivityIcon = activityIconMap[activity.type] || StickyNote
                            return (
                                <div key={i} className="flex items-start gap-3 px-4 py-3">
                                    <ActivityIcon className="mt-0.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-900 dark:text-gray-100">{activity.text}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{activity.user} · {activity.time}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Pipeline Summary */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">Pipeline Summary</h2>
                    <Link href="/dashboard/crm/pipeline" className="text-sm text-blue-600 hover:underline">Lihat Pipeline →</Link>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                        { stage: 'Discovery', count: 18, value: 'Rp 320 Jt', color: 'border-blue-400' },
                        { stage: 'Proposal', count: 12, value: 'Rp 280 Jt', color: 'border-yellow-400' },
                        { stage: 'Negosiasi', count: 8, value: 'Rp 185 Jt', color: 'border-orange-400' },
                        { stage: 'Closing', count: 4, value: 'Rp 65 Jt', color: 'border-green-400' },
                    ].map((s) => (
                        <div key={s.stage} className={`rounded-lg border-l-4 ${s.color} bg-gray-50 p-3 dark:bg-gray-700/50`}>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.stage}</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{s.count}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{s.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
