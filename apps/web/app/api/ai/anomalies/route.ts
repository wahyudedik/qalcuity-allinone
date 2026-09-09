import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { runAnomalyScan } from '@/lib/ai/anomaly-detection';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';
import { handleApiError } from '@/lib/api-error';

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const scanRequestSchema = z.object({
    force: z.boolean().optional(),
});

const querySchema = z.object({
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
    status: z.enum(['OPEN', 'DISMISSED', 'INVESTIGATING', 'BLOCKED']).optional(),
    entityType: z.enum(['INVOICE', 'PAYMENT', 'PURCHASE_ORDER', 'QUOTATION', 'JOURNAL_ENTRY']).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
});

// ─── Valid statuses constant ──────────────────────────────────────────────────

const VALID_STATUSES = ['OPEN', 'INVESTIGATING', 'DISMISSED', 'BLOCKED'] as const;

// ─── GET: List anomalies (DB-first, fallback to scan) ────────────────────────

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        // ADMIN+ required for anomaly management
        const role = session.user.role;
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { error: MSG.ANOMALY_ADMIN_ONLY },
                { status: 403 }
            );
        }

        const tenantId = session.user.tenantId;
        const { searchParams } = new URL(req.url);

        // Parse query params
        const queryResult = querySchema.safeParse({
            severity: searchParams.get('severity'),
            status: searchParams.get('status'),
            entityType: searchParams.get('entityType'),
            limit: searchParams.get('limit'),
            offset: searchParams.get('offset'),
        });

        if (!queryResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.INVALID_INPUT, details: queryResult.error.issues },
                { status: 400 }
            );
        }

        const { severity, status, entityType, limit = 50, offset = 0 } = queryResult.data;

        // ── Build Prisma where clause with tenant isolation ──
        const where: Record<string, unknown> = { tenantId };
        if (severity) where.severity = severity;
        if (status) where.status = status;
        if (entityType) where.entityType = entityType;

        // ── Load from database first ──
        const [dbAnomalies, total] = await Promise.all([
            prisma.anomalyDetection.findMany({
                where,
                orderBy: [
                    { severity: 'asc' }, // CRITICAL first (alphabetical: CRITICAL < HIGH < LOW < MEDIUM)
                    { detectedAt: 'desc' },
                ],
                skip: offset,
                take: limit,
            }),
            prisma.anomalyDetection.count({ where }),
        ]);

        // ── Auto-trigger scan if last scan is older than 1 hour (fire-and-forget) ──
        const ONE_HOUR_MS = 60 * 60 * 1000;
        if (total > 0 && dbAnomalies.length > 0) {
            const lastScanTime = dbAnomalies[0]?.detectedAt;
            if (!lastScanTime || (Date.now() - new Date(lastScanTime).getTime()) > ONE_HOUR_MS) {
                // Fire-and-forget — don't await, don't block the response
                runAnomalyScan(tenantId).catch(console.error);
            }
        }

        // ── If DB has data, return from DB ──
        if (total > 0) {
            // Compute summary from DB
            const summaryResult = await prisma.anomalyDetection.groupBy({
                by: ['severity'],
                where: { tenantId },
                _count: true,
            });

            const summaryMap: Record<string, number> = {};
            for (const row of summaryResult) {
                summaryMap[row.severity] = row._count;
            }

            return NextResponse.json({
                success: true,
                data: {
                    anomalies: dbAnomalies.map((a) => ({
                        ...a,
                        details: a.details ?? {},
                        suggestedActions: a.suggestedActions
                            ? JSON.parse(a.suggestedActions)
                            : [],
                    })),
                    total,
                    summary: {
                        total: summaryResult.reduce((sum, r) => sum + r._count, 0),
                        critical: summaryMap['CRITICAL'] || 0,
                        high: summaryMap['HIGH'] || 0,
                        medium: summaryMap['MEDIUM'] || 0,
                        low: summaryMap['LOW'] || 0,
                    },
                    scanDuration: 0, // DB query, not a scan
                    scannedAt: new Date().toISOString(),
                    source: 'database',
                },
            });
        }

        // ── Fallback: no DB data → trigger scan ──
        const scanResult = await runAnomalyScan(tenantId);

        let filtered = scanResult.anomalies;
        if (severity) filtered = filtered.filter((a) => a.severity === severity);
        if (status) filtered = filtered.filter((a) => a.status === status);
        if (entityType) filtered = filtered.filter((a) => a.entityType === entityType);

        const fallbackTotal = filtered.length;
        filtered = filtered.slice(offset, offset + limit);

        return NextResponse.json({
            success: true,
            data: {
                anomalies: filtered,
                total: fallbackTotal,
                summary: scanResult.summary,
                scanDuration: scanResult.scanDuration,
                scannedAt: scanResult.scannedAt,
                source: 'scan',
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── POST: Trigger manual scan ───────────────────────────────────────────────

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        // ADMIN+ required for manual scan
        const role = session.user.role;
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { error: MSG.ANOMALY_ADMIN_ONLY },
                { status: 403 }
            );
        }

        // Rate limiting (lower limit for scan — heavier operation)
        const ip = getClientIp(req);
        const tenantId = session.user.tenantId;
        const rateLimitResult = checkRateLimit(`api:ai:anomalies:scan:${tenantId}:${ip}`, 5, 300000); // 5 per 5 min
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const body = await req.json().catch(() => ({}));
        const validation = scanRequestSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: MSG.INVALID_INPUT },
                { status: 400 }
            );
        }

        // Audit logging
        void logAudit({
            userId: session.user.id || 'unknown',
            tenantId,
            action: 'CREATE',
            entity: 'AnomalyScan',
            newValues: { triggeredBy: 'manual', forced: validation.data.force || false },
            request: req,
        });

        // Run scan — runAnomalyScan() internally persists to DB via persistAnomalies()
        const scanResult = await runAnomalyScan(tenantId);

        // Count how many anomalies were persisted (deduplicated by entityId+ruleId)
        const persistedCount = scanResult.anomalies.length;

        return NextResponse.json({
            success: true,
            data: {
                ...scanResult,
                persistedCount,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
