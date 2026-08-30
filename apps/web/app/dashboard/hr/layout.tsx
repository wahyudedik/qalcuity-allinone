'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    BarChart3,
    Users,
    Clock,
    Palmtree,
    Banknote,
    type LucideIcon,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface TabItem {
    href: string
    labelKey: string
    icon: LucideIcon
}

const hrTabs: TabItem[] = [
    { href: '/dashboard/hr', labelKey: 'hr.layout.tabs.overview', icon: BarChart3 },
    { href: '/dashboard/hr/employees', labelKey: 'hr.layout.tabs.employees', icon: Users },
    { href: '/dashboard/hr/attendance', labelKey: 'hr.layout.tabs.attendance', icon: Clock },
    { href: '/dashboard/hr/leaves', labelKey: 'hr.layout.tabs.leaves', icon: Palmtree },
    { href: '/dashboard/hr/payroll', labelKey: 'hr.layout.tabs.payroll', icon: Banknote },
]

export default function HrLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { t } = useTranslation()

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="HR tabs">
                    {hrTabs.map((tab) => {
                        const isActive = pathname === tab.href || (tab.href !== '/dashboard/hr' && pathname?.startsWith(tab.href))
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
