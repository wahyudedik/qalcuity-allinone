export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { createTaskCommentSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/tasks/[id]/comments ──────────────────────────────────────────
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
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        // Verify task exists and belongs to tenant
        const task = await prisma.task.findFirst({
            where: { id, tenantId },
            select: { id: true },
        });

        if (!task) {
            return NextResponse.json({ success: false, error: MSG.TASK_NOT_FOUND }, { status: 404 });
        }

        const where = { taskId: id, tenantId };

        const [comments, total] = await Promise.all([
            prisma.taskComment.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.taskComment.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: comments.map((c) => ({
                id: c.id,
                authorId: c.authorId,
                content: c.content,
                createdAt: c.createdAt.toISOString(),
                updatedAt: c.updatedAt.toISOString(),
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── POST /api/tasks/[id]/comments ─────────────────────────────────────────
export async function POST(request: Request, context: RouteContext) {
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
        const validation = createTaskCommentSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        // Verify task exists and belongs to tenant
        const task = await prisma.task.findFirst({
            where: { id, tenantId },
            select: { id: true },
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
            newValues: { content: validation.data.content },
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: comment.id,
                authorId: comment.authorId,
                content: comment.content,
                createdAt: comment.createdAt.toISOString(),
                updatedAt: comment.updatedAt.toISOString(),
            },
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
