'use client';

/**
 * Project Timeline Component — Overview timeline untuk project milestones
 *
 * Features:
 * - Project start/end dates
 * - Key milestones (tasks with dates)
 * - Current date marker
 * - Progress bar
 * - Responsive design
 */

import { useMemo } from 'react';
import { Calendar, Flag, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface TimelineTask {
    id: string;
    title: string;
    status: string;
    priority: string;
    startDate: string | null;
    endDate: string | null;
    dueDate: string | null;
    progress: number;
}

export interface TimelineData {
    project: {
        id: string;
        name: string;
        startDate: string | null;
        endDate: string | null;
        progress: number;
    };
    tasks: TimelineTask[];
}

// =============================================================================
// Constants
// =============================================================================

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
    DONE: CheckCircle2,
    IN_PROGRESS: Clock,
    CANCELLED: Clock,
};

const STATUS_COLORS: Record<string, string> = {
    TODO: 'border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800',
    IN_PROGRESS: 'border-blue-500 bg-blue-100 dark:border-blue-400 dark:bg-blue-900/30',
    IN_REVIEW: 'border-yellow-500 bg-yellow-100 dark:border-yellow-400 dark:bg-yellow-900/30',
    DONE: 'border-green-500 bg-green-100 dark:border-green-400 dark:bg-green-900/30',
    CANCELLED: 'border-red-400 bg-red-100 dark:border-red-400 dark:bg-red-900/30',
};

const STATUS_TEXT_COLORS: Record<string, string> = {
    TODO: 'text-gray-600 dark:text-gray-400',
    IN_PROGRESS: 'text-blue-600 dark:text-blue-400',
    IN_REVIEW: 'text-yellow-600 dark:text-yellow-400',
    DONE: 'text-green-600 dark:text-green-400',
    CANCELLED: 'text-red-500 dark:text-red-400',
};

const PRIORITY_COLORS: Record<string, string> = {
    LOW: 'bg-gray-400',
    MEDIUM: 'bg-blue-400',
    HIGH: 'bg-orange-400',
    URGENT: 'bg-red-500',
};

// =============================================================================
// Helper Functions
// =============================================================================

function formatDateShort(date: Date): string {
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function formatDateRelative(date: Date): string {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays < 0) return `${Math.abs(diffDays)} hari lalu`;
    if (diffDays === 0) return 'Hari ini';
    if (diffDays === 1) return 'Besok';
    return `${diffDays} hari lagi`;
}

// =============================================================================
// Main Component
// =============================================================================

interface ProjectTimelineProps {
    data: TimelineData | null;
    loading?: boolean;
}

export function ProjectTimeline({ data, loading }: ProjectTimelineProps) {
    // Sort tasks by date
    const sortedTasks = useMemo(() => {
        if (!data) return [];
        return [...data.tasks]
            .filter((t) => t.startDate || t.dueDate || t.endDate)
            .sort((a, b) => {
                const dateA = new Date(a.startDate || a.dueDate || a.endDate || 0);
                const dateB = new Date(b.startDate || b.dueDate || b.endDate || 0);
                return dateA.getTime() - dateB.getTime();
            });
    }, [data]);

    // Calculate timeline stats
    const stats = useMemo(() => {
        if (!data) return { totalDays: 0, elapsedDays: 0, percentElapsed: 0 };

        const start = data.project.startDate ? new Date(data.project.startDate) : new Date();
        const end = data.project.endDate ? new Date(data.project.endDate) : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);
        const now = new Date();

        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
        const elapsedDays = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
        const percentElapsed = totalDays > 0 ? Math.min(Math.round((elapsedDays / totalDays) * 100), 100) : 0;

        return { totalDays, elapsedDays, percentElapsed };
    }, [data]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                <div className="h-32 w-full bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
            </div>
        );
    }

    if (!data) return null;

    const hasDates = data.project.startDate || data.project.endDate;

    return (
        <div className="space-y-6">
            {/* Project Timeline Header */}
            {hasDates && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Timeline Proyek</h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{stats.totalDays} hari total</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                        {data.project.startDate && (
                            <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>Mulai: {formatDateShort(new Date(data.project.startDate))}</span>
                            </div>
                        )}
                        {data.project.endDate && (
                            <div className="flex items-center gap-1">
                                <Flag className="h-3 w-3" />
                                <span>Selesai: {formatDateShort(new Date(data.project.endDate))}</span>
                            </div>
                        )}
                    </div>

                    {/* Timeline bar */}
                    <div className="relative">
                        <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                            {/* Elapsed time */}
                            <div
                                className="absolute left-0 top-0 h-3 rounded-full bg-blue-200 dark:bg-blue-900/50"
                                style={{ width: `${stats.percentElapsed}%` }}
                            />
                            {/* Progress */}
                            <div
                                className="absolute left-0 top-0 h-3 rounded-full bg-blue-500"
                                style={{ width: `${data.project.progress}%` }}
                            />
                        </div>
                        {/* Today marker */}
                        {stats.percentElapsed > 0 && stats.percentElapsed < 100 && (
                            <div
                                className="absolute -top-1 h-5 w-0.5 bg-red-500"
                                style={{ left: `${stats.percentElapsed}%` }}
                                title="Hari ini"
                            />
                        )}
                    </div>

                    <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                        <span>Progres: {data.project.progress}%</span>
                        <span>Hari ke-{stats.elapsedDays} dari {stats.totalDays}</span>
                    </div>
                </div>
            )}

            {/* Task Timeline */}
            {sortedTasks.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Milestone Tasks</h3>

                    <div className="relative">
                        {/* Vertical line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

                        <div className="space-y-4">
                            {sortedTasks.map((task) => {
                                const Icon = STATUS_ICONS[task.status] || Clock;
                                const colorClass = STATUS_COLORS[task.status] || STATUS_COLORS.TODO;
                                const textColor = STATUS_TEXT_COLORS[task.status] || STATUS_TEXT_COLORS.TODO;
                                const taskDate = task.startDate || task.dueDate || task.endDate;
                                const date = taskDate ? new Date(taskDate) : null;

                                return (
                                    <div key={task.id} className="relative flex items-start gap-4 pl-0">
                                        {/* Icon */}
                                        <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${colorClass}`}>
                                            <Icon className={`h-4 w-4 ${textColor}`} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 pb-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                            {task.title}
                                                        </p>
                                                        {task.priority && (
                                                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_COLORS[task.priority]}`} />
                                                        )}
                                                    </div>
                                                    {date && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                            {formatDateShort(date)} ({formatDateRelative(date)})
                                                        </p>
                                                    )}
                                                </div>
                                                {task.progress > 0 && (
                                                    <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                                                        {task.progress}%
                                                    </span>
                                                )}
                                            </div>
                                            {task.progress > 0 && task.status !== 'DONE' && (
                                                <div className="mt-1 h-1 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                                                    <div
                                                        className="h-1 rounded-full bg-blue-500"
                                                        style={{ width: `${task.progress}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {sortedTasks.length === 0 && !hasDates && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800">
                    <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Belum ada timeline</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Atur tanggal mulai/selesai proyek untuk melihat timeline</p>
                </div>
            )}
        </div>
    );
}
