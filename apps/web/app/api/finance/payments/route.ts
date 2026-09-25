export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { createPaymentSchema, updatePaymentSchema, formatZodError } from '@/lib/validation-schemas';
import { sendPaymentReceivedEmail } from '@/lib/email';
import { handleApiError } from '@/lib/api-error';
import { generatePaymentJournalEntry } from '@/lib/auto-journal';
import { optimisticUpdateRaw } from '@/lib/optimistic-lock';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:payments:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const method = searchParams.get('method');
        const search = searchParams.get('search');
        const type = searchParams.get('type'); // INCOME or EXPENSE
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId, deletedAt: null };

        if (status) {
            where.status = status.toUpperCase();
        }

        if (method) {
            where.method = method.toUpperCase().replace('-', '_');
        }

        if (type) {
            where.type = type.toUpperCase();
        }

        if (search) {
            where.OR = [
                { paymentNumber: { contains: search } },
                { reference: { contains: search } },
                { invoice: { invoiceNumber: { contains: search } } },
                { invoice: { contact: { name: { contains: search } } } },
            ];
        }

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                include: {
                    invoice: {
                        select: {
                            id: true,
                            invoiceNumber: true,
                            total: true,
                            contact: { select: { name: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.payment.count({ where }),
        ]);

        const data = payments.map((p) => ({
            id: p.id,
            paymentNumber: p.paymentNumber,
            invoiceId: p.invoiceId,
            invoiceNumber: p.invoice?.invoiceNumber || '-',
            customerName: p.invoice?.contact?.name || '-',
            invoiceTotal: p.invoice?.total || 0,
            amount: p.amount,
            method: p.method.toLowerCase().replace('_', '-'),
            status: p.status.toLowerCase(),
            type: p.type,
            date: p.paymentDate.toISOString().split('T')[0],
            reference: p.reference || '',
            notes: p.notes || '',
            version: p.version,
            createdAt: p.createdAt.toISOString(),
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
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:payments:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();

        // Sanitize text inputs before validation
        const sanitizedBody = sanitizeObject(body);

        const validation = createPaymentSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;
        const amount = validatedData.amount;
        const status = (validatedData.status || 'PENDING').toUpperCase();

        const payment = await prisma.$transaction(async (tx) => {
            // Generate unique payment number using timestamp + random suffix to prevent race condition
            const paymentNumber = `PAY-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

            const newPayment = await tx.payment.create({
                data: {
                    paymentNumber,
                    amount,
                    paymentDate: validatedData.date ? new Date(validatedData.date) : new Date(),
                    method: validatedData.method.toUpperCase().replace('-', '_'),
                    status,
                    type: (validatedData.type || 'INCOME').toUpperCase(),
                    reference: validatedData.reference || '',
                    notes: validatedData.notes || '',
                    invoiceId: validatedData.invoiceId || undefined,
                    tenantId,
                },
                include: {
                    invoice: {
                        select: { invoiceNumber: true, total: true, contact: { select: { name: true } } },
                    },
                },
            });

            // Update invoice status if payment is linked to an invoice and is COMPLETED
            if (validatedData.invoiceId && status === 'COMPLETED') {
                const invoice = await tx.invoice.findUnique({
                    where: { id: validatedData.invoiceId },
                    include: { payments: { where: { status: 'COMPLETED' } } },
                });

                if (invoice) {
                    const totalPaid = invoice.payments.reduce((sum: number, p: { amount: unknown }) => sum + Number(p.amount), 0) + Number(amount);
                    const newInvoiceStatus = Number(totalPaid) >= Number(invoice.total) ? 'PAID' : invoice.status;
                    await tx.invoice.update({
                        where: { id: validatedData.invoiceId },
                        data: { status: newInvoiceStatus },
                    });
                }
            }

            return newPayment;
        });

        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'Payment', entityId: payment.id, newValues: toAuditPayload(payment), request });

        // Auto Journal Entry: when payment status is COMPLETED
        if (status === 'COMPLETED') {
            void generatePaymentJournalEntry(
                {
                    id: payment.id,
                    paymentNumber: payment.paymentNumber,
                    amount: Number(payment.amount),
                    type: (payment as Record<string, unknown>).type as string || 'INCOME',
                    method: payment.method || '',
                    tenantId,
                    invoiceId: (payment as Record<string, unknown>).invoiceId as string | null,
                },
                tenantId,
                userId,
                request
            );
        }

        // Fire-and-forget email notification for completed payments (graceful â€" never crashes)
        if (status === 'COMPLETED') {
            const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, id: true } });
            if (tenant) {
                // Fetch full payment with contact email for the email
                const fullPayment = await prisma.payment.findUnique({
                    where: { id: payment.id },
                    include: {
                        invoice: {
                            select: {
                                invoiceNumber: true,
                                total: true,
                                contact: { select: { name: true, email: true } },
                            },
                        },
                    },
                });
                if (fullPayment) {
                    void sendPaymentReceivedEmail(
                        {
                            id: fullPayment.id,
                            paymentNumber: fullPayment.paymentNumber,
                            amount: fullPayment.amount,
                            invoice: fullPayment.invoice,
                        },
                        tenant
                    );
                }
            }
        }

        return NextResponse.json({ success: true, data: payment }, { status: 201 });
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
        const { id, version, ...updateData } = body;

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

        const validation = updatePaymentSchema.safeParse(updateData);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const existing = await prisma.payment.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Payment not found', code: 'NOT_FOUND' },
                { status: 404 }
            );
        }

        // Build safe update data
        const data: Record<string, unknown> = {};
        if (validatedData.status) {
            data.status = validatedData.status.toUpperCase();
        }
        if (validatedData.method) {
            data.method = validatedData.method.toUpperCase().replace('-', '_');
        }
        if (validatedData.amount !== undefined) {
            data.amount = validatedData.amount;
        }
        if (validatedData.type) {
            data.type = validatedData.type.toUpperCase();
        }
        if (validatedData.reference !== undefined) {
            data.reference = validatedData.reference;
        }
        if (validatedData.notes !== undefined) {
            data.notes = validatedData.notes;
        }
        if (validatedData.date !== undefined) {
            data.paymentDate = validatedData.date ? new Date(validatedData.date) : null;
        }

        // Optimistic locking: atomic UPDATE with version check
        const setClauses: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 5; // $1=id, $2=tenantId, $3=version already used

        if (data.status !== undefined) {
            setClauses.push(`status = $${paramIndex++}`);
            values.push(data.status);
        }
        if (data.method !== undefined) {
            setClauses.push(`method = $${paramIndex++}`);
            values.push(data.method);
        }
        if (data.amount !== undefined) {
            setClauses.push(`amount = $${paramIndex++}`);
            values.push(data.amount);
        }
        if (data.type !== undefined) {
            setClauses.push(`type = $${paramIndex++}`);
            values.push(data.type);
        }
        if (data.reference !== undefined) {
            setClauses.push(`reference = $${paramIndex++}`);
            values.push(data.reference);
        }
        if (data.notes !== undefined) {
            setClauses.push(`notes = $${paramIndex++}`);
            values.push(data.notes);
        }
        if (data.paymentDate !== undefined) {
            setClauses.push(`"paymentDate" = $${paramIndex++}`);
            values.push(data.paymentDate);
        }

        if (setClauses.length > 0) {
            await optimisticUpdateRaw('Payment', id, tenantId, version, setClauses.join(', '), values);
        }

        // Fetch updated payment
        const payment = await prisma.payment.findUnique({
            where: { id },
            include: {
                invoice: {
                    select: { id: true, invoiceNumber: true, total: true, contact: { select: { name: true } } },
                },
            },
        });

        // Recalculate invoice status if status changed
        const newStatus = data.status as string | undefined;
        if (newStatus && payment?.invoiceId) {
            const invoice = await prisma.invoice.findUnique({
                where: { id: payment.invoiceId },
                include: { payments: true },
            });

            if (invoice) {
                const totalPaid = invoice.payments
                    .filter((p: { id: string; status: string }) => p.id !== id && p.status === 'COMPLETED')
                    .reduce((sum: number, p: { amount: unknown }) => sum + Number(p.amount), 0) + (newStatus === 'COMPLETED' ? Number(payment.amount) : 0);
                const newInvoiceStatus = Number(totalPaid) >= Number(invoice.total) ? 'PAID' : 'SENT';
                await prisma.invoice.update({
                    where: { id: payment.invoiceId },
                    data: { status: newInvoiceStatus },
                });
            }
        }

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Payment', entityId: id, newValues: data as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: payment });
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

        const existing = await prisma.payment.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Payment not found' },
                { status: 404 }
            );
        }

        await prisma.payment.delete({ where: { id } });

        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Payment', entityId: id, oldValues: toAuditPayload(existing), request });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
