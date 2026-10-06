export const dynamic = 'force-dynamic';

/**
 * Mobile API — Invoices CRUD (List + Create)
 *
 * GET  /api/mobile/finance/invoices       — List invoices (paginated, search, status filter)
 * POST /api/mobile/finance/invoices       — Create new invoice with items
 *
 * Auth: JWT Bearer token via requireMobileAuth()
 * Tenant: Filtered by user.tenantId
 *
 * RBAC EXCEPTION (FE-PE-09a): Intentional hardcoded role check — mobile uses a
 * separate JWT auth flow (mobile-auth.ts / mobile-auth-guard.ts) that is skipped
 * by requirePermissionForRoute(). The role check below is the enforcement layer
 * for this route. Official exception documented in docs/REMAINING-WORK.md (FE-PE-09a).
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireMobileAuth } from '@/lib/mobile-auth-guard';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { sanitizeObject } from '@/lib/sanitize';
import { createInvoiceSchema, formatZodError } from '@/lib/validation-schemas';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';
import { calculateTax } from '@/lib/ppn';

// ─── GET /api/mobile/finance/invoices ─────────────────────────────────────────
// List invoices dengan pagination, search, dan status filter.

export async function GET(req: Request) {
    try {
        const user = await requireMobileAuth(req);
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        const { tenantId } = user;
        const { searchParams } = new URL(req.url);
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

        // Map to mobile-compatible format
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
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── POST /api/mobile/finance/invoices ────────────────────────────────────────
// Create new invoice with items.

export async function POST(req: Request) {
    try {
        const user = await requireMobileAuth(req);
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        if (user.role === 'VIEWER') {
            return NextResponse.json(
                { success: false, error: MSG.FORBIDDEN },
                { status: 403 }
            );
        }

        const { id: userId, tenantId } = user;
        const body = await req.json();

        // Sanitize text inputs before validation
        const sanitizedBody = sanitizeObject(body);

        const validation = createInvoiceSchema.safeParse(sanitizedBody);
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
        const taxRate = validatedData.taxRate || 0;
        const taxAmount = validatedData.taxAmount ?? calculateTax(subtotal, taxRate).taxAmount;
        const total = subtotal + taxAmount;

        // Use transaction for atomicity: contact creation + invoice + items
        const invoice = await prisma.$transaction(async (tx) => {
            // Generate unique invoice number
            const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

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
                    taxCode: validatedData.taxCode || null,
                    taxAmount,
                    totalBeforeTax: subtotal,
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

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'Invoice',
            entityId: invoice.id,
            newValues: toAuditPayload(invoice),
            request: req,
        });

        return NextResponse.json({ success: true, data: invoice }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
