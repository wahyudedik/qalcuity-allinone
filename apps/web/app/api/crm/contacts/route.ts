import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET(request: Request) {
    try {
        const auth = await requireAuth();
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId: auth.tenantId };

        if (type) {
            where.type = type.toUpperCase();
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } },
                { address: { contains: search } },
            ];
        }

        const [contacts, total] = await Promise.all([
            prisma.contact.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            invoices: true,
                            deals: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.contact.count({ where }),
        ]);

        const data = contacts.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            type: c.type.toLowerCase(),
            address: c.address,
            city: c.city,
            province: c.province,
            postalCode: c.postalCode,
            taxId: c.taxId,
            notes: c.notes,
            isActive: c.isActive,
            totalDeals: c._count.deals,
            totalInvoices: c._count.invoices,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
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
                { success: false, error: 'Name is required' },
                { status: 400 }
            );
        }

        const contact = await prisma.contact.create({
            data: {
                tenantId: auth.tenantId,
                name: body.name,
                email: body.email || null,
                phone: body.phone || null,
                type: (body.type || 'CUSTOMER').toUpperCase(),
                address: body.address || null,
                city: body.city || null,
                province: body.province || null,
                postalCode: body.postalCode || null,
                taxId: body.taxId || null,
                notes: body.notes || null,
            },
        });

        return NextResponse.json({ success: true, data: contact }, { status: 201 });
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

        const existing = await prisma.contact.findFirst({
            where: { id, tenantId: auth.tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Contact not found' },
                { status: 404 }
            );
        }

        const contact = await prisma.contact.update({
            where: { id },
            data: {
                ...(typeof updateData.name === 'string' && { name: updateData.name }),
                ...(typeof updateData.email === 'string' && { email: updateData.email }),
                ...(typeof updateData.phone === 'string' && { phone: updateData.phone }),
                ...(typeof updateData.type === 'string' && { type: updateData.type.toUpperCase() }),
                ...(typeof updateData.address === 'string' && { address: updateData.address }),
                ...(typeof updateData.city === 'string' && { city: updateData.city }),
                ...(typeof updateData.province === 'string' && { province: updateData.province }),
                ...(typeof updateData.postalCode === 'string' && { postalCode: updateData.postalCode }),
                ...(typeof updateData.taxId === 'string' && { taxId: updateData.taxId }),
                ...(typeof updateData.notes === 'string' && { notes: updateData.notes }),
                ...(typeof updateData.isActive === 'boolean' && { isActive: updateData.isActive }),
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

        const existing = await prisma.contact.findFirst({
            where: { id, tenantId: auth.tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Contact not found' },
                { status: 404 }
            );
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
