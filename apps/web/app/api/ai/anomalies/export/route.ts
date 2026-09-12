export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermissionForRoute } from '@/lib/session';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { MSG } from '@/lib/api-messages';

// â”€â”€â”€ GET: Export anomalies to CSV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Requires ADMIN/SUPERADMIN role. Supports filtering by severity, status, entityType.

export async function GET(req: Request) {
    try {
        const ip = getClientIp(req);
        const rateLimitResult = checkRateLimit(`api:ai:anomalies:export:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(req);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { searchParams } = new URL(req.url);
        const severity = searchParams.get('severity');
        const status = searchParams.get('status');
        const entityType = searchParams.get('entityType');

        // â”€â”€ Build Prisma where clause with tenant isolation â”€â”€
        const where: Record<string, unknown> = { tenantId };
        if (severity && severity !== 'ALL') where.severity = severity;
        if (status && status !== 'ALL') where.status = status;
        if (entityType && entityType !== 'ALL') where.entityType = entityType;

        const anomalies = await prisma.anomalyDetection.findMany({
            where,
            orderBy: { detectedAt: 'desc' },
        });

        // â”€â”€ Build CSV â”€â”€
        const headers = [
            'ID',
            'Rule',
            'Severity',
            'Category',
            'Entity Type',
            'Entity ID',
            'Message',
            'Status',
            'AI Risk Score',
            'Detected At',
            'Created At',
        ];

        const rows = anomalies.map((a) => [
            a.id,
            a.ruleName,
            a.severity,
            a.category,
            a.entityType,
            a.entityId,
            `"${(a.message || '').replace(/"/g, '""')}"`, // Escape quotes for CSV
            a.status,
            a.aiRiskScore?.toString() || '',
            a.detectedAt.toISOString(),
            a.createdAt.toISOString(),
        ]);

        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

        const dateStr = new Date().toISOString().split('T')[0];

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="anomalies-${dateStr}.csv"`,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
