export const dynamic = 'force-dynamic';

/**
 * Mobile API — Contact Detail (GET + Update + Delete)
 *
 * GET    /api/mobile/crm/contacts/[id]  — Get contact detail
 * PUT    /api/mobile/crm/contacts/[id]  — Update contact
 * DELETE /api/mobile/crm/contacts/[id]  — Delete contact
 *
 * Auth: JWT Bearer token via requireMobileAuth()
 * Tenant: Filtered by user.tenantId
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireMobileAuth } from '@/lib/mobile-auth-guard';
import { logAudit } from '@/lib/audit';
import { sanitizeObject } from '@/lib/sanitize';
import { createContactSchema, formatZodError } from '@/lib/validation-schemas';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';

// ─── GET /api/mobile/crm/contacts/[id] ────────────────────────────────────────

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireMobileAuth(req);
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        const contact = await prisma.contact.findFirst({
            where: { id: params.id, tenantId: user.tenantId },
            include: {
                _count: {
                    select: {
                        invoices: true,
                        deals: true,
                    },
                },
            },
        });

        if (!contact) {
            return NextResponse.json(
                { success: false, error: MSG.CONTACT_NOT_FOUND },
                { status: 404 }
            );
        }

        const mappedContact = {
            id: contact.id,
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            type: contact.type?.toLowerCase() || 'customer',
            company: contact.company,
            address: contact.address,
            city: contact.city,
            province: contact.province,
            postalCode: contact.postalCode,
            taxId: contact.taxId,
            notes: contact.notes,
            isActive: contact.isActive,
            totalDeals: contact._count.deals,
            totalInvoices: contact._count.invoices,
            createdAt: contact.createdAt.toISOString(),
            updatedAt: contact.updatedAt.toISOString(),
        };

        return NextResponse.json({ success: true, data: mappedContact });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT /api/mobile/crm/contacts/[id] ────────────────────────────────────────

export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireMobileAuth(req);
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        if (user.role === 'VIEWER' || user.role === 'MEMBER') {
            return NextResponse.json(
                { success: false, error: MSG.CONTACT_ADMIN_ONLY_UPDATE },
                { status: 403 }
            );
        }

        const { id: userId, tenantId } = user;
        const body = await req.json();

        // Validasi input dengan Zod
        const validation = createContactSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        // Cek apakah contact ada dan milik tenant ini
        const existing = await prisma.contact.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.CONTACT_NOT_FOUND },
                { status: 404 }
            );
        }

        // Sanitize all text inputs
        const sanitized = sanitizeObject(validation.data);

        const updated = await prisma.contact.update({
            where: { id: params.id },
            data: {
                name: sanitized.name as string,
                email: (sanitized.email as string) || null,
                phone: (sanitized.phone as string) || null,
                type: (validation.data.type || 'CUSTOMER').toUpperCase(),
                company: (sanitized.company as string) || null,
                address: (sanitized.address as string) || null,
                city: (sanitized.city as string) || null,
                province: (sanitized.province as string) || null,
                postalCode: (sanitized.postalCode as string) || null,
                taxId: (sanitized.taxId as string) || null,
                notes: (sanitized.notes as string) || null,
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'Contact',
            entityId: params.id,
            oldValues: { name: existing.name, email: existing.email },
            newValues: { name: updated.name, email: updated.email },
            request: req,
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── DELETE /api/mobile/crm/contacts/[id] ─────────────────────────────────────

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireMobileAuth(req);
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        if (user.role === 'VIEWER' || user.role === 'MEMBER') {
            return NextResponse.json(
                { success: false, error: MSG.CONTACT_ADMIN_ONLY_DELETE },
                { status: 403 }
            );
        }

        const { id: userId, tenantId } = user;

        const existing = await prisma.contact.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.CONTACT_NOT_FOUND },
                { status: 404 }
            );
        }

        await prisma.contact.delete({ where: { id: params.id } });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'Contact',
            entityId: params.id,
            oldValues: { name: existing.name, email: existing.email },
            request: req,
        });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
