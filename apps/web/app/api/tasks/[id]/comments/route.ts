export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createTaskSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';

export async function GET(request: Request) {
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
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');
        const assigneeId = searchParams.get('assigneeId');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (projectId) {
            where.projectId = projectId;
        }
        if (status) {
            where.status = status.toUpperCase();
        }
        if (priority) {
            where.priority = priority.toUpperCase();
        }
        if (assigneeId) {
            where.assigneeId = assigneeId;
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where,
                include: {
                    project: {
                        select: { id: true, name: true },
                    },
                    _count: {
                        select: {
                            comments: true,
                            timeLogs: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
            }),
            prisma.task.count({ where }),
        ]);

        const data = tasks.map((t) => ({
            id: t.id,
            projectId: t.projectId,
            projectName: t.project.name,
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            assigneeId: t.assigneeId,
            dueDate: t.dueDate?.toISOString() || null,
            estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : null,
            actualHours: t.actualHours ? Number(t.actualHours) : 0,
            tags: t.tags,
            sortOrder: t.sortOrder,
            commentCount: t._count.comments,
            timeLogCount: t._count.timeLogs,
            createdAt: t.createdAt.toISOString(),
            updatedAt: t.updatedAt.toISOString(),
        }));

        return NextResponse.json({
            success: true,
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
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
        const body = await request.json();

        // Validasi input dengan Zod
        const validation = createTaskSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        // Verify project exists and belongs to tenant
        const project = await prisma.project.findFirst({
            where: { id: validation.data.projectId, tenantId },
        });

        if (!project) {
            return NextResponse.json({ success: false, error: MSG.PROJECT_NOT_FOUND }, { status: 404 });
        }

        const { projectId, title, description, status, priority, assigneeId, dueDate, estimatedHours, tags } = validation.data;

        // Get next sort order
        const maxSortOrder = await prisma.task.aggregate({
            where: { projectId, tenantId },
            _max: { sortOrder: true },
        });

        const task = await prisma.task.create({
            data: {
                tenantId,
                projectId,
                title: title.trim(),
                description: description?.trim() || null,
                status: status || 'TODO',
                priority: priority || 'MEDIUM',
                assigneeId: assigneeId || null,
                dueDate: dueDate ? new Date(dueDate) : null,
                estimatedHours: estimatedHours || null,
                tags: tags?.trim() || null,
                sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
            },
        });

        // Audit logging non-blocking
        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'Task',
            entityId: task.id,
            newValues: validation.data as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, data: task }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
