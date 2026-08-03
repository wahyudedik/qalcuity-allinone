'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const financeTabs = [
    { href: '/dashboard/finance', label: 'Ringkasan', icon: '📊' },
    { href: '/dashboard/finance/invoices', label: 'Invoice', icon: '📄' },
    { href: '/dashboard/finance/quotations', label: 'Penawaran', icon: '📋' },
    { href: '/dashboard/finance/payments', label: 'Pembayaran', icon: '💸' },
    { href: '/dashboard/finance/purchase-orders', label: 'Purchase Order', icon: '📦' },
    { href: '/dashboard/finance/accounts', label: 'Akun', icon: '📒' },
]

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    return (
        <div className="space-y-6">
            {/* Finance Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="Finance tabs">
                    {financeTabs.map((tab) => {
                        const isActive = pathname === tab.href || (tab.href !== '/dashboard/finance' && pathname.startsWith(tab.href))
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

            {/* Tab Content */}
            {children}
        </div>
    )
}
