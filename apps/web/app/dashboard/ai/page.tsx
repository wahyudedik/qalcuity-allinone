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

interface FeatureCard {
    title: string;
    description: string;
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    status: 'available' | 'coming-soon';
}

const features: FeatureCard[] = [
    {
        title: 'Finance Agent',
        description: 'Analisis otomatis untuk revenue, expenses, cash flow, dan profit & loss.',
        icon: TrendingUp,
        iconBg: 'bg-green-100 dark:bg-green-900/30',
        iconColor: 'text-green-600 dark:text-green-400',
        status: 'coming-soon',
    },
    {
        title: 'Sales Agent',
        description: 'Prediksi probability deal, lead scoring, dan rekomendasi follow-up.',
        icon: Users,
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        iconColor: 'text-blue-600 dark:text-blue-400',
        status: 'coming-soon',
    },
    {
        title: 'Inventory Agent',
        description: 'Prediksi demand, optimalisasi stok, dan rekomendasi reorder.',
        icon: Package,
        iconBg: 'bg-orange-100 dark:bg-orange-900/30',
        iconColor: 'text-orange-600 dark:text-orange-400',
        status: 'coming-soon',
    },
    {
        title: 'Natural Language Query',
        description:
            'Tanyakan data bisnis dalam bahasa alami. Contoh: "Berapa total penjualan bulan ini?"',
        icon: MessageSquare,
        iconBg: 'bg-purple-100 dark:bg-purple-900/30',
        iconColor: 'text-purple-600 dark:text-purple-400',
        status: 'available',
    },
    {
        title: 'Document Extraction',
        description: 'Ekstraksi data otomatis dari invoice, receipt, dan dokumen lainnya.',
        icon: FileText,
        iconBg: 'bg-red-100 dark:bg-red-900/30',
        iconColor: 'text-red-600 dark:text-red-400',
        status: 'coming-soon',
    },
    {
        title: 'Anomaly Detection',
        description: 'Deteksi transaksi mencurigakan dan pola tidak normal secara otomatis.',
        icon: AlertTriangle,
        iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        status: 'coming-soon',
    },
];

export default function AIPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
                    <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Features</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Powered by Qalcuity AI</p>
                </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {features.map((feature) => {
                    const Icon = feature.icon;
                    return (
                        <div
                            key={feature.title}
                            className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div
                                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${feature.iconBg}`}
                            >
                                <Icon className={`h-6 w-6 ${feature.iconColor}`} />
                            </div>
                            <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                                {feature.title}
                            </h3>
                            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{feature.description}</p>
                            <div className="flex items-center gap-2 text-sm">
                                {feature.status === 'available' ? (
                                    <span className="rounded bg-green-100 px-2 py-1 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                        Basic Available
                                    </span>
                                ) : (
                                    <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                        Coming Soon
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
                    Try AI Assistant
                </h2>
                <p className="mb-4 text-gray-500 dark:text-gray-400">
                    Gunakan tombol AI Assistant di pojok kanan bawah untuk berinteraksi dengan AI.
                </p>
                <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                    <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Contoh pertanyaan:
                    </p>
                    <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <li>"Berapa total penjualan bulan ini?"</li>
                        <li>"Siapa customer terbesar?"</li>
                        <li>"Status invoice yang belum dibayar"</li>
                        <li>"Analisis profit & loss"</li>
                    </ul>
                </div>
            </div>

            {/* Back to Dashboard */}
            <Link
                href="/dashboard"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
                ← Kembali ke Dashboard
            </Link>
        </div>
    );
}
