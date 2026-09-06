import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';

// =============================================================================
// GET /api/projects/[id]/gantt — Gantt chart data (tasks + dependencies + timeline)
// =============================================================================

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        // Verify project belongs to tenant
        const project = await prisma.project.findFirst({
            where: { id, tenantId },
            select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
                progress: true,
            },
        });

        if (!project) {
            return NextResponse.json({ success: false, error: 'Proyek tidak ditemukan' }, { status: 404 });
        }

        // Fetch all tasks with dependencies
        const tasks = await prisma.task.findMany({
            where: { projectId: id, tenantId },
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                priority: true,
                assigneeId: true,
                startDate: true,
                endDate: true,
                dueDate: true,
                progress: true,
                dependsOnId: true,
                estimatedHours: true,
                actualHours: true,
                sortOrder: true,
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        });

        // Fetch resource allocations for the project
        const resourceAllocations = await prisma.resourceAllocation.findMany({
            where: { projectId: id, tenantId },
            select: {
                employeeId: true,
                role: true,
                allocationPct: true,
                startDate: true,
                endDate: true,
            },
        });

        // Calculate project-level metrics
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
        const autoProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Find critical path (longest dependency chain)
        const taskMap = new Map(tasks.map((t) => [t.id, t]));
        const calculateEnd = (task: typeof tasks[0]): Date => {
            return task.endDate || task.dueDate || new Date();
        };

        // Calculate earliest start based on dependencies
        const earliestStart = new Map<string, Date>();
        const visited = new Set<string>();

        const resolveEarliest = (taskId: string): Date => {
            if (earliestStart.has(taskId)) return earliestStart.get(taskId)!;
            if (visited.has(taskId)) return new Date(); // prevent infinite loop
            visited.add(taskId);

            const task = taskMap.get(taskId);
            if (!task) return new Date();

            let earliest = task.startDate || new Date();

            if (task.dependsOnId) {
                const depEnd = resolveEarliest(task.dependsOnId);
                if (depEnd > earliest) {
                    earliest = depEnd;
                }
            }

            earliestStart.set(taskId, earliest);
            return earliest;
        };

        tasks.forEach((t) => resolveEarliest(t.id));

        return NextResponse.json({
            success: true,
            data: {
                project: {
                    id: project.id,
                    name: project.name,
                    startDate: project.startDate?.toISOString() || null,
                    endDate: project.endDate?.toISOString() || null,
                    progress: project.progress,
                    autoProgress,
                },
                tasks: tasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    description: t.description,
                    status: t.status,
                    priority: t.priority,
                    assigneeId: t.assigneeId,
                    startDate: t.startDate?.toISOString() || null,
                    endDate: t.endDate?.toISOString() || null,
                    dueDate: t.dueDate?.toISOString() || null,
                    progress: t.progress,
                    dependsOnId: t.dependsOnId,
                    estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : null,
                    actualHours: t.actualHours ? Number(t.actualHours) : 0,
                    sortOrder: t.sortOrder,
                })),
                resourceAllocations: resourceAllocations.map((r) => ({
                    employeeId: r.employeeId,
                    role: r.role,
                    allocationPct: r.allocationPct,
                    startDate: r.startDate.toISOString(),
                    endDate: r.endDate.toISOString(),
                })),
                summary: {
                    totalTasks,
                    completedTasks,
                    autoProgress,
                },
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
