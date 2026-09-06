'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Shield, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const AI_NAV_ITEMS = [
    {
        label: 'Document Extraction',
        href: '/dashboard/ai/documents',
        icon: FileText,
    },
    {
        label: 'Anomaly Detection',
        href: '/dashboard/ai/anomalies',
        icon: Shield,
    },
];

export default function AILayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            {/* AI Section Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-600">
                    <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {t('ai.title') || 'AI Features'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('ai.subtitle') || 'Ekstraksi dokumen dan deteksi anomali'}
                    </p>
                </div>
            </div>

            {/* AI Navigation Tabs */}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                {AI_NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${isActive
                                    ? 'bg-white text-blue-700 shadow-sm dark:bg-gray-700 dark:text-blue-400'
                                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </div>

            {/* Content */}
            {children}
        </div>
    );
}
