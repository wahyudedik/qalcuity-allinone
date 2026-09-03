import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updateActivitySchema, formatZodError } from '@/lib/validation-schemas';
import { sanitizeObject } from '@/lib/sanitize';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const activity = await prisma.activity.findFirst({
            where: { id, tenantId },
        });

        if (!activity) {
            return NextResponse.json({ success: false, error: 'Activity not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: activity });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PUT(
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
        const validation = updateActivitySchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const existing = await prisma.activity.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Activity not found' }, { status: 404 });
        }

        // Sanitize text inputs
        const sanitized = sanitizeObject(validation.data);

        const activity = await prisma.activity.update({
            where: { id },
            data: {
                ...(typeof sanitized.type === 'string' && { type: (sanitized.type as string).toUpperCase() }),
                ...(typeof sanitized.subject === 'string' && { subject: sanitized.subject as string }),
                ...(sanitized.description !== undefined && { description: (sanitized.description as string) || null }),
                ...(validation.data.dueDate !== undefined && {
                    dueDate: validation.data.dueDate ? new Date(validation.data.dueDate) : null,
                }),
                ...(validation.data.completedAt !== undefined && {
                    completedAt: validation.data.completedAt ? new Date(validation.data.completedAt) : null,
                }),
            },
        });

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Activity', entityId: id, newValues: body as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: activity });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body';
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;

        const existing = await prisma.activity.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Activity not found' }, { status: 404 });
        }

        await prisma.activity.delete({ where: { id } });

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Activity', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
