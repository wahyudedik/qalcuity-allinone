export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

// â”€â”€â”€ GET /api/ai/extraction-history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;
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
