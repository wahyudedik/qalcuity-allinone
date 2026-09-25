export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { createQuotationSchema, updateQuotationSchema, formatZodError } from '@/lib/validation-schemas';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createApprovalRequest } from '@/lib/approval';
import { sanitizeObject } from '@/lib/sanitize';
import { handleApiError, apiNotFound } from '@/lib/api-error';
import { calculateTax } from '@/lib/ppn';
import { optimisticUpdateRaw } from '@/lib/optimistic-lock';
import { softDelete } from '@/lib/soft-delete';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:quotations:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: MSG.TOO_MANY_REQUESTS }, { status: 429 });
        }
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId, deletedAt: null };

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
            version: q.version,
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
    } catch (error) {
        return handleApiError(error);
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
            return NextResponse.json({ error: MSG.TOO_MANY_REQUESTS }, { status: 429 });
        }
        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);

        const validation = createQuotationSchema.safeParse(sanitizedBody);
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
        const taxRate = validatedData.taxRate || 0;
        const discount = validatedData.discount || 0;
        const taxCalc = calculateTax(subtotal, taxRate, discount);
        const taxAmount = taxCalc.taxAmount;
        const total = taxCalc.total;

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
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const { id, items, version, ...updateData } = sanitizedBody;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required', code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        if (typeof version !== 'number') {
            return NextResponse.json(
                { success: false, error: 'version is required for updates', code: 'VERSION_REQUIRED' },
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
            return apiNotFound('Quotation');
        }

        const setClauses: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 5; // $1=id, $2=tenantId, $3=version already used

        if (validatedData.status) {
            setClauses.push(`status = $${paramIndex++}`);
            values.push(validatedData.status.toUpperCase());
        }
        if (validatedData.validUntil !== undefined) {
            setClauses.push(`"validUntil" = $${paramIndex++}`);
            values.push(validatedData.validUntil ? new Date(validatedData.validUntil) : null);
        }
        if (validatedData.taxRate !== undefined) {
            setClauses.push(`"taxRate" = $${paramIndex++}`);
            values.push(validatedData.taxRate);
        }
        if (validatedData.discount !== undefined) {
            setClauses.push(`discount = $${paramIndex++}`);
            values.push(validatedData.discount);
        }
        if (validatedData.notes !== undefined) {
            setClauses.push(`notes = $${paramIndex++}`);
            values.push(validatedData.notes);
        }
        if (validatedData.terms !== undefined) {
            setClauses.push(`terms = $${paramIndex++}`);
            values.push(validatedData.terms);
        }

        if (validatedData.items && validatedData.items.length > 0) {
            const subtotal = validatedData.items.reduce(
                (sum, item) => sum + item.quantity * item.unitPrice,
                0
            );
            const taxRate = Number(validatedData.taxRate || existing.taxRate);
            const discount = Number(validatedData.discount || existing.discount);
            const taxCalc = calculateTax(subtotal, taxRate, discount);

            setClauses.push(`subtotal = $${paramIndex++}`);
            values.push(subtotal);
            setClauses.push(`"taxAmount" = $${paramIndex++}`);
            values.push(taxCalc.taxAmount);
            setClauses.push(`total = $${paramIndex++}`);
            values.push(taxCalc.total);

            await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
            await prisma.quotationItem.createMany({
                data: validatedData.items.map((item) => ({
                    quotationId: id,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.total || item.quantity * item.unitPrice,
                })),
            });
        }

        if (setClauses.length > 0) {
            await optimisticUpdateRaw('Quotation', id, tenantId, version, setClauses.join(', '), values);
        }

        const quotation = await prisma.quotation.findUnique({
            where: { id },
            include: { items: true, contact: true },
        });

        const data: Record<string, unknown> = {};
        if (validatedData.status) {
            data.status = validatedData.status.toUpperCase();
        }

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Quotation', entityId: id, newValues: data as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: quotation });
    } catch (error) {
        return handleApiError(error);
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

        const existing = await prisma.quotation.findFirst({ where: { id, tenantId, deletedAt: null } });
        if (!existing) {
            return apiNotFound('Quotation');
        }

        // Soft delete: mark record as deleted instead of removing it
        const deleteResult = await softDelete(prisma, 'quotation', id, tenantId, userId);
        if (deleteResult.count === 0) {
            return NextResponse.json(
                { success: false, error: 'Quotation not found or already deleted' },
                { status: 404 }
            );
        }

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Quotation', entityId: id, oldValues: toAuditPayload(existing), request });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
