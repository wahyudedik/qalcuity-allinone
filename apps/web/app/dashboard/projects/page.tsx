'use client';

/**
 * Project List Page — Halaman utama daftar proyek
 *
 * Grid card layout dengan filter tabs, search, dan status badges.
 * Follows pattern dari kitchen/page.tsx dan terminal/page.tsx.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    FolderKanban,
    Plus,
    Search,
    Calendar,
    DollarSign,
    Users,
    CheckCircle2,
    Clock,
    AlertCircle,
    BarChart3,
} from 'lucide-react';
import { useProjects, type Project, type ProjectStatus } from '@/hooks/use-projects';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency } from '@/lib/utils';

// =============================================================================
// Constants
// =============================================================================

const STATUS_TABS: { key: ProjectStatus | 'ALL'; label: string }[] = [
    { key: 'ALL', label: 'Semua' },
    { key: 'ACTIVE', label: 'Aktif' },
    { key: 'PLANNING', label: 'Perencanaan' },
    { key: 'COMPLETED', label: 'Selesai' },
];

const STATUS_COLORS: Record<string, string> = {
    PLANNING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    ON_HOLD: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    COMPLETED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const PRIORITY_COLORS: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    MEDIUM: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    HIGH: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    URGENT: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
    PLANNING: 'Perencanaan',
    ACTIVE: 'Aktif',
    ON_HOLD: 'Ditangguhkan',
    COMPLETED: 'Selesai',
    CANCELLED: 'Dibatalkan',
};

const PRIORITY_LABELS: Record<string, string> = {
    LOW: 'Rendah',
    MEDIUM: 'Sedang',
    HIGH: 'Tinggi',
    URGENT: 'Mendesak',
};

// =============================================================================
// Sub-components
// =============================================================================

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABELS[status] || status}
        </span>
    );
}

function PriorityBadge({ priority }: { priority: string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_COLORS[priority] || 'bg-gray-100 text-gray-600'}`}>
            {PRIORITY_LABELS[priority] || priority}
        </span>
    );
}

function ProgressBar({ value }: { value: number }) {
    return (
        <div className="w-full">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Progres</span>
                <span>{value}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                    className="h-2 rounded-full bg-blue-600 transition-all"
                    style={{ width: `${Math.min(value, 100)}%` }}
                />
            </div>
        </div>
    );
}

function ProjectCard({ project }: { project: Project }) {
    const router = useRouter();

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div
            onClick={() => router.push(`/dashboard/projects/${project.id}`)}
            className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
        >
            {/* Header: Name + Status */}
            <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">
                    {project.name}
                </h3>
                <StatusBadge status={project.status} />
            </div>

            {/* Priority */}
            <div className="mb-3">
                <PriorityBadge priority={project.priority} />
            </div>

            {/* Progress */}
            <div className="mb-3">
                <ProgressBar value={project.progress} />
            </div>

            {/* Budget */}
            {project.budget !== null && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>{formatCurrency(project.spent)} / {formatCurrency(project.budget)}</span>
                </div>
            )}

            {/* Task Count */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{project.taskCount} task</span>
            </div>

            {/* Members */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3">
                <Users className="h-3.5 w-3.5" />
                <span>{project.memberCount} anggota</span>
            </div>

            {/* Dates */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-3">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(project.startDate)} → {formatDate(project.endDate)}</span>
            </div>
        </div>
    );
}

function ProjectCardSkeleton() {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start justify-between mb-3">
                <div className="h-5 w-32 bg-gray-200 rounded dark:bg-gray-700" />
                <div className="h-5 w-16 bg-gray-200 rounded-full dark:bg-gray-700" />
            </div>
            <div className="h-5 w-14 bg-gray-200 rounded-full mb-3 dark:bg-gray-700" />
            <div className="h-2 w-full bg-gray-200 rounded-full mb-3 dark:bg-gray-700" />
            <div className="h-3 w-40 bg-gray-200 rounded mb-2 dark:bg-gray-700" />
            <div className="h-3 w-24 bg-gray-200 rounded mb-2 dark:bg-gray-700" />
            <div className="h-3 w-20 bg-gray-200 rounded mb-3 dark:bg-gray-700" />
            <div className="h-3 w-48 bg-gray-200 rounded border-t border-gray-100 pt-3 dark:bg-gray-700" />
        </div>
    );
}

// =============================================================================
// Main Component
// =============================================================================

export default function ProjectsPage() {
    const router = useRouter();
    const {
        projects,
        loading,
        error,
        filter,
        setFilter,
        fetchProjects,
    } = useProjects();

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Fetch projects on mount and filter change
    useEffect(() => {
        void fetchProjects();
    }, [fetchProjects]);

    // Status counts
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { ALL: projects.length };
        projects.forEach((p) => {
            counts[p.status] = (counts[p.status] || 0) + 1;
        });
        return counts;
    }, [projects]);

    // Filtered projects
    const filteredProjects = useMemo(() => {
        if (filter.status === 'ALL') return projects;
        return projects.filter((p) => p.status === filter.status);
    }, [projects, filter.status]);

    return (
        <div className="space-y-6">
            {/* Toast notification */}
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                        }`}
                >
                    {toast.type === 'success' ? (
                        <CheckCircle2 className="h-4 w-4" />
                    ) : (
                        <AlertCircle className="h-4 w-4" />
                    )}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                        <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Proyek
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Kelola semua proyek tim Anda
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => router.push('/dashboard/projects/new')}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    <Plus className="h-4 w-4" />
                    Proyek Baru
                </button>
            </div>

            {/* Filter Tabs + Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Status tabs */}
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                    {STATUS_TABS.map((tab) => {
                        const isActive = filter.status === tab.key;
                        const count = tab.key === 'ALL' ? projects.length : (statusCounts[tab.key] || 0);
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setFilter({ ...filter, status: tab.key })}
                                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive
                                        ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                            >
                                <span>{tab.label}</span>
                                {count > 0 && (
                                    <span
                                        className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold ${isActive
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                                : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                            }`}
                                    >
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari proyek..."
                        value={filter.search}
                        onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                    />
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                </div>
            )}

            {/* Loading state */}
            {loading && projects.length === 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <ProjectCardSkeleton key={i} />
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!loading && filteredProjects.length === 0 && (
                <EmptyState
                    icon={FolderKanban}
                    title="Belum ada proyek"
                    description="Mulai buat proyek pertama untuk mengelola tugas dan waktu tim Anda."
                    actionLabel="Buat Proyek"
                    onAction={() => router.push('/dashboard/projects/new')}
                />
            )}

            {/* Project grid */}
            {!loading && filteredProjects.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredProjects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            )}
        </div>
    );
}
