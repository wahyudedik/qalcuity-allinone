'use client';

/**
 * Task Board Page — Kanban board view untuk tasks dalam proyek
 *
 * Columns: TODO, IN_PROGRESS, IN_REVIEW, DONE
 * Button-based status change (no drag-drop library dependency).
 * Follows pattern dari kitchen/page.tsx.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Plus,
    Calendar,
    Clock,
    Tag,
    AlertCircle,
    CheckCircle2,
    ArrowRight,
    Layers,
    ChevronRight,
} from 'lucide-react';
import { useProjects, type Task, type TaskStatus } from '@/hooks/use-projects';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';

// =============================================================================
// Constants
// =============================================================================

const BOARD_COLUMNS: { key: TaskStatus; label: string; color: string; bgColor: string }[] = [
    { key: 'TODO', label: 'To Do', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800' },
    { key: 'IN_PROGRESS', label: 'Dikerjakan', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
    { key: 'IN_REVIEW', label: 'Review', color: 'text-yellow-600', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' },
    { key: 'DONE', label: 'Selesai', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20' },
];

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

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
    TODO: 'IN_PROGRESS',
    IN_PROGRESS: 'IN_REVIEW',
    IN_REVIEW: 'DONE',
    DONE: null,
    CANCELLED: null,
};

// =============================================================================
// Sub-components
// =============================================================================

function PriorityBadge({ priority }: { priority: string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[priority] || 'bg-gray-100 text-gray-600'}`}>
            {PRIORITY_LABELS[priority] || priority}
        </span>
    );
}

function TaskCard({
    task,
    onMoveForward,
}: {
    task: Task;
    onMoveForward: (taskId: string, newStatus: TaskStatus) => void;
}) {
    const nextStatus = NEXT_STATUS[task.status];
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 transition-all hover:shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {/* Title */}
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                {task.title}
            </p>

            {/* Priority */}
            <div className="mb-2">
                <PriorityBadge priority={task.priority} />
            </div>

            {/* Due date */}
            {task.dueDate && (
                <div className={`flex items-center gap-1 text-xs mb-1 ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(task.dueDate)}</span>
                    {isOverdue && <span>(Terlambat)</span>}
                </div>
            )}

            {/* Tags */}
            {task.tags && (
                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-1">
                    <Tag className="h-3 w-3" />
                    <span>{task.tags}</span>
                </div>
            )}

            {/* Time logged */}
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-2">
                <Clock className="h-3 w-3" />
                <span>{task.actualHours}h / {task.estimatedHours || '-'}h</span>
            </div>

            {/* Move button */}
            {nextStatus && (
                <button
                    onClick={() => onMoveForward(task.id, nextStatus)}
                    className="flex w-full items-center justify-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
                >
                    Pindah ke {BOARD_COLUMNS.find(c => c.key === nextStatus)?.label}
                    <ChevronRight className="h-3 w-3" />
                </button>
            )}
        </div>
    );
}

function ColumnHeader({
    label,
    color,
    count,
}: {
    label: string;
    color: string;
    count: number;
}) {
    return (
        <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-semibold ${color}`}>{label}</h3>
            <span className="inline-flex items-center justify-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                {count}
            </span>
        </div>
    );
}

// =============================================================================
// Main Component
// =============================================================================

export default function TaskBoardPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params?.id as string;
    const { tasks, loading, error, fetchTasks, updateTaskStatus, createTask, fetchProjectDetail, currentProject } = useProjects();

    const [showAddForm, setShowAddForm] = useState<string | null>(null); // column key
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Fetch tasks and project detail
    useEffect(() => {
        if (projectId) {
            void fetchTasks({ projectId, limit: 200 });
            void fetchProjectDetail(projectId);
        }
    }, [projectId, fetchTasks, fetchProjectDetail]);

    // Group tasks by status
    const tasksByStatus = useMemo(() => {
        const grouped: Record<string, Task[]> = {
            TODO: [],
            IN_PROGRESS: [],
            IN_REVIEW: [],
            DONE: [],
        };
        tasks.forEach((task) => {
            if (grouped[task.status]) {
                grouped[task.status].push(task);
            }
        });
        return grouped;
    }, [tasks]);

    // Handle status change
    const handleMoveForward = useCallback(async (taskId: string, newStatus: TaskStatus) => {
        const success = await updateTaskStatus(taskId, newStatus);
        if (success) {
            const label = BOARD_COLUMNS.find(c => c.key === newStatus)?.label || newStatus;
            setToast({ message: `Task dipindah ke "${label}"`, type: 'success' });
            void fetchTasks({ projectId, limit: 200 });
        } else {
            setToast({ message: 'Gagal memperbarui status task', type: 'error' });
        }
    }, [updateTaskStatus, fetchTasks, projectId]);

    // Handle quick add task
    const handleQuickAdd = async (status: TaskStatus) => {
        if (!newTaskTitle.trim()) return;
        const success = await createTask({ projectId, title: newTaskTitle.trim(), status });
        if (success) {
            setNewTaskTitle('');
            setShowAddForm(null);
            setToast({ message: 'Task berhasil ditambahkan', type: 'success' });
            void fetchTasks({ projectId, limit: 200 });
        } else {
            setToast({ message: 'Gagal menambahkan task', type: 'error' });
        }
    };

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
                    <button
                        onClick={() => router.push(`/dashboard/projects/${projectId}`)}
                        className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                        <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Task Board
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {currentProject?.name || 'Memuat...'}
                        </p>
                    </div>
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

            {/* Board columns */}
            {loading && tasks.length === 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {BOARD_COLUMNS.map((col) => (
                        <div key={col.key} className={`rounded-xl p-4 ${col.bgColor}`}>
                            <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mb-4 dark:bg-gray-700" />
                            <div className="space-y-2">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-24 bg-white rounded-lg animate-pulse dark:bg-gray-800" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {BOARD_COLUMNS.map((col) => {
                        const columnTasks = tasksByStatus[col.key] || [];
                        return (
                            <div key={col.key} className={`rounded-xl p-4 ${col.bgColor}`}>
                                <ColumnHeader
                                    label={col.label}
                                    color={col.color}
                                    count={columnTasks.length}
                                />

                                {/* Task cards */}
                                <div className="space-y-2 min-h-[100px]">
                                    {columnTasks.length === 0 ? (
                                        <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 p-4 text-xs text-gray-400 dark:border-gray-600 dark:text-gray-500">
                                            Tidak ada task
                                        </div>
                                    ) : (
                                        columnTasks.map((task) => (
                                            <TaskCard
                                                key={task.id}
                                                task={task}
                                                onMoveForward={handleMoveForward}
                                            />
                                        ))
                                    )}
                                </div>

                                {/* Quick add */}
                                {showAddForm === col.key ? (
                                    <div className="mt-2 space-y-2">
                                        <input
                                            type="text"
                                            placeholder="Judul task..."
                                            value={newTaskTitle}
                                            onChange={(e) => setNewTaskTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') void handleQuickAdd(col.key);
                                                if (e.key === 'Escape') { setShowAddForm(null); setNewTaskTitle(''); }
                                            }}
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                            autoFocus
                                        />
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => void handleQuickAdd(col.key)}
                                                className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                                            >
                                                Simpan
                                            </button>
                                            <button
                                                onClick={() => { setShowAddForm(null); setNewTaskTitle(''); }}
                                                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400"
                                            >
                                                Batal
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowAddForm(col.key)}
                                        className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-white hover:text-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                                    >
                                        <Plus className="h-3 w-3" />
                                        Tambah Task
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
