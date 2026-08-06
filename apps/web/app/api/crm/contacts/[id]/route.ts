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

        const contact = await prisma.contact.findFirst({
            where: { id, tenantId: auth.tenantId },
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

        const existing = await prisma.contact.findFirst({
            where: { id, tenantId: auth.tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
        }

        const contact = await prisma.contact.update({
            where: { id },
            data: {
                ...(typeof body.name === 'string' && { name: body.name }),
                ...(typeof body.email === 'string' && { email: body.email }),
                ...(typeof body.phone === 'string' && { phone: body.phone }),
                ...(typeof body.company === 'string' && { company: body.company }),
                ...(typeof body.type === 'string' && { type: body.type.toUpperCase() }),
                ...(typeof body.position === 'string' && { position: body.position }),
                ...(typeof body.address === 'string' && { address: body.address }),
                ...(typeof body.notes === 'string' && { notes: body.notes }),
            },
        });

        return NextResponse.json({ success: true, data: contact });
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

        const existing = await prisma.contact.findFirst({
            where: { id, tenantId: auth.tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
        }

        await prisma.contact.delete({ where: { id } });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
