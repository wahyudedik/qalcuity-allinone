import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeInput, sanitizeObject } from '@/lib/sanitize';
import { createActivitySchema, formatZodError } from '@/lib/validation-schemas';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:activities:${ip}`, 100, 60000);
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
        const entityType = searchParams.get('entityType');
        const entityId = searchParams.get('entityId');
        const type = searchParams.get('type');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (entityType) {
            where.entityType = entityType.toUpperCase();
        }

        if (entityId) {
            where.entityId = entityId;
        }

        if (type) {
            where.type = type.toUpperCase();
        }

        if (search) {
            where.OR = [
                { subject: { contains: search } },
                { description: { contains: search } },
            ];
        }

        const [activities, total] = await Promise.all([
            prisma.activity.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.activity.count({ where }),
        ]);

        const data = activities.map((a) => ({
            id: a.id,
            entityType: a.entityType,
            entityId: a.entityId,
            type: a.type,
            subject: a.subject,
            description: a.description,
            dueDate: a.dueDate?.toISOString() || null,
            completedAt: a.completedAt?.toISOString() || null,
            createdBy: a.createdBy,
            createdAt: a.createdAt.toISOString(),
            updatedAt: a.updatedAt.toISOString(),
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
        const rateLimitResult = checkRateLimit(`api:activities:POST:${ip}`, 30, 60000);
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
        const validation = createActivitySchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        // Sanitize all text inputs
        const sanitized = sanitizeObject(validation.data);

        const activity = await prisma.activity.create({
            data: {
                tenantId: authTenantId,
                entityType: validation.data.entityType,
                entityId: validation.data.entityId,
                type: validation.data.type,
                subject: sanitized.subject as string,
                description: (sanitized.description as string) || null,
                dueDate: validation.data.dueDate ? new Date(validation.data.dueDate) : null,
                createdBy: userId,
            },
        });

        void logAudit({ userId, tenantId: authTenantId, action: 'CREATE', entity: 'Activity', entityId: activity.id, newValues: activity as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: activity }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body';
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}
