import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { searchParams } = new URL(request.url);
        const entity = searchParams.get('entity');
        const action = searchParams.get('action');
        const search = searchParams.get('search');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId: auth.tenantId };

        if (entity && entity !== 'all') {
            where.entity = entity;
        }

        if (action && action !== 'all') {
            where.action = action;
        }

        if (search) {
            where.OR = [
                { entity: { contains: search } },
                { action: { contains: search } },
                { entityId: { contains: search } },
            ];
        }

        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                (where.createdAt as Record<string, Date>).gte = new Date(dateFrom);
            }
            if (dateTo) {
                const endDate = new Date(dateTo);
                endDate.setHours(23, 59, 59, 999);
                (where.createdAt as Record<string, Date>).lte = endDate;
            }
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: { select: { id: true, name: true, email: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.auditLog.count({ where }),
        ]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = logs.map((log: any) => ({
            id: log.id,
            userId: log.userId,
            userName: log.user?.name || 'System',
            userInitials: log.user?.name
                ? log.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                : 'SY',
            action: log.action,
            entity: log.entity,
            entityId: log.entityId,
            description: `${log.action} ${log.entity}${log.entityId ? ` #${log.entityId}` : ''}`,
            details: log.newValues || null,
            oldValues: log.oldValues || null,
            ipAddress: log.ipAddress || '-',
            timestamp: log.createdAt.toISOString(),
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
