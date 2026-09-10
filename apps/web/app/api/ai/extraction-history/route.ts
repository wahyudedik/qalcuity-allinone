export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermissionForRoute } from '@/lib/session';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

// â”€â”€â”€ GET /api/ai/extraction-history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function GET(req: Request) {
    try {
        const auth = await requirePermissionForRoute(req);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { searchParams } = new URL(req.url);

        const documentType = searchParams.get('documentType');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const offset = parseInt(searchParams.get('offset') || '0');

        const where: { tenantId: string; documentType?: string } = { tenantId };
        if (documentType && documentType !== 'ALL') {
            where.documentType = documentType;
        }

        const [history, total] = await Promise.all([
            prisma.extractionHistory.findMany({
                where,
                orderBy: { extractedAt: 'desc' },
                skip: offset,
                take: limit,
                select: {
                    id: true,
                    documentType: true,
                    fileName: true,
                    mimeType: true,
                    fileSize: true,
                    confidence: true,
                    method: true,
                    sourceType: true,
                    sourceId: true,
                    extractedAt: true,
                    createdAt: true,
                },
            }),
            prisma.extractionHistory.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                history,
                total,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
