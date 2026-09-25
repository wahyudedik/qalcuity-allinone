export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';

// ─── GET /api/crm/contacts/[id] ──────────────────────────────────────────────
// Ambil detail satu contact berdasarkan ID.

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:contacts:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const contact = await prisma.contact.findFirst({
            where: { id: params.id, tenantId },
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
            return NextResponse.json({ success: false, error: MSG.CONTACT_NOT_FOUND }, { status: 404 });
        }

        const mappedContact = {
            id: contact.id,
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            type: contact.type?.toLowerCase() || 'customer',
            company: contact.company,
            position: null,
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

// ─── DELETE /api/crm/contacts/[id] ───────────────────────────────────────────
// Hapus contact berdasarkan ID.

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

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

        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Contact', entityId: params.id, oldValues: { name: existing.name, email: existing.email } as Record<string, unknown>, request });
        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
