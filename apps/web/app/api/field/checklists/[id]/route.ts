export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createFieldChecklistSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:field-checklists:${ip}`, 100, 60000);
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
        const category = searchParams.get('category');
        const isActive = searchParams.get('isActive');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (category) {
            where.category = category.toUpperCase();
        }
        if (isActive !== null && isActive !== undefined) {
            where.isActive = isActive === 'true';
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [checklists, total] = await Promise.all([
            prisma.fieldChecklist.findMany({
                where,
                include: {
                    _count: {
                        select: { results: true },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.fieldChecklist.count({ where }),
        ]);

        const data = checklists.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            category: c.category,
            items: c.items,
            isActive: c.isActive,
            usageCount: c._count.results,
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

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:field-checklists:${ip}`, 30, 60000);
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

        const validation = createFieldChecklistSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { name, description, category, items } = validation.data;

        const checklist = await prisma.fieldChecklist.create({
            data: {
                tenantId,
                name: name.trim(),
                description: description?.trim() || null,
                category: category || 'GENERAL',
                items: items as object[],
            },
        });

        await logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'FieldChecklist',
            entityId: checklist.id,
            newValues: { name: checklist.name, category: checklist.category },
            request,
        });

        return NextResponse.json({ success: true, data: checklist }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
