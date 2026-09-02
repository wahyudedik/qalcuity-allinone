'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Search,
    Gauge,
    FileText,
    Bell,
    LayoutDashboard,
    BarChart3,
    LayoutGrid,
    BookOpen,
    Clock,
    CalendarClock,
    type LucideIcon,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface TabItem {
    href: string
    labelKey: string
    icon: LucideIcon
}

const analyticsTabs: TabItem[] = [
    { href: '/dashboard/analytics', labelKey: 'analytics.layout.tabs.overview', icon: LayoutDashboard },
    { href: '/dashboard/analytics/explorer', labelKey: 'analytics.layout.tabs.explorer', icon: Search },
    { href: '/dashboard/analytics/charts', labelKey: 'analytics.layout.tabs.charts', icon: BarChart3 },
    { href: '/dashboard/analytics/dashboards', labelKey: 'analytics.layout.tabs.dashboards', icon: LayoutGrid },
    { href: '/dashboard/analytics/kpi', labelKey: 'analytics.layout.tabs.kpi', icon: Gauge },
    { href: '/dashboard/analytics/reports', labelKey: 'analytics.layout.tabs.reports', icon: FileText },
    { href: '/dashboard/analytics/dictionary', labelKey: 'analytics.layout.tabs.dictionary', icon: BookOpen },
    { href: '/dashboard/analytics/history', labelKey: 'analytics.layout.tabs.history', icon: Clock },
    { href: '/dashboard/analytics/scheduled', labelKey: 'analytics.layout.tabs.scheduled', icon: CalendarClock },
    { href: '/dashboard/analytics/alerts', labelKey: 'analytics.layout.tabs.alerts', icon: Bell },
]

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { t } = useTranslation()

    return (
        <div className="space-y-6">
            {/* Analytics Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="Analytics tabs">
                    {analyticsTabs.map((tab) => {
                        const isActive = tab.href === '/dashboard/analytics'
                            ? pathname === tab.href
                            : pathname === tab.href || pathname?.startsWith(tab.href + '/')
                        const Icon = tab.icon
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${isActive
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{t(tab.labelKey) || tab.labelKey.split('.').pop()}</span>
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* Page Content */}
            {children}
        </div>
    )
}
