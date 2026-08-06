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

        const deal = await prisma.deal.findFirst({
            where: { id, tenantId: auth.tenantId },
            include: {
                contact: { select: { id: true, name: true, email: true, phone: true, address: true } },
                lead: { select: { id: true, name: true, company: true, email: true, phone: true } },
            },
        });

        if (!deal) {
            return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: deal });
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

        const existing = await prisma.deal.findFirst({
            where: { id, tenantId: auth.tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
        }

        const deal = await prisma.deal.update({
            where: { id },
            data: {
                ...(typeof body.title === 'string' && { title: body.title }),
                ...(typeof body.value === 'number' && { value: body.value }),
                ...(typeof body.stage === 'string' && { stage: body.stage.toUpperCase().replace(' ', '_') }),
                ...(typeof body.probability === 'number' && { probability: body.probability }),
                ...(body.closeDate && { closeDate: new Date(body.closeDate) }),
                ...(typeof body.notes === 'string' && { notes: body.notes }),
                ...(typeof body.contactId === 'string' && { contactId: body.contactId }),
                ...(typeof body.leadId === 'string' && { leadId: body.leadId }),
            },
        });

        return NextResponse.json({ success: true, data: deal });
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

        const existing = await prisma.deal.findFirst({
            where: { id, tenantId: auth.tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
        }

        await prisma.deal.delete({ where: { id } });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
