import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { createTimeLogSchema, formatZodError } from '@/lib/validation-schemas';
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

        const timeLogs = await prisma.timeLog.findMany({
            where: { taskId: id, tenantId },
            orderBy: { date: 'desc' },
        });

        const data = timeLogs.map((tl) => ({
            ...tl,
            hours: Number(tl.hours),
            date: tl.date.toISOString(),
            createdAt: tl.createdAt.toISOString(),
            updatedAt: tl.updatedAt.toISOString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
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
        const validation = createTimeLogSchema.safeParse(body);
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

        const { date, hours, description } = validation.data;

        const timeLog = await prisma.timeLog.create({
            data: {
                tenantId,
                taskId: id,
                employeeId: userId,
                date: new Date(date),
                hours,
                description: description?.trim() || null,
            },
        });

        // Auto-update task.actualHours
        const totalHours = await prisma.timeLog.aggregate({
            where: { taskId: id, tenantId },
            _sum: { hours: true },
        });

        await prisma.task.update({
            where: { id },
            data: { actualHours: totalHours._sum.hours || 0 },
        });

        // Audit logging non-blocking
        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'TimeLog',
            entityId: timeLog.id,
            newValues: validation.data as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, data: timeLog }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
