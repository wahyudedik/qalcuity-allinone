export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { createTimeLogSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/tasks/[id]/time ──────────────────────────────────────────────
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
        const employeeId = searchParams.get('employeeId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
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

        const where: Record<string, unknown> = { taskId: id, tenantId };

        if (employeeId) {
            where.employeeId = employeeId;
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
            if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
        }

        const [timeLogs, total] = await Promise.all([
            prisma.timeLog.findMany({
                where,
                orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
                skip,
                take: limit,
            }),
            prisma.timeLog.count({ where }),
        ]);

        // Calculate total hours
        const totalHours = timeLogs.reduce((sum, log) => sum + Number(log.hours), 0);

        return NextResponse.json({
            success: true,
            data: timeLogs.map((tl) => ({
                id: tl.id,
                employeeId: tl.employeeId,
                date: tl.date.toISOString(),
                hours: Number(tl.hours),
                description: tl.description,
                createdAt: tl.createdAt.toISOString(),
                updatedAt: tl.updatedAt.toISOString(),
            })),
            summary: {
                totalHours,
                totalEntries: total,
            },
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── POST /api/tasks/[id]/time ─────────────────────────────────────────────
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
        const validation = createTimeLogSchema.safeParse(sanitizedBody);
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

        // Verify the taskId in body matches the URL param
        if (validation.data.taskId !== id) {
            return NextResponse.json(
                { success: false, error: MSG.INVALID_INPUT },
                { status: 400 }
            );
        }

        const timeLog = await prisma.timeLog.create({
            data: {
                tenantId,
                taskId: id,
                employeeId: userId,
                date: new Date(validation.data.date),
                hours: validation.data.hours,
                description: validation.data.description?.trim() || null,
            },
        });

        // Auto-update task actualHours (sum of all time logs)
        const aggregate = await prisma.timeLog.aggregate({
            where: { taskId: id, tenantId },
            _sum: { hours: true },
        });

        await prisma.task.update({
            where: { id },
            data: { actualHours: aggregate._sum.hours || 0 },
        });

        // Audit logging non-blocking
        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'TimeLog',
            entityId: timeLog.id,
            newValues: {
                taskId: id,
                hours: validation.data.hours,
                date: validation.data.date,
            },
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: timeLog.id,
                employeeId: timeLog.employeeId,
                date: timeLog.date.toISOString(),
                hours: Number(timeLog.hours),
                description: timeLog.description,
                createdAt: timeLog.createdAt.toISOString(),
                updatedAt: timeLog.updatedAt.toISOString(),
            },
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
