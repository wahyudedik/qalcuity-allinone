import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { createTaskCommentSchema, formatZodError } from '@/lib/validation-schemas';
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

        // Verify task exists
        const task = await prisma.task.findFirst({
            where: { id, tenantId },
        });

        if (!task) {
            return NextResponse.json({ success: false, error: MSG.TASK_NOT_FOUND }, { status: 404 });
        }

        const comments = await prisma.taskComment.findMany({
            where: { taskId: id, tenantId },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json({ success: true, data: comments });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(
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
        const validation = createTaskCommentSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        // Verify task exists
        const task = await prisma.task.findFirst({
            where: { id, tenantId },
        });

        if (!task) {
            return NextResponse.json({ success: false, error: MSG.TASK_NOT_FOUND }, { status: 404 });
        }

        const comment = await prisma.taskComment.create({
            data: {
                tenantId,
                taskId: id,
                authorId: userId,
                content: validation.data.content.trim(),
            },
        });

        // Audit logging non-blocking
        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'TaskComment',
            entityId: comment.id,
            newValues: { taskId: id, content: validation.data.content } as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, data: comment }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
