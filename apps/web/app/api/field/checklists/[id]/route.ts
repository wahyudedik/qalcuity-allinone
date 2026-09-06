import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { updateFieldChecklistSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:field-checklist:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const checklist = await prisma.fieldChecklist.findFirst({
            where: { id, tenantId },
            include: {
                _count: {
                    select: { results: true },
                },
            },
        });

        if (!checklist) {
            return NextResponse.json({ success: false, error: 'Checklist tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: checklist.id,
                name: checklist.name,
                description: checklist.description,
                category: checklist.category,
                items: checklist.items,
                isActive: checklist.isActive,
                usageCount: checklist._count.results,
                createdAt: checklist.createdAt.toISOString(),
                updatedAt: checklist.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:field-checklist:${ip}`, 30, 60000);
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

        const validation = updateFieldChecklistSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const existing = await prisma.fieldChecklist.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Checklist tidak ditemukan' }, { status: 404 });
        }

        const updateData: Record<string, unknown> = {};
        if (validation.data.name !== undefined) updateData.name = validation.data.name.trim();
        if (validation.data.description !== undefined) updateData.description = validation.data.description?.trim() || null;
        if (validation.data.category !== undefined) updateData.category = validation.data.category;
        if (validation.data.items !== undefined) updateData.items = validation.data.items as object[];
        if (validation.data.isActive !== undefined) updateData.isActive = validation.data.isActive;

        const updated = await prisma.fieldChecklist.update({
            where: { id },
            data: updateData,
        });

        await logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'FieldChecklist',
            entityId: id,
            oldValues: { name: existing.name, category: existing.category },
            newValues: { name: updated.name, category: updated.category },
            request,
        });

        return NextResponse.json({ success: true, data: updated });
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
        const rateLimitResult = checkRateLimit(`api:field-checklist:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        const existing = await prisma.fieldChecklist.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Checklist tidak ditemukan' }, { status: 404 });
        }

        await prisma.fieldChecklist.delete({
            where: { id },
        });

        await logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'FieldChecklist',
            entityId: id,
            oldValues: { name: existing.name, category: existing.category },
            request,
        });

        return NextResponse.json({ success: true, message: 'Checklist berhasil dihapus' });
    } catch (error) {
        return handleApiError(error);
    }
}
