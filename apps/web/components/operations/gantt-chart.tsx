'use client';

/**
 * Gantt Chart Component — Timeline visualization untuk project tasks
 *
 * Features:
 * - Timeline view dengan task bars
 * - Task dependencies (arrows)
 * - Progress indicators
 * - Responsive: mobile fallback ke list view
 * - Uses only Tailwind CSS (no external chart library)
 */

import { useMemo } from 'react';
import { Calendar, ArrowRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface GanttTask {
    id: string;
    title: string;
    status: string;
    priority: string;
    assigneeId: string | null;
    startDate: string | null;
    endDate: string | null;
    dueDate: string | null;
    progress: number;
    dependsOnId: string | null;
    estimatedHours: number | null;
    actualHours: number;
}

export interface GanttData {
    project: {
        id: string;
        name: string;
        startDate: string | null;
        endDate: string | null;
        progress: number;
    };
    tasks: GanttTask[];
    summary: {
        totalTasks: number;
        completedTasks: number;
        autoProgress: number;
    };
}

// =============================================================================
// Constants
// =============================================================================

const STATUS_COLORS: Record<string, { bar: string; text: string }> = {
    TODO: { bar: 'bg-gray-300 dark:bg-gray-600', text: 'text-gray-600 dark:text-gray-400' },
    IN_PROGRESS: { bar: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
    IN_REVIEW: { bar: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' },
    DONE: { bar: 'bg-green-500', text: 'text-green-600 dark:text-green-400' },
    CANCELLED: { bar: 'bg-red-400', text: 'text-red-500 dark:text-red-400' },
};

const PRIORITY_DOTS: Record<string, string> = {
    LOW: 'bg-gray-400',
    MEDIUM: 'bg-blue-400',
    HIGH: 'bg-orange-400',
    URGENT: 'bg-red-500',
};

// =============================================================================
// Helper Functions
// =============================================================================

function getTaskStart(task: GanttTask): Date {
    if (task.startDate) return new Date(task.startDate);
    if (task.dueDate) return new Date(task.dueDate);
    return new Date();
}

function getTaskEnd(task: GanttTask): Date {
    if (task.endDate) return new Date(task.endDate);
    if (task.dueDate) return new Date(task.dueDate);
    const start = getTaskStart(task);
    return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
}

function formatShortDate(date: Date): string {
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date);
}

function formatDayLabel(date: Date): string {
    return new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}

// =============================================================================
// Sub-components
// =============================================================================

function StatusIcon({ status }: { status: string }) {
    switch (status) {
        case 'DONE':
            return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case 'IN_PROGRESS':
            return <Clock className="h-4 w-4 text-blue-500" />;
        case 'CANCELLED':
            return <AlertCircle className="h-4 w-4 text-red-400" />;
        default:
            return <div className="h-3 w-3 rounded-full border-2 border-gray-300 dark:border-gray-600" />;
    }
}

function DependencyArrow() {
    return (
        <div className="flex items-center text-gray-400 dark:text-gray-500" title="Memiliki dependency">
            <ArrowRight className="h-3 w-3" />
        </div>
    );
}

// =============================================================================
// Desktop Gantt View
// =============================================================================

function DesktopGanttView({ tasks, projectStart, totalDays, dayWidth }: {
    tasks: GanttTask[];
    projectStart: Date;
    totalDays: number;
    dayWidth: number;
}) {
    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            {/* Timeline header */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <div className="w-64 min-w-[256px] shrink-0 border-r border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    Task
                </div>
                <div className="flex min-w-0">
                    {Array.from({ length: totalDays }, (_, i) => {
                        const date = new Date(projectStart);
                        date.setDate(date.getDate() + i);
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        return (
                            <div
                                key={i}
                                className={`flex shrink-0 items-center justify-center border-r border-gray-100 text-[10px] dark:border-gray-700 ${isWeekend ? 'bg-gray-50 dark:bg-gray-900/50' : ''}`}
                                style={{ width: dayWidth }}
                            >
                                <span className="text-gray-400 dark:text-gray-500">{formatShortDate(date)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Task rows */}
            {tasks.map((task) => {
                const taskStart = getTaskStart(task);
                const taskEnd = getTaskEnd(task);
                const startOffset = Math.max(0, Math.round((taskStart.getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000)));
                const duration = Math.max(1, Math.round((taskEnd.getTime() - taskStart.getTime()) / (24 * 60 * 60 * 1000)));
                const colors = STATUS_COLORS[task.status] || STATUS_COLORS.TODO;

                return (
                    <div key={task.id} className="flex border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <div className="w-64 min-w-[256px] shrink-0 border-r border-gray-200 px-4 py-3 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <StatusIcon status={task.status} />
                                {task.dependsOnId && <DependencyArrow />}
                                <span className={`text-xs font-medium ${colors.text} truncate`}>
                                    {task.priority && (
                                        <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${PRIORITY_DOTS[task.priority]}`} />
                                    )}
                                    {task.title}
                                </span>
                            </div>
                        </div>
                        <div className="relative flex min-w-0" style={{ width: totalDays * dayWidth }}>
                            {/* Today marker */}
                            <div
                                className="absolute top-0 bottom-0 w-px bg-red-400 dark:bg-red-500"
                                style={{
                                    left: Math.round((new Date().getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000)) * dayWidth,
                                }}
                            />
                            {/* Task bar */}
                            <div
                                className="absolute top-2 flex items-center"
                                style={{
                                    left: startOffset * dayWidth,
                                    width: Math.max(duration * dayWidth - 4, 24),
                                }}
                            >
                                <div className={`relative h-5 w-full rounded ${colors.bar} overflow-hidden`}>
                                    {task.progress > 0 && task.status !== 'DONE' && (
                                        <div
                                            className="absolute left-0 top-0 h-full bg-white/30"
                                            style={{ width: `${task.progress}%` }}
                                        />
                                    )}
                                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white truncate px-1">
                                        {task.progress > 0 ? `${task.progress}%` : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// =============================================================================
// Mobile Gantt View (List-based)
// =============================================================================

function MobileGanttView({ tasks }: { tasks: GanttTask[] }) {
    return (
        <div className="space-y-3">
            {tasks.map((task) => {
                const colors = STATUS_COLORS[task.status] || STATUS_COLORS.TODO;
                return (
                    <div key={task.id} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <StatusIcon status={task.status} />
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {task.title}
                                </p>
                            </div>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${colors.text} bg-gray-100 dark:bg-gray-700`}>
                                {task.status}
                            </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                            {task.startDate && (
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatShortDate(new Date(task.startDate))}
                                    {task.endDate ? ` - ${formatShortDate(new Date(task.endDate))}` : ''}
                                </span>
                            )}
                            {task.progress > 0 && (
                                <span>{task.progress}% selesai</span>
                            )}
                        </div>
                        {task.progress > 0 && task.status !== 'DONE' && (
                            <div className="mt-2">
                                <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                                    <div
                                        className="h-1.5 rounded-full bg-blue-500 transition-all"
                                        style={{ width: `${task.progress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// =============================================================================
// Main Component
// =============================================================================

interface GanttChartProps {
    data: GanttData | null;
    loading?: boolean;
}

export function GanttChart({ data, loading }: GanttChartProps) {
    // Calculate timeline bounds
    const { projectStart, totalDays, dayWidth } = useMemo(() => {
        if (!data || data.tasks.length === 0) {
            const now = new Date();
            const start = new Date(now);
            start.setDate(start.getDate() - 7);
            return { projectStart: start, totalDays: 30, dayWidth: 40 };
        }

        const allDates: Date[] = [];
        data.tasks.forEach((t) => {
            allDates.push(getTaskStart(t));
            allDates.push(getTaskEnd(t));
        });

        if (data.project.startDate) allDates.push(new Date(data.project.startDate));
        if (data.project.endDate) allDates.push(new Date(data.project.endDate));

        const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
        const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

        // Add padding: 3 days before, 7 days after
        minDate.setDate(minDate.getDate() - 3);
        maxDate.setDate(maxDate.getDate() + 7);

        const days = Math.max(14, Math.ceil((maxDate.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000)));

        return { projectStart: minDate, totalDays: days, dayWidth: 40 };
    }, [data]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                <div className="h-64 w-full bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
            </div>
        );
    }

    if (!data || data.tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800">
                <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Belum ada task untuk ditampilkan</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Buat task terlebih dahulu untuk melihat Gantt chart</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>{data.summary.totalTasks} task</span>
                <span>{data.summary.completedTasks} selesai</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">Progres: {data.summary.autoProgress}%</span>
            </div>

            {/* Desktop view */}
            <div className="hidden md:block">
                <DesktopGanttView
                    tasks={data.tasks}
                    projectStart={projectStart}
                    totalDays={totalDays}
                    dayWidth={dayWidth}
                />
            </div>

            {/* Mobile view */}
            <div className="md:hidden">
                <MobileGanttView tasks={data.tasks} />
            </div>
        </div>
    );
}
