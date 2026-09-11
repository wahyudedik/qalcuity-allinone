'use client'

import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import {
    FileBarChart,
    Scale,
    TrendingUp,
    ClipboardList,
    Loader2,
    AlertCircle,
} from 'lucide-react'
import { useState, useEffect } from 'react'

const reports = [
    {
        key: 'balanceSheet',
        icon: Scale,
        href: '/dashboard/finance/reports/balance-sheet',
        color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
        borderColor: 'border-blue-200 dark:border-blue-800',
    },
    {
        key: 'incomeStatement',
        icon: TrendingUp,
        href: '/dashboard/finance/reports/income-statement',
        color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
        borderColor: 'border-green-200 dark:border-green-800',
    },
    {
        key: 'trialBalance',
        icon: ClipboardList,
        href: '/dashboard/finance/reports/trial-balance',
        color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
        borderColor: 'border-purple-200 dark:border-purple-800',
    },
]

export default function FinanceReportsPage() {
    const { t } = useTranslation()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="space-y-6">
                <div>
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                            <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse" />
                            <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mt-4" />
                            <div className="h-4 w-56 bg-gray-200 rounded animate-pulse mt-2" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileBarChart className="h-6 w-6" />
                    {t('finance.reports.title') || 'Laporan Keuangan'}
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('finance.reports.subtitle') || 'Lihat laporan keuangan bisnis Anda'}
                </p>
            </div>

            {/* Report Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {reports.map((report) => {
                    const Icon = report.icon
                    return (
                        <Link
                            key={report.key}
                            href={report.href}
                            className={`group block rounded-xl border ${report.borderColor} bg-white p-6 transition-all hover:shadow-md dark:bg-gray-800`}
                        >
                            <div className={`inline-flex rounded-lg p-3 ${report.color}`}>
                                <Icon className="h-6 w-6" />
                            </div>
                            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {t(`finance.reports.${report.key}.title`) || report.key}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {t(`finance.reports.${report.key}.description`) || ''}
                            </p>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
