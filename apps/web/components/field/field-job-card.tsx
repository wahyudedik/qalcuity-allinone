'use client';

/**
 * FieldJobCard — Card component untuk menampilkan info pekerjaan lapangan.
 * Mobile-friendly dengan status badge, priority, location, dan technician info.
 */

import { useRouter } from 'next/navigation';
import {
    MapPin,
    Calendar,
    Clock,
    User,
    Phone,
    Wrench,
    CheckCircle2,
    AlertTriangle,
    Navigation,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

// =============================================================================
// Types
// =============================================================================

export interface FieldJob {
    id: string;
    title: string;
    description?: string | null;
    location?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    scheduledDate?: string | null;
    scheduledTime?: string | null;
    estimatedDuration?: number | null;
    status: string;
    priority: string;
    customerName?: string | null;
    customerPhone?: string | null;
    customerEmail?: string | null;
    notes?: string | null;
    projectId?: string | null;
    completedAt?: string | null;
    assignmentCount: number;
    checklistCount: number;
    assignments: {
        id: string;
        employeeId: string;
        role: string;
        assignedAt: string;
        notes?: string | null;
    }[];
    createdAt: string;
    updatedAt: string;
}

// =============================================================================
// Constants (non-i18n)
// =============================================================================

const STATUS_COLORS: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    EN_ROUTE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    IN_PROGRESS: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_ICONS: Record<string, React.ElementType> = {
    SCHEDULED: Calendar,
    EN_ROUTE: Navigation,
    IN_PROGRESS: Wrench,
    COMPLETED: CheckCircle2,
    CANCELLED: AlertTriangle,
};

const PRIORITY_COLORS: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    MEDIUM: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    HIGH: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    URGENT: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

// =============================================================================
// Sub-components
// =============================================================================

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
    const color = STATUS_COLORS[status] || STATUS_COLORS.SCHEDULED;
    const Icon = STATUS_ICONS[status] || Calendar;
    const label = t(`field.jobDetail.status.${status}`) || status;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
            <Icon className="h-3 w-3" />
            {label}
        </span>
    );
}

function PriorityBadge({ priority, t }: { priority: string; t: (key: string) => string }) {
    const color = PRIORITY_COLORS[priority] || PRIORITY_COLORS.MEDIUM;
    const label = t(`field.jobDetail.priority.${priority}`) || priority;
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
            {label}
        </span>
    );
}

// =============================================================================
// Main Component
// =============================================================================

interface FieldJobCardProps {
    job: FieldJob;
}

export function FieldJobCard({ job }: FieldJobCardProps) {
    const router = useRouter();
    const { t } = useTranslation();

    const ROLE_LABELS: Record<string, string> = {
        LEAD: t('field.jobDetail.role.LEAD'),
        TECHNICIAN: t('field.jobDetail.role.TECHNICIAN'),
        HELPER: t('field.jobDetail.role.HELPER'),
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const hasGps = job.latitude && job.longitude;

    return (
        <div
            onClick={() => router.push(`/dashboard/field/jobs/${job.id}`)}
            className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
        >
            {/* Header: Title + Status */}
            <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1">
                    {job.title}
                </h3>
                <StatusBadge status={job.status} t={t} />
            </div>

            {/* Priority + Duration */}
            <div className="flex items-center gap-2 mb-3">
                <PriorityBadge priority={job.priority} t={t} />
                {job.estimatedDuration && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="h-3 w-3" />
                        {job.estimatedDuration} {t('field.components.jobCard.minutes')}
                    </span>
                )}
            </div>

            {/* Schedule */}
            {job.scheduledDate && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(job.scheduledDate)}{job.scheduledTime ? ` ${job.scheduledTime}` : ''}</span>
                </div>
            )}

            {/* Location */}
            {job.location && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="line-clamp-1">{job.location}</span>
                    {hasGps && (
                        <a
                            href={`https://www.google.com/maps?q=${job.latitude},${job.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Navigation className="h-3 w-3" />
                        </a>
                    )}
                </div>
            )}

            {/* Customer */}
            {job.customerName && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <User className="h-3.5 w-3.5" />
                    <span>{job.customerName}</span>
                    {job.customerPhone && (
                        <span className="text-gray-400">· {job.customerPhone}</span>
                    )}
                </div>
            )}

            {/* Footer: Assignments + Checklists */}
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3 mt-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Wrench className="h-3.5 w-3.5" />
                    <span>{job.assignmentCount} {t('field.components.jobCard.technicians')}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{job.checklistCount} {t('field.components.jobCard.checklists')}</span>
                </div>
            </div>

            {/* Assigned technicians preview */}
            {job.assignments.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {job.assignments.slice(0, 3).map((a) => (
                        <span
                            key={a.id}
                            className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        >
                            {ROLE_LABELS[a.role] || a.role}: {a.employeeId.slice(0, 8)}
                        </span>
                    ))}
                    {job.assignments.length > 3 && (
                        <span className="text-xs text-gray-400">+{job.assignments.length - 3}</span>
                    )}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// Skeleton
// =============================================================================

export function FieldJobCardSkeleton() {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start justify-between mb-3">
                <div className="h-5 w-32 bg-gray-200 rounded dark:bg-gray-700" />
                <div className="h-5 w-20 bg-gray-200 rounded-full dark:bg-gray-700" />
            </div>
            <div className="flex gap-2 mb-3">
                <div className="h-5 w-14 bg-gray-200 rounded-full dark:bg-gray-700" />
                <div className="h-5 w-20 bg-gray-200 rounded dark:bg-gray-700" />
            </div>
            <div className="h-3 w-40 bg-gray-200 rounded mb-2 dark:bg-gray-700" />
            <div className="h-3 w-32 bg-gray-200 rounded mb-2 dark:bg-gray-700" />
            <div className="h-3 w-48 bg-gray-200 rounded border-t border-gray-100 pt-3 dark:bg-gray-700" />
        </div>
    );
}
