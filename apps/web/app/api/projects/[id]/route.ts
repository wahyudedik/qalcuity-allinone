import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updateProjectSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const project = await prisma.project.findFirst({
            where: { id, tenantId },
            include: {
                members: {
                    orderBy: { joinedAt: 'asc' },
                },
                _count: {
                    select: {
                        tasks: true,
                    },
                },
            },
        });

        if (!project) {
            return NextResponse.json({ success: false, error: MSG.PROJECT_NOT_FOUND }, { status: 404 });
        }

        // Get task summary by status
        const taskStatusCounts = await prisma.task.groupBy({
            by: ['status'],
            where: { projectId: id, tenantId },
            _count: true,
        });

        const taskSummary = {
            total: project._count.tasks,
            byStatus: taskStatusCounts.reduce((acc, item) => {
                acc[item.status] = item._count;
                return acc;
            }, {} as Record<string, number>),
        };

        return NextResponse.json({
            success: true,
            data: {
                ...project,
                budget: project.budget ? Number(project.budget) : null,
                spent: project.spent ? Number(project.spent) : 0,
                startDate: project.startDate?.toISOString() || null,
                endDate: project.endDate?.toISOString() || null,
                createdAt: project.createdAt.toISOString(),
                updatedAt: project.updatedAt.toISOString(),
                taskSummary,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;
        const body = await request.json();

        // Validasi input dengan Zod
        const validation = updateProjectSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const existing = await prisma.project.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: MSG.PROJECT_NOT_FOUND }, { status: 404 });
        }

        const { name, description, status, priority, startDate, endDate, budget, progress, managerId } = validation.data;

        const project = await prisma.project.update({
            where: { id },
            data: {
                ...(typeof name === 'string' && { name: name.trim() }),
                ...(typeof description !== 'undefined' && { description: description?.trim() || null }),
                ...(typeof status === 'string' && { status }),
                ...(typeof priority === 'string' && { priority }),
                ...(typeof startDate !== 'undefined' && { startDate: startDate ? new Date(startDate) : null }),
                ...(typeof endDate !== 'undefined' && { endDate: endDate ? new Date(endDate) : null }),
                ...(typeof budget !== 'undefined' && { budget: budget || null }),
                ...(typeof progress === 'number' && { progress }),
                ...(typeof managerId !== 'undefined' && { managerId: managerId || null }),
            },
        });

        // Audit logging non-blocking
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'Project',
            entityId: id,
            newValues: validation.data as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, data: project });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;

        const existing = await prisma.project.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: MSG.PROJECT_NOT_FOUND }, { status: 404 });
        }

        // Check for active tasks
        const activeTasks = await prisma.task.count({
            where: {
                projectId: id,
                tenantId,
                status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] },
            },
        });

        if (activeTasks > 0) {
            return NextResponse.json(
                { success: false, error: MSG.PROJECT_HAS_ACTIVE_TASKS },
                { status: 400 }
            );
        }

        await prisma.project.delete({ where: { id } });

        // Audit logging non-blocking
        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'Project',
            entityId: id,
            oldValues: existing as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
