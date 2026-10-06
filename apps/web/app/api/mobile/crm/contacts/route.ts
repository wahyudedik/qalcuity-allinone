export const dynamic = 'force-dynamic';

/**
 * Mobile API — Contacts CRUD (List + Create)
 *
 * GET  /api/mobile/crm/contacts       — List contacts (paginated, search, filter)
 * POST /api/mobile/crm/contacts       — Create new contact
 *
 * Auth: JWT Bearer token via requireMobileAuth()
 * Tenant: Filtered by user.tenantId (mobile JWT contains tenantId)
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
import { createContactSchema, formatZodError } from '@/lib/validation-schemas';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';

// ─── GET /api/mobile/crm/contacts ─────────────────────────────────────────────
// List contacts dengan pagination, search, dan type filter.

export async function GET(req: Request) {
    try {
        const user = await requireMobileAuth(req);
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        const { tenantId } = user;
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (type) {
            where.type = type.toUpperCase();
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } },
                { company: { contains: search } },
            ];
        }

        const [contacts, total] = await Promise.all([
            prisma.contact.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            invoices: true,
                            deals: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.contact.count({ where }),
        ]);

        const data = contacts.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            type: c.type?.toLowerCase() || 'customer',
            company: c.company,
            address: c.address,
            city: c.city,
            province: c.province,
            postalCode: c.postalCode,
            taxId: c.taxId,
            notes: c.notes,
            isActive: c.isActive,
            totalDeals: c._count.deals,
            totalInvoices: c._count.invoices,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
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

// ─── POST /api/mobile/crm/contacts ────────────────────────────────────────────
// Create new contact.

export async function POST(req: Request) {
    try {
        const user = await requireMobileAuth(req);
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        // MEMBER dan VIEWER tidak boleh create contact
        if (user.role === 'VIEWER') {
            return NextResponse.json(
                { success: false, error: MSG.CONTACT_ADMIN_ONLY_CREATE },
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

        // Sanitize all text inputs
        const sanitized = sanitizeObject(validation.data);

        const contact = await prisma.contact.create({
            data: {
                tenantId,
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
            action: 'CREATE',
            entity: 'Contact',
            entityId: contact.id,
            newValues: toAuditPayload(contact),
            request: req,
        });

        return NextResponse.json({ success: true, data: contact }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
