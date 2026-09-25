export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { updateLeadSchema, formatZodError } from '@/lib/validation-schemas';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';

// ─── GET /api/crm/leads/[id] ─────────────────────────────────────────────────
// Ambil detail satu lead berdasarkan ID.

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:leads:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const lead = await prisma.lead.findFirst({
            where: { id: params.id, tenantId },
            include: {
                contact: { select: { id: true, name: true, email: true, phone: true, company: true } },
            },
        });

        if (!lead) {
            return NextResponse.json({ success: false, error: MSG.LEAD_NOT_FOUND }, { status: 404 });
        }

        const mappedLead = {
            id: lead.id,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            source: lead.source,
            status: lead.status.toLowerCase(),
            value: lead.value,
            notes: lead.notes,
            contactId: lead.contactId,
            contactName: lead.contact?.name || null,
            createdAt: lead.createdAt.toISOString(),
        };

        return NextResponse.json({ success: true, data: mappedLead });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT /api/crm/leads/[id] ─────────────────────────────────────────────────
// Update lead berdasarkan ID.

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:leads:PUT:${ip}`, 30, 60000);
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

        // Validasi input dengan Zod
        const validation = updateLeadSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const existing = await prisma.lead.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.LEAD_NOT_FOUND },
                { status: 404 }
            );
        }

        // Sanitize text fields
        const sanitized = sanitizeObject(validation.data);

        const lead = await prisma.lead.update({
            where: { id: params.id },
            data: {
                ...(typeof sanitized.name === 'string' && { name: sanitized.name }),
                ...(typeof sanitized.email === 'string' && { email: sanitized.email }),
                ...(typeof sanitized.phone === 'string' && { phone: sanitized.phone }),
                ...(typeof sanitized.company === 'string' && { company: sanitized.company }),
                ...(typeof sanitized.source === 'string' && { source: sanitized.source }),
                ...(typeof validation.data.status === 'string' && { status: validation.data.status.toUpperCase() }),
                ...(typeof validation.data.value === 'number' && { value: validation.data.value }),
                ...(typeof sanitized.notes === 'string' && { notes: sanitized.notes }),
                ...(typeof validation.data.contactId === 'string' && { contactId: validation.data.contactId }),
            },
        });

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Lead', entityId: params.id, newValues: validation.data as Record<string, unknown>, request });
        return NextResponse.json({ success: true, data: lead });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── DELETE /api/crm/leads/[id] ──────────────────────────────────────────────
// Hapus lead berdasarkan ID.

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        const existing = await prisma.lead.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.LEAD_NOT_FOUND },
                { status: 404 }
            );
        }

        await prisma.lead.delete({ where: { id: params.id } });

        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Lead', entityId: params.id, oldValues: { name: existing.name, company: existing.company, status: existing.status } as Record<string, unknown>, request });
        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
