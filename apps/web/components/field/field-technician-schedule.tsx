'use client';

/**
 * FieldTechnicianSchedule — Tampilan jadwal harian/mingguan untuk technician.
 * Mobile-first design dengan navigasi tanggal dan kartu pekerjaan.
 */

import { useState, useMemo } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    Clock,
    MapPin,
    Wrench,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

// =============================================================================
// Types
// =============================================================================

interface ScheduleJob {
    id: string;
    title: string;
    scheduledDate: string;
    scheduledTime?: string | null;
    estimatedDuration?: number | null;
    status: string;
    priority: string;
    location?: string | null;
    assignmentCount: number;
}

interface FieldTechnicianScheduleProps {
    jobs: ScheduleJob[];
    employeeId?: string;
}

// =============================================================================
// Constants (non-i18n)
// =============================================================================

const STATUS_COLORS: Record<string, string> = {
    SCHEDULED: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20',
    EN_ROUTE: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    IN_PROGRESS: 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20',
    COMPLETED: 'border-l-green-500 bg-green-50 dark:bg-green-900/20',
    CANCELLED: 'border-l-red-500 bg-red-50 dark:bg-red-900/20',
};

const PRIORITY_DOT: Record<string, string> = {
    LOW: 'bg-gray-400',
    MEDIUM: 'bg-blue-500',
    HIGH: 'bg-orange-500',
    URGENT: 'bg-red-500',
};

// =============================================================================
// Helpers
// =============================================================================

function formatDateFull(date: Date): string {
    return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function formatDateShort(date: Date): string {
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
    });
}

function isSameDay(d1: Date, d2: Date): boolean {
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
}

function getWeekDays(centerDate: Date): Date[] {
    const days: Date[] = [];
    const start = new Date(centerDate);
    start.setDate(start.getDate() - 3); // 3 days before
    for (let i = 0; i < 7; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        days.push(day);
    }
    return days;
}

// =============================================================================
// Main Component
// =============================================================================

export function FieldTechnicianSchedule({ jobs, employeeId }: FieldTechnicianScheduleProps) {
    const { t } = useTranslation();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

    // i18n-driven status labels
    const STATUS_LABELS: Record<string, string> = {
        SCHEDULED: t('field.jobDetail.status.SCHEDULED'),
        EN_ROUTE: t('field.jobDetail.status.EN_ROUTE'),
        IN_PROGRESS: t('field.jobDetail.status.IN_PROGRESS'),
        COMPLETED: t('field.jobDetail.status.COMPLETED'),
        CANCELLED: t('field.jobDetail.status.CANCELLED'),
    };

    // Filter jobs for selected date
    const filteredJobs = useMemo(() => {
        return jobs
            .filter((job) => {
                const jobDate = new Date(job.scheduledDate);
                if (viewMode === 'day') {
                    return isSameDay(jobDate, selectedDate);
                }
                // Week view: show all jobs in the week
                const weekDays = getWeekDays(selectedDate);
                return weekDays.some((d) => isSameDay(jobDate, d));
            })
            .sort((a, b) => {
                // Sort by time, then by priority
                if (a.scheduledTime && b.scheduledTime) {
                    return a.scheduledTime.localeCompare(b.scheduledTime);
                }
                const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
            });
    }, [jobs, selectedDate, viewMode]);

    const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

    const goToPrevDay = () => {
        const prev = new Date(selectedDate);
        prev.setDate(prev.getDate() - 1);
        setSelectedDate(prev);
    };

    const goToNextDay = () => {
        const next = new Date(selectedDate);
        next.setDate(next.getDate() + 1);
        setSelectedDate(next);
    };

    const goToToday = () => {
        setSelectedDate(new Date());
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {t('field.components.technicianSchedule.title')}
                </h3>
                <div className="flex gap-1">
                    <button
                        onClick={() => setViewMode('day')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'day'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                            }`}
                    >
                        {t('field.components.technicianSchedule.day')}
                    </button>
                    <button
                        onClick={() => setViewMode('week')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'week'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                            }`}
                    >
                        {t('field.components.technicianSchedule.week')}
                    </button>
                </div>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center gap-2">
                <button
                    onClick={goToPrevDay}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                    onClick={goToToday}
                    className="flex-1 rounded-lg bg-white border border-gray-200 px-3 py-2 text-center text-sm font-medium text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700"
                >
                    {formatDateFull(selectedDate)}
                </button>
                <button
                    onClick={goToNextDay}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {/* Week View: Day pills */}
            {viewMode === 'week' && (
                <div className="flex gap-1 overflow-x-auto pb-1">
                    {weekDays.map((day) => {
                        const isSelected = isSameDay(day, selectedDate);
                        const isToday = isSameDay(day, new Date());
                        const dayJobCount = jobs.filter((j) =>
                            isSameDay(new Date(j.scheduledDate), day)
                        ).length;

                        return (
                            <button
                                key={day.toISOString()}
                                onClick={() => setSelectedDate(day)}
                                className={`flex flex-col items-center min-w-[3.5rem] rounded-lg px-2 py-2 text-xs transition-colors ${isSelected
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <span className="font-medium">{formatDateShort(day)}</span>
                                {dayJobCount > 0 && (
                                    <span className={`mt-1 h-1.5 w-1.5 rounded-full ${isToday ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Job List */}
            {filteredJobs.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                    <Calendar className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {t('field.components.technicianSchedule.noSchedule')}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredJobs.map((job) => (
                        <a
                            key={job.id}
                            href={`/dashboard/field/jobs/${job.id}`}
                            className={`block rounded-lg border-l-4 border border-gray-200 bg-white p-3 transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${STATUS_COLORS[job.status] || 'border-l-gray-400'
                                }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[job.priority] || 'bg-gray-400'}`} />
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {job.title}
                                        </h4>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        {job.scheduledTime && (
                                            <span className="inline-flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {job.scheduledTime}
                                            </span>
                                        )}
                                        {job.estimatedDuration && (
                                            <span>{job.estimatedDuration} {t('field.components.technicianSchedule.minutes')}</span>
                                        )}
                                        {job.location && (
                                            <span className="inline-flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {job.location}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        {STATUS_LABELS[job.status] || job.status}
                                    </span>
                                    <Wrench className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
