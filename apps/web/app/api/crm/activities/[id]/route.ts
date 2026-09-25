export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { updateActivitySchema, formatZodError } from '@/lib/validation-schemas';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';

// ─── GET /api/crm/activities/[id] ─────────────────────────────────────────────
// Ambil detail satu activity berdasarkan ID.

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:activities:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const activity = await prisma.activity.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!activity) {
            return NextResponse.json({ success: false, error: MSG.ACTIVITY_NOT_FOUND }, { status: 404 });
        }

        const data = {
            id: activity.id,
            entityType: activity.entityType,
            entityId: activity.entityId,
            type: activity.type,
            subject: activity.subject,
            description: activity.description,
            dueDate: activity.dueDate?.toISOString() || null,
            completedAt: activity.completedAt?.toISOString() || null,
            createdBy: activity.createdBy,
            createdAt: activity.createdAt.toISOString(),
            updatedAt: activity.updatedAt.toISOString(),
        };

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:activities:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        const existing = await prisma.activity.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.ACTIVITY_NOT_FOUND },
                { status: 404 }
            );
        }

        const body = await request.json();

        const validation = updateActivitySchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const sanitized = sanitizeObject(validation.data);

        const updateData: Record<string, unknown> = {};
        if (validation.data.type !== undefined) updateData.type = validation.data.type;
        if (validation.data.subject !== undefined) updateData.subject = sanitized.subject;
        if (validation.data.description !== undefined) updateData.description = sanitized.description || null;
        if (validation.data.dueDate !== undefined) updateData.dueDate = validation.data.dueDate ? new Date(validation.data.dueDate) : null;
        if (validation.data.completedAt !== undefined) updateData.completedAt = validation.data.completedAt ? new Date(validation.data.completedAt) : null;

        const activity = await prisma.activity.update({
            where: { id: params.id },
            data: updateData,
        });

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Activity', entityId: activity.id, oldValues: toAuditPayload(existing), newValues: toAuditPayload(activity), request });

        return NextResponse.json({ success: true, data: activity });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:activities:DELETE:${ip}`, 20, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        const existing = await prisma.activity.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.ACTIVITY_NOT_FOUND },
                { status: 404 }
            );
        }

        await prisma.activity.delete({
            where: { id: params.id },
        });

        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Activity', entityId: params.id, oldValues: toAuditPayload(existing), request });

        return NextResponse.json({ success: true, message: 'Activity deleted' });
    } catch (error) {
        return handleApiError(error);
    }
}
