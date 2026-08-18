'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const { t } = useTranslation()

    const settingsTabs = [
        {
            name: t('settings.profile') || 'Profil',
            href: '/dashboard/settings',
            description: 'Informasi akun dan profil Anda',
        },
        {
            name: t('settings.company') || 'Perusahaan',
            href: '/dashboard/settings/company',
            description: 'Informasi perusahaan',
        },
        {
            name: t('settings.team') || 'Tim',
            href: '/dashboard/settings/team',
            description: 'Kelola anggota tim',
        },
        {
            name: t('settings.billing') || 'Billing',
            href: '/dashboard/settings/billing',
            description: 'Pembayaran dan langganan',
        },
        {
            name: t('settings.integrations') || 'Integrasi',
            href: '/dashboard/settings/integrations',
            description: 'Hubungkan layanan pihak ketiga',
        },
        {
            name: t('settings.notifications') || 'Notifikasi',
            href: '/dashboard/settings/notifications',
            description: 'Pengaturan notifikasi',
        },
        {
            name: t('settings.security') || 'Keamanan',
            href: '/dashboard/settings/security',
            description: 'Password dan keamanan akun',
        },
    ]

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{t('common.settings') || 'Pengaturan'}</h1>
                <p className="text-gray-600 mt-1">Kelola akun dan pengaturan aplikasi Anda</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar navigation */}
                <nav className="lg:w-64 flex-shrink-0">
                    <div className="bg-white rounded-xl border border-gray-200 p-2">
                        {settingsTabs.map((tab) => {
                            const isActive = pathname === tab.href
                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className={`block px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="font-medium text-sm">{tab.name}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{tab.description}</div>
                                </Link>
                            )
                        })}
                    </div>
                </nav>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {children}
                </div>
            </div>
        </div>
    )
}
