import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updateInvoiceSchema, formatZodError } from '@/lib/validation-schemas';
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

        const invoice = await prisma.invoice.findFirst({
            where: { id, tenantId },
            include: {
                contact: true,
                items: true,
                payments: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!invoice) {
            return NextResponse.json(
                { success: false, error: 'Invoice not found' },
                { status: 404 }
            );
        }

        // Map to frontend-compatible format
        const data = {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.contact?.name || '-',
            customerAddress: invoice.contact?.address || '',
            customerEmail: invoice.contact?.email || '',
            customerPhone: invoice.contact?.phone || '',
            contactId: invoice.contactId,
            items: invoice.items.map((item) => ({
                id: item.id,
                name: item.description,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
            })),
            subtotal: invoice.subtotal,
            tax: invoice.taxAmount,
            total: invoice.total,
            currency: 'IDR',
            status: invoice.status.toLowerCase(),
            dueDate: invoice.dueDate.toISOString().split('T')[0],
            createdAt: invoice.createdAt.toISOString(),
            notes: invoice.notes || '',
            payments: invoice.payments.map((p) => ({
                id: p.id,
                paymentNumber: p.paymentNumber,
                amount: p.amount,
                method: p.method,
                status: p.status.toLowerCase(),
                date: p.paymentDate.toISOString(),
                reference: p.reference,
                notes: p.notes,
            })),
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
        const validation = updateInvoiceSchema.safeParse({ ...restBody, items });
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const existing = await prisma.invoice.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Invoice tidak ditemukan' },
                { status: 404 }
            );
        }

        const updateData: Record<string, unknown> = {};
        if (validatedData.status) {
            const newStatus = validatedData.status.toUpperCase();
            const currentStatus = existing.status;
            if (newStatus !== currentStatus) {
                // Workflow engine: validasi transisi status dengan backward compatibility
                try {
                    const { canTransitionSafe, logWorkflowHistory } = await import('@/lib/workflow');
                    const isValid = canTransitionSafe('INVOICE', currentStatus, newStatus, tenantId);
                    if (!isValid) {
                        return NextResponse.json(
                            { success: false, error: `Transisi status tidak valid: ${currentStatus} → ${newStatus}` },
                            { status: 400 }
                        );
                    }
                    // Log workflow history dengan backward compatibility
                    await logWorkflowHistory({
                        tenantId,
                        entityType: 'INVOICE',
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
                    console.warn(`[Workflow] Invoice workflow validation gagal, mengizinkan transisi: ${msg}`);
                }
            }
            updateData.status = newStatus;
        }
        if (validatedData.dueDate !== undefined) {
            updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null;
        }
        if (validatedData.taxRate !== undefined) {
            updateData.taxRate = validatedData.taxRate;
        }
        if (validatedData.taxCode !== undefined) {
            updateData.taxCode = validatedData.taxCode || null;
        }
        if (validatedData.notes !== undefined) {
            updateData.notes = validatedData.notes;
        }

        // Handle items update if provided — use transaction for atomicity
        if (validatedData.items && validatedData.items.length > 0) {
            const subtotal = validatedData.items.reduce(
                (sum, item) => sum + item.quantity * item.unitPrice,
                0
            );
            const taxRate = Number(validatedData.taxRate || existing.taxRate);
            const taxAmount = validatedData.taxAmount ?? subtotal * (taxRate / 100);
            updateData.subtotal = subtotal;
            updateData.totalBeforeTax = subtotal;
            updateData.taxAmount = taxAmount;
            updateData.total = subtotal + taxAmount;

            await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
            data: updateData,
            include: { items: true, contact: true },
        });

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Invoice', entityId: id, newValues: updateData as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: invoice });
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

        const existing = await prisma.invoice.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Invoice not found' },
                { status: 404 }
            );
        }

        await prisma.invoice.delete({ where: { id } });

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Invoice', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
