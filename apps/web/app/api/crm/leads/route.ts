import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireMutateAuth } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeInput, sanitizeObject } from '@/lib/sanitize';
import { createLeadSchema, updateLeadSchema, formatZodError } from '@/lib/validation-schemas';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:leads:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requireAuth();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId: auth.tenantId };

        if (status) {
            where.status = status.toUpperCase();
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { company: { contains: search } },
                { email: { contains: search } },
            ];
        }

        const [leads, total] = await Promise.all([
            prisma.lead.findMany({
                where,
                include: {
                    contact: { select: { id: true, name: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.lead.count({ where }),
        ]);

        const data = leads.map((lead: any) => ({
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
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:leads:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const { userId, tenantId } = await requireMutateAuth();
        const body = await request.json();

        // Validasi input dengan Zod
        const validation = createLeadSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        // Sanitize text inputs
        const sanitized = sanitizeObject(validation.data);

        const lead = await prisma.lead.create({
            data: {
                tenantId: tenantId,
                name: sanitized.name as string,
                email: (sanitized.email as string) || null,
                phone: (sanitized.phone as string) || null,
                company: (sanitized.company as string) || null,
                source: (sanitized.source as string) || null,
                status: (validation.data.status || 'NEW').toUpperCase(),
                value: validation.data.value || 0,
                notes: (sanitized.notes as string) || null,
                contactId: validation.data.contactId || null,
            },
        });

        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'Lead', entityId: lead.id, newValues: { name: lead.name, company: lead.company, status: lead.status } as Record<string, unknown>, request });
        return NextResponse.json({ success: true, data: lead }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}

export async function PUT(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:leads:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const { userId, tenantId } = await requireMutateAuth();
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID wajib diisi' },
                { status: 400 }
            );
        }

        // Validasi input dengan Zod
        const validation = updateLeadSchema.safeParse(updateData);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const existing = await prisma.lead.findFirst({
            where: { id, tenantId: tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Lead not found' },
                { status: 404 }
            );
        }

        // Sanitize text fields
        const sanitized = sanitizeObject(validation.data);

        const lead = await prisma.lead.update({
            where: { id },
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

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Lead', entityId: id, newValues: updateData as Record<string, unknown>, request });
        return NextResponse.json({ success: true, data: lead });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { userId, tenantId } = await requireMutateAuth();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const existing = await prisma.lead.findFirst({
            where: { id, tenantId: tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Lead not found' },
                { status: 404 }
            );
        }

        await prisma.lead.delete({ where: { id } });

        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Lead', entityId: id, oldValues: { name: existing.name, company: existing.company, status: existing.status } as Record<string, unknown>, request });
        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
