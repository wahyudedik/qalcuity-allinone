export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { bulkUpdateTaskSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';

// ─── PUT /api/tasks/bulk ───────────────────────────────────────────────────
// Bulk update tasks (status, priority, assignee) in a single request.
export async function PUT(request: Request) {
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
        const body = await request.json();

        // Sanitize text inputs before validation
        const sanitizedBody = sanitizeObject(body);

        // Validasi input dengan Zod
        const validation = bulkUpdateTaskSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { taskIds, updates } = validation.data;

        // Verify all tasks exist and belong to tenant
        const existingTasks = await prisma.task.findMany({
            where: {
                id: { in: taskIds },
                tenantId,
            },
            select: { id: true, title: true, status: true, priority: true },
        });

        const foundIds = existingTasks.map((t) => t.id);
        const missingIds = taskIds.filter((id) => !foundIds.includes(id));

        if (missingIds.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Task not found: ${missingIds.join(', ')}`,
                },
                { status: 404 }
            );
        }

        // Build update data
        const updateData: Record<string, unknown> = {};
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.priority !== undefined) updateData.priority = updates.priority;
        if (updates.assigneeId !== undefined) updateData.assigneeId = updates.assigneeId;

        // Perform bulk update in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.task.updateMany({
                where: {
                    id: { in: foundIds },
                    tenantId,
                },
                data: updateData,
            });

            return updated;
        });

        // Audit logging non-blocking — one audit entry per bulk operation
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'Task',
            entityId: `bulk:${foundIds.join(',')}`,
            oldValues: {
                count: foundIds.length,
                previousStatuses: existingTasks.map((t) => ({ id: t.id, status: t.status })),
            },
            newValues: toAuditPayload(updates),
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                updatedCount: result.count,
                updatedIds: foundIds,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
