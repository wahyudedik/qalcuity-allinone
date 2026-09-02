import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { createQuotationSchema, updateQuotationSchema, formatZodError } from '@/lib/validation-schemas';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createApprovalRequest } from '@/lib/approval';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:quotations:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: 'Terlalu banyak request. Silakan coba lagi.' }, { status: 429 });
        }
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

        const data = quotations.map((q: any) => ({
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
            items: q.items.map((item: any) => ({
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
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:quotations:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: 'Terlalu banyak request. Silakan coba lagi.' }, { status: 429 });
        }
        const body = await request.json();

        const validation = createQuotationSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const count = await prisma.quotation.count({ where: { tenantId } });
        const quotationNumber = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

        const subtotal = validatedData.items.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
        );
        const taxRate = validatedData.taxRate || 11;
        const taxAmount = subtotal * (taxRate / 100);
        const discount = validatedData.discount || 0;
        const total = subtotal + taxAmount - discount;

        let contactId = validatedData.contactId;
        if (!contactId && validatedData.customerName) {
            const contact = await prisma.contact.create({
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

        const quotation = await prisma.quotation.create({
            data: {
                quotationNumber,
                status: 'DRAFT',
                validUntil: new Date(validatedData.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
                notes: validatedData.notes || '',
                terms: validatedData.terms || '',
                subtotal,
                taxRate,
                taxAmount,
                discount,
                total,
                tenantId,
                contactId,
                items: {
                    create: validatedData.items.map((item: any) => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        total: item.total || item.quantity * item.unitPrice,
                    })),
                },
            },
            include: { items: true, contact: true },
        });

        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'Quotation', entityId: quotation.id, newValues: { quotationNumber: quotation.quotationNumber, total: quotation.total, status: quotation.status } as Record<string, unknown>, request });

        // Approval Engine: trigger approval if levels are configured
        void createApprovalRequest({
            tenantId,
            entityType: 'QUOTATION',
            entityId: quotation.id,
            userId,
            request,
        });

        return NextResponse.json({ success: true, data: quotation }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();
        const { id, items, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID wajib diisi' },
                { status: 400 }
            );
        }

        const validation = updateQuotationSchema.safeParse({ ...updateData, items });
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const existing = await prisma.quotation.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Quotation tidak ditemukan' },
                { status: 404 }
            );
        }

        const data: Record<string, unknown> = {};
        if (validatedData.status) {
            data.status = validatedData.status.toUpperCase();
        }
        if (validatedData.validUntil !== undefined) {
            data.validUntil = validatedData.validUntil ? new Date(validatedData.validUntil) : null;
        }
        if (validatedData.taxRate !== undefined) {
            data.taxRate = validatedData.taxRate;
        }
        if (validatedData.discount !== undefined) {
            data.discount = validatedData.discount;
        }
        if (validatedData.notes !== undefined) {
            data.notes = validatedData.notes;
        }
        if (validatedData.terms !== undefined) {
            data.terms = validatedData.terms;
        }

        if (validatedData.items && validatedData.items.length > 0) {
            const subtotal = validatedData.items.reduce(
                (sum, item) => sum + item.quantity * item.unitPrice,
                0
            );
            const taxRate = Number(validatedData.taxRate || existing.taxRate);
            const taxAmount = subtotal * (taxRate / 100);
            const discount = Number(validatedData.discount || existing.discount);
            data.subtotal = subtotal;
            data.taxAmount = taxAmount;
            data.total = subtotal + taxAmount - discount;

            await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
            await prisma.quotationItem.createMany({
                data: validatedData.items.map((item: any) => ({
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
            data,
            include: { items: true, contact: true },
        });

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Quotation', entityId: id, newValues: data as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: quotation });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
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

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Quotation', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
