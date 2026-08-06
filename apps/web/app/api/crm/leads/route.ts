import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET(request: Request) {
    try {
        const auth = await requireAuth();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId: auth.tenantId };

        if (status) {
            where.status = status.toUpperCase();
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { company: { contains: search } },
                { email: { contains: search } },
            ];
        }

        const [leads, total] = await Promise.all([
            prisma.lead.findMany({
                where,
                include: {
                    contact: { select: { id: true, name: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.lead.count({ where }),
        ]);

        const data = leads.map((lead) => ({
            id: lead.id,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            source: lead.source,
            status: lead.status.toLowerCase(),
            value: lead.value,
            notes: lead.notes,
            contactId: lead.contactId,
            contactName: lead.contact?.name || null,
            createdAt: lead.createdAt.toISOString(),
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

        if (!body.name) {
            return NextResponse.json(
                { success: false, error: 'Lead name is required' },
                { status: 400 }
            );
        }

        const lead = await prisma.lead.create({
            data: {
                tenantId: auth.tenantId,
                name: body.name,
                email: body.email || null,
                phone: body.phone || null,
                company: body.company || null,
                source: body.source || null,
                status: (body.status || 'NEW').toUpperCase(),
                value: body.value || 0,
                notes: body.notes || null,
                contactId: body.contactId || null,
            },
        });

        return NextResponse.json({ success: true, data: lead }, { status: 201 });
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

        const existing = await prisma.lead.findFirst({
            where: { id, tenantId: auth.tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Lead not found' },
                { status: 404 }
            );
        }

        const lead = await prisma.lead.update({
            where: { id },
            data: {
                ...(typeof updateData.name === 'string' && { name: updateData.name }),
                ...(typeof updateData.email === 'string' && { email: updateData.email }),
                ...(typeof updateData.phone === 'string' && { phone: updateData.phone }),
                ...(typeof updateData.company === 'string' && { company: updateData.company }),
                ...(typeof updateData.source === 'string' && { source: updateData.source }),
                ...(typeof updateData.status === 'string' && { status: updateData.status.toUpperCase() }),
                ...(typeof updateData.value === 'number' && { value: updateData.value }),
                ...(typeof updateData.notes === 'string' && { notes: updateData.notes }),
                ...(typeof updateData.contactId === 'string' && { contactId: updateData.contactId }),
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

        const existing = await prisma.lead.findFirst({
            where: { id, tenantId: auth.tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Lead not found' },
                { status: 404 }
            );
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
