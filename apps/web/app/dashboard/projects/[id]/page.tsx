'use client';

/**
 * Project Detail Page — Detail proyek dengan tabs
 *
 * Tabs: Overview, Tasks, Members, Budget, Gantt, Resources
 * Follows pattern dari kitchen/page.tsx dengan tab-based navigation.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Edit,
    Calendar,
    DollarSign,
    Users,
    CheckCircle2,
    Clock,
    AlertCircle,
    BarChart3,
    FileText,
    Plus,
    Trash2,
    UserPlus,
    ChevronDown,
    Tag,
    Eye,
    GanttChart,
    LayoutGrid,
} from 'lucide-react';
import { useProjects, type ProjectDetail, type Task, type ProjectMember, type TaskStatus, type MemberRole } from '@/hooks/use-projects';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { GanttChart as GanttChartComponent, type GanttData } from '@/components/operations/gantt-chart';
import { ResourceHeatmap, type ResourceData } from '@/components/operations/resource-heatmap';
import { ProjectTimeline, type TimelineData } from '@/components/operations/project-timeline';

// =============================================================================
// Constants
// =============================================================================

type TabKey = 'overview' | 'tasks' | 'members' | 'budget' | 'gantt' | 'resources';

const TABS: { key: TabKey; i18nKey: string; icon: typeof FileText }[] = [
    { key: 'overview', i18nKey: 'dashboard.projects.tabs.overview', icon: BarChart3 },
    { key: 'tasks', i18nKey: 'dashboard.projects.tabs.tasks', icon: CheckCircle2 },
    { key: 'members', i18nKey: 'dashboard.projects.tabs.members', icon: Users },
    { key: 'budget', i18nKey: 'dashboard.projects.tabs.budget', icon: DollarSign },
    { key: 'gantt', i18nKey: 'dashboard.projects.tabs.gantt', icon: GanttChart },
    { key: 'resources', i18nKey: 'dashboard.projects.tabs.resources', icon: LayoutGrid },
];

const STATUS_COLORS: Record<string, string> = {
    PLANNING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    ON_HOLD: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    COMPLETED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_I18N_KEYS: Record<string, string> = {
    PLANNING: 'dashboard.projects.status.PLANNING',
    ACTIVE: 'dashboard.projects.status.ACTIVE',
    ON_HOLD: 'dashboard.projects.status.ON_HOLD',
    COMPLETED: 'dashboard.projects.status.COMPLETED',
    CANCELLED: 'dashboard.projects.status.CANCELLED',
};

const TASK_STATUS_COLORS: Record<string, string> = {
    TODO: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    IN_REVIEW: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    DONE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const TASK_STATUS_I18N_KEYS: Record<string, string> = {
    TODO: 'dashboard.tasks.status.TODO',
    IN_PROGRESS: 'dashboard.tasks.status.IN_PROGRESS',
    IN_REVIEW: 'dashboard.tasks.status.IN_REVIEW',
    DONE: 'dashboard.tasks.status.DONE',
    CANCELLED: 'dashboard.tasks.status.CANCELLED',
};

const PRIORITY_COLORS: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    MEDIUM: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    HIGH: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    URGENT: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

const PRIORITY_I18N_KEYS: Record<string, string> = {
    LOW: 'dashboard.tasks.priority.LOW',
    MEDIUM: 'dashboard.tasks.priority.MEDIUM',
    HIGH: 'dashboard.tasks.priority.HIGH',
    URGENT: 'dashboard.tasks.priority.URGENT',
};

const MEMBER_ROLE_I18N_KEYS: Record<string, string> = {
    MANAGER: 'dashboard.projects.roles.MANAGER',
    MEMBER: 'dashboard.projects.roles.MEMBER',
    VIEWER: 'dashboard.projects.roles.VIEWER',
};

// =============================================================================
// Sub-components
// =============================================================================

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
            {t(STATUS_I18N_KEYS[status] || status)}
        </span>
    );
}

function TaskStatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
            {t(TASK_STATUS_I18N_KEYS[status] || status)}
        </span>
    );
}

function PriorityBadge({ priority, t }: { priority: string; t: (key: string) => string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[priority] || 'bg-gray-100 text-gray-600'}`}>
            {t(PRIORITY_I18N_KEYS[priority] || priority)}
        </span>
    );
}

function ProgressBar({ value, label }: { value: number; label?: string }) {
    return (
        <div className="w-full">
            {label && (
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>{label}</span>
                    <span>{value}%</span>
                </div>
            )}
            <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                    className="h-2.5 rounded-full bg-blue-600 transition-all"
                    style={{ width: `${Math.min(value, 100)}%` }}
                />
            </div>
        </div>
    );
}

// =============================================================================
// Tab: Overview
// =============================================================================

function OverviewTab({ project }: { project: ProjectDetail }) {
    const { t } = useTranslation();
    const taskSummary = project.taskSummary;
    const totalTasks = taskSummary.total;
    const doneTasks = taskSummary.byStatus['DONE'] || 0;
    const inProgressTasks = taskSummary.byStatus['IN_PROGRESS'] || 0;
    const todoTasks = taskSummary.byStatus['TODO'] || 0;
    const reviewTasks = taskSummary.byStatus['IN_REVIEW'] || 0;

    return (
        <div className="space-y-6">
            {/* Project Info */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Informasi Proyek</h3>
                {project.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{project.description}</p>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Tanggal Mulai</span>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {project.startDate ? formatDate(project.startDate) : '-'}
                        </p>
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Tanggal Selesai</span>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {project.endDate ? formatDate(project.endDate) : '-'}
                        </p>
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Anggaran</span>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {project.budget ? formatCurrency(project.budget) : '-'}
                        </p>
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Terpakai</span>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(project.spent)}
                        </p>
                    </div>
                </div>
                <div className="mt-4">
                    <ProgressBar value={project.progress} label="Progres" />
                </div>
            </div>

            {/* Task Summary */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Ringkasan Task</h3>
                {totalTasks === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada task</p>
                ) : (
                    <div className="space-y-3">
                        {/* Simple bar chart */}
                        <div className="flex h-6 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                            {todoTasks > 0 && (
                                <div
                                    className="bg-gray-400 transition-all"
                                    style={{ width: `${(todoTasks / totalTasks) * 100}%` }}
                                    title={`${t('dashboard.tasks.status.TODO')}: ${todoTasks}`}
                                />
                            )}
                            {inProgressTasks > 0 && (
                                <div
                                    className="bg-blue-500 transition-all"
                                    style={{ width: `${(inProgressTasks / totalTasks) * 100}%` }}
                                    title={`${t('dashboard.tasks.status.IN_PROGRESS')}: ${inProgressTasks}`}
                                />
                            )}
                            {reviewTasks > 0 && (
                                <div
                                    className="bg-yellow-500 transition-all"
                                    style={{ width: `${(reviewTasks / totalTasks) * 100}%` }}
                                    title={`${t('dashboard.tasks.status.IN_REVIEW')}: ${reviewTasks}`}
                                />
                            )}
                            {doneTasks > 0 && (
                                <div
                                    className="bg-green-500 transition-all"
                                    style={{ width: `${(doneTasks / totalTasks) * 100}%` }}
                                    title={`${t('dashboard.tasks.status.DONE')}: ${doneTasks}`}
                                />
                            )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                                <div className="h-3 w-3 rounded-full bg-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">{t('dashboard.tasks.status.TODO')} ({todoTasks})</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="h-3 w-3 rounded-full bg-blue-500" />
                                <span className="text-gray-600 dark:text-gray-400">{t('dashboard.tasks.status.IN_PROGRESS')} ({inProgressTasks})</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                                <span className="text-gray-600 dark:text-gray-400">{t('dashboard.tasks.status.IN_REVIEW')} ({reviewTasks})</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="h-3 w-3 rounded-full bg-green-500" />
                                <span className="text-gray-600 dark:text-gray-400">{t('dashboard.tasks.status.DONE')} ({doneTasks})</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// =============================================================================
// Tab: Tasks
// =============================================================================

function TasksTab({ projectId }: { projectId: string }) {
    const { t } = useTranslation();
    const { tasks, loading, fetchTasks, createTask, updateTaskStatus, taskFilter, setTaskFilter } = useProjects();
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    useEffect(() => {
        void fetchTasks({ projectId, status: taskFilter.status, priority: taskFilter.priority });
    }, [fetchTasks, projectId, taskFilter.status, taskFilter.priority]);

    const handleAddTask = async () => {
        if (!newTaskTitle.trim()) return;
        const success = await createTask({ projectId, title: newTaskTitle.trim() });
        if (success) {
            setNewTaskTitle('');
            setShowAddForm(false);
            void fetchTasks({ projectId, status: taskFilter.status, priority: taskFilter.priority });
        }
    };

    const handleStatusChange = async (taskId: string, newStatus: string) => {
        const success = await updateTaskStatus(taskId, newStatus);
        if (success) {
            void fetchTasks({ projectId, status: taskFilter.status, priority: taskFilter.priority });
        }
    };

    return (
        <div className="space-y-4">
            {/* Filter + Add button */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                    {(['ALL', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setTaskFilter({ ...taskFilter, status })}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${taskFilter.status === status
                                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                }`}
                        >
                            {status === 'ALL' ? t('dashboard.tasks.filter.ALL') : t(TASK_STATUS_I18N_KEYS[status] || status)}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4" />
                    Tambah Task
                </button>
            </div>

            {/* Add task form */}
            {showAddForm && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                    <input
                        type="text"
                        placeholder="Judul task baru..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && void handleAddTask()}
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        autoFocus
                    />
                    <button
                        onClick={() => void handleAddTask()}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        Simpan
                    </button>
                    <button
                        onClick={() => { setShowAddForm(false); setNewTaskTitle(''); }}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                    >
                        Batal
                    </button>
                </div>
            )}

            {/* Task list */}
            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse dark:bg-gray-800" />
                    ))}
                </div>
            ) : tasks.length === 0 ? (
                <EmptyState
                    icon={CheckCircle2}
                    title={t('dashboard.tasks.emptyTitle')}
                    description={t('dashboard.tasks.subtitle')}
                    actionLabel={t('dashboard.projects.tabs.tasks')}
                    onAction={() => setShowAddForm(true)}
                />
            ) : (
                <div className="space-y-2">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {task.title}
                                    </span>
                                    <PriorityBadge priority={task.priority} t={t} />
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                    {task.dueDate && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(task.dueDate)}
                                        </span>
                                    )}
                                    {task.tags && (
                                        <span className="flex items-center gap-1">
                                            <Tag className="h-3 w-3" />
                                            {task.tags}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {task.actualHours}h / {task.estimatedHours || '-'}h
                                    </span>
                                </div>
                            </div>

                            <TaskStatusBadge status={task.status} t={t} />

                            {/* Status change buttons */}
                            <div className="flex gap-1">
                                {task.status === 'TODO' && (
                                    <button
                                        onClick={() => void handleStatusChange(task.id, 'IN_PROGRESS')}
                                        className="rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                                    >
                                        Mulai
                                    </button>
                                )}
                                {task.status === 'IN_PROGRESS' && (
                                    <button
                                        onClick={() => void handleStatusChange(task.id, 'IN_REVIEW')}
                                        className="rounded-md bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300"
                                    >
                                        Review
                                    </button>
                                )}
                                {task.status === 'IN_REVIEW' && (
                                    <button
                                        onClick={() => void handleStatusChange(task.id, 'DONE')}
                                        className="rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
                                    >
                                        Selesai
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// Tab: Members
// =============================================================================

function MembersTab({ project, onRefresh }: { project: ProjectDetail; onRefresh: () => void }) {
    const { t } = useTranslation();
    const { addMember, removeMember, updateMemberRole } = useProjects();
    const [showAddForm, setShowAddForm] = useState(false);
    const [newMemberId, setNewMemberId] = useState('');
    const [newMemberRole, setNewMemberRole] = useState<MemberRole>('MEMBER');

    const handleAddMember = async () => {
        if (!newMemberId.trim()) return;
        const success = await addMember(project.id, newMemberId.trim(), newMemberRole);
        if (success) {
            setNewMemberId('');
            setShowAddForm(false);
            onRefresh();
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm('Hapus anggota ini dari proyek?')) return;
        const success = await removeMember(project.id, memberId);
        if (success) onRefresh();
    };

    const handleRoleChange = async (memberId: string, newRole: string) => {
        const success = await updateMemberRole(project.id, memberId, newRole);
        if (success) onRefresh();
    };

    return (
        <div className="space-y-4">
            {/* Add member button */}
            <div className="flex justify-end">
                <button
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <UserPlus className="h-4 w-4" />
                    Tambah Anggota
                </button>
            </div>

            {/* Add member form */}
            {showAddForm && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                    <input
                        type="text"
                        placeholder="Employee ID..."
                        value={newMemberId}
                        onChange={(e) => setNewMemberId(e.target.value)}
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        autoFocus
                    />
                    <select
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value as MemberRole)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                        <option value="MANAGER">{t('dashboard.projects.roles.MANAGER')}</option>
                        <option value="MEMBER">{t('dashboard.projects.roles.MEMBER')}</option>
                        <option value="VIEWER">{t('dashboard.projects.roles.VIEWER')}</option>
                    </select>
                    <button
                        onClick={() => void handleAddMember()}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        Simpan
                    </button>
                    <button
                        onClick={() => { setShowAddForm(false); setNewMemberId(''); }}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                    >
                        Batal
                    </button>
                </div>
            )}

            {/* Member list */}
            {project.members.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="Belum ada anggota"
                    description="Tambahkan anggota tim ke proyek ini."
                />
            ) : (
                <div className="space-y-2">
                    {project.members.map((member) => (
                        <div
                            key={member.id}
                            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                    {member.employeeId.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {member.employeeId}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Bergabung {formatDate(member.joinedAt)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={member.role}
                                    onChange={(e) => void handleRoleChange(member.id, e.target.value)}
                                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="MANAGER">{t('dashboard.projects.roles.MANAGER')}</option>
                                    <option value="MEMBER">{t('dashboard.projects.roles.MEMBER')}</option>
                                    <option value="VIEWER">{t('dashboard.projects.roles.VIEWER')}</option>
                                </select>
                                <button
                                    onClick={() => void handleRemoveMember(member.id)}
                                    className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                    title="Hapus anggota"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// Tab: Budget
// =============================================================================

function BudgetTab({ project }: { project: ProjectDetail }) {
    const budget = project.budget || 0;
    const spent = project.spent || 0;
    const remaining = budget - spent;
    const percentUsed = budget > 0 ? Math.round((spent / budget) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Budget overview */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Ringkasan Anggaran</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Anggaran</p>
                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                            {budget > 0 ? formatCurrency(budget) : '-'}
                        </p>
                    </div>
                    <div className="rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20">
                        <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Terpakai</p>
                        <p className="text-xl font-bold text-orange-700 dark:text-orange-300 mt-1">
                            {formatCurrency(spent)}
                        </p>
                    </div>
                    <div className={`rounded-lg p-4 ${remaining >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                        <p className={`text-xs font-medium ${remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            Sisa
                        </p>
                        <p className={`text-xl font-bold mt-1 ${remaining >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                            {budget > 0 ? formatCurrency(remaining) : '-'}
                        </p>
                    </div>
                </div>

                {budget > 0 && (
                    <div className="mt-6">
                        <ProgressBar value={percentUsed} label="Persentase Penggunaan" />
                    </div>
                )}
            </div>
        </div>
    );
}

// =============================================================================
// Tab: Gantt
// =============================================================================

function GanttTab({ projectId }: { projectId: string }) {
    const [ganttData, setGanttData] = useState<GanttData | null>(null);
    const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch(`/api/projects/${projectId}/gantt`);
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error || 'Gagal memuat data Gantt');
                }
                const data = await response.json();
                setGanttData(data);
                if (data.project) {
                    setTimelineData({
                        project: data.project,
                        tasks: (data.tasks || []).map((t: GanttData['tasks'][0]) => ({
                            id: t.id,
                            title: t.title,
                            status: t.status,
                            startDate: t.startDate,
                            endDate: t.endDate,
                            dueDate: t.dueDate,
                            progress: t.progress,
                            priority: t.priority,
                        })),
                    });
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
            } finally {
                setLoading(false);
            }
        };
        void fetchData();
    }, [projectId]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[200px] rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <ProjectTimeline data={timelineData} loading={loading} />
            <GanttChartComponent data={ganttData} loading={loading} />
        </div>
    );
}

// =============================================================================
// Tab: Resources
// =============================================================================

function ResourcesTab({ projectId }: { projectId: string }) {
    const { t } = useTranslation();
    const [resourceData, setResourceData] = useState<ResourceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch(`/api/projects/${projectId}/resources?active=true`);
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error || 'Gagal memuat data resource');
                }
                const data = await response.json();
                setResourceData(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
            } finally {
                setLoading(false);
            }
        };
        void fetchData();
    }, [projectId]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[200px] rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <ResourceHeatmap data={resourceData} loading={loading} />
            {!loading && resourceData && resourceData.data.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Detail Alokasi</h3>
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Karyawan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Peran</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Alokasi</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Periode</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {resourceData.data.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.employeeId}</td>
                                        <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                                            {item.role === 'MANAGER' ? t('dashboard.projects.roles.MANAGER') : item.role === 'CONSULTANT' ? 'Konsultan' : t('dashboard.projects.roles.MEMBER')}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
                                                    <div
                                                        className={`h-2 rounded-full ${item.allocationPct > 100 ? 'bg-red-500' : item.allocationPct > 75 ? 'bg-orange-500' : 'bg-green-500'}`}
                                                        style={{ width: `${Math.min(item.allocationPct, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.allocationPct}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                                            {formatDate(item.startDate)} — {formatDate(item.endDate)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// Main Component
// =============================================================================

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params?.id as string;
    const { currentProject, loading, error, fetchProjectDetail } = useProjects();
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState<TabKey>('overview');

    // Guard: redirect "new" ke halaman create project
    useEffect(() => {
        if (projectId === 'new') {
            router.replace('/dashboard/projects/new');
        }
    }, [projectId, router]);

    useEffect(() => {
        if (projectId && projectId !== 'new') {
            void fetchProjectDetail(projectId);
        }
    }, [projectId, fetchProjectDetail]);

    if (loading && !currentProject) {
        return (
            <div className="space-y-6 p-6">
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-64 w-full bg-gray-200 rounded animate-pulse" />
            </div>
        );
    }

    if (error && !currentProject) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
                <button
                    onClick={() => router.push('/dashboard/projects')}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-700"
                >
                    Kembali ke daftar proyek
                </button>
            </div>
        );
    }

    if (!currentProject) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/dashboard/projects')}
                        className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {currentProject.name}
                            </h1>
                            <StatusBadge status={currentProject.status} t={t} />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.push(`/dashboard/projects/${projectId}/board`)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                        <BarChart3 className="h-4 w-4" />
                        Board
                    </button>
                    <button
                        onClick={() => router.push(`/dashboard/projects/${projectId}/edit`)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                        <Edit className="h-4 w-4" />
                        Edit
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.key;
                    const TabIcon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${isActive
                                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            <TabIcon className="h-4 w-4" />
                            {t(tab.i18nKey)}
                        </button>
                    );
                })}
            </div>

            {/* Tab content */}
            {activeTab === 'overview' && <OverviewTab project={currentProject} />}
            {activeTab === 'tasks' && <TasksTab projectId={projectId} />}
            {activeTab === 'members' && (
                <MembersTab
                    project={currentProject}
                    onRefresh={() => void fetchProjectDetail(projectId)}
                />
            )}
            {activeTab === 'budget' && <BudgetTab project={currentProject} />}
            {activeTab === 'gantt' && <GanttTab projectId={projectId} />}
            {activeTab === 'resources' && <ResourcesTab projectId={projectId} />}
        </div>
    );
}
