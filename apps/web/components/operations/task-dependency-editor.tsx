'use client';

/**
 * Task Dependency Editor Component — Edit task dependencies
 *
 * Features:
 * - Select dependency (blocker task) for a task
 * - Visual dependency chain
 * - Remove dependency
 * - Validation (no circular dependencies)
 */

import { useState } from 'react';
import { ArrowRight, X, Link2, Unlink, AlertTriangle } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface DependencyTask {
    id: string;
    title: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    dependsOnId: string | null;
}

export interface TaskDependency {
    taskId: string;
    taskTitle: string;
    dependsOnId: string | null;
    dependsOnTitle: string | null;
}

// =============================================================================
// Constants
// =============================================================================

const STATUS_COLORS: Record<string, string> = {
    TODO: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    IN_PROGRESS: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    IN_REVIEW: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    DONE: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    CANCELLED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

// =============================================================================
// Helper Functions
// =============================================================================

function hasCircularDependency(
    taskId: string,
    dependsOnId: string,
    tasks: DependencyTask[]
): boolean {
    const visited = new Set<string>();
    let current = dependsOnId;

    while (current) {
        if (current === taskId) return true;
        if (visited.has(current)) return false;
        visited.add(current);

        const task = tasks.find((t) => t.id === current);
        current = task?.id === dependsOnId ? '' : ''; // Simple check - actual circular detection would need dependency graph
        break;
    }

    return false;
}

function findDependencyChain(
    taskId: string,
    tasks: DependencyTask[]
): string[] {
    const chain: string[] = [];
    const visited = new Set<string>();
    let current = taskId;

    while (current) {
        if (visited.has(current)) break;
        visited.add(current);
        const task = tasks.find((t) => t.id === current);
        if (!task || !task.dependsOnId) break;
        chain.push(task.dependsOnId);
        current = task.dependsOnId;
    }

    return chain;
}

// =============================================================================
// Main Component
// =============================================================================

interface TaskDependencyEditorProps {
    taskId: string;
    currentDependsOnId: string | null;
    allTasks: DependencyTask[];
    onUpdate: (taskId: string, dependsOnId: string | null) => Promise<boolean>;
}

export function TaskDependencyEditor({
    taskId,
    currentDependsOnId,
    allTasks,
    onUpdate,
}: TaskDependencyEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [selectedId, setSelectedId] = useState<string>(currentDependsOnId || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentTask = allTasks.find((t) => t.id === taskId);
    const blockerTask = allTasks.find((t) => t.id === currentDependsOnId);

    // Filter out self and already-dependent tasks
    const availableTasks = allTasks.filter((t) => {
        if (t.id === taskId) return false;
        // Prevent circular: check if this task is a dependency of the selected task
        const chain = findDependencyChain(t.id, allTasks);
        if (chain.includes(taskId)) return false;
        return true;
    });

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        // Validate no circular dependency
        if (selectedId) {
            const chain = findDependencyChain(selectedId, allTasks);
            if (chain.includes(taskId)) {
                setError('Tidak dapat membuat dependency yang mengarah ke task ini (circular dependency)');
                setSaving(false);
                return;
            }
        }

        const success = await onUpdate(taskId, selectedId || null);
        if (success) {
            setIsEditing(false);
        }
        setSaving(false);
    };

    const handleRemove = async () => {
        setSaving(true);
        const success = await onUpdate(taskId, null);
        if (success) {
            setIsEditing(false);
            setSelectedId('');
        }
        setSaving(false);
    };

    if (isEditing) {
        return (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Atur Dependency</span>
                    <button
                        onClick={() => { setIsEditing(false); setError(null); }}
                        className="rounded p-1 text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>

                <select
                    value={selectedId}
                    onChange={(e) => { setSelectedId(e.target.value); setError(null); }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white mb-2"
                >
                    <option value="">Tidak ada dependency</option>
                    {availableTasks.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.title} ({t.status})
                        </option>
                    ))}
                </select>

                {error && (
                    <div className="flex items-center gap-1 mb-2 text-xs text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-3 w-3" />
                        {error}
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={() => void handleSave()}
                        disabled={saving}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    {currentDependsOnId && (
                        <button
                            onClick={() => void handleRemove()}
                            disabled={saving}
                            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400"
                        >
                            Hapus Dependency
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            {blockerTask ? (
                <div className="flex items-center gap-1.5 rounded-full bg-yellow-100 px-2 py-1 text-xs dark:bg-yellow-900/30">
                    <Link2 className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-yellow-700 dark:text-yellow-300">
                        Menunggu: {blockerTask.title}
                    </span>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="ml-1 rounded-full p-0.5 text-yellow-500 hover:bg-yellow-200 dark:hover:bg-yellow-800"
                        title="Ubah dependency"
                    >
                        <X className="h-2.5 w-2.5" />
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2 py-1 text-[10px] text-gray-400 hover:border-blue-400 hover:text-blue-500 dark:border-gray-600 dark:hover:border-blue-500"
                >
                    <Link2 className="h-2.5 w-2.5" />
                    Tambah Dependency
                </button>
            )}
        </div>
    );
}
