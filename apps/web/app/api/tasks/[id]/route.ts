export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { updateTaskSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/tasks/[id] ───────────────────────────────────────────────────
export async function GET(request: Request, context: RouteContext) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:tasks:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = await context.params;

        const task = await prisma.task.findFirst({
            where: { id, tenantId },
            include: {
                project: {
                    select: { id: true, name: true },
                },
                comments: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                },
                timeLogs: {
                    orderBy: { date: 'desc' },
                },
            },
        });

        if (!task) {
            return NextResponse.json({ success: false, error: MSG.TASK_NOT_FOUND }, { status: 404 });
        }

        // Calculate total logged hours
        const totalLoggedHours = task.timeLogs.reduce(
            (sum, log) => sum + Number(log.hours),
            0
        );

        // If task has a dependency, fetch its info
        let dependency: { id: string; title: string; status: string } | null = null;
        if (task.dependsOnId) {
            const depTask = await prisma.task.findFirst({
                where: { id: task.dependsOnId, tenantId },
                select: { id: true, title: true, status: true },
            });
            dependency = depTask;
        }

        return NextResponse.json({
            success: true,
            data: {
                id: task.id,
                projectId: task.projectId,
                projectName: task.project.name,
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                assigneeId: task.assigneeId,
                dueDate: task.dueDate?.toISOString() || null,
                startDate: task.startDate?.toISOString() || null,
                endDate: task.endDate?.toISOString() || null,
                progress: task.progress,
                dependsOnId: task.dependsOnId,
                dependency,
                estimatedHours: task.estimatedHours ? Number(task.estimatedHours) : null,
                actualHours: task.actualHours ? Number(task.actualHours) : 0,
                totalLoggedHours,
                tags: task.tags,
                sortOrder: task.sortOrder,
                comments: task.comments.map((c) => ({
                    id: c.id,
                    authorId: c.authorId,
                    content: c.content,
                    createdAt: c.createdAt.toISOString(),
                    updatedAt: c.updatedAt.toISOString(),
                })),
                timeLogs: task.timeLogs.map((tl) => ({
                    id: tl.id,
                    employeeId: tl.employeeId,
                    date: tl.date.toISOString(),
                    hours: Number(tl.hours),
                    description: tl.description,
                    createdAt: tl.createdAt.toISOString(),
                })),
                createdAt: task.createdAt.toISOString(),
                updatedAt: task.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT /api/tasks/[id] ───────────────────────────────────────────────────
export async function PUT(request: Request, context: RouteContext) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:tasks:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = await context.params;
        const body = await request.json();

        // Sanitize text inputs before validation
        const sanitizedBody = sanitizeObject(body);

        // Validasi input dengan Zod
        const validation = updateTaskSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        // Verify task exists and belongs to tenant
        const existing = await prisma.task.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: MSG.TASK_NOT_FOUND }, { status: 404 });
        }

        const {
            title, description, status, priority, assigneeId,
            dueDate, estimatedHours, actualHours, tags, sortOrder,
            startDate, endDate, progress, dependsOnId,
        } = validation.data;

        // Build update data — only include provided fields
        const updateData: Record<string, unknown> = {};
        if (title !== undefined) updateData.title = title.trim();
        if (description !== undefined) updateData.description = description?.trim() || null;
        if (status !== undefined) updateData.status = status;
        if (priority !== undefined) updateData.priority = priority;
        if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
        if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
        if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;
        if (actualHours !== undefined) updateData.actualHours = actualHours;
        if (tags !== undefined) updateData.tags = tags?.trim() || null;
        if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
        if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
        if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
        if (progress !== undefined) updateData.progress = progress;
        if (dependsOnId !== undefined) updateData.dependsOnId = dependsOnId || null;

        const task = await prisma.task.update({
            where: { id },
            data: updateData,
            include: {
                project: { select: { id: true, name: true } },
            },
        });

        // Audit logging non-blocking
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'Task',
            entityId: task.id,
            oldValues: {
                title: existing.title,
                status: existing.status,
                priority: existing.priority,
                progress: existing.progress,
            },
            newValues: toAuditPayload(validation.data),
            request,
        });

        return NextResponse.json({ success: true, data: task });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── DELETE /api/tasks/[id] ────────────────────────────────────────────────
export async function DELETE(request: Request, context: RouteContext) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:tasks:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = await context.params;

        // Verify task exists and belongs to tenant
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
            oldValues: {
                title: existing.title,
                status: existing.status,
                projectId: existing.projectId,
            },
            request,
        });

        return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
        return handleApiError(error);
    }
}
