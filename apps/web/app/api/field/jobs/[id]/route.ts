import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { updateFieldJobSchema, formatZodError } from '@/lib/validation-schemas';
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
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const job = await prisma.fieldJob.findFirst({
            where: { id, tenantId },
            include: {
                assignments: true,
                checklistResults: {
                    include: {
                        checklist: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
                project: {
                    select: { id: true, name: true },
                },
            },
        });

        if (!job) {
            return NextResponse.json({ success: false, error: 'Pekerjaan tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: job.id,
                title: job.title,
                description: job.description,
                location: job.location,
                address: job.address,
                latitude: job.latitude ? Number(job.latitude) : null,
                longitude: job.longitude ? Number(job.longitude) : null,
                scheduledDate: job.scheduledDate?.toISOString() || null,
                scheduledTime: job.scheduledTime,
                estimatedDuration: job.estimatedDuration,
                status: job.status,
                priority: job.priority,
                customerName: job.customerName,
                customerPhone: job.customerPhone,
                customerEmail: job.customerEmail,
                notes: job.notes,
                projectId: job.projectId,
                project: job.project,
                completedAt: job.completedAt?.toISOString() || null,
                assignments: job.assignments.map((a) => ({
                    id: a.id,
                    employeeId: a.employeeId,
                    role: a.role,
                    assignedAt: a.assignedAt.toISOString(),
                    notes: a.notes,
                })),
                checklistResults: job.checklistResults.map((cr) => ({
                    id: cr.id,
                    checklistId: cr.checklistId,
                    checklistName: cr.checklist.name,
                    employeeId: cr.employeeId,
                    answers: cr.answers,
                    photos: cr.photos,
                    notes: cr.notes,
                    signedAt: cr.signedAt.toISOString(),
                    createdAt: cr.createdAt.toISOString(),
                })),
                createdAt: job.createdAt.toISOString(),
                updatedAt: job.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:field-jobs:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();

        const validation = updateFieldJobSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        // Check ownership
        const existing = await prisma.fieldJob.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json({ success: false, error: 'Pekerjaan tidak ditemukan' }, { status: 404 });
        }

        const data = validation.data;
        const updateData: Record<string, unknown> = {};

        if (data.projectId !== undefined) updateData.projectId = data.projectId || null;
        if (data.title !== undefined) updateData.title = data.title.trim();
        if (data.description !== undefined) updateData.description = data.description?.trim() || null;
        if (data.location !== undefined) updateData.location = data.location?.trim() || null;
        if (data.address !== undefined) updateData.address = data.address?.trim() || null;
        if (data.latitude !== undefined) updateData.latitude = data.latitude || null;
        if (data.longitude !== undefined) updateData.longitude = data.longitude || null;
        if (data.scheduledDate !== undefined) updateData.scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : null;
        if (data.scheduledTime !== undefined) updateData.scheduledTime = data.scheduledTime || null;
        if (data.estimatedDuration !== undefined) updateData.estimatedDuration = data.estimatedDuration || null;
        if (data.status !== undefined) {
            updateData.status = data.status;
            if (data.status === 'COMPLETED') {
                updateData.completedAt = new Date();
            }
        }
        if (data.priority !== undefined) updateData.priority = data.priority;
        if (data.customerName !== undefined) updateData.customerName = data.customerName?.trim() || null;
        if (data.customerPhone !== undefined) updateData.customerPhone = data.customerPhone?.trim() || null;
        if (data.customerEmail !== undefined) updateData.customerEmail = data.customerEmail?.trim() || null;
        if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

        const job = await prisma.fieldJob.update({
            where: { id },
            data: updateData,
        });

        await logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'FieldJob',
            entityId: job.id,
            oldValues: { status: existing.status, priority: existing.priority },
            newValues: { status: job.status, priority: job.priority },
            request,
        });

        return NextResponse.json({ success: true, data: job });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:field-jobs:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        const existing = await prisma.fieldJob.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json({ success: false, error: 'Pekerjaan tidak ditemukan' }, { status: 404 });
        }

        await prisma.fieldJob.delete({ where: { id } });

        await logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'FieldJob',
            entityId: id,
            oldValues: { title: existing.title, status: existing.status },
            request,
        });

        return NextResponse.json({ success: true, message: 'Pekerjaan berhasil dihapus' });
    } catch (error) {
        return handleApiError(error);
    }
}
