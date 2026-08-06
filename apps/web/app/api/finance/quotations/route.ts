import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET(request: Request) {
    try {
        const { tenantId } = await requireAuth();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (status) {
            where.status = status.toUpperCase();
        }

        if (search) {
            where.OR = [
                { quotationNumber: { contains: search } },
                { contact: { name: { contains: search } } },
            ];
        }

        const [quotations, total] = await Promise.all([
            prisma.quotation.findMany({
                where,
                include: {
                    contact: { select: { id: true, name: true, email: true, phone: true } },
                    items: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.quotation.count({ where }),
        ]);

        const data = quotations.map((q) => ({
            id: q.id,
            quotationNumber: q.quotationNumber,
            customerName: q.contact?.name || '-',
            contactId: q.contactId,
            subtotal: q.subtotal,
            tax: q.taxAmount,
            total: q.total,
            currency: 'IDR',
            status: q.status.toLowerCase(),
            validUntil: q.validUntil.toISOString().split('T')[0],
            notes: q.notes || '',
            terms: q.terms || '',
            items: q.items.map((item) => ({
                id: item.id,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
            })),
            createdAt: q.createdAt.toISOString(),
        }));

        return NextResponse.json({
            success: true,
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { tenantId } = await requireAuth();
        const body = await request.json();

        if (!body.contactId && !body.customerName) {
            return NextResponse.json(
                { success: false, error: 'Customer is required' },
                { status: 400 }
            );
        }

        if (!body.items || body.items.length === 0) {
            return NextResponse.json(
                { success: false, error: 'At least one item is required' },
                { status: 400 }
            );
        }

        const count = await prisma.quotation.count({ where: { tenantId } });
        const quotationNumber = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

        const subtotal = body.items.reduce(
            (sum: number, item: { quantity: number; unitPrice: number }) =>
                sum + item.quantity * item.unitPrice,
            0
        );
        const taxRate = body.taxRate || 11;
        const taxAmount = subtotal * (taxRate / 100);
        const discount = body.discount || 0;
        const total = subtotal + taxAmount - discount;

        let contactId = body.contactId;
        if (!contactId && body.customerName) {
            const contact = await prisma.contact.create({
                data: {
                    name: body.customerName,
                    type: 'CUSTOMER',
                    email: body.customerEmail || undefined,
                    phone: body.customerPhone || undefined,
                    address: body.customerAddress || undefined,
                    tenantId,
                },
            });
            contactId = contact.id;
        }

        const quotation = await prisma.quotation.create({
            data: {
                quotationNumber,
                status: 'DRAFT',
                validUntil: new Date(body.validUntil || Date.now() + 30 * 24 * 60 * 60 * 1000),
                notes: body.notes || '',
                terms: body.terms || '',
                subtotal,
                taxRate,
                taxAmount,
                discount,
                total,
                tenantId,
                contactId,
                items: {
                    create: body.items.map((item: { description: string; quantity: number; unitPrice: number; total?: number }) => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        total: item.total || item.quantity * item.unitPrice,
                    })),
                },
            },
            include: { items: true, contact: true },
        });

        return NextResponse.json({ success: true, data: quotation }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { tenantId } = await requireAuth();
        const body = await request.json();
        const { id, items, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const existing = await prisma.quotation.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Quotation not found' },
                { status: 404 }
            );
        }

        if (updateData.status) {
            updateData.status = updateData.status.toUpperCase();
        }
        if (updateData.validUntil) {
            updateData.validUntil = new Date(updateData.validUntil);
        }

        if (items && items.length > 0) {
            const subtotal = items.reduce(
                (sum: number, item: { quantity: number; unitPrice: number }) =>
                    sum + item.quantity * item.unitPrice,
                0
            );
            const taxRate = updateData.taxRate || existing.taxRate;
            const taxAmount = subtotal * (taxRate / 100);
            const discount = updateData.discount || existing.discount;
            updateData.subtotal = subtotal;
            updateData.taxAmount = taxAmount;
            updateData.total = subtotal + taxAmount - discount;

            await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
            await prisma.quotationItem.createMany({
                data: items.map((item: { description: string; quantity: number; unitPrice: number; total?: number }) => ({
                    quotationId: id,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.total || item.quantity * item.unitPrice,
                })),
            });
        }

        const quotation = await prisma.quotation.update({
            where: { id },
            data: updateData,
            include: { items: true, contact: true },
        });

        return NextResponse.json({ success: true, data: quotation });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { tenantId } = await requireAuth();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const existing = await prisma.quotation.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Quotation not found' },
                { status: 404 }
            );
        }

        await prisma.quotation.delete({ where: { id } });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
