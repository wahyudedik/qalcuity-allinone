export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { updateProjectSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/projects/[id] ────────────────────────────────────────────────
export async function GET(request: Request, context: RouteContext) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:projects:${ip}`, 100, 60000);
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

        const project = await prisma.project.findFirst({
            where: { id, tenantId },
            include: {
                members: {
                    select: {
                        id: true,
                        employeeId: true,
                        role: true,
                        joinedAt: true,
                    },
                },
                _count: {
                    select: {
                        tasks: true,
                        budgets: true,
                        resourceAllocations: true,
                    },
                },
            },
        });

        if (!project) {
            return NextResponse.json({ success: false, error: MSG.PROJECT_NOT_FOUND }, { status: 404 });
        }

        // Get task status breakdown
        const taskStatusBreakdown = await prisma.task.groupBy({
            by: ['status'],
            where: { projectId: id, tenantId },
            _count: { id: true },
        });

        const taskStats = {
            total: project._count.tasks,
            byStatus: Object.fromEntries(
                taskStatusBreakdown.map((g) => [g.status, g._count.id])
            ),
        };

        return NextResponse.json({
            success: true,
            data: {
                id: project.id,
                name: project.name,
                description: project.description,
                status: project.status,
                priority: project.priority,
                startDate: project.startDate?.toISOString() || null,
                endDate: project.endDate?.toISOString() || null,
                budget: project.budget ? Number(project.budget) : null,
                spent: project.spent ? Number(project.spent) : 0,
                progress: project.progress,
                managerId: project.managerId,
                members: project.members,
                taskStats,
                budgetItemCount: project._count.budgets,
                resourceAllocationCount: project._count.resourceAllocations,
                createdAt: project.createdAt.toISOString(),
                updatedAt: project.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT /api/projects/[id] ────────────────────────────────────────────────
export async function PUT(request: Request, context: RouteContext) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:projects:${ip}`, 30, 60000);
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
        const validation = updateProjectSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        // Verify project exists and belongs to tenant
        const existing = await prisma.project.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: MSG.PROJECT_NOT_FOUND }, { status: 404 });
        }

        const { name, description, status, priority, startDate, endDate, budget, progress, managerId } = validation.data;

        // Build update data — only include provided fields
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description?.trim() || null;
        if (status !== undefined) updateData.status = status;
        if (priority !== undefined) updateData.priority = priority;
        if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
        if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
        if (budget !== undefined) updateData.budget = budget;
        if (progress !== undefined) updateData.progress = progress;
        if (managerId !== undefined) updateData.managerId = managerId || null;

        const project = await prisma.project.update({
            where: { id },
            data: updateData,
        });

        // Audit logging non-blocking
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'Project',
            entityId: project.id,
            oldValues: {
                name: existing.name,
                status: existing.status,
                priority: existing.priority,
                progress: existing.progress,
            },
            newValues: toAuditPayload(validation.data),
            request,
        });

        return NextResponse.json({ success: true, data: project });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── DELETE /api/projects/[id] ─────────────────────────────────────────────
export async function DELETE(request: Request, context: RouteContext) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:projects:${ip}`, 10, 60000);
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

        // Verify project exists and belongs to tenant
        const existing = await prisma.project.findFirst({
            where: { id, tenantId },
            include: {
                _count: {
                    select: {
                        tasks: { where: { status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] } } },
                    },
                },
            },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: MSG.PROJECT_NOT_FOUND }, { status: 404 });
        }

        // Prevent deletion if project has active tasks
        if (existing._count.tasks > 0) {
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
            oldValues: {
                name: existing.name,
                status: existing.status,
            },
            request,
        });

        return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
        return handleApiError(error);
    }
}
