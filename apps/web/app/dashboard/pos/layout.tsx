'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Monitor,
    BookOpen,
    Receipt,
    BarChart3,
    RotateCcw,
    Award,
    Activity,
    type LucideIcon,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface TabItem {
    href: string
    labelKey: string
    icon: LucideIcon
}

const posTabs: TabItem[] = [
    { href: '/dashboard/pos/terminal', labelKey: 'pos.layout.tabs.terminal', icon: Monitor },
    { href: '/dashboard/pos/sessions', labelKey: 'pos.layout.tabs.sessions', icon: BookOpen },
    { href: '/dashboard/pos/transactions', labelKey: 'pos.layout.tabs.transactions', icon: Receipt },
    { href: '/dashboard/pos/refunds', labelKey: 'pos.layout.tabs.refunds', icon: RotateCcw },
    { href: '/dashboard/pos/reports', labelKey: 'pos.layout.tabs.reports', icon: BarChart3 },
    { href: '/dashboard/pos/terminals', labelKey: 'pos.layout.tabs.terminals', icon: Monitor },
    { href: '/dashboard/pos/terminals-monitor', labelKey: 'pos.layout.tabs.monitor', icon: Activity },
    { href: '/dashboard/pos/loyalty', labelKey: 'pos.layout.tabs.loyalty', icon: Award },
]

export default function POSLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { t } = useTranslation()

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="POS tabs">
                    {posTabs.map((tab) => {
                        const isActive = pathname === tab.href || (tab.href !== '/dashboard/pos' && pathname?.startsWith(tab.href))
                        const Icon = tab.icon
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${isActive
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {t(tab.labelKey)}
                            </Link>
                        )
                    })}
                </nav>
            </div>
            {children}
        </div>
    )
}
