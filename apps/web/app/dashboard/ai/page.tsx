'use client';

import {
    Sparkles,
    TrendingUp,
    Users,
    Package,
    MessageSquare,
    FileText,
    AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

interface FeatureCard {
    titleKey: string;
    descKey: string;
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    status: 'available' | 'coming-soon';
}

const features: FeatureCard[] = [
    {
        titleKey: 'ai.financeAgent',
        descKey: 'ai.financeAgentDesc',
        icon: TrendingUp,
        iconBg: 'bg-green-100 dark:bg-green-900/30',
        iconColor: 'text-green-600 dark:text-green-400',
        status: 'coming-soon',
    },
    {
        titleKey: 'ai.salesAgent',
        descKey: 'ai.salesAgentDesc',
        icon: Users,
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        iconColor: 'text-blue-600 dark:text-blue-400',
        status: 'coming-soon',
    },
    {
        titleKey: 'ai.inventoryAgent',
        descKey: 'ai.inventoryAgentDesc',
        icon: Package,
        iconBg: 'bg-orange-100 dark:bg-orange-900/30',
        iconColor: 'text-orange-600 dark:text-orange-400',
        status: 'coming-soon',
    },
    {
        titleKey: 'ai.nlqTitle',
        descKey: 'ai.nlqDesc',
        icon: MessageSquare,
        iconBg: 'bg-purple-100 dark:bg-purple-900/30',
        iconColor: 'text-purple-600 dark:text-purple-400',
        status: 'available',
    },
    {
        titleKey: 'ai.docExtraction',
        descKey: 'ai.docExtractionDesc',
        icon: FileText,
        iconBg: 'bg-red-100 dark:bg-red-900/30',
        iconColor: 'text-red-600 dark:text-red-400',
        status: 'coming-soon',
    },
    {
        titleKey: 'ai.anomalyDetection',
        descKey: 'ai.anomalyDetectionDesc',
        icon: AlertTriangle,
        iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        status: 'coming-soon',
    },
];

export default function AIPage() {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
                    <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('ai.title')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('ai.subtitle')}</p>
                </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {features.map((feature) => {
                    const Icon = feature.icon;
                    return (
                        <div
                            key={feature.titleKey}
                            className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div
                                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${feature.iconBg}`}
                            >
                                <Icon className={`h-6 w-6 ${feature.iconColor}`} />
                            </div>
                            <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                                {t(feature.titleKey)}
                            </h3>
                            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{t(feature.descKey)}</p>
                            <div className="flex items-center gap-2 text-sm">
                                {feature.status === 'available' ? (
                                    <span className="rounded bg-green-100 px-2 py-1 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                        {t('ai.basicAvailable')}
                                    </span>
                                ) : (
                                    <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                        {t('ai.comingSoon')}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* AI Chat Section */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t('ai.tryAssistant')}
                </h2>
                <p className="mb-4 text-gray-500 dark:text-gray-400">
                    {t('ai.tryAssistantDesc')}
                </p>
                <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                    <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('ai.exampleQuestions')}
                    </p>
                    <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <li>{t('ai.exampleQ1')}</li>
                        <li>{t('ai.exampleQ2')}</li>
                        <li>{t('ai.exampleQ3')}</li>
                        <li>{t('ai.exampleQ4')}</li>
                    </ul>
                </div>
            </div>

            {/* Back to Dashboard */}
            <Link
                href="/dashboard"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
                ← {t('ai.backToDashboard')}
            </Link>
        </div>
    );
}
