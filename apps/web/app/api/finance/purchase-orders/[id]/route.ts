import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updatePurchaseOrderSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const po = await prisma.purchaseOrder.findFirst({
            where: { id, tenantId },
            include: {
                supplier: true,
                items: true,
            },
        });

        if (!po) {
            return NextResponse.json(
                { success: false, error: 'Purchase Order not found' },
                { status: 404 }
            );
        }

        const data = {
            id: po.id,
            poNumber: po.poNumber,
            supplierName: po.supplier?.name || '-',
            supplierAddress: po.supplier?.address || '',
            supplierEmail: po.supplier?.email || '',
            supplierId: po.supplierId,
            items: po.items.map((item) => ({
                id: item.id,
                name: item.description,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
            })),
            subtotal: po.subtotal,
            tax: po.taxAmount,
            total: po.total,
            currency: 'IDR',
            status: po.status.toLowerCase(),
            expectedDelivery: po.deliveryDate?.toISOString().split('T')[0] || null,
            createdAt: po.createdAt.toISOString(),
            notes: po.notes || '',
        };

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;
        const body = await request.json();

        const { items, ...restBody } = body;
        const validation = updatePurchaseOrderSchema.safeParse({ ...restBody, items });
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
                { success: false, error: 'Purchase Order tidak ditemukan' },
                { status: 404 }
            );
        }

        const updateData: Record<string, unknown> = {};
        if (validatedData.status) {
            const newStatus = validatedData.status.toUpperCase();
            const currentStatus = existing.status;
            if (newStatus !== currentStatus) {
                try {
                    const { canTransitionSafe, logWorkflowHistory } = await import('@/lib/workflow');
                    const isValid = canTransitionSafe('PURCHASE_ORDER', currentStatus, newStatus, tenantId);
                    if (!isValid) {
                        return NextResponse.json(
                            { success: false, error: `Transisi status tidak valid: ${currentStatus} → ${newStatus}` },
                            { status: 400 }
                        );
                    }
                    // Log workflow history dengan backward compatibility
                    await logWorkflowHistory({
                        tenantId,
                        entityType: 'PURCHASE_ORDER',
                        entityId: id,
                        fromState: currentStatus,
                        toState: newStatus,
                        action: newStatus.toLowerCase(),
                        userId,
                        notes: null,
                    });
                } catch (workflowError: unknown) {
                    // Backward compatibility: jika workflow engine gagal, tetap izinkan perubahan status
                    const msg = workflowError instanceof Error ? workflowError.message : 'Unknown error';
                    console.warn(`[Workflow] Purchase Order workflow validation gagal, mengizinkan transisi: ${msg}`);
                }
            }
            updateData.status = newStatus;
        }
        if (validatedData.expectedDelivery !== undefined) {
            updateData.deliveryDate = validatedData.expectedDelivery ? new Date(validatedData.expectedDelivery) : null;
        }
        if (validatedData.taxRate !== undefined) {
            updateData.taxRate = validatedData.taxRate;
        }
        if (validatedData.notes !== undefined) {
            updateData.notes = validatedData.notes;
        }

        if (validatedData.items && validatedData.items.length > 0) {
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

            const subtotal = validatedData.items.reduce(
                (sum, item) => sum + item.quantity * item.unitPrice,
                0
            );
            const taxRate = Number(validatedData.taxRate || existing.taxRate);
            const taxAmount = subtotal * (taxRate / 100);
            updateData.subtotal = subtotal;
            updateData.taxAmount = taxAmount;
            updateData.total = subtotal + taxAmount;
        }

        const po = await prisma.purchaseOrder.update({
            where: { id },
            data: updateData,
            include: { items: true, supplier: true },
        });

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'PurchaseOrder', entityId: id, newValues: updateData as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: po });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;

        const existing = await prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Purchase Order not found' },
                { status: 404 }
            );
        }

        await prisma.purchaseOrder.delete({ where: { id } });

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'PurchaseOrder', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
