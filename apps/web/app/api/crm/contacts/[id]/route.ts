import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updateContactSchema, formatZodError } from '@/lib/validation-schemas';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const contact = await prisma.contact.findFirst({
            where: { id, tenantId },
            include: {
                invoices: {
                    select: { id: true, invoiceNumber: true, total: true, status: true, createdAt: true },
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
                deals: {
                    select: { id: true, title: true, value: true, stage: true, createdAt: true },
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
        });

        if (!contact) {
            return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: contact });
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
        const validation = updateContactSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const existing = await prisma.contact.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
        }

        const contact = await prisma.contact.update({
            where: { id },
            data: {
                ...(typeof validation.data.name === 'string' && { name: validation.data.name }),
                ...(typeof validation.data.email === 'string' && { email: validation.data.email }),
                ...(typeof validation.data.phone === 'string' && { phone: validation.data.phone }),
                ...(typeof validation.data.company === 'string' && { company: validation.data.company }),
                ...(typeof validation.data.type === 'string' && { type: validation.data.type.toUpperCase() }),
                ...(typeof validation.data.position === 'string' && { position: validation.data.position }),
                ...(typeof validation.data.address === 'string' && { address: validation.data.address }),
                ...(typeof validation.data.notes === 'string' && { notes: validation.data.notes }),
            },
        });

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Contact', entityId: id, newValues: body as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: contact });
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

        const existing = await prisma.contact.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
        }

        await prisma.contact.delete({ where: { id } });

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Contact', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
