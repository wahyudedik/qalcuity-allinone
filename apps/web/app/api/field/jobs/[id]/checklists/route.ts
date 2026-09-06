import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { submitFieldChecklistResultSchema, formatZodError } from '@/lib/validation-schemas';
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

        const job = await prisma.fieldJob.findFirst({ where: { id, tenantId } });
        if (!job) {
            return NextResponse.json({ success: false, error: 'Pekerjaan tidak ditemukan' }, { status: 404 });
        }

        const results = await prisma.fieldChecklistResult.findMany({
            where: { jobId: id, tenantId },
            include: {
                checklist: {
                    select: { id: true, name: true, category: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            success: true,
            data: results.map((r) => ({
                id: r.id,
                checklistId: r.checklistId,
                checklistName: r.checklist.name,
                checklistCategory: r.checklist.category,
                employeeId: r.employeeId,
                answers: r.answers,
                photos: r.photos,
                notes: r.notes,
                signedAt: r.signedAt.toISOString(),
                createdAt: r.createdAt.toISOString(),
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
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();

        const validation = submitFieldChecklistResultSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const job = await prisma.fieldJob.findFirst({ where: { id, tenantId } });
        if (!job) {
            return NextResponse.json({ success: false, error: 'Pekerjaan tidak ditemukan' }, { status: 404 });
        }

        const checklist = await prisma.fieldChecklist.findFirst({
            where: { id: validation.data.checklistId, tenantId },
        });
        if (!checklist) {
            return NextResponse.json({ success: false, error: 'Checklist tidak ditemukan' }, { status: 404 });
        }

        const { checklistId, employeeId, answers, photos, notes } = validation.data;

        const result = await prisma.fieldChecklistResult.create({
            data: {
                tenantId,
                jobId: id,
                checklistId,
                employeeId,
                answers: answers as object[],
                photos: photos || null,
                notes: notes?.trim() || null,
            },
        });

        await logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'FieldChecklistResult',
            entityId: result.id,
            newValues: { jobId: id, checklistId, employeeId },
            request,
        });

        return NextResponse.json({ success: true, data: result }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
