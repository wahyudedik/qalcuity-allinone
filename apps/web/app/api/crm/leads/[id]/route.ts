import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireAuth();
        const { id } = params;

        const lead = await prisma.lead.findFirst({
            where: { id, tenantId: auth.tenantId },
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
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireAuth();
        const { id } = params;
        const body = await request.json();

        const existing = await prisma.lead.findFirst({
            where: { id, tenantId: auth.tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
        }

        const lead = await prisma.lead.update({
            where: { id },
            data: {
                ...(typeof body.name === 'string' && { name: body.name }),
                ...(typeof body.email === 'string' && { email: body.email }),
                ...(typeof body.phone === 'string' && { phone: body.phone }),
                ...(typeof body.company === 'string' && { company: body.company }),
                ...(typeof body.source === 'string' && { source: body.source }),
                ...(typeof body.status === 'string' && { status: body.status.toUpperCase() }),
                ...(typeof body.value === 'number' && { value: body.value }),
                ...(typeof body.notes === 'string' && { notes: body.notes }),
                ...(typeof body.contactId === 'string' && { contactId: body.contactId }),
            },
        });

        return NextResponse.json({ success: true, data: lead });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireAuth();
        const { id } = params;

        const existing = await prisma.lead.findFirst({
            where: { id, tenantId: auth.tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
        }

        await prisma.lead.delete({ where: { id } });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
