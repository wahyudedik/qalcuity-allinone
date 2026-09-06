'use client';

/**
 * Field Jobs List Page — Halaman utama daftar pekerjaan lapangan.
 * Grid card layout dengan filter tabs, search, dan status badges.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Wrench,
    Plus,
    Search,
    Calendar,
    MapPin,
    Filter,
    X,
} from 'lucide-react';
import { FieldJobCard, FieldJobCardSkeleton, type FieldJob } from '@/components/field/field-job-card';
import { EmptyState } from '@/components/ui/empty-state';
import { useTranslation } from '@/lib/i18n';

// =============================================================================
// Main Component
// =============================================================================

export default function FieldJobsPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [jobs, setJobs] = useState<FieldJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('ALL');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const STATUS_TABS = [
        { key: 'ALL', label: t('field.jobs.status.ALL') },
        { key: 'SCHEDULED', label: t('field.jobs.status.SCHEDULED') },
        { key: 'EN_ROUTE', label: t('field.jobs.status.EN_ROUTE') },
        { key: 'IN_PROGRESS', label: t('field.jobs.status.IN_PROGRESS') },
        { key: 'COMPLETED', label: t('field.jobs.status.COMPLETED') },
    ] as const;

    const fetchJobs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (filter !== 'ALL') params.set('status', filter);
            if (search) params.set('search', search);
            params.set('page', String(page));
            params.set('limit', '12');

            const res = await fetch(`/api/field/jobs?${params.toString()}`);
            const data = await res.json();

            if (data.success) {
                setJobs(data.data);
                setTotalPages(data.totalPages);
                setTotal(data.total);
            } else {
                setError(data.error || t('field.jobs.errorLoad'));
            }
        } catch {
            setError(t('field.jobs.errorGeneric'));
        } finally {
            setLoading(false);
        }
    }, [filter, search, page, t]);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    return (
        <div className="space-y-6 p-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${toast.type === 'success'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t('field.jobs.title')}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('field.jobs.subtitle').replace('{total}', String(total))}
                    </p>
                </div>
                <button
                    onClick={() => router.push('/dashboard/field/jobs/new')}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800"
                >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('field.jobs.createJob')}</span>
                </button>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => { setFilter(tab.key); setPage(1); }}
                        className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${filter === tab.key
                            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder={t('field.jobs.searchPlaceholder')}
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                />
                {search && (
                    <button
                        onClick={() => setSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <FieldJobCardSkeleton key={i} />
                    ))}
                </div>
            ) : jobs.length === 0 ? (
                <EmptyState
                    icon={Wrench}
                    title={t('field.jobs.emptyTitle')}
                    description={t('field.jobs.emptyDescription')}
                    actionLabel={t('field.jobs.createJob')}
                    onAction={() => router.push('/dashboard/field/jobs/new')}
                />
            ) : (
                <>
                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {jobs.map((job) => (
                            <FieldJobCard key={job.id} job={job} />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                            >
                                {t('field.jobs.pagination.previous')}
                            </button>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {t('field.jobs.pagination.pageInfo')
                                    .replace('{page}', String(page))
                                    .replace('{totalPages}', String(totalPages))}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                            >
                                {t('field.jobs.pagination.next')}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
