'use client';

/**
 * Field Service Overview Page — Halaman utama Field Service.
 * Menampilkan ringkasan pekerjaan lapangan dan navigasi ke sub-halaman.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Wrench,
    ClipboardList,
    Calendar,
    MapPin,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Navigation,
    Loader2,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

// =============================================================================
// Types
// =============================================================================

interface FieldStats {
    totalJobs: number;
    scheduledJobs: number;
    inProgressJobs: number;
    completedJobs: number;
    todayJobs: number;
}

// =============================================================================
// Main Component
// =============================================================================

export default function FieldServicePage() {
    const { t } = useTranslation();
    const [stats, setStats] = useState<FieldStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch('/api/field/jobs?limit=1');
                if (res.ok) {
                    const data = await res.json();
                    // Extract stats from the API response
                    const jobs = data.data || [];
                    const meta = data.meta || {};
                    setStats({
                        totalJobs: meta.total || jobs.length || 0,
                        scheduledJobs: meta.scheduledCount || 0,
                        inProgressJobs: meta.inProgressCount || 0,
                        completedJobs: meta.completedCount || 0,
                        todayJobs: meta.todayCount || 0,
                    });
                }
            } catch {
                // Stats are non-critical; show page without them
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    const statCards = stats
        ? [
            {
                label: t('field.stats.total') || 'Total Pekerjaan',
                value: stats.totalJobs,
                icon: Wrench,
                color: 'bg-blue-500',
            },
            {
                label: t('field.stats.scheduled') || 'Terjadwal',
                value: stats.scheduledJobs,
                icon: Calendar,
                color: 'bg-indigo-500',
            },
            {
                label: t('field.stats.inProgress') || 'Sedang Dikerjakan',
                value: stats.inProgressJobs,
                icon: Navigation,
                color: 'bg-orange-500',
            },
            {
                label: t('field.stats.completed') || 'Selesai',
                value: stats.completedJobs,
                icon: CheckCircle2,
                color: 'bg-green-500',
            },
            {
                label: t('field.stats.today') || 'Hari Ini',
                value: stats.todayJobs,
                icon: Clock,
                color: 'bg-yellow-500',
            },
        ]
        : [];

    const subPages = [
        {
            title: t('nav.fieldJobs') || 'Field Jobs',
            description: t('field.description.jobs') || 'Kelola pekerjaan lapangan, jadwal teknisi, dan status progres.',
            href: '/dashboard/field/jobs',
            icon: Wrench,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
            title: t('nav.fieldChecklists') || 'Checklists',
            description: t('field.description.checklists') || 'Kelola template checklist untuk inspeksi dan instalasi lapangan.',
            href: '/dashboard/field/checklists',
            icon: ClipboardList,
            color: 'text-green-600 dark:text-green-400',
            bg: 'bg-green-50 dark:bg-green-900/20',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {t('nav.fieldService') || 'Field Service'}
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('field.subtitle') || 'Manajemen pekerjaan lapangan dan operasi teknisi'}
                </p>
            </div>

            {/* Stats Cards */}
            {loading ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div
                            key={i}
                            className="animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="mt-2 h-8 w-12 rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    ))}
                </div>
            ) : stats ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {statCards.map((card) => (
                        <div
                            key={card.label}
                            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`rounded-lg p-2 ${card.color} text-white`}>
                                    <card.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {card.label}
                                    </p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                                        {card.value}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}

            {/* Sub-page Navigation */}
            <div>
                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                    {t('field.modules') || 'Modul'}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    {subPages.map((page) => (
                        <Link
                            key={page.href}
                            href={page.href}
                            className={`group flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-750`}
                        >
                            <div className={`rounded-lg p-3 ${page.bg}`}>
                                <page.icon className={`h-6 w-6 ${page.color}`} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                                    {page.title}
                                </h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {page.description}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
