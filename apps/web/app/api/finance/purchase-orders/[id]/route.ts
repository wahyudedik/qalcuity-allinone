export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { createPurchaseOrderSchema, updatePurchaseOrderSchema, formatZodError } from '@/lib/validation-schemas';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createApprovalRequest } from '@/lib/approval';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';
import { generatePurchaseOrderJournalEntry } from '@/lib/auto-journal';
import { calculateTax } from '@/lib/ppn';
import { optimisticUpdateRaw } from '@/lib/optimistic-lock';
import { softDelete } from '@/lib/soft-delete';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:purchase-orders:${ip}`, 100, 60000);
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
                { poNumber: { contains: search } },
                { supplier: { name: { contains: search } } },
            ];
        }

        const [purchaseOrders, total] = await Promise.all([
            prisma.purchaseOrder.findMany({
                where,
                include: {
                    supplier: { select: { id: true, name: true, email: true, phone: true } },
                    items: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.purchaseOrder.count({ where }),
        ]);

        const data = purchaseOrders.map((po) => ({
            id: po.id,
            poNumber: po.poNumber,
            supplierName: po.supplier?.name || '-',
            supplierId: po.supplierId,
            subtotal: po.subtotal,
            tax: po.taxAmount,
            total: po.total,
            currency: 'IDR',
            status: po.status.toLowerCase(),
            expectedDelivery: po.deliveryDate?.toISOString().split('T')[0] || null,
            createdAt: po.createdAt.toISOString(),
            notes: po.notes || '',
            version: po.version,
            items: po.items.map((item) => ({
                id: item.id,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
            })),
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
        const rateLimitResult = checkRateLimit(`api:purchase-orders:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: MSG.TOO_MANY_REQUESTS }, { status: 429 });
        }
        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);

        const validation = createPurchaseOrderSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Generate unique PO number using timestamp + random suffix to prevent race condition
        const poNumber = `PO-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const subtotal = validatedData.items.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
        );
        const taxRate = validatedData.taxRate || 0;
        const taxCalc = calculateTax(subtotal, taxRate);
        const taxAmount = taxCalc.taxAmount;
        const total = taxCalc.total;

        let supplierId = validatedData.supplierId;
        if (!supplierId && validatedData.supplierName) {
            const supplier = await prisma.supplier.create({
                data: {
                    name: validatedData.supplierName,
                    email: validatedData.supplierEmail || undefined,
                    phone: validatedData.supplierPhone || undefined,
                    address: validatedData.supplierAddress || undefined,
                    tenantId,
                },
            });
            supplierId = supplier.id;
        }

        const purchaseOrder = await prisma.purchaseOrder.create({
            data: {
                poNumber,
                status: 'DRAFT',
                orderDate: new Date(),
                deliveryDate: validatedData.expectedDelivery ? new Date(validatedData.expectedDelivery) : undefined,
                notes: validatedData.notes || '',
                subtotal,
                taxRate,
                taxAmount,
                total,
                tenantId,
                supplierId,
                items: {
                    create: validatedData.items.map((item) => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        total: item.total || item.quantity * item.unitPrice,
                    })),
                },
            },
            include: { items: true, supplier: true },
        });

        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'PurchaseOrder', entityId: purchaseOrder.id, newValues: { poNumber: purchaseOrder.poNumber, total: purchaseOrder.total, status: purchaseOrder.status } as Record<string, unknown>, request });

        // Approval Engine: trigger approval if levels are configured
        void createApprovalRequest({
            tenantId,
            entityType: 'PURCHASE_ORDER',
            entityId: purchaseOrder.id,
            userId,
            request,
        });

        return NextResponse.json({ success: true, data: purchaseOrder }, { status: 201 });
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

        const validation = updatePurchaseOrderSchema.safeParse({ ...updateData, items });
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const existing = await prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Purchase Order not found', code: 'NOT_FOUND' },
                { status: 404 }
            );
        }

        const setClauses: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 5; // $1=id, $2=tenantId, $3=version already used

        if (validatedData.status) {
            setClauses.push(`status = $${paramIndex++}`);
            values.push(validatedData.status.toUpperCase());
        }
        if (validatedData.expectedDelivery !== undefined) {
            setClauses.push(`"deliveryDate" = $${paramIndex++}`);
            values.push(validatedData.expectedDelivery ? new Date(validatedData.expectedDelivery) : null);
        }
        if (validatedData.taxRate !== undefined) {
            setClauses.push(`"taxRate" = $${paramIndex++}`);
            values.push(validatedData.taxRate);
        }
        if (validatedData.notes !== undefined) {
            setClauses.push(`notes = $${paramIndex++}`);
            values.push(validatedData.notes);
        }

        let newSubtotal: number | undefined;
        let newTaxAmount: number | undefined;
        let newTotal: number | undefined;

        if (validatedData.items && validatedData.items.length > 0) {
            const subtotal = validatedData.items.reduce(
                (sum, item) => sum + item.quantity * item.unitPrice,
                0
            );
            const taxRate = Number(validatedData.taxRate || existing.taxRate);
            const taxCalc = calculateTax(subtotal, taxRate);
            newSubtotal = subtotal;
            newTaxAmount = taxCalc.taxAmount;
            newTotal = taxCalc.total;

            setClauses.push(`subtotal = $${paramIndex++}`);
            values.push(newSubtotal);
            setClauses.push(`"taxAmount" = $${paramIndex++}`);
            values.push(newTaxAmount);
            setClauses.push(`total = $${paramIndex++}`);
            values.push(newTotal);

            await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
            await prisma.purchaseOrderItem.createMany({
                data: validatedData.items.map((item) => ({
                    purchaseOrderId: id,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.total || item.quantity * item.unitPrice,
                })),
            });
        }

        if (setClauses.length > 0) {
            await optimisticUpdateRaw('PurchaseOrder', id, tenantId, version, setClauses.join(', '), values);
        }

        const purchaseOrder = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: { items: true, supplier: true },
        });

        const data: Record<string, unknown> = {};
        if (validatedData.status) {
            data.status = validatedData.status.toUpperCase();
        }
        if (newSubtotal !== undefined) {
            data.subtotal = newSubtotal;
            data.taxAmount = newTaxAmount;
            data.total = newTotal;
        }

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'PurchaseOrder', entityId: id, newValues: data as Record<string, unknown>, request });

        const newStatus = validatedData.status ? validatedData.status.toUpperCase() : undefined;

        // Auto Journal Entry + Stock Update: when PO status changes to PAID or RECEIVED
        if (newStatus === 'PAID' || newStatus === 'RECEIVED') {
            const fullPO = purchaseOrder;
            if (fullPO) {
                void generatePurchaseOrderJournalEntry(
                    {
                        id: fullPO.id,
                        poNumber: fullPO.poNumber,
                        total: Number(fullPO.total),
                        subtotal: Number(fullPO.subtotal),
                        taxAmount: Number(fullPO.taxAmount),
                        tenantId,
                        supplierId: fullPO.supplierId,
                        items: fullPO.items.map((item) => ({
                            id: item.id,
                            description: item.description,
                            quantity: Number(item.quantity),
                            unitPrice: Number(item.unitPrice),
                            total: Number(item.total),
                            productId: (item as Record<string, unknown>).productId as string | null,
                        })),
                    },
                    tenantId,
                    userId,
                    newStatus,
                    request
                );
            }
        }

        return NextResponse.json({ success: true, data: purchaseOrder });
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

        const existing = await prisma.purchaseOrder.findFirst({ where: { id, tenantId, deletedAt: null } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Purchase Order not found' },
                { status: 404 }
            );
        }

        // Soft delete: mark record as deleted instead of removing it
        const deleteResult = await softDelete(prisma, 'purchaseOrder', id, tenantId, userId);
        if (deleteResult.count === 0) {
            return NextResponse.json(
                { success: false, error: 'Purchase Order not found or already deleted' },
                { status: 404 }
            );
        }

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'PurchaseOrder', entityId: id, oldValues: toAuditPayload(existing), request });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
