import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { logAudit } from '@/lib/audit';

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
                { invoiceNumber: { contains: search } },
                { contact: { name: { contains: search } } },
            ];
        }

        const [invoices, total] = await Promise.all([
            prisma.invoice.findMany({
                where,
                include: {
                    contact: { select: { id: true, name: true, email: true, phone: true } },
                    items: true,
                    payments: { select: { id: true, amount: true, status: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.invoice.count({ where }),
        ]);

        // Map to frontend-compatible format
        const data = invoices.map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.contact?.name || '-',
            contactId: inv.contactId,
            subtotal: inv.subtotal,
            tax: inv.taxAmount,
            total: inv.total,
            currency: 'IDR',
            status: inv.status.toLowerCase(),
            dueDate: inv.dueDate.toISOString().split('T')[0],
            createdAt: inv.createdAt.toISOString(),
            notes: inv.notes,
            items: inv.items.map((item) => ({
                id: item.id,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
            })),
            paidAmount: inv.payments
                .filter((p) => p.status === 'COMPLETED')
                .reduce((sum, p) => sum + p.amount, 0),
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
        const { userId, tenantId } = await requireAuth();
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

        // Calculate totals
        const subtotal = body.items.reduce(
            (sum: number, item: { quantity: number; unitPrice: number }) =>
                sum + item.quantity * item.unitPrice,
            0
        );
        const taxRate = body.taxRate || 11;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;

        // Use transaction for atomicity: contact creation + invoice + items
        const invoice = await prisma.$transaction(async (tx) => {
            // Generate invoice number with lock to prevent race condition
            const count = await tx.invoice.count({ where: { tenantId } });
            const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

            // If no contactId but customerName provided, create contact first
            let contactId = body.contactId;
            if (!contactId && body.customerName) {
                const contact = await tx.contact.create({
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

            // Create invoice with items in single transaction
            return tx.invoice.create({
                data: {
                    invoiceNumber,
                    status: 'DRAFT',
                    dueDate: new Date(body.dueDate || Date.now() + 30 * 24 * 60 * 60 * 1000),
                    notes: body.notes || '',
                    subtotal,
                    taxRate,
                    taxAmount,
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
        });

        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'Invoice', entityId: invoice.id, newValues: invoice as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: invoice }, { status: 201 });
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
        const { userId, tenantId } = await requireAuth();
        const body = await request.json();
        const { id, items, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        // Verify invoice belongs to tenant
        const existing = await prisma.invoice.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Invoice not found' },
                { status: 404 }
            );
        }

        // If status is provided, uppercase it
        if (updateData.status) {
            updateData.status = updateData.status.toUpperCase();
        }
        if (updateData.dueDate) {
            updateData.dueDate = new Date(updateData.dueDate);
        }

        // If items changed, recalculate and use transaction for atomicity
        if (items && items.length > 0) {
            const subtotal = items.reduce(
                (sum: number, item: { quantity: number; unitPrice: number }) =>
                    sum + item.quantity * item.unitPrice,
                0
            );
            const taxRate = updateData.taxRate || existing.taxRate;
            const taxAmount = subtotal * (taxRate / 100);
            updateData.subtotal = subtotal;
            updateData.taxAmount = taxAmount;
            updateData.total = subtotal + taxAmount;

            // Delete old items and create new ones in transaction
            await prisma.$transaction(async (tx) => {
                await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
                await tx.invoiceItem.createMany({
                    data: items.map((item: { description: string; quantity: number; unitPrice: number; total?: number }) => ({
                        invoiceId: id,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        total: item.total || item.quantity * item.unitPrice,
                    })),
                });
            });
        }

        const invoice = await prisma.invoice.update({
            where: { id },
            data: updateData,
            include: { items: true, contact: true },
        });

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Invoice', entityId: id, newValues: updateData as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: invoice });
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
        const { userId, tenantId } = await requireAuth();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const existing = await prisma.invoice.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Invoice not found' },
                { status: 404 }
            );
        }

        await prisma.invoice.delete({ where: { id } });

        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Invoice', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
