import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';

/**
 * GET /api/workflow/history?entityType=INVOICE&entityId=xxx
 * Dapatkan workflow history untuk entity tertentu.
 */
export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { tenantId } = auth;
        const { searchParams } = new URL(request.url);

        const entityType = searchParams.get('entityType');
        const entityId = searchParams.get('entityId');

        if (!entityType) {
            return NextResponse.json(
                { success: false, error: MSG.WORKFLOW_ENTITY_TYPE_REQUIRED },
                { status: 400 }
            );
        }

        const where: Record<string, unknown> = {
            tenantId,
            entityType: entityType.toUpperCase(),
        };

        if (entityId) {
            where.entityId = entityId;
        }

        const history = await prisma.workflowHistory.findMany({
            where,
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: entityId ? 100 : 50, // Limit results
        });

        return NextResponse.json({ success: true, data: history });
    } catch (error) {
        return handleApiError(error);
    }
}
