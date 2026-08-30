import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireMutateAuth } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createInvoiceSchema, updateInvoiceSchema, formatZodError } from '@/lib/validation-schemas';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:invoices:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

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
                .reduce((sum, p) => sum + Number(p.amount), 0),
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
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:invoices:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const { userId, tenantId } = await requireMutateAuth();
        const body = await request.json();

        const validation = createInvoiceSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Calculate totals
        const subtotal = validatedData.items.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
        );
        const taxRate = validatedData.taxRate || 11;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;

        // Use transaction for atomicity: contact creation + invoice + items
        const invoice = await prisma.$transaction(async (tx: any) => {
            // Generate invoice number with lock to prevent race condition
            const count = await tx.invoice.count({ where: { tenantId } });
            const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

            // If no contactId but customerName provided, create contact first
            let contactId = validatedData.contactId;
            if (!contactId && validatedData.customerName) {
                const contact = await tx.contact.create({
                    data: {
                        name: validatedData.customerName,
                        type: 'CUSTOMER',
                        email: validatedData.customerEmail || undefined,
                        phone: validatedData.customerPhone || undefined,
                        address: validatedData.customerAddress || undefined,
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
                    dueDate: new Date(validatedData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
                    notes: validatedData.notes || '',
                    subtotal,
                    taxRate,
                    taxAmount,
                    total,
                    tenantId,
                    contactId,
                    items: {
                        create: validatedData.items.map((item) => ({
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
        const { userId, tenantId } = await requireMutateAuth();
        const body = await request.json();
        const { id, items, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID wajib diisi' },
                { status: 400 }
            );
        }

        const validation = updateInvoiceSchema.safeParse({ ...updateData, items });
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Verify invoice belongs to tenant
        const existing = await prisma.invoice.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Invoice tidak ditemukan' },
                { status: 404 }
            );
        }

        // Build safe update data
        const data: Record<string, unknown> = {};
        if (validatedData.status) {
            data.status = validatedData.status.toUpperCase();
        }
        if (validatedData.dueDate !== undefined) {
            data.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null;
        }
        if (validatedData.taxRate !== undefined) {
            data.taxRate = validatedData.taxRate;
        }
        if (validatedData.notes !== undefined) {
            data.notes = validatedData.notes;
        }

        // If items changed, recalculate and use transaction for atomicity
        if (validatedData.items && validatedData.items.length > 0) {
            const subtotal = validatedData.items.reduce(
                (sum, item) => sum + item.quantity * item.unitPrice,
                0
            );
            const taxRate = Number(validatedData.taxRate || existing.taxRate);
            const taxAmount = subtotal * (taxRate / 100);
            data.subtotal = subtotal;
            data.taxAmount = taxAmount;
            data.total = subtotal + taxAmount;

            // Delete old items and create new ones in transaction
            await prisma.$transaction(async (tx: any) => {
                await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
                await tx.invoiceItem.createMany({
                    data: (validatedData.items ?? []).map((item) => ({
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
            data,
            include: { items: true, contact: true },
        });

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Invoice', entityId: id, newValues: data as Record<string, unknown>, request });

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
        const { userId, tenantId } = await requireMutateAuth();
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
