import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createApprovalLevelSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:approval:levels:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'MSG.TOO_MANY_REQUESTS' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const { searchParams } = new URL(request.url);
        const entityType = searchParams.get('entityType');

        const where: Record<string, unknown> = { tenantId };
        if (entityType) {
            where.entityType = entityType.toUpperCase();
        }

        const levels = await prisma.approvalLevel.findMany({
            where,
            orderBy: [{ entityType: 'asc' }, { level: 'asc' }],
        });

        return NextResponse.json({ success: true, data: levels });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:approval:levels:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'MSG.TOO_MANY_REQUESTS' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId, role } = auth;

        // Only ADMIN+ can manage approval levels
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat mengelola approval levels' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const validation = createApprovalLevelSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { entityType, level, name, requiredRole, isActive } = validation.data;

        // Check if level already exists for this entity type
        const existing = await prisma.approvalLevel.findFirst({
            where: {
                tenantId,
                entityType,
                level,
            },
        });

        if (existing) {
            return NextResponse.json(
                { success: false, error: `Level ${level} untuk ${entityType} sudah ada` },
                { status: 409 }
            );
        }

        const created = await prisma.approvalLevel.create({
            data: {
                tenantId,
                entityType,
                level,
                name,
                requiredRole,
                isActive: isActive ?? true,
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'ApprovalLevel',
            entityId: created.id,
            newValues: created as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, data: created }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
