'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const inventoryTabs = [
    { href: '/dashboard/inventory', label: 'Ringkasan', icon: '📊' },
    { href: '/dashboard/inventory/products', label: 'Produk', icon: '📦' },
    { href: '/dashboard/inventory/stock', label: 'Stok', icon: '📋' },
    { href: '/dashboard/inventory/categories', label: 'Kategori', icon: '🏷️' },
    { href: '/dashboard/inventory/suppliers', label: 'Supplier', icon: '🏭' },
]

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="Inventory tabs">
                    {inventoryTabs.map((tab) => {
                        const isActive = pathname === tab.href || (tab.href !== '/dashboard/inventory' && pathname.startsWith(tab.href))
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${isActive
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </Link>
                        )
                    })}
                </nav>
            </div>
            {children}
        </div>
    )
}
