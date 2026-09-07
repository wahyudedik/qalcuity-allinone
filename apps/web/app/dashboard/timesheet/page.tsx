'use client';

/**
 * Timesheet Page — Timesheet view untuk tracking waktu
 *
 * Date range selector (week/month), summary cards,
 * timesheet grid (rows: projects/tasks, columns: Mon-Sun).
 */

import { useState, useEffect, useMemo } from 'react';
import {
    Clock,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Download,
    Plus,
    AlertCircle,
    CheckCircle2,
    Briefcase,
} from 'lucide-react';
import { useProjects, type TimesheetData, type TimeLogEntry } from '@/hooks/use-projects';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';

// =============================================================================
// Constants
// =============================================================================

type ViewMode = 'weekly' | 'monthly';

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const DAY_NAMES_FULL = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

// =============================================================================
// Helpers
// =============================================================================

function getWeekRange(date: Date): { start: Date; end: Date } {
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const start = new Date(d);
    start.setDate(d.getDate() + mondayOffset);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

function getMonthRange(date: Date): { start: Date; end: Date } {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start, end };
}

function formatDateShort(date: Date): string {
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatDateFull(date: Date): string {
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getDaysInRange(start: Date, end: Date): Date[] {
    const days: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return days;
}

function getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
}

// =============================================================================
// Sub-components
// =============================================================================

function SummaryCard({ icon: Icon, label, value, color }: { icon: typeof Clock; label: string; value: string | number; color: string }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
            </div>
        </div>
    );
}

function TimesheetGrid({
    timesheet,
    days,
    viewMode,
}: {
    timesheet: TimesheetData;
    days: Date[];
    viewMode: ViewMode;
}) {
    // Build grid data: project -> date -> hours
    const gridData = useMemo(() => {
        const grid: Record<string, Record<string, number>> = {};
        const projectNames: Record<string, string> = {};

        for (const emp of timesheet.employees) {
            for (const entry of emp.entries) {
                const dateKey = getDateKey(new Date(entry.date));
                if (!grid[entry.projectId]) {
                    grid[entry.projectId] = {};
                    projectNames[entry.projectId] = entry.projectName;
                }
                grid[entry.projectId][dateKey] = (grid[entry.projectId][dateKey] || 0) + entry.hours;
            }
        }

        return { grid, projectNames };
    }, [timesheet]);

    // Column totals
    const columnTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        for (const day of days) {
            const key = getDateKey(day);
            totals[key] = 0;
            for (const projectId of Object.keys(gridData.grid)) {
                totals[key] += gridData.grid[projectId][key] || 0;
            }
        }
        return totals;
    }, [gridData, days]);

    // Row totals
    const rowTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        for (const projectId of Object.keys(gridData.grid)) {
            totals[projectId] = 0;
            for (const day of days) {
                totals[projectId] += gridData.grid[projectId][getDateKey(day)] || 0;
            }
        }
        return totals;
    }, [gridData, days]);

    const projectIds = Object.keys(gridData.grid);

    if (projectIds.length === 0) {
        return (
            <EmptyState
                icon={Clock}
                title="Belum ada data timesheet"
                description="Mulai catat waktu pada task untuk melihat data di sini."
            />
        );
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-gray-700 dark:bg-gray-800">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 min-w-[200px]">
                                Proyek / Task
                            </th>
                            {days.map((day, i) => {
                                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                return (
                                    <th
                                        key={i}
                                        className={`px-3 py-3 text-center text-xs font-semibold min-w-[80px] ${isWeekend
                                            ? 'text-gray-400 bg-gray-100 dark:text-gray-500 dark:bg-gray-700'
                                            : 'text-gray-600 dark:text-gray-400'
                                            }`}
                                    >
                                        <div>{viewMode === 'weekly' ? DAY_NAMES[i] : day.getDate()}</div>
                                        <div className="font-normal text-[10px]">{formatDateShort(day)}</div>
                                    </th>
                                );
                            })}
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 min-w-[80px]">
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {projectIds.map((projectId) => (
                            <tr key={projectId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                        <span className="font-medium text-gray-900 dark:text-white text-sm">
                                            {gridData.projectNames[projectId]}
                                        </span>
                                    </div>
                                </td>
                                {days.map((day, i) => {
                                    const dateKey = getDateKey(day);
                                    const hours = gridData.grid[projectId][dateKey] || 0;
                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                    return (
                                        <td
                                            key={i}
                                            className={`px-3 py-3 text-center text-sm ${isWeekend ? 'bg-gray-50 dark:bg-gray-700/50' : ''
                                                }`}
                                        >
                                            {hours > 0 ? (
                                                <span className="inline-flex items-center justify-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                    {hours}h
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 dark:text-gray-600">-</span>
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-3 text-center">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                        {rowTotals[projectId]}h
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {/* Total row */}
                        <tr className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 font-semibold">
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Total</td>
                            {days.map((day, i) => {
                                const dateKey = getDateKey(day);
                                const total = columnTotals[dateKey];
                                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                return (
                                    <td
                                        key={i}
                                        className={`px-3 py-3 text-center text-sm ${isWeekend ? 'bg-gray-100 dark:bg-gray-700' : ''
                                            }`}
                                    >
                                        <span className="text-gray-900 dark:text-white">
                                            {total > 0 ? `${total}h` : '-'}
                                        </span>
                                    </td>
                                );
                            })}
                            <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 dark:text-white">
                                {timesheet.grandTotal}h
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// =============================================================================
// Main Component
// =============================================================================

export default function TimesheetPage() {
    const { timesheet, loading, error, fetchTimesheet } = useProjects();
    const { addToast } = useToast();
    const [viewMode, setViewMode] = useState<ViewMode>('weekly');
    const [currentDate, setCurrentDate] = useState(new Date());

    // Calculate date range
    const dateRange = useMemo(() => {
        return viewMode === 'weekly' ? getWeekRange(currentDate) : getMonthRange(currentDate);
    }, [viewMode, currentDate]);

    const days = useMemo(() => {
        return getDaysInRange(dateRange.start, dateRange.end);
    }, [dateRange]);

    // Fetch timesheet when date range changes
    useEffect(() => {
        void fetchTimesheet({
            startDate: dateRange.start.toISOString().split('T')[0],
            endDate: dateRange.end.toISOString().split('T')[0],
            view: viewMode,
        });
    }, [fetchTimesheet, dateRange.start, dateRange.end, viewMode]);

    // Navigation
    const goBack = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'weekly') {
            newDate.setDate(newDate.getDate() - 7);
        } else {
            newDate.setMonth(newDate.getMonth() - 1);
        }
        setCurrentDate(newDate);
    };

    const goForward = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'weekly') {
            newDate.setDate(newDate.getDate() + 7);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setCurrentDate(newDate);
    };

    const goToday = () => setCurrentDate(new Date());

    // Date range label
    const dateRangeLabel = useMemo(() => {
        if (viewMode === 'weekly') {
            return `${formatDateFull(dateRange.start)} — ${formatDateFull(dateRange.end)}`;
        }
        return currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }, [viewMode, dateRange, currentDate]);

    // Project breakdown for summary
    const projectBreakdown = useMemo(() => {
        if (!timesheet) return [];
        const breakdown: Record<string, number> = {};
        for (const emp of timesheet.employees) {
            for (const entry of emp.entries) {
                breakdown[entry.projectName] = (breakdown[entry.projectName] || 0) + entry.hours;
            }
        }
        return Object.entries(breakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([name, hours]) => ({ name, hours }));
    }, [timesheet]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-900/30">
                        <Clock className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Timesheet
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Lacak waktu kerja tim
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => addToast('Fitur export akan segera hadir', 'info')}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                    <Download className="h-4 w-4" />
                    Export
                </button>
            </div>

            {/* View mode + Date navigation */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* View mode toggle */}
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                    {(['weekly', 'monthly'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${viewMode === mode
                                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            {mode === 'weekly' ? 'Mingguan' : 'Bulanan'}
                        </button>
                    ))}
                </div>

                {/* Date navigation */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={goBack}
                        className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[250px] text-center">
                        {dateRangeLabel}
                    </span>
                    <button
                        onClick={goForward}
                        className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                        onClick={goToday}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                        Hari Ini
                    </button>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard
                    icon={Clock}
                    label="Total Jam"
                    value={`${timesheet?.grandTotal || 0}h`}
                    color="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
                />
                <SummaryCard
                    icon={Briefcase}
                    label="Proyek Aktif"
                    value={projectBreakdown.length}
                    color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                />
                <SummaryCard
                    icon={Calendar}
                    label={viewMode === 'weekly' ? 'Jam/Hari' : 'Jam/Hari'}
                    value={
                        timesheet && days.length > 0
                            ? `${(timesheet.grandTotal / days.length).toFixed(1)}h`
                            : '0h'
                    }
                    color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                />
                <SummaryCard
                    icon={CheckCircle2}
                    label="Hari Terisi"
                    value={
                        timesheet
                            ? `${new Set(
                                timesheet.employees.flatMap(e =>
                                    e.entries.map(en => getDateKey(new Date(en.date)))
                                )
                            ).size}/${days.length}`
                            : `0/${days.length}`
                    }
                    color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                />
            </div>

            {/* Project breakdown */}
            {projectBreakdown.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        Breakdown per Proyek
                    </h3>
                    <div className="space-y-2">
                        {projectBreakdown.map((item) => {
                            const percent = timesheet ? Math.round((item.hours / timesheet.grandTotal) * 100) : 0;
                            return (
                                <div key={item.name} className="flex items-center gap-3">
                                    <span className="text-sm text-gray-700 dark:text-gray-300 min-w-[150px] truncate">
                                        {item.name}
                                    </span>
                                    <div className="flex-1">
                                        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                                            <div
                                                className="h-2 rounded-full bg-blue-600"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[50px] text-right">
                                        {item.hours}h
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

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
            {loading && !timesheet && (
                <div className="h-96 rounded-xl bg-gray-100 animate-pulse dark:bg-gray-800" />
            )}

            {/* Timesheet grid */}
            {!loading && timesheet && (
                <TimesheetGrid
                    timesheet={timesheet}
                    days={days}
                    viewMode={viewMode}
                />
            )}
        </div>
    );
}
