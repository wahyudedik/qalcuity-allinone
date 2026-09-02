import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeInput, sanitizeObject } from '@/lib/sanitize';
import { createContactSchema, updateContactSchema, formatZodError } from '@/lib/validation-schemas';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:contacts:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
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
                { address: { contains: search } },
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

        const data = contacts.map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            type: c.type.toLowerCase(),
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
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:contacts:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId: authTenantId } = auth;
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

        const contact = await prisma.contact.create({
            data: {
                tenantId: authTenantId,
                name: sanitized.name as string,
                email: (sanitized.email as string) || null,
                phone: (sanitized.phone as string) || null,
                type: (validation.data.type || 'CUSTOMER').toUpperCase(),
                address: (sanitized.address as string) || null,
                city: (sanitized.city as string) || null,
                province: (sanitized.province as string) || null,
                postalCode: (sanitized.postalCode as string) || null,
                taxId: (sanitized.taxId as string) || null,
                notes: (sanitized.notes as string) || null,
            },
        });

        void logAudit({ userId, tenantId: authTenantId, action: 'CREATE', entity: 'Contact', entityId: contact.id, newValues: contact as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: contact }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body';
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}

export async function PUT(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:contacts:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId: authTenantId } = auth;
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID wajib diisi' },
                { status: 400 }
            );
        }

        // Validasi input dengan Zod
        const validation = updateContactSchema.safeParse(updateData);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const existing = await prisma.contact.findFirst({
            where: { id, tenantId: authTenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Contact not found' },
                { status: 404 }
            );
        }

        // Sanitize text fields
        const sanitized = sanitizeObject(validation.data);

        const contact = await prisma.contact.update({
            where: { id },
            data: {
                ...(typeof sanitized.name === 'string' && { name: sanitized.name }),
                ...(typeof sanitized.email === 'string' && { email: sanitized.email }),
                ...(typeof sanitized.phone === 'string' && { phone: sanitized.phone }),
                ...(typeof validation.data.type === 'string' && { type: validation.data.type.toUpperCase() }),
                ...(typeof sanitized.address === 'string' && { address: sanitized.address }),
                ...(typeof sanitized.city === 'string' && { city: sanitized.city }),
                ...(typeof sanitized.province === 'string' && { province: sanitized.province }),
                ...(typeof sanitized.postalCode === 'string' && { postalCode: sanitized.postalCode }),
                ...(typeof sanitized.taxId === 'string' && { taxId: sanitized.taxId }),
                ...(typeof sanitized.notes === 'string' && { notes: sanitized.notes }),
                ...(typeof validation.data.isActive === 'boolean' && { isActive: validation.data.isActive }),
            },
        });

        void logAudit({ userId, tenantId: authTenantId, action: 'UPDATE', entity: 'Contact', entityId: id, newValues: updateData as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: contact });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body';
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}

export async function DELETE(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId: authTenantId } = auth;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const existing = await prisma.contact.findFirst({
            where: { id, tenantId: authTenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Contact not found' },
                { status: 404 }
            );
        }

        await prisma.contact.delete({ where: { id } });

        void logAudit({ userId, tenantId: authTenantId, action: 'DELETE', entity: 'Contact', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
