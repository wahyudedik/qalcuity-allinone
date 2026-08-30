'use client'

import Link from 'next/link'
import {
    Users,
    CheckCircle,
    Palmtree,
    Home,
    Cake,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

const summaryCards = [
    { titleKey: 'hr.overview.totalEmployees', value: '45', icon: Users, color: 'text-blue-600', href: '/dashboard/hr/employees' },
    { titleKey: 'hr.overview.presentToday', value: '38', icon: CheckCircle, color: 'text-green-600', href: '/dashboard/hr/attendance' },
    { titleKey: 'hr.overview.leaveToday', value: '5', icon: Palmtree, color: 'text-yellow-600', href: '/dashboard/hr/leaves' },
    { titleKey: 'hr.overview.wfhToday', value: '2', icon: Home, color: 'text-purple-600', href: '/dashboard/hr/attendance' },
]

const recentLeaves = [
    { name: 'Andi Pratama', type: 'Cuti Tahunan', dates: '4-5 Agt 2026', status: 'approved' },
    { name: 'Sari Dewi', type: 'Sakit', dates: '3 Agt 2026', status: 'approved' },
    { name: 'Budi Hartono', type: 'Cuti Tahunan', dates: '6-8 Agt 2026', status: 'pending' },
    { name: 'Rina Sari', type: 'Cuti Tahunan', dates: '10-12 Agt 2026', status: 'pending' },
]

const birthdays = [
    { name: 'Dedi Kurniawan', date: '5 Agt 2026', department: 'Engineering' },
    { name: 'Maya Putri', date: '8 Agt 2026', department: 'Marketing' },
    { name: 'Hendra Wijaya', date: '15 Agt 2026', department: 'Sales' },
]

const statusStyles: Record<string, string> = {
    approved: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
}

const statusKeys: Record<string, string> = {
    approved: 'hr.overview.approved',
    pending: 'hr.overview.pending',
    rejected: 'hr.overview.rejected',
}

export default function HrPage() {
    const { t } = useTranslation()
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('hr.overview.title')}</h1>
                <p className="text-gray-500 dark:text-gray-400">{t('hr.overview.subtitle')}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {summaryCards.map((card) => {
                    const Icon = card.icon
                    return (
                        <Link key={card.titleKey} href={card.href} className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{t(card.titleKey)}</span>
                                <Icon className={`h-6 w-6 ${card.color}`} />
                            </div>
                            <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
                        </Link>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Recent Leave Requests */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                        <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                            <Palmtree className="h-4 w-4 text-yellow-500" />
                            {t('hr.overview.recentLeaves')}
                        </h2>
                        <Link href="/dashboard/hr/leaves" className="text-sm text-blue-600 hover:underline">{t('hr.overview.viewAll')}</Link>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {recentLeaves.map((leave, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-3">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">{leave.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{leave.type} · {leave.dates}</p>
                                </div>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[leave.status]}`}>
                                    {t(statusKeys[leave.status])}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Upcoming Birthdays */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                        <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                            <Cake className="h-4 w-4 text-pink-500" />
                            {t('hr.overview.upcomingBirthdays')}
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {birthdays.map((b, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/30">
                                    <Cake className="h-5 w-5 text-pink-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-gray-100">{b.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{b.department}</p>
                                </div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{b.date}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
