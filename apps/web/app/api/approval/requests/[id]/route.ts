import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:approval:requests:GET:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const approvalRequest = await prisma.approvalRequest.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!approvalRequest) {
            return NextResponse.json(
                { success: false, error: 'Approval request tidak ditemukan' },
                { status: 404 }
            );
        }

        // Get level info
        const level = await prisma.approvalLevel.findFirst({
            where: {
                tenantId,
                entityType: approvalRequest.entityType,
                level: approvalRequest.currentLevel,
            },
        });

        // Get requester info
        const requester = await prisma.user.findUnique({
            where: { id: approvalRequest.requestedBy },
            select: { id: true, name: true, email: true },
        });

        // Get resolver info if resolved
        let resolver = null;
        if (approvalRequest.resolvedBy) {
            resolver = await prisma.user.findUnique({
                where: { id: approvalRequest.resolvedBy },
                select: { id: true, name: true, email: true },
            });
        }

        // Get all levels for this entity type
        const allLevels = await prisma.approvalLevel.findMany({
            where: {
                tenantId,
                entityType: approvalRequest.entityType,
            },
            orderBy: { level: 'asc' },
        });

        return NextResponse.json({
            success: true,
            data: {
                ...approvalRequest,
                levelName: level?.name || `Level ${approvalRequest.currentLevel}`,
                requesterName: requester?.name || 'Unknown',
                requesterEmail: requester?.email || '',
                resolverName: resolver?.name || null,
                resolverEmail: resolver?.email || null,
                totalLevels: allLevels.length,
                levels: allLevels.map((l) => ({
                    level: l.level,
                    name: l.name,
                    requiredRole: l.requiredRole,
                    isActive: l.isActive,
                })),
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
