'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
    BarChart3,
    CalendarDays,
    FileText,
    Home,
    Megaphone,
    Receipt,
    Tags,
    Users,
    Wallet,
    Landmark,
    type LucideIcon,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { usePermission } from '@/lib/use-permission'

interface TabItem {
    href: string
    labelKey: string
    icon: LucideIcon
}

const BASE = '/dashboard/community'

const internalTabs: TabItem[] = [
    { href: BASE, labelKey: 'community.layout.tabs.overview', icon: BarChart3 },
    { href: `${BASE}/members`, labelKey: 'community.layout.tabs.members', icon: Users },
    { href: `${BASE}/dues-types`, labelKey: 'community.layout.tabs.duesTypes', icon: Tags },
    { href: `${BASE}/bills`, labelKey: 'community.layout.tabs.bills', icon: Receipt },
    { href: `${BASE}/cash`, labelKey: 'community.layout.tabs.cash', icon: Wallet },
    { href: `${BASE}/letters`, labelKey: 'community.layout.tabs.letters', icon: FileText },
    { href: `${BASE}/events`, labelKey: 'community.layout.tabs.events', icon: CalendarDays },
    { href: `${BASE}/announcements`, labelKey: 'community.layout.tabs.announcements', icon: Megaphone },
    { href: `${BASE}/reports`, labelKey: 'community.layout.tabs.reports', icon: BarChart3 },
]

const portalTabs: TabItem[] = [
    { href: `${BASE}/portal`, labelKey: 'community.layout.tabs.portal', icon: Home },
    { href: `${BASE}/portal/bills`, labelKey: 'community.layout.tabs.bills', icon: Receipt },
    { href: `${BASE}/portal/letters`, labelKey: 'community.layout.tabs.letters', icon: FileText },
    { href: `${BASE}/portal/events`, labelKey: 'community.layout.tabs.events', icon: CalendarDays },
    { href: `${BASE}/portal/announcements`, labelKey: 'community.layout.tabs.announcements', icon: Megaphone },
]

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const { status } = useSession()
    const { t } = useTranslation()
    const { hasPermission } = usePermission()

    const isPortalOnly =
        hasPermission('community:portal') &&
        !hasPermission('community:view') &&
        !hasPermission('community:manage') &&
        !hasPermission('community:finance')

    useEffect(() => {
        if (status === 'loading') return
        // WARGA (portal-only) yang membuka halaman internal → redirect ke portal
        if (isPortalOnly && !pathname?.startsWith(`${BASE}/portal`)) {
            router.replace(`${BASE}/portal`)
        }
    }, [status, isPortalOnly, pathname, router])

    // Gate: jangan render tabs selagi session masih loading
    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
        )
    }

    // Selama redirect WARGA→portal berlangsung, tampilkan gate
    if (isPortalOnly && !pathname?.startsWith(`${BASE}/portal`)) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
        )
    }

    const tabs = isPortalOnly ? portalTabs : internalTabs

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="Community tabs">
                    {tabs.map((tab) => {
                        const isActive =
                            pathname === tab.href ||
                            (tab.href !== BASE && pathname?.startsWith(tab.href)) ||
                            (tab.href === BASE && pathname === BASE)
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
