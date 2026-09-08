import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createFieldJobAssignmentSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:field-jobs:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'MSG.TOO_MANY_REQUESTS' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const job = await prisma.fieldJob.findFirst({ where: { id, tenantId } });
        if (!job) {
            return NextResponse.json({ success: false, error: 'MSG.JOB_NOT_FOUND' }, { status: 404 });
        }

        const assignments = await prisma.fieldJobAssignment.findMany({
            where: { jobId: id, tenantId },
            orderBy: { assignedAt: 'desc' },
        });

        return NextResponse.json({
            success: true,
            data: assignments.map((a) => ({
                id: a.id,
                employeeId: a.employeeId,
                role: a.role,
                assignedAt: a.assignedAt.toISOString(),
                notes: a.notes,
            })),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:field-jobs:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'MSG.TOO_MANY_REQUESTS' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();

        const validation = createFieldJobAssignmentSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const job = await prisma.fieldJob.findFirst({ where: { id, tenantId } });
        if (!job) {
            return NextResponse.json({ success: false, error: 'MSG.JOB_NOT_FOUND' }, { status: 404 });
        }

        const { employeeId, role, notes } = validation.data;

        const assignment = await prisma.fieldJobAssignment.create({
            data: {
                tenantId,
                jobId: id,
                employeeId,
                role: role || 'TECHNICIAN',
                notes: notes?.trim() || null,
            },
        });

        await logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'FieldJobAssignment',
            entityId: assignment.id,
            newValues: { jobId: id, employeeId, role: assignment.role },
            request,
        });

        return NextResponse.json({ success: true, data: assignment }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
