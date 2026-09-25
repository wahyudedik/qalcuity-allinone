export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prismaTenant, tenantStorage } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeInput, sanitizeObject } from '@/lib/sanitize';
import { createContactSchema, formatZodError } from '@/lib/validation-schemas';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
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
        const { tenantId, userId } = auth;
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        return tenantStorage.run({ tenantId, userId }, async () => {
            // tenantId is auto-injected by prismaTenant extension — no manual filtering needed
            const where: Record<string, unknown> = {};

            if (type) {
                where.type = type.toUpperCase();
            }

            if (search) {
                where.OR = [
                    { name: { contains: search } },
                    { email: { contains: search } },
                    { phone: { contains: search } },
                    { address: { contains: search } },
                ];
            }

            const [contacts, total] = await Promise.all([
                prismaTenant.contact.findMany({
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
                prismaTenant.contact.count({ where }),
            ]);

            const data = contacts.map((c) => ({
                id: c.id,
                name: c.name,
                email: c.email,
                phone: c.phone,
                type: c.type?.toLowerCase() || 'customer',
                company: c.company,
                position: null,
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
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:contacts:POST:${ip}`, 30, 60000);
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
        const validation = createContactSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        // Sanitize all text inputs
        const sanitized = sanitizeObject(validation.data);

        return tenantStorage.run({ tenantId, userId }, async () => {
            // tenantId kept for TypeScript type safety — extension won't duplicate it
            const contact = await prismaTenant.contact.create({
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

            void logAudit({ userId, tenantId, action: 'CREATE', entity: 'Contact', entityId: contact.id, newValues: toAuditPayload(contact), request });

            return NextResponse.json({ success: true, data: contact }, { status: 201 });
        });
    } catch (error) {
        return handleApiError(error);
    }
}
