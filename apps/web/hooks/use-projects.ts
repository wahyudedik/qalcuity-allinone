'use client';

/**
 * Operations Module — Projects React Hook
 *
 * Hook untuk mengelola projects, tasks, members, dan timesheet
 * dengan auto-refresh polling setiap 30 detik.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type MemberRole = 'MANAGER' | 'MEMBER' | 'VIEWER';

export interface Project {
    id: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    priority: ProjectPriority;
    startDate: string | null;
    endDate: string | null;
    budget: number | null;
    spent: number;
    progress: number;
    managerId: string | null;
    memberCount: number;
    taskCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface ProjectDetail extends Project {
    members: ProjectMember[];
    taskSummary: {
        total: number;
        byStatus: Record<string, number>;
    };
}

export interface ProjectMember {
    id: string;
    projectId: string;
    employeeId: string;
    role: MemberRole;
    joinedAt: string;
}

export interface Task {
    id: string;
    projectId: string;
    projectName: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string | null;
    dueDate: string | null;
    estimatedHours: number | null;
    actualHours: number;
    tags: string | null;
    sortOrder: number;
    commentCount: number;
    timeLogCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface TimeLogEntry {
    id: string;
    taskId: string;
    taskTitle: string;
    projectId: string;
    projectName: string;
    date: string;
    hours: number;
    description: string | null;
}

export interface TimesheetData {
    dateFrom: string;
    dateTo: string;
    view: string;
    grandTotal: number;
    employees: {
        employeeId: string;
        totalHours: number;
        entries: TimeLogEntry[];
    }[];
}

export interface ProjectFilter {
    status: ProjectStatus | 'ALL';
    search: string;
}

export interface TaskFilter {
    status: TaskStatus | 'ALL';
    priority: TaskPriority | 'ALL';
    assigneeId: string;
    search: string;
}

// =============================================================================
// Phase B Types: Gantt, Budget, Resource
// =============================================================================

export type BudgetCategory = 'LABOR' | 'MATERIAL' | 'EQUIPMENT' | 'TRAVEL' | 'SOFTWARE' | 'OTHER';

export type ResourceRole = 'MANAGER' | 'MEMBER' | 'CONSULTANT';

export interface BudgetLineItem {
    id: string;
    projectId: string;
    category: BudgetCategory;
    name: string;
    description: string | null;
    planned: number;
    actual: number;
    notes: string | null;
}

export interface BudgetSummary {
    totalPlanned: number;
    totalActual: number;
    totalRemaining: number;
    percentUsed: number;
}

export interface BudgetCategorySummary {
    planned: number;
    actual: number;
    remaining: number;
}

export interface BudgetData {
    data: BudgetLineItem[];
    summary: BudgetSummary;
    byCategory: Record<string, BudgetCategorySummary>;
}

export interface ResourceAllocationItem {
    id: string;
    projectId: string;
    employeeId: string;
    role: string;
    allocationPct: number;
    startDate: string;
    endDate: string;
    hourlyRate: number | null;
    notes: string | null;
}

export interface ResourceAllocationSummary {
    totalAllocations: number;
    totalAllocationPct: number;
    uniqueEmployees: number;
}

export interface EmployeeAllocation {
    employeeId: string;
    totalAllocation: number;
    allocations: number;
    roles: string[];
}

export interface ResourceData {
    data: ResourceAllocationItem[];
    summary: ResourceAllocationSummary;
    byEmployee: EmployeeAllocation[];
}

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
    resources: ResourceAllocationItem[];
    summary: {
        totalTasks: number;
        completedTasks: number;
        autoProgress: number;
    };
}

// =============================================================================
// Hook
// =============================================================================

export function useProjects() {
    // Project state
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProject, setCurrentProject] = useState<ProjectDetail | null>(null);
    const [totalProjects, setTotalProjects] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Task state
    const [tasks, setTasks] = useState<Task[]>([]);
    const [totalTasks, setTotalTasks] = useState(0);

    // Timesheet state
    const [timesheet, setTimesheet] = useState<TimesheetData | null>(null);

    // UI state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<ProjectFilter>({ status: 'ALL', search: '' });
    const [taskFilter, setTaskFilter] = useState<TaskFilter>({ status: 'ALL', priority: 'ALL', assigneeId: '', search: '' });

    // Refs for polling
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const mountedRef = useRef(true);

    // =========================================================================
    // Project Actions
    // =========================================================================

    const fetchProjects = useCallback(async (page = 1, limit = 20) => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', String(limit));
            if (filter.status !== 'ALL') params.set('status', filter.status);
            if (filter.search) params.set('search', filter.search);

            const response = await fetch(`/api/projects?${params.toString()}`);
            const data = await response.json();

            if (!mountedRef.current) return;

            if (data.success) {
                setProjects(data.data);
                setTotalProjects(data.total);
                setTotalPages(data.totalPages);
            } else {
                setError(data.error || 'Gagal memuat proyek');
            }
        } catch {
            if (mountedRef.current) {
                setError('Gagal terhubung ke server');
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, [filter]);

    const fetchProjectDetail = useCallback(async (id: string) => {
        // Guard: jangan fetch jika id adalah "new" (bukan project ID yang valid)
        if (!id || id === 'new') {
            setCurrentProject(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/projects/${id}`);
            const data = await response.json();

            if (!mountedRef.current) return;

            if (data.success) {
                setCurrentProject(data.data);
            } else {
                setError(data.error || 'Proyek tidak ditemukan');
            }
        } catch {
            if (mountedRef.current) {
                setError('Gagal terhubung ke server');
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, []);

    const createProject = useCallback(async (projectData: {
        name: string;
        description?: string;
        status?: string;
        priority?: string;
        startDate?: string;
        endDate?: string;
        budget?: number;
        managerId?: string;
    }): Promise<boolean> => {
        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData),
            });
            const data = await response.json();

            if (data.success) {
                await fetchProjects();
                return true;
            }
            setError(data.error || 'Gagal membuat proyek');
            return false;
        } catch {
            setError('Gagal terhubung ke server');
            return false;
        }
    }, [fetchProjects]);

    const updateProject = useCallback(async (id: string, projectData: Record<string, unknown>): Promise<boolean> => {
        try {
            const response = await fetch(`/api/projects/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData),
            });
            const data = await response.json();

            if (data.success) {
                await fetchProjectDetail(id);
                return true;
            }
            setError(data.error || 'Gagal memperbarui proyek');
            return false;
        } catch {
            setError('Gagal terhubung ke server');
            return false;
        }
    }, [fetchProjectDetail]);

    const deleteProject = useCallback(async (id: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/projects/${id}`, {
                method: 'DELETE',
            });
            const data = await response.json();

            if (data.success) {
                await fetchProjects();
                return true;
            }
            setError(data.error || 'Gagal menghapus proyek');
            return false;
        } catch {
            setError('Gagal terhubung ke server');
            return false;
        }
    }, [fetchProjects]);

    // =========================================================================
    // Task Actions
    // =========================================================================

    const fetchTasks = useCallback(async (params?: {
        projectId?: string;
        page?: number;
        limit?: number;
        status?: string;
        priority?: string;
        assigneeId?: string;
        search?: string;
    }) => {
        try {
            setLoading(true);
            setError(null);

            const queryParams = new URLSearchParams();
            if (params?.projectId) queryParams.set('projectId', params.projectId);
            if (params?.status && params.status !== 'ALL') queryParams.set('status', params.status);
            if (params?.priority && params.priority !== 'ALL') queryParams.set('priority', params.priority);
            if (params?.assigneeId) queryParams.set('assigneeId', params.assigneeId);
            if (params?.search) queryParams.set('search', params.search);
            queryParams.set('page', String(params?.page || 1));
            queryParams.set('limit', String(params?.limit || 50));

            const response = await fetch(`/api/tasks?${queryParams.toString()}`);
            const data = await response.json();

            if (!mountedRef.current) return;

            if (data.success) {
                setTasks(data.data);
                setTotalTasks(data.total);
            } else {
                setError(data.error || 'Gagal memuat task');
            }
        } catch {
            if (mountedRef.current) {
                setError('Gagal terhubung ke server');
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, []);

    const createTask = useCallback(async (taskData: {
        projectId: string;
        title: string;
        description?: string;
        status?: string;
        priority?: string;
        assigneeId?: string;
        dueDate?: string;
        estimatedHours?: number;
        tags?: string;
    }): Promise<boolean> => {
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData),
            });
            const data = await response.json();

            if (data.success) {
                return true;
            }
            setError(data.error || 'Gagal membuat task');
            return false;
        } catch {
            setError('Gagal terhubung ke server');
            return false;
        }
    }, []);

    const updateTaskStatus = useCallback(async (taskId: string, status: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            const data = await response.json();

            if (data.success) {
                return true;
            }
            setError(data.error || 'Gagal memperbarui status task');
            return false;
        } catch {
            setError('Gagal terhubung ke server');
            return false;
        }
    }, []);

    // =========================================================================
    // Member Actions
    // =========================================================================

    const addMember = useCallback(async (projectId: string, employeeId: string, role: string = 'MEMBER'): Promise<boolean> => {
        try {
            const response = await fetch(`/api/projects/${projectId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeId, role }),
            });
            const data = await response.json();

            if (data.success) {
                await fetchProjectDetail(projectId);
                return true;
            }
            setError(data.error || 'Gagal menambahkan anggota');
            return false;
        } catch {
            setError('Gagal terhubung ke server');
            return false;
        }
    }, [fetchProjectDetail]);

    const removeMember = useCallback(async (projectId: string, memberId: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
                method: 'DELETE',
            });
            const data = await response.json();

            if (data.success) {
                await fetchProjectDetail(projectId);
                return true;
            }
            setError(data.error || 'Gagal menghapus anggota');
            return false;
        } catch {
            setError('Gagal terhubung ke server');
            return false;
        }
    }, [fetchProjectDetail]);

    const updateMemberRole = useCallback(async (projectId: string, memberId: string, role: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
            });
            const data = await response.json();

            if (data.success) {
                await fetchProjectDetail(projectId);
                return true;
            }
            setError(data.error || 'Gagal memperbarui role anggota');
            return false;
        } catch {
            setError('Gagal terhubung ke server');
            return false;
        }
    }, [fetchProjectDetail]);

    // =========================================================================
    // Timesheet Actions
    // =========================================================================

    const fetchTimesheet = useCallback(async (params?: {
        employeeId?: string;
        startDate?: string;
        endDate?: string;
        view?: string;
    }) => {
        try {
            setLoading(true);
            setError(null);

            const queryParams = new URLSearchParams();
            if (params?.employeeId) queryParams.set('employeeId', params.employeeId);
            if (params?.startDate) queryParams.set('startDate', params.startDate);
            if (params?.endDate) queryParams.set('endDate', params.endDate);
            if (params?.view) queryParams.set('view', params.view);

            const response = await fetch(`/api/timesheet?${queryParams.toString()}`);
            const data = await response.json();

            if (!mountedRef.current) return;

            if (data.success) {
                setTimesheet(data.data);
            } else {
                setError(data.error || 'Gagal memuat timesheet');
            }
        } catch {
            if (mountedRef.current) {
                setError('Gagal terhubung ke server');
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, []);

    const logTime = useCallback(async (taskId: string, timeData: {
        date: string;
        hours: number;
        description?: string;
    }): Promise<boolean> => {
        try {
            const response = await fetch(`/api/tasks/${taskId}/time`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(timeData),
            });
            const data = await response.json();

            if (data.success) {
                return true;
            }
            setError(data.error || 'Gagal mencatat waktu');
            return false;
        } catch {
            setError('Gagal terhubung ke server');
            return false;
        }
    }, []);

    // =========================================================================
    // Phase B Actions: Gantt, Budget, Resource
    // =========================================================================

    const fetchGanttData = useCallback(async (projectId: string): Promise<GanttData | null> => {
        try {
            const response = await fetch(`/api/projects/${projectId}/gantt`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Gagal memuat data Gantt');
            }
            return await response.json();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat data Gantt');
            return null;
        }
    }, []);

    const fetchBudget = useCallback(async (projectId: string, category?: string): Promise<BudgetData | null> => {
        try {
            const url = category
                ? `/api/projects/${projectId}/budget?category=${category}`
                : `/api/projects/${projectId}/budget`;
            const response = await fetch(url);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Gagal memuat data anggaran');
            }
            return await response.json();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat data anggaran');
            return null;
        }
    }, []);

    const createBudgetItem = useCallback(async (projectId: string, data: {
        category: BudgetCategory;
        name: string;
        description?: string;
        planned: number;
        actual?: number;
        notes?: string;
    }): Promise<boolean> => {
        try {
            const response = await fetch(`/api/projects/${projectId}/budget`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            return response.ok;
        } catch {
            setError('Gagal membuat item anggaran');
            return false;
        }
    }, []);

    const fetchResources = useCallback(async (projectId: string, params?: {
        employeeId?: string;
        active?: boolean;
    }): Promise<ResourceData | null> => {
        try {
            const searchParams = new URLSearchParams();
            if (params?.employeeId) searchParams.set('employeeId', params.employeeId);
            if (params?.active !== undefined) searchParams.set('active', String(params.active));
            const queryString = searchParams.toString();
            const url = `/api/projects/${projectId}/resources${queryString ? `?${queryString}` : ''}`;
            const response = await fetch(url);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Gagal memuat data resource');
            }
            return await response.json();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat data resource');
            return null;
        }
    }, []);

    const createResourceAllocation = useCallback(async (projectId: string, data: {
        employeeId: string;
        role?: ResourceRole;
        allocationPct: number;
        startDate: string;
        endDate: string;
        hourlyRate?: number;
        notes?: string;
    }): Promise<boolean> => {
        try {
            const response = await fetch(`/api/projects/${projectId}/resources`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            return response.ok;
        } catch {
            setError('Gagal membuat alokasi resource');
            return false;
        }
    }, []);

    const updateTaskSchedule = useCallback(async (taskId: string, data: {
        startDate?: string;
        endDate?: string;
        progress?: number;
        dependsOnId?: string | null;
    }): Promise<boolean> => {
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            return response.ok;
        } catch {
            setError('Gagal update jadwal task');
            return false;
        }
    }, []);

    // =========================================================================
    // Polling & Lifecycle
    // =========================================================================

    const refresh = useCallback(async () => {
        await fetchProjects();
    }, [fetchProjects]);

    // Auto-refresh polling setiap 30 detik
    useEffect(() => {
        mountedRef.current = true;

        pollingRef.current = setInterval(() => {
            if (mountedRef.current) {
                void fetchProjects();
            }
        }, 30000);

        return () => {
            mountedRef.current = false;
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, [fetchProjects]);

    return {
        // State
        projects,
        currentProject,
        totalProjects,
        totalPages,
        tasks,
        totalTasks,
        timesheet,
        loading,
        error,
        filter,
        taskFilter,

        // Actions
        setFilter,
        setTaskFilter,
        fetchProjects,
        fetchProjectDetail,
        createProject,
        updateProject,
        deleteProject,
        fetchTasks,
        createTask,
        updateTaskStatus,
        addMember,
        removeMember,
        updateMemberRole,
        fetchTimesheet,
        logTime,
        refresh,

        // Phase B: Gantt, Budget, Resource
        fetchGanttData,
        fetchBudget,
        createBudgetItem,
        fetchResources,
        createResourceAllocation,
        updateTaskSchedule,
    };
}
