'use client';

/**
 * My Tasks Page — Cross-project task view untuk user yang login
 *
 * Filter tabs: All, Due Today, Overdue, Completed
 * Group by: None, Project, Status, Priority
 * Sort by: Due date, Priority, Created
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    CheckSquare,
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle2,
    Filter,
    ArrowUpDown,
    ChevronDown,
    FolderKanban,
    Tag,
    ArrowRight,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useProjects, type Task } from '@/hooks/use-projects';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';

// =============================================================================
// Constants
// =============================================================================

type FilterTab = 'ALL' | 'TODAY' | 'OVERDUE' | 'COMPLETED';
type GroupBy = 'none' | 'project' | 'status' | 'priority';
type SortBy = 'dueDate' | 'priority' | 'created';

const FILTER_TABS: { key: FilterTab; label: string; icon: typeof CheckSquare }[] = [
    { key: 'ALL', label: 'Semua', icon: CheckSquare },
    { key: 'TODAY', label: 'Jatuh Tempo Hari Ini', icon: Calendar },
    { key: 'OVERDUE', label: 'Terlambat', icon: AlertCircle },
    { key: 'COMPLETED', label: 'Selesai', icon: CheckCircle2 },
];

const STATUS_COLORS: Record<string, string> = {
    TODO: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    IN_REVIEW: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    DONE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
    TODO: 'To Do',
    IN_PROGRESS: 'Dikerjakan',
    IN_REVIEW: 'Review',
    DONE: 'Selesai',
    CANCELLED: 'Dibatalkan',
};

const PRIORITY_COLORS: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    MEDIUM: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    HIGH: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    URGENT: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

const PRIORITY_LABELS: Record<string, string> = {
    LOW: 'Rendah',
    MEDIUM: 'Sedang',
    HIGH: 'Tinggi',
    URGENT: 'Mendesak',
};

const PRIORITY_ORDER: Record<string, number> = {
    URGENT: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
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

function TaskRow({ task, router }: { task: Task; router: ReturnType<typeof useRouter> }) {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

    return (
        <div
            className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600 cursor-pointer"
            onClick={() => router.push(`/dashboard/projects/${task.projectId}`)}
        >
            {/* Status indicator */}
            <div className="flex-shrink-0">
                {task.status === 'DONE' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
            </div>

            {/* Task info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium ${task.status === 'DONE' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                        {task.title}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                        <FolderKanban className="h-3 w-3" />
                        {task.projectName}
                    </span>
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                </div>
            </div>

            {/* Due date */}
            <div className="flex-shrink-0 text-right">
                {task.dueDate ? (
                    <div className={`text-xs ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(task.dueDate)}
                        </div>
                        {isOverdue && <span className="text-red-500">Terlambat</span>}
                    </div>
                ) : (
                    <span className="text-xs text-gray-400">-</span>
                )}
            </div>

            {/* Time logged */}
            <div className="flex-shrink-0 text-right">
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="h-3 w-3" />
                    {task.actualHours}h
                </div>
            </div>

            {/* Arrow */}
            <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
        </div>
    );
}

// =============================================================================
// Main Component
// =============================================================================

export default function MyTasksPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { tasks, loading, error, fetchTasks } = useProjects();

    const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
    const [groupBy, setGroupBy] = useState<GroupBy>('none');
    const [sortBy, setSortBy] = useState<SortBy>('dueDate');

    // Fetch all tasks for current user
    useEffect(() => {
        void fetchTasks({ limit: 200 });
    }, [fetchTasks]);

    // Filter tasks
    const filteredTasks = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return tasks.filter((task) => {
            switch (activeFilter) {
                case 'TODAY':
                    if (!task.dueDate) return false;
                    const dueDate = new Date(task.dueDate);
                    return dueDate >= today && dueDate < tomorrow;
                case 'OVERDUE':
                    return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
                case 'COMPLETED':
                    return task.status === 'DONE';
                default:
                    return true;
            }
        });
    }, [tasks, activeFilter]);

    // Sort tasks
    const sortedTasks = useMemo(() => {
        return [...filteredTasks].sort((a, b) => {
            switch (sortBy) {
                case 'dueDate':
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                case 'priority':
                    return (PRIORITY_ORDER[a.priority] || 99) - (PRIORITY_ORDER[b.priority] || 99);
                case 'created':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                default:
                    return 0;
            }
        });
    }, [filteredTasks, sortBy]);

    // Group tasks
    const groupedTasks = useMemo(() => {
        if (groupBy === 'none') return { 'Semua Task': sortedTasks };

        const groups: Record<string, Task[]> = {};
        sortedTasks.forEach((task) => {
            let key: string;
            switch (groupBy) {
                case 'project':
                    key = task.projectName;
                    break;
                case 'status':
                    key = STATUS_LABELS[task.status] || task.status;
                    break;
                case 'priority':
                    key = PRIORITY_LABELS[task.priority] || task.priority;
                    break;
                default:
                    key = 'Semua';
            }
            if (!groups[key]) groups[key] = [];
            groups[key].push(task);
        });
        return groups;
    }, [sortedTasks, groupBy]);

    // Stats
    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return {
            total: tasks.length,
            dueToday: tasks.filter(t => t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) < tomorrow).length,
            overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE').length,
            completed: tasks.filter(t => t.status === 'DONE').length,
        };
    }, [tasks]);

    // Filter tab counts
    const filterCounts = useMemo(() => {
        return {
            ALL: tasks.length,
            TODAY: stats.dueToday,
            OVERDUE: stats.overdue,
            COMPLETED: stats.completed,
        };
    }, [tasks, stats]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                        <CheckSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Task Saya
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Semua task dari semua proyek
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800 overflow-x-auto">
                {FILTER_TABS.map((tab) => {
                    const isActive = activeFilter === tab.key;
                    const TabIcon = tab.icon;
                    const count = filterCounts[tab.key] || 0;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveFilter(tab.key)}
                            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${isActive
                                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            <TabIcon className="h-4 w-4" />
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

            {/* Group by + Sort controls */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                        <option value="none">Tanpa Pengelompokan</option>
                        <option value="project">Kelompok: Proyek</option>
                        <option value="status">Kelompok: Status</option>
                        <option value="priority">Kelompok: Prioritas</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-gray-400" />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortBy)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                        <option value="dueDate">Urutkan: Jatuh Tempo</option>
                        <option value="priority">Urutkan: Prioritas</option>
                        <option value="created">Urutkan: Dibuat</option>
                    </select>
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
            {loading && tasks.length === 0 && (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse dark:bg-gray-800" />
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!loading && sortedTasks.length === 0 && (
                <EmptyState
                    icon={CheckSquare}
                    title="Tidak ada task"
                    description={
                        activeFilter === 'ALL'
                            ? 'Anda belum memiliki task dari proyek manapun.'
                            : `Tidak ada task yang cocok dengan filter "${FILTER_TABS.find(t => t.key === activeFilter)?.label}".`
                    }
                />
            )}

            {/* Task groups */}
            {!loading && sortedTasks.length > 0 && (
                <div className="space-y-6">
                    {Object.entries(groupedTasks).map(([groupLabel, groupTasks]) => (
                        <div key={groupLabel}>
                            {groupBy !== 'none' && (
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                    {groupLabel} ({groupTasks.length})
                                </h3>
                            )}
                            <div className="space-y-2">
                                {groupTasks.map((task) => (
                                    <TaskRow key={task.id} task={task} router={router} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
