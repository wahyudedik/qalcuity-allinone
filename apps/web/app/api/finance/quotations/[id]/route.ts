import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updateQuotationSchema, formatZodError } from '@/lib/validation-schemas';
import { WorkflowEngine } from '@qalcuity/workflow';
import { sanitizeObject } from '@/lib/sanitize';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const quotation = await prisma.quotation.findFirst({
            where: { id, tenantId },
            include: {
                contact: true,
                items: true,
            },
        });

        if (!quotation) {
            return NextResponse.json(
                { success: false, error: 'Quotation not found' },
                { status: 404 }
            );
        }

        const data = {
            id: quotation.id,
            quotationNumber: quotation.quotationNumber,
            customerName: quotation.contact?.name || '-',
            customerAddress: quotation.contact?.address || '',
            customerEmail: quotation.contact?.email || '',
            contactId: quotation.contactId,
            items: quotation.items.map((item) => ({
                id: item.id,
                name: item.description,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
            })),
            subtotal: quotation.subtotal,
            tax: quotation.taxAmount,
            total: quotation.total,
            currency: 'IDR',
            status: quotation.status.toLowerCase(),
            validUntil: quotation.validUntil.toISOString().split('T')[0],
            createdAt: quotation.createdAt.toISOString(),
            notes: quotation.notes || '',
            terms: quotation.terms || '',
            discount: quotation.discount,
        };

        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
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
        const sanitizedBody = sanitizeObject(body);

        const { items, ...restBody } = sanitizedBody;
        const validation = updateQuotationSchema.safeParse({ ...restBody, items });
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

        const updateData: Record<string, string | number | boolean | Date | null | undefined> = {};
        if (validatedData.status) {
            const newStatus = validatedData.status.toUpperCase();
            const currentStatus = existing.status;
            if (newStatus !== currentStatus) {
                // Workflow engine: validasi transisi status
                const transitions = WorkflowEngine.getTransitions('QUOTATION', currentStatus, tenantId);
                const validTarget = transitions.find(
                    (t: { to: string }) => t.to.toUpperCase() === newStatus
                );
                if (!validTarget) {
                    return NextResponse.json(
                        { success: false, error: `Transisi status tidak valid: ${currentStatus} → ${newStatus}` },
                        { status: 400 }
                    );
                }
                // Catat di workflow history
                await prisma.workflowHistory.create({
                    data: {
                        tenantId,
                        entityType: 'QUOTATION',
                        entityId: id,
                        fromState: currentStatus,
                        toState: newStatus,
                        action: validTarget.action,
                        userId,
                        notes: null,
                    },
                });
            }
            updateData.status = newStatus;
        }
        if (validatedData.validUntil !== undefined) {
            updateData.validUntil = validatedData.validUntil ? new Date(validatedData.validUntil) : null;
        }
        if (validatedData.taxRate !== undefined) {
            updateData.taxRate = validatedData.taxRate;
        }
        if (validatedData.discount !== undefined) {
            updateData.discount = validatedData.discount;
        }
        if (validatedData.notes !== undefined) {
            updateData.notes = validatedData.notes;
        }
        if (validatedData.terms !== undefined) {
            updateData.terms = validatedData.terms;
        }

        if (validatedData.items && validatedData.items.length > 0) {
            // Wrap items update in transaction for data consistency
            const quotation = await prisma.$transaction(async (tx) => {
                await tx.quotationItem.deleteMany({ where: { quotationId: id } });
                await tx.quotationItem.createMany({
                    data: validatedData.items!.map((item) => ({
                        quotationId: id,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        total: item.total || item.quantity * item.unitPrice,
                    })),
                });

                const subtotal = validatedData.items!.reduce(
                    (sum, item) => sum + item.quantity * item.unitPrice,
                    0
                );
                const taxRate = Number(validatedData.taxRate || existing.taxRate);
                const taxAmount = subtotal * (taxRate / 100);
                const discount = Number(validatedData.discount || existing.discount);
                updateData.subtotal = subtotal;
                updateData.taxAmount = taxAmount;
                updateData.total = subtotal + taxAmount - discount;

                return await tx.quotation.update({
                    where: { id },
                    data: updateData,
                    include: { items: true, contact: true },
                });
            });

            void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Quotation', entityId: id, newValues: updateData as Record<string, unknown>, request });

            return NextResponse.json({ success: true, data: quotation });
        }

        const quotation = await prisma.quotation.update({
            where: { id },
            data: updateData,
            include: { items: true, contact: true },
        });

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Quotation', entityId: id, newValues: updateData as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: quotation });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
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
