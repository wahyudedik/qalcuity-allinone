import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updateLeadSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const lead = await prisma.lead.findFirst({
            where: { id, tenantId },
            include: {
                contact: { select: { id: true, name: true, email: true, phone: true } },
                deals: {
                    select: { id: true, title: true, value: true, stage: true, probability: true, createdAt: true },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!lead) {
            return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: lead });
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
        const validation = updateLeadSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const existing = await prisma.lead.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
        }

        const lead = await prisma.lead.update({
            where: { id },
            data: {
                ...(typeof validation.data.name === 'string' && { name: validation.data.name }),
                ...(typeof validation.data.email === 'string' && { email: validation.data.email }),
                ...(typeof validation.data.phone === 'string' && { phone: validation.data.phone }),
                ...(typeof validation.data.company === 'string' && { company: validation.data.company }),
                ...(typeof validation.data.source === 'string' && { source: validation.data.source }),
                ...(typeof validation.data.status === 'string' && { status: validation.data.status.toUpperCase() }),
                ...(typeof validation.data.value === 'number' && { value: validation.data.value }),
                ...(typeof validation.data.notes === 'string' && { notes: validation.data.notes }),
                ...(typeof validation.data.contactId === 'string' && { contactId: validation.data.contactId }),
            },
        });

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Lead', entityId: id, newValues: body as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: lead });
    } catch (error) {
        return handleApiError(error);
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

        const existing = await prisma.lead.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
        }

        await prisma.lead.delete({ where: { id } });

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Lead', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
