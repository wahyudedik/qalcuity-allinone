import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updateTaskSchema, formatZodError } from '@/lib/validation-schemas';
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

        const task = await prisma.task.findFirst({
            where: { id, tenantId },
            include: {
                project: {
                    select: { id: true, name: true },
                },
                comments: {
                    orderBy: { createdAt: 'asc' },
                },
                timeLogs: {
                    orderBy: { date: 'desc' },
                },
            },
        });

        if (!task) {
            return NextResponse.json({ success: false, error: MSG.TASK_NOT_FOUND }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: {
                ...task,
                estimatedHours: task.estimatedHours ? Number(task.estimatedHours) : null,
                actualHours: task.actualHours ? Number(task.actualHours) : 0,
                dueDate: task.dueDate?.toISOString() || null,
                createdAt: task.createdAt.toISOString(),
                updatedAt: task.updatedAt.toISOString(),
                timeLogs: task.timeLogs.map((tl) => ({
                    ...tl,
                    hours: Number(tl.hours),
                    date: tl.date.toISOString(),
                    createdAt: tl.createdAt.toISOString(),
                    updatedAt: tl.updatedAt.toISOString(),
                })),
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
        const validation = updateTaskSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const existing = await prisma.task.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: MSG.TASK_NOT_FOUND }, { status: 404 });
        }

        const { title, description, status, priority, assigneeId, dueDate, estimatedHours, actualHours, tags, sortOrder } = validation.data;

        const task = await prisma.task.update({
            where: { id },
            data: {
                ...(typeof title === 'string' && { title: title.trim() }),
                ...(typeof description !== 'undefined' && { description: description?.trim() || null }),
                ...(typeof status === 'string' && { status }),
                ...(typeof priority === 'string' && { priority }),
                ...(typeof assigneeId !== 'undefined' && { assigneeId: assigneeId || null }),
                ...(typeof dueDate !== 'undefined' && { dueDate: dueDate ? new Date(dueDate) : null }),
                ...(typeof estimatedHours !== 'undefined' && { estimatedHours: estimatedHours || null }),
                ...(typeof actualHours === 'number' && { actualHours }),
                ...(typeof tags !== 'undefined' && { tags: tags?.trim() || null }),
                ...(typeof sortOrder === 'number' && { sortOrder }),
            },
        });

        // Audit logging non-blocking
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'Task',
            entityId: id,
            oldValues: { status: existing.status, priority: existing.priority, assigneeId: existing.assigneeId } as Record<string, unknown>,
            newValues: validation.data as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, data: task });
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

        const existing = await prisma.task.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: MSG.TASK_NOT_FOUND }, { status: 404 });
        }

        await prisma.task.delete({ where: { id } });

        // Audit logging non-blocking
        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'Task',
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
