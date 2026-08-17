'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    BarChart3,
    GitBranch,
    Target,
    Users,
    Handshake,
    type LucideIcon,
} from 'lucide-react'

interface TabItem {
    href: string
    label: string
    icon: LucideIcon
}

const crmTabs: TabItem[] = [
    { href: '/dashboard/crm', label: 'Ringkasan', icon: BarChart3 },
    { href: '/dashboard/crm/pipeline', label: 'Pipeline', icon: GitBranch },
    { href: '/dashboard/crm/leads', label: 'Leads', icon: Target },
    { href: '/dashboard/crm/contacts', label: 'Kontak', icon: Users },
    { href: '/dashboard/crm/deals', label: 'Deals', icon: Handshake },
]

export default function CrmLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    return (
        <div className="space-y-6">
            {/* CRM Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="CRM tabs">
                    {crmTabs.map((tab) => {
                        const isActive = pathname === tab.href || (tab.href !== '/dashboard/crm' && pathname.startsWith(tab.href))
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
                                {tab.label}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            {children}
        </div>
    )
}
