'use client';

/**
 * Field Job Detail Page — Detail pekerjaan lapangan dengan checklist submission.
 * Mobile-first design untuk technician di lapangan.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    Calendar,
    Clock,
    MapPin,
    User,
    Phone,
    Mail,
    Wrench,
    CheckCircle2,
    AlertTriangle,
    Navigation,
    FileText,
    Plus,
    Send,
} from 'lucide-react';
import { FieldJobMap } from '@/components/field/field-job-map';
import { FieldChecklistForm, type ChecklistItem, type ChecklistAnswer } from '@/components/field/field-checklist-form';
import { useTranslation } from '@/lib/i18n';

// =============================================================================
// Types
// =============================================================================

interface JobDetail {
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
    project?: { id: string; name: string } | null;
    completedAt?: string | null;
    assignments: {
        id: string;
        employeeId: string;
        role: string;
        assignedAt: string;
        notes?: string | null;
    }[];
    checklistResults: {
        id: string;
        checklistId: string;
        checklistName: string;
        employeeId: string;
        answers: unknown;
        photos?: string | null;
        notes?: string | null;
        signedAt: string;
        createdAt: string;
    }[];
    createdAt: string;
    updatedAt: string;
}

interface ChecklistTemplate {
    id: string;
    name: string;
    category: string;
    items: ChecklistItem[];
}

// =============================================================================
// Main Component
// =============================================================================

export default function FieldJobDetailPage() {
    const router = useRouter();
    const params = useParams();
    const jobId = (params?.id || '') as string;
    const { t } = useTranslation();

    const [job, setJob] = useState<JobDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showChecklistForm, setShowChecklistForm] = useState(false);
    const [selectedChecklist, setSelectedChecklist] = useState<ChecklistTemplate | null>(null);
    const [availableChecklists, setAvailableChecklists] = useState<ChecklistTemplate[]>([]);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // i18n-driven config
    const getStatusConfig = (): Record<string, { label: string; color: string; icon: React.ElementType }> => ({
        SCHEDULED: { label: t('field.jobDetail.status.SCHEDULED'), color: 'bg-blue-100 text-blue-700', icon: Calendar },
        EN_ROUTE: { label: t('field.jobDetail.status.EN_ROUTE'), color: 'bg-yellow-100 text-yellow-700', icon: Navigation },
        IN_PROGRESS: { label: t('field.jobDetail.status.IN_PROGRESS'), color: 'bg-orange-100 text-orange-700', icon: Wrench },
        COMPLETED: { label: t('field.jobDetail.status.COMPLETED'), color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
        CANCELLED: { label: t('field.jobDetail.status.CANCELLED'), color: 'bg-red-100 text-red-700', icon: AlertTriangle },
    });

    const getPriorityConfig = (): Record<string, { label: string; color: string }> => ({
        LOW: { label: t('field.jobDetail.priority.LOW'), color: 'bg-gray-100 text-gray-600' },
        MEDIUM: { label: t('field.jobDetail.priority.MEDIUM'), color: 'bg-blue-100 text-blue-600' },
        HIGH: { label: t('field.jobDetail.priority.HIGH'), color: 'bg-orange-100 text-orange-600' },
        URGENT: { label: t('field.jobDetail.priority.URGENT'), color: 'bg-red-100 text-red-600' },
    });

    const getRoleLabels = (): Record<string, string> => ({
        LEAD: t('field.jobDetail.role.LEAD'),
        TECHNICIAN: t('field.jobDetail.role.TECHNICIAN'),
        HELPER: t('field.jobDetail.role.HELPER'),
    });

    const getStatusOptions = () => [
        { value: 'SCHEDULED', label: t('field.jobDetail.status.SCHEDULED') },
        { value: 'EN_ROUTE', label: t('field.jobDetail.status.EN_ROUTE') },
        { value: 'IN_PROGRESS', label: t('field.jobDetail.status.IN_PROGRESS') },
        { value: 'COMPLETED', label: t('field.jobDetail.status.COMPLETED') },
        { value: 'CANCELLED', label: t('field.jobDetail.status.CANCELLED') },
    ];

    const STATUS_CONFIG = getStatusConfig();
    const PRIORITY_CONFIG = getPriorityConfig();
    const ROLE_LABELS = getRoleLabels();
    const STATUS_OPTIONS = getStatusOptions();

    const fetchJob = useCallback(async () => {
        try {
            const res = await fetch(`/api/field/jobs/${jobId}`);
            const data = await res.json();
            if (data.success) {
                setJob(data.data);
            } else {
                setError(data.error || t('field.jobDetail.errorNotFound'));
            }
        } catch {
            setError(t('field.jobDetail.errorLoad'));
        } finally {
            setLoading(false);
        }
    }, [jobId, t]);

    const fetchChecklists = useCallback(async () => {
        try {
            const res = await fetch('/api/field/checklists?isActive=true&limit=50');
            const data = await res.json();
            if (data.success) {
                setAvailableChecklists(data.data.map((c: Record<string, unknown>) => ({
                    id: c.id as string,
                    name: c.name as string,
                    category: c.category as string,
                    items: (c.items as ChecklistItem[]) || [],
                })));
            }
        } catch {
            // Silent fail for checklists
        }
    }, []);

    useEffect(() => {
        fetchJob();
        fetchChecklists();
    }, [fetchJob, fetchChecklists]);

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleStatusChange = async (newStatus: string) => {
        setIsUpdatingStatus(true);
        try {
            const res = await fetch(`/api/field/jobs/${jobId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            if (data.success) {
                setToast({ message: t('field.jobDetail.statusUpdateSuccess'), type: 'success' });
                fetchJob();
            } else {
                setToast({ message: data.error || t('field.jobDetail.statusUpdateFailed'), type: 'error' });
            }
        } catch {
            setToast({ message: t('field.jobDetail.errorGeneric'), type: 'error' });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleChecklistSubmit = async (data: {
        checklistId: string;
        answers: ChecklistAnswer[];
        notes?: string;
        photos?: string;
    }) => {
        const res = await fetch(`/api/field/jobs/${jobId}/checklists`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...data,
                employeeId: 'current-user', // In production, use session user ID
            }),
        });
        const result = await res.json();
        if (result.success) {
            setToast({ message: t('field.jobDetail.checklistSubmitSuccess'), type: 'success' });
            setShowChecklistForm(false);
            setSelectedChecklist(null);
            fetchJob();
        } else {
            throw new Error(result.error || t('field.jobDetail.checklistSubmitFailed'));
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatDateTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
                        <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
                    </div>
                    <div className="h-96 bg-gray-200 rounded-xl animate-pulse" />
                </div>
            </div>
        );
    }

    if (error || !job) {
        return (
            <div className="p-6">
                <button onClick={() => router.back()} className="mb-4 text-sm text-blue-600 hover:text-blue-800">
                    ← {t('field.jobDetail.back')}
                </button>
                <div className="rounded-xl bg-red-50 p-8 text-center dark:bg-red-900/20">
                    <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
                    <h2 className="mt-4 text-lg font-semibold text-red-800 dark:text-red-200">{t('field.jobDetail.error')}</h2>
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error || t('field.jobDetail.errorNotFound')}</p>
                </div>
            </div>
        );
    }

    const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.SCHEDULED;
    const priorityConfig = PRIORITY_CONFIG[job.priority] || PRIORITY_CONFIG.MEDIUM;
    const StatusIcon = statusConfig.icon;

    return (
        <div className="space-y-6 p-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${toast.type === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {toast.message}
                </div>
            )}

            {/* Back button */}
            <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
                <ArrowLeft className="h-4 w-4" />
                {t('field.jobDetail.back')}
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{job.title}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityConfig.color}`}>
                            {priorityConfig.label}
                        </span>
                        {job.project && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {t('field.jobDetail.project')} {job.project.name}
                            </span>
                        )}
                    </div>
                </div>

                {/* Status update buttons */}
                <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.filter((s) => s.value !== job.status).slice(0, 3).map((s) => (
                        <button
                            key={s.value}
                            onClick={() => handleStatusChange(s.value)}
                            disabled={isUpdatingStatus}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left column — Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Description */}
                    {job.description && (
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('field.jobDetail.description')}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{job.description}</p>
                        </div>
                    )}

                    {/* Schedule */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('field.jobDetail.schedule')}</h3>
                        <div className="space-y-2">
                            {job.scheduledDate && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600 dark:text-gray-300">{formatDate(job.scheduledDate)}</span>
                                    {job.scheduledTime && (
                                        <span className="text-gray-500 dark:text-gray-400">
                                            {t('field.jobDetail.timeAt').replace('{time}', job.scheduledTime)}
                                        </span>
                                    )}
                                </div>
                            )}
                            {job.estimatedDuration && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600 dark:text-gray-300">
                                        {t('field.jobDetail.estimatedDuration').replace('{duration}', String(job.estimatedDuration))}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Location */}
                    <FieldJobMap
                        latitude={job.latitude}
                        longitude={job.longitude}
                        location={job.location}
                        address={job.address}
                    />

                    {/* Notes */}
                    {job.notes && (
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('field.jobDetail.notes')}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{job.notes}</p>
                        </div>
                    )}

                    {/* Checklist Results */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('field.jobDetail.checklistResults').replace('{count}', String(job.checklistResults.length))}
                            </h3>
                            <button
                                onClick={() => setShowChecklistForm(true)}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                            >
                                <Plus className="h-3 w-3" />
                                {t('field.jobDetail.fillChecklist')}
                            </button>
                        </div>

                        {job.checklistResults.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                {t('field.jobDetail.noChecklistYet')}
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {job.checklistResults.map((cr) => (
                                    <div key={cr.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {cr.checklistName}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatDateTime(cr.signedAt)}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            {t('field.jobDetail.by')} {cr.employeeId}
                                        </p>
                                        {cr.notes && (
                                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{cr.notes}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right column — Sidebar info */}
                <div className="space-y-6">
                    {/* Customer Info */}
                    {(job.customerName || job.customerPhone || job.customerEmail) && (
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('field.jobDetail.customer')}</h3>
                            <div className="space-y-2">
                                {job.customerName && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <User className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-600 dark:text-gray-300">{job.customerName}</span>
                                    </div>
                                )}
                                {job.customerPhone && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <a href={`tel:${job.customerPhone}`} className="text-blue-600 hover:text-blue-800">{job.customerPhone}</a>
                                    </div>
                                )}
                                {job.customerEmail && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <a href={`mailto:${job.customerEmail}`} className="text-blue-600 hover:text-blue-800">{job.customerEmail}</a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Assigned Technicians */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            {t('field.jobDetail.technicians').replace('{count}', String(job.assignments.length))}
                        </h3>
                        {job.assignments.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                                {t('field.jobDetail.noTechnicianYet')}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {job.assignments.map((a) => (
                                    <div key={a.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {ROLE_LABELS[a.role] || a.role}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{a.employeeId}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Meta info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('field.jobDetail.info')}</h3>
                        <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                            <div>{t('field.jobDetail.created')} {formatDateTime(job.createdAt)}</div>
                            <div>{t('field.jobDetail.updated')} {formatDateTime(job.updatedAt)}</div>
                            {job.completedAt && <div>{t('field.jobDetail.completedAt')} {formatDateTime(job.completedAt)}</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Checklist Form Modal */}
            {showChecklistForm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
                    <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-t-xl sm:rounded-xl p-6 dark:bg-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('field.jobDetail.fillChecklist')}</h2>
                            <button
                                onClick={() => { setShowChecklistForm(false); setSelectedChecklist(null); }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        {!selectedChecklist ? (
                            <div className="space-y-2">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t('field.jobDetail.selectChecklist')}</p>
                                {availableChecklists.map((cl) => (
                                    <button
                                        key={cl.id}
                                        onClick={() => setSelectedChecklist(cl)}
                                        className="w-full text-left rounded-lg border border-gray-200 p-3 hover:border-blue-300 hover:bg-blue-50 transition-colors dark:border-gray-600 dark:hover:border-blue-600 dark:hover:bg-blue-900/20"
                                    >
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{cl.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{cl.category} · {cl.items.length} item</p>
                                    </button>
                                ))}
                                {availableChecklists.length === 0 && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                        {t('field.jobDetail.noChecklistAvailable')}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <FieldChecklistForm
                                checklistId={selectedChecklist.id}
                                checklistName={selectedChecklist.name}
                                items={selectedChecklist.items}
                                onSubmit={handleChecklistSubmit}
                                onCancel={() => setSelectedChecklist(null)}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
