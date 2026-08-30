'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    BarChart3,
    Package,
    ClipboardList,
    Tag,
    Factory,
    type LucideIcon,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface TabItem {
    href: string
    labelKey: string
    icon: LucideIcon
}

const inventoryTabs: TabItem[] = [
    { href: '/dashboard/inventory', labelKey: 'inventory.layout.tabs.overview', icon: BarChart3 },
    { href: '/dashboard/inventory/products', labelKey: 'inventory.layout.tabs.products', icon: Package },
    { href: '/dashboard/inventory/stock', labelKey: 'inventory.layout.tabs.stock', icon: ClipboardList },
    { href: '/dashboard/inventory/categories', labelKey: 'inventory.layout.tabs.categories', icon: Tag },
    { href: '/dashboard/inventory/suppliers', labelKey: 'inventory.layout.tabs.suppliers', icon: Factory },
]

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { t } = useTranslation()

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="Inventory tabs">
                    {inventoryTabs.map((tab) => {
                        const isActive = pathname === tab.href || (tab.href !== '/dashboard/inventory' && pathname?.startsWith(tab.href))
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
