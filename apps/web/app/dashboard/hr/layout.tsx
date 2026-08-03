'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const hrTabs = [
    { href: '/dashboard/hr', label: 'Ringkasan', icon: '📊' },
    { href: '/dashboard/hr/employees', label: 'Karyawan', icon: '👥' },
    { href: '/dashboard/hr/attendance', label: 'Absensi', icon: '⏰' },
    { href: '/dashboard/hr/leaves', label: 'Cuti', icon: '🏖️' },
    { href: '/dashboard/hr/payroll', label: 'Payroll', icon: '💰' },
]

export default function HrLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="HR tabs">
                    {hrTabs.map((tab) => {
                        const isActive = pathname === tab.href || (tab.href !== '/dashboard/hr' && pathname.startsWith(tab.href))
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
