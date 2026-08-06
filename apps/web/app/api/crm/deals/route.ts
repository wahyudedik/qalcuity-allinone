import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET(request: Request) {
    try {
        const auth = await requireAuth();
        const { searchParams } = new URL(request.url);
        const stage = searchParams.get('stage');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId: auth.tenantId };

        if (stage) {
            where.stage = stage.toUpperCase().replace(' ', '_');
        }

        if (search) {
            where.OR = [
                { title: { contains: search } },
                { contact: { name: { contains: search } } },
            ];
        }

        const [deals, total] = await Promise.all([
            prisma.deal.findMany({
                where,
                include: {
                    contact: { select: { id: true, name: true, email: true } },
                    lead: { select: { id: true, name: true, company: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.deal.count({ where }),
        ]);

        const data = deals.map((deal) => ({
            id: deal.id,
            title: deal.title,
            value: deal.value,
            stage: deal.stage.charAt(0) + deal.stage.slice(1).toLowerCase().replace(/_/g, ' '),
            probability: deal.probability,
            closeDate: deal.closeDate?.toISOString() || null,
            notes: deal.notes,
            contactId: deal.contactId,
            contactName: deal.contact?.name || null,
            leadId: deal.leadId,
            leadCompany: deal.lead?.company || null,
            createdAt: deal.createdAt.toISOString(),
        }));

        return NextResponse.json({
            success: true,
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireAuth();
        const body = await request.json();

        if (!body.title) {
            return NextResponse.json(
                { success: false, error: 'Deal title is required' },
                { status: 400 }
            );
        }

        const deal = await prisma.deal.create({
            data: {
                tenantId: auth.tenantId,
                title: body.title,
                value: body.value || 0,
                stage: (body.stage || 'DISCOVERY').toUpperCase().replace(' ', '_'),
                probability: body.probability || 0,
                closeDate: body.closeDate ? new Date(body.closeDate) : null,
                notes: body.notes || null,
                contactId: body.contactId || null,
                leadId: body.leadId || null,
            },
            include: {
                contact: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json({ success: true, data: deal }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}

export async function PUT(request: Request) {
    try {
        const auth = await requireAuth();
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const existing = await prisma.deal.findFirst({
            where: { id, tenantId: auth.tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Deal not found' },
                { status: 404 }
            );
        }

        const deal = await prisma.deal.update({
            where: { id },
            data: {
                ...(typeof updateData.title === 'string' && { title: updateData.title }),
                ...(typeof updateData.value === 'number' && { value: updateData.value }),
                ...(typeof updateData.stage === 'string' && { stage: updateData.stage.toUpperCase().replace(' ', '_') }),
                ...(typeof updateData.probability === 'number' && { probability: updateData.probability }),
                ...(updateData.closeDate && { closeDate: new Date(updateData.closeDate) }),
                ...(typeof updateData.notes === 'string' && { notes: updateData.notes }),
                ...(typeof updateData.contactId === 'string' && { contactId: updateData.contactId }),
                ...(typeof updateData.leadId === 'string' && { leadId: updateData.leadId }),
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

export async function DELETE(request: Request) {
    try {
        const auth = await requireAuth();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const existing = await prisma.deal.findFirst({
            where: { id, tenantId: auth.tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Deal not found' },
                { status: 404 }
            );
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
